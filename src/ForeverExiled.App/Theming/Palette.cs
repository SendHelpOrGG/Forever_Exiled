using ForeverExiled.Core.Analysis;
using ForeverExiled.Core.Models;

namespace ForeverExiled.App.Theming;

/// <summary>
/// Mirrors Themes/Colors.xaml for the cases where a colour has to be computed in code
/// (per-damage-type accents, cluster size accents, alpha ramps).
/// </summary>
public static class Palette
{
    public static readonly Color Bg = Color.FromArgb("#0D1319");
    public static readonly Color Surface = Color.FromArgb("#161E27");
    public static readonly Color SurfaceAlt = Color.FromArgb("#1B242E");
    public static readonly Color SurfaceRaised = Color.FromArgb("#222D38");
    public static readonly Color Border = Color.FromArgb("#26313D");
    public static readonly Color TextPrimary = Color.FromArgb("#E7ECF2");
    public static readonly Color TextSecondary = Color.FromArgb("#A2AEBB");
    public static readonly Color TextMuted = Color.FromArgb("#6C7A89");
    public static readonly Color Accent = Color.FromArgb("#3FAE7A");
    public static readonly Color AccentDeep = Color.FromArgb("#2F8B60");
    public static readonly Color Success = Color.FromArgb("#3FAE7A");
    public static readonly Color Warning = Color.FromArgb("#D59D40");
    public static readonly Color Danger = Color.FromArgb("#E0605E");

    public static readonly Color Cold = Color.FromArgb("#6CB8E8");
    public static readonly Color Fire = Color.FromArgb("#E8794A");
    public static readonly Color Lightning = Color.FromArgb("#E7C55E");
    public static readonly Color Chaos = Color.FromArgb("#A17FE0");
    public static readonly Color Physical = Color.FromArgb("#B6BEC8");
    public static readonly Color Minion = Color.FromArgb("#74C6A2");

    public static Color ForDamageType(string? damageType) => damageType switch
    {
        DamageTypes.Cold => Cold,
        DamageTypes.Fire => Fire,
        DamageTypes.Lightning => Lightning,
        DamageTypes.Chaos => Chaos,
        DamageTypes.Minion => Minion,
        _ => Physical,
    };

    public static Color ForClusterSize(ClusterSize size) => size switch
    {
        ClusterSize.Large => Color.FromArgb("#D59D40"),
        ClusterSize.Medium => Color.FromArgb("#4A90E2"),
        ClusterSize.Small => Color.FromArgb("#A17FE0"),
        _ => TextMuted,
    };

    public static string ImageForClusterSize(ClusterSize size) => size switch
    {
        ClusterSize.Large => "cluster_large.png",
        ClusterSize.Medium => "cluster_medium.png",
        ClusterSize.Small => "cluster_small.png",
        _ => "cluster_medium.png",
    };

    /// <summary>
    /// Ascendancy and base-class names that have portrait art in Resources/Images
    /// (asc_&lt;name&gt;.png). Returns an empty string for anything unknown so the
    /// views can simply hide the portrait.
    /// </summary>
    private static readonly HashSet<string> AscendancyArt = new(StringComparer.OrdinalIgnoreCase)
    {
        "Ascendant", "Assassin", "Berserker", "Champion", "Chieftain", "Deadeye", "Elementalist",
        "Gladiator", "Guardian", "Hierophant", "Inquisitor", "Juggernaut", "Necromancer",
        "Occultist", "Pathfinder", "Raider", "Saboteur", "Slayer", "Trickster", "Warden",
        "Duelist", "Marauder", "Ranger", "Scion", "Shadow", "Templar", "Witch",
    };

    public static string ImageForAscendancy(string? className)
    {
        var name = (className ?? string.Empty).Trim();
        return AscendancyArt.Contains(name)
            ? "asc_" + name.ToLowerInvariant() + ".png"
            : string.Empty;
    }

    public static Color Alpha(Color color, float alpha) => color.WithAlpha(alpha);
}
