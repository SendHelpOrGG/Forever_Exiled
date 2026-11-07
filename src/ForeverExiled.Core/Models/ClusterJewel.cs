namespace ForeverExiled.Core.Models;

/// <summary>Cluster jewel footprint. PoE only spawns three sizes.</summary>
public enum ClusterSize
{
    Unknown = 0,
    Small = 1,
    Medium = 2,
    Large = 3,
}

public static class ClusterSizeExtensions
{
    public static string ToLabel(this ClusterSize size) => size switch
    {
        ClusterSize.Large => "Large",
        ClusterSize.Medium => "Medium",
        ClusterSize.Small => "Small",
        _ => "Unknown",
    };

    public static string ToBaseType(this ClusterSize size) => size switch
    {
        ClusterSize.Large => "Large Cluster Jewel",
        ClusterSize.Medium => "Medium Cluster Jewel",
        ClusterSize.Small => "Small Cluster Jewel",
        _ => "Cluster Jewel",
    };
}

/// <summary>
/// A single cluster jewel as equipped by a character, reduced to the fields that
/// matter for meta analysis: size, passive count, the enchant "type line" and the
/// notable passives it grants.
/// </summary>
public sealed class ClusterJewel
{
    public ClusterSize Size { get; set; } = ClusterSize.Unknown;

    /// <summary>e.g. <c>Large Cluster Jewel</c>.</summary>
    public string BaseType { get; set; } = string.Empty;

    /// <summary>Unique name (<c>Voices</c>) or rare name; empty for magic/normal bases.</summary>
    public string ItemName { get; set; } = string.Empty;

    public string Rarity { get; set; } = string.Empty;

    /// <summary>"Adds N Passive Skills".</summary>
    public int? Passives { get; set; }

    /// <summary>"N Added Passive Skills are Jewel Sockets".</summary>
    public int JewelSockets { get; set; }

    /// <summary>"Added Small Passive Skills grant: ..." - the jewel's cluster type.</summary>
    public string GrantType { get; set; } = string.Empty;

    /// <summary>"Added Small Passive Skills have N% increased Effect".</summary>
    public int EffectPercent { get; set; }

    /// <summary>Named notables, e.g. <c>Eye to Eye</c>, <c>Repeater</c>.</summary>
    public List<string> Notables { get; set; } = new();

    /// <summary>"Added Small Passive Skills also grant: ..." lines.</summary>
    public List<string> SmallGrants { get; set; } = new();

    public bool Fractured { get; set; }

    public bool Corrupted { get; set; }

    public int? ItemLevel { get; set; }

    /// <summary>Notables in a stable, case-insensitive alphabetical order.</summary>
    public string SortedNotables =>
        Notables.Count == 0
            ? string.Empty
            : string.Join(" + ", Notables.OrderBy(n => n, StringComparer.OrdinalIgnoreCase));

    /// <summary>Stable identity used to group identical jewels into one combination.</summary>
    public string ComboKey
    {
        get
        {
            var notables = Notables.Count == 0
                ? (string.IsNullOrWhiteSpace(ItemName) ? "(no notables)" : ItemName)
                : SortedNotables;
            return $"{Size}|{notables}";
        }
    }

    public string ComboLabel
    {
        get
        {
            if (Notables.Count > 0)
            {
                return SortedNotables;
            }

            if (!string.IsNullOrWhiteSpace(ItemName))
            {
                return JewelSockets > 0 ? $"{ItemName} ({JewelSockets} sockets)" : ItemName;
            }

            return "No named notables";
        }
    }
}

/// <summary>
/// One ranked "cluster jewel combination" - the grouping the app is built around
/// (for example <c>Eye to Eye + Repeater</c> on a medium cluster jewel).
/// </summary>
public sealed class ClusterCombo
{
    public ClusterSize Size { get; set; }

    public List<string> Notables { get; set; } = new();

    public string Label { get; set; } = string.Empty;

    /// <summary>Builds (of the analysed sample) running this combination.</summary>
    public int BuildCount { get; set; }

    /// <summary>Percent of the analysed sample, 0-100.</summary>
    public double PercentOfBuilds { get; set; }

    /// <summary>Average DPS of the builds that run this combination.</summary>
    public double AverageDps { get; set; }

    public double PeakDps { get; set; }

    public string TopBuildName { get; set; } = string.Empty;

    public string TopBuildAccount { get; set; } = string.Empty;

    public string TopBuildClass { get; set; } = string.Empty;

    /// <summary>Most common enchant type line across the grouped jewels.</summary>
    public string GrantType { get; set; } = string.Empty;

    /// <summary>Most common passive count, e.g. <c>4 passives</c>.</summary>
    public string PassivesLabel { get; set; } = string.Empty;

    public int EffectPercent { get; set; }

    /// <summary>Main skills that use this combination (populated for global statistics).</summary>
    public List<string> Skills { get; set; } = new();

    public string Slug { get; set; } = string.Empty;

    /// <summary>
    /// One jewel that represents the combination (the first sample seen), so the UI can
    /// show the item card - rarity, name, item level, flags - exactly as the site does.
    /// </summary>
    public ClusterJewel? Representative { get; set; }
}

/// <summary>Frequency of a single notable passive across the analysed sample.</summary>
public sealed class NotableStat
{
    public string Name { get; set; } = string.Empty;

    public ClusterSize Size { get; set; }

    public int Count { get; set; }

    public double Percent { get; set; }
}

/// <summary>Share of the sample using each cluster size.</summary>
public sealed class SizeShare
{
    public ClusterSize Size { get; set; }

    public int Count { get; set; }

    public double Percent { get; set; }
}
