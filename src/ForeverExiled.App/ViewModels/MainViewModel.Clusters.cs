using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using ForeverExiled.App.Theming;
using ForeverExiled.Core.Analysis;
using ForeverExiled.Core.Formatting;
using ForeverExiled.Core.Models;
using ForeverExiled.Core.Net;

namespace ForeverExiled.App.ViewModels;

/// <summary>Cluster Lab: skill rail, cluster-size selector and combination cards.</summary>
public partial class MainViewModel
{
    private string _sortMode = "Dps";

    /// <summary>Rebuilds the full skill rail from the current analysis, preserving selection.</summary>
    private void RebuildSkillRail(string? preferredName)
    {
        var ordered = string.Equals(_sortMode, "Popularity", StringComparison.Ordinal)
            ? _analysis.Skills
                .OrderByDescending(s => s.PopularityPercent)
                .ThenByDescending(s => s.PeakDps)
                .ToList()
            : _analysis.Skills
                .OrderByDescending(s => s.PeakDps)
                .ThenByDescending(s => s.AverageDps)
                .ThenByDescending(s => s.BuildCount)
                .ToList();

        var maxDps = ordered.Count > 0 ? ordered.Max(s => s.PeakDps) : 0;

        _allSkillCards = ordered
            .Select((stat, index) => new SkillCardItem(
                stat, index + 1, _analysis.FindProfile(stat.Name), maxDps, SelectSkill))
            .ToList();

        ApplySkillFilter(preferredName);
    }

    private void ApplySkillFilter(string? preferredName)
    {
        var query = (SearchText ?? string.Empty).Trim();

        var filtered = query.Length == 0
            ? _allSkillCards.ToList()
            : _allSkillCards
                .Where(c => c.Name.Contains(query, StringComparison.OrdinalIgnoreCase)
                            || c.ClassText.Contains(query, StringComparison.OrdinalIgnoreCase)
                            || c.DamageType.Contains(query, StringComparison.OrdinalIgnoreCase))
                .ToList();

        Skills = filtered;

        var target = filtered.FirstOrDefault(c => string.Equals(c.Name, preferredName, StringComparison.OrdinalIgnoreCase))
                     ?? filtered.FirstOrDefault(c => c.IsSelected)
                     ?? filtered.FirstOrDefault();

        if (target is not null)
        {
            // typing in the filter re-applies the same selection on every keystroke; rebuilding
            // the combination cards and their prices for an unchanged skill is pure waste
            if (ReferenceEquals(target, SelectedSkill) && HasCombos)
            {
                foreach (var item in _allSkillCards)
                {
                    item.IsSelected = ReferenceEquals(item, target);
                }
            }
            else
            {
                SelectSkill(target);
            }
        }
        else
        {
            ClearSelection();
        }
    }

    partial void OnSearchTextChanged(string value) => ApplySkillFilter(SelectedSkill?.Stat.Name);

    public void SelectSkill(SkillCardItem skill)
    {
        if (skill is null)
        {
            return;
        }

        foreach (var item in _allSkillCards)
        {
            item.IsSelected = ReferenceEquals(item, skill);
        }

        SelectedSkill = skill;
        SelectedSkillName = skill.Name;
        SelectedSkillClasses = skill.ClassText;
        SelectedSkillClassImage = skill.ClassImage;
        HasSelectedSkillClassImage = skill.HasClassImage;
        SelectedSkillGemImage = skill.GemImage;
        HasSelectedSkillGemImage = skill.HasGemImage;
        SelectedSkillPopularity = skill.PopText;
        SelectedSkillBuilds = skill.BuildsText;
        SelectedSkillAverageDps = DpsFormatter.Format(skill.Stat.AverageDps);
        SelectedSkillPeakDps = DpsFormatter.Format(skill.Stat.PeakDps);
        SelectedSkillDamageType = skill.Stat.DamageType.ToUpperInvariant();
        SelectedSkillAccent = skill.AccentColor;

        var profile = _analysis.FindProfile(skill.Name);

        // numerator and denominator come from the same set - the skill's tracked top builds -
        // so the pair can never read "52 of 40" again
        var total = skill.Stat.TopBuilds.Count;
        var sampled = profile?.SampledBuilds ?? 0;
        var rankWord = _snapshot.LadderDpsMissing ? "ladder-order builds" : "top-DPS builds";
        SelectedSkillSampleText = sampled > 0
            ? total > 0
                ? $"{sampled} of {total} {rankWord} sampled"
                : $"{sampled} builds from an earlier sample"
            : total > 0
                ? $"0 of {total} {rankWord} sampled"
                : _snapshot.HasLadderWarning
                    ? "no ladder rows — see the banner"
                    : "no ladder rows";

        CanAnalyze = !IsSampleData && total > 0;
        RebuildCombos();
    }

    private void ClearSelection()
    {
        SelectedSkill = null;
        SelectedSkillName = "No match";
        SelectedSkillClasses = string.Empty;
        SelectedSkillClassImage = string.Empty;
        HasSelectedSkillClassImage = false;
        SelectedSkillGemImage = string.Empty;
        HasSelectedSkillGemImage = false;
        SelectedSkillPopularity = "–";
        SelectedSkillBuilds = string.Empty;
        SelectedSkillAverageDps = "–";
        SelectedSkillPeakDps = "–";
        SelectedSkillDamageType = string.Empty;
        SelectedSkillSampleText = string.Empty;
        CanAnalyze = false;
        Combos = Array.Empty<ComboItem>();
        SelectCraftCombo(null);
        HasCombos = false;
        ShowComboEmptyState = true;
        ComboEmptyTitle = "Nothing matches that filter";
        ComboEmptyMessage = "Try a different skill, class or damage type.";
    }

    private void RebuildCombos()
    {
        var skill = SelectedSkill;
        var profile = skill is null ? null : _analysis.FindProfile(skill.Stat.Name);
        var combos = (profile?.ForSize(CurrentSize) ?? new List<ClusterCombo>())
            .Where(combo => ShowUniqueJewels || !combo.IsUnique)
            .ToList();

        RefreshSizePills(profile);

        var maxBuilds = combos.Count > 0 ? combos.Max(c => c.BuildCount) : 0;
        var rank = 1;
        var cards = combos
            .Take(10)
            .Select(combo => new ComboItem(
                combo, rank++, profile?.SampledBuilds ?? 0, maxBuilds, showSkills: false, SelectCraftCombo))
            .ToList();

        // one assignment, so the stack lays out once rather than once per card
        Combos = cards;

        // the first combination is priced until another one is picked
        SelectCraftCombo(cards.FirstOrDefault());

        HasCombos = cards.Count > 0;
        ShowComboEmptyState = !HasCombos;

        var sizeLabel = CurrentSize.ToLabel();
        ComboHeaderText = HasCombos
            ? $"{sizeLabel} combinations"
            : $"{sizeLabel} clusters";

        ComboHintText = skill is null
            ? string.Empty
            : HasCombos
                ? "Ranked by how many sampled builds run the combination"
                : string.Empty;

        if (HasCombos)
        {
            return;
        }

        if (skill is null)
        {
            ComboEmptyTitle = "No skill selected";
            ComboEmptyMessage = "Pick a main skill on the left to see the cluster jewels its builds use.";
        }
        else if (IsSampleData)
        {
            ComboEmptyTitle = $"No {sizeLabel} clusters in the sample";
            ComboEmptyMessage = "The bundled sample has no builds running this cluster size for this skill.";
        }
        else if (profile is null || profile.SampledBuilds == 0)
        {
            ComboEmptyTitle = "No character data yet";
            ComboEmptyMessage = "Run Analyze to fetch this skill's top DPS characters and extract their cluster jewels.";
        }
        else
        {
            ComboEmptyTitle = $"No {sizeLabel} cluster jewels";
            ComboEmptyMessage = $"{profile.SampledBuilds} sampled builds run other cluster sizes only.";
        }
    }

    private void RefreshSizePills(SkillClusterProfile? profile)
    {
        foreach (var pill in SizePills)
        {
            if (!Enum.TryParse<ClusterSize>(pill.Key, ignoreCase: true, out var size))
            {
                continue;
            }

            var count = profile?.ForSize(size).Count(combo => ShowUniqueJewels || !combo.IsUnique) ?? 0;
            pill.CountText = count > 0 ? count.ToString() : string.Empty;
            pill.IsSelected = size == CurrentSize;
        }
    }

    /// <summary>The combination the crafting card is currently priced for, in either list.</summary>
    private ClusterCombo? _craftedCombo;

    /// <summary>
    /// Priced routes per combination and item level. Switching between combinations recomputed
    /// the same odds from scratch, twice - once for the base's own level, once for an iLvl 86
    /// base - for jewels that were just priced a moment before.
    /// </summary>
    private readonly Dictionary<(ClusterCombo Combo, int Level), IReadOnlyList<CraftRouteItem>> _routeCache = new();

    private IReadOnlyList<CraftRouteItem> RoutesFor(ClusterCombo combo, int level)
    {
        if (_routeCache.TryGetValue((combo, level), out var known))
        {
            return known;
        }

        var routes = level == 0 ? CraftingMath.Routes(combo) : CraftingMath.Routes(combo, level);
        _routeCache[(combo, level)] = routes;
        return routes;
    }

    private void SelectCraftCombo(ComboItem? item)
    {
        _craftedCombo = item?.Combo;

        foreach (var combo in Combos)
        {
            combo.IsCrafted = ReferenceEquals(combo, item);
        }

        foreach (var combo in TopCombos)
        {
            combo.IsCrafted = ReferenceEquals(combo, item);
        }

        CraftRoutes.Clear();
        CraftTags.Clear();

        if (item is null)
        {
            CraftTargetText = "No combination selected";
            CraftLevelText = string.Empty;
            CraftPoolText = string.Empty;
            CraftEndgameText = string.Empty;
            return;
        }

        foreach (var chip in item.Tags)
        {
            CraftTags.Add(chip);
        }

        var level = CraftingMath.MinimumItemLevel(item.Combo);
        CraftTargetText = item.Label;
        CraftLevelText = $"needs iLvl {level} · priced on an iLvl {level} base";

        var size = item.Combo.Size.ToString();
        var tag = NotableWeights.PoolFor(size, item.Combo.GrantType);
        var prefixTotal = NotableWeights.PoolTotal(tag, size, "Prefix", level);
        var suffixTotal = NotableWeights.PoolTotal(tag, size, "Suffix", level);
        CraftPoolText = prefixTotal + suffixTotal > 0
            ? $"{NotableWeights.PoolLabel(tag)} pool at iLvl {level}: {prefixTotal:N0} prefix / {suffixTotal:N0} suffix weight"
            : string.Empty;

        // an iLvl 86 base rolls a bigger pool, so the same craft is harder - and that is the
        // number every other calculator shows, because that is the base people buy
        const int endgameLevel = 86;
        var endgame = level < endgameLevel ? RoutesFor(item.Combo, endgameLevel) : Array.Empty<CraftRouteItem>();
        // other calculators price an iLvl 84+ base and lead with alt -> regal
        var sameRoute = endgame.FirstOrDefault(route => route.Name == "Alt → Regal") ?? endgame.FirstOrDefault();
        CraftEndgameText = sameRoute is null
            ? string.Empty
            : $"{sameRoute.Name} on an iLvl {endgameLevel} base ≈ {CraftRouteItem.ChaosLabel(sameRoute.Chaos)}";

        foreach (var route in RoutesFor(item.Combo, 0))
        {
            CraftRoutes.Add(route);
        }
    }

    /// <summary>Shows or hides the unique cluster jewels (Voices, Megalomaniac) in the lists.</summary>
    [RelayCommand]
    private void ToggleUniqueJewels() => ShowUniqueJewels = !ShowUniqueJewels;

    /// <summary>
    /// Whether Voices and Megalomaniac are listed. They are the two unique cluster jewels: a
    /// fixed item, not a combination anyone can roll, so they distort a popularity ranking - but
    /// they are what a good number of builds actually wear.
    /// </summary>
    [ObservableProperty]
    private bool _showUniqueJewels = true;

    public string UniquesLabel => ShowUniqueJewels ? "UNIQUES" : "UNIQUES";

    public string UniquesCaption => ShowUniqueJewels
        ? "Voices and Megalomaniac listed"
        : "Voices and Megalomaniac hidden";

    partial void OnShowUniqueJewelsChanged(bool value)
    {
        OnPropertyChanged(nameof(UniquesCaption));

        if (!_initialized)
        {
            return;
        }

        _settings.ShowUniqueJewels = value;
        _store.SaveSettings(_settings);

        RebuildCombos();
        RebuildMetaView();
    }

    private void SelectSizePill(PillItem pill)
    {
        if (!Enum.TryParse<ClusterSize>(pill.Key, ignoreCase: true, out var size))
        {
            return;
        }

        CurrentSize = size;
        foreach (var item in SizePills)
        {
            item.IsSelected = string.Equals(item.Key, pill.Key, StringComparison.Ordinal);
        }

        RebuildCombos();
    }

    private void SelectSortPill(PillItem pill)
    {
        _sortMode = pill.Key;
        foreach (var item in SortPills)
        {
            item.IsSelected = string.Equals(item.Key, pill.Key, StringComparison.Ordinal);
        }

        RebuildSkillRail(SelectedSkill?.Stat.Name);
    }

    [RelayCommand]
    private Task AnalyzeSelectedSkillAsync() =>
        AnalyzeSkillInternalAsync(SelectedSkill?.Stat.Name, updateStatus: true);

    private async Task AnalyzeSkillInternalAsync(string? skillName, bool updateStatus)
    {
        if (IsBusy || string.IsNullOrWhiteSpace(skillName))
        {
            return;
        }

        if (_snapshot.IsSample)
        {
            StatusMessage = "The bundled sample snapshot is read-only — sync live data to sample real builds.";
            return;
        }

        _cancellation = new CancellationTokenSource();
        var token = _cancellation.Token;
        BeginBusy("SAMPLING CHARACTERS", $"Fetching {skillName} builds…");
        ClearError();

        var progress = new Progress<SyncProgress>(OnSyncProgress);

        try
        {
            _snapshot = await _sync
                .SampleSkillAsync(_snapshot, skillName, _settings.SampleDepth, progress, token)
                .ConfigureAwait(true);

            Publish();

            var profile = _analysis.FindProfile(skillName);
            if (_sync.LastSamplingError.Length > 0)
            {
                LastError = $"{skillName}: sampling stopped — {_sync.LastSamplingError}";
                HasError = true;
                StatusMessage = LastError;
            }
            else if (updateStatus)
            {
                StatusMessage = profile is { SampledBuilds: > 0 }
                    ? $"{skillName}: {profile.SampledBuilds} builds sampled, {profile.Large.Count + profile.Medium.Count + profile.Small.Count} combinations found."
                    : $"{skillName}: no cluster jewels found in the sampled builds.";
            }
        }
        catch (OperationCanceledException)
        {
            StatusMessage = "Sampling cancelled.";
        }
        catch (RateLimitedException ex)
        {
            LastError = ex.Message;
            HasError = true;
            StatusMessage = LastError;
        }
        catch (Exception ex) when (ex is PoeDataException or HttpRequestException or TaskCanceledException)
        {
            ReportError("Sampling failed", ex);
        }
        finally
        {
            EndBusy();
            _cancellation?.Dispose();
            _cancellation = null;
        }
    }
}
