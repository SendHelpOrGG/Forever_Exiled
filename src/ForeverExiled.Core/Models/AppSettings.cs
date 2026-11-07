namespace ForeverExiled.Core.Models;

/// <summary>User preferences persisted next to the snapshot cache.</summary>
public sealed class AppSettings
{
    public string LeagueUrl { get; set; } = "allflame";

    /// <summary>Skills below this popularity share are ignored (the app's 1% rule).</summary>
    public double MinPopularityPercent { get; set; } = 1.0;

    /// <summary>How many of the most popular skills to track per refresh.</summary>
    public int MaxSkills { get; set; } = 24;

    /// <summary>Characters to sample per skill when looking for cluster jewels.</summary>
    public int SampleDepth { get; set; } = 12;

    /// <summary>Minimum seconds between poe.ninja requests. Keep this civil.</summary>
    public int PacingSeconds { get; set; } = 5;

    public AppSettings Clone() => (AppSettings)MemberwiseClone();
}

/// <summary>A single progress tick from a long-running sync / sampling job.</summary>
public readonly record struct SyncProgress(
    string Phase,
    string Message,
    int Completed,
    int Total)
{
    public double Fraction => Total <= 0 ? 0 : Math.Clamp((double)Completed / Total, 0, 1);

    public static SyncProgress Idle { get; } = new("Idle", string.Empty, 0, 0);
}
