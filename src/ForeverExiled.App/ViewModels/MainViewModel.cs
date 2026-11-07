using System.Collections.ObjectModel;
using System.Text.Json;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using ForeverExiled.App.Theming;
using ForeverExiled.Core.Analysis;
using ForeverExiled.Core.Formatting;
using ForeverExiled.Core.Models;
using ForeverExiled.Core.Net;

namespace ForeverExiled.App.ViewModels;

/// <summary>
/// Single screen view model for the desktop shell. The four child views (Meta, Cluster
/// Lab, Ladder, Settings) all bind against this instance, which keeps selection, busy
/// state and the persisted snapshot in one place. Split across partial files by screen.
/// </summary>
public partial class MainViewModel : ObservableObject
{
    private readonly SyncService _sync;
    private readonly MetaAnalyzer _analyzer;
    private readonly SnapshotStore _store;
    private readonly AppSettings _settings;
    private readonly List<SkillCardItem> _allSkillCards = new();
    private readonly List<BuildItem> _allLadderItems = new();

    private SnapshotDocument _snapshot = new();
    private MetaAnalysis _analysis = new();
    private CancellationTokenSource? _cancellation;
    private LeagueInfo? _currentLeague;
    private bool _initialized;

    public MainViewModel(SyncService sync, MetaAnalyzer analyzer, SnapshotStore store)
    {
        _sync = sync;
        _analyzer = analyzer;
        _store = store;
        _settings = _store.LoadSettings();
        _sync.Client.Pacer.Interval = TimeSpan.FromSeconds(Math.Clamp(_settings.PacingSeconds, 2, 60));

        NavItems = new ObservableCollection<NavItem>
        {
            new("\uE80F", string.Empty, "META", AppTab.Meta, SelectTab),
            new(string.Empty, "cluster_medium.png", "CLUSTERS", AppTab.Clusters, SelectTab),
            new("\uE8FD", string.Empty, "LADDER", AppTab.Ladder, SelectTab),
            new("\uE713", string.Empty, "SETTINGS", AppTab.Settings, SelectTab),
        };

        SizePills = new ObservableCollection<PillItem>
        {
            new("Large", "LARGE", string.Empty, SelectSizePill),
            new("Medium", "MEDIUM", string.Empty, SelectSizePill),
            new("Small", "SMALL", string.Empty, SelectSizePill),
        };

        SortPills = new ObservableCollection<PillItem>
        {
            new("Dps", "BY DPS", string.Empty, SelectSortPill),
            new("Popularity", "BY POPULARITY", string.Empty, SelectSortPill),
        };

        BuildPillCollections();
        SelectTab(AppTab.Clusters);
    }

    public ObservableCollection<NavItem> NavItems { get; }

    public ObservableCollection<SkillCardItem> Skills { get; } = new();

    public ObservableCollection<ComboItem> Combos { get; } = new();

    public ObservableCollection<PillItem> SizePills { get; }

    public ObservableCollection<PillItem> SortPills { get; }

    public ObservableCollection<PillItem> DepthPills { get; } = new();

    public ObservableCollection<PillItem> PacingPills { get; } = new();

    public ObservableCollection<PillItem> PopularityPills { get; } = new();

    public ObservableCollection<StatCardItem> StatCards { get; } = new();

    public ObservableCollection<LeaderItem> MetaLeaders { get; } = new();

    public ObservableCollection<LeaderItem> TopNotables { get; } = new();

    public ObservableCollection<ComboItem> TopCombos { get; } = new();

    public ObservableCollection<BuildItem> TopBuilds { get; } = new();

    public ObservableCollection<BuildItem> LadderItems { get; } = new();

    public ObservableCollection<string> LeagueNames { get; } = new();

    // ------------------------------------------------------------------ header

    [ObservableProperty]
    private string _leagueName = "Sample";

    [ObservableProperty]
    private string _snapshotText = string.Empty;

    [ObservableProperty]
    private string _dataSourceText = "SAMPLE DATA";

    [ObservableProperty]
    private bool _isSampleData = true;

    [ObservableProperty]
    private string _lastSyncText = string.Empty;

    [ObservableProperty]
    private Color _dataSourceColor = Color.FromArgb("#E0A24A");

    [ObservableProperty]
    private string _statusMessage = string.Empty;

    [ObservableProperty]
    private bool _hasStatusMessage;

    // ------------------------------------------------------------------- busy

    [ObservableProperty]
    [NotifyPropertyChangedFor(nameof(IsNotBusy))]
    private bool _isBusy;

    [ObservableProperty]
    private string _busyTitle = string.Empty;

    [ObservableProperty]
    private string _busyMessage = string.Empty;

    [ObservableProperty]
    private double _busyFraction;

    [ObservableProperty]
    private string _busyPercentText = string.Empty;

    public bool IsNotBusy => !IsBusy;

    partial void OnStatusMessageChanged(string value) => HasStatusMessage = !string.IsNullOrWhiteSpace(value);

    // ------------------------------------------------------------ cluster lab

    [ObservableProperty]
    private string _searchText = string.Empty;

    [ObservableProperty]
    private SkillCardItem? _selectedSkill;

    [ObservableProperty]
    private string _selectedSkillName = "Select a skill";

    [ObservableProperty]
    private string _selectedSkillClasses = string.Empty;

    [ObservableProperty]
    private string _selectedSkillPopularity = string.Empty;

    [ObservableProperty]
    private string _selectedSkillBuilds = string.Empty;

    [ObservableProperty]
    private string _selectedSkillAverageDps = string.Empty;

    [ObservableProperty]
    private string _selectedSkillPeakDps = string.Empty;

    [ObservableProperty]
    private string _selectedSkillDamageType = string.Empty;

    [ObservableProperty]
    private string _selectedSkillSampleText = string.Empty;

    [ObservableProperty]
    private Color _selectedSkillAccent = Colors.Gray;

    [ObservableProperty]
    private ClusterSize _currentSize = ClusterSize.Medium;

    [ObservableProperty]
    private string _comboHeaderText = string.Empty;

    [ObservableProperty]
    private string _comboHintText = string.Empty;

    [ObservableProperty]
    private bool _hasCombos;

    [ObservableProperty]
    private bool _showComboEmptyState = true;

    [ObservableProperty]
    private string _comboEmptyTitle = string.Empty;

    [ObservableProperty]
    private string _comboEmptyMessage = string.Empty;

    [ObservableProperty]
    private bool _canAnalyze;

    [ObservableProperty]
    private string _globalLeaderLabel = string.Empty;

    [ObservableProperty]
    private string _globalLeaderValue = string.Empty;

    [ObservableProperty]
    private string _globalLeaderCaption = string.Empty;

    [ObservableProperty]
    private string _globalLeaderBuild = string.Empty;

    [ObservableProperty]
    private string _coverageText = string.Empty;

    [ObservableProperty]
    private double _coveragePercent;

    [ObservableProperty]
    private double _coverageProgress;

    [ObservableProperty]
    private string _sampledBuildsText = string.Empty;

    [ObservableProperty]
    private string _jewelsText = string.Empty;

    [ObservableProperty]
    private string _combosText = string.Empty;

    [ObservableProperty]
    private string _leaguesText = string.Empty;

    // ------------------------------------------------------------------ ladder

    [ObservableProperty]
    private string _ladderFilter = string.Empty;

    [ObservableProperty]
    private string _ladderSummary = string.Empty;

    // ---------------------------------------------------------------- settings

    [ObservableProperty]
    private string _selectedLeagueName = string.Empty;

    [ObservableProperty]
    private string _cacheSizeText = string.Empty;

    [ObservableProperty]
    private string _dataFolderText = string.Empty;

    [ObservableProperty]
    private string _settingsSampleDepthText = string.Empty;

    [ObservableProperty]
    private string _settingsPacingText = string.Empty;

    [ObservableProperty]
    private string _settingsPopularityText = string.Empty;

    [ObservableProperty]
    private string _lastError = string.Empty;

    [ObservableProperty]
    private bool _hasError;

    // ------------------------------------------------------------------- tabs

    [ObservableProperty]
    private AppTab _activeTab = AppTab.Clusters;

    public bool IsMetaActive => ActiveTab == AppTab.Meta;

    public bool IsClustersActive => ActiveTab == AppTab.Clusters;

    public bool IsLadderActive => ActiveTab == AppTab.Ladder;

    public bool IsSettingsActive => ActiveTab == AppTab.Settings;

    partial void OnActiveTabChanged(AppTab value)
    {
        OnPropertyChanged(nameof(IsMetaActive));
        OnPropertyChanged(nameof(IsClustersActive));
        OnPropertyChanged(nameof(IsLadderActive));
        OnPropertyChanged(nameof(IsSettingsActive));
    }

    public void SelectTab(AppTab tab)
    {
        ActiveTab = tab;
        foreach (var item in NavItems)
        {
            item.IsSelected = item.Tab == tab;
        }

        if (tab == AppTab.Settings)
        {
            RefreshSettingsSurface();
        }
    }

    // -------------------------------------------------------------- lifecycle

    [RelayCommand]
    public async Task InitializeAsync()
    {
        if (_initialized)
        {
            return;
        }

        _initialized = true;

        var cached = _store.LoadSnapshot(_settings.LeagueUrl);
        if (cached is { Skills.Count: > 0 })
        {
            _snapshot = cached;
            Publish();
            StatusMessage = "Cached snapshot loaded. Press Sync to refresh from poe.ninja.";
        }
        else
        {
            _snapshot = SampleData.LoadCopy();
            _settings.LeagueUrl = _snapshot.LeagueUrl;
            Publish();
            StatusMessage = "Showing the bundled demo snapshot: skill shares, DPS and character names are generated for the demo, not scraped. Press Sync to pull the real ladder.";
        }

        await RefreshLeaguesSilentlyAsync().ConfigureAwait(true);
    }

    [RelayCommand]
    private async Task RefreshAsync()
    {
        if (IsBusy)
        {
            return;
        }

        _cancellation = new CancellationTokenSource();
        var token = _cancellation.Token;
        BeginBusy("SYNCING LADDER", "Contacting poe.ninja…");
        ClearError();
        string? autoSampleSkill = null;
        var cancelled = false;

        var progress = new Progress<SyncProgress>(OnSyncProgress);

        try
        {
            var index = await _sync.GetLeaguesAsync(token).ConfigureAwait(true);
            ApplyLeagues(index);

            var league = index.BuildLeagues.FirstOrDefault(l =>
                             string.Equals(l.Url, _settings.LeagueUrl, StringComparison.OrdinalIgnoreCase))
                         ?? index.BuildLeagues.FirstOrDefault();

            if (league is null)
            {
                throw new PoeDataException("poe.ninja listed no PoE 1 build leagues. Try again in a minute.");
            }

            _currentLeague = league;
            _settings.LeagueUrl = league.Url;
            _store.SaveSettings(_settings);

            _snapshot = await _sync.RefreshLadderAsync(league, _settings, progress, token).ConfigureAwait(true);
            Publish();

            StatusMessage = $"{_snapshot.Skills.Count} skills above {DpsFormatter.Percent(_settings.MinPopularityPercent)} popularity, sorted by DPS.";

            // Sample the selected skill right away, but only once the busy overlay is gone -
            // the sampler refuses to start while another job owns the busy state.
            autoSampleSkill = SelectedSkill?.Stat.Name;
        }
        catch (OperationCanceledException)
        {
            cancelled = true;
            StatusMessage = "Sync cancelled.";
        }
        catch (Exception ex) when (ex is PoeDataException or HttpRequestException or TaskCanceledException or JsonException or InvalidOperationException)
        {
            ReportError("Sync failed", ex);
        }
        finally
        {
            EndBusy();
            _cancellation?.Dispose();
            _cancellation = null;
        }

        if (autoSampleSkill is not null && !cancelled)
        {
            await AnalyzeSkillInternalAsync(autoSampleSkill, updateStatus: false).ConfigureAwait(true);
        }
    }

    [RelayCommand]
    private void CancelBusy() => _cancellation?.Cancel();

    private async Task RefreshLeaguesSilentlyAsync()
    {
        try
        {
            var index = await _sync.GetLeaguesAsync(CancellationToken.None).ConfigureAwait(true);
            ApplyLeagues(index);
            _currentLeague = index.BuildLeagues.FirstOrDefault(l =>
                string.Equals(l.Url, _settings.LeagueUrl, StringComparison.OrdinalIgnoreCase));
            if (_currentLeague is not null && LeagueNames.Contains(_currentLeague.Name))
            {
                SelectedLeagueName = _currentLeague.Name;
            }
        }
        catch (Exception ex) when (ex is PoeDataException or HttpRequestException or TaskCanceledException)
        {
            // Offline is fine: the sample snapshot keeps the app usable.
            LeaguesText = "League list unavailable (offline)";
        }
    }

    private void ApplyLeagues(IndexState index)
    {
        _lastIndexState = index;
        LeagueNames.Clear();
        foreach (var league in index.BuildLeagues)
        {
            LeagueNames.Add(league.Name);
        }

        var active = index.BuildLeagues.FirstOrDefault(l =>
            string.Equals(l.Url, _settings.LeagueUrl, StringComparison.OrdinalIgnoreCase));
        if (active is not null)
        {
            SelectedLeagueName = active.Name;
        }

        LeaguesText = index.BuildLeagues.Count == 0
            ? "No leagues advertised"
            : $"{index.BuildLeagues.Count} leagues advertised";
    }

    private void OnSyncProgress(SyncProgress progress)
    {
        BusyTitle = progress.Phase.ToUpperInvariant();
        BusyMessage = progress.Message;
        BusyFraction = progress.Fraction;
        BusyPercentText = Math.Round(progress.Fraction * 100).ToString("0") + "%";
    }

    private void BeginBusy(string title, string message)
    {
        BusyTitle = title;
        BusyMessage = message;
        BusyFraction = 0;
        BusyPercentText = "0%";
        IsBusy = true;
    }

    private void EndBusy()
    {
        IsBusy = false;
        BusyFraction = 0;
        BusyPercentText = string.Empty;
    }

    private void ReportError(string title, Exception ex)
    {
        LastError = $"{title}: {ex.Message}";
        HasError = true;
        StatusMessage = LastError;
        _sync.Client.Log?.Invoke(LastError);
    }

    private void ClearError()
    {
        HasError = false;
        LastError = string.Empty;
    }

    // --------------------------------------------------------------- publishing

    private void Publish()
    {
        var previousName = SelectedSkill?.Stat.Name;

        _analysis = _analyzer.Analyze(_snapshot, _settings.MinPopularityPercent);
        IsSampleData = _snapshot.IsSample;

        RebuildSkillRail(previousName);
        RebuildMetaView();
        RebuildLadderView();
        UpdateHeader();
        RefreshSettingsSurface();
    }

    private void UpdateHeader()
    {
        LeagueName = _snapshot.LeagueName.Length > 0 ? _snapshot.LeagueName : "Allflame";
        IsSampleData = _snapshot.IsSample;
        DataSourceText = IsSampleData ? "SYNTHETIC SAMPLE" : "LIVE LADDER";
        DataSourceColor = IsSampleData ? Palette.Warning : Palette.Success;

        // The bundled demo snapshot is generated, not scraped, so it must never be
        // labelled like a real snapshot version.
        if (IsSampleData)
        {
            SnapshotText = "demo — not the live ladder";
        }
        else if (_snapshot.SnapshotVersion.Length > 0)
        {
            var version = _snapshot.SnapshotVersion;
            var dash = version.LastIndexOf('-');
            var shortVersion = dash > 0 ? version[(dash + 1)..] : version;
            SnapshotText = "snapshot " + shortVersion;
        }
        else
        {
            SnapshotText = "no snapshot version";
        }

        LastSyncText = Humanize(_snapshot.GeneratedAt);
        LeaguesText = LeagueNames.Count == 0 ? LeaguesText : $"{ LeagueNames.Count} leagues available";
    }

    private static string Humanize(DateTimeOffset timestamp)
    {
        if (timestamp == default)
        {
            return string.Empty;
        }

        var delta = DateTimeOffset.UtcNow - timestamp;
        if (delta < TimeSpan.Zero)
        {
            return "just now";
        }

        return delta.TotalMinutes switch
        {
            < 1 => "just now",
            < 60 => $"{(int)delta.TotalMinutes}m ago",
            < 60 * 24 => $"{(int)delta.TotalHours}h ago",
            _ => $"{(int)delta.TotalDays}d ago",
        };
    }
}
