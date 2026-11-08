using System.Net;
using System.Text.RegularExpressions;
using ForeverExiled.Core.Formatting;
using ForeverExiled.Core.Models;

namespace ForeverExiled.Core.Net;

/// <summary>
/// Reads the builds table out of poe.ninja's own HTML. The search API hands back protobuf and
/// rate-limits a per-skill crawl; the page is server-rendered, cached, and shows the same rows
/// with the same DPS column - so when a skill's search will not answer, this is the fallback
/// that keeps the rail honest instead of showing a dash.
/// </summary>
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
    /// The ladder rows in the page, highest DPS first. A row without a recognisable DPS cell is
    /// dropped rather than guessed: a list sorted on a wrong number is worse than a short one.
    /// </summary>
    public static List<BuildRef> ParseBuilds(string html, string? skillFallback = null)
    {
        var builds = new List<BuildRef>();

        if (string.IsNullOrWhiteSpace(html))
        {
            return builds;
        }

        foreach (Match row in TableRow().Matches(html))
        {
            var build = ParseRow(row.Value, skillFallback);
            if (build is not null)
            {
                builds.Add(build);
            }
        }

        return builds
            .OrderByDescending(build => build.Dps)
            .ToList();
    }

    private static BuildRef? ParseRow(string rowHtml, string? skillFallback)
    {
        var link = CharacterLink().Match(rowHtml);
        if (!link.Success)
        {
            return null;
        }

        var cells = Cell().Matches(rowHtml)
            .Select(match => new TableCell(match.Groups["inner"].Value))
            .ToList();

        if (cells.Count < 3)
        {
            return null;
        }

        // the DPS cell is the one holding the skill's gem icon; the keystone column carries
        // icons too, but those live under SkillIcons, not Gems
        var dpsIndex = cells.FindIndex(cell => cell.Html.Contains("/Gems/", StringComparison.OrdinalIgnoreCase));
        if (dpsIndex < 0)
        {
            return null;
        }

        var dps = DpsParser.Parse(FirstToken(cells[dpsIndex].Text));
        if (dps <= 0)
        {
            return null;
        }

        var skill = ImageAltContaining("/Gems/", cells[dpsIndex].Html);
        if (skill.Length == 0)
        {
            skill = ImageNameContaining("/Gems/", cells[dpsIndex].Html);
        }

        if (skill.Length == 0)
        {
            skill = skillFallback ?? string.Empty;
        }

        var level = 0;
        if (dpsIndex >= 4 && int.TryParse(cells[dpsIndex - 4].Text, out var parsedLevel))
        {
            level = parsedLevel;
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
            var src = Attribute(image.Value, "src");
            if (!src.Contains(pathPart, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var alt = Clean(Attribute(image.Value, "alt"));
            if (alt.Length > 0)
            {
                return alt;
            }
        }

        return string.Empty;
    }

    /// <summary>"WinterOrb.png" for an image with no alt text - readable, if not perfect.</summary>
    private static string ImageNameContaining(string pathPart, string html)
    {
        foreach (Match image in ImageTag().Matches(html))
        {
            var src = Attribute(image.Value, "src");
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

    private static string Attribute(string tag, string name) =>
        AttributePattern(name).Match(tag) is { Success: true } match ? match.Groups["value"].Value : string.Empty;

    private static Regex AttributePattern(string name) => new(
        "\\b" + Regex.Escape(name) + "\\s*=\\s*\"(?<value>[^\"]*)\"",
        RegexOptions.IgnoreCase);

    private static string FirstToken(string text) =>
        text.Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault()?.Trim() ?? string.Empty;

    private static string Clean(string text) =>
        Regex.Replace(WebUtility.HtmlDecode(text).Replace('\u00A0', ' '), @"\s+", " ").Trim();

    /// <summary>One table cell: its markup for image lookups, its text for numbers.</summary>
    private sealed record TableCell(string Html)
    {
        public string Text { get; } = Clean(Tag().Replace(Html, " "));
    }

    [GeneratedRegex(@"<tr\b[^>]*>(?<row>.*?)</tr>", RegexOptions.Singleline | RegexOptions.IgnoreCase)]
    private static partial Regex TableRow();

    [GeneratedRegex(@"<td\b[^>]*>(?<inner>.*?)</td>", RegexOptions.Singleline | RegexOptions.IgnoreCase)]
    private static partial Regex Cell();

    [GeneratedRegex(@"<[^>]+>", RegexOptions.Singleline)]
    private static partial Regex Tag();

    [GeneratedRegex(@"/character/(?<account>[^/""#?]+)/(?<name>[^/""#?]+)", RegexOptions.IgnoreCase)]
    private static partial Regex CharacterLink();

    [GeneratedRegex(@"<img\b[^>]*>", RegexOptions.Singleline | RegexOptions.IgnoreCase)]
    private static partial Regex ImageTag();
}
