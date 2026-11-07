namespace ForeverExiled.App.Theming;

/// <summary>
/// Chaos-equivalent prices used by the crafting estimates. These are hand-maintained
/// placeholders, not live prices - they mirror preview/assets/currency_costs.json and
/// should be edited to match the league being analysed. The defaults follow the league
/// craftofexile.com priced its cluster-jewel methods in, where an Orb of Augmentation is
/// worth about a chaos; that is what makes augment-heavy routes as expensive as they are.
/// </summary>
public static class CurrencyPrices
{
    public const double Chaos = 1.0;

    public const double Alteration = 0.18;

    public const double Augmentation = 1.0;

    public const double Regal = 1.0;

    public const double Alchemy = 1.0;

    public const double Scouring = 1.0;

    public const double Transmutation = 1.0;

    public const double HarvestReforge = 3.0;

    public const double Resonator = 1.2;

    public const double Fossil = 1.5;
}
