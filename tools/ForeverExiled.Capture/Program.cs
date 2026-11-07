using System.Globalization;
using System.Text.Json;
using ForeverExiled.Core.Analysis;
using ForeverExiled.Core.Formatting;
using ForeverExiled.Core.Models;
using ForeverExiled.Core.Net;

namespace ForeverExiled.Capture;

/// <summary>
/// Headless capture: runs the same two-phase sync the desktop app uses and writes the
/// resulting snapshot to JSON. Opens the real ladder to anything that reads the snapshot
/// format — the browser preview (<c>preview/data/live-snapshot.json</c>) and the app cache.
///
///     dotnet run --project tools/ForeverExiled.Capture -- --league allflame --preview
///
/// No MAUI, no Windows, no UI. Just poe.ninja, politely.
/// </summary>
internal static class Program
{
    private static async Task<int> Main(string[] args)
    {
        try
        {
            return await RunAsync(args).ConfigureAwait(false);
        }
        catch (OperationCanceledException)
        {
            Console.Error.WriteLine();
            Console.Error.WriteLine("Cancelled. Any characters already sampled were written to the cache.");
            return 130;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine();
            Console.Error.WriteLine("Capture failed: " + ex.Message);
            return 1;
        }
    }

    private static async Task<int> RunAsync(string[] args)
    {
        var options = CaptureOptions.Parse(args);
        if (options.ShowHelp)
        {
            CaptureOptions.PrintHelp();
            return 0;
        }

        using var client = new PoeNinjaClient(minInterval: TimeSpan.FromSeconds(options.PacingSeconds));
        client.Log = message =>
        {
            if (options.Verbose)
            {
                Console.Error.WriteLine("    " + message);
            }
        };

        var store = new SnapshotStore(Path.GetFullPath(options.CacheDirectory));
        var sync = new SyncService(client, store);

        Console.WriteLine($"Forever Exiled capture · league \"{options.LeagueUrl}\" · depth {options.Depth} · floor {options.Floor:0.#}%");
        Console.WriteLine($"cache {store.Root}");
        Console.WriteLine();

        var index = await sync.GetLeaguesAsync(CancellationToken.None).ConfigureAwait(false);
        var candidates = index.ForLeague(options.LeagueUrl);
        var league = candidates.FirstOrDefault(l => string.Equals(l.Type, "exp", StringComparison.OrdinalIgnoreCase))
                     ?? candidates.FirstOrDefault();

        if (league is null)
        {
            Console.Error.WriteLine($"No poe.ninja snapshot found for \"{options.LeagueUrl}\".");
            var urls = index.Snapshots.Select(s => s.Url).Distinct(StringComparer.OrdinalIgnoreCase).OrderBy(u => u);
            Console.Error.WriteLine("Available: " + string.Join(", ", urls));
            return 2;
        }

        Console.WriteLine($"snapshot {league.SnapshotName} · version {league.Version}");

        var settings = new AppSettings
        {
            LeagueUrl = league.Url,
            MinPopularityPercent = options.Floor,
            MaxSkills = options.MaxSkills,
            SampleDepth = options.Depth,
            PacingSeconds = options.PacingSeconds,
        };

        var progress = new Progress<SyncProgress>(WriteProgress);

        var document = await sync.RefreshLadderAsync(league, settings, progress, CancellationToken.None)
            .ConfigureAwait(false);
        FinishProgress();

        Console.WriteLine($"ladder: {DpsFormatter.Count(document.TotalBuildsInLeague)} builds, " +
                          $"{document.Skills.Count} skills above {options.Floor:0.#}%");

        if (options.Depth > 0)
        {
            var skillNames = document.Skills.Select(s => s.Name).ToList();
            if (options.SampleSkills > 0)
            {
                skillNames = skillNames.Take(options.SampleSkills).ToList();
            }

            var estimate = TimeSpan.FromSeconds((double)skillNames.Count * options.Depth * options.PacingSeconds);
            Console.WriteLine($"sampling {skillNames.Count} skills x {options.Depth} builds " +
                              $"(~{estimate.TotalMinutes:0} min at {options.PacingSeconds}s pacing)");

            document = await sync.SampleManyAsync(document, skillNames, options.Depth, progress, CancellationToken.None)
                .ConfigureAwait(false);
            FinishProgress();
        }

        var analysis = new MetaAnalyzer().Analyze(document);
        var jewels = document.Characters.Sum(c => c.ClusterJewels.Count);

        var json = JsonSerializer.Serialize(
            document,
            new JsonSerializerOptions(SnapshotStore.JsonOptions) { WriteIndented = false });

        var outputPath = Path.GetFullPath(options.OutputPath);
        var directory = Path.GetDirectoryName(outputPath);
        if (!string.IsNullOrEmpty(directory))
        {
            Directory.CreateDirectory(directory);
        }

        await File.WriteAllTextAsync(outputPath, json + Environment.NewLine).ConfigureAwait(false);
        store.SaveSnapshot(document);

        Console.WriteLine();
        Console.WriteLine($"wrote {outputPath}  ({json.Length / 1024} KB)");
        Console.WriteLine($"  {document.Skills.Count} skills · {document.Characters.Count} characters · " +
                          $"{jewels} cluster jewels · {analysis.Global.CombosFound} combinations");

        var leader = analysis.Global.LeaderCombo;
        if (leader is not null)
        {
            Console.WriteLine($"  global leader: {leader.Label} ({leader.Size}) — " +
                              $"{leader.BuildCount} builds, {DpsFormatter.Percent(leader.PercentOfBuilds)}, " +
                              $"anchor {leader.TopBuildName}");
        }

        Console.WriteLine();
        Console.WriteLine("Top 5 main skills by popularity:");
        foreach (var skill in document.Skills.OrderByDescending(s => s.PopularityPercent).Take(5))
        {
            var profile = analysis.Profiles.FirstOrDefault(p =>
                string.Equals(p.Skill, skill.Name, StringComparison.OrdinalIgnoreCase));
            var medium = profile?.Medium.FirstOrDefault();
            Console.WriteLine($"  {DpsFormatter.Percent(skill.PopularityPercent),6}  {skill.Name}" +
                              (medium is null
                                  ? string.Empty
                                  : $"  →  Medium: {medium.Label} ({DpsFormatter.Percent(medium.PercentOfBuilds)})"));
        }

        if (options.CopyToPreview)
        {
            var previewPath = Path.Combine(options.RepositoryRoot, "preview", "data", "live-snapshot.json");
            Directory.CreateDirectory(Path.GetDirectoryName(previewPath)!);
            await File.WriteAllTextAsync(previewPath, json + Environment.NewLine).ConfigureAwait(false);
            Console.WriteLine();
            Console.WriteLine($"copied to {previewPath} — reload http://localhost:8080 and the");
            Console.WriteLine("synthetic banner disappears (source is \"live\").");
        }
        else
        {
            Console.WriteLine();
            Console.WriteLine("To show this in the browser preview:");
            Console.WriteLine($"  cp \"{outputPath}\" preview/data/live-snapshot.json");
        }

        return 0;
    }

    private static int _lastProgressWidth;

    private static void WriteProgress(SyncProgress progress)
    {
        if (progress.Total <= 0)
        {
            return;
        }

        var text = $"  {progress.Phase,-9} {progress.Message}  [{progress.Completed}/{progress.Total}]";
        var padded = text.PadRight(_lastProgressWidth);
        _lastProgressWidth = Math.Max(_lastProgressWidth, text.Length);

        Console.Write('\r' + padded);
    }

    private static void FinishProgress()
    {
        if (_lastProgressWidth > 0)
        {
            Console.Write('\r' + new string(' ', _lastProgressWidth) + '\r');
            _lastProgressWidth = 0;
        }
    }
}

/// <summary>Command-line options; every one of them has a safe default.</summary>
internal sealed record CaptureOptions
{
    public string LeagueUrl { get; init; } = "allflame";

    public double Floor { get; init; } = 1.0;

    public int MaxSkills { get; init; } = 24;

    public int Depth { get; init; } = 12;

    public int SampleSkills { get; init; }

    public int PacingSeconds { get; init; } = 5;

    public string OutputPath { get; init; } = "snapshot.json";

    public string CacheDirectory { get; init; } = "capture-cache";

    public bool CopyToPreview { get; init; }

    public bool Verbose { get; init; }

    public bool ShowHelp { get; init; }

    public string RepositoryRoot => FindRepositoryRoot();

    public static CaptureOptions Parse(string[] args)
    {
        var options = new CaptureOptions();
        var outputSpecified = args.Any(a => string.Equals(a, "--out", StringComparison.Ordinal));

        for (var i = 0; i < args.Length; i++)
        {
            var arg = args[i];
            string Next(string name)
            {
                if (i + 1 >= args.Length)
                {
                    throw new ArgumentException($"{name} needs a value.");
                }

                return args[++i];
            }

            options = arg switch
            {
                "-h" or "--help" => options with { ShowHelp = true },
                "-v" or "--verbose" => options with { Verbose = true },
                "--preview" => options with { CopyToPreview = true },
                "--no-sample" => options with { Depth = 0 },
                "--league" => options with { LeagueUrl = Next(arg) },
                "--floor" => options with { Floor = ParseDouble(Next(arg), arg) },
                "--depth" => options with { Depth = ParseInt(Next(arg), arg) },
                "--skills" => options with { SampleSkills = ParseInt(Next(arg), arg) },
                "--max-skills" => options with { MaxSkills = ParseInt(Next(arg), arg) },
                "--pacing" => options with { PacingSeconds = Math.Max(1, ParseInt(Next(arg), arg)) },
                "--cache" => options with { CacheDirectory = Next(arg) },
                "--out" => options with { OutputPath = Next(arg) },
                _ => throw new ArgumentException($"Unknown option \"{arg}\". Try --help."),
            };
        }

        if (!outputSpecified && !options.ShowHelp)
        {
            options = options with { OutputPath = $"snapshot-{options.LeagueUrl}.json" };
        }

        return options;
    }

    private static int ParseInt(string text, string name) =>
        int.TryParse(text, NumberStyles.Integer, CultureInfo.InvariantCulture, out var value)
            ? value
            : throw new ArgumentException($"{name} expects a whole number, got \"{text}\".");

    private static double ParseDouble(string text, string name) =>
        double.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out var value)
            ? value
            : throw new ArgumentException($"{name} expects a number, got \"{text}\".");

    private static string FindRepositoryRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null)
        {
            if (File.Exists(Path.Combine(directory.FullName, "ForeverExiled.sln")))
            {
                return directory.FullName;
            }

            directory = directory.Parent;
        }

        return Directory.GetCurrentDirectory();
    }

    public static void PrintHelp()
    {
        Console.WriteLine("""
            Forever Exiled capture — pull the real poe.ninja ladder into a snapshot JSON.

            Usage:
              dotnet run --project tools/ForeverExiled.Capture -- [options]

            Options:
              --league <url>      League slug from index-state (default: allflame)
              --floor <pct>       Popularity floor for tracked skills (default: 1.0)
              --depth <n>         Characters sampled per skill (default: 12, 0 = ladder only)
              --skills <n>        Only sample the first n tracked skills (default: all)
              --max-skills <n>    Cap on tracked skills (default: 24)
              --pacing <sec>      Seconds between character requests (default: 5)
              --out <path>        Snapshot file to write (default: snapshot-<league>.json)
              --cache <dir>       Working cache, lets a crawl resume (default: capture-cache)
              --preview           Also copy the result to preview/data/live-snapshot.json
              --no-sample         Ladder only, skip the per-character crawl
              --verbose           Print every HTTP request the client makes
              -h, --help          This text

            Examples:
              # real ladder + 12 builds per skill, straight into the browser preview
              dotnet run --project tools/ForeverExiled.Capture -- --preview

              # quick look: top 5 skills only, 6 builds each, 3s pacing
              dotnet run --project tools/ForeverExiled.Capture -- --skills 5 --depth 6 --pacing 3

            Etiquette: per-character requests are the ones poe.ninja throttles. The client
            honours Retry-After and widens its pace after a 429. Leave --pacing at 5s unless
            you have a reason not to.
            """);
    }
}
