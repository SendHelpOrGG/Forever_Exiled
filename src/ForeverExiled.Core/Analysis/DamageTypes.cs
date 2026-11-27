namespace ForeverExiled.Core.Analysis;

/// <summary>
/// Maps a main skill to the damage type used for colour-coding the UI. A curated table
/// covers the common ladder gems; keyword heuristics handle the long tail (including
/// transfigured variants such as "Ice Nova of Frostbolts").
/// </summary>
public static class DamageTypes
{
    public const string Physical = "Physical";
    public const string Fire = "Fire";
    public const string Cold = "Cold";
    public const string Lightning = "Lightning";
    public const string Chaos = "Chaos";
    public const string Minion = "Minion";

    private static readonly Dictionary<string, string> Known = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Molten Strike of the Zenith"] = Fire,
        ["Molten Strike"] = Fire,
        ["Hexblast"] = Chaos,
        ["Ice Nova of Frostbolts"] = Cold,
        ["Ice Nova"] = Cold,
        ["Winter Orb"] = Cold,
        ["Splitting Steel"] = Physical,
        ["Lightning Strike"] = Lightning,
        ["Righteous Fire"] = Fire,
        ["Fire Trap"] = Fire,
        ["Animate Guardian"] = Minion,
        ["Raise Spectre"] = Minion,
        ["Summon Raging Spirit"] = Minion,
        ["Animate Weapon of Ranged Arms"] = Minion,
        ["Penance Brand"] = Lightning,
        ["Penance Brand of Dissipation"] = Lightning,
        ["Ethereal Knives"] = Physical,
        ["Cyclone of Tumult"] = Physical,
        ["Cyclone"] = Physical,
        ["Void Shockwave"] = Physical,
        ["Earthshatter"] = Physical,
        ["Boneshatter of Complex Trauma"] = Physical,
        ["Boneshatter"] = Physical,
        ["Essence Drain"] = Chaos,
        ["Blight of Contagion"] = Chaos,
        ["Storm Burst of Repulsion"] = Lightning,
        ["Toxic Rain"] = Chaos,
        ["Soulrend"] = Chaos,
        ["Arc"] = Lightning,
        ["Spark"] = Lightning,
        ["Ball Lightning of Orbiting"] = Lightning,
        ["Venom Gyre"] = Chaos,
        ["Detonate Dead of Chain Reaction"] = Fire,
        ["Explosive Arrow"] = Fire,
        ["Burning Arrow"] = Fire,
        ["Caustic Arrow"] = Chaos,
        ["Lightning Arrow"] = Lightning,
        ["Tornado Shot"] = Physical,
        ["Kinetic Blast"] = Physical,
        ["Ice Shot"] = Cold,
        ["Spectral Helix"] = Physical,
        ["Frost Blades"] = Cold,
        ["Sweep"] = Physical,
        ["Ground Slam of Earthshaking"] = Physical,
        ["Leap Slam"] = Physical,
        ["Absolution"] = Lightning,
        ["Carrion Golem"] = Minion,
        ["Summon Skitterbots"] = Minion,
    };

    private static readonly (string Keyword, string Type)[] Keywords =
    {
        ("fire", Fire), ("flame", Fire), ("burn", Fire), ("ignite", Fire), ("molten", Fire),
        ("cold", Cold), ("ice", Cold), ("frost", Cold), ("freeze", Cold), ("winter", Cold), ("glacial", Cold),
        ("lightning", Lightning), ("storm", Lightning), ("spark", Lightning), ("arc", Lightning), ("thunder", Lightning),
        ("chaos", Chaos), ("poison", Chaos), ("toxic", Chaos), ("blight", Chaos), ("void", Chaos), ("soul", Chaos),
        ("summon", Minion), ("animate", Minion), ("spectre", Minion), ("golem", Minion), ("zombie", Minion),
        ("skeleton", Minion), ("rage", Minion), ("raise", Minion),
    };

    public static string Classify(string skillName)
    {
        if (string.IsNullOrWhiteSpace(skillName))
        {
            return Physical;
        }

        if (Known.TryGetValue(skillName, out var known))
        {
            return known;
        }

        var lower = skillName.ToLowerInvariant();
        foreach (var (keyword, type) in Keywords)
        {
            if (lower.Contains(keyword, StringComparison.Ordinal))
            {
                return type;
            }
        }

        return Physical;
    }
}
