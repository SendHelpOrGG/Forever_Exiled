using System.Net;
using System.Text.RegularExpressions;
using ForeverExiled.Core.Formatting;
using ForeverExiled.Core.Models;

namespace ForeverExiled.Core.Net;

/// <summary>
/// Reads the builds table out of poe.ninja's own HTML. The search API hands back protobuf and
/// rate-limits a per-skill crawl; the page is server-rendered, cached, and shows the same rows
/// with the same DPS column - so it is what a skill's ladder is read from.
/// </summary>
/// <remarks>
/// Parsing works off the character links rather than a table structure: each row is the slice
/// of markup between one character link and the next, and the numbers are found inside it. The
/// site's markup has changed shape before (table cells, then grid divs), and anchoring on the
/// one thing a row cannot do without - its link to the character - survives that.
/// </remarks>
public static partial class BuildsPageScraper
{
    /// <summary>The page the site itself shows for a league, optionally filtered to one skill.</summary>
    public static string PagePath(string leagueSlug, string? skill = null, string? sort = "dps")
    {
        var query = new List<string>();

        if (!string.IsNullOrWhiteSpace(skill))
        {
            query.Add("skills=" + Uri.EscapeDataString(skill));
        }

        if (!string.IsNullOrWhiteSpace(sort))
        {
            query.Add("sort=" + sort);
        }

        var page = $"poe1/builds/{leagueSlug}";
        return query.Count > 0 ? page + "?" + string.Join("&", query) : page;
    }

    /// <summary>
    /// The ladder rows in the page, highest DPS first. A row whose DPS cannot be identified is
    /// dropped rather than guessed: a list sorted on a wrong number is worse than a short one.
    /// </summary>
    public static List<BuildRef> ParseBuilds(string html, string? skillFallback = null)
    {
        var builds = new List<BuildRef>();

        if (string.IsNullOrWhiteSpace(html))
        {
            return builds;
        }

        var links = CharacterLink().Matches(html);
        for (var index = 0; index < links.Count; index++)
        {
            var link = links[index];
            var start = link.Index + link.Length;
            var end = index + 1 < links.Count
                ? links[index + 1].Index
                : Math.Min(html.Length, start + 800);

            if (end <= start)
            {
                continue;
            }

            var build = ParseRow(html[start..end], link, skillFallback);
            if (build is not null)
            {
                builds.Add(build);
            }
        }

        return builds
            .OrderByDescending(build => build.Dps)
            .ToList();
    }

    private static BuildRef? ParseRow(string rowHtml, Match link, string? skillFallback)
    {
        // the gem icon sits at the end of the DPS cell, so the number just before it is the
        // DPS - the life / ES / EHP cells also carry "8.6k" style values and come first
        var gemIndex = rowHtml.IndexOf("/Gems/", StringComparison.OrdinalIgnoreCase);

        var tokens = TextToken().Matches(rowHtml)
            .Select(match => new Token(match.Groups["value"].Value.Trim(), match.Index))
            .Where(token => token.Value.Length > 0)
            .ToList();

        double dps = 0;
        if (gemIndex >= 0)
        {
            var before = tokens.LastOrDefault(token => token.Index < gemIndex);
            if (before is not null)
            {
                dps = DpsParser.Parse(before.Value);
            }
        }

        // without a gem icon there is no anchor for the DPS cell, so fall back to the first
        // number with a size suffix - but only then: with an anchor, a suffixed number is
        // likelier to be the EHP cell than a DPS value, and guessing there is how a ladder
        // ends up ordered by hit points
        if (dps <= 0 && gemIndex < 0)
        {
            var suffixed = tokens.FirstOrDefault(token => UnitSuffix().IsMatch(token.Value));
            if (suffixed is not null)
            {
                dps = DpsParser.Parse(suffixed.Value);
            }
        }

        if (dps <= 0)
        {
            return null;
        }

        var level = 0;
        foreach (var token in tokens)
        {
            if (int.TryParse(token.Value, out var parsed) && parsed is >= 1 and <= 100)
            {
                level = parsed;
                break;
            }
        }

        var skill = ImageAltContaining("/Gems/", rowHtml);
        if (skill.Length == 0)
        {
            skill = ImageNameContaining("/Gems/", rowHtml);
        }

        if (skill.Length == 0)
        {
            skill = skillFallback ?? string.Empty;
        }

        var className = ImageAltContaining("/classes/", rowHtml);
        if (className.Length == 0)
        {
            className = ImageNameContaining("/classes/", rowHtml);
        }

        return new BuildRef
        {
            Name = WebUtility.UrlDecode(link.Groups["name"].Value),
            Account = WebUtility.UrlDecode(link.Groups["account"].Value),
            ClassName = className,
            MainSkill = skill,
            Level = level,
            Dps = dps,
        };
    }

    /// <summary>The alt text of the first image whose src contains <paramref name="pathPart"/>.</summary>
    private static string ImageAltContaining(string pathPart, string html)
    {
        foreach (Match image in ImageTag().Matches(html))
        {
            if (!Src(image.Value).Contains(pathPart, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var alt = Clean(Alt(image.Value));
            if (alt.Length > 0)
            {
                return alt;
            }
        }

        return string.Empty;
    }

    /// <summary>"FrostFury" for an image with no alt text - readable, if not perfect.</summary>
    private static string ImageNameContaining(string pathPart, string html)
    {
        foreach (Match image in ImageTag().Matches(html))
        {
            var src = Src(image.Value);
            if (!src.Contains(pathPart, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var file = src.Split('/').LastOrDefault() ?? string.Empty;
            var stem = file.Contains('.') ? file[..file.LastIndexOf('.')] : file;
            if (stem.Length > 0)
            {
                return Clean(stem);
            }
        }

        return string.Empty;
    }

    private static string Src(string tag) => Attribute(tag, "src");

    private static string Alt(string tag) => Attribute(tag, "alt");

    private static string Attribute(string tag, string name)
    {
        var match = Regex.Match(
            tag,
            "\\b" + Regex.Escape(name) + "\\s*=\\s*\"(?<value>[^\"]*)\"",
            RegexOptions.IgnoreCase);

        return match.Success ? match.Groups["value"].Value : string.Empty;
    }

    private static string Clean(string text) =>
        Regex.Replace(WebUtility.HtmlDecode(text).Replace('\u00A0', ' '), @"\s+", " ").Trim();

    private sealed record Token(string Value, int Index);

    [GeneratedRegex(@"/character/(?<account>[^/""#?]+)/(?<name>[^/""#?]+)", RegexOptions.IgnoreCase)]
    private static partial Regex CharacterLink();

    /// <summary>The visible text between two tags - one cell's worth of markup.</summary>
    [GeneratedRegex(@">\s*(?<value>[^<>]+?)\s*<", RegexOptions.Singleline)]
    private static partial Regex TextToken();

    [GeneratedRegex(@"[\d.,]+\s*[kmbgKMBG]\b")]
    private static partial Regex UnitSuffix();

    [GeneratedRegex(@"<img\b[^>]*>", RegexOptions.Singleline | RegexOptions.IgnoreCase)]
    private static partial Regex ImageTag();
}
