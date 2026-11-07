using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using ForeverExiled.App.Theming;
using ForeverExiled.Core.Analysis;
using ForeverExiled.Core.Formatting;
using ForeverExiled.Core.Models;

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

/// <summary>One row of the main-skill rail.</summary>
public sealed partial class SkillCardItem : ObservableObject
{
    public SkillCardItem(
        SkillStat stat,
        int rank,
        SkillClusterProfile? profile,
        double maxAverageDps,
        Action<SkillCardItem> onSelected)
    {
        Stat = stat;
        Rank = rank;
        Profile = profile;
        Command = new RelayCommand(() => onSelected(this));

        AccentColor = Palette.ForDamageType(stat.DamageType);
        DpsBarPercent = maxAverageDps > 0 ? stat.AverageDps * 100d / maxAverageDps : 0;

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

    public string DpsText => DpsFormatter.Format(Stat.AverageDps);

    public string DpsCaption => "avg DPS";

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
public sealed class ComboItem
{
    public ComboItem(ClusterCombo combo, int rank, int sampleSize, int maxBuildCount, bool showSkills)
    {
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
        ItemTipText = BuildItemTip(combo);

        Chips = combo.Notables.Count > 0
            ? combo.Notables.Select(n => new ChipItem(n)).ToList()
            : new List<ChipItem> { new(combo.Label) };
    }

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

    /// <summary>
    /// The item card for the hover tooltip: the jewel as the game/site presents it
    /// (name, base type, passives, mods, item level, flags) plus the analysis figures.
    /// </summary>
    public string ItemTipText { get; }

    private static string BuildItemTip(ClusterCombo combo)
    {
        var item = combo.Representative;
        var lines = new List<string>();

        if (item is { ItemName.Length: > 0 })
        {
            lines.Add(item.ItemName);
        }

        lines.Add(item?.BaseType is { Length: > 0 } baseType ? baseType : combo.Size.ToBaseType());
        lines.Add("------------------------------");

        var props = new List<string>();
        if (item?.Passives is int passives)
        {
            props.Add("Adds " + passives + (passives == 1 ? " Passive Skill" : " Passive Skills"));
        }

        if (item is { JewelSockets: > 0 })
        {
            props.Add(item.JewelSockets == 1
                ? "1 Added Passive Skill is a Jewel Socket"
                : item.JewelSockets + " Added Passive Skills are Jewel Sockets");
        }

        if (props.Count > 0)
        {
            lines.AddRange(props);
            lines.Add("------------------------------");
        }

        var mods = new List<string>();
        if (combo.GrantType.Length > 0)
        {
            mods.Add("Added Small Passive Skills grant: " + combo.GrantType);
        }

        if (combo.EffectPercent > 0)
        {
            mods.Add("Added Small Passive Skills have " + combo.EffectPercent + "% increased Effect");
        }

        foreach (var notable in combo.Notables)
        {
            mods.Add("1 Added Passive Skill is " + notable);
            foreach (var stat in NotableText.StatsFor(notable))
            {
                mods.Add("    " + stat);
            }

            foreach (var reminder in NotableText.RemindersFor(notable))
            {
                mods.Add("    " + reminder);
            }
        }

        if (mods.Count > 0)
        {
            lines.AddRange(mods);
            lines.Add("------------------------------");
        }

        if (item is { ItemLevel: > 0 })
        {
            lines.Add("Item Level: " + item.ItemLevel);
        }

        var flags = new List<string>();
        if (item is { Fractured: true })
        {
            flags.Add("Fractured Item");
        }

        if (item is { Corrupted: true })
        {
            flags.Add("Corrupted");
        }

        if (flags.Count > 0)
        {
            lines.AddRange(flags);
        }

        return string.Join(Environment.NewLine, lines);
    }

    public List<ChipItem> Chips { get; }
}

/// <summary>A build row (ladder table / highest DPS lists).</summary>
public sealed class BuildItem
{
    public BuildItem(BuildRef build, int rank)
    {
        RankText = rank.ToString("00");
        Name = build.Name.Length > 0 ? build.Name : build.Account;
        ClassText = build.ClassName.Length > 0 ? build.ClassName : "–";
        ClassImage = Palette.ImageForAscendancy(build.ClassName);
        GemImage = GemArt.ImageFor(build.MainSkill);
        SkillText = build.MainSkill.Length > 0 ? build.MainSkill : "–";
        DpsText = DpsFormatter.Format(build.Dps);
        LevelText = build.Level > 0 ? build.Level.ToString() : "–";
        ClusterText = build.ClusterJewelCount > 0 ? build.ClusterJewelCount.ToString() : "–";
        AccentColor = Palette.ForDamageType(DamageTypes.Classify(build.MainSkill));
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

    public Color AccentColor { get; }
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
