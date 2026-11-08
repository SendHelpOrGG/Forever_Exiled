namespace ForeverExiled.App.ViewModels;

/// <summary>Ladder: every sampled (or ladder-listed) build with its cluster count.</summary>
public partial class MainViewModel
{
    private void RebuildLadderView()
    {
        _allLadderItems.Clear();

        var rank = 1;
        foreach (var build in _analysis.Ladder)
        {
            _allLadderItems.Add(new BuildItem(build, rank++));
        }

        ApplyLadderFilter();
    }

    private void ApplyLadderFilter()
    {
        var query = (LadderFilter ?? string.Empty).Trim();

        LadderItems.Clear();
        foreach (var item in _allLadderItems)
        {
            if (query.Length > 0 &&
                !item.Name.Contains(query, StringComparison.OrdinalIgnoreCase) &&
                !item.ClassText.Contains(query, StringComparison.OrdinalIgnoreCase) &&
                !item.SkillText.Contains(query, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            LadderItems.Add(item);
        }

        var sampled = _allLadderItems.Count(item => item.IsSampled);

        LadderSummary = _allLadderItems.Count == 0
            ? "No builds yet — press SYNC"
            : query.Length == 0
                ? $"{_allLadderItems.Count} builds in use · {sampled} sampled"
                : $"{LadderItems.Count} of {_allLadderItems.Count} builds · {sampled} sampled";
    }

    partial void OnLadderFilterChanged(string value) => ApplyLadderFilter();
}
