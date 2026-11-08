namespace ForeverExiled.App.ViewModels;

/// <summary>Ladder: every sampled (or ladder-listed) build with its cluster count.</summary>
public partial class MainViewModel
{
    private void RebuildLadderView()
    {
        // a fresh list every time, so the view sees one change instead of a clear plus N adds
        var rank = 1;
        _allLadderItems = _analysis.Ladder
            .Select(build => new BuildItem(build, rank++, _snapshot.LeagueUrl))
            .ToList();

        ApplyLadderFilter();
    }

    private void ApplyLadderFilter()
    {
        var query = (LadderFilter ?? string.Empty).Trim();

        var visible = query.Length == 0
            ? _allLadderItems
            : _allLadderItems.Where(item =>
                item.Name.Contains(query, StringComparison.OrdinalIgnoreCase) ||
                item.ClassText.Contains(query, StringComparison.OrdinalIgnoreCase) ||
                item.SkillText.Contains(query, StringComparison.OrdinalIgnoreCase)).ToList();

        LadderItems = visible;

        var sampled = _allLadderItems.Count(item => item.IsSampled);

        LadderSummary = _allLadderItems.Count == 0
            ? "No builds yet — press SYNC"
            : query.Length == 0
                ? $"{_allLadderItems.Count} builds in use · {sampled} sampled"
                : $"{visible.Count} of {_allLadderItems.Count} builds · {sampled} sampled";
    }

    partial void OnLadderFilterChanged(string value) => ApplyLadderFilter();
}
