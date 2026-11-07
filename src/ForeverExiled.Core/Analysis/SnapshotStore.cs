using System.Text.Json;
using System.Text.Json.Serialization;
using ForeverExiled.Core.Models;

namespace ForeverExiled.Core.Analysis;

/// <summary>
/// Filesystem cache. One JSON document per league keeps the whole analysis offline-capable
/// and makes the crawl resumable: characters already sampled are never fetched twice.
/// </summary>
public sealed class SnapshotStore
{
    private readonly string _root;

    public SnapshotStore(string rootDirectory)
    {
        _root = rootDirectory;
        Directory.CreateDirectory(_root);
        Directory.CreateDirectory(Path.Combine(_root, "diagnostics"));
    }

    public static JsonSerializerOptions JsonOptions { get; } = CreateJsonOptions();

    public string Root => _root;

    public string GetSnapshotPath(string leagueUrl) =>
        Path.Combine(_root, $"snapshot-{Sanitize(leagueUrl)}.json");

    public SnapshotDocument? LoadSnapshot(string leagueUrl)
    {
        var path = GetSnapshotPath(leagueUrl);
        if (!File.Exists(path))
        {
            return null;
        }

        try
        {
            var json = File.ReadAllText(path);
            return JsonSerializer.Deserialize<SnapshotDocument>(json, JsonOptions);
        }
        catch (Exception ex) when (ex is IOException or JsonException or UnauthorizedAccessException)
        {
            return null;
        }
    }

    public void SaveSnapshot(SnapshotDocument snapshot)
    {
        ArgumentNullException.ThrowIfNull(snapshot);

        var path = GetSnapshotPath(snapshot.LeagueUrl);
        var json = JsonSerializer.Serialize(snapshot, JsonOptions);
        WriteAtomic(path, json);
    }

    public IEnumerable<string> ListCachedLeagues() =>
        Directory.EnumerateFiles(_root, "snapshot-*.json")
            .Select(Path.GetFileNameWithoutExtension)
            .Where(name => !string.IsNullOrEmpty(name))
            .Select(name => name!["snapshot-".Length..]);

    public AppSettings LoadSettings()
    {
        var path = Path.Combine(_root, "settings.json");
        if (!File.Exists(path))
        {
            return new AppSettings();
        }

        try
        {
            var json = File.ReadAllText(path);
            return JsonSerializer.Deserialize<AppSettings>(json, JsonOptions) ?? new AppSettings();
        }
        catch (Exception ex) when (ex is IOException or JsonException)
        {
            return new AppSettings();
        }
    }

    public void SaveSettings(AppSettings settings)
    {
        ArgumentNullException.ThrowIfNull(settings);
        var path = Path.Combine(_root, "settings.json");
        WriteAtomic(path, JsonSerializer.Serialize(settings, JsonOptions));
    }

    /// <summary>Stores a raw payload that failed to parse, so format drift is diagnosable.</summary>
    public string SaveDiagnostic(string name, byte[] payload)
    {
        var safeName = Sanitize(name);
        var path = Path.Combine(_root, "diagnostics", $"{DateTime.UtcNow:yyyyMMdd-HHmmss}-{safeName}.bin");
        try
        {
            File.WriteAllBytes(path, payload);
        }
        catch (IOException)
        {
            return string.Empty;
        }

        return path;
    }

    public long GetCacheSizeBytes()
    {
        long total = 0;
        foreach (var file in Directory.EnumerateFiles(_root, "*", SearchOption.AllDirectories))
        {
            try
            {
                total += new FileInfo(file).Length;
            }
            catch (IOException)
            {
                // ignore unreadable entries
            }
        }

        return total;
    }

    public void ClearCache()
    {
        foreach (var file in Directory.EnumerateFiles(_root, "snapshot-*.json"))
        {
            try
            {
                File.Delete(file);
            }
            catch (IOException)
            {
                // ignore
            }
        }

        var diagnostics = Path.Combine(_root, "diagnostics");
        if (Directory.Exists(diagnostics))
        {
            foreach (var file in Directory.EnumerateFiles(diagnostics))
            {
                try
                {
                    File.Delete(file);
                }
                catch (IOException)
                {
                    // ignore
                }
            }
        }
    }

    private static void WriteAtomic(string path, string content)
    {
        var directory = Path.GetDirectoryName(path);
        if (!string.IsNullOrEmpty(directory))
        {
            Directory.CreateDirectory(directory);
        }

        var temporary = path + ".tmp";
        File.WriteAllText(temporary, content);
        File.Move(temporary, path, overwrite: true);
    }

    private static string Sanitize(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "unknown";
        }

        var invalid = Path.GetInvalidFileNameChars();
        var chars = value.Select(c => invalid.Contains(c) ? '-' : c).ToArray();
        return new string(chars).Trim();
    }

    private static JsonSerializerOptions CreateJsonOptions()
    {
        var options = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true,
            AllowTrailingCommas = true,
            ReadCommentHandling = JsonCommentHandling.Skip,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            WriteIndented = false,
        };
        options.Converters.Add(new JsonStringEnumConverter());
        return options;
    }
}
