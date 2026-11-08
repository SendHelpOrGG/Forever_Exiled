using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using ForeverExiled.Core.Models;

namespace ForeverExiled.Core.Net;

/// <summary>Result of <c>/poe1/api/data/index-state</c>.</summary>
public sealed class IndexState
{
    public List<LeagueInfo> BuildLeagues { get; init; } = new();

    public List<LeagueInfo> Snapshots { get; init; } = new();

    public List<string> EconomyLeagues { get; init; } = new();

    /// <summary>All snapshot entries for one league slug, current first.</summary>
    public IReadOnlyList<LeagueInfo> ForLeague(string url) =>
        Snapshots.Where(s => string.Equals(s.Url, url, StringComparison.OrdinalIgnoreCase))
                 .ToList();
}

/// <summary>
/// Thin, rate-limited client for poe.ninja's internal PoE 1 builds API.
///
/// Endpoints used:
///   GET /poe1/api/data/index-state                  -> JSON league + snapshot catalogue
///   GET /poe1/api/builds/{version}/search           -> protobuf ladder + aggregates
///   GET /poe1/api/builds/dictionary/{hash}          -> protobuf / NDIC string table
///   GET /poe1/api/builds/{version}/character        -> JSON character sheet
/// </summary>
public sealed class PoeNinjaClient : IDisposable
{
    public const string DefaultUserAgent =
        "ForeverExiled/1.0 (PoE1 cluster-jewel meta analysis; github.com/SendHelpOrGG/Forever_Exiled)";

    private const string BaseAddress = "https://poe.ninja/";
    private const int MaxAttempts = 4;

    /// <summary>
    /// Longest server-imposed pause the client will sit through. poe.ninja states these in
    /// minutes and they escalate, so a crawl has to be able to absorb one; beyond this the
    /// run stops instead of parking the app for half an hour.
    /// </summary>
    private static readonly TimeSpan MaxRateLimitWait = TimeSpan.FromMinutes(10);

    private static readonly string[] CharacterOverviewCandidates = { "snapshot", "slug" };
    private static readonly string[] CharacterTypeCandidates = { "exp", "0" };

    private readonly HttpClient _http;
    private readonly bool _ownsHttpClient;
    private readonly Dictionary<string, string[]> _dictionaries = new(StringComparer.Ordinal);
    private readonly object _dictionaryLock = new();

    public PoeNinjaClient(HttpClient? httpClient = null, TimeSpan? minInterval = null)
    {
        if (httpClient is null)
        {
            _http = new HttpClient(new HttpClientHandler { AutomaticDecompression = DecompressionMethods.All })
            {
                BaseAddress = new Uri(BaseAddress),
                Timeout = TimeSpan.FromSeconds(90),
            };
            _ownsHttpClient = true;
        }
        else
        {
            _http = httpClient;
            _http.BaseAddress ??= new Uri(BaseAddress);
        }

        _http.DefaultRequestHeaders.UserAgent.ParseAdd(DefaultUserAgent);
        _http.DefaultRequestHeaders.Accept.Clear();
        _http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("*/*"));
        _http.DefaultRequestHeaders.Referrer = new Uri("https://poe.ninja/poe1/builds/");

        Pacer = new RequestPacer(minInterval ?? TimeSpan.FromSeconds(5));
        SearchPacer = new RequestPacer(TimeSpan.FromSeconds(1.2));
        PagePacer = new RequestPacer(TimeSpan.FromSeconds(1.2));
    }

    /// <summary>Gate for character requests - the endpoint poe.ninja rate-limits hard.</summary>
    public RequestPacer Pacer { get; }

    /// <summary>
    /// Gate for ladder / dictionary requests. These are served from an aggregate cache and
    /// are not throttled the same way, so a sync stays quick without hammering anything.
    /// </summary>
    public RequestPacer SearchPacer { get; }

    /// <summary>Gate for character pages - HTML routes, cached, and far less limited than the API.</summary>
    public RequestPacer PagePacer { get; }

    /// <summary>Optional free-form diagnostics sink (HTTP status codes, retries, ...).</summary>
    public Action<string>? Log { get; set; }

    /// <summary>Remembers which (overview, type) pair the character endpoint accepted.</summary>
    private (string OverviewMode, string Type)? _characterContract;

    public async Task<IndexState> GetIndexStateAsync(CancellationToken cancellationToken)
    {
        var payload = await GetBytesAsync("poe1/api/data/index-state", null, cancellationToken, pacer: SearchPacer)
            .ConfigureAwait(false);
        return ParseIndexState(payload);
    }

    public static IndexState ParseIndexState(byte[] payload)
    {
        using var document = JsonDocument.Parse(payload);
        var root = document.RootElement;

        var snapshots = new List<LeagueInfo>();
        if (root.TryGetProperty("snapshotVersions", out var versions) && versions.ValueKind == JsonValueKind.Array)
        {
            foreach (var entry in versions.EnumerateArray())
            {
                if (entry.ValueKind != JsonValueKind.Object)
                {
                    continue;
                }

                var url = ReadString(entry, "url");
                var type = ReadString(entry, "type");
                var version = ReadString(entry, "version");
                if (url.Length == 0 || version.Length == 0)
                {
                    continue;
                }

                if (!string.Equals(type, "exp", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                var labels = new List<string>();
                if (entry.TryGetProperty("timeMachineLabels", out var labelArray) &&
                    labelArray.ValueKind == JsonValueKind.Array)
                {
                    labels.AddRange(labelArray.EnumerateArray()
                        .Where(l => l.ValueKind == JsonValueKind.String)
                        .Select(l => l.GetString() ?? string.Empty)
                        .Where(l => l.Length > 0));
                }

                snapshots.Add(new LeagueInfo
                {
                    Url = url,
                    Type = type,
                    Name = ReadString(entry, "name"),
                    SnapshotName = ReadString(entry, "snapshotName", fallback: url),
                    Version = version,
                    PassiveTree = ReadString(entry, "passiveTree"),
                    TimeMachineLabels = labels,
                    IsHardcore = url.Contains("hc", StringComparison.OrdinalIgnoreCase),
                    IsSsf = url.Contains("ssf", StringComparison.OrdinalIgnoreCase),
                    IsRuthless = url.EndsWith('r') && !url.Contains("standard", StringComparison.OrdinalIgnoreCase),
                });
            }
        }

        var leagues = new List<LeagueInfo>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        void AddLeague(string name, string url, bool isChallenge)
        {
            if (url.Length == 0 || !seen.Add(url))
            {
                return;
            }

            var snapshot = snapshots.FirstOrDefault(s => string.Equals(s.Url, url, StringComparison.OrdinalIgnoreCase));
            if (snapshot is null)
            {
                return;
            }

            leagues.Add(new LeagueInfo
            {
                Name = name.Length > 0 ? name : snapshot.Name,
                Url = url,
                SnapshotName = snapshot.SnapshotName,
                Version = snapshot.Version,
                Type = "exp",
                PassiveTree = snapshot.PassiveTree,
                TimeMachineLabels = snapshot.TimeMachineLabels,
                IsChallenge = isChallenge,
                IsHardcore = snapshot.IsHardcore,
                IsSsf = snapshot.IsSsf,
                IsRuthless = snapshot.IsRuthless,
            });
        }

        if (root.TryGetProperty("buildLeagues", out var buildLeagues) && buildLeagues.ValueKind == JsonValueKind.Array)
        {
            foreach (var entry in buildLeagues.EnumerateArray())
            {
                if (entry.ValueKind == JsonValueKind.Object)
                {
                    AddLeague(ReadString(entry, "name"), ReadString(entry, "url"), isChallenge: true);
                }
            }
        }

        if (leagues.Count == 0)
        {
            foreach (var snapshot in snapshots)
            {
                AddLeague(snapshot.Name, snapshot.Url, isChallenge: false);
            }
        }

        var economy = new List<string>();
        if (root.TryGetProperty("economyLeagues", out var economyLeagues) && economyLeagues.ValueKind == JsonValueKind.Array)
        {
            economy.AddRange(economyLeagues.EnumerateArray()
                .Where(e => e.ValueKind == JsonValueKind.Object)
                .Select(e => ReadString(e, "name"))
                .Where(n => n.Length > 0));
        }

        return new IndexState
        {
            BuildLeagues = leagues,
            Snapshots = snapshots,
            EconomyLeagues = economy,
        };
    }

    /// <summary>Runs a ladder search and decodes the protobuf envelope.</summary>
    /// <param name="overviewOverride">
    /// Value for the <c>overview</c> query parameter. Defaults to the snapshot name; the
    /// league slug is the other value the site answers to, and the only way to tell which
    /// one a deployment wants is to ask for both.
    /// </param>
    public async Task<SearchResponse> SearchAsync(
        LeagueInfo league,
        IReadOnlyDictionary<string, string>? filters,
        CancellationToken cancellationToken,
        string? overviewOverride = null)
    {
        var payload = await SearchRawAsync(league, filters, cancellationToken, overviewOverride).ConfigureAwait(false);
        return SearchResponseParser.Parse(payload);
    }

    /// <param name="sort">
    /// Value for the <c>sort</c> query parameter. The site's own builds page uses
    /// <c>sort=dps</c>; without it the server answers in no particular order and a
    /// 100-row page can easily contain none of the league's top-DPS builds.
    /// </param>
    public async Task<byte[]> SearchRawAsync(
        LeagueInfo league,
        IReadOnlyDictionary<string, string>? filters,
        CancellationToken cancellationToken,
        string? overviewOverride = null,
        string? sort = "dps")
    {
        var query = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["overview"] = string.IsNullOrWhiteSpace(overviewOverride) ? league.SnapshotName : overviewOverride,
            ["type"] = string.IsNullOrEmpty(league.Type) ? "exp" : league.Type,
        };

        if (!string.IsNullOrWhiteSpace(sort))
        {
            query["sort"] = sort;
        }

        if (filters is not null)
        {
            foreach (var pair in filters)
            {
                if (!string.IsNullOrWhiteSpace(pair.Value))
                {
                    query[pair.Key] = pair.Value;
                }
            }
        }

        var path = $"poe1/api/builds/{league.Version}/search{ToQueryString(query)}";
        return await GetBytesAsync(path, null, cancellationToken, pacer: SearchPacer).ConfigureAwait(false);
    }

    /// <summary>Resolves every dictionary referenced by a search response.</summary>
    public async Task<Dictionary<string, string[]>> GetDictionariesAsync(
        SearchResponse response,
        CancellationToken cancellationToken)
    {
        var resolved = new Dictionary<string, string[]>(StringComparer.Ordinal);

        foreach (var pair in response.DictionaryHashes)
        {
            try
            {
                resolved[pair.Key] = await GetDictionaryAsync(pair.Value, cancellationToken).ConfigureAwait(false);
            }
            catch (PoeDataException ex)
            {
                Log?.Invoke($"dictionary {pair.Key} ({pair.Value}) failed: {ex.Message}");
            }
        }

        return resolved;
    }

    public async Task<string[]> GetDictionaryAsync(string hash, CancellationToken cancellationToken)
    {
        // every per-skill response references the same handful of dictionaries; fetching and
        // decoding them again per skill is a request per skill spent on data we already hold
        lock (_dictionaryLock)
        {
            if (_dictionaries.TryGetValue(hash, out var known))
            {
                return known;
            }
        }

        var payload = await GetBytesAsync($"poe1/api/builds/dictionary/{hash}", null, cancellationToken, pacer: SearchPacer)
            .ConfigureAwait(false);

        var entries = DictionaryDecoder.Decode(payload, Log);

        lock (_dictionaryLock)
        {
            _dictionaries[hash] = entries;
        }

        return entries;
    }

    /// <summary>
    /// Whether a character is read from its own page before the JSON endpoint. The page route
    /// is cached and served far more freely, and the item sections are the same data.
    /// </summary>
    public bool PreferCharacterPages { get; set; } = true;

    /// <summary>Where unreadable pages are saved for diagnosis; empty means do not save.</summary>
    public string DumpDirectory { get; set; } = string.Empty;

    private static string Slug(string text) =>
        new(text.Select(c => char.IsLetterOrDigit(c) ? char.ToLowerInvariant(c) : '-').ToArray());

    /// <summary>Fetches one character sheet. Reads the character page first, then the JSON endpoint.</summary>
    public async Task<CharacterSnapshot> GetCharacterAsync(
        LeagueInfo league,
        BuildRef build,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(build.Account) || string.IsNullOrWhiteSpace(build.Name))
        {
            throw new PoeDataException("Character reference is missing an account or name.");
        }

        if (PreferCharacterPages)
        {
            var scraped = await TryReadCharacterPageAsync(league, build, cancellationToken).ConfigureAwait(false);
            if (scraped is not null)
            {
                return scraped;
            }
        }

        var modes = _characterContract is null
            ? CharacterOverviewCandidates
            : new[] { _characterContract.Value.OverviewMode };

        var types = _characterContract is null
            ? CharacterTypeCandidates
            : new[] { _characterContract.Value.Type };

        PoeDataException? lastError = null;

        foreach (var overviewMode in modes)
        {
            foreach (var type in types)
            {
                var overview = string.Equals(overviewMode, "slug", StringComparison.Ordinal)
                    ? league.Url
                    : league.SnapshotName;

                var query = new Dictionary<string, string>(StringComparer.Ordinal)
                {
                    ["account"] = build.Account,
                    ["name"] = build.Name,
                    ["overview"] = overview,
                    ["type"] = type,
                };

                var path = $"poe1/api/builds/{league.Version}/character{ToQueryString(query)}";
                Log?.Invoke($"character {build.Name}: asking overview={overviewMode} type={type}");

                try
                {
                    var payload = await GetBytesAsync(
                        path,
                        "application/json",
                        cancellationToken,
                        tolerateClientErrors: true).ConfigureAwait(false);

                    using var document = JsonDocument.Parse(payload);
                    var snapshot = CharacterJsonParser.Parse(
                        document.RootElement,
                        build.Account,
                        build.Name,
                        build.MainSkill,
                        build.Dps);

                    if (snapshot.Account.Length == 0)
                    {
                        snapshot.Account = build.Account;
                    }

                    if (snapshot.Name.Length == 0)
                    {
                        snapshot.Name = build.Name;
                    }

                    if (snapshot.ClassName.Length == 0)
                    {
                        snapshot.ClassName = build.ClassName;
                    }

                    if (snapshot.Level == 0)
                    {
                        snapshot.Level = build.Level;
                    }

                    _characterContract = (overviewMode, type);
                    return snapshot;
                }
                catch (PoeDataException ex)
                {
                    lastError = ex;
                    Log?.Invoke($"character {build.Name}: {ex.Message} (overview={overviewMode}, type={type})");
                }
            }
        }

        throw lastError ?? new PoeDataException($"Could not fetch character {build.Name}.");
    }

    /// <summary>
    /// Scrapes the builds table from the site's own HTML for one skill (or the whole league).
    /// Used when the search API will not answer for a skill - the page is cached and shows the
    /// same rows, so a failed request no longer means a skill with no builds.
    /// </summary>
    public async Task<List<BuildRef>> ScrapeBuildsAsync(
        LeagueInfo league,
        string? skill,
        CancellationToken cancellationToken)
    {
        var path = BuildsPageScraper.PagePath(LeagueSlug(league), skill);
        var payload = await GetBytesAsync(
            path,
            "text/html",
            cancellationToken,
            tolerateClientErrors: true,
            pacer: PagePacer).ConfigureAwait(false);

        var html = System.Text.Encoding.UTF8.GetString(payload);
        var builds = BuildsPageScraper.ParseBuilds(html, skill);
        Log?.Invoke(
            $"builds page {skill ?? "all skills"}: {payload.Length:N0} bytes, {builds.Count} rows");

        if (builds.Count == 0 && DumpDirectory.Length > 0)
        {
            // a page we cannot read is worth keeping: the markup is the only way to tell
            // "no rows were sent" from "rows were sent in a shape this parser did not expect"
            try
            {
                Directory.CreateDirectory(DumpDirectory);
                var file = Path.Combine(
                    DumpDirectory,
                    $"builds-{Slug(skill ?? "all")}-{DateTimeOffset.Now:HHmmss}.html");
                await File.WriteAllTextAsync(file, html, cancellationToken).ConfigureAwait(false);
                Log?.Invoke(
                    $"that page is client-rendered (no rows in the HTML) - saved it to {file}; " +
                    "the ladder has to come from the API");
            }
            catch (IOException ex)
            {
                Log?.Invoke($"could not save the page: {ex.Message}");
            }
        }

        return builds;
    }

    private static string LeagueSlug(LeagueInfo league)
    {
        var slug = league.Url.Trim('/');
        return slug.Contains('/') ? slug[(slug.LastIndexOf('/') + 1)..] : slug;
    }

    /// <summary>
    /// Scrapes the character's own page. Returns null when the page cannot be read or carries
    /// no items, which is the signal to fall back to the JSON endpoint.
    /// </summary>
    private async Task<CharacterSnapshot?> TryReadCharacterPageAsync(
        LeagueInfo league,
        BuildRef build,
        CancellationToken cancellationToken)
    {
        var path = CharacterPageScraper.PagePath(LeagueSlug(league), build.Account, build.Name);

        try
        {
            var payload = await GetBytesAsync(
                path,
                "text/html",
                cancellationToken,
                tolerateClientErrors: true,
                pacer: PagePacer).ConfigureAwait(false);

            var html = System.Text.Encoding.UTF8.GetString(payload);
            var scraped = CharacterPageScraper.Parse(html, build.Account, build.Name, build.MainSkill, build.Dps);

            if (scraped is not null)
            {
                Log?.Invoke(
                    $"character {build.Name}: scraped its page ({scraped.ClusterJewels.Count} cluster jewels)");
                return scraped;
            }

            Log?.Invoke($"character {build.Name}: page carried no item data, asking the JSON endpoint");
            return null;
        }
        catch (RateLimitedException)
        {
            throw;
        }
        catch (PoeDataException ex)
        {
            Log?.Invoke($"character {build.Name}: page failed ({ex.Message}), asking the JSON endpoint");
            return null;
        }
    }

    private async Task<byte[]> GetBytesAsync(
        string relativePath,
        string? accept,
        CancellationToken cancellationToken,
        bool tolerateClientErrors = false,
        RequestPacer? pacer = null)
    {
        var gate = pacer ?? Pacer;

        for (var attempt = 1; attempt <= MaxAttempts; attempt++)
        {
            await gate.WaitTurnAsync(cancellationToken).ConfigureAwait(false);

            using var request = new HttpRequestMessage(HttpMethod.Get, relativePath);
            if (!string.IsNullOrEmpty(accept))
            {
                request.Headers.Accept.Clear();
                request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue(accept));
            }

            HttpResponseMessage response;
            try
            {
                response = await _http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken)
                    .ConfigureAwait(false);
            }
            catch (HttpRequestException ex)
            {
                throw new PoeDataException($"Network error contacting poe.ninja: {ex.Message}", ex);
            }
            catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                // HttpClient's own timeout also surfaces as TaskCanceledException; the
                // difference matters, because one means "still trying" and the other "you
                // pressed cancel"
                throw new PoeDataException(
                    $"poe.ninja did not answer {relativePath} within {_http.Timeout.TotalSeconds:0}s.");
            }

            using (response)
            {
                if (response.StatusCode == HttpStatusCode.TooManyRequests)
                {
                    var retryAfter = ReadRetryAfter(response);

                    // the penalty escalates into the tens of minutes; parking the app that
                    // long with a spinner is worse than saying so and stopping
                    if (retryAfter > MaxRateLimitWait)
                    {
                        throw new RateLimitedException(
                            $"poe.ninja paused this client for {DescribeSpan(retryAfter)} " +
                            $"(until about {DateTimeOffset.Now + retryAfter:HH:mm}); every request would " +
                            "be refused until then. What was already sampled is saved - press ANALYZE " +
                            "again after that time to carry on.",
                            retryAfter);
                    }

                    await gate.PauseAsync(
                            retryAfter,
                            left => Log?.Invoke(left > TimeSpan.Zero
                                ? $"poe.ninja paused this client: {DescribeSpan(left)} left"
                                : "poe.ninja pause over, resuming"),
                            cancellationToken)
                        .ConfigureAwait(false);
                    continue;
                }

                if ((response.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.BadRequest) && tolerateClientErrors)
                {
                    throw new PoeDataException($"poe.ninja returned {(int)response.StatusCode} for {relativePath}");
                }

                if (!response.IsSuccessStatusCode)
                {
                    throw new PoeDataException(
                        $"poe.ninja returned {(int)response.StatusCode} {response.ReasonPhrase} for {relativePath}");
                }

                var bytes = await response.Content.ReadAsByteArrayAsync(cancellationToken).ConfigureAwait(false);
                if (bytes.Length == 0)
                {
                    throw new PoeDataException($"poe.ninja returned an empty body for {relativePath}");
                }

                gate.Relax();
                return bytes;
            }
        }

        throw new PoeDataException($"poe.ninja kept rate-limiting {relativePath}.");
    }

    /// <summary>"5m 41s" - the shape a person can read at a glance.</summary>
    public static string DescribeSpan(TimeSpan span) => span.TotalMinutes >= 1
        ? $"{(int)span.TotalMinutes}m {span.Seconds:00}s"
        : $"{Math.Max(1, (int)Math.Ceiling(span.TotalSeconds))}s";

    private static TimeSpan ReadRetryAfter(HttpResponseMessage response)
    {
        if (response.Headers.RetryAfter is { } header)
        {
            if (header.Delta is { } delta)
            {
                return delta;
            }

            if (header.Date is { } date)
            {
                var wait = date - DateTimeOffset.UtcNow;
                return wait > TimeSpan.Zero ? wait : TimeSpan.FromSeconds(30);
            }
        }

        return TimeSpan.FromSeconds(30);
    }

    private static string ToQueryString(IReadOnlyDictionary<string, string> query)
    {
        if (query.Count == 0)
        {
            return string.Empty;
        }

        var parts = query.Select(pair =>
            $"{Uri.EscapeDataString(pair.Key)}={Uri.EscapeDataString(pair.Value)}");
        return "?" + string.Join('&', parts);
    }

    private static string ReadString(JsonElement element, string name, string fallback = "")
    {
        if (element.ValueKind == JsonValueKind.Object &&
            element.TryGetProperty(name, out var value) &&
            value.ValueKind == JsonValueKind.String)
        {
            return value.GetString() ?? fallback;
        }

        return fallback;
    }

    public void Dispose()
    {
        if (_ownsHttpClient)
        {
            _http.Dispose();
        }
    }
}
