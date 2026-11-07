# poe.ninja PoE 1 builds API — as used by Forever Exiled

poe.ninja publishes no builds API. The app uses the same internal endpoints as the site.
This note records exactly what was verified, so the parsers can be repaired quickly when
poe.ninja changes something.

Everything here was cross-checked against independent open-source clients
(`cyrushadavi1/poe-league-tools`, `srhinos/poe-cli`, `jpitty03/cluster-jewel-research`,
`JCouce/poe-assistant`) and against poe.ninja's own client bundle. All requests are plain `GET`s with a descriptive
`User-Agent`.

---

## 1. `GET /poe1/api/data/index-state` → JSON

The league catalogue. `snapshotVersions` drives everything else: every builds request is
pinned to one `version` hash, and it rotates whenever poe.ninja re-snapshots.

```json
{
  "economyLeagues": [{ "name": "Allflame", "url": "allflame", "displayName": "Allflame" }],
  "buildLeagues":   [{ "name": "Allflame", "url": "allflame" }],
  "snapshotVersions": [
    {
      "url": "allflame",
      "type": "exp",
      "name": "Allflame",
      "snapshotName": "allflame",
      "version": "1550-20261107-08766",
      "timeMachineLabels": ["week-1", "day-1", "hour-6"],
      "passiveTree": "PassiveTree-3.29",
      "atlasTree": "AtlasTree-3.29"
    }
  ]
}
```

* Only `type == "exp"` entries are used (PoE 1 ladder). `depthsolo` is a separate bucket.
* `snapshotName` is the value of the `overview` query parameter everywhere else; it is
  **not** always the URL slug (`allflamehc` → `hardcore-allflame`).

## 2. `GET /poe1/api/builds/{version}/search?overview={snapshotName}&type=exp`

Returns `application/x-protobuf`. It ignores `Accept: application/json`.

Optional filters (all optional, all repeatable-ish in practice):
`skills`, `class`, `items`, `keypassives`, `masteries`, `anointed`, `weaponmode`, `bandit`,
`pantheon`, `min-cjewels`, `timemachine`, `heatmap`, `atlasheatmap`.

Decoded shape (field numbers are wire-level):

```
NinjaSearchResult   { 1: SearchResult result }

SearchResult        { 1: int32 total
                      2: repeated Dimension
                      6: repeated DictionaryRef
                     12: repeated Column }

Dimension           { 1: string id             e.g. "skills", "class", "items"
                      2: string dictionaryId   e.g. "gem", "class"
                      3: repeated { 1: int32 key, 2: int32 count } }

DictionaryRef       { 1: string id, 2: string hash }

Column              {  1: string name          e.g. "name", "class", "level",
                                                  "dps.total", "skills", "cjewels"
                       6: packed varints       numeric values, one per row
                       7: repeated string      string values, one per row
                       8: packed varints       boolean columns
                      11: string dictionaryId  numeric values index this dictionary
                      13: int32 rows }
```

Notes that cost real debugging time:

* The **same response** carries both the aggregate buckets (field 2) and the ladder rows
  (field 12) — one request gives popularity *and* DPS.
* Rows are **capped at 100** per query. To see more, partition by `class` and merge.
* A column is *either* strings (7) *or* numbers (6/8), never both.
* proto3 omits zeroes, so a missing `key` means index 0.
* `dps.total` arrives as a **string** (`"425.0M"`), not a number.
* Column names drift between seasons — match candidates (`dps` | `dps.total`,
  `class` | `className`, …) rather than exact names.

## 3. `GET /poe1/api/builds/dictionary/{hash}` → protobuf or NDIC

Categorical columns store indexes into a shared string table named by the hash in field 6.
Current snapshots wrap the table in a custom container:

```
"NDIC" | u32 version | u32 reserved | u32 count | u64 hash |
u32 (=16) | u32 blocks | u32 count | u64 (0)
(blocks-1) × { u32 offset, u32 size }      ancillary blocks, not read
count × u8 length
concatenated UTF-8 bytes
```

The header is exactly 44 bytes (little-endian). Older snapshots return a plain protobuf
message (`1: id`, `2: repeated value`) — the decoder falls back to that.

## 4. `GET /poe1/api/builds/{version}/character?account=&name=&overview=&type=`

Returns JSON for one character. This endpoint is **aggressively rate-limited**; the
`Retry-After` penalty escalates with repeat offences.

Relevant fields:

```jsonc
{
  "account": "…", "name": "…", "class": "Juggernaut", "league": "Allflame", "level": 100,
  "defensiveStats": { "life": 5400, "energyShield": 120 },
  "skills":  [{ "name": "Molten Strike of the Zenith", "isSelected": true }],
  "jewels":  [{ "itemData": { "typeLine": "Large Cluster Jewel", "enchantMods": [...],
                              "explicitMods": [...], "fracturedMods": [...] } }],
  "clusterJewels": [ /* same item shape, sometimes wrapped in itemData */ ],
  "items":   [ /* everything equipped or in the inventory */ ]
}
```

Cluster jewels appear in **any** of `clusterJewels[]`, `jewels[].itemData` and `items[]`,
sometimes wrapped in `itemData`, so all shapes are probed and de-duplicated.

`overview`/`type` pairing has differed between snapshots: the client tries
`snapshotName + exp` first and falls back to `leagueSlug + 0`, remembering whichever the
server accepted for the rest of the session.

### Cluster jewel mod text

| where | text | meaning in the app |
|---|---|---|
| enchant | `Adds 4 Passive Skills` | `Passives` |
| enchant | `3 Added Passive Skills are Jewel Sockets` | `JewelSockets` |
| enchant | `Added Small Passive Skills grant: 10% increased Projectile Damage` | `GrantType` (cluster type) |
| explicit / fractured | `1 Added Passive Skill is Eye to Eye` | `Notables` |
| explicit / fractured | `Added Small Passive Skills have 35% increased Effect` | `EffectPercent` |
| explicit / fractured | `Added Small Passive Skills also grant: +5 to Maximum Life` | `SmallGrants` |

Combination identity = `size + " + ".join(sorted(notables))`.

---

## Rate-limit etiquette implemented in the app

| behaviour | value |
|---|---|
| Minimum gap between requests | 5 s default (3 / 5 / 8 / 12 s in settings) |
| Requests in flight | 1 (serialised by `RequestPacer`) |
| On `429` | wait the full `Retry-After`, retry up to 4 attempts |
| After a `429` | steady interval × 1.5 (capped at 2 min) |
| On success | steady interval × 0.95 (floor 1 s) |
| Persistence | snapshot saved every few characters; sample is resumable |

## When poe.ninja changes something

1. The status bar shows `Sync failed: …` / `Sampling failed: …` with the HTTP status or the
   parser message.
2. The raw payload is written to `<AppData>/forever-exiled/diagnostics/*.bin`.
3. Decode it with `tools/verify_parsers.py` as a scratchpad — it already contains a protobuf
   reader and writer for exactly these messages.

## The bundled snapshot is synthetic

`tools/generate_demo_snapshot.py` writes `src/ForeverExiled.Core/Resources/demo-snapshot.json`
**without touching the network**. Skill popularity, average/peak DPS, class splits, accounts
and character names are all generated; only the cluster-jewel notables and the arithmetic are
real. The file identifies itself:

| field | value |
|---|---|
| `source` | `"sample"` (the app swaps the header badge to `SYNTHETIC SAMPLE` on this) |
| `synthetic` | `true` |
| `leagueName` | `"Allflame (demo)"` |
| `snapshotVersion` | `"demo-2026-11-07"` (real versions look like `1756-20261107-54805`) |

Never quote its numbers as league statistics — the real ladder is only reachable through
`Sync`, and the current live Allflame snapshot version comes from `index-state`.
