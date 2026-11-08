namespace ForeverExiled.App.Views;

/// <summary>
/// Where the hover card goes. The site drops it just below and right of the pointer, and pulls
/// it back inside the window when that would overhang.
/// </summary>
internal static class ItemCardPlacement
{
    public static double Place(double pointer, double offset, double extent, double cardSize)
    {
        var wanted = pointer + offset;
        if (extent <= cardSize + 16)
        {
            // the window is smaller than the card: pin it to the top/left edge instead
            return Math.Max(0, wanted);
        }

        return Math.Clamp(wanted, 0, extent - cardSize - 8);
    }
}
