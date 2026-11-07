namespace ForeverExiled.Core.Models;

/// <summary>
/// A character pulled from poe.ninja's per-character endpoint, reduced to what the
/// cluster analysis needs. Cached on disk keyed by snapshot version + account + name.
/// </summary>
public sealed class CharacterSnapshot
{
    public string Account { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string ClassName { get; set; } = string.Empty;

    public string League { get; set; } = string.Empty;

    /// <summary>Main skill taken from the ladder row that referenced this character.</summary>
    public string MainSkill { get; set; } = string.Empty;

    public int Level { get; set; }

    /// <summary>DPS reported by the ladder row (poe.ninja's weighted meta DPS).</summary>
    public double Dps { get; set; }

    public long Life { get; set; }

    public long EnergyShield { get; set; }

    public bool HasClusterJewels => ClusterJewels.Count > 0;

    public List<ClusterJewel> ClusterJewels { get; set; } = new();

    public DateTimeOffset FetchedAt { get; set; } = DateTimeOffset.UtcNow;

    public string Key => $"{Account}/{Name}";
}

/// <summary>
/// Everything the app knows about a league at one point in time. This is both the
/// on-disk cache format and the format of the bundled offline sample, so the UI runs
/// through exactly one code path whether the data is live or sampled.
/// </summary>
public sealed class SnapshotDocument
{
    public const string SourceLive = "live";
    public const string SourceSample = "sample";

    public int SchemaVersion { get; set; } = 1;

    public string LeagueUrl { get; set; } = string.Empty;

    public string LeagueName { get; set; } = string.Empty;

    /// <summary><see cref="SourceLive"/> or <see cref="SourceSample"/>.</summary>
    public string Source { get; set; } = SourceSample;

    public string SnapshotVersion { get; set; } = string.Empty;

    /// <summary>poe.ninja's <c>overview</c> parameter for this snapshot.</summary>
    public string SnapshotName { get; set; } = string.Empty;

    public DateTimeOffset GeneratedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>Minimum popularity (percent) a skill needs to be tracked.</summary>
    public double MinPopularityPercent { get; set; } = 1.0;

    public int TotalBuildsInLeague { get; set; }

    public List<SkillStat> Skills { get; set; } = new();

    public List<CharacterSnapshot> Characters { get; set; } = new();

    public bool IsSample => !string.Equals(Source, SourceLive, StringComparison.OrdinalIgnoreCase);

    public CharacterSnapshot? FindCharacter(string account, string name) =>
        Characters.FirstOrDefault(c =>
            string.Equals(c.Account, account, StringComparison.OrdinalIgnoreCase) &&
            string.Equals(c.Name, name, StringComparison.OrdinalIgnoreCase));
}

/// <summary>Cluster-jewel findings for one main skill.</summary>
public sealed class SkillClusterProfile
{
    public string Skill { get; set; } = string.Empty;

    /// <summary>Characters of this skill that were fetched and parsed.</summary>
    public int SampledBuilds { get; set; }

    /// <summary>Characters of this skill that still need a sample.</summary>
    public int PendingBuilds { get; set; }

    public List<ClusterCombo> Large { get; set; } = new();

    public List<ClusterCombo> Medium { get; set; } = new();

    public List<ClusterCombo> Small { get; set; } = new();

    /// <summary>
    /// How many of the sampled builds run at least one jewel of each size. The three
    /// shares overlap (a build can run a Large and a Medium), so they never sum to 100%.
    /// </summary>
    public List<SizeShare> SizeMix { get; set; } = new();

    public DateTimeOffset AnalyzedAt { get; set; } = DateTimeOffset.UtcNow;

    public bool HasData => Large.Count > 0 || Medium.Count > 0 || Small.Count > 0;

    public List<ClusterCombo> ForSize(ClusterSize size) => size switch
    {
        ClusterSize.Large => Large,
        ClusterSize.Medium => Medium,
        ClusterSize.Small => Small,
        _ => new List<ClusterCombo>(),
    };

    public ClusterCombo? Best(ClusterSize size) => ForSize(size).FirstOrDefault();
}

/// <summary>League-wide statistics computed across every sampled build.</summary>
public sealed class GlobalStats
{
    public int TotalBuildsInLeague { get; set; }

    public int SkillsTracked { get; set; }

    public int CharactersSampled { get; set; }

    public int JewelsCatalogued { get; set; }

    public int CombosFound { get; set; }

    public ClusterCombo? LeaderCombo { get; set; }

    public List<ClusterCombo> TopCombos { get; set; } = new();

    public List<NotableStat> TopNotables { get; set; } = new();

    public List<SizeShare> SizeMix { get; set; } = new();

    public List<BuildRef> TopDpsBuilds { get; set; } = new();

    public List<ClassShare> ClassMix { get; set; } = new();

    /// <summary>Percent of tracked skills that already have cluster data.</summary>
    public double CoveragePercent { get; set; }
}

/// <summary>The full computed view model payload for the UI.</summary>
public sealed class MetaAnalysis
{
    public SnapshotDocument Snapshot { get; set; } = new();

    public List<SkillStat> Skills { get; set; } = new();

    public List<SkillClusterProfile> Profiles { get; set; } = new();

    public GlobalStats Global { get; set; } = new();

    public List<BuildRef> Ladder { get; set; } = new();

    public SkillStat? FindSkill(string name) =>
        Skills.FirstOrDefault(s => string.Equals(s.Name, name, StringComparison.OrdinalIgnoreCase));

    public SkillClusterProfile? FindProfile(string skill) =>
        Profiles.FirstOrDefault(p => string.Equals(p.Skill, skill, StringComparison.OrdinalIgnoreCase));
}
