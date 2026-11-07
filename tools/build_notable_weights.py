#!/usr/bin/env python3
"""
Build the cluster-notable spawn weights used by the app.

Source: Path of Building's src/Data/ModJewelCluster.lua (generated from the game's
Mods.dat) and src/Data/ClusterJewels.lua (jewel bases and their enchant tags).
These are the same numbers craftofexile.com reads out of the game files: every
cluster notable has a weight per cluster-jewel base tag, and the chance of rolling
it is its weight divided by the weight of the whole pool for that base.

    gh api repos/PathOfBuildingCommunity/PathOfBuilding/contents/src/Data/ModJewelCluster.lua \
        -H "Accept: application/vnd.github.raw" > /tmp/ModJewelCluster.lua
    gh api repos/PathOfBuildingCommunity/PathOfBuilding/contents/src/Data/ClusterJewels.lua \
        -H "Accept: application/vnd.github.raw" > /tmp/ClusterJewels.lua

    python3 tools/build_notable_weights.py /tmp/ModJewelCluster.lua /tmp/ClusterJewels.lua

Writes preview/assets/notable_weights.json.
"""

from __future__ import annotations

import json
import re
import sys
from datetime import date
from pathlib import Path

OUT = Path("preview/assets/notable_weights.json")

ENTRY = re.compile(r'^\t\["([^"]+)"\] = \{(.*)\},?\s*$')
CONST = re.compile(r'(\w+) = "([^"]*)"')
NUMBER = re.compile(r'(\w+) = (\d+)')
ARRAY = re.compile(r'(\w+) = \{([^}]*)\}')
TEXT = re.compile(r'^\s*type = "([^"]+)", affix = "([^"]+)", "([^"]+)"')
NOTABLE_TEXT = re.compile(r'^1 Added Passive Skill is (.+)$')

SIZES = {"expansion_jewel_large": "Large", "expansion_jewel_medium": "Medium", "expansion_jewel_small": "Small"}


def normalize_grant(text: str) -> str:
    """Drop the tier digits so 10% and 12% variants land on the same base tag."""
    return re.sub(r"\s+", " ", re.sub(r"[\d.]+%?", " ", text)).strip()


def parse_list(raw: str) -> list[str]:
    return [v.strip().strip('"') for v in raw.split(",") if v.strip()]


def parse_numbers(raw: str) -> list[int]:
    return [int(v.strip()) for v in raw.split(",") if v.strip()]


def build_notables(path: Path) -> tuple[dict, dict, dict]:
    """Every cluster mod that rolls from a base pool: notables plus the small-passive grants.

    Weights decide the odds of a given notable coming up, so the pools have to contain
    everything that competes for the same affix slot - not just the notables.
    """
    notables: dict[str, dict] = {}
    tag_totals: dict[str, dict[str, int]] = {}
    pool_meta: dict[str, dict] = {}
    # level -> weight, so a pool can be measured at an item level: a mod only
    # competes for a slot once the base's iLvl reaches its level
    pool_levels: dict[str, dict[str, dict[str, list]]] = {}

    for line in path.read_text(encoding="utf-8").splitlines():
        head = ENTRY.match(line)
        if not head:
            continue
        mod_id, body = head.group(1), head.group(2)

        text = TEXT.match(body)
        if not text:
            continue
        kind, affix, mod_text = text.group(1), text.group(2), text.group(3).strip()

        arrays = {k: v for k, v in ARRAY.findall(body)}
        keys = parse_list(arrays.get("weightKey", ""))
        values = parse_numbers(arrays.get("weightVal", ""))
        weights = {k: v for k, v in zip(keys, values) if v > 0 and k != "default"}
        if not weights:
            continue

        mult_keys = parse_list(arrays.get("weightMultiplierKey", ""))
        mult_values = parse_numbers(arrays.get("weightMultiplierVal", ""))
        multipliers = dict(zip(mult_keys, mult_values))
        sizes = [label for key, label in SIZES.items() if multipliers.get(key, 100) > 0]

        levels_match = NUMBER.search(body)
        level = int(levels_match.group(2)) if levels_match else 1

        for tag, weight in weights.items():
            bucket = tag_totals.setdefault(tag, {})
            meta = pool_meta.setdefault(tag, {}).setdefault(kind, {"total": {}})
            for size in sizes:
                bucket[size] = bucket.get(size, 0) + weight
                meta["total"][size] = meta["total"].get(size, 0) + weight
                pool_levels.setdefault(tag, {}).setdefault(kind, {}).setdefault(size, []).append((level, weight))

            meta["total"][""] = meta["total"].get("", 0) + weight

        notable = NOTABLE_TEXT.match(mod_text)
        if not notable:
            continue

        tags = parse_list(arrays.get("modTags", ""))
        name = notable.group(1).strip()
        notables[name.lower()] = {
            "id": mod_id,
            "name": name,
            "type": kind,
            "level": level,
            "tags": tags,
            "weights": weights,
            "sizes": sizes,
        }

    return notables, tag_totals, pool_meta, pool_levels


def build_categories(path: Path, notables: dict, tag_totals: dict, pool_meta: dict, pool_levels: dict) -> tuple[dict, dict]:
    """Read the [tag] blocks that sit under each jewel size in ClusterJewels.lua.

    A tag block only appears under the size it belongs to (projectile damage lives
    under Medium, for instance), which is what fixes the pool a jewel rolls from.
    """
    categories: dict[str, dict] = {}
    grants: dict[str, str] = {}
    current: str | None = None
    size = ""
    body: list[str] = []

    for line in path.read_text(encoding="utf-8").splitlines():
        jewel = re.match(r'^\t{2}\["(.+?) Cluster Jewel"\] = \{$', line)
        if jewel:
            size = jewel.group(1)
            continue

        start_tag = re.match(r'^\t{4}\["(affliction_[a-z0-9_]+)"\] = \{$', line)
        if start_tag:
            current, body = start_tag.group(1), []
            continue

        if current is None:
            continue

        if re.match(r'^\t{4}\},?\s*$', line):
            text = "\n".join(body)
            name = re.search(r'name = "([^"]+)"', text)
            stats = re.search(r'stats = \{ ([^}]*) \}', text)
            grant = parse_list(stats.group(1))[0] if stats and parse_list(stats.group(1)) else ""

            entry = categories.setdefault(current, {
                "label": name.group(1) if name else current,
                "sizes": [],
                "grants": {},
                "totals": {},
                "pools": {},
                "notables": sorted(
                    (n["name"] for n in notables.values() if n["weights"].get(current)),
                    key=str.lower),
            })

            # prefix and suffix slots draw from separate pools, so keep them apart:
            # a magic jewel can only hold one notable of each type
            for kind, meta in pool_meta.get(current, {}).items():
                slot = entry["pools"].setdefault(kind, {"total": {}, "count": 0, "levels": {}})

            for kind, meta in pool_meta.get(current, {}).items():
                slot = entry["pools"].setdefault(kind, {"total": {}, "count": 0, "levels": {}})
                slot["total"][size] = meta["total"].get(size, 0)

                # cumulative weight by item level: [[level, weight at or below it], ...]
                entries = sorted(pool_levels.get(current, {}).get(kind, {}).get(size, []))
                cumulative: list[list[int]] = []
                running = 0
                for mod_level, weight in entries:
                    running += weight
                    if cumulative and cumulative[-1][0] == mod_level:
                        cumulative[-1][1] = running
                    else:
                        cumulative.append([mod_level, running])
                slot["levels"][size] = cumulative

            if size and size not in entry["sizes"]:
                entry["sizes"].append(size)
                entry["grants"][size] = grant
                entry["totals"][size] = tag_totals.get(current, {}).get(size, 0)
                if grant:
                    key = grant.strip().lower()
                    grants[f"{size.lower()}|{key}"] = current
                    grants.setdefault(f"any|{key}", current)
                    # rolls differ by tier ("10%/12% increased Fire Damage"); the base tag does not
                    norm = normalize_grant(key)
                    grants[f"{size.lower()}~{norm}"] = current
                    grants.setdefault(f"any~{norm}", current)

            current = None
            continue

        body.append(line)

    for tag, entry in categories.items():
        for kind in list(entry["pools"]):
            entry["pools"][kind]["count"] = sum(
                1 for n in notables.values() if n["weights"].get(tag) and n["type"] == kind)

    order = {"Large": 0, "Medium": 1, "Small": 2}
    for entry in categories.values():
        entry["sizes"].sort(key=lambda s: order.get(s, 9))

    return categories, grants


def main() -> int:
    mods_path = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/ModJewelCluster.lua")
    jewels_path = Path(sys.argv[2] if len(sys.argv) > 2 else "/tmp/ClusterJewels.lua")

    notables, tag_totals, pool_meta, pool_levels = build_notables(mods_path)
    categories, grants = build_categories(jewels_path, notables, tag_totals, pool_meta, pool_levels)

    payload = {
        "source": "Path of Building game data (ModJewelCluster.lua + ClusterJewels.lua)",
        "generated": date.today().isoformat(),
        "note": "Chance of a notable = its weight / the total weight of the pool for that base tag.",
        "categories": categories,
        "grants": grants,
        "notables": dict(sorted(notables.items())),
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, separators=(",", ":"), sort_keys=True), encoding="utf-8")

    raw_tags = sum(1 for n in notables.values() for w in n["weights"].values())
    print(f"notables: {len(notables)}  categories: {len(categories)}  grants: {len(grants)}  weighted tags: {raw_tags}")
    print(f"wrote {OUT} ({OUT.stat().st_size / 1024:.1f} KiB)")

    sample = ["sadist", "cooked alive", "eye to eye", "repeater"]
    for key in sample:
        entry = notables.get(key)
        if entry:
            print(f"  {entry['name']:<16} lvl {entry['level']:>2}  {' '.join(entry['sizes']):<20} {entry['weights']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
