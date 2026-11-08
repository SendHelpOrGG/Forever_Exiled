using ForeverExiled.Core.Net;
using Xunit;

namespace ForeverExiled.Core.Tests;

public class BuildsPageScraperTests
{
    // one row of the site's builds table: name link, level + class icon, life, es, ehp,
    // dps + main gem icon, keystones
    private const string Page = """
        <html><body><table><tbody>
        <tr>
          <td><a href="https://poe.ninja/poe1/builds/allflame/character/Inkaros-6726/LilUglyMane#i=0&amp;search=sort%3Ddps">LilUglyMane</a></td>
          <td>100<img src="https://assets.poe.ninja/poe1/classes/berserker.webp" alt="Berserker"></td>
          <td>1670</td><td>42686</td><td>8.6k</td>
          <td>417.9B<br><img src="https://web.poecdn.com/gen/image/WzMwLDE0LHsiZiI6IjJESXRlbXMvR2Vtcy9UZWN0b25pY1NsYW0iLCJ3IjoxfV0/51d5a34075/TectonicSlam.png" alt="Tectonic Slam of Cataclysm"></td>
          <td><img src="https://assets.poe.ninja/poe1/Art/2DArt/SkillIcons/passives/LightningPureElementalCasterKeystone.webp" alt="Roiling Tempest"></td>
        </tr>
        <tr>
          <td><a href="https://poe.ninja/poe1/builds/allflame/character/kystertrue-3756/kyster_true#i=1&amp;search=sort%3Ddps">kyster_true</a></td>
          <td>100<img src="https://assets.poe.ninja/poe1/classes/assassin.webp" alt="Assassin"></td>
          <td>1405</td><td>163</td><td>0.5k</td>
          <td>8.7B<br><img src="https://web.poecdn.com/gen/image/xyz/IceTrapRune.png" alt="Ice Trap"></td>
          <td></td>
        </tr>
        <tr>
          <td><a href="https://poe.ninja/poe1/builds/allflame/character/noMercy-9122/Allflame_Yas#i=2&amp;search=sort%3Ddps">Allflame_Yas</a></td>
          <td>100<img src="https://assets.poe.ninja/poe1/classes/slayer.webp" alt="Slayer"></td>
          <td>2178</td><td>81</td><td>19k</td>
          <td>5.2B<br><img src="https://web.poecdn.com/gen/image/xyz/Frenzy.png" alt="Frenzy of Onslaught"></td>
          <td></td>
        </tr>
        <tr><td colspan="7">arbitrary footer cell with no character link</td></tr>
        </tbody></table></body></html>
        """;

    [Fact]
    public void Reads_the_rows_of_the_builds_table()
    {
        var builds = BuildsPageScraper.ParseBuilds(Page, "Righteous Fire");

        Assert.Equal(3, builds.Count);

        // highest DPS first, whatever order the page used
        Assert.Equal("LilUglyMane", builds[0].Name);
        Assert.Equal(417_900_000_000d, builds[0].Dps);
        Assert.Equal("Inkaros-6726", builds[0].Account);
        Assert.Equal("Berserker", builds[0].ClassName);
        Assert.Equal("Tectonic Slam of Cataclysm", builds[0].MainSkill);
        Assert.Equal(100, builds[0].Level);

        Assert.Equal("kyster_true", builds[1].Name);
        Assert.Equal(8_700_000_000d, builds[1].Dps);
        Assert.Equal("kystertrue-3756", builds[1].Account);
        Assert.Equal("Ice Trap", builds[1].MainSkill);
        Assert.Equal("Assassin", builds[1].ClassName);

        Assert.Equal("Allflame_Yas", builds[2].Name);
        Assert.Equal(5_250_000_000d, builds[2].Dps);
        Assert.Equal("Slayer", builds[2].ClassName);
    }

    [Fact]
    public void Falls_back_to_the_requested_skill_when_a_row_has_no_gem_alt()
    {
        var page = Page.Replace("alt=\"Ice Trap\"", string.Empty, StringComparison.Ordinal);

        var builds = BuildsPageScraper.ParseBuilds(page, "Righteous Fire");
        var build = builds.Single(b => b.Name == "kyster_true");

        Assert.Equal("IceTrapRune", build.MainSkill);
    }

    [Fact]
    public void A_page_without_a_dps_column_yields_nothing_rather_than_guesses()
    {
        var page = Page.Replace("417.9B", "n/a", StringComparison.Ordinal)
                       .Replace("8.7B", "n/a", StringComparison.Ordinal)
                       .Replace("5.2B", "n/a", StringComparison.Ordinal);

        Assert.Empty(BuildsPageScraper.ParseBuilds(page));
        Assert.Empty(BuildsPageScraper.ParseBuilds(string.Empty));
    }

    [Fact]
    public void Builds_the_page_the_site_shows_for_a_skill()
    {
        Assert.Equal(
            "poe1/builds/allflame?skills=Righteous%20Fire&sort=dps",
            BuildsPageScraper.PagePath("allflame", "Righteous Fire"));

        Assert.Equal(
            "poe1/builds/allflame?sort=dps",
            BuildsPageScraper.PagePath("allflame", null));
    }
}
