using ForeverExiled.Core.Models;

namespace ForeverExiled.Core.Analysis;

/// <summary>
/// Turns a raw snapshot (ladder statistics + sampled characters) into the aggregates the
/// UI renders: per-skill cluster combinations for each size, and league-wide statistics.
/// All grouping happens on the client so results stay reproducible and exportable.
/// </summary>
public sealed class MetaAnalyzer
{
    public MetaAnalysis Analyze(SnapshotDocument snapshot, double? minPopularityPercent = null)
    {
        ArgumentNullException.ThrowIfNull(snapshot);

        var minimum = minPopularityPercent ?? snapshot.MinPopularityPercent;

        var skills = snapshot.Skills
            .Where(s => s.PopularityPercent >= minimum)
            .OrderByDescending(s => s.AverageDps)
            .ThenByDescending(s => s.BuildCount)
            .ToList();

        var characters = snapshot.Characters;
        var profiles = new List<SkillClusterProfile>();

        foreach (var skill in skills)
        {
            var builds = characters
                .Where(c => string.Equals(c.MainSkill, skill.Name, StringComparison.OrdinalIgnoreCase))
                .ToList();

            profiles.Add(BuildProfile(skill, builds));
        }

        return new MetaAnalysis
        {
            Snapshot = snapshot,
            Skills = skills,
            Profiles = profiles,
            Global = BuildGlobalStats(snapshot, skills, characters, profiles),
            Ladder = BuildLadder(snapshot, skills, characters),
        };
    }

    private static SkillClusterProfile BuildProfile(SkillStat skill, List<CharacterSnapshot> builds)
    {
        var sampledKeys = new HashSet<string>(builds.Select(b => b.Key), StringComparer.OrdinalIgnoreCase);
        var pending = skill.TopBuilds.Count(b => !sampledKeys.Contains($"{b.Account}/{b.Name}"));

        return new SkillClusterProfile
        {
            Skill = skill.Name,
            SampledBuilds = builds.Count,
            PendingBuilds = pending,
            Large = BuildCombos(builds, ClusterSize.Large, builds.Count, includeSkills: false),
            Medium = BuildCombos(builds, ClusterSize.Medium, builds.Count, includeSkills: false),
            Small = BuildCombos(builds, ClusterSize.Small, builds.Count, includeSkills: false),
            AnalyzedAt = DateTimeOffset.UtcNow,
        };
    }

    private static GlobalStats BuildGlobalStats(
        SnapshotDocument snapshot,
        List<SkillStat> skills,
        List<CharacterSnapshot> characters,
        List<SkillClusterProfile> profiles)
    {
        var stats = new GlobalStats
        {
            TotalBuildsInLeague = snapshot.TotalBuildsInLeague,
            SkillsTracked = skills.Count,
            CharactersSampled = characters.Count,
            JewelsCatalogued = characters.Sum(c => c.ClusterJewels.Count),
        };

        var comboKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var character in characters)
        {
            foreach (var jewel in character.ClusterJewels)
            {
                comboKeys.Add(jewel.ComboKey);
            }
        }

        stats.CombosFound = comboKeys.Count;

        var large = BuildCombos(characters, ClusterSize.Large, characters.Count, includeSkills: true);
        var medium = BuildCombos(characters, ClusterSize.Medium, characters.Count, includeSkills: true);
        var combined = large.Concat(medium)
            .OrderByDescending(c => c.BuildCount)
            .ThenByDescending(c => c.PercentOfBuilds)
            .ThenByDescending(c => c.AverageDps)
            .ToList();

        stats.TopCombos = combined.Take(12).ToList();
        stats.LeaderCombo = combined.FirstOrDefault();

        stats.TopNotables = BuildNotableStats(characters);
        stats.SizeMix = BuildSizeMix(characters);

        stats.ClassMix = characters
            .Where(c => c.ClassName.Length > 0)
            .GroupBy(c => c.ClassName, StringComparer.OrdinalIgnoreCase)
            .Select(g => new ClassShare
            {
                Name = g.First().ClassName,
                Count = g.Count(),
                Percent = characters.Count > 0 ? g.Count() * 100.0 / characters.Count : 0,
            })
            .OrderByDescending(c => c.Count)
            .ToList();

        stats.TopDpsBuilds = characters
            .OrderByDescending(c => c.Dps)
            .Take(12)
            .Select(ToBuildRef)
            .ToList();

        if (stats.TopDpsBuilds.Count == 0)
        {
            stats.TopDpsBuilds = skills
                .SelectMany(s => s.TopBuilds)
                .OrderByDescending(b => b.Dps)
                .Take(12)
                .ToList();
        }

        stats.CoveragePercent = profiles.Count == 0
            ? 0
            : profiles.Count(p => p.SampledBuilds > 0) * 100.0 / profiles.Count;

        return stats;
    }

    private static List<BuildRef> BuildLadder(
        SnapshotDocument snapshot,
        List<SkillStat> skills,
        List<CharacterSnapshot> characters)
    {
        if (characters.Count > 0)
        {
            return characters
                .OrderByDescending(c => c.Dps)
                .Select(ToBuildRef)
                .ToList();
        }

        return skills
            .SelectMany(s => s.TopBuilds)
            .Where(b => !string.IsNullOrWhiteSpace(b.Name))
            .OrderByDescending(b => b.Dps)
            .ToList();
    }

    private static BuildRef ToBuildRef(CharacterSnapshot character) => new()
    {
        Name = character.Name,
        Account = character.Account,
        ClassName = character.ClassName,
        MainSkill = character.MainSkill,
        Level = character.Level,
        Dps = character.Dps,
        League = character.League,
        ClusterJewelCount = character.ClusterJewels.Count,
    };

    private static List<ClusterCombo> BuildCombos(
        IReadOnlyList<CharacterSnapshot> builds,
        ClusterSize size,
        int denominator,
        bool includeSkills)
    {
        var groups = new Dictionary<string, ComboAccumulator>(StringComparer.OrdinalIgnoreCase);

        foreach (var build in builds)
        {
            var seenInBuild = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var jewel in build.ClusterJewels)
            {
                if (jewel.Size != size || !seenInBuild.Add(jewel.ComboKey))
                {
                    continue;
                }

                if (!groups.TryGetValue(jewel.ComboKey, out var accumulator))
                {
                    accumulator = new ComboAccumulator(jewel);
                    groups[jewel.ComboKey] = accumulator;
                }

                accumulator.Add(build, jewel);
            }
        }

        return groups.Values
            .Select(g => g.ToCombo(size, denominator, includeSkills))
            .OrderByDescending(c => c.BuildCount)
            .ThenByDescending(c => c.PercentOfBuilds)
            .ThenByDescending(c => c.AverageDps)
            .ToList();
    }

    private static List<NotableStat> BuildNotableStats(IReadOnlyList<CharacterSnapshot> builds)
    {
        var counts = new Dictionary<string, (ClusterSize Size, HashSet<string> Builds)>(StringComparer.OrdinalIgnoreCase);

        foreach (var build in builds)
        {
            foreach (var jewel in build.ClusterJewels)
            {
                foreach (var notable in jewel.Notables)
                {
                    var key = $"{jewel.Size}|{notable}";
                    if (!counts.TryGetValue(key, out var entry))
                    {
                        entry = (jewel.Size, new HashSet<string>(StringComparer.OrdinalIgnoreCase));
                        counts[key] = entry;
                    }

                    entry.Builds.Add(build.Key);
                }
            }
        }

        return counts
            .Select(pair => new NotableStat
            {
                Name = pair.Key[(pair.Key.IndexOf('|') + 1)..],
                Size = pair.Value.Size,
                Count = pair.Value.Builds.Count,
                Percent = builds.Count > 0 ? pair.Value.Builds.Count * 100.0 / builds.Count : 0,
            })
            .OrderByDescending(n => n.Count)
            .ThenBy(n => n.Name, StringComparer.OrdinalIgnoreCase)
            .Take(24)
            .ToList();
    }

    private static List<SizeShare> BuildSizeMix(IReadOnlyList<CharacterSnapshot> builds)
    {
        var result = new List<SizeShare>();

        foreach (var size in new[] { ClusterSize.Large, ClusterSize.Medium, ClusterSize.Small })
        {
            var count = builds.Count(b => b.ClusterJewels.Any(j => j.Size == size));
            result.Add(new SizeShare
            {
                Size = size,
                Count = count,
                Percent = builds.Count > 0 ? count * 100.0 / builds.Count : 0,
            });
        }

        return result;
    }

    private sealed class ComboAccumulator
    {
        private readonly ClusterJewel _sample;
        private readonly Dictionary<string, int> _passives = new(StringComparer.OrdinalIgnoreCase);
        private readonly Dictionary<string, int> _grants = new(StringComparer.OrdinalIgnoreCase);
        private readonly Dictionary<int, int> _effects = new();
        private readonly Dictionary<string, int> _skills = new(StringComparer.OrdinalIgnoreCase);

        public ComboAccumulator(ClusterJewel sample) => _sample = sample;

        public int BuildCount { get; private set; }

        public double DpsSum { get; private set; }

        public double PeakDps { get; private set; }

        public string TopBuildName { get; private set; } = string.Empty;

        public string TopBuildAccount { get; private set; } = string.Empty;

        public string TopBuildClass { get; private set; } = string.Empty;

        public void Add(CharacterSnapshot build, ClusterJewel jewel)
        {
            BuildCount++;
            DpsSum += build.Dps;

            if (build.Dps >= PeakDps)
            {
                PeakDps = build.Dps;
                TopBuildName = build.Name;
                TopBuildAccount = build.Account;
                TopBuildClass = build.ClassName;
            }

            var passives = jewel.Passives.HasValue
                ? $"{jewel.Passives.Value} passives"
                : "unknown passives";
            _passives[passives] = _passives.GetValueOrDefault(passives) + 1;

            if (jewel.GrantType.Length > 0)
            {
                _grants[jewel.GrantType] = _grants.GetValueOrDefault(jewel.GrantType) + 1;
            }

            if (jewel.EffectPercent > 0)
            {
                _effects[jewel.EffectPercent] = _effects.GetValueOrDefault(jewel.EffectPercent) + 1;
            }

            if (build.MainSkill.Length > 0)
            {
                _skills[build.MainSkill] = _skills.GetValueOrDefault(build.MainSkill) + 1;
            }
        }

        public ClusterCombo ToCombo(ClusterSize size, int denominator, bool includeSkills)
        {
            var combo = new ClusterCombo
            {
                Size = size,
                Notables = _sample.Notables.ToList(),
                Label = _sample.ComboLabel,
                BuildCount = BuildCount,
                PercentOfBuilds = denominator > 0 ? BuildCount * 100.0 / denominator : 0,
                AverageDps = BuildCount > 0 ? DpsSum / BuildCount : 0,
                PeakDps = PeakDps,
                TopBuildName = TopBuildName,
                TopBuildAccount = TopBuildAccount,
                TopBuildClass = TopBuildClass,
                GrantType = _grants.Count > 0 ? _grants.MaxBy(kv => kv.Value).Key : _sample.GrantType,
                PassivesLabel = _passives.Count > 0 ? _passives.MaxBy(kv => kv.Value).Key : "unknown passives",
                EffectPercent = _effects.Count > 0 ? _effects.MaxBy(kv => kv.Value).Key : 0,
                Slug = ClusterJewelParser.Slugify(_sample.ComboLabel),
                Representative = _sample,
            };

            if (includeSkills)
            {
                combo.Skills = _skills
                    .OrderByDescending(kv => kv.Value)
                    .Take(4)
                    .Select(kv => kv.Key)
                    .ToList();
            }

            return combo;
        }
    }
}
