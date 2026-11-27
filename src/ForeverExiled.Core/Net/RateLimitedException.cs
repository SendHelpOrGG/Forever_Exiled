namespace ForeverExiled.Core.Net;

/// <summary>
/// poe.ninja asked this client to stay away for longer than a sync is willing to sit
/// through. Carries the wait so callers can stop cleanly, keep what they already have, and
/// tell the user when to come back.
/// </summary>
public sealed class RateLimitedException : PoeDataException
{
    public RateLimitedException(string message, TimeSpan retryAfter)
        : base(message) => RetryAfter = retryAfter;

    /// <summary>How long the server asked us to wait.</summary>
    public TimeSpan RetryAfter { get; }

    /// <summary>The moment requests may be sent again.</summary>
    public DateTimeOffset Until => DateTimeOffset.UtcNow + RetryAfter;
}
