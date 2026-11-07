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


def build_notables(path: Path) -> tuple[dict, dict]:
    notables: dict[str, dict] = {}
    tag_totals: dict[str, dict[str, int]] = {}

    for line in path.read_text(encoding="utf-8").splitlines():
        head = ENTRY.match(line)
        if not head:
            continue
        mod_id, body = head.group(1), head.group(2)

        # notables ship as either prefix "Notable" mods or "of Significance" suffixes
        text = TEXT.match(body)
        if not text:
            continue
        matched = NOTABLE_TEXT.match(text.group(3).strip())
        if not matched:
            continue
        name = matched.group(1).strip()

        fields = dict(CONST.findall(body))
        arrays = {k: v for k, v in ARRAY.findall(body)}

        keys = parse_list(arrays.get("weightKey", ""))
        values = parse_numbers(arrays.get("weightVal", ""))
        weights = {k: v for k, v in zip(keys, values) if v > 0 and k != "default"}

        mult_keys = parse_list(arrays.get("weightMultiplierKey", ""))
        mult_values = parse_numbers(arrays.get("weightMultiplierVal", ""))
        multipliers = dict(zip(mult_keys, mult_values))

        # a size is available when its expansion_jewel_* multiplier is not zero
        sizes = [label for key, label in SIZES.items() if multipliers.get(key, 100) > 0]

        level = NUMBER.search(body)
        notables[name.lower()] = {
            "id": mod_id,
            "name": name,
            "level": int(level.group(2)) if level else 0,
            "group": fields.get("group", ""),
            "weights": weights,
            "sizes": sizes,
        }

        for tag, weight in weights.items():
            bucket = tag_totals.setdefault(tag, {})
            for size in sizes:
                bucket[size] = bucket.get(size, 0) + weight

    return notables, tag_totals


def build_categories(path: Path, notables: dict, tag_totals: dict) -> tuple[dict, dict]:
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
                "notables": sorted(
                    (n["name"] for n in notables.values() if n["weights"].get(current)),
                    key=str.lower),
            })

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

    order = {"Large": 0, "Medium": 1, "Small": 2}
    for entry in categories.values():
        entry["sizes"].sort(key=lambda s: order.get(s, 9))

    return categories, grants


def main() -> int:
    mods_path = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/ModJewelCluster.lua")
    jewels_path = Path(sys.argv[2] if len(sys.argv) > 2 else "/tmp/ClusterJewels.lua")

    notables, tag_totals = build_notables(mods_path)
    categories, grants = build_categories(jewels_path, notables, tag_totals)

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
