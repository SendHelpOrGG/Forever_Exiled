using System.Net;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using ForeverExiled.Core.Models;

namespace ForeverExiled.Core.Net;

/// <summary>
/// Reads a character out of poe.ninja's own character page HTML instead of its JSON endpoint.
/// The page is server-rendered and carries the whole character as embedded JSON (Astro
/// islands), and HTML routes are cached and served far more freely than the character API -
/// which is the endpoint that rate-limits a crawl into a standstill.
/// </summary>
public static partial class CharacterPageScraper
{
    public const string ClusterJewelsSection = "Cluster Jewels";

    /// <summary>
    /// The character named by the page, or <c>null</c> when the HTML carries no item data -
    /// in which case the caller should fall back to the JSON endpoint rather than guess.
    /// </summary>
    public static CharacterSnapshot? Parse(
        string html,
        string account,
        string name,
        string mainSkill = "",
        double dps = 0)
    {
        if (string.IsNullOrWhiteSpace(html))
        {
            return null;
        }

        CharacterSnapshot? best = null;

        foreach (var blob in ExtractJsonBlobs(html))
        {
            JsonElement root;
            try
            {
                using var document = JsonDocument.Parse(blob);
                var unwrapped = AstroJson.Unwrap(document.RootElement);
                if (unwrapped is null)
                {
                    continue;
                }

                using var normalized = JsonDocument.Parse(unwrapped.ToJsonString());
                root = normalized.RootElement.Clone();
            }
            catch (JsonException)
            {
                continue;
            }

            foreach (var candidate in FindCharacterObjects(root))
            {
                var snapshot = CharacterJsonParser.Parse(candidate, account, name, mainSkill, dps);
                if (best is null || snapshot.ClusterJewels.Count > best.ClusterJewels.Count)
                {
                    best = snapshot;
                }
            }
        }

        // a page that yields the character but no jewels is not better than the endpoint: the
        // jewel sections are exactly what this scraper exists for
        return best is { ClusterJewels.Count: > 0 } ? best : null;
    }

    /// <summary>The page the site itself links each ladder row to.</summary>
    public static string PagePath(string leagueSlug, string account, string name)
    {
        var accountSlug = account.Replace('#', '-').Trim().ToLowerInvariant();
        return $"poe1/builds/{leagueSlug}/character/{Uri.EscapeDataString(accountSlug)}/{Uri.EscapeDataString(name)}";
    }

    /// <summary>
    /// Every JSON payload a server-rendered page can hide a model in: a JSON script block, or
    /// an Astro island's escaped <c>props</c> attribute.
    /// </summary>
    internal static IEnumerable<string> ExtractJsonBlobs(string html)
    {
        foreach (Match match in JsonScript().Matches(html))
        {
            var text = match.Groups["json"].Value.Trim();
            if (text.Length > 1)
            {
                yield return text;
            }
        }

        foreach (Match match in PropsAttribute().Matches(html))
        {
            var text = WebUtility.HtmlDecode(match.Groups["json"].Value).Trim();
            if (text.Length > 1 && (text[0] == '{' || text[0] == '['))
            {
                yield return text;
            }
        }
    }

    /// <summary>Objects anywhere in the tree that could be a character with its items.</summary>
    internal static IEnumerable<JsonElement> FindCharacterObjects(JsonElement element)
    {
        var queue = new Queue<JsonElement>();
        queue.Enqueue(element);

        while (queue.Count > 0)
        {
            var current = queue.Dequeue();

            if (current.ValueKind == JsonValueKind.Object)
            {
                var looksLikeCharacter = current.TryGetProperty("clusterJewels", out _)
                                         || current.TryGetProperty("items", out _)
                                         || current.TryGetProperty("equipment", out _)
                                         || current.TryGetProperty("jewels", out _);

                if (looksLikeCharacter)
                {
                    yield return current;
                }

                foreach (var property in current.EnumerateObject())
                {
                    if (property.Value.ValueKind is JsonValueKind.Object or JsonValueKind.Array)
                    {
                        queue.Enqueue(property.Value);
                    }
                }
            }
            else if (current.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in current.EnumerateArray())
                {
                    if (item.ValueKind is JsonValueKind.Object or JsonValueKind.Array)
                    {
                        queue.Enqueue(item);
                    }
                }
            }
        }
    }

    [GeneratedRegex(@"<script[^>]*type\s*=\s*[""']application/json[""'][^>]*>(?<json>.*?)</script>",
        RegexOptions.Singleline | RegexOptions.IgnoreCase)]
    private static partial Regex JsonScript();

    // Astro writes island props as an HTML-escaped JSON attribute
    [GeneratedRegex(@"props\s*=\s*""(?<json>[^""]*)""", RegexOptions.Singleline)]
    private static partial Regex PropsAttribute();
}

/// <summary>
/// Astro serialises island props as <c>[tag, value]</c> pairs - 0 for a value, 1 for a
/// container whose entries are <c>["key", [tag, value]]</c> pairs or plain wrapped values.
/// The same tagging shows up in poe.ninja's own JSON, so unwrapping is worth having once.
/// </summary>
internal static class AstroJson
{
    public static JsonNode? Unwrap(JsonElement element) => element.ValueKind switch
    {
        JsonValueKind.Object => UnwrapObject(element),
        JsonValueKind.Array => UnwrapArray(element),
        JsonValueKind.String => JsonValue.Create(element.GetString()),
        JsonValueKind.Number => element.TryGetInt64(out var whole)
            ? JsonValue.Create(whole)
            : JsonValue.Create(element.GetDouble()),
        JsonValueKind.True => JsonValue.Create(true),
        JsonValueKind.False => JsonValue.Create(false),
        _ => null,
    };

    private static JsonObject UnwrapObject(JsonElement element)
    {
        var result = new JsonObject();
        foreach (var property in element.EnumerateObject())
        {
            result[property.Name] = Unwrap(property.Value);
        }

        return result;
    }

    private static JsonNode? UnwrapArray(JsonElement element)
    {
        if (IsTagged(element, out var tag))
        {
            return tag == 0 ? Unwrap(element[1]) : UnwrapContainer(element[1]);
        }

        var array = new JsonArray();
        foreach (var item in element.EnumerateArray())
        {
            array.Add(Unwrap(item));
        }

        return array;
    }

    private static JsonNode? UnwrapContainer(JsonElement value)
    {
        if (value.ValueKind != JsonValueKind.Array)
        {
            return Unwrap(value);
        }

        var entries = value.EnumerateArray().ToList();
        var isDictionary = entries.Count > 0 && entries.All(entry =>
            entry.ValueKind == JsonValueKind.Array &&
            entry.GetArrayLength() == 2 &&
            entry[0].ValueKind == JsonValueKind.String);

        if (!isDictionary)
        {
            var array = new JsonArray();
            foreach (var entry in entries)
            {
                array.Add(Unwrap(entry));
            }

            return array;
        }

        var result = new JsonObject();
        foreach (var entry in entries)
        {
            result[entry[0].GetString()!] = Unwrap(entry[1]);
        }

        return result;
    }

    private static bool IsTagged(JsonElement element, out int tag)
    {
        tag = -1;
        return element.ValueKind == JsonValueKind.Array &&
               element.GetArrayLength() == 2 &&
               element[0].ValueKind == JsonValueKind.Number &&
               element[0].TryGetInt32(out tag) &&
               tag is 0 or 1;
    }
}
