using System.Globalization;
using ForeverExiled.App.Theming;
using ForeverExiled.Core.Models;

namespace ForeverExiled.App.Converters;

/// <summary>Maps a 0-100 progress value onto a bar width in device-independent pixels.</summary>
public sealed class PercentWidthConverter : IValueConverter
{
    public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        var percent = ToDouble(value);
        var max = 160d;

        if (parameter is string text && double.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out var parsed))
        {
            max = parsed;
        }
        else if (parameter is double d)
        {
            max = d;
        }

        var width = Math.Clamp(percent, 0, 100) / 100d * max;
        return width < 3 ? 3d : Math.Round(width, 1);
    }

    public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture) =>
        throw new NotSupportedException();

    private static double ToDouble(object? value) => value switch
    {
        double d => d,
        float f => f,
        int i => i,
        long l => l,
        string s when double.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out var parsed) => parsed,
        _ => 0d,
    };
}

/// <summary>Cluster size enum to the bundled jewel artwork.</summary>
public sealed class ClusterSizeImageConverter : IValueConverter
{
    public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture) =>
        Palette.ImageForClusterSize(ToSize(value));

    public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture) =>
        throw new NotSupportedException();

    private static ClusterSize ToSize(object? value) => value switch
    {
        ClusterSize size => size,
        string text when Enum.TryParse<ClusterSize>(text, ignoreCase: true, out var parsed) => parsed,
        _ => ClusterSize.Unknown,
    };
}

/// <summary>Cluster size enum to its accent colour.</summary>
public sealed class ClusterSizeBrushConverter : IValueConverter
{
    public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture) =>
        new SolidColorBrush(Palette.ForClusterSize(value switch
        {
            ClusterSize size => size,
            string text when Enum.TryParse<ClusterSize>(text, ignoreCase: true, out var parsed) => parsed,
            _ => ClusterSize.Unknown,
        }));

    public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture) =>
        throw new NotSupportedException();
}

/// <summary>Damage type string to its accent brush.</summary>
public sealed class DamageTypeBrushConverter : IValueConverter
{
    public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture) =>
        new SolidColorBrush(Palette.ForDamageType(value as string));

    public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture) =>
        throw new NotSupportedException();
}

public sealed class InverseBoolConverter : IValueConverter
{
    public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture) =>
        value is bool flag ? !flag : true;

    public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture) =>
        value is bool flag ? !flag : true;
}

/// <summary>True when the bound string has content (for conditional labels).</summary>
public sealed class HasTextConverter : IValueConverter
{
    public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture) =>
        !string.IsNullOrWhiteSpace(value as string);

    public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture) =>
        throw new NotSupportedException();
}
