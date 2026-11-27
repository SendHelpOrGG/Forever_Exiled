namespace ForeverExiled.Core.Net;

/// <summary>One aggregated bucket of the search response, e.g. "main skills".</summary>
public sealed class SearchDimension
{
    public string Id { get; init; } = string.Empty;

    public string DictionaryId { get; init; } = string.Empty;

    public List<DimensionCount> Counts { get; init; } = new();
}

public sealed class DimensionCount
{
    public int Key { get; init; }

    public int Count { get; init; }
}

/// <summary>
/// A column of the folder-style result table. poe.ninja sends whole columns rather
/// than per-row messages: either a repeated string field (field 7) or one packed
/// varint blob (fields 6/8) holding a number per row.
/// </summary>
public sealed class SearchColumn
{
    public string Name { get; init; } = string.Empty;

    /// <summary>Number of rows this column claims.</summary>
    public int Rows { get; init; }

    /// <summary>Dictionary the numeric values index into, when the column is categorical.</summary>
    public string DictionaryId { get; init; } = string.Empty;

    public List<string>? Strings { get; init; }

    public List<long>? Numbers { get; init; }

    public bool HasStrings => Strings is { Count: > 0 };

    public bool HasNumbers => Numbers is { Count: > 0 };

    public int ValueCount => Math.Max(Strings?.Count ?? 0, Numbers?.Count ?? 0);
}

/// <summary>Decoded poe.ninja build search response.</summary>
public sealed class SearchResponse
{
    public int Total { get; init; }

    public List<SearchDimension> Dimensions { get; init; } = new();

    public List<SearchColumn> Columns { get; init; } = new();

    /// <summary>Dictionary id (singular, e.g. <c>gem</c>) to content hash.</summary>
    public Dictionary<string, string> DictionaryHashes { get; init; } = new(StringComparer.Ordinal);

    public int RowCount => Columns.Count == 0 ? 0 : Columns.Max(c => c.ValueCount);

    public SearchColumn? FindColumn(params string[] candidates)
    {
        foreach (var candidate in candidates)
        {
            var match = Columns.FirstOrDefault(c => string.Equals(c.Name, candidate, StringComparison.OrdinalIgnoreCase));
            if (match is not null)
            {
                return match;
            }
        }

        return null;
    }

    public SearchDimension? FindDimension(string id) =>
        Dimensions.FirstOrDefault(d => string.Equals(d.Id, id, StringComparison.OrdinalIgnoreCase));

    /// <summary>
    /// Resolves a dimension's raw counts to names using the supplied dictionaries
    /// (dictionary id, e.g. <c>gem</c> -> ordered values).
    /// </summary>
    public List<(string Name, int Count)> ResolveDimension(
        SearchDimension dimension,
        IReadOnlyDictionary<string, string[]> dictionaries)
    {
        var resolved = new List<(string Name, int Count)>();
        if (!dictionaries.TryGetValue(dimension.DictionaryId, out var names))
        {
            return resolved;
        }

        foreach (var entry in dimension.Counts)
        {
            var name = entry.Key >= 0 && entry.Key < names.Length ? names[entry.Key] : $"#{entry.Key}";
            if (string.IsNullOrWhiteSpace(name))
            {
                continue;
            }

            resolved.Add((name, entry.Count));
        }

        resolved.Sort((a, b) => b.Count.CompareTo(a.Count));
        return resolved;
    }
}
