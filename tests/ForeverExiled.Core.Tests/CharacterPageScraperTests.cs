using ForeverExiled.Core.Net;
using Xunit;

namespace ForeverExiled.Core.Tests;

public class CharacterPageScraperTests
{
    // an Astro island carrying a character: [0, value] for values, [1, [[key, [0, value]], ...]]
    // for containers - the shape poe.ninja's own pages use
    private const string IslandPage = """
        <html><body>
        <astro-island component-url="/_astro/character.js" props="{&quot;character&quot;:[1,[[&quot;name&quot;,[0,&quot;Tester&quot;]],[&quot;class&quot;,[0,&quot;Assassin&quot;]],[&quot;level&quot;,[0,100]],[&quot;clusterJewels&quot;,[1,[[0,{&quot;typeLine&quot;:[0,&quot;Veteran Defender Large Cluster Jewel&quot;],&quot;name&quot;:[0,&quot;Blight Wound&quot;],&quot;ilvl&quot;:[0,84],&quot;explicitMods&quot;:[1,[[0,&quot;1 Added Passive Skill is Veteran Defender&quot;],[0,&quot;Added Small Passive Skills grant: 12% increased Cold Damage&quot;]]]}]]]]]]}"></astro-island>
        </body></html>
        """;

    [Fact]
    public void Reads_a_character_out_of_an_astro_island()
    {
        var snapshot = CharacterPageScraper.Parse(IslandPage, "kystertrue-3756", "kyster_true", "Winter Orb", 1_200_000_000);

        Assert.NotNull(snapshot);
        Assert.Single(snapshot!.ClusterJewels);
        Assert.Equal("Veteran Defender Large Cluster Jewel", snapshot.ClusterJewels[0].BaseType);
        Assert.Contains("Veteran Defender", snapshot.ClusterJewels[0].Notables);
        Assert.Equal("Winter Orb", snapshot.MainSkill);
        Assert.Equal(1_200_000_000d, snapshot.Dps);
    }

    [Fact]
    public void Reads_a_character_out_of_a_json_script_block()
    {
        var page = """
            <html><body><script type="application/json" id="data">
            {"character":{"name":"Plain","clusterJewels":[{"typeLine":"Foe Glimmer Medium Cluster Jewel",
            "explicitMods":["1 Added Passive Skill is Eye to Eye"]}]}}
            </script></body></html>
            """;

        var snapshot = CharacterPageScraper.Parse(page, "acct", "Plain");

        Assert.NotNull(snapshot);
        Assert.Single(snapshot!.ClusterJewels);
        Assert.Contains("Eye to Eye", snapshot.ClusterJewels[0].Notables);
    }

    [Fact]
    public void A_page_without_item_data_is_null_so_the_endpoint_can_be_asked()
    {
        var page = """
            <html><body><h1>kyster_true</h1><p>Level 100 Assassin</p>
            <h3>Cluster Jewels</h3><p>Blight Wound Large Cluster Jewel</p></body></html>
            """;

        Assert.Null(CharacterPageScraper.Parse(page, "acct", "kyster_true"));
        Assert.Null(CharacterPageScraper.Parse(string.Empty, "acct", "kyster_true"));
    }

    [Fact]
    public void Builds_the_page_path_the_site_links_to()
    {
        Assert.Equal(
            "poe1/builds/allflame/character/kystertrue-3756/kyster_true",
            CharacterPageScraper.PagePath("allflame", "kystertrue#3756", "kyster_true"));
    }

    [Fact]
    public void Escapes_characters_with_spaces_or_odd_glyphs()
    {
        var path = CharacterPageScraper.PagePath("allflame", "NoMercy#9122", "Allflame Yas");

        Assert.Equal("poe1/builds/allflame/character/nomercy-9122/Allflame%20Yas", path);
    }
}
