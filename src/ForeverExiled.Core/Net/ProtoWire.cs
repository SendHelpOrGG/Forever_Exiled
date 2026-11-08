using System.Text;

namespace ForeverExiled.Core.Net;

/// <summary>Raised when poe.ninja returns something the parsers cannot understand.</summary>
public sealed class PoeDataException : Exception
{
    public PoeDataException(string message)
        : base(message)
    {
    }

    public PoeDataException(string message, Exception inner)
        : base(message, inner)
    {
    }
}

/// <summary>A single decoded protobuf field (wire type 0 or 2 are used by poe.ninja).</summary>
public readonly struct ProtoField
{
    public ProtoField(int number, int wireType, ulong varint, byte[]? bytes)
    {
        Number = number;
        WireType = wireType;
        Varint = varint;
        Bytes = bytes;
    }

    public int Number { get; }

    public int WireType { get; }

    public ulong Varint { get; }

    public byte[]? Bytes { get; }
}

/// <summary>
/// Minimal protobuf wire-format reader. poe.ninja's builds API speaks protobuf with no
/// published schema, so the app decodes raw fields instead of carrying generated types.
/// Only wire types 0 (varint), 1 (fixed64), 2 (length-delimited) and 5 (fixed32) appear.
/// </summary>
public static class ProtoWire
{
    public static List<ProtoField> Read(byte[] data)
    {
        ArgumentNullException.ThrowIfNull(data);
        var fields = new List<ProtoField>();
        var index = 0;
        var length = data.Length;

        while (index < length)
        {
            var tag = ReadVarint(data, ref index);
            var fieldNumber = (int)(tag >> 3);
            var wireType = (int)(tag & 7);

            if (fieldNumber <= 0)
            {
                throw new PoeDataException("Malformed protobuf payload: field number 0.");
            }

            switch (wireType)
            {
                case 0:
                {
                    var value = ReadVarint(data, ref index);
                    fields.Add(new ProtoField(fieldNumber, wireType, value, null));
                    break;
                }

                case 1:
                {
                    if (index + 8 > length)
                    {
                        throw new PoeDataException("Malformed protobuf payload: truncated fixed64 field.");
                    }

                    var bytes = new byte[8];
                    Array.Copy(data, index, bytes, 0, 8);
                    index += 8;
                    fields.Add(new ProtoField(fieldNumber, wireType, 0, bytes));
                    break;
                }

                case 5:
                {
                    if (index + 4 > length)
                    {
                        throw new PoeDataException("Malformed protobuf payload: truncated fixed32 field.");
                    }

                    var bytes = new byte[4];
                    Array.Copy(data, index, bytes, 0, 4);
                    index += 4;
                    fields.Add(new ProtoField(fieldNumber, wireType, 0, bytes));
                    break;
                }

                case 2:
                {
                    var len = ReadVarint(data, ref index);
                    if (len > (ulong)(length - index))
                    {
                        throw new PoeDataException("Malformed protobuf payload: length exceeds payload size.");
                    }

                    var size = (int)len;
                    var bytes = new byte[size];
                    Array.Copy(data, index, bytes, 0, size);
                    index += size;
                    fields.Add(new ProtoField(fieldNumber, wireType, 0, bytes));
                    break;
                }

                default:
                    throw new PoeDataException($"Unsupported protobuf wire type {wireType}.");
            }
        }

        return fields;
    }

    /// <summary>Decodes a packed-varint blob into one value per row.</summary>
    public static List<long> ReadPackedVarints(byte[] data)
    {
        var values = new List<long>();
        var index = 0;
        while (index < data.Length)
        {
            var raw = ReadVarint(data, ref index);
            values.Add(unchecked((long)raw));
        }

        return values;
    }

    /// <summary>
    /// Packed-varint decode for payloads we are only guessing about: reports failure instead
    /// of throwing, so a text blob that happens to sit in a value field cannot fail a sync.
    /// </summary>
    public static bool TryReadPackedVarints(byte[] data, out List<long> values)
    {
        try
        {
            values = ReadPackedVarints(data);
            return true;
        }
        catch (PoeDataException)
        {
            values = new List<long>();
            return false;
        }
    }

    internal static ulong ReadVarint(byte[] data, ref int index)
    {
        ulong result = 0;
        var shift = 0;

        while (true)
        {
            if (index >= data.Length)
            {
                throw new PoeDataException("Malformed protobuf payload: truncated varint.");
            }

            var b = data[index++];
            result |= (ulong)(b & 0x7F) << shift;

            if ((b & 0x80) == 0)
            {
                return result;
            }

            shift += 7;
            if (shift > 63)
            {
                throw new PoeDataException("Malformed protobuf payload: varint too long.");
            }
        }
    }
}

/// <summary>Field accessors over one decoded protobuf message.</summary>
public sealed class ProtoMessage
{
    private readonly List<ProtoField> _fields;

    private ProtoMessage(List<ProtoField> fields) => _fields = fields;

    public static ProtoMessage Empty { get; } = new(new List<ProtoField>());

    public static ProtoMessage Parse(byte[] data) => new(ProtoWire.Read(data));

    public static ProtoMessage FromFields(List<ProtoField> fields) => new(fields);

    public IReadOnlyList<ProtoField> Fields => _fields;

    public byte[]? FirstBytes(int number)
    {
        foreach (var field in _fields)
        {
            if (field.Number == number && field.Bytes is not null)
            {
                return field.Bytes;
            }
        }

        return null;
    }

    public ulong? FirstVarint(int number)
    {
        foreach (var field in _fields)
        {
            if (field.Number == number && field.Bytes is null)
            {
                return field.Varint;
            }
        }

        return null;
    }

    public long FirstInt(int number, long fallback = 0)
    {
        var value = FirstVarint(number);
        return value.HasValue ? unchecked((long)value.Value) : fallback;
    }

    public string FirstString(int number)
    {
        var bytes = FirstBytes(number);
        return bytes is null ? string.Empty : Encoding.UTF8.GetString(bytes);
    }

    public IEnumerable<byte[]> AllBytes(int number)
    {
        foreach (var field in _fields)
        {
            if (field.Number == number && field.Bytes is not null)
            {
                yield return field.Bytes;
            }
        }
    }

    public IEnumerable<ulong> AllVarints(int number)
    {
        foreach (var field in _fields)
        {
            if (field.Number == number && field.Bytes is null)
            {
                yield return field.Varint;
            }
        }
    }

    public IEnumerable<ProtoMessage> AllMessages(int number)
    {
        foreach (var bytes in AllBytes(number))
        {
            yield return Parse(bytes);
        }
    }
}
