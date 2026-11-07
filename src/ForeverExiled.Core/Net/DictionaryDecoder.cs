using System.Buffers.Binary;
using System.Text;

namespace ForeverExiled.Core.Net;

/// <summary>
/// Decodes <c>/poe1/api/builds/dictionary/{hash}</c>. Current snapshots wrap the value
/// table in a custom "NDIC" container; older ones still return a plain protobuf message
/// (<c>1: id</c>, <c>2: repeated value</c>). Both shapes are supported.
///
/// NDIC layout (all little-endian):
///   "NDIC" | u32 version | u32 reserved | u32 count | u64 hash |
///   u32 (=16) | u32 n | u32 count | u64 (0)
///   (n-1) x { u32 offset, u32 size }   ancillary blocks we do not read
///   count x u8 length
///   concatenated UTF-8 string bytes
/// </summary>
public static class DictionaryDecoder
{
    private const int HeaderLength = 44;

    public static string[] Decode(byte[] payload)
    {
        ArgumentNullException.ThrowIfNull(payload);

        if (payload.Length >= HeaderLength &&
            payload[0] == (byte)'N' && payload[1] == (byte)'D' && payload[2] == (byte)'I' && payload[3] == (byte)'C')
        {
            return DecodeNdic(payload);
        }

        return DecodeLegacyProtobuf(payload);
    }

    private static string[] DecodeNdic(byte[] payload)
    {
        try
        {
            var count = (int)BinaryPrimitives.ReadUInt32LittleEndian(payload.AsSpan(12, 4));
            var blockCount = (int)BinaryPrimitives.ReadUInt32LittleEndian(payload.AsSpan(28, 4));
            var lengthOffset = HeaderLength + ((blockCount - 1) * 8);

            if (blockCount < 1 || lengthOffset < 0 || lengthOffset + count > payload.Length)
            {
                throw new PoeDataException(
                    $"Malformed NDIC dictionary (blocks={blockCount}, entries={count}, length={payload.Length}).");
            }

            var strings = new List<string>(count);
            var cursor = lengthOffset + count;
            for (var i = 0; i < count; i++)
            {
                int length = payload[lengthOffset + i];
                if (cursor + length > payload.Length)
                {
                    throw new PoeDataException("Malformed NDIC dictionary: truncated string table.");
                }

                strings.Add(Encoding.UTF8.GetString(payload, cursor, length));
                cursor += length;
            }

            if (cursor != payload.Length)
            {
                throw new PoeDataException(
                    $"Malformed NDIC dictionary: consumed {cursor} of {payload.Length} bytes.");
            }

            return strings.ToArray();
        }
        catch (ArgumentOutOfRangeException ex)
        {
            throw new PoeDataException("Malformed NDIC dictionary header.", ex);
        }
    }

    private static string[] DecodeLegacyProtobuf(byte[] payload)
    {
        var message = ProtoMessage.Parse(payload);
        return message.AllBytes(2).Select(bytes => Encoding.UTF8.GetString(bytes)).ToArray();
    }
}
