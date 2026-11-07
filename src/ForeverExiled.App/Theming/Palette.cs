using ForeverExiled.Core.Analysis;
using ForeverExiled.Core.Models;

namespace ForeverExiled.App.Theming;

/// <summary>
/// Mirrors Themes/Colors.xaml for the cases where a colour has to be computed in code
/// (per-damage-type accents, cluster size accents, alpha ramps).
/// </summary>
public static class Palette
{
    public static readonly Color Bg = Color.FromArgb("#0B0E13");
    public static readonly Color Surface = Color.FromArgb("#12161D");
    public static readonly Color SurfaceAlt = Color.FromArgb("#171C24");
    public static readonly Color SurfaceRaised = Color.FromArgb("#1C2230");
    public static readonly Color Border = Color.FromArgb("#232B36");
    public static readonly Color TextPrimary = Color.FromArgb("#EAEFF6");
    public static readonly Color TextSecondary = Color.FromArgb("#9DA9B8");
    public static readonly Color TextMuted = Color.FromArgb("#6B7787");
    public static readonly Color Gold = Color.FromArgb("#E4C078");
    public static readonly Color GoldDeep = Color.FromArgb("#C49A4F");
    public static readonly Color Success = Color.FromArgb("#5FB98C");
    public static readonly Color Warning = Color.FromArgb("#E0A24A");
    public static readonly Color Danger = Color.FromArgb("#D96C6C");

    public static readonly Color Cold = Color.FromArgb("#69B7E8");
    public static readonly Color Fire = Color.FromArgb("#E8794A");
    public static readonly Color Lightning = Color.FromArgb("#E7C55E");
    public static readonly Color Chaos = Color.FromArgb("#AE7BE0");
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
        ClusterSize.Large => Color.FromArgb("#E2794F"),
        ClusterSize.Medium => Color.FromArgb("#59C2CE"),
        ClusterSize.Small => Color.FromArgb("#A98BE8"),
        _ => TextMuted,
    };

    public static string ImageForClusterSize(ClusterSize size) => size switch
    {
        ClusterSize.Large => "cluster_large.png",
        ClusterSize.Medium => "cluster_medium.png",
        ClusterSize.Small => "cluster_small.png",
        _ => "cluster_medium.png",
    };

    public static Color Alpha(Color color, float alpha) => color.WithAlpha(alpha);
}
