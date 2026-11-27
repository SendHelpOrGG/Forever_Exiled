using System.Reflection;

namespace ForeverExiled.App;

/// <summary>
/// What this binary actually is, in one line. Rebuilding is the only way a change reaches the
/// running app, and "nothing changed" is impossible to distinguish from "the build did not
/// happen" without something on screen saying which build you are looking at.
/// </summary>
public static class BuildInfo
{
    /// <summary>
    /// Bumped by hand whenever the sync pipeline changes behaviour, so a diagnosis can start
    /// from "is this build new enough to have the fix" instead of assuming it.
    /// </summary>
    public const int PipelineVersion = 9;

    public static string Label { get; } = Compose(includeTime: true);

    public static string Short { get; } = Compose(includeTime: false);

    private static string Compose(bool includeTime)
    {
        var assembly = typeof(BuildInfo).Assembly;
        var version = assembly.GetName().Version?.ToString(3) ?? "0.0.0";
        var parts = new List<string> { $"v{version}", $"pipeline {PipelineVersion}" };

        if (includeTime)
        {
            var built = BuildTime(assembly);
            if (built is { } stamp)
            {
                parts.Add($"built {stamp:yyyy-MM-dd HH:mm}");
            }
        }

        return string.Join(" · ", parts);
    }

    private static DateTimeOffset? BuildTime(Assembly assembly)
    {
        try
        {
            var location = assembly.Location;
            return string.IsNullOrEmpty(location) || !File.Exists(location)
                ? null
                : File.GetLastWriteTime(location);
        }
        catch (IOException)
        {
            return null;
        }
        catch (NotSupportedException)
        {
            return null;
        }
    }
}
