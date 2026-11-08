using ForeverExiled.Core.Analysis;
using ForeverExiled.Core.Models;

namespace ForeverExiled.Core.Tests;

/// <summary>
/// Which builds a second sampling pass picks up. This is the bug behind "21 of 40 sampled" never
/// moving: the first twelve builds were taken before the sampled ones were dropped, so every
/// later pass looked at the same twelve, found them sampled, and stopped.
/// </summary>
public sealed class SamplingTargetsTests
{
    private static List<BuildRef> Builds(int count) =>
        Enumerable.Range(1, count)
            .Select(index => new BuildRef
            {
                Name = $"character{index:00}",
                Account = "someone-" + index,
                Dps = 1_000_000d * (count - index + 1),
            })
            .ToList();

    private static HashSet<string> Sampled(IEnumerable<BuildRef> builds) =>
        new(builds.Select(build => $"{build.Account}/{build.Name}"), StringComparer.OrdinalIgnoreCase);

    [Fact]
    public void Takes_the_top_builds_when_nothing_is_sampled()
    {
        var builds = Builds(40);

        var targets = SyncService.NextSampleTargets(builds, Sampled(Array.Empty<BuildRef>()), depth: 12);

        Assert.Equal(12, targets.Count);
        Assert.Equal("character01", targets[0].Name);
        Assert.Equal("character12", targets[11].Name);
    }

    [Fact]
    public void Skips_the_sampled_builds_instead_of_stopping_at_the_top()
    {
        // the exact state that stalled: the top twelve are read, nineteen more never are
        var builds = Builds(40);
        var sampled = Sampled(builds.Take(12));

        var targets = SyncService.NextSampleTargets(builds, sampled, depth: 12);

        Assert.Equal(12, targets.Count);
        Assert.Equal("character13", targets[0].Name);
        Assert.Equal("character24", targets[11].Name);
        Assert.DoesNotContain(targets, target => sampled.Contains($"{target.Account}/{target.Name}"));
    }

    [Fact]
    public void Walks_to_the_end_of_the_list_and_then_stops()
    {
        var builds = Builds(40);
        var sampled = Sampled(builds.Take(33));

        var targets = SyncService.NextSampleTargets(builds, sampled, depth: 12);

        Assert.Equal(7, targets.Count);
        Assert.Equal("character40", targets[^1].Name);
        Assert.Empty(SyncService.NextSampleTargets(builds, Sampled(builds), depth: 12));
    }

    [Fact]
    public void Ignores_builds_without_a_character_name()
    {
        var builds = Builds(3);
        builds.Add(new BuildRef { Name = string.Empty, Account = "ghost", Dps = 9_000_000 });

        var targets = SyncService.NextSampleTargets(builds, Sampled(Array.Empty<BuildRef>()), depth: 12);

        Assert.Equal(3, targets.Count);
    }
}
