using ForeverExiled.Core.Analysis;
using ForeverExiled.Core.Models;
using Xunit;

namespace ForeverExiled.Core.Tests;

public class MetaAnalyzerTests
{
    private static ClusterJewel Jewel(ClusterSize size, params string[] notables) => new()
    {
        Size = size,
        BaseType = size.ToBaseType(),
        Notables = notables.ToList(),
        Passives = size == ClusterSize.Large ? 8 : 4,
        GrantType = "10% increased Fire Damage",
    };

    private static CharacterSnapshot Character(
        string name,
        string skill,
        double dps,
        ClusterSize? size = null,
        string[]? notables = null) => new()
    {
        Account = "acc_" + name,
        Name = name,
        ClassName = "Juggernaut",
        MainSkill = skill,
        Dps = dps,
        ClusterJewels = size is null ? new List<ClusterJewel>() : new List<ClusterJewel> { Jewel(size.Value, notables ?? new[] { "Sadist" }) },
    };

    private static SnapshotDocument Snapshot() => new()
    {
        LeagueUrl = "test",
        LeagueName = "Test",
        Source = SnapshotDocument.SourceLive,
        MinPopularityPercent = 1.0,
        TotalBuildsInLeague = 1000,
        Skills = new List<SkillStat>
        {
            new()
            {
                Name = "Molten Strike of the Zenith",
                BuildCount = 300,
                PopularityPercent = 30,
                AverageDps = 70_000_000,
                PeakDps = 425_000_000,
                DamageType = DamageTypes.Fire,
                TopBuilds = new List<BuildRef>
                {
                    new() { Name = "a", Account = "acc_a", Dps = 425_000_000 },
                    new() { Name = "b", Account = "acc_b", Dps = 300_000_000 },
                    new() { Name = "c", Account = "acc_c", Dps = 250_000_000 },
                },
            },
            new()
            {
                Name = "Winter Orb",
                BuildCount = 200,
                PopularityPercent = 20,
                AverageDps = 32_000_000,
                PeakDps = 138_000_000,
                DamageType = DamageTypes.Cold,
                TopBuilds = new List<BuildRef>(),
            },
            new()
            {
                Name = "Barely Played",
                BuildCount = 4,
                PopularityPercent = 0.4,
                AverageDps = 1_000_000,
                DamageType = DamageTypes.Physical,
            },
        },
        Characters = new List<CharacterSnapshot>
        {
            Character("a", "Molten Strike of the Zenith", 400_000_000, ClusterSize.Medium, new[] { "Sadist", "Cooked Alive" }),
            Character("b", "Molten Strike of the Zenith", 300_000_000, ClusterSize.Medium, new[] { "Cooked Alive", "Sadist" }),
            Character("c", "Molten Strike of the Zenith", 200_000_000, ClusterSize.Medium, new[] { "Sadist", "Blazing Salvo" }),
            Character("d", "Molten Strike of the Zenith", 100_000_000, ClusterSize.Large, new[] { "Devastator", "Feed the Fury", "Martial Prowess" }),
            Character("e", "Winter Orb", 130_000_000),
        },
    };

    [Fact]
    public void Drops_skills_below_the_popularity_floor_and_sorts_by_dps()
    {
        var analysis = new MetaAnalyzer().Analyze(Snapshot());

        Assert.Equal(new[] { "Molten Strike of the Zenith", "Winter Orb" }, analysis.Skills.Select(s => s.Name));
    }

    [Fact]
    public void Groups_medium_combinations_and_ignores_notable_order()
    {
        var analysis = new MetaAnalyzer().Analyze(Snapshot());
        var profile = analysis.FindProfile("Molten Strike of the Zenith");

        Assert.NotNull(profile);
        Assert.Equal(4, profile!.SampledBuilds);
        Assert.Equal(2, profile.Medium.Count);

        var top = profile.Medium[0];
        Assert.Equal("Cooked Alive + Sadist", top.Label);
        Assert.Equal(2, top.BuildCount);
        Assert.Equal(50d, top.PercentOfBuilds, 3);
        Assert.Equal("a", top.TopBuildName);
        Assert.Equal(350_000_000d, top.AverageDps, 3);

        Assert.Equal("Blazing Salvo + Sadist", profile.Medium[1].Label);
    }

    [Fact]
    public void Counts_a_duplicated_jewel_only_once_per_build()
    {
        var snapshot = Snapshot();
        snapshot.Characters[0].ClusterJewels.Add(Jewel(ClusterSize.Medium, "Sadist", "Cooked Alive"));

        var analysis = new MetaAnalyzer().Analyze(snapshot);
        var top = analysis.FindProfile("Molten Strike of the Zenith")!.Medium[0];

        Assert.Equal(2, top.BuildCount);
    }

    [Fact]
    public void Computes_global_leader_notables_and_size_mix()
    {
        var analysis = new MetaAnalyzer().Analyze(Snapshot());
        var global = analysis.Global;

        Assert.Equal(5, global.CharactersSampled);
        Assert.Equal(4, global.JewelsCatalogued);
        Assert.Equal(3, global.CombosFound);
        Assert.NotNull(global.LeaderCombo);
        Assert.Equal("Cooked Alive + Sadist", global.LeaderCombo!.Label);
        Assert.Equal(ClusterSize.Medium, global.LeaderCombo.Size);
        Assert.Equal(40d, global.LeaderCombo.PercentOfBuilds, 3);
        Assert.Contains(global.LeaderCombo.Skills, s => s == "Molten Strike of the Zenith");

        Assert.NotEmpty(global.TopNotables);
        Assert.Contains(global.TopNotables, n => n.Name == "Sadist" && n.Count == 3);

        var medium = global.SizeMix.First(s => s.Size == ClusterSize.Medium);
        Assert.Equal(3, medium.Count);
        Assert.Equal(60d, medium.Percent, 3);

        Assert.Equal(5, global.TopDpsBuilds.Count);
        Assert.NotEmpty(analysis.Ladder);
        Assert.Equal("a", analysis.Ladder[0].Name);
    }

    [Fact]
    public void Pending_builds_reflect_unsampled_ladder_rows()
    {
        var analysis = new MetaAnalyzer().Analyze(Snapshot());
        var profile = analysis.FindProfile("Molten Strike of the Zenith")!;

        // three ladder rows, all of them already sampled
        Assert.Equal(0, profile.PendingBuilds);
    }

    [Fact]
    public void Survives_a_snapshot_with_no_characters()
    {
        var snapshot = Snapshot();
        snapshot.Characters.Clear();

        var analysis = new MetaAnalyzer().Analyze(snapshot);

        Assert.Empty(analysis.Global.TopCombos);
        Assert.Null(analysis.Global.LeaderCombo);
        Assert.Equal(0, analysis.Global.CombosFound);
        Assert.NotEmpty(analysis.Ladder);
        Assert.All(analysis.Profiles, p => Assert.False(p.HasData));
    }
}
