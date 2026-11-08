namespace ForeverExiled.Core.Models;

/// <summary>
/// One league snapshot as advertised by poe.ninja's <c>index-state</c> endpoint.
/// Every builds request is pinned to a <see cref="Version"/> hash, which rotates
/// whenever poe.ninja re-snapshots the ladder.
/// </summary>
public sealed class LeagueInfo
{
    public string Name { get; set; } = string.Empty;

    /// <summary>URL slug used by poe.ninja, e.g. <c>allflame</c>.</summary>
    public string Url { get; set; } = string.Empty;

    /// <summary>Snapshot name passed as the <c>overview</c> query parameter.</summary>
    public string SnapshotName { get; set; } = string.Empty;

    public string Version { get; set; } = string.Empty;

    public string Type { get; set; } = "exp";

    public bool IsChallenge { get; set; }

    public bool IsHardcore { get; set; }

    public bool IsSsf { get; set; }

    public bool IsRuthless { get; set; }

    public string PassiveTree { get; set; } = string.Empty;

    public List<string> TimeMachineLabels { get; set; } = new();

    public string DisplayName => Name;
}

/// <summary>A share of builds belonging to a single class / ascendancy.</summary>
public sealed class ClassShare
{
    public string Name { get; set; } = string.Empty;

    public int Count { get; set; }

    public double Percent { get; set; }
}

/// <summary>A single build (character) reference taken from the ladder rows.</summary>
public sealed class BuildRef
{
    public string Name { get; set; } = string.Empty;

    public string Account { get; set; } = string.Empty;

    public string ClassName { get; set; } = string.Empty;

    public string MainSkill { get; set; } = string.Empty;

    public int Level { get; set; }

    public double Dps { get; set; }

    public string League { get; set; } = string.Empty;

    /// <summary>Number of cluster jewels the character runs (0 when not sampled yet).</summary>
    public int ClusterJewelCount { get; set; }

    /// <summary>True once this character's sheet has been read, so its jewels are counted.</summary>
    public bool Sampled { get; set; }

    public string DisplayName => string.IsNullOrWhiteSpace(Account) ? Name : $"{Name} ({Account})";
}

/// <summary>Aggregated statistics for one main skill.</summary>
public sealed class SkillStat
{
    public string Name { get; set; } = string.Empty;

    /// <summary>Number of ladder characters whose main skill is this gem.</summary>
    public int BuildCount { get; set; }

    /// <summary>Share of all ladder characters, 0-100.</summary>
    public double PopularityPercent { get; set; }

    public double AverageDps { get; set; }

    public double PeakDps { get; set; }

    public double MedianDps { get; set; }

    /// <summary>Damage type used for colouring the UI (fire, cold, lightning, chaos, physical).</summary>
    public string DamageType { get; set; } = string.Empty;

    public List<ClassShare> Classes { get; set; } = new();

    /// <summary>Top builds by DPS for this skill; the cluster-jewel sampler walks this list.</summary>
    public List<BuildRef> TopBuilds { get; set; } = new();

    public string TopClass => Classes.Count > 0 ? Classes[0].Name : string.Empty;

    public double TopClassPercent => Classes.Count > 0 ? Classes[0].Percent : 0;
}
