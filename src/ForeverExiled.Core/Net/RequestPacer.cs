namespace ForeverExiled.Core.Net;

/// <summary>
/// Serialises HTTP calls and keeps a polite minimum gap between them. poe.ninja's
/// character endpoint 429s quickly and the Retry-After penalty escalates, so the app
/// always crawls at a steady pace and backs off further when told to.
/// </summary>
public sealed class RequestPacer
{
    private static readonly TimeSpan HardFloor = TimeSpan.FromSeconds(0.5);
    private static readonly TimeSpan MaxInterval = TimeSpan.FromMinutes(2);

    private readonly SemaphoreSlim _mutex = new(1, 1);
    private TimeSpan _floor;
    private DateTime _nextAllowedUtc = DateTime.MinValue;

    public RequestPacer(TimeSpan interval, TimeSpan? floor = null)
    {
        Interval = interval;
        Floor = floor ?? interval;
    }

    public TimeSpan Interval { get; set; }

    /// <summary>
    /// The pace the user asked for. Relaxing closes in on it but never undercuts it, which is
    /// what let a 5s setting quietly become a 1s crawl and earn rate limits.
    /// </summary>
    public TimeSpan Floor
    {
        get => _floor;
        set => _floor = value < HardFloor ? HardFloor : value;
    }

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
            Interval = widened > MaxInterval ? MaxInterval : widened < _floor ? _floor : widened;

            var delay = retryAfter < _floor ? _floor : retryAfter;
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

    /// <summary>
    /// Waits out a long server-imposed pause (a 429 Retry-After), reporting the time left as
    /// it goes. <see cref="ThrottleAsync"/> caps the delay at two minutes, which is right for
    /// spacing requests but wrong for a penalty the site states in minutes.
    /// </summary>
    public async Task PauseAsync(TimeSpan pause, Action<TimeSpan>? tick, CancellationToken cancellationToken)
    {
        IsThrottled = true;
        try
        {
            var widened = TimeSpan.FromTicks((long)(Interval.Ticks * 1.5));
            Interval = widened > MaxInterval ? MaxInterval : widened < _floor ? _floor : widened;

            await _mutex.WaitAsync(cancellationToken).ConfigureAwait(false);
            try
            {
                _nextAllowedUtc = DateTime.UtcNow + pause;
            }
            finally
            {
                _mutex.Release();
            }

            Waiting?.Invoke(this, pause);

            var deadline = DateTime.UtcNow + pause;
            while (true)
            {
                var left = deadline - DateTime.UtcNow;
                if (left <= TimeSpan.Zero)
                {
                    break;
                }

                tick?.Invoke(left);
                await Task.Delay(
                        left < TimeSpan.FromSeconds(10) ? left : TimeSpan.FromSeconds(10),
                        cancellationToken)
                    .ConfigureAwait(false);
            }

            tick?.Invoke(TimeSpan.Zero);
        }
        finally
        {
            IsThrottled = false;
        }
    }

    public void Relax()
    {
        var tightened = TimeSpan.FromTicks((long)(Interval.Ticks * 0.95));
        Interval = tightened < _floor ? _floor : tightened;
    }
}
