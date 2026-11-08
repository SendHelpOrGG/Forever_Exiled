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

    /// <summary>
    /// Why the last <see cref="SampleSkillAsync"/> pass stopped early, if it did. Empty when
    /// the pass either finished or had nothing to do.
    /// </summary>
    public string LastSamplingError { get; private set; } = string.Empty;

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
        var unfilteredRows = SearchResponseParser.ExtractRows(first, dictionaries, _client.Log);

        // poe.ninja answers the same call with the aggregate buckets only when the
        // `overview` value it wants is not the one we sent, and the site's own pages use
        // the league slug. Try that before concluding the ladder has no rows.
        var overview = league.SnapshotName;
        var ladderWarning = string.Empty;

        if (unfilteredRows.Count == 0 && first.Total > 0 &&
            !string.Equals(league.SnapshotName, league.Url, StringComparison.OrdinalIgnoreCase))
        {
            _client.Log?.Invoke(
                $"no ladder rows for overview={league.SnapshotName}: {SearchResponseParser.Describe(first)}");

            var retry = await _client.SearchAsync(league, null, cancellationToken, league.Url).ConfigureAwait(false);
            var retryDictionaries = retry.DictionaryHashes.Count > 0
                ? await _client.GetDictionariesAsync(retry, cancellationToken).ConfigureAwait(false)
                : dictionaries;
            var retryRows = SearchResponseParser.ExtractRows(retry, retryDictionaries, _client.Log);

            if (retryRows.Count > 0)
            {
                _client.Log?.Invoke($"ladder rows arrived with overview={league.Url}");
                overview = league.Url;
                first = retry;
                dictionaries = retryDictionaries;
                unfilteredRows = retryRows;
            }
            else
            {
                ladderWarning =
                    $"poe.ninja reported {first.Total:N0} builds but returned no ladder rows, " +
                    $"so there are no per-build DPS values or characters to sample. " +
                    $"Response: {SearchResponseParser.Describe(retry)}. " +
                    "Run the capture tool with --diagnose to dump the payload.";
            }
        }
        else if (unfilteredRows.Count == 0 && first.Total > 0)
        {
            ladderWarning =
                $"poe.ninja reported {first.Total:N0} builds but returned no ladder rows, " +
                $"so there are no per-build DPS values or characters to sample. " +
                $"Response: {SearchResponseParser.Describe(first)}. " +
                "Run the capture tool with --diagnose to dump the payload.";
        }

        if (unfilteredRows.Count == 0)
        {
            try
            {
                var scraped = await _client.ScrapeBuildsAsync(league, null, cancellationToken).ConfigureAwait(false);
                if (scraped.Count > 0)
                {
                    unfilteredRows = scraped;
                    ladderWarning = string.Empty;
                    _client.Log?.Invoke($"ladder read from the league page ({scraped.Count} rows)");
                }
            }
            catch (RateLimitedException)
            {
                throw;
            }
            catch (PoeDataException ex)
            {
                _client.Log?.Invoke($"builds page failed: {ex.Message}");
            }
        }

        // the ordering the whole app leans on is the ladder's own DPS. Without it the
        // sample is just the site's row order, and saying "top-DPS" would be a lie.
        var rowsWithDps = unfilteredRows.Count(row => row.Dps > 0);
        var dpsMissing = unfilteredRows.Count > 0 && rowsWithDps == 0;

        if (dpsMissing)
        {
            var detail = $"no ladder row carried a DPS value ({unfilteredRows.Count} rows read), " +
                         $"so builds are sampled in poe.ninja's order instead of by DPS. " +
                         $"Response: {SearchResponseParser.Describe(first)}";
            ladderWarning = ladderWarning.Length > 0 ? ladderWarning : detail;
            _client.Log?.Invoke(detail);
        }
        else if (unfilteredRows.Count > 0)
        {
            _client.Log?.Invoke(
                $"ladder rows: {unfilteredRows.Count}, with DPS: {rowsWithDps}, " +
                $"highest {unfilteredRows.Max(r => r.Dps):N0} (sort=dps)");
        }

        if (ladderWarning.Length > 0)
        {
            _client.Log?.Invoke(ladderWarning);
        }

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

        // a skill whose request failed or was rate limited has no builds and no DPS; staying
        // quiet about that is how the rail ends up full of dashes with no explanation
        var ungraded = new List<string>();
        RateLimitedException? pause = null;

        // Quick mode: one request already returned every ladder row poe.ninja is willing to
        // hand over, so group those by skill instead of asking again per skill. Full mode
        // spends a request per skill to see more of that skill's builds.
        //
        // Some deployments answer the unfiltered call with the aggregate buckets alone. Quick
        // mode is then pointless - there is nothing to group - so fall back to per-skill
        // requests rather than producing skills with no builds behind them.
        var gradeEverySkill = settings.GradeEverySkill;

        // One shared ladder page describes almost nothing: with sort=dps it holds the league's
        // top builds, which belong to a handful of skills, so grouping it leaves twenty skills
        // with no builds and no DPS. Quick mode therefore grades per skill as soon as the shared
        // page fails to cover a quarter of them - a fast path, not a broken one.
        if (!gradeEverySkill)
        {
            var covered = new HashSet<string>(
                unfilteredRows.Select(row => row.MainSkill),
                StringComparer.OrdinalIgnoreCase);

            var blind = candidates.Count(candidate => !covered.Contains(candidate.Name));

            if (unfilteredRows.Count == 0 || blind * 4 >= candidates.Count)
            {
                gradeEverySkill = true;
                _client.Log?.Invoke(
                    unfilteredRows.Count == 0
                        ? "unfiltered search returned no rows: grading one request at a time"
                        : $"one ladder page covered {candidates.Count - blind} of {candidates.Count} skills: " +
                          "grading the rest one request at a time");
            }
        }

        _client.Log?.Invoke(
            $"grading {(gradeEverySkill ? "each skill from its own page" : "from the single ladder page")} " +
            $"({candidates.Count} skills, {unfilteredRows.Count} ladder rows)");

        if (!gradeEverySkill)
        {
            progress?.Report(new SyncProgress(
                "Ladder",
                $"Grouping {unfilteredRows.Count} ladder rows by skill",
                1,
                2));
        }

        for (var index = 0; index < candidates.Count; index++)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var candidate = candidates[index];
            if (gradeEverySkill)
            {
                progress?.Report(new SyncProgress(
                    "Ladder",
                    $"Grading {candidate.Name}",
                    index + 1,
                    denominator));
            }

            var rows = unfilteredRows
                .Where(r => string.Equals(r.MainSkill, candidate.Name, StringComparison.OrdinalIgnoreCase))
                .ToList();
            var buildCount = candidate.Count;

            // The search API is the ladder: its per-skill responses carry a column named after
            // the skill ("dps-Righteous Fire.total"), which is the number the site's own table
            // shows once a skill is selected.
            if (gradeEverySkill)
            {
                try
                {
                    var filtered = await _client.SearchAsync(
                        league,
                        new Dictionary<string, string>(StringComparer.Ordinal) { ["skills"] = candidate.Name },
                        cancellationToken,
                        overview).ConfigureAwait(false);

                    var filteredDictionaries = filtered.DictionaryHashes.Count > 0
                        ? await _client.GetDictionariesAsync(filtered, cancellationToken).ConfigureAwait(false)
                        : dictionaries;

                    var filteredRows = SearchResponseParser.ExtractRows(filtered, filteredDictionaries, _client.Log);
                    if (filteredRows.Count > 0)
                    {
                        rows = filteredRows;
                    }

                    if (filtered.Total > 0)
                    {
                        buildCount = filtered.Total;
                    }
                }
                catch (RateLimitedException ex)
                {
                    // splitting the ladder over twenty requests is exactly what earns a pause;
                    // keep what was graded and stop asking
                    pause = ex;
                    for (var rest = index; rest < candidates.Count; rest++)
                    {
                        ungraded.Add(candidates[rest].Name);
                    }

                    _client.Log?.Invoke($"skill {candidate.Name}: {ex.Message}");
                    break;
                }
                catch (PoeDataException ex)
                {
                    ungraded.Add(candidate.Name);
                    _client.Log?.Invoke($"skill {candidate.Name}: {ex.Message}");
                }
            }

            // The builds page is a client-rendered shell - it arrives with no rows in it - so it
            // is only worth one request when the API left this skill with nothing at all.
            if (rows.Count == 0 && settings.PreferCharacterPages && !cancellationToken.IsCancellationRequested)
            {
                try
                {
                    var scraped = await _client.ScrapeBuildsAsync(league, candidate.Name, cancellationToken)
                        .ConfigureAwait(false);

                    if (scraped.Count > 0)
                    {
                        rows = scraped;
                        buildCount = Math.Max(buildCount, scraped.Count);
                    }
                }
                catch (RateLimitedException ex)
                {
                    pause = ex;
                    _client.Log?.Invoke($"skill {candidate.Name}: {ex.Message}");
                }
                catch (PoeDataException ex)
                {
                    _client.Log?.Invoke($"skill {candidate.Name}: builds page failed ({ex.Message})");
                }
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

            // no DPS in the ladder (a parsing gap, or a league that does not publish it):
            // keep the rows in the site's order so the sampler still has characters to visit
            var orderable = graded.Count > 0 ? graded : rows;
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
                // class shares over the rows we actually have: a skill whose DPS column came
                // back empty still has builds, with classes, and showing "–" for them hid
                // information that was right there
                Classes = BuildClassShares(orderable, buildCount),
                // The tracked set is exactly the depth chosen in Settings: 20 there means twenty
                // builds per skill here. A fixed 40 ignored that number and produced a card that
                // said "x of 40" beside a setting that said 20.
                TopBuilds = orderable.Take(Math.Clamp(settings.SampleDepth, 1, 200)).ToList(),
            });
        }

        BorrowBaseGemDps(skills);

        var missing = skills
            .Where(s => s.TopBuilds.Count == 0)
            .Select(s => s.Name)
            .Concat(ungraded)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (missing.Count > 0 && ladderWarning.Length == 0)
        {
            var examples = string.Join(", ", missing.Take(4)) + (missing.Count > 4 ? ", …" : string.Empty);
            ladderWarning = pause is not null
                ? $"{missing.Count} of {candidates.Count} skills were not graded - {pause.Message}"
                : $"{missing.Count} of {candidates.Count} skills came back without builds ({examples}), " +
                  "so their DPS is unknown until they answer. Press SYNC again to retry them.";
            _client.Log?.Invoke(ladderWarning);
        }

        // rows on disk but no skill owns them: the skills column did not resolve, so every
        // build is invisible to the lab even though the ladder answered
        if (ladderWarning.Length == 0 && unfilteredRows.Count > 0 && skills.All(s => s.TopBuilds.Count == 0))
        {
            var unattributed = unfilteredRows.Count(r => r.MainSkill.Length == 0);
            ladderWarning =
                $"Read {unfilteredRows.Count} ladder rows but could not attribute them to a skill " +
                $"({unattributed} had no resolvable main skill), so there are no builds to sample. " +
                $"Response: {SearchResponseParser.Describe(first)}";
            _client.Log?.Invoke(ladderWarning);
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
            LadderWarning = ladderWarning,
            LadderDpsMissing = dpsMissing,
            LadderRowCount = unfilteredRows.Count,
            LadderDpsRows = rowsWithDps,
            LadderResponseSummary = SearchResponseParser.Describe(first),
            Skills = skills
                .OrderByDescending(s => s.PeakDps)
                .ThenByDescending(s => s.AverageDps)
                .ThenByDescending(s => s.BuildCount)
                .ToList(),
            Characters = previous?.Characters ?? new List<CharacterSnapshot>(),
        };

        _store.SaveSnapshot(document);

        progress?.Report(new SyncProgress("Ladder", "Ladder ready", denominator, denominator));
        return document;
    }

    /// <summary>
    /// The next builds to read for a skill: its top builds in DPS order, minus the ones already
    /// sampled, capped at <paramref name="depth"/>.
    ///
    /// Dropping the sampled builds *before* taking depth is the whole point. Taking the top
    /// depth first meant every later call looked at the same handful, found them sampled, and
    /// reported "already sampled" while the rest of that skill's builds had never been visited -
    /// which is how a hero card could read "21 of 40" while the app claimed everything was done.
    /// </summary>
    public static List<BuildRef> NextSampleTargets(IEnumerable<BuildRef> topBuilds, ISet<string> sampled, int depth)
    {
        ArgumentNullException.ThrowIfNull(topBuilds);
        ArgumentNullException.ThrowIfNull(sampled);

        return topBuilds
            .Where(build => build.Name.Length > 0)
            .OrderByDescending(build => build.Dps)
            .Where(build => !sampled.Contains($"{build.Account}/{build.Name}"))
            .Take(Math.Max(1, depth))
            .ToList();
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
        LastSamplingError = string.Empty;

        var skill = document.Skills.FirstOrDefault(s =>
            string.Equals(s.Name, skillName, StringComparison.OrdinalIgnoreCase));
        if (skill is null)
        {
            return document;
        }

        var sampled = new HashSet<string>(
            document.Characters.Select(c => c.Key),
            StringComparer.OrdinalIgnoreCase);

        var targets = NextSampleTargets(skill.TopBuilds, sampled, depth);

        if (targets.Count == 0)
        {
            progress?.Report(new SyncProgress("Sampling", $"{skillName} is already sampled", 1, 1));
            return document;
        }

        var league = ToLeague(document);
        var sinceSave = 0;
        var completed = 0;
        var added = 0;
        var failedInARow = 0;

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

                added++;
                failedInARow = 0;
            }
            catch (RateLimitedException)
            {
                // not this character's fault, and retrying the next one cannot help
                throw;
            }
            catch (PoeDataException ex)
            {
                _client.Log?.Invoke($"character {target.Name}: {ex.Message}");

                failedInARow++;
                if (failedInARow >= 3 && added == 0)
                {
                    // every contract for this endpoint is failing: stop before the rate
                    // limit punishes the app for requests that cannot succeed anyway
                    LastSamplingError = ex.Message;
                    progress?.Report(new SyncProgress(
                        "Sampling",
                        $"{skillName}: character sheets unreadable ({ex.Message})",
                        targets.Count,
                        targets.Count));
                    return document;
                }
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

            try
            {
                document = await SampleSkillAsync(document, skills[i], depth, inner, cancellationToken)
                    .ConfigureAwait(false);
            }
            catch (RateLimitedException ex)
            {
                // everything sampled so far is on disk; stopping here is what keeps the next
                // run from earning a longer penalty on requests that cannot succeed
                _store.SaveSnapshot(document);
                LastSamplingError =
                    $"{ex.Message} {i} of {skills.Count} skills were sampled this run, " +
                    $"{document.Characters.Count} characters read in total; the rest continues next time.";
                progress?.Report(new SyncProgress(
                    "Sampling",
                    $"paused by poe.ninja: {document.Characters.Count} characters saved",
                    i,
                    skills.Count));
                break;
            }
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

    /// <summary>
    /// poe.ninja publishes no DPS of its own for some Vaal variants - the damage belongs to the
    /// gem it is socketed beside - so their column is zero. Borrowing the base gem's figures is
    /// what the site is effectively showing, provided the UI says where they came from.
    /// </summary>
    private static void BorrowBaseGemDps(List<SkillStat> skills)
    {
        if (skills.Count == 0)
        {
            return;
        }

        var byName = skills.ToDictionary(skill => skill.Name, StringComparer.OrdinalIgnoreCase);

        foreach (var skill in skills.Where(skill => skill.PeakDps <= 0))
        {
            var baseName = BaseGemName(skill.Name);
            if (baseName is null ||
                !byName.TryGetValue(baseName, out var source) ||
                source.PeakDps <= 0)
            {
                continue;
            }

            skill.AverageDps = source.AverageDps;
            skill.PeakDps = source.PeakDps;
            skill.MedianDps = source.MedianDps;
            skill.DpsFromSkill = source.Name;
        }
    }

    /// <summary>"Vaal Reap" measures as "Reap"; anything else has no base gem to borrow from.</summary>
    private static string? BaseGemName(string name)
    {
        const string prefix = "Vaal ";
        return name.StartsWith(prefix, StringComparison.OrdinalIgnoreCase) && name.Length > prefix.Length
            ? name[prefix.Length..]
            : null;
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
