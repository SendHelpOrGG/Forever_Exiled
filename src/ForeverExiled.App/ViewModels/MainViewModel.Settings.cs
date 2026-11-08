using System.Diagnostics;
using System.Text;
using Microsoft.Maui.ApplicationModel;
using Microsoft.Maui.ApplicationModel.DataTransfer;
using Microsoft.Maui.Storage;
using CommunityToolkit.Mvvm.Input;
using ForeverExiled.Core.Formatting;
using ForeverExiled.Core.Models;
using ForeverExiled.Core.Net;

namespace ForeverExiled.App.ViewModels;

/// <summary>Settings: league, crawl depth, pacing, cache maintenance and exports.</summary>
public partial class MainViewModel
{
    private IndexState? _lastIndexState;

    private void BuildPillCollections()
    {
        foreach (var depth in new[] { 6, 10, 12, 20, 30 })
        {
            DepthPills.Add(new PillItem(depth.ToString(), depth.ToString(), string.Empty, SelectDepthPill));
        }

        foreach (var pacing in new[] { 3, 5, 8, 12 })
        {
            PacingPills.Add(new PillItem(pacing.ToString(), pacing + "s", string.Empty, SelectPacingPill));
        }

        GradingPills.Add(new PillItem("quick", "QUICK", string.Empty, SelectGradingPill));
        GradingPills.Add(new PillItem("full", "FULL", string.Empty, SelectGradingPill));

        foreach (var popularity in new[] { 0.5, 1.0, 2.0, 3.0, 5.0 })
        {
            PopularityPills.Add(new PillItem(
                popularity.ToString("0.0", System.Globalization.CultureInfo.InvariantCulture),
                popularity.ToString("0.#", System.Globalization.CultureInfo.InvariantCulture) + "%",
                string.Empty,
                SelectPopularityPill));
        }
    }

    private void RefreshSettingsSurface()
    {
        SettingsSampleDepthText = _settings.SampleDepth + " builds per skill";
        SettingsPacingText = _settings.PacingSeconds + "s between requests";
        SettingsPopularityText = DpsFormatter.Percent(_settings.MinPopularityPercent) + " popularity floor";
        SettingsGradingText = _settings.GradeEverySkill
            ? "one request per skill · top builds"
            : "one request for the ladder · partial DPS";

        foreach (var pill in GradingPills)
        {
            pill.IsSelected = (pill.Key == "full") == _settings.GradeEverySkill;
        }

        foreach (var pill in DepthPills)
        {
            pill.IsSelected = pill.Key == _settings.SampleDepth.ToString();
        }

        foreach (var pill in PacingPills)
        {
            pill.IsSelected = pill.Key == _settings.PacingSeconds.ToString();
        }

        var popularityKey = _settings.MinPopularityPercent.ToString("0.0", System.Globalization.CultureInfo.InvariantCulture);
        foreach (var pill in PopularityPills)
        {
            pill.IsSelected = pill.Key == popularityKey;
        }

        CacheSizeText = FormatBytes(_store.GetCacheSizeBytes());
        DataFolderText = _store.Root;

        if (_lastIndexState is not null)
        {
            var active = _lastIndexState.BuildLeagues.FirstOrDefault(l =>
                string.Equals(l.Url, _settings.LeagueUrl, StringComparison.OrdinalIgnoreCase));
            if (active is not null)
            {
                SelectedLeagueName = active.Name;
            }
        }
    }

    private void SelectDepthPill(PillItem pill)
    {
        if (int.TryParse(pill.Key, out var depth))
        {
            _settings.SampleDepth = depth;
            _store.SaveSettings(_settings);
            RefreshSettingsSurface();
            StatusMessage = $"Sample depth set to {depth} builds per skill.";
        }
    }

    private void SelectGradingPill(PillItem pill)
    {
        _settings.GradeEverySkill = string.Equals(pill.Key, "full", StringComparison.Ordinal);
        _store.SaveSettings(_settings);
        RefreshSettingsSurface();
        StatusMessage = _settings.GradeEverySkill
            ? "Full grading: one request per skill, so each skill is ranked on its own top builds - the numbers the site shows."
            : "Quick grading: one request for the whole ladder. Fast, but the skills then share one page of builds and their DPS is not comparable to the site's.";
    }

    private void SelectPacingPill(PillItem pill)
    {
        if (!int.TryParse(pill.Key, out var seconds))
        {
            return;
        }

        _settings.PacingSeconds = seconds;
        _sync.Client.Pacer.Floor = TimeSpan.FromSeconds(seconds);
        _sync.Client.Pacer.Interval = TimeSpan.FromSeconds(seconds);
        _store.SaveSettings(_settings);
        RefreshSettingsSurface();
        StatusMessage = $"poe.ninja requests are now paced at one every {seconds}s.";
    }

    private void SelectPopularityPill(PillItem pill)
    {
        if (!double.TryParse(
                pill.Key,
                System.Globalization.NumberStyles.Float,
                System.Globalization.CultureInfo.InvariantCulture,
                out var popularity))
        {
            return;
        }

        _settings.MinPopularityPercent = popularity;
        _store.SaveSettings(_settings);
        RefreshSettingsSurface();
        Publish();
        StatusMessage = $"Popularity floor set to {DpsFormatter.Percent(popularity)}.";
    }

    partial void OnSelectedLeagueNameChanged(string value)
    {
        if (_lastIndexState is null || string.IsNullOrWhiteSpace(value))
        {
            return;
        }

        var league = _lastIndexState.BuildLeagues.FirstOrDefault(l =>
            string.Equals(l.Name, value, StringComparison.OrdinalIgnoreCase));
        if (league is null)
        {
            return;
        }

        _settings.LeagueUrl = league.Url;
        _store.SaveSettings(_settings);
        StatusMessage = $"League set to {league.Name} — press Sync to load its ladder.";
    }

    [RelayCommand]
    private async Task RefreshLeaguesAsync()
    {
        await RefreshLeaguesSilentlyAsync().ConfigureAwait(true);
        StatusMessage = LeagueNames.Count == 0
            ? "Could not read the league list."
            : $"{LeagueNames.Count} leagues available.";
    }

    [RelayCommand]
    private async Task ClearCacheAsync()
    {
        _store.ClearCache();
        CacheSizeText = FormatBytes(_store.GetCacheSizeBytes());
        StatusMessage = "Cached snapshots and diagnostics deleted.";
        await Task.CompletedTask.ConfigureAwait(true);
    }

    [RelayCommand]
    private async Task OpenDataFolderAsync()
    {
        try
        {
            await Launcher.Default.OpenAsync(new Uri(_store.Root)).ConfigureAwait(true);
        }
        catch (Exception)
        {
            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = _store.Root,
                    UseShellExecute = true,
                });
            }
            catch (Exception ex)
            {
                StatusMessage = "Could not open the data folder: " + ex.Message;
            }
        }
    }

    [RelayCommand]
    private void CopyDataPath()
    {
        _ = Clipboard.Default.SetTextAsync(_store.Root);
        StatusMessage = "Data folder path copied to the clipboard.";
    }

    [RelayCommand]
    private async Task ExportReportAsync()
    {
        try
        {
            var builder = new StringBuilder();
            builder.AppendLine("skill,cluster_size,combination,builds,sample_size,percent,avg_dps,top_build,top_build_class,grant_type,passives");

            foreach (var profile in _analysis.Profiles)
            {
                foreach (var combo in profile.Large.Concat(profile.Medium).Concat(profile.Small))
                {
                    builder.AppendLine(string.Join(',',
                        Csv(profile.Skill),
                        Csv(combo.Size.ToLabel()),
                        Csv(combo.Label),
                        combo.BuildCount.ToString(),
                        profile.SampledBuilds.ToString(),
                        combo.PercentOfBuilds.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture),
                        Math.Round(combo.AverageDps).ToString("0", System.Globalization.CultureInfo.InvariantCulture),
                        Csv(combo.TopBuildName),
                        Csv(combo.TopBuildClass),
                        Csv(combo.GrantType),
                        Csv(combo.PassivesLabel)));
                }
            }

            var path = Path.Combine(
                FileSystem.Current.AppDataDirectory,
                $"forever-exiled-clusters-{DateTime.Now:yyyyMMdd-HHmm}.csv");

            await File.WriteAllTextAsync(path, builder.ToString()).ConfigureAwait(true);
            StatusMessage = "Report exported to " + path;
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            StatusMessage = "Export failed: " + ex.Message;
        }
    }

    [RelayCommand]
    private async Task AnalyzeAllAsync()
    {
        if (IsBusy)
        {
            return;
        }

        if (_snapshot.IsSample)
        {
            StatusMessage = "The bundled sample snapshot is read-only — sync live data first.";
            return;
        }

        // a skill is only finished when every build it lists has been read - "has at least one
        // sample" is not the same thing, and saying so while a hero card reads "21 of 40" was a
        // contradiction on screen
        var profiles = _analysis.Profiles.ToList();
        var pending = profiles
            .Where(p => p.PendingBuilds > 0)
            .Select(p => p.Skill)
            .ToList();

        if (pending.Count == 0)
        {
            StatusMessage = profiles.Count == 0
                ? "Nothing tracked yet — press SYNC."
                : $"Every tracked skill is sampled to its top builds ({profiles.Count} skills).";
            return;
        }

        var outstanding = profiles.Sum(p => p.PendingBuilds);

        _cancellation = new CancellationTokenSource();
        var token = _cancellation.Token;
        BeginBusy("SAMPLING ALL SKILLS", $"{pending.Count} skills, {outstanding} builds outstanding");
        ClearError();

        var progress = new Progress<SyncProgress>(OnSyncProgress);

        try
        {
            _snapshot = await _sync
                .SampleManyAsync(_snapshot, pending, _settings.SampleDepth, progress, token)
                .ConfigureAwait(true);
            Publish();
            StatusMessage = $"Sampled {_analysis.Global.CharactersSampled} builds across {_analysis.Profiles.Count} skills.";
        }
        catch (OperationCanceledException)
        {
            StatusMessage = "Bulk sampling cancelled — progress so far is cached.";
            Publish();
        }
        catch (Exception ex) when (ex is PoeDataException or HttpRequestException or TaskCanceledException)
        {
            ReportError("Bulk sampling failed", ex);
        }
        finally
        {
            EndBusy();
            _cancellation?.Dispose();
            _cancellation = null;
        }
    }

    private static string Csv(string value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        var needsQuotes = value.Contains(',') || value.Contains('"') || value.Contains('\n');
        var escaped = value.Replace("\"", "\"\"");
        return needsQuotes ? "\"" + escaped + "\"" : escaped;
    }

    private static string FormatBytes(long bytes)
    {
        if (bytes <= 0)
        {
            return "0 KB";
        }

        if (bytes < 1024 * 1024)
        {
            return Math.Round(bytes / 1024d, 1) + " KB";
        }

        return Math.Round(bytes / (1024d * 1024d), 1) + " MB";
    }
}
