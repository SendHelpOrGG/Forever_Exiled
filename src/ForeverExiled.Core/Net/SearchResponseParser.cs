using System.Text;
using ForeverExiled.Core.Formatting;
using ForeverExiled.Core.Models;

namespace ForeverExiled.Core.Net;

/// <summary>
/// Decodes poe.ninja's <c>/poe1/api/builds/{version}/search</c> protobuf payload.
///
/// Recovered message shape (field numbers are wire-level, verified against poe.ninja's
/// own client bundle and against two independent open-source clients):
///
///   NinjaSearchResult        { 1: result }
///   SearchResult             { 1: total
///                              2: repeated Dimension   { 1: id, 2: dictionaryId,
///                                                        3: repeated { 1: key, 2: count } }
///                              6: repeated DictRef     { 1: id, 2: hash }
///                             12: repeated Column      { 1: name,
///                                                        6: packed varints,
///                                                        7: repeated strings,
///                                                        8: packed varints (bitset),
///                                                       11: dictionaryId,
///                                                       13: row count } }
///
/// The aggregate buckets (field 2) and the ladder rows (field 12) are returned by the
/// same call, which is why one request yields both popularity shares and DPS values.
/// </summary>
public static class SearchResponseParser
{
    public static SearchResponse Parse(byte[] payload)
    {
        ArgumentNullException.ThrowIfNull(payload);

        ProtoMessage root;
        try
        {
            root = ProtoMessage.Parse(payload);
        }
        catch (PoeDataException ex)
        {
            throw new PoeDataException("poe.ninja builds search returned an unreadable protobuf payload.", ex);
        }

        var resultBytes = root.FirstBytes(1);
        if (resultBytes is null)
        {
            throw new PoeDataException("poe.ninja builds search response had no result envelope (field 1 missing).");
        }

        var result = ProtoMessage.Parse(resultBytes);
        if (result.Fields.Count == 0)
        {
            return new SearchResponse();
        }

        var dimensions = new List<SearchDimension>();
        foreach (var dimensionMessage in result.AllMessages(2))
        {
            var id = dimensionMessage.FirstString(1);
            var dictionaryId = dimensionMessage.FirstString(2);
            var counts = new List<DimensionCount>();

            foreach (var countMessage in dimensionMessage.AllMessages(3))
            {
                // proto3 omits zero values, so a missing key means index 0.
                var key = (int)countMessage.FirstInt(1);
                var count = (int)countMessage.FirstInt(2);
                counts.Add(new DimensionCount { Key = key, Count = count });
            }

            if (string.IsNullOrEmpty(id))
            {
                continue;
            }

            dimensions.Add(new SearchDimension
            {
                Id = id,
                DictionaryId = dictionaryId,
                Counts = counts,
            });
        }

        var dictionaryHashes = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var referenceMessage in result.AllMessages(6))
        {
            var id = referenceMessage.FirstString(1);
            var hash = referenceMessage.FirstString(2);
            if (!string.IsNullOrEmpty(id) && !string.IsNullOrEmpty(hash))
            {
                dictionaryHashes[id] = hash;
            }
        }

        var columns = new List<SearchColumn>();
        foreach (var columnMessage in result.AllMessages(12))
        {
            var name = columnMessage.FirstString(1);
            if (string.IsNullOrEmpty(name))
            {
                continue;
            }

            var strings = columnMessage.AllBytes(7)
                .Select(bytes => Encoding.UTF8.GetString(bytes))
                .ToList();

            var rowCount = (int)columnMessage.FirstInt(13);
            var numbers = ReadColumnNumbers(columnMessage, rowCount);

            columns.Add(new SearchColumn
            {
                Name = name,
                Rows = rowCount,
                DictionaryId = columnMessage.FirstString(11),
                Strings = strings.Count > 0 ? strings : null,
                Numbers = numbers is { Count: > 0 } ? numbers : null,
            });
        }

        var total = (int)Math.Min(result.FirstInt(1), int.MaxValue);

        return new SearchResponse
        {
            Total = total,
            Dimensions = dimensions,
            Columns = columns,
            DictionaryHashes = dictionaryHashes,
        };
    }

    /// <summary>
    /// Pulls a column's numeric payload. poe.ninja writes it as packed varints in field 6
    /// (or 8 for flags), sometimes as several blobs per column, and - for some columns - in
    /// a layout that is neither. The last resort matches any length-delimited field whose
    /// packed decode has exactly one value per row: a column called <c>skills</c> that
    /// reports rows but no values is useless to every consumer.
    /// </summary>
    private static List<long>? ReadColumnNumbers(ProtoMessage column, int rows)
    {
        var packed = new List<long>();
        foreach (var blob in column.AllBytes(6).Concat(column.AllBytes(8)))
        {
            if (ProtoWire.TryReadPackedVarints(blob, out var values))
            {
                packed.AddRange(values);
            }
        }

        if (packed.Count > 0)
        {
            return packed;
        }

        var unpacked = column.AllVarints(6).Concat(column.AllVarints(8)).Select(v => (long)v).ToList();
        if (unpacked.Count > 0)
        {
            return unpacked;
        }

        if (rows <= 0)
        {
            return null;
        }

        foreach (var field in column.Fields)
        {
            // 1 is the column name and 11 the dictionary id; neither is a value array
            if (field.WireType != 2 || field.Bytes is null || field.Number is 1 or 11)
            {
                continue;
            }

            // anything can live in an unrecognised field: text, a nested message, flags
            if (ProtoWire.TryReadPackedVarints(field.Bytes, out var values) && values.Count == rows)
            {
                return values;
            }
        }

        return null;
    }

    /// <summary>
    /// One-line summary of what a search response actually carried: totals, how many
    /// columns arrived and what each holds. Printed by the diagnostics path, because a
    /// response that reports builds but no rows is otherwise indistinguishable from an
    /// empty league.
    /// </summary>
    public static string Describe(SearchResponse response)
    {
        ArgumentNullException.ThrowIfNull(response);

        var columns = response.Columns.Count == 0
            ? "none"
            : string.Join(", ", response.Columns.Select(c =>
                $"{c.Name}(rows:{c.Rows} strings:{c.Strings?.Count ?? 0} numbers:{c.Numbers?.Count ?? 0}" +
                (c.DictionaryId.Length > 0 ? $" dict:{c.DictionaryId}" : string.Empty) +
                (ColumnMaxValue(c) > 0 ? $" max:{ColumnMaxValue(c):N0}" : string.Empty) + ")"));

        return $"total={response.Total} dimensions={response.Dimensions.Count} " +
               $"dictionaries={response.DictionaryHashes.Count} rows={response.RowCount} columns=[{columns}]";
    }

    /// <summary>
    /// Flattens the column-oriented ladder table into build rows. Column names are
    /// matched with tolerant candidates because poe.ninja renames them between
    /// seasons (e.g. <c>dps</c> vs <c>dps.total</c>).
    /// </summary>
    /// <param name="log">Optional sink for what the column matching decided.</param>
    public static List<BuildRef> ExtractRows(
        SearchResponse response,
        IReadOnlyDictionary<string, string[]> dictionaries,
        Action<string>? log = null)
    {
        var rows = new List<BuildRef>();
        if (response.Columns.Count == 0)
        {
            return rows;
        }

        var nameColumn = FindPopulatedColumn(response, "name", "characterName", "character.name");
        var accountColumn = FindPopulatedColumn(response, "account", "accountName", "character.account");
        var classColumn = FindPopulatedColumn(response, "class", "className", "ascendancy");
        var levelColumn = FindPopulatedColumn(response, "level", "character.level");
        var dpsColumn = ResolveDpsColumn(response, response.RowCount, log);

        // the site names these with underscores and, on some responses, ships a populated
        // dps_skill (gem index) where `skills` carries rows but no values
        var skillColumn = FindPopulatedColumn(response, "skills", "mainSkill", "skill")
                          ?? FindPopulatedColumn(response, "dps_skill", "dps.skill");
        var leagueColumn = response.FindColumn("league", "leagueName");
        var clusterColumn = response.FindColumn("cjewels", "clusterJewels", "clusterJewelCount");

        if (nameColumn is null && accountColumn is null)
        {
            return rows;
        }

        var rowCount = response.RowCount;

        for (var i = 0; i < rowCount; i++)
        {
            var name = CellString(nameColumn, i);
            var account = CellString(accountColumn, i);
            if (string.IsNullOrWhiteSpace(name) && string.IsNullOrWhiteSpace(account))
            {
                continue;
            }

            var dps = ParseDps(dpsColumn, i);

            rows.Add(new BuildRef
            {
                Name = name ?? string.Empty,
                Account = account ?? string.Empty,
                ClassName = CellCategorical(response, classColumn, dictionaries, i),
                Level = (int)CellNumber(levelColumn, i),
                Dps = dps,
                MainSkill = CellCategorical(response, skillColumn, dictionaries, i),
                League = CellCategorical(response, leagueColumn, dictionaries, i),
                ClusterJewelCount = (int)CellNumber(clusterColumn, i),
            });
        }

        return rows;
    }

    private static string? CellString(SearchColumn? column, int row)
    {
        if (column?.Strings is null || row >= column.Strings.Count)
        {
            return null;
        }

        var value = column.Strings[row];
        return string.IsNullOrEmpty(value) ? null : value;
    }

    private static double CellNumber(SearchColumn? column, int row)
    {
        if (column?.Numbers is null || row >= column.Numbers.Count)
        {
            return 0;
        }

        return column.Numbers[row];
    }

    private static string CellCategorical(
        SearchResponse response,
        SearchColumn? column,
        IReadOnlyDictionary<string, string[]> dictionaries,
        int row)
    {
        if (column is null)
        {
            return string.Empty;
        }

        var text = CellString(column, row);
        if (!string.IsNullOrWhiteSpace(text))
        {
            // Multi-valued categorical columns are newline separated.
            return text.Split('\n', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? string.Empty;
        }

        if (column.Numbers is null || row >= column.Numbers.Count)
        {
            return string.Empty;
        }

        if (string.IsNullOrEmpty(column.DictionaryId) ||
            !dictionaries.TryGetValue(column.DictionaryId, out var names))
        {
            return string.Empty;
        }

        var index = (int)column.Numbers[row];
        return index >= 0 && index < names.Length ? names[index] : string.Empty;
    }

    /// <summary>
    /// Last resort when no column carries a name we recognise: take the column that looks
    /// like damage numbers. A league's ladder has millions-to-billions in exactly one place,
    /// so the biggest numbers win, minus the columns that are plainly not damage.
    /// </summary>
    /// <summary>
    /// The first candidate column that exists and actually carries values. A column that
    /// reports rows but no payload is worse than useless: it silently empties every row.
    /// </summary>
    private static SearchColumn? FindPopulatedColumn(SearchResponse response, params string[] candidates)
    {
        foreach (var candidate in candidates)
        {
            var column = response.Columns.FirstOrDefault(c =>
                string.Equals(c.Name, candidate, StringComparison.OrdinalIgnoreCase));
            if (column is { ValueCount: > 0 })
            {
                return column;
            }
        }

        return null;
    }

    /// <summary>
    /// Picks the column that describes each row's damage. A skill-filtered response does not use
    /// <c>dps.total</c>: it names the column after the skill - <c>dps-Righteous Fire.total</c> -
    /// because the DPS of a filtered table is that skill's, not the build's. Matching that shape
    /// by name beats guessing by magnitude, which is what put a 1.9M minion skill ahead of a
    /// 36M one before.
    /// </summary>
    private static SearchColumn? ResolveDpsColumn(SearchResponse response, int rowCount, Action<string>? log)
    {
        var populated = response.Columns.Where(column => column.ValueCount > 0).ToList();
        var perRow = populated.Where(column => rowCount <= 0 || column.ValueCount == rowCount).ToList();

        // a skill-filtered table is sorted and shown on that skill's DPS, so when both columns
        // are present the skill's own one is the number the site is displaying
        var perSkill = perRow.FirstOrDefault(column => IsPerSkillDpsName(column.Name));
        if (perSkill is not null)
        {
            log?.Invoke($"dps column: {perSkill.Name} (the skill's own DPS)");
            return perSkill;
        }

        var named = perRow.FirstOrDefault(column => DpsNameCandidates.Any(
            name => string.Equals(name, column.Name, StringComparison.OrdinalIgnoreCase)));
        if (named is not null)
        {
            log?.Invoke($"dps column: {named.Name}");
            return named;
        }

        var partial = populated.FirstOrDefault(column => DpsNameCandidates.Any(
            name => string.Equals(name, column.Name, StringComparison.OrdinalIgnoreCase)));

        if (partial is not null)
        {
            log?.Invoke($"dps column {partial.Name} carries {partial.ValueCount} values for {rowCount} rows");
            return partial;
        }

        return GuessDpsColumn(response, log);
    }

    private static bool IsPerSkillDpsName(string name) =>
        (name.StartsWith("dps-", StringComparison.OrdinalIgnoreCase) ||
         name.StartsWith("dps_", StringComparison.OrdinalIgnoreCase)) &&
        (name.Contains("total", StringComparison.OrdinalIgnoreCase) ||
         name.EndsWith(".dps", StringComparison.OrdinalIgnoreCase));

    private static readonly string[] DpsNameCandidates =
    {
        "dps_total", "dps.total", "dps", "dpsTotal", "dps.totalWeighted", "dps_totalWeighted", "dps.full",
    };

    private static SearchColumn? GuessDpsColumn(SearchResponse response, Action<string>? log)
    {
        string[] notDamage = { "level", "xp", "experience", "rank", "depth", "time", "life",
                               "ehp", "es", "mana", "ward", "armour", "evasion", "count" };

        var candidates = response.Columns
            .Where(c => !notDamage.Any(word => c.Name.Contains(word, StringComparison.OrdinalIgnoreCase)))
            .Select(c => (Column: c, Max: ColumnMaxValue(c)))
            .Where(x => x.Max >= 100_000)
            .OrderByDescending(x => x.Max)
            .ToList();

        if (candidates.Count == 0)
        {
            log?.Invoke("no dps column found: builds will keep the site's order");
            return null;
        }

        var picked = candidates[0];
        log?.Invoke($"dps column guessed as \"{picked.Column.Name}\" (largest values: {picked.Max:N0})");
        return picked.Column;
    }

    private static double ColumnMaxValue(SearchColumn column)
    {
        if (column.Numbers is { Count: > 0 })
        {
            return column.Numbers.Max();
        }

        if (column.Strings is { Count: > 0 })
        {
            // ladder DPS arrives as a printed string ("425.0M") as often as a number
            return column.Strings.Max(DpsParser.Parse);
        }

        return 0;
    }

    private static double ParseDps(SearchColumn? column, int row)
    {
        if (column is null)
        {
            return 0;
        }

        if (column.Strings is not null && row < column.Strings.Count)
        {
            return DpsParser.Parse(column.Strings[row]);
        }

        if (column.Numbers is not null && row < column.Numbers.Count)
        {
            return column.Numbers[row];
        }

        return 0;
    }
}
