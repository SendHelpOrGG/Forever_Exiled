#!/usr/bin/env python3
"""Generates the bundled offline snapshot (src/ForeverExiled.Core/Resources/demo-snapshot.json).

!!! THIS DATA IS SYNTHETIC !!!

Nothing in the generated file was scraped from poe.ninja. Skill shares, DPS values,
class splits, account names and character names are all invented here so the UI can be
opened, demoed and tested offline. Only the *shape* is realistic: the cluster notables
come from real PoE cluster-jewel pools, and every sum / average / sampled-build count is
internally consistent, so MetaAnalyzer's arithmetic can be checked against it.

Do not quote numbers from this file as league statistics. The snapshot is deliberately
marked (league name "Allflame (demo)", snapshotVersion "demo-...", source "sample",
synthetic true) so both the app and the preview label it as a demo everywhere it shows.

Real data only arrives through Sync, which writes a normal cached snapshot.

Every jewel is rewritten against preview/assets/notable_weights.json so its base is a
real cluster base and all of its notables roll from that base's pool - run
tools/build_notable_weights.py first if that file is missing.
"""
from __future__ import annotations

import json
import math
import random
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "ForeverExiled.Core" / "Resources" / "demo-snapshot.json"

LEAGUE_LABEL = "Allflame (demo)"
SNAPSHOT_VERSION = "demo-2026-11-07"

TOTAL_BUILDS = 13262
ROWS_PER_SKILL = 24
SAMPLED_PER_SKILL = 13

# ------------------------------------------------------------------ cluster pools

ARCHETYPES = {
    "cold-projectile": {
        "large": [
            ("Cold to the Core,Snowstorm,Blanketed Snow", "12% increased Cold Damage", 8, 5, 0),
            ("Blanketed Snow,Deep Chill,Snowstorm", "12% increased Cold Damage", 8, 3, 0),
            ("Cold to the Core,Blanketed Snow,Deep Chill", "12% increased Cold Damage", 12, 2, 0),
        ],
        "medium": [
            ("Eye to Eye,Repeater", "10% increased Projectile Damage", 4, 8, 35),
            ("Eye to Eye,Repeater", "10% increased Projectile Damage", 5, 3, 0),
            ("Blanketed Snow,Deep Chill", "10% increased Cold Damage", 4, 4, 35),
            ("Eye to Eye,Streamlined", "10% increased Projectile Damage", 4, 2, 0),
        ],
        "small": [
            ("Fettle", "12% increased Maximum Life", 2, 5, 0),
            ("Prismatic Carapace", "+8% to all Elemental Resistances", 2, 3, 0),
        ],
    },
    "fire-melee": {
        "large": [
            ("Devastator,Feed the Fury,Martial Prowess", "12% increased Fire Damage", 8, 6, 0),
            ("Feed the Fury,Martial Prowess,Sadist", "12% increased Fire Damage", 8, 3, 0),
            ("Devastator,Cremator,Feed the Fury", "12% increased Fire Damage", 12, 2, 0),
        ],
        "medium": [
            ("Sadist,Cooked Alive", "10% increased Fire Damage", 4, 6, 35),
            ("Sadist,Cooked Alive", "10% increased Fire Damage", 4, 3, 0),
            ("Cooked Alive,Wasting Affliction", "10% increased Fire Damage", 5, 2, 0),
        ],
        "small": [
            ("Fettle", "12% increased Maximum Life", 2, 6, 0),
            ("Surging Vitality", "12% increased Maximum Life", 2, 3, 0),
        ],
    },
    "chaos-dot": {
        "large": [
            ("Circling Oblivion,Wicked Pall,Brush with Death", "12% increased Chaos Damage", 8, 6, 0),
            ("Unholy Grace,Wicked Pall,Exposure Therapy", "12% increased Chaos Damage", 8, 4, 0),
            ("Circling Oblivion,Exposure Therapy,Vile Reinvigoration", "12% increased Chaos Damage", 12, 2, 0),
        ],
        "medium": [
            ("Wicked Pall,Brush with Death", "10% increased Chaos Damage", 4, 7, 35),
            ("Exposure Therapy,Vile Reinvigoration", "10% increased Chaos Damage", 4, 4, 0),
            ("Wicked Pall,Touch of Cruelty", "10% increased Chaos Damage", 5, 2, 0),
        ],
        "small": [
            ("Fettle", "12% increased Maximum Life", 2, 5, 0),
            ("Antivenom", "+8% to all Elemental Resistances", 2, 3, 0),
        ],
    },
    "physical-impale": {
        "large": [
            ("Deep Cuts,Wound Aggravation,Bloodscent", "12% increased Physical Damage", 8, 6, 0),
            ("Wound Aggravation,Rend,Bloodscent", "12% increased Physical Damage", 8, 4, 0),
            ("Deep Cuts,Bloodscent,Martial Prowess", "12% increased Physical Damage", 12, 2, 0),
        ],
        "medium": [
            ("Iron Breaker,Force Multiplier", "10% increased Physical Damage", 4, 7, 35),
            ("Rend,Precise Focus", "10% increased Physical Damage", 4, 4, 0),
            ("Force Multiplier,Combat Rhythm", "10% increased Physical Damage", 5, 2, 0),
        ],
        "small": [
            ("Fettle", "12% increased Maximum Life", 2, 6, 0),
            ("Prismatic Carapace", "+8% to all Elemental Resistances", 2, 3, 0),
        ],
    },
    "lightning": {
        "large": [
            ("Doryani's Lesson,Prismatic Heart,Scintillating Idea", "12% increased Lightning Damage", 8, 6, 0),
            ("Scintillating Idea,Paralysis,Doryani's Lesson", "12% increased Lightning Damage", 8, 4, 0),
            ("Prismatic Heart,Scintillating Idea,Stormrider", "12% increased Lightning Damage", 12, 2, 0),
        ],
        "medium": [
            ("Overshock,Supercharge", "10% increased Lightning Damage", 4, 7, 35),
            ("Overshock,Paralysis", "10% increased Lightning Damage", 4, 3, 0),
            ("Supercharge,Scintillating Idea", "10% increased Lightning Damage", 5, 2, 0),
        ],
        "small": [
            ("Fettle", "12% increased Maximum Life", 2, 5, 0),
            ("Prismatic Carapace", "+8% to all Elemental Resistances", 2, 3, 0),
        ],
    },
    "minion": {
        "large": [
            ("Renewal,Vicious Bite,Rotten Claws", "12% increased Minion Damage", 8, 6, 0),
            ("Vicious Bite,Rotten Claws,Call to the Slaughter", "12% increased Minion Damage", 8, 3, 0),
            ("Renewal,Call to the Slaughter,Vicious Bite", "12% increased Minion Damage", 12, 2, 0),
        ],
        "medium": [
            ("Dread March,Raze and Pillage", "10% increased Minion Damage", 4, 7, 35),
            ("Raze and Pillage,Feasting Fiends", "10% increased Minion Damage", 4, 3, 0),
            ("Dread March,Feasting Fiends", "10% increased Minion Damage", 5, 2, 0),
        ],
        "small": [
            ("Fettle", "12% increased Maximum Life", 2, 5, 0),
            ("Sublime Sensation", "12% increased Maximum Energy Shield", 2, 2, 0),
        ],
    },
}

# ------------------------------------------------------- real cluster pools
# preview/assets/notable_weights.json comes from the game's mod data (see
# tools/build_notable_weights.py). Every jewel is rewritten so that its base is a
# real cluster base and all of its notables come from that base's pool - otherwise
# the weights shown in the UI would not belong to the jewel they are printed on.

WEIGHTS_PATH = ROOT / "preview" / "assets" / "notable_weights.json"
WEIGHTS = json.loads(WEIGHTS_PATH.read_text(encoding="utf-8"))
CATEGORIES = WEIGHTS["categories"]
NOTABLES = WEIGHTS["notables"]

# fallback pool when none of an entry's notables belongs to a valid base
DEFAULT_POOL = {
    ("cold-projectile", "Large"): "affliction_cold_damage",
    ("cold-projectile", "Medium"): "affliction_projectile_damage",
    ("cold-projectile", "Small"): "affliction_maximum_life",
    ("fire-melee", "Large"): "affliction_fire_damage",
    ("fire-melee", "Medium"): "affliction_fire_damage_over_time_multiplier",
    ("fire-melee", "Small"): "affliction_maximum_life",
    ("chaos-dot", "Large"): "affliction_chaos_damage",
    ("chaos-dot", "Medium"): "affliction_chaos_damage_over_time_multiplier",
    ("chaos-dot", "Small"): "affliction_maximum_life",
    ("physical-impale", "Large"): "affliction_physical_damage",
    ("physical-impale", "Medium"): "affliction_physical_damage_over_time_multiplier",
    ("physical-impale", "Small"): "affliction_maximum_life",
    ("lightning", "Large"): "affliction_lightning_damage",
    ("lightning", "Medium"): "affliction_critical_chance",
    ("lightning", "Small"): "affliction_maximum_life",
    ("minion", "Large"): "affliction_minion_damage",
    ("minion", "Medium"): "affliction_minion_life",
    ("minion", "Small"): "affliction_maximum_life",
}


def pool_members(tag: str) -> list[str]:
    """Pool members, heaviest weight first - the order a substitute is drawn from."""
    members = [(NOTABLES[n.lower()]["weights"][tag], n) for n in CATEGORIES[tag]["notables"]]
    return [name for _w, name in sorted(members, reverse=True)]


def pick_pool(archetype: str, size: str, names: list[str]) -> str:
    """The base whose pool explains most of the notables on this jewel."""
    best, best_hits = None, 0
    for tag, category in CATEGORIES.items():
        if size not in category["sizes"]:
            continue
        hits = sum(1 for n in names if n in category["notables"])
        if hits > best_hits:
            best, best_hits = tag, hits

    return best or DEFAULT_POOL[(archetype, size)]


def repair_names(names: list[str], tag: str) -> list[str]:
    """Swap notables the pool cannot roll for the pool's next-heaviest names."""
    pool = pool_members(tag)
    known = set(CATEGORIES[tag]["notables"])
    used: list[str] = []
    for name in names:
        if name in known and name not in used:
            used.append(name)
            continue
        replacement = next((c for c in pool if c not in used and c not in names), None)
        used.append(replacement or pool[0])
    return used


def align_archetypes() -> None:
    for archetype, sizes in ARCHETYPES.items():
        for key, specs in sizes.items():
            size = key.capitalize()
            for index, (csv, _grant, passives, weight, effect) in enumerate(specs):
                names = [n.strip() for n in csv.split(",") if n.strip()]
                if names == ["Voices"]:
                    continue
                tag = pick_pool(archetype, size, names)
                fixed = repair_names(names, tag)
                specs[index] = (",".join(fixed), CATEGORIES[tag]["grants"][size], passives, weight, effect)


align_archetypes()

# name, popularity %, average dps, peak dps, archetype, class weights
SKILLS = [
    ("Ice Nova of Frostbolts", 14.2, 35.3e6, 164.0e6, "cold-projectile",
     [("Hierophant", 74), ("Inquisitor", 18), ("Occultist", 8)]),
    ("Molten Strike of the Zenith", 8.4, 70.2e6, 425.0e6, "fire-melee",
     [("Juggernaut", 66), ("Slayer", 34)]),
    ("Hexblast", 7.9, 43.8e6, 198.0e6, "chaos-dot",
     [("Trickster", 58), ("Occultist", 27), ("Pathfinder", 15)]),
    ("Splitting Steel", 4.8, 27.9e6, 152.0e6, "physical-impale",
     [("Trickster", 74), ("Champion", 26)]),
    ("Righteous Fire", 4.6, 12.4e6, 61.0e6, "fire-melee",
     [("Chieftain", 71), ("Juggernaut", 18), ("Inquisitor", 11)]),
    ("Winter Orb", 3.6, 32.6e6, 138.5e6, "cold-projectile",
     [("Occultist", 68), ("Slayer", 21), ("Elementalist", 11)]),
    ("Lightning Strike", 3.3, 24.1e6, 121.0e6, "lightning",
     [("Raider", 44), ("Slayer", 31), ("Deadeye", 25)]),
    ("Animate Guardian", 2.4, 8.1e6, 44.0e6, "minion",
     [("Necromancer", 82), ("Guardian", 18)]),
    ("Raise Spectre", 2.3, 9.4e6, 52.0e6, "minion",
     [("Necromancer", 76), ("Guardian", 24)]),
    ("Penance Brand", 2.3, 28.7e6, 143.0e6, "lightning",
     [("Elementalist", 69), ("Hierophant", 31)]),
    ("Ethereal Knives", 2.0, 19.8e6, 96.0e6, "physical-impale",
     [("Elementalist", 62), ("Trickster", 38)]),
    ("Cyclone of Tumult", 1.8, 15.2e6, 88.0e6, "physical-impale",
     [("Slayer", 58), ("Champion", 42)]),
    ("Earthquake", 1.6, 17.3e6, 74.0e6, "physical-impale",
     [("Slayer", 66), ("Juggernaut", 34)]),
    ("Fire Trap", 1.6, 9.9e6, 48.0e6, "fire-melee",
     [("Chieftain", 74), ("Elementalist", 26)]),
    ("Earthshatter", 1.5, 13.6e6, 79.0e6, "physical-impale",
     [("Berserker", 68), ("Chieftain", 32)]),
    ("Toxic Rain", 1.4, 11.2e6, 57.0e6, "chaos-dot",
     [("Pathfinder", 62), ("Trickster", 38)]),
    ("Summon Raging Spirit", 1.2, 7.8e6, 41.0e6, "minion",
     [("Guardian", 71), ("Necromancer", 29)]),
    ("Essence Drain", 1.1, 6.4e6, 33.0e6, "chaos-dot",
     [("Occultist", 88), ("Trickster", 12)]),
]

NAME_PREFIX = ["Ash", "Vex", "Nyx", "Kael", "Zorn", "Mira", "Thal", "Seryn", "Ruin", "Oryn",
               "Calder", "Isolde", "Vayl", "Dross", "Ember", "Hollow", "Pyre", "Quill"]
NAME_SUFFIX = ["born", "weaver", "shade", "fang", "storm", "song", "heart", "brand", "reach", "fall",
               "bane", "wrath", "spark", "wake", "veil", "hymn"]
ITEM_ADJ = ["Doom", "Cinder", "Frost", "Void", "Gale", "Blood", "Rune", "Storm", "Ashen", "Cruel"]
ITEM_NOUN = ["Whorl", "Prism", "Splinter", "Knot", "Crest", "Eye", "Coil", "Blossom", "Shard", "Cage"]


def decay_series(peak: float, average: float, count: int) -> list[float]:
    """Geometric decay from `peak` to a floor, scaled so the mean equals `average`."""
    lo, hi = 0.001, 25.0
    for _ in range(200):
        k = (lo + hi) / 2
        values = [peak * math.exp(-k * i / max(1, count - 1)) for i in range(count)]
        if sum(values) / count > average:
            lo = k
        else:
            hi = k
    values = [peak * math.exp(-((lo + hi) / 2) * i / max(1, count - 1)) for i in range(count)]
    scale = average * count / sum(values)
    values = [v * scale for v in values]
    values[0] = peak
    return [round(v / 1000) * 1000 for v in values]


def rounded(value: float) -> float:
    return float(f"{value:.6g}")


def make_jewel(rng: random.Random, size: str, spec, unique_name: bool) -> dict:
    notables_csv, grant, passives, _weight, effect = spec
    notables = [n for n in notables_csv.split(",") if n]
    sockets = 3 if notables == ["Voices"] else 0
    jewel = {
        "size": size,
        "baseType": f"{size} Cluster Jewel",
        "itemName": "",
        "rarity": "rare",
        "passives": passives,
        "jewelSockets": sockets,
        "grantType": grant,
        "effectPercent": effect,
        "notables": notables,
        "smallGrants": [],
        "fractured": effect > 0 and rng.random() < 0.6,
        "corrupted": rng.random() < 0.05,
        "itemLevel": rng.choice([83, 84, 85, 86, 87]),
    }
    if notables == ["Voices"]:
        jewel["itemName"] = "Voices"
        jewel["rarity"] = "unique"
        jewel["grantType"] = ""
    elif rng.random() < 0.35:
        jewel["itemName"] = f"{rng.choice(ITEM_ADJ)} {rng.choice(ITEM_NOUN)}"
    if size == "Small" and rng.random() < 0.5:
        jewel["smallGrants"] = [rng.choice(["+5 to Maximum Life", "+6% to all Elemental Resistances"])]
    return jewel


def pick(rng: random.Random, specs) -> tuple:
    total = sum(s[3] for s in specs)
    roll = rng.uniform(0, total)
    upto = 0
    for spec in specs:
        upto += spec[3]
        if roll <= upto:
            return spec
    return specs[-1]


def make_unique_jewel(rng: random.Random, size: str, name: str, notables: list[str]) -> dict:
    """
    The two unique cluster jewels. They are fixed items rather than rolled combinations:
    Voices is three jewel sockets, Megalomaniac is three notables. Both are what the lists
    have to be able to hide, so the demo has to contain them.
    """
    return {
        "size": size,
        "baseType": f"{size} Cluster Jewel",
        "itemName": name,
        "rarity": "unique",
        "passives": 3,
        "jewelSockets": 3 if name == "Voices" else 0,
        "grantType": "",
        "effectPercent": 0,
        "notables": notables,
        "smallGrants": [],
        "fractured": False,
        "corrupted": False,
        "itemLevel": rng.choice([83, 84, 85, 86]),
    }


def make_clusters(rng: random.Random, archetype: str, heavy: bool) -> list[dict]:
    pool = ARCHETYPES[archetype]
    jewels = []

    if rng.random() < 0.12:
        # Voices has no notables at all: it is three jewel sockets, so its combination is
        # the item itself and its picture carries no gold "1 Added Passive Skill is" lines
        jewels.append(make_unique_jewel(rng, "Large", "Voices", []))
    elif rng.random() < 0.85:
        jewels.append(make_jewel(rng, "Large", pick(rng, pool["large"]), unique_name=True))

    medium_count = rng.choices([0, 1, 2], weights=[10, 45, 45 if heavy else 25])[0]
    for _ in range(medium_count):
        if rng.random() < 0.12:
            pool_notables = [n for n in pick(rng, pool["medium"])[0].split(",") if n]
            chosen = rng.sample(pool_notables, k=min(3, len(pool_notables)))
            jewels.append(make_unique_jewel(rng, "Medium", "Megalomaniac", chosen))
        else:
            jewels.append(make_jewel(rng, "Medium", pick(rng, pool["medium"]), unique_name=False))
    if rng.random() < (0.5 if heavy else 0.25):
        jewels.append(make_jewel(rng, "Small", pick(rng, pool["small"]), unique_name=False))
    return jewels


def main() -> None:
    rng = random.Random(20260707)
    used_names: set[str] = set()

    def character_name() -> str:
        while True:
            name = f"{rng.choice(NAME_PREFIX)}{rng.choice(NAME_SUFFIX)}"
            if rng.random() < 0.45:
                name += str(rng.randint(2, 99))
            if name not in used_names:
                used_names.add(name)
                return name

    def class_name(weights) -> str:
        total = sum(w for _, w in weights)
        roll = rng.uniform(0, total)
        upto = 0
        for name, weight in weights:
            upto += weight
            if roll <= upto:
                return name
        return weights[0][0]

    skills = []
    characters = []

    for name, popularity, average, peak, archetype, class_weights in SKILLS:
        build_count = round(TOTAL_BUILDS * popularity / 100)
        series = decay_series(peak, average, ROWS_PER_SKILL)

        top_builds = []
        for index, dps in enumerate(series):
            top_builds.append({
                "name": character_name(),
                "account": f"exile_{rng.randint(100000, 999999)}",
                "className": class_name(class_weights),
                "mainSkill": name,
                "level": rng.choices([100, 99, 98, 97], weights=[80, 12, 5, 3])[0],
                "dps": rounded(dps),
                "league": "Allflame",
                "clusterJewelCount": 0,
            })

        classes = []
        for cls, weight in class_weights:
            classes.append({
                "name": cls,
                "count": round(build_count * weight / 100),
                "percent": float(weight),
            })

        skills.append({
            "name": name,
            "buildCount": build_count,
            "popularityPercent": popularity,
            "averageDps": rounded(sum(series) / len(series)),
            "peakDps": rounded(series[0]),
            "medianDps": rounded(series[len(series) // 2]),
            "damageType": {
                "cold-projectile": "Cold", "fire-melee": "Fire", "chaos-dot": "Chaos",
                "physical-impale": "Physical", "lightning": "Lightning", "minion": "Minion",
            }[archetype],
            "classes": classes,
            "topBuilds": top_builds,
        })

        for index, build in enumerate(top_builds[:SAMPLED_PER_SKILL]):
            jewels = make_clusters(rng, archetype, heavy=index < 5)
            characters.append({
                "account": build["account"],
                "name": build["name"],
                "className": build["className"],
                "league": "Allflame",
                "mainSkill": name,
                "level": build["level"],
                "dps": build["dps"],
                "life": rng.randint(4200, 6800),
                "energyShield": rng.choice([0, 0, 240, 900, 1800]),
                "clusterJewels": jewels,
                "fetchedAt": "2026-11-07T09:15:00+00:00",
            })

    document = {
        "schemaVersion": 1,
        "leagueUrl": "allflame",
        "leagueName": LEAGUE_LABEL,
        "source": "sample",
        "synthetic": True,
        "syntheticNote": "Generated demo data. Not scraped from poe.ninja: skill shares, DPS, "
                         "class splits and character names are invented to exercise the UI.",
        "snapshotVersion": SNAPSHOT_VERSION,
        "snapshotName": "demo",
        "generatedAt": "2026-11-07T09:15:00+00:00",
        "minPopularityPercent": 1.0,
        "totalBuildsInLeague": TOTAL_BUILDS,
        "skills": skills,
        "characters": characters,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(document, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")

    jewels = sum(len(c["clusterJewels"]) for c in characters)
    combos = {(j["size"], tuple(sorted(j["notables"]))) for c in characters for j in c["clusterJewels"]}
    print(f"{OUT.relative_to(ROOT)}")
    print(f"  skills={len(skills)} characters={len(characters)} jewels={jewels} combos={len(combos)}")
    print(f"  size={OUT.stat().st_size / 1024:.0f} KiB")


if __name__ == "__main__":
    main()
