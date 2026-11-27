#!/usr/bin/env python3
"""Extract cluster-jewel notable descriptions from a Path of Building tree file.

    python3 tools/build_notable_text.py /path/to/TreeData/3_29/tree.lua

Writes `preview/assets/notables.json`: notable name (lower case) → the stat lines the
passive grants plus any reminder text, which is what the item card shows under
"1 Added Passive Skill is X".

Cluster notables are the notable skills that are *not placed on the passive tree*
(no `group` field in PoB's tree.lua); the placed ones share names with tree passives
and would give the wrong text. Fetch the input with:

    gh api repos/PathOfBuildingCommunity/PathOfBuilding/contents/src/TreeData/3_29/tree.lua \
        -H "Accept: application/vnd.github.raw" > tree.lua
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "preview" / "assets" / "notables.json"

BLOCK = re.compile(r"^        \[(\d+)\]= \{$")
KEY = re.compile(r'^\s+\["(\w+)"\]= (.*)$')
STRING = re.compile(r'^\s+"(.*)",?$')
GROUP_KEY = re.compile(r'^\s+\["group"\]= ')


def parse(path: Path) -> dict[str, dict]:
    nodes: dict[str, dict] = {}
    current: dict | None = None
    section: str | None = None

    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        if line.startswith("        [") and BLOCK.match(line):
            current = {"stats": [], "reminder": []}
            continue

        if current is None:
            continue

        if line.startswith("        }"):
            name = current.get("name", "")
            if (
                name
                and current.get("notable")
                and not current.get("onTree")
                and (current["stats"] or current["reminder"])
            ):
                key = name.strip().lower()
                entry = {
                    "stats": current["stats"],
                    "reminder": current["reminder"],
                }
                # Prefer the richest description if a name somehow repeats.
                if key not in nodes or len(entry["stats"]) > len(nodes[key]["stats"]):
                    nodes[key] = entry
            current = None
            continue

        if GROUP_KEY.match(line):
            current["onTree"] = True
            continue

        match = KEY.match(line)
        if match:
            field, value = match.group(1), match.group(2).strip()
            if field == "name":
                current["name"] = value.strip('",')
            elif field == "isNotable":
                current["notable"] = value.startswith("true")
            elif field in ("stats", "reminderText"):
                section = "stats" if field == "stats" else "reminder"
            else:
                section = None
            continue

        if section in ("stats", "reminder"):
            if line.strip() == "}":
                section = None
                continue
            entry = STRING.match(line)
            if entry:
                current[section].append(entry.group(1).replace('\\"', '"'))

    return nodes


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)

    source = Path(sys.argv[1])
    nodes = parse(source)
    if len(nodes) < 50:
        raise SystemExit(f"only {len(nodes)} notables parsed - is that a tree.lua?")

    document = {
        "source": "Path of Building tree.lua (cluster-jewel notables)",
        "count": len(nodes),
        "notables": dict(sorted(nodes.items())),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(document, indent=0, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"{OUT.relative_to(ROOT)}: {len(nodes)} notables")
    print(f"  size={OUT.stat().st_size / 1024:.0f} KiB")
    for sample in ("cooked alive", "wasting affliction"):
        if sample in nodes:
            print(f"  {sample}: {' / '.join(nodes[sample]['stats'])}")


if __name__ == "__main__":
    main()
