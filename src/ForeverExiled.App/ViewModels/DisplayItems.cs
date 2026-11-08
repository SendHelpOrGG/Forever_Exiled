using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using ForeverExiled.App.Theming;
using ForeverExiled.Core.Analysis;
using ForeverExiled.Core.Formatting;
using ForeverExiled.Core.Models;
using ForeverExiled.Core.Net;

namespace ForeverExiled.App.ViewModels;

public enum AppTab
{
    Meta,
    Clusters,
    Ladder,
    Settings,
}

/// <summary>A left-rail navigation tile.</summary>
public sealed partial class NavItem : ObservableObject
{
    public NavItem(string glyph, string image, string caption, AppTab tab, Action<AppTab> onSelected)
    {
        Glyph = glyph;
        Image = image;
        Caption = caption;
        Tab = tab;
        Command = new RelayCommand(() => onSelected(tab));
    }

    public string Glyph { get; }

    public string Image { get; }

    public bool HasImage => Image.Length > 0;

    public bool HasGlyph => Glyph.Length > 0;

    public string Caption { get; }

    public AppTab Tab { get; }

    public RelayCommand Command { get; }

    [ObservableProperty]
    private bool _isSelected;
}

/// <summary>Generic segmented-control pill (cluster size, sort mode, sample depth...).</summary>
public sealed partial class PillItem : ObservableObject
{
    public PillItem(string key, string label, string countText, Action<PillItem> onSelected)
    {
        Key = key;
        Label = label;
        _countText = countText;
        Command = new RelayCommand(() => onSelected(this));
        // only the cluster-size pills carry item art
        SizeImage = Enum.TryParse<ClusterSize>(key, ignoreCase: true, out var size)
            ? Palette.ImageForClusterSize(size)
            : string.Empty;
    }

    public string Key { get; }

    public string SizeImage { get; }

    public bool HasSizeImage => SizeImage.Length > 0;

    public string Label { get; }

    [ObservableProperty]
    [NotifyPropertyChangedFor(nameof(HasCount))]
    private string _countText = string.Empty;

    public bool HasCount => CountText.Length > 0;

    public RelayCommand Command { get; }

    [ObservableProperty]
    private bool _isSelected;
}

public sealed class ChipItem
{
    public ChipItem(string label) => Label = label;

    public string Label { get; }
}

/// <summary>
/// A mod tag as a coloured chip. The hue comes from Theming/TagColors (generated from the
/// same palette the preview uses), so fire is orange, cold is blue, life is red and the
/// chips say at a glance which families a combination lives in.
/// </summary>
public sealed class TagChipItem
{
    public TagChipItem(string tag)
    {
        Tag = tag;
        Label = tag.Replace('_', ' ');
        TextColor = TagColors.TextColorFor(tag);
        TintColor = TagColors.TintColorFor(tag);
        BorderColor = TagColors.BorderColorFor(tag);
    }

    public string Tag { get; }

    public string Label { get; }

    public Color TextColor { get; }

    public Color TintColor { get; }

    public Color BorderColor { get; }

    /// <summary>The union of the notables' tags, in the order they first appear.</summary>
    public static IReadOnlyList<TagChipItem> ForNotables(IEnumerable<string> notables)
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var chips = new List<TagChipItem>();

        foreach (var notable in notables)
        {
            foreach (var tag in NotableWeights.TagsFor(notable))
            {
                if (seen.Add(tag))
                {
                    chips.Add(new TagChipItem(tag));
                }
            }
        }

        return chips;
    }
}

/// <summary>One row of the main-skill rail.</summary>
public sealed partial class SkillCardItem : ObservableObject
{
    public SkillCardItem(
        SkillStat stat,
        int rank,
        SkillClusterProfile? profile,
        double maxPeakDps,
        Action<SkillCardItem> onSelected)
    {
        Stat = stat;
        Rank = rank;
        Profile = profile;
        Command = new RelayCommand(() => onSelected(this));

        AccentColor = Palette.ForDamageType(stat.DamageType);
        DpsBarPercent = maxPeakDps > 0 ? stat.PeakDps * 100d / maxPeakDps : 0;

        if (stat.TopClass.Length > 0)
        {
            var share = stat.TopClassPercent > 0.5 ? " · " + DpsFormatter.Percent(stat.TopClassPercent, 0) : string.Empty;
            ClassText = stat.TopClass + share;
        }
        else
        {
            ClassText = "–";
        }

        ClassImage = Palette.ImageForAscendancy(stat.TopClass);
        GemImage = GemArt.ImageFor(stat.Name);
    }

    public SkillStat Stat { get; }

    public SkillClusterProfile? Profile { get; }

    public int Rank { get; }

    public RelayCommand Command { get; }

    public string Name => Stat.Name;

    public string RankText => Rank.ToString("00");

    /// <summary>
    /// The best build's DPS, which is the number the site's DPS column shows and the one
    /// "by DPS" orders by. An average over a page of builds is not comparable to it.
    /// </summary>
    public string DpsText => DpsFormatter.Format(Stat.PeakDps);

    /// <summary>The same page of builds averaged - a fairer idea of what the skill usually does.</summary>
    public string AverageDpsText => DpsFormatter.Format(Stat.AverageDps);

    public bool HasAverage => Stat.AverageDps > 0;

    public string DpsCaption => Stat.TopBuilds.Count == 0
        ? "not graded"
        : Stat.HasBorrowedDps
            ? "peak DPS · borrowed from " + Stat.DpsFromSkill
            : "peak DPS";

    public string PopText => DpsFormatter.Percent(Stat.PopularityPercent);

    public string BuildsText => DpsFormatter.Count(Stat.BuildCount) + " builds";

    public string ClassText { get; }

    public string ClassImage { get; }

    public bool HasClassImage => ClassImage.Length > 0;

    public string GemImage { get; }

    public bool HasGemImage => GemImage.Length > 0;

    public string DamageType => Stat.DamageType;

    public double Popularity => Stat.PopularityPercent;

    public double DpsBarPercent { get; }

    public Color AccentColor { get; }

    public bool HasClusterData => Profile is { SampledBuilds: > 0 };

    public string SampleBadge => Profile is { SampledBuilds: > 0 } profile
        ? profile.SampledBuilds + " sampled"
        : string.Empty;

    [ObservableProperty]
    private bool _isSelected;
}

/// <summary>A ranked cluster-jewel combination card.</summary>
public sealed partial class ComboItem : ObservableObject
{
    public ComboItem(ClusterCombo combo, int rank, int sampleSize, int maxBuildCount, bool showSkills, Action<ComboItem>? onSelected = null)
    {
        Combo = combo;
        Rank = rank;
        RankText = rank.ToString("00");
        Label = combo.Label;
        PercentText = DpsFormatter.Percent(combo.PercentOfBuilds);
        PercentCaption = sampleSize > 0 ? "of " + sampleSize + " sampled builds" : "of sampled builds";
        BuildsText = combo.BuildCount + (combo.BuildCount == 1 ? " build" : " builds");
        AverageDpsText = DpsFormatter.FormatWithUnit(combo.AverageDps);
        PeakDpsText = DpsFormatter.Format(combo.PeakDps);
        GrantText = combo.GrantType;
        PassivesText = combo.PassivesLabel;
        EffectText = combo.EffectPercent > 0 ? combo.EffectPercent + "% effect" : string.Empty;
        HasEffect = combo.EffectPercent > 0;
        TopBuildText = combo.TopBuildName;
        TopBuildClassText = combo.TopBuildClass;
        TopBuildClassImage = Palette.ImageForAscendancy(combo.TopBuildClass);
        SkillsText = showSkills ? string.Join("  ·  ", combo.Skills) : string.Empty;
        ShowSkills = showSkills && combo.Skills.Count > 0;
        BarPercent = maxBuildCount > 0 ? combo.BuildCount * 100d / maxBuildCount : 0;
        AccentColor = Palette.ForClusterSize(combo.Size);
        SizeImage = Palette.ImageForClusterSize(combo.Size);
        SizeLabel = combo.Size.ToLabel();
        IsLeader = rank == 1;
        _comboForCard = combo;

        Chips = combo.Notables.Count > 0
            ? combo.Notables.Select(n => new ChipItem(n)).ToList()
            : new List<ChipItem> { new(combo.Label) };

        Tags = TagChipItem.ForNotables(combo.Notables);

        Command = new RelayCommand(() => onSelected?.Invoke(this));
    }

    public ClusterCombo Combo { get; }

    public int Rank { get; }

    public string RankText { get; }

    public string Label { get; }

    public string PercentText { get; }

    public string PercentCaption { get; }

    public string BuildsText { get; }

    public string AverageDpsText { get; }

    public string PeakDpsText { get; }

    public string GrantText { get; }

    public bool HasGrant => GrantText.Length > 0;

    public string PassivesText { get; }

    public string EffectText { get; }

    public bool HasEffect { get; }

    public string TopBuildText { get; }

    public bool HasTopBuild => TopBuildText.Length > 0;

    public string TopBuildClassText { get; }

    public string TopBuildClassImage { get; }

    public bool HasTopBuildClassImage => TopBuildClassImage.Length > 0;

    public string SkillsText { get; }

    public bool ShowSkills { get; }

    public double BarPercent { get; }

    public Color AccentColor { get; }

    public string SizeImage { get; }

    public string SizeLabel { get; }

    public bool IsLeader { get; }

    public RelayCommand Command { get; }

    /// <summary>The mod tags the combination's notables are gated by, coloured.</summary>
    public IReadOnlyList<TagChipItem> Tags { get; }

    public bool HasTags => Tags.Count > 0;

    /// <summary>The combination the crafting card is currently priced for.</summary>
    [ObservableProperty]
    private bool _isCrafted;

    private readonly ClusterCombo _comboForCard;
    private JewelCard? _itemCard;

    /// <summary>
    /// The jewel as poe.ninja prints it on hover - name over base type in the gold band, then
    /// the mods as coloured lines. Built on first hover: a list rebuild creates a dozen of
    /// these rows, and none of them needs a card until one is actually pointed at.
    /// </summary>
    public JewelCard ItemCard => _itemCard ??= JewelCard.For(_comboForCard);

    public List<ChipItem> Chips { get; }
}

/// <summary>A build row (ladder table / highest DPS lists).</summary>
public sealed class BuildItem
{
    private const string PoeNinjaRoot = "https://poe.ninja/";

    public BuildItem(BuildRef build, int rank, string leagueSlug = "")
    {
        RankValue = rank;
        DpsValue = build.Dps;
        ClusterValue = build.ClusterJewelCount;
        RankText = rank.ToString("00");
        Name = build.Name.Length > 0 ? build.Name : build.Account;
        ClassText = build.ClassName.Length > 0 ? build.ClassName : "–";
        ClassImage = Palette.ImageForAscendancy(build.ClassName);
        GemImage = GemArt.ImageFor(build.MainSkill);
        SkillText = build.MainSkill.Length > 0 ? build.MainSkill : "–";
        DpsText = DpsFormatter.Format(build.Dps);
        LevelText = build.Level > 0 ? build.Level.ToString() : "–";
        ClusterText = build.ClusterJewelCount > 0 ? build.ClusterJewelCount.ToString() : "–";
        SourceText = build.Sampled ? "sampled" : "top-DPS pick";
        IsSampled = build.Sampled;
        AccentColor = Palette.ForDamageType(DamageTypes.Classify(build.MainSkill));

        // the same page the site's own table links each row to
        PageUrl = build.Account.Length > 0 && build.Name.Length > 0 && leagueSlug.Length > 0
            ? PoeNinjaRoot + CharacterPageScraper.PagePath(leagueSlug, build.Account, build.Name)
            : string.Empty;

        OpenPageCommand = new AsyncRelayCommand(OpenPageAsync);
    }

    public string RankText { get; }

    public string Name { get; }

    public string ClassText { get; }

    public string ClassImage { get; }

    public bool HasClassImage => ClassImage.Length > 0;

    public string GemImage { get; }

    public bool HasGemImage => GemImage.Length > 0;

    public string SkillText { get; }

    public string DpsText { get; }

    public string LevelText { get; }

    public string ClusterText { get; }

    /// <summary>The ladder position, so a column sort can still show where a build really ranks.</summary>
    public int RankValue { get; }

    public double DpsValue { get; }

    public int ClusterValue { get; }

    /// <summary>"sampled" once the character sheet was read, else "top-DPS pick".</summary>
    public string SourceText { get; }

    public bool IsSampled { get; }

    public Color AccentColor { get; }

    /// <summary>This character's page on poe.ninja, empty when the row carries no account.</summary>
    public string PageUrl { get; }

    public bool HasPage => PageUrl.Length > 0;

    public IAsyncRelayCommand OpenPageCommand { get; }

    private async Task OpenPageAsync()
    {
        if (PageUrl.Length == 0)
        {
            return;
        }

        try
        {
            await Launcher.Default.OpenAsync(new Uri(PageUrl)).ConfigureAwait(true);
        }
        catch (Exception)
        {
            // no browser, no handler, or the shell refused: the row is still readable, and a
            // failing link must never take the view down with it
        }
    }
}

/// <summary>A headline metric tile.</summary>
public sealed class StatCardItem
{
    public StatCardItem(string glyph, string caption, string value, string hint, Color accent, string image = "")
    {
        Glyph = glyph;
        Caption = caption;
        Value = value;
        Hint = hint;
        AccentColor = accent;
        Image = image;
    }

    public string Glyph { get; }

    public string Image { get; }

    public bool HasImage => Image.Length > 0;

    public string Caption { get; }

    public string Value { get; }

    public string Hint { get; }

    public bool HasHint => Hint.Length > 0;

    public Color AccentColor { get; }
}

/// <summary>A compact ranked row (meta leaders, notable frequency).</summary>
public sealed class LeaderItem
{
    public LeaderItem(string rankText, string name, string primaryText, string secondaryText, double barPercent, Color accent, string image)
    {
        RankText = rankText;
        Name = name;
        PrimaryText = primaryText;
        SecondaryText = secondaryText;
        BarPercent = barPercent;
        AccentColor = accent;
        Image = image;
        HasImage = image.Length > 0;
    }

    public string RankText { get; }

    public string Name { get; }

    public string PrimaryText { get; }

    public string SecondaryText { get; }

    public double BarPercent { get; }

    public Color AccentColor { get; }

    public string Image { get; }

    public bool HasImage { get; }
}
