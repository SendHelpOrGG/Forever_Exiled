using System.Buffers.Binary;
using System.Text;

namespace ForeverExiled.Core.Tests;

/// <summary>
/// Builds the exact wire format poe.ninja returns, so the decoder is tested against bytes
/// and not against a re-implementation of the parser.
/// </summary>
internal static class ProtoFixture
{
    public static byte[] Varint(ulong value)
    {
        var buffer = new List<byte>();
        do
        {
            var current = (byte)(value & 0x7F);
            value >>= 7;
            if (value != 0)
            {
                current |= 0x80;
            }

            buffer.Add(current);
        }
        while (value != 0);

        return buffer.ToArray();
    }

    public static byte[] FieldVarint(int number, ulong value) =>
        Concat(Varint((ulong)((number << 3) | 0)), Varint(value));

    public static byte[] FieldBytes(int number, byte[] payload) =>
        Concat(Varint((ulong)((number << 3) | 2)), Varint((ulong)payload.Length), payload);

    public static byte[] FieldString(int number, string text) =>
        FieldBytes(number, Encoding.UTF8.GetBytes(text));

    public static byte[] Packed(IEnumerable<long> values)
    {
        var bytes = new List<byte>();
        foreach (var value in values)
        {
            bytes.AddRange(Varint(unchecked((ulong)value)));
        }

        return bytes.ToArray();
    }

    public static byte[] Concat(params byte[][] parts)
    {
        var length = parts.Sum(p => p.Length);
        var result = new byte[length];
        var offset = 0;
        foreach (var part in parts)
        {
            Array.Copy(part, 0, result, offset, part.Length);
            offset += part.Length;
        }

        return result;
    }

    /// <summary>Encodes a poe.ninja "NDIC" dictionary container (44-byte header, LE).</summary>
    public static byte[] Ndic(IReadOnlyList<string> values, int blocks = 2)
    {
        var header = new byte[44 + ((blocks - 1) * 8)];
        Encoding.ASCII.GetBytes("NDIC").CopyTo(header, 0);
        BinaryPrimitives.WriteUInt32LittleEndian(header.AsSpan(4, 4), 1);
        BinaryPrimitives.WriteUInt32LittleEndian(header.AsSpan(8, 4), 0);
        BinaryPrimitives.WriteUInt32LittleEndian(header.AsSpan(12, 4), (uint)values.Count);
        BinaryPrimitives.WriteUInt64LittleEndian(header.AsSpan(16, 8), 0xDEADBEEFUL);
        BinaryPrimitives.WriteUInt32LittleEndian(header.AsSpan(24, 4), 16);
        BinaryPrimitives.WriteUInt32LittleEndian(header.AsSpan(28, 4), (uint)blocks);
        BinaryPrimitives.WriteUInt32LittleEndian(header.AsSpan(32, 4), (uint)values.Count);
        BinaryPrimitives.WriteUInt64LittleEndian(header.AsSpan(36, 8), 0);

        var body = new List<byte>(values.Count * 8);
        foreach (var value in values)
        {
            body.Add((byte)value.Length);
        }

        foreach (var value in values)
        {
            body.AddRange(Encoding.UTF8.GetBytes(value));
        }

        return Concat(header, body.ToArray());
    }

    public sealed class SearchFixture
    {
        public byte[] Payload { get; init; } = Array.Empty<byte>();

        public Dictionary<string, string[]> Dictionaries { get; init; } = new();
    }

    /// <summary>A miniature search response: two skill buckets and four ladder rows.</summary>
    public static SearchFixture BuildSearchResponse()
    {
        var classes = new[] { "Juggernaut", "Occultist", "Trickster" };
        var gems = new[] { "Molten Strike of the Zenith", "Hexblast", "Winter Orb" };

        var rows = new[]
        {
            new { Name = "ZenithJugg", Account = "acc_1", Class = 0, Level = 100, Dps = "425.0M", Skill = 0 },
            new { Name = "MoltenFist", Account = "acc_2", Class = 1, Level = 99, Dps = "198.4M", Skill = 0 },
            new { Name = "HexTrick", Account = "acc_3", Class = 2, Level = 100, Dps = "198.0M", Skill = 1 },
            new { Name = "OrbOccult", Account = "acc_4", Class = 1, Level = 98, Dps = "138.5M", Skill = 2 },
        };

        byte[] Column(string name, string[]? strings = null, long[]? numbers = null, string? dictionary = null)
        {
            var parts = new List<byte[]> { FieldString(1, name) };

            if (numbers is not null)
            {
                parts.Add(FieldBytes(6, Packed(numbers)));
            }

            if (strings is not null)
            {
                foreach (var text in strings)
                {
                    parts.Add(FieldString(7, text));
                }
            }

            if (dictionary is not null)
            {
                parts.Add(FieldString(11, dictionary));
            }

            parts.Add(FieldVarint(13, (ulong)rows.Length));
            return Concat(parts.ToArray());
        }

        var columns = new[]
        {
            Column("name", strings: rows.Select(r => r.Name).ToArray()),
            Column("account", strings: rows.Select(r => r.Account).ToArray()),
            Column("class", numbers: rows.Select(r => (long)r.Class).ToArray(), dictionary: "class"),
            Column("level", numbers: rows.Select(r => (long)r.Level).ToArray()),
            Column("dps.total", strings: rows.Select(r => r.Dps).ToArray()),
            Column("skills", numbers: rows.Select(r => (long)r.Skill).ToArray(), dictionary: "gem"),
        };

        var skillDimension = Concat(
            FieldString(1, "skills"),
            FieldString(2, "gem"),
            Concat(
                FieldBytes(3, Concat(FieldVarint(1, 0), FieldVarint(2, 1114))),
                FieldBytes(3, Concat(FieldVarint(1, 1), FieldVarint(2, 1048))),
                FieldBytes(3, Concat(FieldVarint(1, 2), FieldVarint(2, 477)))));

        var result = Concat(
            FieldVarint(1, 13262),
            FieldBytes(2, skillDimension),
            FieldBytes(6, Concat(FieldString(1, "class"), FieldString(2, "hash-class"))),
            FieldBytes(6, Concat(FieldString(1, "gem"), FieldString(2, "hash-gem"))),
            Concat(columns.Select(c => FieldBytes(12, c)).ToArray()));

        return new SearchFixture
        {
            Payload = FieldBytes(1, result),
            Dictionaries = new Dictionary<string, string[]>
            {
                ["class"] = classes,
                ["gem"] = gems,
            },
        };
    }
}
