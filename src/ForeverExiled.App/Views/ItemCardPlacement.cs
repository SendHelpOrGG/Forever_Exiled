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

    /// <summary>
    /// Vertical placement, which is the one that goes wrong: a cluster jewel card can be six
    /// hundred pixels tall, so a fixed drop-below-the-pointer either clips the last notable off
    /// the bottom of the window or, when the guess is too small, leaves the foot off screen.
    /// Flip above the pointer when there is no room below, then pin.
    /// </summary>
    public static double PlaceVertical(double pointer, double offset, double extent, double cardHeight)
    {
        var below = pointer + offset;
        var above = pointer - cardHeight - offset;

        if (cardHeight <= 0 || extent <= 0)
        {
            return Math.Max(0, below);
        }

        var wanted = below + cardHeight + 8 > extent && above >= 0 ? above : below;
        var limit = Math.Max(0, extent - cardHeight - 8);

        return extent <= cardHeight + 16 ? 0 : Math.Clamp(wanted, 0, limit);
    }
}
