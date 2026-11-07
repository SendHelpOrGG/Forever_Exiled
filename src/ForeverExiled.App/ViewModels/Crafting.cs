using ForeverExiled.App.Theming;
using ForeverExiled.Core.Models;

namespace ForeverExiled.App.ViewModels;

/// <summary>One currency line of a crafting route, e.g. "179 Chaos".</summary>
public sealed record CraftCurrency(string Label, int Quantity);

/// <summary>
/// One way to craft the selected cluster jewel: how many attempts it takes on average,
/// what those attempts cost, and the total in chaos.
/// </summary>
public sealed class CraftRouteItem
{
    public CraftRouteItem(string name, string note, string unit, int tries, IReadOnlyList<CraftCurrency> currency, double chaos, double cheapest)
    {
        Name = name;
        Note = note;
        Unit = unit;
        Tries = tries;
        Chaos = chaos;
        TriesText = $"1 in {tries:N0} {unit}";
        CurrencyText = string.Join(" · ", currency.Select(line => $"{line.Quantity:N0} {line.Label}"));
        ChaosText = ChaosLabel(chaos);
        BarPercent = chaos > 0 && cheapest > 0 ? cheapest * 100 / chaos : 0;
        IsBest = Math.Abs(chaos - cheapest) < 0.001;
    }

    public string Name { get; }

    public string Note { get; }

    public int Tries { get; }

    /// <summary>"tries" for a whole-item reroll, "cycles" for one alt→regal attempt.</summary>
    public string Unit { get; }

    public double Chaos { get; }

    public string TriesText { get; }

    public string CurrencyText { get; }

    public string ChaosText { get; }

    public double BarPercent { get; }

    public bool IsBest { get; }

    /// <summary>"642 c" / "6.6K c" - one format for every figure the card prints.</summary>
    public static string ChaosLabel(double chaos) => chaos >= 1000 ? $"{chaos / 1000:0.#}K c"
        : chaos >= 100 ? $"{Math.Round(chaos):0} c"
        : $"{chaos:0.#} c";
}

/// <summary>
/// Crafting estimates for a cluster jewel, from the spawn weights the item card already shows.
///
/// A base rolls its affixes from one prefix pool and one suffix pool, so a notable's chance is
/// its weight over its pool. A magic jewel has one slot of each type, a rare jewel two, and the
/// number of attempts is 1 / that chance. Costs are attempts times the price of one attempt.
/// </summary>
public static class CraftingMath
{
    private const int MagicSlots = 1;

    private const int RareSlots = 2;

    /// <summary>The cheapest item level that can still roll every notable in the combination.</summary>
    public static int MinimumItemLevel(ClusterCombo combo)
    {
        var level = 1;
        foreach (var notable in combo.Notables)
        {
            level = Math.Max(level, NotableWeights.LevelFor(notable));
        }

        return level;
    }

    /// <param name="combo">The combination being priced.</param>
    /// <param name="itemLevel">
    /// Force a base level; the default (0) prices the cheapest iLvl that still rolls every
    /// notable, which is the base a crafter would buy for this one combination.
    /// </param>
    public static IReadOnlyList<CraftRouteItem> Routes(ClusterCombo combo, int itemLevel = 0)
    {
        var size = combo.Size.ToString();
        var tag = NotableWeights.PoolFor(size, combo.GrantType);
        if (tag is null || combo.Notables.Count == 0)
        {
            return Array.Empty<CraftRouteItem>();
        }

        // price the base a crafter would actually buy: the lowest iLvl that rolls them all,
        // which also means the smallest pool
        var minimumLevel = itemLevel > 0 ? itemLevel : MinimumItemLevel(combo);
        var prefixTotal = NotableWeights.PoolTotal(tag, size, "Prefix", minimumLevel);
        var suffixTotal = NotableWeights.PoolTotal(tag, size, "Suffix", minimumLevel);

        var prefixWeights = new List<int>();
        var suffixWeights = new List<int>();
        var unknown = false;

        foreach (var notable in combo.Notables)
        {
            var weight = NotableWeights.WeightFor(notable, tag);
            var type = NotableWeights.TypeFor(notable);
            if (weight <= 0 || type.Length == 0)
            {
                unknown = true;
                continue;
            }

            if (type == "Prefix")
            {
                prefixWeights.Add(weight);
            }
            else
            {
                suffixWeights.Add(weight);
            }
        }

        var routes = new List<(string Name, string Unit, string Note, int Tries, CraftCurrency[] Lines)>();

        // 1. Alteration + Augmentation on a magic jewel
        if (!unknown && prefixWeights.Count <= MagicSlots && suffixWeights.Count <= MagicSlots)
        {
            var chance = PresenceChance(prefixWeights, prefixTotal, MagicSlots)
                * PresenceChance(suffixWeights, suffixTotal, MagicSlots);

            if (chance > 0)
            {
                var tries = TriesFor(chance);
                var lines = new[]
                {
                    new CraftCurrency("Alt", tries),
                    new CraftCurrency("Aug", (int)Math.Ceiling(tries * 0.45)),
                };

                routes.Add(("Alt + Aug", "tries", "magic jewel, 1 prefix + 1 suffix — no regal needed", tries, lines));
            }
        }

        // 2-4. anything that rerolls a rare jewel. A rare can roll up to three affixes of
        // a type; combos that need three are priced against that, and the note says so.
        var rarePrefixSlots = Math.Min(3, Math.Max(RareSlots, prefixWeights.Count));
        var rareSuffixSlots = Math.Min(3, Math.Max(RareSlots, suffixWeights.Count));
        var rareNote = $"rare jewel, {rarePrefixSlots} prefix{(rarePrefixSlots == 1 ? string.Empty : "es")} + {rareSuffixSlots} suffix{(rareSuffixSlots == 1 ? string.Empty : "es")}";
        var rareChance = PresenceChance(prefixWeights, prefixTotal, rarePrefixSlots)
            * PresenceChance(suffixWeights, suffixTotal, rareSuffixSlots);

        if (rareChance > 0)
        {
            var tries = TriesFor(rareChance);

            var chaosLines = new[] { new CraftCurrency("Chaos", tries) };
            routes.Add(("Chaos Orb", "tries", rareNote, tries, chaosLines));

            var harvestLines = new[] { new CraftCurrency("Reforge", tries) };
            routes.Add(("Harvest Reforge", "tries", "reforge rare, same pool odds", tries, harvestLines));

            var fossilLines = new[]
            {
                new CraftCurrency("Resonator", tries),
                new CraftCurrency("Fossil", tries * 3),
            };
            routes.Add(("Fossil (3-socket)", "tries", "odds treat fossils as neutral", tries, fossilLines));
        }

        // 5. Alt -> Regal. The magic jewel chases one target of each type; the regal then has
        // to add the single target that is left, and a miss scours the item back to magic.
        // A cycle is one hunt plus one regal, so cycles are set by the regal alone and the
        // alt count is how many rolls each hunt needs.
        if (!unknown && combo.Notables.Count >= 2 && prefixWeights.Count <= 2 && suffixWeights.Count <= 2)
        {
            var magicPrefix = prefixWeights.Take(1).ToList();
            var magicSuffix = suffixWeights.Take(1).ToList();
            var missingPrefixes = prefixWeights.Skip(1).ToList();
            var missingSuffixes = suffixWeights.Skip(1).ToList();
            var missing = missingPrefixes.Count + missingSuffixes.Count;

            if (missing == 1)
            {
                // either prefix may be the one the magic stage lands, so chase all of them
                var chasePrefixes = prefixWeights.Count == 2 ? prefixWeights : magicPrefix;
                var pMagic = (chasePrefixes.Count > 0 ? Sum(chasePrefixes) / (double)Math.Max(1, prefixTotal) : 1)
                    * (magicSuffix.Count > 0 ? Sum(magicSuffix) / (double)Math.Max(1, suffixTotal) : 1);

                var needPrefix = missingPrefixes.Count == 1;
                var needWeight = needPrefix ? missingPrefixes[0] : missingSuffixes[0];
                var pool = needPrefix ? prefixTotal : suffixTotal;
                var otherPool = needPrefix ? suffixTotal : prefixTotal;
                // a regal rolls a mod of either type, so only its share of the pools can help
                var typeShare = pool + otherPool > 0 ? pool / (double)(pool + otherPool) : 0.5;
                var spent = needPrefix ? Sum(magicPrefix) : Sum(magicSuffix);
                var pRegal = pool - spent > 0 ? typeShare * needWeight / (double)(pool - spent) : 0;

                if (pMagic > 0 && pRegal > 0)
                {
                    var cycles = TriesFor(pRegal);
                    var alts = (int)Math.Ceiling(cycles / pMagic);
                    var augs = (int)Math.Ceiling(alts * 0.45);
                    var note = $"{alts / Math.Max(1, cycles)} alts per cycle, then 1 regal · ≈ {(alts + augs):N0} orbs rolled";
                    var lines = new[]
                    {
                        new CraftCurrency("Alt", alts),
                        new CraftCurrency("Aug", augs),
                        new CraftCurrency("Regal", cycles),
                        new CraftCurrency("Scour", cycles),
                        new CraftCurrency("Transmute", cycles),
                    };

                    routes.Add(("Alt → Regal", "cycles", note, cycles, lines));
                }
            }
        }

        if (routes.Count == 0)
        {
            return Array.Empty<CraftRouteItem>();
        }

        var ranked = routes
            .Select(route => (route.Name, route.Unit, route.Note, route.Tries, route.Lines, Chaos: Cost(route.Lines)))
            .OrderBy(route => route.Chaos)
            .Take(3)
            .ToList();

        var cheapest = ranked[0].Chaos;

        return ranked
            .Select(route => new CraftRouteItem(route.Name, route.Note, route.Unit, route.Tries, route.Lines, route.Chaos, cheapest))
            .ToList();
    }

    private static double Cost(IEnumerable<CraftCurrency> lines)
    {
        var total = 0.0;
        foreach (var line in lines)
        {
            total += line.Quantity * PriceOf(line.Label);
        }

        return total;
    }

    private static double PriceOf(string label) => label switch
    {
        "Chaos" => CurrencyPrices.Chaos,
        "Alt" => CurrencyPrices.Alteration,
        "Aug" => CurrencyPrices.Augmentation,
        "Regal" => CurrencyPrices.Regal,
        "Scour" => CurrencyPrices.Scouring,
        "Transmute" => CurrencyPrices.Transmutation,
        "Reforge" => CurrencyPrices.HarvestReforge,
        "Resonator" => CurrencyPrices.Resonator,
        "Fossil" => CurrencyPrices.Fossil,
        _ => 0,
    };

    private static int TriesFor(double chance) => (int)Math.Max(1, Math.Ceiling(1 / chance));

    private static int Sum(IEnumerable<int> values) => values.Sum();

    /// <summary>Probability that every weight shows up within <paramref name="slots"/> draws.</summary>
    private static double PresenceChance(IReadOnlyList<int> weights, int total, int slots)
    {
        if (weights.Count == 0)
        {
            return 1;
        }

        if (total <= 0)
        {
            return 0;
        }

        var chance = 1.0;
        var masks = 1 << weights.Count;

        for (var mask = 1; mask < masks; mask++)
        {
            var sum = 0.0;
            var bits = 0;
            for (var bit = 0; bit < weights.Count; bit++)
            {
                if ((mask & (1 << bit)) == 0)
                {
                    continue;
                }

                sum += (double)weights[bit] / total;
                bits++;
            }

            var term = Math.Pow(Math.Max(0, 1 - sum), slots);
            chance += bits % 2 == 1 ? -term : term;
        }

        return Math.Clamp(chance, 0, 1);
    }
}
