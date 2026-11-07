using ForeverExiled.Core.Models;
using ForeverExiled.Core.Net;

namespace ForeverExiled.Core.Analysis;

/// <summary>
/// Two-phase synchronisation.
///
/// Phase 1 (cheap, ~1 request per tracked skill): read the league aggregate plus the
/// sorted ladder rows, keep every main skill above the popularity threshold and grade it
/// by average / peak DPS.
///
/// Phase 2 (polite, rate-limited): fetch individual character sheets for the top-DPS
/// builds of a skill and extract their cluster jewels. Characters are cached, so the
/// crawl resumes instead of repeating and re-running an analysis gets faster over time.
/// </summary>
public sealed class SyncService
{
    private readonly PoeNinjaClient _client;
    private readonly SnapshotStore _store;

    public SyncService(PoeNinjaClient client, SnapshotStore store)
    {
        _client = client ?? throw new ArgumentNullException(nameof(client));
        _store = store ?? throw new ArgumentNullException(nameof(store));
    }

    public PoeNinjaClient Client => _client;

    public SnapshotStore Store => _store;

    public Task<IndexState> GetLeaguesAsync(CancellationToken cancellationToken) =>
        _client.GetIndexStateAsync(cancellationToken);

    /// <summary>Phase 1 - ladder + popularity + DPS grading.</summary>
    public async Task<SnapshotDocument> RefreshLadderAsync(
        LeagueInfo league,
        AppSettings settings,
        IProgress<SyncProgress>? progress = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(league);
        ArgumentNullException.ThrowIfNull(settings);

        progress?.Report(new SyncProgress("Ladder", "Reading league aggregate", 0, 1));

        var first = await _client.SearchAsync(league, null, cancellationToken).ConfigureAwait(false);
        var dictionaries = await _client.GetDictionariesAsync(first, cancellationToken).ConfigureAwait(false);
        var unfilteredRows = SearchResponseParser.ExtractRows(first, dictionaries);

        var totalBuilds = first.Total > 0 ? first.Total : unfilteredRows.Count;

        var counts = ReadSkillCounts(first, dictionaries, unfilteredRows);
        var candidates = counts
            .Select(c => new
            {
                c.Name,
                c.Count,
                Share = totalBuilds > 0 ? c.Count * 100.0 / totalBuilds : 0,
            })
            .Where(c => c.Share >= settings.MinPopularityPercent && c.Name.Length > 0)
            .OrderByDescending(c => c.Count)
            .Take(Math.Max(1, settings.MaxSkills))
            .ToList();

        if (candidates.Count == 0)
        {
            throw new PoeDataException(
                "poe.ninja returned no skills above the popularity threshold. The snapshot format may have changed - try refreshing, or switch to another league.");
        }

        var denominator = candidates.Count + 1;
        var skills = new List<SkillStat>(candidates.Count);

        for (var index = 0; index < candidates.Count; index++)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var candidate = candidates[index];
            progress?.Report(new SyncProgress(
                "Ladder",
                $"Grading {candidate.Name}",
                index + 1,
                denominator));

            var rows = unfilteredRows
                .Where(r => string.Equals(r.MainSkill, candidate.Name, StringComparison.OrdinalIgnoreCase))
                .ToList();
            var buildCount = candidate.Count;

            try
            {
                var filtered = await _client.SearchAsync(
                    league,
                    new Dictionary<string, string>(StringComparer.Ordinal) { ["skills"] = candidate.Name },
                    cancellationToken).ConfigureAwait(false);

                var filteredDictionaries = filtered.DictionaryHashes.Count > 0
                    ? await _client.GetDictionariesAsync(filtered, cancellationToken).ConfigureAwait(false)
                    : dictionaries;

                var filteredRows = SearchResponseParser.ExtractRows(filtered, filteredDictionaries);
                if (filteredRows.Count > 0)
                {
                    rows = filteredRows;
                }

                if (filtered.Total > 0)
                {
                    buildCount = filtered.Total;
                }
            }
            catch (PoeDataException ex)
            {
                _client.Log?.Invoke($"skill {candidate.Name}: {ex.Message}");
            }

            foreach (var row in rows)
            {
                if (row.MainSkill.Length == 0)
                {
                    row.MainSkill = candidate.Name;
                }
            }

            var graded = rows
                .Where(r => r.Dps > 0)
                .OrderByDescending(r => r.Dps)
                .ToList();

            var dpsValues = graded.Select(r => r.Dps).ToList();

            skills.Add(new SkillStat
            {
                Name = candidate.Name,
                BuildCount = buildCount,
                PopularityPercent = Math.Round(candidate.Share, 2),
                AverageDps = dpsValues.Count > 0 ? dpsValues.Average() : 0,
                PeakDps = dpsValues.Count > 0 ? dpsValues[0] : 0,
                MedianDps = Median(dpsValues),
                DamageType = DamageTypes.Classify(candidate.Name),
                Classes = BuildClassShares(graded, buildCount),
                TopBuilds = graded.Take(40).ToList(),
            });
        }

        var previous = _store.LoadSnapshot(league.Url);

        var document = new SnapshotDocument
        {
            LeagueUrl = league.Url,
            LeagueName = league.Name,
            SnapshotName = league.SnapshotName,
            SnapshotVersion = league.Version,
            Source = SnapshotDocument.SourceLive,
            GeneratedAt = DateTimeOffset.UtcNow,
            MinPopularityPercent = settings.MinPopularityPercent,
            TotalBuildsInLeague = totalBuilds,
            Skills = skills.OrderByDescending(s => s.AverageDps).ThenByDescending(s => s.BuildCount).ToList(),
            Characters = previous?.Characters ?? new List<CharacterSnapshot>(),
        };

        _store.SaveSnapshot(document);

        progress?.Report(new SyncProgress("Ladder", "Ladder ready", denominator, denominator));
        return document;
    }

    /// <summary>
    /// Phase 2 - samples the top-DPS builds of one skill and extracts cluster jewels.
    /// </summary>
    public async Task<SnapshotDocument> SampleSkillAsync(
        SnapshotDocument document,
        string skillName,
        int depth,
        IProgress<SyncProgress>? progress = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(document);

        var skill = document.Skills.FirstOrDefault(s =>
            string.Equals(s.Name, skillName, StringComparison.OrdinalIgnoreCase));
        if (skill is null)
        {
            return document;
        }

        var sampled = new HashSet<string>(
            document.Characters.Select(c => c.Key),
            StringComparer.OrdinalIgnoreCase);

        var targets = skill.TopBuilds
            .Where(b => b.Name.Length > 0)
            .OrderByDescending(b => b.Dps)
            .Take(Math.Max(1, depth))
            .Where(b => !sampled.Contains($"{b.Account}/{b.Name}"))
            .ToList();

        if (targets.Count == 0)
        {
            progress?.Report(new SyncProgress("Sampling", $"{skillName} is already sampled", 1, 1));
            return document;
        }

        var league = ToLeague(document);
        var sinceSave = 0;
        var completed = 0;

        foreach (var target in targets)
        {
            cancellationToken.ThrowIfCancellationRequested();

            progress?.Report(new SyncProgress(
                "Sampling",
                $"{skillName}: {target.Name}",
                completed,
                targets.Count));

            try
            {
                var character = await _client.GetCharacterAsync(league, target, cancellationToken).ConfigureAwait(false);
                character.MainSkill = skillName;
                character.League = document.LeagueName;
                if (character.Dps <= 0)
                {
                    character.Dps = target.Dps;
                }

                document.Characters.RemoveAll(c =>
                    string.Equals(c.Key, character.Key, StringComparison.OrdinalIgnoreCase));
                document.Characters.Add(character);

                if (++sinceSave >= 3)
                {
                    _store.SaveSnapshot(document);
                    sinceSave = 0;
                }
            }
            catch (PoeDataException ex)
            {
                _client.Log?.Invoke($"character {target.Name}: {ex.Message}");
            }

            completed++;
        }

        document.GeneratedAt = DateTimeOffset.UtcNow;
        _store.SaveSnapshot(document);

        progress?.Report(new SyncProgress("Sampling", $"{skillName} sampled", targets.Count, targets.Count));
        return document;
    }

    /// <summary>Samples several skills in sequence (used by "analyse everything").</summary>
    public async Task<SnapshotDocument> SampleManyAsync(
        SnapshotDocument document,
        IEnumerable<string> skillNames,
        int depth,
        IProgress<SyncProgress>? progress = null,
        CancellationToken cancellationToken = default)
    {
        var skills = skillNames.ToList();
        for (var i = 0; i < skills.Count; i++)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var inner = new Progress<SyncProgress>(tick => progress?.Report(
                new SyncProgress("Sampling", $"[{i + 1}/{skills.Count}] {tick.Message}", tick.Completed, tick.Total)));

            document = await SampleSkillAsync(document, skills[i], depth, inner, cancellationToken)
                .ConfigureAwait(false);
        }

        return document;
    }

    private static LeagueInfo ToLeague(SnapshotDocument document) => new()
    {
        Url = document.LeagueUrl,
        Name = document.LeagueName,
        SnapshotName = document.SnapshotName.Length > 0 ? document.SnapshotName : document.LeagueUrl,
        Version = document.SnapshotVersion,
        Type = "exp",
    };

    private static List<(string Name, int Count)> ReadSkillCounts(
        SearchResponse response,
        IReadOnlyDictionary<string, string[]> dictionaries,
        List<BuildRef> unfilteredRows)
    {
        var dimension = response.FindDimension("skills")
                        ?? response.FindDimension("gem")
                        ?? response.FindDimension("skill")
                        ?? response.FindDimension("mainSkill");

        if (dimension is not null)
        {
            var resolved = response.ResolveDimension(dimension, dictionaries);
            if (resolved.Count > 0)
            {
                return resolved;
            }
        }

        // Fallback: derive popularity from the ladder rows we did get.
        return unfilteredRows
            .Where(r => r.MainSkill.Length > 0)
            .GroupBy(r => r.MainSkill, StringComparer.OrdinalIgnoreCase)
            .Select(g => (Name: g.First().MainSkill, Count: g.Count()))
            .OrderByDescending(t => t.Count)
            .ToList();
    }

    private static List<ClassShare> BuildClassShares(List<BuildRef> rows, int buildCount)
    {
        var total = rows.Count(r => r.ClassName.Length > 0);
        if (total == 0)
        {
            return new List<ClassShare>();
        }

        var denominator = buildCount > 0 ? Math.Max(buildCount, total) : total;

        return rows
            .Where(r => r.ClassName.Length > 0)
            .GroupBy(r => r.ClassName, StringComparer.OrdinalIgnoreCase)
            .Select(g => new ClassShare
            {
                Name = g.First().ClassName,
                Count = g.Count(),
                Percent = g.Count() * 100.0 / denominator,
            })
            .OrderByDescending(c => c.Count)
            .Take(6)
            .ToList();
    }

    private static double Median(List<double> values)
    {
        if (values.Count == 0)
        {
            return 0;
        }

        var sorted = values.OrderBy(v => v).ToList();
        var middle = sorted.Count / 2;
        return sorted.Count % 2 == 0
            ? (sorted[middle - 1] + sorted[middle]) / 2
            : sorted[middle];
    }
}
