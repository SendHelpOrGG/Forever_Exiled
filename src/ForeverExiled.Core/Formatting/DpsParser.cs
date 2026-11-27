using System.Globalization;

namespace ForeverExiled.Core.Formatting;

/// <summary>
/// poe.ninja sends DPS either as a plain number or as a pre-formatted string such as
/// <c>425.0M</c> / <c>1.2B</c>. Both forms are normalised to a raw double here.
/// </summary>
public static class DpsParser
{
    private static readonly char[] TrimChars = { ' ', '\t', '\u00A0', ',' };

    public static double Parse(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return 0;
        }

        var value = text.Trim().Trim(TrimChars);
        if (value.Length == 0)
        {
            return 0;
        }

        // Strip trailing unit words that are not multipliers.
        value = value.Replace(" DPS", string.Empty, StringComparison.OrdinalIgnoreCase)
                     .Replace("dps", string.Empty, StringComparison.OrdinalIgnoreCase)
                     .Trim();

        var multiplier = 1d;
        var last = value[^1];
        switch (last)
        {
            case 'k':
            case 'K':
                multiplier = 1_000d;
                value = value[..^1];
                break;
            case 'm':
            case 'M':
                multiplier = 1_000_000d;
                value = value[..^1];
                break;
            case 'b':
            case 'B':
            case 'g':
            case 'G':
                multiplier = 1_000_000_000d;
                value = value[..^1];
                break;
        }

        value = value.Replace(",", string.Empty).Trim();

        return double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out var number)
            ? number * multiplier
            : 0;
    }
}

/// <summary>Compact, human-readable formatting used across the UI.</summary>
public static class DpsFormatter
{
    public static string Format(double dps)
    {
        if (dps <= 0)
        {
            return "–";
        }

        return dps switch
        {
            >= 1_000_000_000d => Trim(dps / 1_000_000_000d) + "B",
            >= 1_000_000d => Trim(dps / 1_000_000d) + "M",
            >= 1_000d => Trim(dps / 1_000d) + "K",
            _ => dps.ToString("0", CultureInfo.InvariantCulture),
        };
    }

    public static string FormatWithUnit(double dps) => dps <= 0 ? "–" : Format(dps) + " DPS";

    public static string Percent(double value, int decimals = 1)
    {
        if (double.IsNaN(value) || double.IsInfinity(value))
        {
            return "–";
        }

        return value.ToString(decimals <= 0 ? "0" : "0." + new string('#', decimals), CultureInfo.InvariantCulture) + "%";
    }

    public static string Count(int value) => value.ToString("N0", CultureInfo.InvariantCulture);

    private static string Trim(double value)
    {
        var text = value >= 100 ? value.ToString("0", CultureInfo.InvariantCulture)
            : value >= 10 ? value.ToString("0.0", CultureInfo.InvariantCulture)
            : value.ToString("0.00", CultureInfo.InvariantCulture);
        return text;
    }
}
