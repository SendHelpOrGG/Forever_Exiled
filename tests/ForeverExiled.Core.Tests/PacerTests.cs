using ForeverExiled.Core.Net;
using Xunit;

namespace ForeverExiled.Core.Tests;

public class RequestPacerTests
{
    [Fact]
    public void Relax_never_crawls_faster_than_the_requested_pace()
    {
        // the pace is what the user set: relaxing closes in on it, it does not undercut it
        var pacer = new RequestPacer(TimeSpan.FromSeconds(5));

        for (var i = 0; i < 500; i++)
        {
            pacer.Relax();
        }

        Assert.Equal(TimeSpan.FromSeconds(5), pacer.Interval);
    }

    [Fact]
    public void Relax_stops_at_a_raised_floor()
    {
        var pacer = new RequestPacer(TimeSpan.FromSeconds(5));
        pacer.Floor = TimeSpan.FromSeconds(20);

        for (var i = 0; i < 500; i++)
        {
            pacer.Relax();
        }

        Assert.Equal(TimeSpan.FromSeconds(20), pacer.Interval);
    }

    [Fact]
    public async Task Throttle_widens_the_pace_and_never_narrows_it()
    {
        var pacer = new RequestPacer(TimeSpan.FromMilliseconds(10));

        await pacer.ThrottleAsync(TimeSpan.FromMilliseconds(10), CancellationToken.None);

        // widened by 1.5x and then held at the floor, never at the old interval
        Assert.True(pacer.Interval >= TimeSpan.FromMilliseconds(500), $"interval was {pacer.Interval}");
    }

    [Fact]
    public async Task Pause_counts_down_and_finishes_at_zero()
    {
        var pacer = new RequestPacer(TimeSpan.FromMilliseconds(10));
        var ticks = new List<TimeSpan>();

        await pacer.PauseAsync(
            TimeSpan.FromMilliseconds(120),
            left => ticks.Add(left),
            CancellationToken.None);

        Assert.NotEmpty(ticks);
        Assert.Equal(TimeSpan.Zero, ticks[^1]);
        Assert.All(ticks, tick => Assert.True(tick >= TimeSpan.Zero));
    }

    [Fact]
    public async Task Pause_can_be_cancelled()
    {
        var pacer = new RequestPacer(TimeSpan.FromMilliseconds(10));
        using var cancellation = new CancellationTokenSource(TimeSpan.FromMilliseconds(50));

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            pacer.PauseAsync(TimeSpan.FromMinutes(5), null, cancellation.Token));

        Assert.False(pacer.IsThrottled);
    }

    [Fact]
    public void Rate_limit_exception_keeps_the_wait_it_was_given()
    {
        var exception = new RateLimitedException("paused", TimeSpan.FromMinutes(6));

        Assert.Equal(TimeSpan.FromMinutes(6), exception.RetryAfter);
        Assert.True(exception.Until > DateTimeOffset.UtcNow.AddMinutes(5));
        Assert.IsAssignableFrom<PoeDataException>(exception);
    }

    [Theory]
    [InlineData(45, "45s")]
    [InlineData(61, "1m 01s")]
    [InlineData(341, "5m 41s")]
    public void Describes_a_wait_in_words(int seconds, string expected)
    {
        Assert.Equal(expected, PoeNinjaClient.DescribeSpan(TimeSpan.FromSeconds(seconds)));
    }
}
