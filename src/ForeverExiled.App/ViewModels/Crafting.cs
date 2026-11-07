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
    public CraftRouteItem(string name, string note, int tries, IReadOnlyList<CraftCurrency> currency, double chaos, double cheapest)
    {
        Name = name;
        Note = note;
        Tries = tries;
        Chaos = chaos;
        TriesText = $"1 in {tries:N0} tries";
        CurrencyText = string.Join(" · ", currency.Select(line => $"{line.Quantity:N0} {line.Label}"));
        ChaosText = chaos >= 1000 ? $"{chaos / 1000:0.#}K c"
            : chaos >= 100 ? $"{Math.Round(chaos):0} c"
            : $"{chaos:0.#} c";
        BarPercent = chaos > 0 && cheapest > 0 ? cheapest * 100 / chaos : 0;
        IsBest = Math.Abs(chaos - cheapest) < 0.001;
    }

    public string Name { get; }

    public string Note { get; }

    public int Tries { get; }

    public double Chaos { get; }

    public string TriesText { get; }

    public string CurrencyText { get; }

    public string ChaosText { get; }

    public double BarPercent { get; }

    public bool IsBest { get; }
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

    public static IReadOnlyList<CraftRouteItem> Routes(ClusterCombo combo)
    {
        var size = combo.Size.ToString();
        var tag = NotableWeights.PoolFor(size, combo.GrantType);
        if (tag is null || combo.Notables.Count == 0)
        {
            return Array.Empty<CraftRouteItem>();
        }

        // price the base a crafter would actually buy: the lowest iLvl that rolls them all,
        // which also means the smallest pool
        var minimumLevel = MinimumItemLevel(combo);
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

        var routes = new List<(string Name, string Note, int Tries, CraftCurrency[] Lines)>();

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
                    new CraftCurrency("Aug", Half(tries)),
                };

                routes.Add(("Alt + Aug", "magic jewel, 1 prefix + 1 suffix", tries, lines));
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
            routes.Add(("Chaos Orb", rareNote, tries, chaosLines));

            var harvestLines = new[] { new CraftCurrency("Reforge", tries) };
            routes.Add(("Harvest Reforge", "reforge rare, same pool odds", tries, harvestLines));

            var fossilLines = new[]
            {
                new CraftCurrency("Resonator", tries),
                new CraftCurrency("Fossil", tries * 3),
            };
            routes.Add(("Fossil (3-socket)", "odds treat fossils as neutral", tries, fossilLines));
        }

        // 5. Alt to the first notable, then regal hoping for the second
        if (!unknown && combo.Notables.Count == 2)
        {
            var first = combo.Notables[0];
            var second = combo.Notables[1];
            var firstType = NotableWeights.TypeFor(first);
            var secondType = NotableWeights.TypeFor(second);
            var firstTotal = firstType == "Prefix" ? prefixTotal : suffixTotal;
            var secondTotal = secondType == "Prefix" ? prefixTotal : suffixTotal;
            var firstWeight = NotableWeights.WeightFor(first, tag);
            var secondWeight = NotableWeights.WeightFor(second, tag);

            var firstChance = firstTotal > 0 ? (double)firstWeight / firstTotal : 0;
            var remaining = secondTotal - (secondType == firstType ? firstWeight : 0);
            var regalChance = remaining > 0
                ? (secondType == firstType ? 0.5 : 1.0) * secondWeight / remaining
                : 0;

            if (firstChance > 0 && regalChance > 0)
            {
                var regals = TriesFor(regalChance);
                var alts = (int)Math.Ceiling(regals / firstChance);
                var lines = new[]
                {
                    new CraftCurrency("Alt", alts),
                    new CraftCurrency("Aug", Half(alts)),
                    new CraftCurrency("Regal", regals),
                };

                routes.Add(("Alt → Regal", "magic hit, then 1 regal per cycle", regals, lines));
            }
        }

        if (routes.Count == 0)
        {
            return Array.Empty<CraftRouteItem>();
        }

        var ranked = routes
            .Select(route => (route.Name, route.Note, route.Tries, route.Lines, Chaos: Cost(route.Lines)))
            .OrderBy(route => route.Chaos)
            .Take(3)
            .ToList();

        var cheapest = ranked[0].Chaos;

        return ranked
            .Select(route => new CraftRouteItem(route.Name, route.Note, route.Tries, route.Lines, route.Chaos, cheapest))
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
        "Reforge" => CurrencyPrices.HarvestReforge,
        "Resonator" => CurrencyPrices.Resonator,
        "Fossil" => CurrencyPrices.Fossil,
        _ => 0,
    };

    private static int TriesFor(double chance) => (int)Math.Max(1, Math.Ceiling(1 / chance));

    private static int Half(int value) => (int)Math.Ceiling(value * 0.5);

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
