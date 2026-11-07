using ForeverExiled.App.Theming;
using ForeverExiled.Core.Formatting;
using ForeverExiled.Core.Models;

namespace ForeverExiled.App.ViewModels;

/// <summary>Meta overview: league-wide statistic cards, leaders, notables and top builds.</summary>
public partial class MainViewModel
{
    private void RebuildMetaView()
    {
        var global = _analysis.Global;

        StatCards.Clear();
        StatCards.Add(new StatCardItem(
            "\uE716",
            "LEAGUE BUILDS",
            DpsFormatter.Count(global.TotalBuildsInLeague),
            _snapshot.LeagueName.Length > 0 ? _snapshot.LeagueName + " ladder" : string.Empty,
            Palette.Gold));

        StatCards.Add(new StatCardItem(
            "\uE8FD",
            "SKILLS TRACKED",
            global.SkillsTracked.ToString(),
            "above " + DpsFormatter.Percent(_settings.MinPopularityPercent) + " popularity",
            Palette.Cold));

        StatCards.Add(new StatCardItem(
            "\uE721",
            "BUILDS SAMPLED",
            DpsFormatter.Count(global.CharactersSampled),
            global.JewelsCatalogued > 0
                ? DpsFormatter.Count(global.JewelsCatalogued) + " cluster jewels"
                : "no jewels yet",
            Palette.Chaos));

        StatCards.Add(new StatCardItem(
            string.Empty,
            "COMBINATIONS",
            global.CombosFound.ToString(),
            _snapshot.IsSample ? "sample dataset" : "from live characters",
            Palette.Fire,
            "cluster_medium.png"));

        // ---- leaders (by DPS, matching the rail sort the app is built around)
        MetaLeaders.Clear();
        var maxDps = _analysis.Skills.Count > 0 ? _analysis.Skills.Max(s => s.AverageDps) : 0;
        var rank = 1;
        foreach (var skill in _analysis.Skills.Take(9))
        {
            MetaLeaders.Add(new LeaderItem(
                rank.ToString("00"),
                skill.Name,
                DpsFormatter.Format(skill.AverageDps),
                DpsFormatter.Percent(skill.PopularityPercent) + "  ·  " + DpsFormatter.Count(skill.BuildCount) + " builds",
                maxDps > 0 ? skill.AverageDps * 100d / maxDps : 0,
                Palette.ForDamageType(skill.DamageType),
                string.Empty));
            rank++;
        }

        // ---- notables
        TopNotables.Clear();
        var maxNotable = global.TopNotables.Count > 0 ? global.TopNotables[0].Count : 0;
        foreach (var notable in global.TopNotables.Take(8))
        {
            TopNotables.Add(new LeaderItem(
                string.Empty,
                notable.Name,
                notable.Count + " builds",
                DpsFormatter.Percent(notable.Percent) + " of sample",
                maxNotable > 0 ? notable.Count * 100d / maxNotable : 0,
                Palette.ForClusterSize(notable.Size),
                Palette.ImageForClusterSize(notable.Size)));
        }

        // ---- popular combinations
        TopCombos.Clear();
        var maxCombo = global.TopCombos.Count > 0 ? global.TopCombos[0].BuildCount : 0;
        rank = 1;
        foreach (var combo in global.TopCombos.Take(6))
        {
            TopCombos.Add(new ComboItem(combo, rank++, global.CharactersSampled, maxCombo, showSkills: true));
        }

        // ---- highest DPS builds
        TopBuilds.Clear();
        rank = 1;
        foreach (var build in global.TopDpsBuilds.Take(8))
        {
            TopBuilds.Add(new BuildItem(build, rank++));
        }

        // ---- cluster lab side rail
        var leader = global.LeaderCombo;
        GlobalLeaderLabel = leader is not null ? leader.Size.ToLabel() + " · " + leader.Label : "No data yet";
        GlobalLeaderValue = leader is not null ? DpsFormatter.Percent(leader.PercentOfBuilds) : "–";
        GlobalLeaderCaption = leader is not null
            ? $"{leader.BuildCount} builds  ·  {DpsFormatter.Format(leader.AverageDps)} avg DPS"
            : "sample a skill to populate";

        GlobalLeaderBuild = leader is not null && leader.TopBuildName.Length > 0
            ? $"{leader.TopBuildName}  ·  {leader.TopBuildClass}"
            : string.Empty;

        CoveragePercent = global.CoveragePercent;
        CoverageProgress = Math.Clamp(global.CoveragePercent / 100d, 0, 1);
        CoverageText = Math.Round(global.CoveragePercent) + "% of tracked skills analysed";
        SampledBuildsText = DpsFormatter.Count(global.CharactersSampled);
        JewelsText = DpsFormatter.Count(global.JewelsCatalogued);
        CombosText = global.CombosFound.ToString();
    }
}
