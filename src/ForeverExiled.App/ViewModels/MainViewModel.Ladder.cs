using CommunityToolkit.Mvvm.Input;

namespace ForeverExiled.App.ViewModels;

/// <summary>Ladder: every sampled (or ladder-listed) build with its cluster count.</summary>
public partial class MainViewModel
{
    private string _ladderSortKey = "Rank";
    private bool _ladderSortDescending;

    /// <summary>
    /// Sorting by a column, as the site's table does. Clicking the active column flips the
    /// direction; a caret shows which column is in force and which way it runs.
    /// </summary>
    [RelayCommand]
    private void SortLadder(string? key)
    {
        if (string.IsNullOrEmpty(key))
        {
            return;
        }

        if (string.Equals(_ladderSortKey, key, StringComparison.Ordinal))
        {
            _ladderSortDescending = !_ladderSortDescending;
        }
        else
        {
            _ladderSortKey = key;

            // numbers read best biggest-first, names best A-Z
            _ladderSortDescending = key is "Dps" or "Cluster" or "Rank";
        }

        RaiseSortGlyphs();
        ApplyLadderFilter();
    }

    public string RankSortGlyph => GlyphFor("Rank");

    public string NameSortGlyph => GlyphFor("Name");

    public string ClassSortGlyph => GlyphFor("Class");

    public string SkillSortGlyph => GlyphFor("Skill");

    public string DpsSortGlyph => GlyphFor("Dps");

    public string ClusterSortGlyph => GlyphFor("Cluster");

    private string GlyphFor(string key) =>
        string.Equals(_ladderSortKey, key, StringComparison.Ordinal)
            ? _ladderSortDescending ? "▼" : "▲"
            : string.Empty;

    private void RaiseSortGlyphs()
    {
        OnPropertyChanged(nameof(RankSortGlyph));
        OnPropertyChanged(nameof(NameSortGlyph));
        OnPropertyChanged(nameof(ClassSortGlyph));
        OnPropertyChanged(nameof(SkillSortGlyph));
        OnPropertyChanged(nameof(DpsSortGlyph));
        OnPropertyChanged(nameof(ClusterSortGlyph));
    }

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

        LadderItems = OrderByColumn(visible);

        if (visible.Count == 0)
        {
            LadderSummary = _allLadderItems.Count == 0
                ? "No builds yet — press SYNC"
                : "No builds match that filter";
            return;
        }

        var sampled = _allLadderItems.Count(item => item.IsSampled);
        var sorted = _ladderSortKey == "Rank" && !_ladderSortDescending
            ? string.Empty
            : " · by " + _ladderSortKey.ToLowerInvariant() + (_ladderSortDescending ? " ↓" : " ↑");

        LadderSummary = query.Length == 0
            ? $"{_allLadderItems.Count} builds in use · {sampled} sampled{sorted}"
            : $"{visible.Count} of {_allLadderItems.Count} builds · {sampled} sampled{sorted}";
    }

    private List<BuildItem> OrderByColumn(List<BuildItem> rows)
    {
        // the ladder's own order, untouched: rank ascending is what the numbers already are
        if (_ladderSortKey == "Rank" && !_ladderSortDescending)
        {
            return rows;
        }

        return _ladderSortKey switch
        {
            "Dps" => _ladderSortDescending
                ? rows.OrderByDescending(item => item.DpsValue).ToList()
                : rows.OrderBy(item => item.DpsValue).ToList(),
            "Cluster" => _ladderSortDescending
                ? rows.OrderByDescending(item => item.ClusterValue).ToList()
                : rows.OrderBy(item => item.ClusterValue).ToList(),
            "Rank" => rows.OrderBy(item => item.RankValue).ToList(),
            "Name" => rows.OrderBy(item => item.Name, StringComparer.OrdinalIgnoreCase).ToList(),
            "Class" => rows.OrderBy(item => item.ClassText, StringComparer.OrdinalIgnoreCase).ToList(),
            "Skill" => rows.OrderBy(item => item.SkillText, StringComparer.OrdinalIgnoreCase).ToList(),
            _ => rows,
        };
    }

    partial void OnLadderFilterChanged(string value) => ApplyLadderFilter();
}
