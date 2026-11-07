namespace ForeverExiled.Core.Net;

/// <summary>
/// Serialises HTTP calls and keeps a polite minimum gap between them. poe.ninja's
/// character endpoint 429s quickly and the Retry-After penalty escalates, so the app
/// always crawls at a steady pace and backs off further when told to.
/// </summary>
public sealed class RequestPacer
{
    private static readonly TimeSpan MinInterval = TimeSpan.FromSeconds(1);
    private static readonly TimeSpan MaxInterval = TimeSpan.FromMinutes(2);

    private readonly SemaphoreSlim _mutex = new(1, 1);
    private DateTime _nextAllowedUtc = DateTime.MinValue;

    public RequestPacer(TimeSpan interval) => Interval = interval;

    public TimeSpan Interval { get; set; }

    /// <summary>True while the pacer is waiting out a server-imposed delay.</summary>
    public bool IsThrottled { get; private set; }

    public event EventHandler<TimeSpan>? Waiting;

    public async Task WaitTurnAsync(CancellationToken cancellationToken)
    {
        TimeSpan wait;

        await _mutex.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            var now = DateTime.UtcNow;
            wait = _nextAllowedUtc - now;
            if (wait < TimeSpan.Zero)
            {
                wait = TimeSpan.Zero;
            }

            _nextAllowedUtc = (wait > TimeSpan.Zero ? now + wait : now) + Interval;
        }
        finally
        {
            _mutex.Release();
        }

        if (wait > TimeSpan.Zero)
        {
            Waiting?.Invoke(this, wait);
            await Task.Delay(wait, cancellationToken).ConfigureAwait(false);
        }
    }

    /// <summary>Waits out a server requested delay and widens the steady pace.</summary>
    public async Task ThrottleAsync(TimeSpan retryAfter, CancellationToken cancellationToken)
    {
        IsThrottled = true;
        try
        {
            var widened = TimeSpan.FromTicks((long)(Interval.Ticks * 1.5));
            Interval = widened > MaxInterval ? MaxInterval : widened < MinInterval ? MinInterval : widened;

            var delay = retryAfter < MinInterval ? MinInterval : retryAfter;
            if (delay > MaxInterval)
            {
                delay = MaxInterval;
            }

            await _mutex.WaitAsync(cancellationToken).ConfigureAwait(false);
            try
            {
                _nextAllowedUtc = DateTime.UtcNow + delay;
            }
            finally
            {
                _mutex.Release();
            }

            Waiting?.Invoke(this, delay);
            await Task.Delay(delay, cancellationToken).ConfigureAwait(false);
        }
        finally
        {
            IsThrottled = false;
        }
    }

    public void Relax()
    {
        var tightened = TimeSpan.FromTicks((long)(Interval.Ticks * 0.95));
        Interval = tightened < MinInterval ? MinInterval : tightened;
    }
}
