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

            var numbers = columnMessage.FirstBytes(6) is { } packed
                ? ProtoWire.ReadPackedVarints(packed)
                : columnMessage.FirstBytes(8) is { } packedFlags
                    ? ProtoWire.ReadPackedVarints(packedFlags)
                    : null;

            columns.Add(new SearchColumn
            {
                Name = name,
                Rows = (int)columnMessage.FirstInt(13),
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
    /// Flattens the column-oriented ladder table into build rows. Column names are
    /// matched with tolerant candidates because poe.ninja renames them between
    /// seasons (e.g. <c>dps</c> vs <c>dps.total</c>).
    /// </summary>
    public static List<BuildRef> ExtractRows(
        SearchResponse response,
        IReadOnlyDictionary<string, string[]> dictionaries)
    {
        var rows = new List<BuildRef>();
        if (response.Columns.Count == 0)
        {
            return rows;
        }

        var nameColumn = response.FindColumn("name", "characterName", "character.name");
        var accountColumn = response.FindColumn("account", "accountName", "character.account");
        var classColumn = response.FindColumn("class", "className", "ascendancy");
        var levelColumn = response.FindColumn("level", "character.level");
        var dpsColumn = response.FindColumn("dps.total", "dps.totalWeighted", "dps", "dpsTotal");
        var skillColumn = response.FindColumn("skills", "mainSkill", "skill");
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
