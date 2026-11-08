using System.Text.Json;
using ForeverExiled.Core.Analysis;
using ForeverExiled.Core.Formatting;
using ForeverExiled.Core.Models;
using ForeverExiled.Core.Net;
using Xunit;

namespace ForeverExiled.Core.Tests;

public class DpsParserTests
{
    [Theory]
    [InlineData("425.0M", 425_000_000d)]
    [InlineData("70.2M", 70_200_000d)]
    [InlineData("1.2B", 1_200_000_000d)]
    [InlineData("12.5K", 12_500d)]
    [InlineData("198", 198d)]
    [InlineData("3.4M DPS", 3_400_000d)]
    [InlineData("1,234", 1234d)]
    [InlineData("", 0d)]
    [InlineData(null, 0d)]
    [InlineData("–", 0d)]
    public void Parses_every_dps_shape(string? text, double expected) =>
        Assert.Equal(expected, DpsParser.Parse(text), 3);

    [Theory]
    [InlineData(425_000_000d, "425M")]
    [InlineData(70_200_000d, "70.2M")]
    [InlineData(1_200_000_000d, "1.20B")]
    [InlineData(0d, "–")]
    public void Formats_compactly(double value, string expected) =>
        Assert.Equal(expected, DpsFormatter.Format(value));
}

public class SearchResponseParserTests
{
    [Fact]
    public void Decodes_total_dimension_dictionaries_and_rows()
    {
        var fixture = ProtoFixture.BuildSearchResponse();

        var response = SearchResponseParser.Parse(fixture.Payload);

        Assert.Equal(13262, response.Total);
        Assert.Single(response.Dimensions);
        Assert.Equal("skills", response.Dimensions[0].Id);
        Assert.Equal("gem", response.Dimensions[0].DictionaryId);
        Assert.Equal("hash-class", response.DictionaryHashes["class"]);
        Assert.Equal("hash-gem", response.DictionaryHashes["gem"]);

        var resolved = response.ResolveDimension(response.Dimensions[0], fixture.Dictionaries);
        Assert.Equal(3, resolved.Count);
        Assert.Equal("Molten Strike of the Zenith", resolved[0].Name);
        Assert.Equal(1114, resolved[0].Count);

        var rows = SearchResponseParser.ExtractRows(response, fixture.Dictionaries);
        Assert.Equal(4, rows.Count);

        Assert.Equal("ZenithJugg", rows[0].Name);
        Assert.Equal("acc_1", rows[0].Account);
        Assert.Equal("Juggernaut", rows[0].ClassName);
        Assert.Equal("Molten Strike of the Zenith", rows[0].MainSkill);
        Assert.Equal(425_000_000d, rows[0].Dps, 3);
        Assert.Equal(100, rows[0].Level);

        Assert.Equal("Winter Orb", rows[3].MainSkill);
        Assert.Equal("Occultist", rows[3].ClassName);
        Assert.Equal(138_500_000d, rows[3].Dps, 3);
    }

    private static byte[] BuildColumnResponse(params byte[][] columns)
    {
        var result = ProtoFixture.Concat(
            ProtoFixture.FieldVarint(1, 2),
            columns.Select(c => ProtoFixture.FieldBytes(12, c)).ToArray());
        return ProtoFixture.FieldBytes(1, result);
    }

    private static byte[] Column(string name, params string[] strings)
    {
        var parts = new List<byte[]> { ProtoFixture.FieldString(1, name) };
        parts.AddRange(strings.Select(value => ProtoFixture.FieldString(7, value)));
        parts.Add(ProtoFixture.FieldVarint(13, (ulong)strings.Length));
        return ProtoFixture.Concat(parts.ToArray());
    }

    private static byte[] NumericColumn(string name, params long[] numbers) =>
        ProtoFixture.Concat(
            ProtoFixture.FieldString(1, name),
            ProtoFixture.FieldBytes(6, ProtoFixture.Packed(numbers)),
            ProtoFixture.FieldVarint(13, (ulong)numbers.Length));

    [Fact]
    public void Guesses_the_dps_column_when_its_name_is_unfamiliar()
    {
        // poe.ninja renames columns between seasons; the ladder's damage numbers are the
        // ones in the millions, so they identify themselves
        var payload = BuildColumnResponse(
            Column("name", "TopDog", "RunnerUp"),
            Column("league", "Allflame", "Allflame"),
            NumericColumn("level", 100, 99),
            Column("damage_per_second", "900.0M", "850.0M"));

        var response = SearchResponseParser.Parse(payload);
        var rows = SearchResponseParser.ExtractRows(response, new Dictionary<string, string[]>());

        Assert.Equal(2, rows.Count);
        Assert.Equal(900_000_000d, rows[0].Dps, 3);
        Assert.Equal(850_000_000d, rows[1].Dps, 3);
    }

    [Fact]
    public void Leaves_dps_at_zero_when_nothing_looks_like_damage()
    {
        var payload = BuildColumnResponse(
            Column("name", "TopDog"),
            NumericColumn("level", 100));

        var response = SearchResponseParser.Parse(payload);
        var rows = SearchResponseParser.ExtractRows(response, new Dictionary<string, string[]>());

        Assert.Single(rows);
        Assert.Equal(0d, rows[0].Dps, 3);
    }

    [Fact]
    public void Describe_reports_an_aggregate_only_response()
    {
        // what poe.ninja sends when it answers with popularity but no ladder rows
        var dimension = ProtoFixture.Concat(
            ProtoFixture.FieldString(1, "skills"),
            ProtoFixture.FieldString(2, "gem"),
            ProtoFixture.FieldBytes(3, ProtoFixture.Concat(
                ProtoFixture.FieldVarint(1, 2),
                ProtoFixture.FieldVarint(2, 1114))));
        var result = ProtoFixture.Concat(
            ProtoFixture.FieldVarint(1, 13262),
            ProtoFixture.FieldBytes(2, dimension));
        var payload = ProtoFixture.FieldBytes(1, result);

        var response = SearchResponseParser.Parse(payload);

        Assert.Equal(13262, response.Total);
        Assert.Empty(response.Columns);
        Assert.Equal(0, response.RowCount);
        Assert.Empty(SearchResponseParser.ExtractRows(response, new Dictionary<string, string[]>()));

        var described = SearchResponseParser.Describe(response);
        Assert.Contains("total=13262", described);
        Assert.Contains("dimensions=1", described);
        Assert.Contains("rows=0", described);
        Assert.Contains("columns=[none]", described);
    }

    [Fact]
    public void Describe_names_the_columns_it_did_get()
    {
        var fixture = ProtoFixture.BuildSearchResponse();

        var described = SearchResponseParser.Describe(SearchResponseParser.Parse(fixture.Payload));

        Assert.Contains("rows=4", described);
        Assert.Contains("name(rows:4", described);
        Assert.Contains("dps.total(rows:4", described);
    }

    [Fact]
    public void Rejects_a_response_without_an_envelope()
    {
        var payload = ProtoFixture.Concat(ProtoFixture.FieldVarint(2, 7));
        Assert.Throws<PoeDataException>(() => SearchResponseParser.Parse(payload));
    }

    [Fact]
    public void Decodes_ndic_dictionary()
    {
        var payload = ProtoFixture.Ndic(new[] { "Juggernaut", "Occultist", "Trickster" });

        var values = DictionaryDecoder.Decode(payload);

        Assert.Equal(3, values.Length);
        Assert.Equal("Juggernaut", values[0]);
        Assert.Equal("Trickster", values[2]);
    }

    [Fact]
    public void Decodes_legacy_protobuf_dictionary()
    {
        var payload = ProtoFixture.Concat(
            ProtoFixture.FieldString(1, "gem"),
            ProtoFixture.FieldString(2, "Winter Orb"),
            ProtoFixture.FieldString(2, "Hexblast"));

        var values = DictionaryDecoder.Decode(payload);

        Assert.Equal(new[] { "Winter Orb", "Hexblast" }, values);
    }
}

public class ClusterJewelParserTests
{
    [Fact]
    public void Parses_a_medium_cluster_with_two_notables_and_an_effect_fracture()
    {
        var jewel = ClusterJewelParser.Parse(
            "Medium Cluster Jewel",
            "Entropy Prism",
            "rare",
            84,
            new[] { "Adds 4 Passive Skills", "Added Small Passive Skills grant: 10% increased Projectile Damage" },
            new[] { "1 Added Passive Skill is Eye to Eye", "1 Added Passive Skill is Repeater" },
            new[] { "Added Small Passive Skills have 35% increased Effect" },
            Array.Empty<string>(),
            fractured: true,
            corrupted: false);

        Assert.NotNull(jewel);
        Assert.Equal(ClusterSize.Medium, jewel!.Size);
        Assert.Equal(4, jewel.Passives);
        Assert.Equal(35, jewel.EffectPercent);
        Assert.Equal("10% increased Projectile Damage", jewel.GrantType);
        Assert.Equal(new[] { "Eye to Eye", "Repeater" }, jewel.Notables);
        Assert.Equal("Eye to Eye + Repeater", jewel.ComboLabel);
        Assert.Equal("Medium|Eye to Eye + Repeater", jewel.ComboKey);
    }

    [Fact]
    public void Parses_a_unique_voices_jewel_with_sockets()
    {
        var jewel = ClusterJewelParser.Parse(
            "Large Cluster Jewel",
            "Voices",
            "unique",
            null,
            new[] { "Adds 3 Passive Skills", "3 Added Passive Skills are Jewel Sockets" },
            Array.Empty<string>(),
            Array.Empty<string>(),
            Array.Empty<string>(),
            fractured: false,
            corrupted: false);

        Assert.NotNull(jewel);
        Assert.Equal(ClusterSize.Large, jewel!.Size);
        Assert.Equal(3, jewel.JewelSockets);
        Assert.Equal(3, jewel.Passives);
        Assert.Empty(jewel.Notables);
        Assert.Equal("Large|Voices", jewel.ComboKey);
    }

    [Fact]
    public void Ignores_non_cluster_jewels()
    {
        Assert.Null(ClusterJewelParser.Parse(
            "Cobalt Jewel",
            "Some Rare",
            "rare",
            80,
            Array.Empty<string>(),
            new[] { "1 Added Passive Skill is Eye to Eye" },
            Array.Empty<string>(),
            Array.Empty<string>(),
            false,
            false));

        Assert.Null(ClusterJewelParser.Parse(
            "Cluster Jewel",
            string.Empty,
            "magic",
            null,
            Array.Empty<string>(),
            Array.Empty<string>(),
            Array.Empty<string>(),
            Array.Empty<string>(),
            false,
            false));
    }

    [Fact]
    public void Slugifies_combo_labels()
    {
        Assert.Equal("eye-to-eye-repeater", ClusterJewelParser.Slugify("Eye to Eye + Repeater"));
    }
}

public class CharacterJsonParserTests
{
    private const string Payload = """
    {
      "account": "acc_1",
      "name": "ZenithJugg",
      "class": "Juggernaut",
      "league": "Allflame",
      "level": 100,
      "defensiveStats": { "life": 5400, "energyShield": 120 },
      "jewels": [
        { "itemData": {
            "typeLine": "Large Cluster Jewel",
            "name": "Doom Whorl",
            "rarity": "rare",
            "ilvl": 85,
            "enchantMods": ["Adds 8 Passive Skills", "Added Small Passive Skills grant: 12% increased Fire Damage"],
            "explicitMods": ["1 Added Passive Skill is Devastator",
                             "1 Added Passive Skill is Feed the Fury",
                             "1 Added Passive Skill is Martial Prowess"]
        } }
      ],
      "clusterJewels": [
        { "itemData": {
            "typeLine": "Medium Cluster Jewel",
            "name": "Rune Splinter",
            "enchantMods": ["Adds 4 Passive Skills", "Added Small Passive Skills grant: 10% increased Fire Damage"],
            "explicitMods": ["1 Added Passive Skill is Sadist", "1 Added Passive Skill is Cooked Alive"]
        } }
      ],
      "items": [
        { "typeLine": "Small Cluster Jewel", "name": "Vivid Stone",
          "enchantMods": ["Adds 2 Passive Skills", "Added Small Passive Skills grant: 12% increased Maximum Life"],
          "explicitMods": ["1 Added Passive Skill is Fettle"] }
      ]
    }
    """;

    [Fact]
    public void Collects_cluster_jewels_from_every_payload_shape()
    {
        using var document = JsonDocument.Parse(Payload);

        var snapshot = CharacterJsonParser.Parse(document.RootElement, "acc_1", "ZenithJugg", "Molten Strike of the Zenith", 425_000_000d);

        Assert.Equal("Juggernaut", snapshot.ClassName);
        Assert.Equal(100, snapshot.Level);
        Assert.Equal(5400, snapshot.Life);
        Assert.Equal(3, snapshot.ClusterJewels.Count);

        Assert.Equal(1, snapshot.ClusterJewels.Count(j => j.Size == ClusterSize.Large));
        Assert.Equal(1, snapshot.ClusterJewels.Count(j => j.Size == ClusterSize.Medium));
        Assert.Equal(1, snapshot.ClusterJewels.Count(j => j.Size == ClusterSize.Small));

        var large = snapshot.ClusterJewels.First(j => j.Size == ClusterSize.Large);
        Assert.Equal(8, large.Passives);
        Assert.Equal(3, large.Notables.Count);
        Assert.Equal(425_000_000d, snapshot.Dps, 3);
    }
}

public class SampleDataTests
{
    [Fact]
    public void Bundled_sample_deserialises_with_enum_sizes_and_characters()
    {
        var sample = SampleData.Load();

        Assert.True(sample.Skills.Count >= 10, "expected at least ten sample skills");
        Assert.True(sample.Characters.Count > 50, "expected a meaningful character sample");
        Assert.True(sample.IsSample);
        Assert.Contains(sample.Characters, c => c.ClusterJewels.Any(j => j.Size == ClusterSize.Medium));

        var winterOrb = sample.Skills.FirstOrDefault(s => s.Name == "Winter Orb");
        Assert.NotNull(winterOrb);
        Assert.True(winterOrb!.PopularityPercent >= 1);
    }
}
