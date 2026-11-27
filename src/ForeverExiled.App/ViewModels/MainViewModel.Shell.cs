using CommunityToolkit.Mvvm.ComponentModel;

namespace ForeverExiled.App.ViewModels;

/// <summary>
/// The shell around the screens: which sidebar destination is open and which pane of the
/// Cluster Jewels tab is showing.
///
/// The four screens that do not exist yet still open — onto a page that says, in one line, what
/// will live there. A sidebar row that does nothing when clicked reads as a bug; one marked SOON
/// that explains itself reads as a plan.
/// </summary>
public partial class MainViewModel
{
    /// <summary>Title, one-line intent and icon for each destination still to be built.</summary>
    private static readonly Dictionary<AppTab, (string Title, string Subtitle, string Image)> PlannedCopy = new()
    {
        [AppTab.WatchersEyes] = (
            "Watcher's Eyes",
            "Which aura modifiers the ladder's Watcher's Eye jewels actually roll, and what each combination is worth.",
            "nav_eye.png"),
        [AppTab.RareItems] = (
            "Rare Items",
            "The rare gear behind the top builds — slot by slot, mod by mod, with what it costs to make.",
            "nav_ring.png"),
        [AppTab.Flasks] = (
            "Flasks",
            "Life, mana and utility flask lineups the sampled builds settle on, with suffixes and enchants.",
            "nav_flask.png"),
        [AppTab.Economy] = (
            "Economy",
            "Currency behind every recommended craft, tracked across syncs so a price move is visible before it bites.",
            "nav_coin.png"),
    };

    [ObservableProperty]
    private ClusterPane _activePane = ClusterPane.Lab;

    [ObservableProperty]
    private string _plannedTitle = string.Empty;

    [ObservableProperty]
    private string _plannedSubtitle = string.Empty;

    [ObservableProperty]
    private string _plannedImage = string.Empty;

    /// <summary>"Cluster Jewels / Lab" — what the top bar says is on screen.</summary>
    [ObservableProperty]
    private string _activeCrumb = "Cluster Jewels / Lab";

    public bool IsLabPaneActive => ActivePane == ClusterPane.Lab;

    public bool IsMetaPaneActive => ActivePane == ClusterPane.Meta;

    public bool IsLadderPaneActive => ActivePane == ClusterPane.Ladder;

    public bool IsClusterJewelsActive => ActiveTab == AppTab.ClusterJewels;

    public bool IsSettingsActive => ActiveTab == AppTab.Settings;

    /// <summary>True for any destination whose screen is still a placeholder.</summary>
    public bool IsPlannedTabActive => PlannedCopy.ContainsKey(ActiveTab);

    partial void OnActivePaneChanged(ClusterPane value)
    {
        OnPropertyChanged(nameof(IsLabPaneActive));
        OnPropertyChanged(nameof(IsMetaPaneActive));
        OnPropertyChanged(nameof(IsLadderPaneActive));

        foreach (var pill in PanePills)
        {
            pill.IsSelected = string.Equals(pill.Key, value.ToString(), StringComparison.OrdinalIgnoreCase);
        }

        UpdateCrumb();
    }

    public void SelectPane(ClusterPane pane) => ActivePane = pane;

    private void SelectPanePill(PillItem pill)
    {
        if (Enum.TryParse<ClusterPane>(pill.Key, ignoreCase: true, out var pane))
        {
            SelectPane(pane);
        }
    }

    /// <summary>Fills the placeholder copy for the destination that just opened, and refreshes the crumb.</summary>
    private void ApplyShellCopy()
    {
        if (PlannedCopy.TryGetValue(ActiveTab, out var planned))
        {
            PlannedTitle = planned.Title;
            PlannedSubtitle = planned.Subtitle;
            PlannedImage = planned.Image;
        }

        UpdateCrumb();
    }

    private void UpdateCrumb() => ActiveCrumb = ActiveTab switch
    {
        AppTab.ClusterJewels => $"Cluster Jewels / {ActivePane}",
        AppTab.Settings => "Settings",
        _ => PlannedCopy.TryGetValue(ActiveTab, out var planned) ? planned.Title : "Cluster Jewels",
    };
}
