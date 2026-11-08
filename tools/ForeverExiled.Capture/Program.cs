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
        client.PreferCharacterPages = !options.NoPages;
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

        if (options.Diagnose)
        {
            return await DiagnoseAsync(client, league, options.DiagnoseDirectory).ConfigureAwait(false);
        }

        var settings = new AppSettings
        {
            LeagueUrl = league.Url,
            MinPopularityPercent = options.Floor,
            MaxSkills = options.MaxSkills,
            SampleDepth = options.Depth,
            GradeEverySkill = options.GradeEverySkill,
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

    /// <summary>
    /// Prints what poe.ninja actually returned for the search call, for both values of the
    /// `overview` parameter, and drops the raw payloads next to the summary so a parser bug
    /// can be reproduced without another network round trip.
    /// </summary>
    private static async Task<int> DiagnoseAsync(PoeNinjaClient client, LeagueInfo league, string directory)
    {
        var target = Path.GetFullPath(directory);
        Directory.CreateDirectory(target);

        // every request the client makes, printed as it happens
        client.Log = message => Console.WriteLine("    " + message);

        Console.WriteLine($"diagnose · league \"{league.Url}\" · name \"{league.Name}\"");
        Console.WriteLine($"  snapshotName \"{league.SnapshotName}\" · version {league.Version} · type {league.Type}");
        Console.WriteLine($"  writing {target}");
        Console.WriteLine();

        var overviews = new[] { league.SnapshotName, league.Url }
            .Where(o => o.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var found = 0;
        var probe = new List<BuildRef>();
        foreach (var overview in overviews)
        {
            var raw = await client.SearchRawAsync(league, null, CancellationToken.None, overview).ConfigureAwait(false);
            var response = SearchResponseParser.Parse(raw);
            var dictionaries = await client.GetDictionariesAsync(response, CancellationToken.None).ConfigureAwait(false);
            var rows = SearchResponseParser.ExtractRows(response, dictionaries);

            var slug = new string(overview.Select(c => char.IsLetterOrDigit(c) ? c : '-').ToArray());
            var stem = Path.Combine(target, $"search-{slug}-{league.Version}");
            await File.WriteAllBytesAsync(stem + ".bin", raw).ConfigureAwait(false);

            var summary = new List<string>
            {
                $"overview={overview}",
                $"url=/poe1/api/builds/{league.Version}/search?overview={overview}&type={league.Type}&sort=dps",
                $"payload={raw.Length} bytes",
                SearchResponseParser.Describe(response),
                $"rows extracted: {rows.Count}",
                string.Empty,
            };

            foreach (var column in response.Columns)
            {
                summary.Add($"column {column.Name}: rows={column.Rows} strings={column.Strings?.Count ?? 0} " +
                            $"numbers={column.Numbers?.Count ?? 0} dict={column.DictionaryId}");
            }

            // ordered by DPS, so these are the rows the site's own DPS sort would put on top
            var topRows = rows.OrderByDescending(r => r.Dps).Take(5).ToList();
            foreach (var row in topRows)
            {
                summary.Add($"row {row.Name} | {row.Account} | {row.ClassName} | " +
                            $"lvl {row.Level} | {row.Dps:N0} dps | {row.MainSkill}");
            }

            if (rows.Count == 0)
            {
                summary.Add("no rows: if the column list above is empty, poe.ninja sent aggregates " +
                            "only; if it is not, the column names no longer match what ExtractRows looks for.");
            }

            await File.WriteAllLinesAsync(stem + ".txt", summary).ConfigureAwait(false);

            Console.WriteLine($"overview=\"{overview}\"");
            Console.WriteLine($"  {SearchResponseParser.Describe(response)}");
            Console.WriteLine($"  rows extracted: {rows.Count}, highest DPS {rows.Select(r => r.Dps).DefaultIfEmpty(0).Max():N0}");
            foreach (var row in topRows)
            {
                Console.WriteLine($"    top {row.Dps:N0} · {row.Name} · {row.MainSkill}");
            }

            foreach (var column in response.Columns.Take(20))
            {
                Console.WriteLine($"    column {column.Name}: rows={column.Rows} " +
                                  $"strings={column.Strings?.Count ?? 0} numbers={column.Numbers?.Count ?? 0} " +
                                  $"dict={column.DictionaryId}");
            }

            foreach (var row in rows.Take(3))
            {
                Console.WriteLine($"    row {row.Name} | {row.Account} | {row.ClassName} | {row.Dps:N0} dps");
            }

            Console.WriteLine($"  wrote {stem}.bin and .txt");
            Console.WriteLine();

            if (rows.Count > probe.Count)
            {
                probe = rows;
            }

            found = Math.Max(found, rows.Count);
        }

        // the character endpoint is the other half of the pipeline: try it on two builds
        var samples = probe.Where(r => r.Name.Length > 0 && r.Account.Length > 0).Take(2).ToList();
        if (samples.Count > 0)
        {
            Console.WriteLine("Character sheets:");
            foreach (var build in samples)
            {
                try
                {
                    var character = await client.GetCharacterAsync(league, build, CancellationToken.None)
                        .ConfigureAwait(false);
                    Console.WriteLine($"  {build.Name} ({build.Account}): {character.ClassName} lvl {character.Level}, " +
                                      $"{character.ClusterJewels.Count} cluster jewels, {character.Dps:N0} dps");
                }
                catch (PoeDataException ex)
                {
                    Console.WriteLine($"  {build.Name} ({build.Account}): FAILED — {ex.Message}");
                }
            }

            Console.WriteLine();
        }

        if (found == 0)
        {
            Console.WriteLine("Neither `overview` value returned ladder rows. Send the .bin/.txt pair");
            Console.WriteLine("above along with the poe.ninja snapshot version - that is the payload");
            Console.WriteLine("the parser has to be taught.");
            return 3;
        }

        Console.WriteLine($"Ladder rows are readable ({found} rows). A sync should work; if the app still");
        Console.WriteLine("shows none, the app is reading a cached snapshot from before the fix.");
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

    /// <summary>Ask the JSON endpoint instead of scraping character pages.</summary>
    public bool NoPages { get; init; }

    public string OutputPath { get; init; } = "snapshot.json";

    public string CacheDirectory { get; init; } = "capture-cache";

    public bool CopyToPreview { get; init; }

    public bool Diagnose { get; init; }

    public string DiagnoseDirectory { get; init; } = "diagnostics";

    /// <summary>One search request per skill instead of ranking from the single ladder window.</summary>
    public bool GradeEverySkill { get; init; }

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
                "--diagnose" => options with { Diagnose = true },
                "--diagnose-dir" => options with { DiagnoseDirectory = Next(arg) },
                "--no-sample" => options with { Depth = 0 },
                "--grade-all" => options with { GradeEverySkill = true },
                "--no-pages" => options with { NoPages = true },
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
              --diagnose          Dump the raw search response + column summary, then exit
              --diagnose-dir <d>  Where --diagnose writes its files (default: diagnostics)
              --no-sample         Ladder only, skip the per-character crawl
              --no-pages          Read characters from the JSON endpoint instead of scraping
                                  their pages (the pages are the lighter route)
              --grade-all         One search per skill instead of ranking from the single
                                  ladder window (slower, more rows per skill)
              --verbose           Print every HTTP request the client makes
              -h, --help          This text

            Examples:
              # real ladder + 12 builds per skill, straight into the browser preview
              dotnet run --project tools/ForeverExiled.Capture -- --preview

              # quick look: top 5 skills only, 6 builds each, 3s pacing
              dotnet run --project tools/ForeverExiled.Capture -- --skills 5 --depth 6 --pacing 3

              # the ladder came back empty, or sampling hangs: what is poe.ninja sending?
              dotnet run --project tools/ForeverExiled.Capture -- --diagnose

            Etiquette: per-character requests are the ones poe.ninja throttles. The client
            honours Retry-After and widens its pace after a 429. Leave --pacing at 5s unless
            you have a reason not to.
            """);
    }
}
