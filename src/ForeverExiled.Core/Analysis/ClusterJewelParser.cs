using System.Globalization;
using System.Text.RegularExpressions;
using ForeverExiled.Core.Models;

namespace ForeverExiled.Core.Analysis;

/// <summary>
/// Turns a raw poe.ninja item into a <see cref="ClusterJewel"/>.
///
/// Cluster jewels encode everything in mod text:
///   enchant   "Adds 4 Passive Skills"
///             "10% increased Projectile Damage" (cluster type, prefixed by
///              "Added Small Passive Skills grant:" in game)
///   explicit  "1 Added Passive Skill is Eye to Eye"
///             "1 Added Passive Skill is Repeater"
///             "Added Small Passive Skills have 35% increased Effect"
/// </summary>
public static class ClusterJewelParser
{
    private const string GrantPrefix = "Added Small Passive Skills grant:";

    private static readonly Regex PassiveCountRegex = new(
        @"^Adds\s+(\d+)\s+Passive\s+Skills?$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private static readonly Regex JewelSocketRegex = new(
        @"^(\d+)\s+Added\s+Passive\s+Skills?\s+(?:are|is\s+a)\s+Jewel\s+Sockets?$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private static readonly Regex NotableRegex = new(
        @"^1\s+Added\s+Passive\s+Skill\s+is\s+(?<name>.+)$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private static readonly Regex EffectRegex = new(
        @"^Added\s+Small\s+Passive\s+Skills?\s+have\s+(?<value>\d+)%\s+increased\s+Effect$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private static readonly Regex SmallGrantRegex = new(
        @"^Added\s+Small\s+Passive\s+Skills?\s+also\s+grant:\s*(?<text>.+)$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public static bool IsClusterJewel(string? typeLine) =>
        !string.IsNullOrWhiteSpace(typeLine) &&
        typeLine.Contains("Cluster Jewel", StringComparison.OrdinalIgnoreCase);

    public static ClusterSize DetectSize(string? typeLine)
    {
        if (string.IsNullOrWhiteSpace(typeLine))
        {
            return ClusterSize.Unknown;
        }

        if (typeLine.Contains("Large", StringComparison.OrdinalIgnoreCase))
        {
            return ClusterSize.Large;
        }

        if (typeLine.Contains("Medium", StringComparison.OrdinalIgnoreCase))
        {
            return ClusterSize.Medium;
        }

        if (typeLine.Contains("Small", StringComparison.OrdinalIgnoreCase))
        {
            return ClusterSize.Small;
        }

        return ClusterSize.Unknown;
    }

    /// <summary>Parses an item; returns <c>null</c> when it is not a cluster jewel.</summary>
    public static ClusterJewel? Parse(
        string? typeLine,
        string? name,
        string? rarity,
        int? itemLevel,
        IEnumerable<string>? enchantMods,
        IEnumerable<string>? explicitMods,
        IEnumerable<string>? fracturedMods,
        IEnumerable<string>? implicitMods,
        bool fractured,
        bool corrupted)
    {
        if (!IsClusterJewel(typeLine))
        {
            return null;
        }

        var size = DetectSize(typeLine);
        if (size == ClusterSize.Unknown)
        {
            return null;
        }

        var jewel = new ClusterJewel
        {
            Size = size,
            BaseType = typeLine!.Trim(),
            ItemName = string.IsNullOrWhiteSpace(name) ? string.Empty : name.Trim(),
            Rarity = rarity ?? string.Empty,
            ItemLevel = itemLevel,
            Fractured = fractured,
            Corrupted = corrupted,
        };

        foreach (var rawEnchant in enchantMods ?? Array.Empty<string>())
        {
            ApplyEnchant(jewel, rawEnchant);
        }

        var notables = new List<string>();
        var grants = new List<string>();

        void ApplyMod(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw))
            {
                return;
            }

            foreach (var line in raw.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                var notable = NotableRegex.Match(line);
                if (notable.Success)
                {
                    var notableName = notable.Groups["name"].Value.Trim();
                    if (notableName.Equals("a Jewel Socket", StringComparison.OrdinalIgnoreCase) ||
                        notableName.Contains("Jewel Socket", StringComparison.OrdinalIgnoreCase))
                    {
                        jewel.JewelSockets++;
                        continue;
                    }

                    if (!notables.Contains(notableName, StringComparer.OrdinalIgnoreCase))
                    {
                        notables.Add(notableName);
                    }

                    continue;
                }

                var effect = EffectRegex.Match(line);
                if (effect.Success)
                {
                    if (int.TryParse(effect.Groups["value"].Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var percent) &&
                        percent > jewel.EffectPercent)
                    {
                        jewel.EffectPercent = percent;
                    }

                    continue;
                }

                var smallGrant = SmallGrantRegex.Match(line);
                if (smallGrant.Success)
                {
                    var text = smallGrant.Groups["text"].Value.Trim();
                    if (!grants.Contains(text, StringComparer.OrdinalIgnoreCase))
                    {
                        grants.Add(text);
                    }
                }
            }
        }

        foreach (var mod in explicitMods ?? Array.Empty<string>())
        {
            ApplyMod(mod);
        }

        foreach (var mod in fracturedMods ?? Array.Empty<string>())
        {
            ApplyMod(mod);
        }

        // Implicit mods on cluster jewels occasionally carry the jewel-socket counter.
        foreach (var mod in implicitMods ?? Array.Empty<string>())
        {
            var socket = JewelSocketRegex.Match(mod.Trim());
            if (socket.Success &&
                int.TryParse(socket.Groups[1].Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var sockets))
            {
                jewel.JewelSockets = Math.Max(jewel.JewelSockets, sockets);
            }
        }

        jewel.Notables = notables;
        jewel.SmallGrants = grants;

        // "Voices" style jewels have no notables; keep them anyway - they are a real combo.
        return jewel;
    }

    private static void ApplyEnchant(ClusterJewel jewel, string rawEnchant)
    {
        if (string.IsNullOrWhiteSpace(rawEnchant))
        {
            return;
        }

        foreach (var line in rawEnchant.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            var passives = PassiveCountRegex.Match(line);
            if (passives.Success)
            {
                if (int.TryParse(passives.Groups[1].Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var count))
                {
                    jewel.Passives = Math.Max(jewel.Passives ?? 0, count);
                }

                continue;
            }

            var sockets = JewelSocketRegex.Match(line);
            if (sockets.Success)
            {
                if (int.TryParse(sockets.Groups[1].Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var socketCount))
                {
                    jewel.JewelSockets = Math.Max(jewel.JewelSockets, socketCount);
                }

                continue;
            }

            var trimmed = line.Trim();
            if (trimmed.StartsWith(GrantPrefix, StringComparison.OrdinalIgnoreCase))
            {
                var text = trimmed[GrantPrefix.Length..].Trim();
                if (text.Length > 0 && jewel.GrantType.Length == 0)
                {
                    jewel.GrantType = text;
                }

                continue;
            }

            // Some snapshots drop the prefix and ship the bare type line as an enchant.
            if (jewel.GrantType.Length == 0 && !trimmed.EndsWith("Passive Skills", StringComparison.OrdinalIgnoreCase))
            {
                jewel.GrantType = trimmed;
            }
        }
    }

    /// <summary>URL-safe slug used for deep links / exports.</summary>
    public static string Slugify(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var builder = new System.Text.StringBuilder(value.Length);
        var lastDash = false;
        foreach (var ch in value.ToLowerInvariant())
        {
            if (char.IsLetterOrDigit(ch))
            {
                builder.Append(ch);
                lastDash = false;
            }
            else if (!lastDash)
            {
                builder.Append('-');
                lastDash = true;
            }
        }

        return builder.ToString().Trim('-');
    }
}
