using ForeverExiled.App.Theming;
using ForeverExiled.Core.Models;

namespace ForeverExiled.App.ViewModels;

/// <summary>The colour a line of the item card is printed in.</summary>
public enum JewelLineKind
{
    /// <summary>Item level and other neutral properties: dim grey.</summary>
    Property,

    /// <summary>A modifier: the game's magic blue.</summary>
    Modifier,

    /// <summary>A notable's name: gold.</summary>
    Notable,

    /// <summary>A line that is present but secondary, such as a notable's reminder.</summary>
    Faint,

    /// <summary>"Fractured Item".</summary>
    Fractured,

    /// <summary>"Corrupted".</summary>
    Corrupt,

    /// <summary>A row of coloured mod-tag chips.</summary>
    Tags,
}

/// <summary>One printed line of the cluster jewel card.</summary>
public sealed class JewelLine
{
    private JewelLine(string text, JewelLineKind kind, bool divider, IReadOnlyList<TagChipItem>? chips = null)
    {
        Text = text;
        Kind = kind;
        ShowDivider = divider;
        Chips = chips ?? Array.Empty<TagChipItem>();
    }

    public string Text { get; }

    public JewelLineKind Kind { get; }

    /// <summary>True for the hairline the card draws above this line, false for the line itself.</summary>
    public bool ShowDivider { get; }

    public bool IsLine => !ShowDivider && !IsTags;

    /// <summary>The mod tags this line prints as coloured chips, empty for a plain line.</summary>
    public IReadOnlyList<TagChipItem> Chips { get; }

    public bool IsTags => Chips.Count > 0;

    public static JewelLine Line(string text, JewelLineKind kind = JewelLineKind.Modifier) =>
        new(text, kind, false);

    public static JewelLine Separator() => new(string.Empty, JewelLineKind.Property, true);

    /// <summary>A row of chips for the mod tags a notable is gated by.</summary>
    public static JewelLine TagRow(IReadOnlyList<TagChipItem> chips) =>
        new(string.Empty, JewelLineKind.Tags, false, chips);

    /// <summary>Magic blue, the game's colour for modifiers.</summary>
    public Color Color => Kind switch
    {
        JewelLineKind.Notable => Color.FromArgb("#C9A24C"),
        JewelLineKind.Property => Color.FromArgb("#8F8B80"),
        JewelLineKind.Faint => Color.FromArgb("#6F7A86"),
        JewelLineKind.Fractured => Color.FromArgb("#A29162"),
        JewelLineKind.Corrupt => Color.FromArgb("#D20000"),
        _ => Color.FromArgb("#8888FF"),
    };

    public double FontSize => Kind is JewelLineKind.Faint ? 14 : 15;

    public FontAttributes Attributes =>
        Kind is JewelLineKind.Faint ? FontAttributes.Italic : FontAttributes.None;
}

/// <summary>
/// The cluster jewel as poe.ninja prints it on hover: a gold band with the name over the base
/// type, then centred blocks of properties, notables and the flavour line, closed by the jewel's
/// own art. Deliberately carries no analysis - weights, tags and pool odds belong to the
/// crafting surface, not to the item.
/// </summary>
public sealed class JewelCard
{
    private JewelCard()
    {
    }

    public string Name { get; private init; } = string.Empty;

    public string BaseType { get; private init; } = string.Empty;

    public bool HasName => Name.Length > 0;

    public Color NameColor { get; private init; } = Color.FromArgb("#8888FF");

    /// <summary>The jewel's own art, drawn in the header and again at the foot of the card.</summary>
    public string IconSource { get; private init; } = string.Empty;

    public bool HasIcon => IconSource.Length > 0;

    public IReadOnlyList<JewelLine> Lines { get; private init; } = Array.Empty<JewelLine>();

    public static JewelCard For(ClusterCombo combo)
    {
        ArgumentNullException.ThrowIfNull(combo);

        var item = combo.Representative;
        var baseType = item?.BaseType is { Length: > 0 } known ? known : combo.Size.ToBaseType();
        var name = item?.ItemName ?? string.Empty;

        var blocks = new List<IReadOnlyList<JewelLine>>();

        void AddBlock(List<JewelLine> lines)
        {
            if (lines.Count > 0)
            {
                blocks.Add(lines);
            }
        }

        static JewelLine Mod(string text) => JewelLine.Line(text);
        static JewelLine Gold(string text) => JewelLine.Line(text, JewelLineKind.Notable);
        static JewelLine Dim(string text) => JewelLine.Line(text, JewelLineKind.Property);

        var properties = new List<JewelLine>();
        if (item?.ItemLevel is int itemLevel and > 0)
        {
            properties.Add(Dim($"Item Level: {itemLevel}"));
        }

        AddBlock(properties);

        var baseLines = new List<JewelLine>();
        if (item?.Passives is int passives and > 0)
        {
            baseLines.Add(Mod($"Adds {passives} Passive Skill{(passives == 1 ? string.Empty : "s")}"));
        }

        if (item is { JewelSockets: > 0 } sockets)
        {
            baseLines.Add(Mod(sockets.JewelSockets == 1
                ? "1 Added Passive Skill is a Jewel Socket"
                : $"{sockets.JewelSockets} Added Passive Skills are Jewel Sockets"));
        }

        if (combo.GrantType.Length > 0)
        {
            baseLines.Add(Mod($"Added Small Passive Skills grant: {combo.GrantType}"));
        }

        if (combo.EffectPercent > 0)
        {
            baseLines.Add(Mod($"Added Small Passive Skills have {combo.EffectPercent}% increased Effect"));
        }

        AddBlock(baseLines);

        var affixes = new List<JewelLine>();
        for (var i = 0; i < combo.Notables.Count; i++)
        {
            affixes.Add(Gold($"1 Added Passive Skill is {combo.Notables[i]}"));

            // the crafted "also grant" line follows the first notable, as the game orders it
            if (i == 0 && item is not null)
            {
                foreach (var small in item.SmallGrants)
                {
                    affixes.Add(Mod(small));
                }
            }
        }

        AddBlock(affixes);

        var details = new List<JewelLine>();
        foreach (var notable in combo.Notables)
        {
            var stats = NotableText.StatsFor(notable);
            var reminders = NotableText.RemindersFor(notable);
            var tags = TagChipItem.ForNotables(new[] { notable });
            if (stats.Count == 0 && reminders.Count == 0 && tags.Count == 0)
            {
                continue;
            }

            details.Add(Gold(notable));
            details.AddRange(stats.Select(Mod));
            details.AddRange(reminders.Select(reminder => JewelLine.Line(reminder, JewelLineKind.Faint)));

            // the mod tags the game gates this notable with
            if (tags.Count > 0)
            {
                details.Add(JewelLine.TagRow(tags));
            }
        }

        AddBlock(details);

        var flags = new List<JewelLine>();
        if (item is { Fractured: true })
        {
            flags.Add(JewelLine.Line("Fractured Item", JewelLineKind.Fractured));
        }

        if (item is { Corrupted: true })
        {
            flags.Add(JewelLine.Line("Corrupted", JewelLineKind.Corrupt));
        }

        AddBlock(flags);

        var lines = new List<JewelLine>();
        foreach (var block in blocks)
        {
            if (lines.Count > 0)
            {
                lines.Add(JewelLine.Separator());
            }

            lines.AddRange(block);
        }

        return new JewelCard
        {
            Name = name,
            BaseType = baseType,
            NameColor = Color.FromArgb(RarityColor(item?.Rarity, name)),
            IconSource = Palette.ImageForClusterSize(combo.Size),
            Lines = lines,
        };
    }

    private static string RarityColor(string? rarity, string name)
    {
        var key = rarity is { Length: > 0 } ? rarity : name.Length > 0 ? "rare" : "magic";
        return key.ToLowerInvariant() switch
        {
            "normal" => "#C8C8C8",
            "rare" => "#FFFF77",
            "unique" => "#AF6025",
            _ => "#8888FF",
        };
    }
}
