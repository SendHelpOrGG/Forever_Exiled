#!/usr/bin/env python3
"""Executable spec for the binary parsers in ForeverExiled.Core.

There is no .NET SDK in this environment, so instead of xUnit this script mirrors the
exact decoding logic of ProtoWire / SearchResponseParser / DictionaryDecoder /
ClusterJewelParser / MetaAnalyzer in Python and runs it against payloads built the way
poe.ninja builds them (same field numbers, same NDIC container). If the mirror passes and
the C# is a faithful transcription, the wire-format assumptions are sound.

Run: python3 tools/verify_parsers.py
"""
from __future__ import annotations

import json
import re
import struct
import sys

# --------------------------------------------------------------------------- writer


def varint(value: int) -> bytes:
    out = bytearray()
    while True:
        byte = value & 0x7F
        value >>= 7
        if value:
            out.append(byte | 0x80)
        else:
            out.append(byte)
            return bytes(out)


def field_varint(number: int, value: int) -> bytes:
    return varint((number << 3) | 0) + varint(value)


def field_bytes(number: int, payload: bytes) -> bytes:
    return varint((number << 3) | 2) + varint(len(payload)) + payload


def packed(numbers) -> bytes:
    return b"".join(varint(n) for n in numbers)


# --------------------------------------------------------------------------- reader


class ProtoError(Exception):
    pass


def read_varint(data: bytes, index: int):
    result = 0
    shift = 0
    while True:
        if index >= len(data):
            raise ProtoError("truncated varint")
        byte = data[index]
        index += 1
        result |= (byte & 0x7F) << shift
        if not byte & 0x80:
            return result, index
        shift += 7
        if shift > 63:
            raise ProtoError("varint too long")


def read_fields(data: bytes):
    fields = []
    index = 0
    while index < len(data):
        tag, index = read_varint(data, index)
        number, wire = tag >> 3, tag & 7
        if number <= 0:
            raise ProtoError("field number 0")
        if wire == 0:
            value, index = read_varint(data, index)
            fields.append((number, 0, value))
        elif wire == 2:
            length, index = read_varint(data, index)
            if length > len(data) - index:
                raise ProtoError("length overflow")
            fields.append((number, 2, data[index:index + length]))
            index += length
        elif wire == 1:
            fields.append((number, 1, data[index:index + 8]))
            index += 8
        elif wire == 5:
            fields.append((number, 5, data[index:index + 4]))
            index += 4
        else:
            raise ProtoError(f"wire type {wire}")
    return fields


class Msg:
    def __init__(self, data: bytes):
        self.fields = read_fields(data)

    def first_bytes(self, number):
        for n, w, v in self.fields:
            if n == number and w == 2:
                return v
        return None

    def first_int(self, number, default=0):
        for n, w, v in self.fields:
            if n == number and w == 0:
                return v
        return default

    def first_str(self, number):
        raw = self.first_bytes(number)
        return "" if raw is None else raw.decode("utf-8")

    def all_bytes(self, number):
        return [v for n, w, v in self.fields if n == number and w == 2]

    def all_msgs(self, number):
        return [Msg(v) for v in self.all_bytes(number)]


def unpack_varints(data: bytes):
    out, index = [], 0
    while index < len(data):
        value, index = read_varint(data, index)
        out.append(value)
    return out


# ------------------------------------------------------------------- search parser


def parse_search(payload: bytes) -> dict:
    root = Msg(payload)
    result_bytes = root.first_bytes(1)
    if result_bytes is None:
        raise ProtoError("no result envelope")
    result = Msg(result_bytes)

    dimensions = []
    for dim in result.all_msgs(2):
        dimensions.append({
            "id": dim.first_str(1),
            "dictionary_id": dim.first_str(2),
            "counts": [(c.first_int(1), c.first_int(2)) for c in dim.all_msgs(3)],
        })

    dict_hashes = {}
    for ref in result.all_msgs(6):
        ident, hsh = ref.first_str(1), ref.first_str(2)
        if ident and hsh:
            dict_hashes[ident] = hsh

    columns = []
    for col in result.all_msgs(12):
        name = col.first_str(1)
        if not name:
            continue
        strings = [b.decode("utf-8") for b in col.all_bytes(7)]
        packed_bytes = col.first_bytes(6)
        if packed_bytes is None:
            packed_bytes = col.first_bytes(8)
        numbers = unpack_varints(packed_bytes) if packed_bytes is not None else None
        columns.append({
            "name": name,
            "rows": col.first_int(13),
            "dictionary_id": col.first_str(11),
            "strings": strings or None,
            "numbers": numbers or None,
        })

    return {
        "total": result.first_int(1),
        "dimensions": dimensions,
        "columns": columns,
        "dictionary_hashes": dict_hashes,
    }


def decode_ndic(payload: bytes):
    assert payload[:4] == b"NDIC", "expected NDIC container"
    count = struct.unpack_from("<I", payload, 12)[0]
    blocks = struct.unpack_from("<I", payload, 28)[0]
    length_offset = 44 + (blocks - 1) * 8
    assert blocks >= 1 and length_offset + count <= len(payload), "bad header"
    values, cursor = [], length_offset + count
    for i in range(count):
        length = payload[length_offset + i]
        values.append(payload[cursor:cursor + length].decode("utf-8"))
        cursor += length
    assert cursor == len(payload), f"not fully consumed {cursor} != {len(payload)}"
    return values


def build_ndic(values, blocks=2) -> bytes:
    """Reproduces poe.ninja's NDIC dictionary container (header is exactly 44 bytes)."""
    count = len(values)
    header = bytearray(b"NDIC")
    header += struct.pack("<I", 1)                 # version
    header += struct.pack("<I", 0)                 # reserved
    header += struct.pack("<I", count)             # entry count
    header += struct.pack("<Q", 0xDEADBEEF)        # content hash
    header += struct.pack("<I", 16)                # constant
    header += struct.pack("<I", blocks)            # block count
    header += struct.pack("<I", count)             # entry count again
    header += struct.pack("<Q", 0)                 # zero
    assert len(header) == 44, len(header)

    ancillary = b"".join(struct.pack("<II", 0, 0) for _ in range(blocks - 1))
    body = bytearray(bytes(len(v) for v in values))
    for value in values:
        body += value.encode("utf-8")
    return bytes(header) + ancillary + bytes(body)


def extract_rows(response, dictionaries):
    def find(*candidates):
        for name in candidates:
            for col in response["columns"]:
                if col["name"].lower() == name.lower():
                    return col
        return None

    def cell_string(col, row):
        if not col or not col["strings"] or row >= len(col["strings"]):
            return None
        return col["strings"][row] or None

    def cell_number(col, row):
        if not col or not col["numbers"] or row >= len(col["numbers"]):
            return 0
        return col["numbers"][row]

    def cell_categorical(col, row):
        if not col:
            return ""
        text = cell_string(col, row)
        if text:
            return [p for p in text.split("\n") if p][0] if text.split("\n") else ""
        if not col["numbers"] or row >= len(col["numbers"]) or not col["dictionary_id"]:
            return ""
        names = dictionaries.get(col["dictionary_id"], [])
        index = col["numbers"][row]
        return names[index] if 0 <= index < len(names) else ""

    name_col = find("name", "characterName", "character.name")
    account_col = find("account", "accountName", "character.account")
    class_col = find("class", "className", "ascendancy")
    level_col = find("level", "character.level")
    dps_col = find("dps.total", "dps.totalWeighted", "dps", "dpsTotal")
    skill_col = find("skills", "mainSkill", "skill")
    league_col = find("league", "leagueName")
    cluster_col = find("cjewels", "clusterJewels", "clusterJewelCount")

    if name_col is None and account_col is None:
        return []

    row_count = max((max(len(c["strings"] or []), len(c["numbers"] or [])) for c in response["columns"]), default=0)
    rows = []
    for i in range(row_count):
        name, account = cell_string(name_col, i), cell_string(account_col, i)
        if not name and not account:
            continue
        rows.append({
            "name": name or "",
            "account": account or "",
            "class": cell_categorical(class_col, i),
            "level": cell_number(level_col, i),
            "dps": parse_dps(cell_string(dps_col, i)) or cell_number(dps_col, i),
            "skill": cell_categorical(skill_col, i),
            "league": cell_categorical(league_col, i),
            "clusters": cell_number(cluster_col, i),
        })
    return rows


# ------------------------------------------------------------------------- dps parse


def parse_dps(text):
    if not text:
        return 0
    value = text.strip().strip(" \t,")
    if not value:
        return 0
    value = value.replace(" DPS", "").replace("dps", "").strip()
    if not value:
        return 0
    multiplier = 1
    last = value[-1]
    if last in "kK":
        multiplier, value = 1_000, value[:-1]
    elif last in "mM":
        multiplier, value = 1_000_000, value[:-1]
    elif last in "bBgG":
        multiplier, value = 1_000_000_000, value[:-1]
    try:
        return float(value.replace(",", "").strip()) * multiplier
    except ValueError:
        return 0


# ------------------------------------------------------------- cluster jewel parse

PASSIVE_RE = re.compile(r"^Adds\s+(\d+)\s+Passive\s+Skills?$", re.I)
SOCKET_RE = re.compile(r"^(\d+)\s+Added\s+Passive\s+Skills?\s+(?:are|is\s+a)\s+Jewel\s+Sockets?$", re.I)
NOTABLE_RE = re.compile(r"^1\s+Added\s+Passive\s+Skill\s+is\s+(?<nothing>.+)$".replace("(?<nothing>", "(?P<name>"), re.I)
EFFECT_RE = re.compile(r"^Added\s+Small\s+Passive\s+Skills?\s+have\s+(\d+)%\s+increased\s+Effect$", re.I)
SMALL_GRANT_RE = re.compile(r"^Added\s+Small\s+Passive\s+Skills?\s+also\s+grant:\s*(.+)$", re.I)


def detect_size(type_line):
    if "Large" in type_line:
        return "Large"
    if "Medium" in type_line:
        return "Medium"
    if "Small" in type_line:
        return "Small"
    return None


def parse_cluster_jewel(item):
    type_line = item.get("typeLine", "")
    if "Cluster Jewel" not in type_line:
        return None
    size = detect_size(type_line)
    if size is None:
        return None

    jewel = {
        "size": size,
        "base": type_line,
        "name": item.get("name", ""),
        "passives": None,
        "sockets": 0,
        "grant": "",
        "effect": 0,
        "notables": [],
        "small_grants": [],
    }

    for enchant in item.get("enchantMods", []) or []:
        for line in [p.strip() for p in enchant.split("\n") if p.strip()]:
            m = PASSIVE_RE.match(line)
            if m:
                jewel["passives"] = max(jewel["passives"] or 0, int(m.group(1)))
                continue
            m = SOCKET_RE.match(line)
            if m:
                jewel["sockets"] = max(jewel["sockets"], int(m.group(1)))
                continue
            if line.lower().startswith("added small passive skills grant:"):
                text = line[len("added small passive skills grant:"):].strip()
                if text and not jewel["grant"]:
                    jewel["grant"] = text
                continue
            if not jewel["grant"] and not line.lower().endswith("passive skills"):
                jewel["grant"] = line

    for mod in (item.get("explicitMods", []) or []) + (item.get("fracturedMods", []) or []):
        for line in [p.strip() for p in mod.split("\n") if p.strip()]:
            m = NOTABLE_RE.match(line)
            if m:
                name = m.group("name").strip()
                if "jewel socket" in name.lower():
                    jewel["sockets"] += 1
                    continue
                if name.lower() not in [n.lower() for n in jewel["notables"]]:
                    jewel["notables"].append(name)
                continue
            m = EFFECT_RE.match(line)
            if m:
                jewel["effect"] = max(jewel["effect"], int(m.group(1)))
                continue
            m = SMALL_GRANT_RE.match(line)
            if m:
                jewel["small_grants"].append(m.group(1).strip())

    return jewel


def combo_key(jewel):
    if jewel["notables"]:
        label = " + ".join(sorted(jewel["notables"], key=str.lower))
    else:
        label = jewel["name"] or "(no notables)"
    return f"{jewel['size']}|{label}"


# ------------------------------------------------------------------------ fixtures


def build_search_payload():
    classes = ["Juggernaut", "Slayer", "Occultist", "Hierophant", "Trickster"]
    gems = ["Molten Strike of the Zenith", "Hexblast", "Ice Nova of Frostbolts", "Winter Orb"]
    class_dict = build_ndic(classes)
    gem_dict = build_ndic(gems)

    rows = [
        # name, account, class index, level, dps text, skill index, cjewels
        ("ZenithJugg", "acc_1", 0, 100, "425.0M", 0, 2),
        ("MoltenFist", "acc_2", 1, 99, "198.4M", 0, 1),
        ("HexTrick", "acc_3", 4, 100, "198.0M", 1, 3),
        ("Frostbolts", "acc_4", 3, 100, "164.0M", 2, 2),
        ("OrbOccult", "acc_5", 2, 98, "138.5M", 3, 2),
    ]

    def column(name, strings=None, numbers=None, dictionary=None, rows=len(rows)):
        out = field_bytes(1, name.encode())
        if numbers is not None:
            out += field_bytes(6, packed(numbers))
        for text in strings or []:
            out += field_bytes(7, text.encode())
        if dictionary:
            out += field_bytes(11, dictionary.encode())
        out += field_varint(13, rows)
        return out

    columns = [
        column("name", strings=[r[0] for r in rows]),
        column("account", strings=[r[1] for r in rows]),
        column("class", numbers=[r[2] for r in rows], dictionary="class"),
        column("level", numbers=[r[3] for r in rows]),
        column("dps.total", strings=[r[4] for r in rows]),
        column("skills", numbers=[r[5] for r in rows], dictionary="gem"),
        column("cjewels", numbers=[r[6] for r in rows]),
    ]

    # Aggregate dimension: skills -> counts
    skill_counts = b""
    for index, count in ((0, 1362), (1, 1280), (2, 2302), (3, 585)):
        skill_counts += field_bytes(3, field_varint(1, index) + field_varint(2, count))
    dimension = field_bytes(1, b"skills") + field_bytes(2, b"gem") + skill_counts

    result = bytearray()
    result += field_varint(1, 13262)              # total
    result += field_bytes(2, dimension)           # aggregate bucket
    result += field_bytes(6, field_bytes(1, b"class") + field_bytes(2, b"hash-class"))
    result += field_bytes(6, field_bytes(1, b"gem") + field_bytes(2, b"hash-gem"))
    for col in columns:
        result += field_bytes(12, col)

    payload = field_bytes(1, bytes(result))
    return payload, {"class": class_dict, "gem": gem_dict}


def test_search_parser():
    payload, dictionary_blobs = build_search_payload()
    response = parse_search(payload)

    assert response["total"] == 13262, response["total"]
    assert [d["id"] for d in response["dimensions"]] == ["skills"], response["dimensions"]
    assert response["dictionary_hashes"] == {"class": "hash-class", "gem": "hash-gem"}

    dictionaries = {name: decode_ndic(blob) for name, blob in dictionary_blobs.items()}
    assert dictionaries["class"][0] == "Juggernaut"
    assert dictionaries["gem"][2] == "Ice Nova of Frostbolts"

    dimension = response["dimensions"][0]
    names = dictionaries[dimension["dictionary_id"]]
    resolved = sorted(((names[key], count) for key, count in dimension["counts"]), key=lambda p: -p[1])
    assert resolved[0] == ("Ice Nova of Frostbolts", 2302), resolved

    for name, count in resolved:
        share = round(count * 100 / response["total"], 2)
        assert 0 < share < 100

    rows = extract_rows(response, dictionaries)
    assert len(rows) == 5, rows
    first = rows[0]
    assert first["name"] == "ZenithJugg" and first["account"] == "acc_1"
    assert first["class"] == "Juggernaut", first
    assert first["skill"] == "Molten Strike of the Zenith", first
    assert first["dps"] == 425_000_000, first["dps"]
    assert rows[2]["dps"] == 198_000_000
    assert rows[4]["class"] == "Occultist"
    assert first["clusters"] == 2

    print("  search parser .............. ok (total, dimension, dictionaries, 5 rows)")


def test_dps_parser():
    cases = {"425.0M": 425e6, "70.2M": 70.2e6, "1.2B": 1.2e9, "12.5K": 12500,
             "1,234": 1234, "3.4M DPS": 3.4e6, "": 0, "  ": 0, "–": 0, "0": 0}
    for text, expected in cases.items():
        actual = parse_dps(text)
        assert abs(actual - expected) < max(1, expected * 1e-9), (text, actual, expected)
    print(f"  dps parser ................. ok ({len(cases)} cases)")


def test_cluster_jewel_parser():
    medium = {
        "typeLine": "Medium Cluster Jewel",
        "name": "Entropy Prism",
        "rarity": "rare",
        "ilvl": 84,
        "enchantMods": ["Adds 4 Passive Skills", "Added Small Passive Skills grant: 10% increased Projectile Damage"],
        "explicitMods": ["1 Added Passive Skill is Eye to Eye", "1 Added Passive Skill is Repeater"],
        "fracturedMods": ["Added Small Passive Skills have 35% increased Effect"],
        "corrupted": False,
    }
    jewel = parse_cluster_jewel(medium)
    assert jewel["size"] == "Medium"
    assert jewel["passives"] == 4
    assert jewel["grant"] == "10% increased Projectile Damage", jewel["grant"]
    assert jewel["notables"] == ["Eye to Eye", "Repeater"], jewel["notables"]
    assert jewel["effect"] == 35
    assert combo_key(jewel) == "Medium|Eye to Eye + Repeater", combo_key(jewel)

    large_voices = {
        "typeLine": "Large Cluster Jewel",
        "name": "Voices",
        "rarity": "unique",
        "enchantMods": ["Adds 3 Passive Skills", "3 Added Passive Skills are Jewel Sockets"],
        "explicitMods": [],
    }
    voices = parse_cluster_jewel(large_voices)
    assert voices["size"] == "Large" and voices["passives"] == 3 and voices["sockets"] == 3
    assert combo_key(voices) == "Large|Voices"

    small = {
        "typeLine": "Small Cluster Jewel",
        "name": "Vivid Stone",
        "enchantMods": ["Adds 2 Passive Skills", "Added Small Passive Skills grant: 12% increased Maximum Life"],
        "explicitMods": ["1 Added Passive Skill is Fettle", "Added Small Passive Skills also grant: +5 to Maximum Life"],
    }
    life = parse_cluster_jewel(small)
    assert life["passives"] == 2 and life["notables"] == ["Fettle"]
    assert life["small_grants"] == ["+5 to Maximum Life"]

    assert parse_cluster_jewel({"typeLine": "Cobalt Jewel"}) is None
    assert parse_cluster_jewel({"typeLine": "Cluster Jewel"}) is None

    print("  cluster jewel parser ....... ok (medium/large-unique/small, combo keys)")


def test_character_json():
    payload = {
        "account": "acc_1",
        "name": "ZenithJugg",
        "class": "Juggernaut",
        "league": "Allflame",
        "level": 100,
        "defensiveStats": {"life": 5400, "energyShield": 120},
        "jewels": [
            {"itemData": {
                "typeLine": "Large Cluster Jewel",
                "name": "Doom Whorl",
                "rarity": "rare",
                "ilvl": 85,
                "enchantMods": ["Adds 8 Passive Skills", "Added Small Passive Skills grant: 12% increased Fire Damage"],
                "explicitMods": ["1 Added Passive Skill is Devastator",
                                 "1 Added Passive Skill is Feed the Fury",
                                 "1 Added Passive Skill is Martial Prowess"],
            }},
        ],
        "clusterJewels": [
            {"itemData": {
                "typeLine": "Medium Cluster Jewel",
                "name": "Rune Splinter",
                "enchantMods": ["Adds 4 Passive Skills", "Added Small Passive Skills grant: 10% increased Fire Damage"],
                "explicitMods": ["1 Added Passive Skill is Sadist", "1 Added Passive Skill is Cooked Alive"],
            }},
        ],
    }

    collected = []
    seen = set()
    candidates = [j.get("itemData", j) for j in payload.get("clusterJewels", [])]
    candidates += [j.get("itemData", j) for j in payload.get("jewels", [])]
    candidates += [j.get("itemData", j) for j in payload.get("items", [])]
    for item in candidates:
        jewel = parse_cluster_jewel(item)
        if jewel is None:
            continue
        identity = (jewel["base"], jewel["name"], jewel["grant"], tuple(jewel["notables"]))
        if identity in seen:
            continue
        seen.add(identity)
        collected.append(jewel)

    assert len(collected) == 2, collected
    large = [j for j in collected if j["size"] == "Large"][0]
    assert large["passives"] == 8
    assert combo_key(large) == "Large|Devastator + Feed the Fury + Martial Prowess", combo_key(large)
    print("  character json ............ ok (jewels[].itemData + clusterJewels[])")


def test_aggregation():
    """Mirror of MetaAnalyzer.BuildCombos: distinct combos per build, % of sample."""
    classes = ["Juggernaut", "Slayer"]
    builds = []
    for i in range(10):
        jewels = [
            {"size": "Large", "notables": ["Devastator", "Feed the Fury", "Martial Prowess"], "name": ""},
            {"size": "Medium", "notables": ["Sadist", "Cooked Alive"], "name": ""},
        ]
        if i >= 6:
            jewels[1] = {"size": "Medium", "notables": ["Sadist", "Blazing Salvo"], "name": ""}
        if i >= 8:
            jewels.append({"size": "Medium", "notables": ["Sadist", "Cooked Alive"], "name": ""})
        builds.append({
            "key": f"acc_{i}/Char{i}",
            "class": classes[i % 2],
            "dps": (10_000_000 * (i + 1)),
            "skill": "Molten Strike of the Zenith",
            "jewels": jewels,
        })

    def build_combos(builds, size, denominator):
        groups = {}
        for build in builds:
            seen = set()
            for jewel in build["jewels"]:
                if jewel["size"] != size:
                    continue
                key = combo_key({"size": jewel["size"], "notables": jewel["notables"], "name": jewel["name"]})
                if key in seen:
                    continue
                seen.add(key)
                entry = groups.setdefault(key, {"count": 0, "dps": 0.0, "peak": 0.0, "top": ""})
                entry["count"] += 1
                entry["dps"] += build["dps"]
                if build["dps"] >= entry["peak"]:
                    entry["peak"] = build["dps"]
                    entry["top"] = build["key"]
        out = []
        for key, entry in groups.items():
            out.append({
                "key": key,
                "builds": entry["count"],
                "percent": entry["count"] * 100 / denominator,
                "avg_dps": entry["dps"] / entry["count"],
                "peak": entry["peak"],
                "top": entry["top"],
            })
        out.sort(key=lambda c: (-c["builds"], -c["avg_dps"]))
        return out

    medium = build_combos(builds, "Medium", len(builds))
    assert medium[0]["key"] == "Medium|Cooked Alive + Sadist", medium
    assert medium[0]["builds"] == 8, medium[0]          # the duplicate jewel must not double count
    assert abs(medium[0]["percent"] - 80.0) < 1e-9
    assert medium[1]["builds"] == 4
    assert medium[0]["top"] == "acc_9/Char9"
    expected_avg = sum(10_000_000 * (i + 1) for i in [0, 1, 2, 3, 4, 5, 8, 9]) / 8
    assert abs(medium[0]["avg_dps"] - expected_avg) < 1e-6, medium[0]["avg_dps"]

    large = build_combos(builds, "Large", len(builds))
    assert len(large) == 1 and large[0]["builds"] == 10
    print("  aggregation ............... ok (dedupe per build, %, weighted DPS, peak build)")


def main() -> int:
    print("Forever Exiled parser spec")
    test_search_parser()
    test_dps_parser()
    test_cluster_jewel_parser()
    test_character_json()
    test_aggregation()
    print("\nall parser expectations hold")
    return 0


if __name__ == "__main__":
    sys.exit(main())
