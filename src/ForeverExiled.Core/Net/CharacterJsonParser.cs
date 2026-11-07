using System.Text.Json;
using ForeverExiled.Core.Analysis;
using ForeverExiled.Core.Models;

namespace ForeverExiled.Core.Net;

/// <summary>
/// Parses <c>/poe1/api/builds/{version}/character</c>. The payload is JSON and wraps
/// items in a few historical shapes, so all of them are probed:
///   * <c>clusterJewels[]</c>            (modern, pre-parsed by poe.ninja)
///   * <c>jewels[].itemData</c>          (jewel stash grid)
///   * <c>items[]</c>                    (everything equipped / in inventory)
/// </summary>
public static class CharacterJsonParser
{
    public static CharacterSnapshot Parse(
        JsonElement root,
        string? fallbackAccount = null,
        string? fallbackName = null,
        string? mainSkill = null,
        double dps = 0)
    {
        var snapshot = new CharacterSnapshot
        {
            Account = FirstNonEmpty(GetString(root, "account"), fallbackAccount),
            Name = FirstNonEmpty(GetString(root, "name"), fallbackName),
            ClassName = FirstNonEmpty(
                GetString(root, "class"),
                GetString(root, "className"),
                GetString(root, "ascendancyClassName")),
            League = GetString(root, "league"),
            Level = (int)GetNumber(root, "level"),
            MainSkill = mainSkill ?? string.Empty,
            Dps = dps,
            FetchedAt = DateTimeOffset.UtcNow,
        };

        if (root.TryGetProperty("defensiveStats", out var defensive) && defensive.ValueKind == JsonValueKind.Object)
        {
            snapshot.Life = (long)GetNumber(defensive, "life");
            snapshot.EnergyShield = (long)GetNumber(defensive, "energyShield");
        }
        else
        {
            snapshot.Life = (long)GetNumber(root, "life");
            snapshot.EnergyShield = (long)GetNumber(root, "energyShield");
        }

        var seen = new HashSet<string>(StringComparer.Ordinal);

        foreach (var item in CollectItems(root, "clusterJewels"))
        {
            AddJewel(snapshot, Unwrap(item), seen);
        }

        foreach (var wrapper in CollectItems(root, "jewels"))
        {
            AddJewel(snapshot, Unwrap(wrapper), seen);
        }

        foreach (var item in CollectItems(root, "items"))
        {
            AddJewel(snapshot, Unwrap(item), seen);
        }

        return snapshot;
    }

    private static void AddJewel(CharacterSnapshot snapshot, JsonElement item, HashSet<string> seen)
    {
        if (item.ValueKind != JsonValueKind.Object)
        {
            return;
        }

        var typeLine = GetString(item, "typeLine", "baseType");
        if (!ClusterJewelParser.IsClusterJewel(typeLine))
        {
            return;
        }

        var jewel = ClusterJewelParser.Parse(
            typeLine,
            GetString(item, "name"),
            GetString(item, "rarity"),
            (int?)GetNullableNumber(item, "ilvl"),
            GetStringArray(item, "enchantMods"),
            GetStringArray(item, "explicitMods"),
            GetStringArray(item, "fracturedMods"),
            GetStringArray(item, "implicitMods"),
            GetBool(item, "fractured"),
            GetBool(item, "corrupted"));

        if (jewel is null)
        {
            return;
        }

        var identity = string.Join(
            '\u001f',
            jewel.BaseType,
            jewel.ItemName,
            jewel.GrantType,
            string.Join('|', jewel.Notables),
            string.Join('|', jewel.SmallGrants),
            jewel.Passives?.ToString() ?? string.Empty,
            jewel.JewelSockets.ToString(),
            jewel.EffectPercent.ToString());

        if (seen.Add(identity))
        {
            snapshot.ClusterJewels.Add(jewel);
        }
    }

    private static IEnumerable<JsonElement> CollectItems(JsonElement root, string propertyName)
    {
        if (!root.TryGetProperty(propertyName, out var array) || array.ValueKind != JsonValueKind.Array)
        {
            yield break;
        }

        foreach (var element in array.EnumerateArray())
        {
            yield return element;
        }
    }

    private static JsonElement Unwrap(JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.Object &&
            element.TryGetProperty("itemData", out var itemData) &&
            itemData.ValueKind == JsonValueKind.Object)
        {
            return itemData;
        }

        return element;
    }

    private static string GetString(JsonElement element, params string[] names)
    {
        foreach (var name in names)
        {
            if (element.ValueKind == JsonValueKind.Object &&
                element.TryGetProperty(name, out var value) &&
                value.ValueKind == JsonValueKind.String)
            {
                return value.GetString() ?? string.Empty;
            }
        }

        return string.Empty;
    }

    private static double GetNumber(JsonElement element, string name) =>
        GetNullableNumber(element, name) ?? 0;

    private static double? GetNullableNumber(JsonElement element, string name)
    {
        if (element.ValueKind != JsonValueKind.Object || !element.TryGetProperty(name, out var value))
        {
            return null;
        }

        return value.ValueKind switch
        {
            JsonValueKind.Number when value.TryGetDouble(out var number) => number,
            JsonValueKind.String when double.TryParse(
                value.GetString(),
                System.Globalization.NumberStyles.Float,
                System.Globalization.CultureInfo.InvariantCulture,
                out var parsed) => parsed,
            JsonValueKind.True => 1,
            _ => null,
        };
    }

    private static bool GetBool(JsonElement element, string name)
    {
        if (element.ValueKind != JsonValueKind.Object || !element.TryGetProperty(name, out var value))
        {
            return false;
        }

        return value.ValueKind switch
        {
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Number => value.TryGetDouble(out var number) && number != 0,
            _ => false,
        };
    }

    private static string[] GetStringArray(JsonElement element, string name)
    {
        if (element.ValueKind != JsonValueKind.Object || !element.TryGetProperty(name, out var value))
        {
            return Array.Empty<string>();
        }

        if (value.ValueKind == JsonValueKind.String)
        {
            var single = value.GetString();
            return string.IsNullOrEmpty(single) ? Array.Empty<string>() : new[] { single };
        }

        if (value.ValueKind != JsonValueKind.Array)
        {
            return Array.Empty<string>();
        }

        var list = new List<string>();
        foreach (var entry in value.EnumerateArray())
        {
            if (entry.ValueKind == JsonValueKind.String)
            {
                var text = entry.GetString();
                if (!string.IsNullOrWhiteSpace(text))
                {
                    list.Add(text);
                }
            }
        }

        return list.ToArray();
    }

    private static string FirstNonEmpty(params string?[] values)
    {
        foreach (var value in values)
        {
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value!;
            }
        }

        return string.Empty;
    }
}
