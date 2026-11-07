# Forever Exiled

A desktop **.NET 10 MAUI (Windows / WinUI 3) MVVM app** that answers one Path of Exile 1
question properly: **which cluster jewel combinations do the best builds actually use?**

It reads poe.ninja's PoE 1 build ladder, keeps every **main skill above 1% popularity**,
grades those skills **by DPS**, and then pulls the equipped cluster jewels of their
top-DPS characters to rank the combinations per skill and across the whole league.

```
Winter Orb  →  Medium cluster  →  Eye to Eye + Repeater   53.8%   7 / 13 builds   73.8M avg DPS
```

> Those figures come from the **bundled demo snapshot**, which is synthetic — see
> [Demo data is not league data](#demo-data-is-not-league-data). Real numbers only exist
> after a Sync.

---

## What it does

**Meta (league-wide)**
- Builds in the ladder, skills tracked, builds sampled, distinct combinations found.
- Most popular Large/Medium combinations across *all* sampled builds, with the skills
  that use them and the build that anchors each one.
- DPS leaders, most-used notables, highest-DPS builds.

**Cluster Lab (the main screen)**
- Ranked main-skill rail: every skill above the popularity floor, sorted by average DPS
  (or popularity), with a colour-coded damage-type accent and a DPS bar.
- Skill hero: average DPS, peak DPS, ladder popularity, build count, sampled-build count,
  dominant classes.
- Cluster-size switch (Large / Medium / Small) with live per-type counts.
- Combination cards: the notable set as chips, how many sampled builds run it, its share
  of the sample, the most common enchant type line, passive count, small-passive effect
  roll, weighted average DPS and the highest-DPS build using it.

**Ladder**
- Every sampled (or ladder-listed) character with class, main skill, DPS and how many
  cluster jewels they run; filterable.

**Settings**
- League selection, sample depth per skill, popularity floor, request pacing.
- Cache size, data-folder shortcuts, CSV export, "sample every tracked skill".

Everything is **cached locally and resumable**: characters already fetched are never
fetched twice, so re-running an analysis gets faster and pressing Cancel never loses work.

---

## Requirements

| | |
|---|---|
| OS | Windows 10 1809 (17763) or later, x64 |
| SDK | [.NET 10 SDK](https://dotnet.microsoft.com/download) |
| Workload | `dotnet workload install maui-windows` |

## Build & run

```powershell
dotnet workload install maui-windows          # once
dotnet build src/ForeverExiled.App -c Debug   # build the app
dotnet run   --project src/ForeverExiled.App  # unpackaged, no MSIX certificate needed
dotnet test  tests/ForeverExiled.Core.Tests   # parser + analyzer test suite
```

The app ships with a **bundled demo snapshot** so the entire UI is explorable before the
first network call. It is generated, not scraped: the header shows `SYNTHETIC SAMPLE`,
the league reads `Allflame (demo)`, and the snapshot version reads `demo — not the live
ladder`. Press **SYNC** to replace it with the real ladder for the selected league.

### Getting real data without the UI

The ladder is on poe.ninja, not inside this app. Anything that produces a snapshot JSON can
feed both the desktop app and the browser preview, so there is also a headless capture tool
that uses the same `SyncService` (plain .NET 10 console — no MAUI, no Windows):

```bash
dotnet run --project tools/ForeverExiled.Capture -- --preview
```

It walks the ladder, samples the top builds per skill, prints the leader combination and
writes `snapshot-allflame.json`; `--preview` also drops it in `preview/data/live-snapshot.json`
so the browser preview shows **real** numbers (the synthetic banner disappears once the
snapshot's `source` is `live`). Useful flags: `--skills 5 --depth 6 --pacing 3` for a quick
look, `--no-sample` for the ladder alone, `--help` for the rest.

### Demo data is not league data

`src/ForeverExiled.Core/Resources/demo-snapshot.json` is produced by
`tools/generate_demo_snapshot.py` and is **entirely synthetic**: skill shares, average and
peak DPS, class splits, account names and character names are invented. Only the shape is
realistic — cluster notables come from the actual PoE pools, and every sum, average and
sampled-build count is internally consistent, so the aggregation can be verified against
it.

It exists because the alternative was an empty window with no network: the sample lets the
UI, the analysis and the CSV export be exercised offline and in CI. **Do not quote its
numbers as league statistics.** For reference, the live Allflame ladder currently has
Winter Orb near the top of the popularity chart; the demo has its own ordering and numbers.

Real data only arrives through **Sync**, which writes a normal cached snapshot (the demo is
only the fallback when no cache exists).

### Look at it without Windows

The MAUI build is Windows-only, so the repository also carries a **browser preview of the
same UI** — identical layout, palette and copy, driven by the bundled snapshot and the same
aggregation rules:

```bash
python3 preview/serve.py        # → http://localhost:8080
```

It is a design aid, not the app: the aggregation, search, sorting, size switch, meta
filters, ladder table and the popularity floor are live, while sync/analyze show a progress
overlay and explain that network access is disabled there. The preview opens on the same
synthetic demo snapshot and carries an unmissable banner saying so; drop a real crawl in as
`preview/data/live-snapshot.json` and the banner disappears. See
[`preview/README.md`](preview/README.md) for the real-vs-simulated breakdown.

---

## How the data pipeline works

poe.ninja has no public builds API; the app talks to the same internal endpoints the site
itself uses. Everything below was verified against live responses and against independent
open-source clients (see [`docs/poe-ninja-api.md`](docs/poe-ninja-api.md)).

```
GET /poe1/api/data/index-state                    JSON   leagues + rotating snapshot versions
GET /poe1/api/builds/{version}/search             protobuf  ladder rows + popularity aggregates
GET /poe1/api/builds/dictionary/{hash}            NDIC   string tables for categorical columns
GET /poe1/api/builds/{version}/character          JSON   one character sheet (items, jewels)
```

**Phase 1 — ladder (cheap: ~1 request per tracked skill).**
One unfiltered search returns the aggregate popularity buckets *and* the ladder rows. The
`skills` bucket gives every main skill's share of the ladder; each skill above the floor
is then queried with `?skills=<name>` to collect its top-100 builds and grade them by
average / median / peak DPS.

**Phase 2 — cluster jewels (polite: rate-limited, cached).**
For a skill, the top-N builds by DPS get one `/character` request each. Cluster jewels are
extracted from `clusterJewels[]`, `jewels[].itemData` and `items[]` (all three shapes have
existed) and reduced to: size, passive count, enchant type line, notables, small-passive
grants and the `35% increased Effect` fracture.

**Combination identity** is `size + alphabetically sorted notables`, so
`Eye to Eye + Repeater` and `Repeater + Eye to Eye` are the same combination, and a build
running the same jewel twice counts once. Popularity is *builds running it ÷ builds
sampled for that skill*.

### Rate limiting is deliberate

poe.ninja throttles the character endpoint hard and the `Retry-After` penalty escalates
(observed 81s → 168s → 865s → 3294s). The app therefore:

- serialises every request through a pacer (default one request every 5 s, configurable);
- honours `Retry-After` exactly and widens the steady pace by 1.5× after each 429;
- saves after every few characters so a long crawl can be cancelled and resumed.

Ladder and dictionary calls use a separate, faster gate (~1.2 s) because they are served from an
aggregate cache — a full sync is ~30–40 s. Only per-character calls use the configurable pacing,
so sampling one skill at depth 12 takes about a minute.

---

## Solution layout

```
ForeverExiled.sln
├─ src/ForeverExiled.Core            net10.0 (no UI dependencies — unit-testable)
│  ├─ Models/                        SkillStat, ClusterJewel, ClusterCombo, MetaAnalysis…
│  ├─ Net/PoeNinjaClient.cs          endpoints, retry/429 handling, pacer
│  ├─ Net/ProtoWire.cs               minimal protobuf wire reader (no codegen)
│  ├─ Net/SearchResponseParser.cs    ladder columns + aggregate dimensions
│  ├─ Net/DictionaryDecoder.cs       NDIC container + legacy protobuf fallback
│  ├─ Net/CharacterJsonParser.cs     character sheet → CharacterSnapshot
│  ├─ Analysis/ClusterJewelParser.cs mod text → structured cluster jewel
│  ├─ Analysis/MetaAnalyzer.cs       per-skill + global aggregation
│  ├─ Analysis/SyncService.cs        two-phase sync, resumable sampling
│  ├─ Analysis/SnapshotStore.cs      JSON cache, settings, diagnostics
│  └─ Resources/demo-snapshot.json   bundled offline sample (embedded resource)
├─ src/ForeverExiled.App             net10.0-windows10.0.19041.0 (MAUI / WinUI 3)
│  ├─ ViewModels/MainViewModel.*.cs  one screen VM, split by screen
│  ├─ Views/                         MainPage shell + Meta / Cluster Lab / Ladder / Settings
│  ├─ Themes/                        Colours + styles (dark, gold-accented)
│  └─ Converters, Theming/Palette.cs
├─ tests/ForeverExiled.Core.Tests    xunit: wire format, dictionaries, jewels, aggregation
└─ preview/                          browser mirror of the UI (design aid, not shipped)
```

The MAUI layer is pure MVVM: `MainViewModel` (CommunityToolkit.Mvvm source generators)
owns the state, exposes display item view models (`SkillCardItem`, `ComboItem`, …) and
issues commands; the views contain no logic beyond bindings.

---

## Verification without Windows

The app needs Windows, but the risky part — the binary protocol — does not. Two scripts
in `tools/` keep the parsers honest:

```bash
python3 tools/verify_parsers.py   # executable spec: builds real wire-format payloads
                                  # (protobuf search response, NDIC dictionary, character
                                  # JSON) and asserts decoding, DPS parsing, jewel parsing
                                  # and aggregation match the C# logic
python3 tools/check_csharp.py     # parses every .cs file with tree-sitter's C# grammar
python3 tools/check_xaml.py       # validates XAML: StaticResource keys, binding paths,
                                  # command names and image references against the C#
python3 tools/generate_demo_snapshot.py   # regenerates the bundled sample snapshot
```

`verify_parsers.py` caught two real bugs during development (cluster jewels wrapped in
`itemData` inside `clusterJewels[]`, and DPS values written with thousands separators), and
`check_xaml.py` caught a missing binding target and a stale command name.

---

## Known limitations

- **The builds API is undocumented and versioned per snapshot.** The snapshot hash comes
  from `index-state` on every sync, so it self-heals across seasons, but poe.ninja can
  still change the payload shape. When a decode fails the raw payload is written to
  `…/forever-exiled/diagnostics/` and the status bar reports it instead of silently
  showing zero builds.
- **Cluster data is a sample, not a census.** Counting every character in a league would
  mean tens of thousands of rate-limited requests. Sample depth is configurable (6–30
  builds per skill) and every percentage is shown against the sample size.
- **DPS is poe.ninja's weighted meta DPS**, not Path of Building's full calculation.
- Windows only, by design (MAUI/WinUI 3 desktop).
- The bundled sample data is synthetic-but-realistic and always labelled `SAMPLE DATA`.

## Roadmap

- Timemachine comparison (week-over-week shifts in cluster popularity).
- Keep-percentile filters ("only builds above 50M DPS") before aggregation.
- Pin/favourite combinations and diff two leagues side by side.
