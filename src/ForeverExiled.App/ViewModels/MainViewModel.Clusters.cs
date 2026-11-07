using CommunityToolkit.Mvvm.Input;
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
        _allSkillCards.Clear();

        var ordered = string.Equals(_sortMode, "Popularity", StringComparison.Ordinal)
            ? _analysis.Skills
                .OrderByDescending(s => s.PopularityPercent)
                .ThenByDescending(s => s.AverageDps)
                .ToList()
            : _analysis.Skills
                .OrderByDescending(s => s.AverageDps)
                .ThenByDescending(s => s.BuildCount)
                .ToList();

        var maxDps = ordered.Count > 0 ? ordered.Max(s => s.AverageDps) : 0;

        for (var index = 0; index < ordered.Count; index++)
        {
            var stat = ordered[index];
            var profile = _analysis.FindProfile(stat.Name);
            _allSkillCards.Add(new SkillCardItem(stat, index + 1, profile, maxDps, SelectSkill));
        }

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

        Skills.Clear();
        foreach (var item in filtered)
        {
            Skills.Add(item);
        }

        var target = filtered.FirstOrDefault(c => string.Equals(c.Name, preferredName, StringComparison.OrdinalIgnoreCase))
                     ?? filtered.FirstOrDefault(c => c.IsSelected)
                     ?? filtered.FirstOrDefault();

        if (target is not null)
        {
            SelectSkill(target);
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
        var total = skill.Stat.TopBuilds.Count;
        SelectedSkillSampleText = profile is { SampledBuilds: > 0 }
            ? $"{profile.SampledBuilds} of {total} top builds sampled"
            : total > 0
                ? $"0 of {total} top builds sampled"
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
        Combos.Clear();
        SelectCraftCombo(null);
        HasCombos = false;
        ShowComboEmptyState = true;
        ComboEmptyTitle = "Nothing matches that filter";
        ComboEmptyMessage = "Try a different skill, class or damage type.";
    }

    private void RebuildCombos()
    {
        Combos.Clear();

        var skill = SelectedSkill;
        var profile = skill is null ? null : _analysis.FindProfile(skill.Stat.Name);
        var combos = profile?.ForSize(CurrentSize) ?? new List<ClusterCombo>();

        RefreshSizePills(profile);
        RebuildSizeAdoption(profile);

        var maxBuilds = combos.Count > 0 ? combos.Max(c => c.BuildCount) : 0;
        var rank = 1;
        foreach (var combo in combos.Take(10))
        {
            Combos.Add(new ComboItem(combo, rank++, profile?.SampledBuilds ?? 0, maxBuilds, showSkills: false, SelectCraftCombo));
        }

        // the first combination is priced until another one is picked
        SelectCraftCombo(Combos.FirstOrDefault());

        HasCombos = Combos.Count > 0;
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

            var count = profile?.ForSize(size).Count ?? 0;
            pill.CountText = count > 0 ? count.ToString() : string.Empty;
            pill.IsSelected = size == CurrentSize;
        }
    }

    private void SelectCraftCombo(ComboItem? item)
    {
        foreach (var combo in Combos)
        {
            combo.IsCrafted = ReferenceEquals(combo, item);
        }

        CraftRoutes.Clear();
        CraftTargetText = item is null ? "No combination selected" : item.Label;

        if (item is null)
        {
            return;
        }

        foreach (var route in CraftingMath.Routes(item.Combo))
        {
            CraftRoutes.Add(route);
        }
    }

    private void RebuildSizeAdoption(SkillClusterProfile? profile)
    {
        SizeAdoption.Clear();

        var total = profile?.SampledBuilds ?? 0;
        foreach (var size in new[] { ClusterSize.Large, ClusterSize.Medium, ClusterSize.Small })
        {
            var share = profile?.SizeMix.FirstOrDefault(s => s.Size == size);
            var item = new SizeAdoptionItem(size, share?.Count ?? 0, total, profile?.Best(size), SelectSizeAdoption)
            {
                IsSelected = size == CurrentSize,
            };

            SizeAdoption.Add(item);
        }

        SizeAdoptionHeaderText = total > 0
            ? $"{total} build{(total == 1 ? string.Empty : "s")}"
            : "no builds sampled";
    }

    private void SelectSizeAdoption(SizeAdoptionItem item)
    {
        if (!item.IsSelectable)
        {
            return;
        }

        CurrentSize = item.Size;
        foreach (var pill in SizePills)
        {
            pill.IsSelected = string.Equals(pill.Key, item.Size.ToString(), StringComparison.OrdinalIgnoreCase);
        }

        RebuildCombos();
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
            if (updateStatus)
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
