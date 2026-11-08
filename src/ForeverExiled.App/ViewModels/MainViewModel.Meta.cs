using ForeverExiled.App.Theming;
using ForeverExiled.Core.Formatting;
using ForeverExiled.Core.Models;

namespace ForeverExiled.App.ViewModels;

/// <summary>Meta overview: league-wide statistic cards, notables and the crafting card.</summary>
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
            IsSampleData
                ? "generated demo — not the live ladder"
                : _snapshot.LeagueName.Length > 0 ? _snapshot.LeagueName + " ladder" : string.Empty,
            Palette.Accent));

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

        // ---- notables
        TopNotables.Clear();
        var maxNotable = global.TopNotables.Count > 0 ? global.TopNotables[0].Count : 0;
        // the card scrolls, so it can carry more of the trend without growing
        foreach (var notable in global.TopNotables.Take(14))
        {
            var pool = NotableWeights.BestPoolFor(notable.Name, notable.Size.ToString());
            var weight = NotableWeights.WeightFor(notable.Name, pool);
            var weightText = weight > 0
                ? $"{NotableWeights.PoolLabel(pool)} pool · weight {weight:N0}"
                : DpsFormatter.Percent(notable.Percent) + " of sample";

            TopNotables.Add(new LeaderItem(
                string.Empty,
                notable.Name,
                notable.Count + " builds",
                weightText,
                maxNotable > 0 ? notable.Count * 100d / maxNotable : 0,
                Palette.ForClusterSize(notable.Size),
                Palette.ImageForClusterSize(notable.Size)));
        }

        // ---- popular combinations, each tap pricing it in the crafting card
        var maxCombo = global.TopCombos.Count > 0 ? global.TopCombos[0].BuildCount : 0;
        var comboRank = 1;
        var rows = global.TopCombos
            .Take(6)
            .Select(combo => new ComboItem(
                combo, comboRank++, global.CharactersSampled, maxCombo, showSkills: true, SelectCraftCombo))
            .ToList();

        TopCombos = rows;

        // the meta tab shows the crafting card, so something has to be priced: default to the
        // most popular combination until the user picks one
        if (CraftRoutes.Count == 0)
        {
            SelectCraftCombo(rows.FirstOrDefault());
        }
        else
        {
            // keep the accent on the row whose combination the card is still pricing
            foreach (var row in rows)
            {
                row.IsCrafted = ReferenceEquals(row.Combo, _craftedCombo);
            }
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
