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
- Most-used notables, and a crafting card for the combination you select: target notables,
  minimum item level, the method routes with currency amounts, try counts and expected cost.

**Cluster Lab (the main screen)**
- Ranked main-skill rail: every skill above the popularity floor, sorted by peak DPS (or
  popularity), with a colour-coded damage-type accent and a DPS bar.
- Skill hero: average DPS, peak DPS, ladder popularity, build count, sampled-build count,
  dominant classes.
- Cluster-size switch (Large / Medium / Small) with live per-type counts.
- Crafting card: the selected combination priced with the cheapest ways to hit it, the
  minimum item level its notables need, and the odds for that level-gated pool.
- Combination cards: the notable set as chips, how many sampled builds run it, its share
  of the sample, the most common enchant type line, passive count, small-passive effect
  roll, weighted average DPS and the highest-DPS build using it.

**Ladder**
- The Ladder tab lists **every build the app is using**: the characters it has read (`sampled`,
  with their cluster counts) and the top-DPS ladder rows it picked to sample (`top-DPS pick`),
  highest DPS first, filterable by name, class or skill. It is the answer to "which builds are
  behind these numbers", and each row has an icon button that opens that character's page on
  poe.ninja.
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

The header shows which build is running — `v1.0.0 · pipeline 9 · built 2026-11-08 17:32`. The
pipeline revision is bumped whenever sync behaviour changes, so "is this build new enough to have
the fix" is a question the screen answers.

**SYNC is the whole pipeline**: it grades the ladder, then reads the top builds of every
tracked skill so the cluster lab has characters to work with. One button, two phases, with the
phase named on the busy panel. The lab's **ANALYZE** / **SAMPLE ALL** buttons remain for
re-reading a single skill or everything on demand — already-sampled characters are skipped, so
they cost only what is new.

A skill the ladder could not grade (a failed request, or a pause from poe.ninja) is not left as
a silent dash: the rail labels it `not graded`, the status banner names how many skills are
affected and why, and the next sync retries them.

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
snapshot's `source` is `live`). It grades the same way the app does (one page per skill) unless
you pass `--quick`. Useful flags: `--skills 5 --depth 6 --pacing 3` for a quick
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

### Visual language

The UI deliberately reuses poe.ninja's own look so it feels like part of the site rather than
a fan tool bolted onto it: slate-grey panels on a near-black background, a single green accent
for selection and primary actions, a horizontal tab bar across the top, hairline 1px borders,
3-4px corner radii, compact 26-32px rows and right-aligned tabular numbers. Path of Exile's
own rarity colours are used where they carry meaning (mod text in magic blue, unique items in
orange), and cluster jewels use tile-framed icons instead of text labels.

Surfaces are translucent: the page is a lit room (three soft coloured lights over near-black,
fixed behind the content) and the cards are glass over it - a diagonal gradient at ~70% opacity,
a backdrop blur, a 1px highlight along the top edge and a soft drop shadow. Controls are outlined
objects with their own gradient and a shadow, buttons lift a pixel and brighten on hover, pills
glow green when selected, and lists rise into place 10px with a short fade. The MAUI themes carry
the same treatment through `Themes/Colors.xaml` (gradient brushes for cards, panels, page and
buttons) and `Themes/Styles.xaml` (shadowed gradient cards, outlined gradient buttons), with
`Behaviors/RiseOnLoadBehavior.cs` for the entrance animation.

Every skill, cluster jewel and class is identified by its real in-game artwork rather than a
label, so the interface reads as pictures with captions rather than text with decorations.
Class art is never a thumbnail inside a line of text: it gets the same tile footprint as the
skill gem it sits next to (40px in the rail, 30px in the ladder table, 78px in the skill
header), so a row reads as two pictures and a caption.

Sampling walks *down* a skill's list. The first pass reads its top builds; pressing ANALYZE or
SAMPLE ALL again reads the next ones instead of re-reading the same handful, so a skill progresses
21 of 40 → 33 of 40 → 40 of 40 and stays put only when there is genuinely nothing left. Anything
that claims a skill is finished now means "every build it lists has been read", not "at least one
has".

Each skill row carries **two** numbers: the peak DPS of its best build (the figure the site's own
column shows, and what "by DPS" sorts on) and the average across the page of builds beside it. When
the site publishes nothing for a skill - some Vaal variants are measured under the gem they are
socketed next to - the row borrows the base gem's figures and says so ("peak · Reap") rather than
showing a dash over a skill the site visibly has data for. Class shares are computed from every row
a skill has, not only the graded ones, so a skill without a DPS column still carries its ascendancy
portrait.

Hovering any cluster jewel - in the combination list, the meta table or the global-leader card -
opens the item card exactly as poe.ninja prints it: a gold band carrying the rarity-coloured name
over the base type with the jewel's art pinned to its left, then centred blocks separated by
hairlines - item level, "Adds N Passive Skills" and the jewel sockets, "Added Small Passive Skills
grant: ...", one gold "1 Added Passive Skill is X" per notable, then each notable spelled out with
its own blue modifier lines and a row of coloured mod-tag chips - closed by the jewel art at the
foot. The game's "Place into an allocated ... Jewel Socket" instruction is left out: it is the same
seven lines on every jewel and tells a reader of a table nothing. The body is set in a serif face on near-black, every line
centred, and nothing else: no build counts, no DPS, no odds. The card is 348px wide - a
notable's modifier lines should wrap at most once - and it is measured before it is placed, so a
tall jewel flips above the pointer instead of having its last notable cut off by the window edge. The preview positions the card against
the cursor in `preview/app.js`; the app builds the same card from the same model
(`ViewModels/JewelCard.cs` → `Views/Controls/ClusterJewelCard.cs`) and floats it under the pointer.
The modifier text comes from Path of Building's tree data (`preview/assets/notables.json`, 300
cluster notables, built by `tools/build_notable_text.py`), including the game's grey reminder text.

Every notable also carries its **spawn weight**. A cluster jewel base ("12% increased Fire
Damage", "10% increased Projectile Damage") rolls its notables from one pool, and each notable has
a weight inside that pool. Those numbers live on the **crafting** surface, where they decide the
cost - the card that prices a combination prints the pool ("Fire Damage over Time pool · 18
notables + 51 small-passive mods · 13,195 prefix / 14,150 suffix weight at iLvl 86") and, per
target mod, its weight and the odds of rolling it. The item card does not repeat them: on the site
the item card is the item, and the analysis belongs to the table beside it.

The pool is **not just the notables**. The generic small-passive grants every cluster jewel can
roll ("Added Small Passive Skills also grant: +3 to maximum Life") compete for the same affix
slot, and they carry most of the weight: 7,200 of that 13,195 prefix pool on a medium base. Leave
them out and a specific notable looks 2.4x more likely than it is, which is the difference
between an alt→regal chain costing 4.6K chaos and the 6.6K craftofexile.com reports. The numbers come from the game's mod data
via Path of Building's `ModJewelCluster.lua` + `ClusterJewels.lua` - the same `spawn_weights`
craftofexile.com reads - built into `preview/assets/notable_weights.json` by
`tools/build_notable_weights.py` and compiled into `Theming/NotableWeights.g.cs` by
`tools/sync_notable_weights.py`. Notables are only ever shown with the weight of the pool their
own jewel rolls from; the demo snapshot is regenerated so every jewel sits on a real base with
its notables drawn from that base's pool. Each notable also carries the game's **mod tags**
(`fire`, `ailment`, `elemental`...) - the tags fossils, harvest and influences key off - shown as
coloured chips wherever a mod is being priced. The tag
list is the site's vocabulary of leaf tags: the composite tags a mod-tag query uses
(`elemental_damage` is elemental + damage, `resource` is the parent of life and mana) are
dropped, because each of them always arrives alongside the tags that explain it. Doryani's
Lesson therefore reads *life, damage, elemental*, not five tags.
They are coloured by family, not printed as one grey row: warm reds for damage, one hue per
element, blues for mana and energy shield, greens for resistances, speed and poison. The palette
lives in `preview/assets/tag_colors.json` and is mirrored into `Theming/TagColors.g.cs` by
`tools/sync_tag_colors.py`, so the app and the preview paint a tag the same way. Colour is
decoration: no odds or cost number ever reads it.

The ladder's column headers sort it: click a column to order by it, click it again to flip the
direction, and a caret names the column in force. Rank keeps showing each build's real ladder
position, so sorting by DPS does not renumber the league - it reorders the view of it.

### Lists stay cheap

The ladder holds a few hundred rows, each with a class portrait, a gem icon and seven cells. Two
things keep that from costing frames: the rows live in a virtualising `CollectionView` (only the
visible dozen exist as controls, so scrolling does not re-lay-out hundreds of them), and the rows
themselves are handed over as one freshly built list per filter change rather than appended one by
one to an observable collection - appending re-lays-out the whole stack per row, which is
quadratic. The same holds for the skill rail and the combination cards, and picking a skill whose
cards are already on screen does not rebuild them at all. The preview does the same job with `content-visibility: auto`, a rank lookup table
instead of `indexOf` inside a comparator, and a debounce on the search field so typing does not
rebuild every row per keystroke.

### The unique cluster jewels

Voices and Megalomaniac are cluster jewels too, but they are not combinations anyone can roll: one
is three jewel sockets, the other is three notables on a fixed base. They would otherwise sit at
the top of a popularity ranking and hide the bases people actually craft, so both lists carry a
**UNIQUES** toggle, and the choice is saved in the settings file (`showUniqueJewels`, on by
default). Hiding them also hides them from the size pill counts, from the Meta combination list
and from the global leader card — a hidden jewel cannot be the headline. The bundled demo carries
55 of them (21 Voices, 34 Megalomaniac) so the toggle is visible without live data.

### Crafting options

Because the weights are known, the app can say what a jewel costs to craft. Picking a
combination — in the Cluster Lab or on the Meta screen — prices it in the "Crafting" card:
the three cheapest routes, each with the expected number of tries and the currency that goes
into them. Both screens show the card and share the selection, so the priced row is outlined
wherever you picked it.

| Route | Assumption | Currency per attempt |
| --- | --- | --- |
| Alt + Aug | magic jewel: one prefix + one suffix | 1 Alt + ½ Aug |
| Chaos Orb | rare jewel: two prefixes + two suffixes (three of a type when the jewel needs it) | 1 Chaos |
| Harvest Reforge | same pool odds as a chaos roll | 1 reforge |
| Fossil (3-socket) | odds treat the fossils as neutral | 1 resonator + 3 fossils |
| Alt → Regal | the magic jewel chases one target of each type, the regal must add the last one | alts + ½ alts of Aug + 1 Regal + 1 Scour + 1 Transmute per cycle |

A jewel can only roll a notable once its item level reaches the notable's level, so the card
names the **minimum iLvl** for the combination (the highest level among its notables) and prices
every route on a base at exactly that level. That is both the cheapest base and the smallest
pool: an iLvl 68 base cannot roll the notables that need 75, so the same combination is easier to
hit than on the iLvl 86 one already in the build. The item card weighs its notables at the
actual item's own level instead, and says so ("at iLvl 86").

A route's chance is the joint probability of every notable landing in the slots the item
actually has: a magic jewel holds one prefix and one suffix, a rare one up to three of each. That
distinction matters most for Alt → Regal, which cannot put two notables of the same type on a
magic jewel - the magic stage lands one, and the regal has to land the other, or the cycle scours
back and starts again. What a cycle costs is therefore a burst of alts, a 45% share of augments,
one regal, one scouring and one transmutation, and the card reports **cycles** for that route
while `1 in N tries` is kept for the routes that reroll a whole item. Costs are counts times the
price of one attempt; prices live in `preview/assets/currency_costs.json` for the preview and
`Theming/CurrencyPrices.cs` for the app. **They are hand-maintained placeholders, not live
prices** - edit them for your league. The defaults follow the league craftofexile.com priced its
methods in (alteration 0.18 c, augmentation, regal, transmutation and scouring 1 c each), because
augment-heavy routes only look expensive next to realistic prices.

Because the level sets the pool, the card gives two figures: the **minimum iLvl** base (cheapest
legal base, smallest pool) and the same craft on an **iLvl 86** base, which is the base most
crafters buy and the level other calculators use. For Cooked Alive + Wasting Affliction on a
medium Fire Damage over Time base:

| | iLvl 68 base (card headline) | iLvl 86 base | craftofexile.com |
| --- | --- | --- | --- |
| per-slot chance | 1.21% | 1.04% | 0.978% |
| Alt → Regal cycles | 159 | 198 | 204 |
| Orbs of Alteration | 6,586 | 9,536 | 10,239 |
| Orbs of Augmentation | 2,964 | 4,291 | 4,179 |
| total chaos | 4.6K c | 6.6K c | 6,635 c |

Two honest limits: fossils are priced but not weighted (the game's fossil table is not in the
bundled data, so fossil rows assume the fossils neither boost nor block anything), and a rare
roll is modelled as two prefixes + two suffixes, widening to three when a combination needs
three of a type, rather than the full affix distribution.

Those tokens live in one place per surface: `preview/styles.css` (`:root`) for the browser
preview and `src/ForeverExiled.App/Themes/Colors.xaml` for the app; the app fonts are Segoe UI
with Segoe UI Semibold for headings, matching what the site renders as on Windows.

#### Artwork

Icons are inline SVG (no icon font, no network). The logo is generated for this project.
Everything else is real Path of Exile art, so the cluster jewels and class portraits look
exactly like the game's own inventory icons:

* skill gem icons (`preview/assets/gems/`, `Resources/Images/gem_*.png`) come from
  [PoE-Gems](https://github.com/MuffinsBeGreat/PoE-Gems) — 507 gems, shipped at two sizes;
* cluster jewel icons (`preview/assets/cluster_*.png`, `Resources/Images/cluster_*.png`) come
  from [ExileCraft](https://github.com/jmduea/ExileCraft) (MIT);
* ascendancy and class portraits (`preview/assets/asc/`, `Resources/Images/asc_*.png`) come from
  [Path of Building](https://github.com/PathOfBuildingCommunity/PathOfBuilding) (GPL-3.0).

The art itself belongs to Grinding Gear Games and is used here the way poe.ninja uses it, as
identification for a free, non-commercial fan tool. Replace or drop it if that is a problem for
your use.

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

**Phase 1 — ladder.**
Every search is sent with `sort=dps`, the ordering the site's own builds page uses; without
it the server answers in no particular order and a 100-row page can contain none of the
league's top-DPS builds. The `skills` bucket that comes back gives every main skill's share of
the ladder — the same percentages the site prints in its own "main skills" panel.

Full grading (the default: Settings → **skill grading → FULL**, `--grade-all` in the capture
tool) then reads every skill's own builds page — `?skills=<name>&sort=dps`, the table the site
shows — with the search API as the fallback when a page cannot be read. One request per tracked
skill, paced, and the DPS figures are the site's own column rather than a decode of it. That
matters: the protobuf route answered per-skill searches with a DPS column that only carried the
first row's value, so every other build looked like it had no damage.

Quick grading (Settings → **skill grading → QUICK**) skips those and groups the single
unfiltered page of rows by skill — and escalates to per-skill grading by itself as soon as that
one page fails to cover a quarter of the tracked skills, because it never covers more than a
handful. Faster, but twenty skills then share one page of builds, so
a skill's top row is whatever happened to land on it: fine as a rough ordering, not
comparable to the site's DPS figures. The sync escalates to full grading by itself when the
unfiltered response carries no rows at all.

The main-skill rail is ordered by **peak DPS** — the strongest build of that skill — and shows
that same number, because it is the figure the site's DPS column and its "DPS" sort are about.
The average is a mean over that skill's ladder page and lives in the skill hero and the
cluster cards.

**Phase 2 — cluster jewels (polite: rate-limited, cached).**
For a skill, the top-N builds by DPS get one `/character` request each. The ordering is
poe.ninja's DPS column per ladder row (`dps_total` in the current payload, and the site sorts
on it too), highest first. If no column carries that
name, the parser falls back to the column whose values look like damage (largest numbers,
excluding level / experience / life and friends) and logs which one it picked; if nothing
looks like damage at all, the snapshot is flagged and the UI stops calling the sample
"top-DPS". The rows we ever see
are capped: one `search` call returns at most ~100 rows for the site's current sort, so a
skill's sample is its DPS leaders, not a random or complete slice of the ladder. The sample
size is `SampleDepth` (default 12, Settings → sample depth). Cluster jewels are
extracted from `clusterJewels[]`, `jewels[].itemData` and `items[]` (all three shapes have
existed) and reduced to: size, passive count, enchant type line, notables, small-passive
grants and the `35% increased Effect` fracture.

**Combination identity** is `size + alphabetically sorted notables`, so
`Eye to Eye + Repeater` and `Repeater + Eye to Eye` are the same combination, and a build
running the same jewel twice counts once. Popularity is *builds running it ÷ builds
sampled for that skill*.

### When the ladder comes back without rows

A sync can return the skills and their popularity but no ladder rows: poe.ninja answers
the same `search` call with the aggregate buckets alone. That is the shape of the response
in which nothing can be sampled, so the app now

- retries the call once with the league slug as `overview` (the site's own pages use it)
  before concluding the ladder is empty;
- keeps the rows it did get, even without DPS values, and samples them anyway — the
  character sheet carries the DPS number;
- records a `ladderWarning` on the snapshot, which the app shows in the status bar and the
  preview shows as a banner, instead of an empty lab that looks like a league with no
  cluster jewels.

To see what poe.ninja actually sent, run the capture tool in diagnostic mode:

```powershell
dotnet run --project tools/ForeverExiled.Capture -- --diagnose
```

It prints the total, the dimensions and every column it decoded for both `overview`
values, and writes `diagnostics/search-*.bin` (the raw protobuf) plus a `.txt` summary.
Those two files are what a parser fix needs.

### Scraping the pages before the API

poe.ninja rate-limits its JSON endpoints, and the character endpoint hardest: a crawl of a few
hundred characters earns multi-minute penalties. The same character is also published as a
server-rendered HTML page - the site's own builds table links every row to
`/poe1/builds/{league}/character/{account}/{name}` - which is cached and served far more freely.

So a character is read from **its page first**: the scraper pulls the JSON the page embeds
(Astro island props, or a `application/json` script block), unwraps Astro's `[tag, value]`
encoding, and hands the result to the same parser the JSON endpoint feeds. The jewel sections
are the same data. If a page carries no item data - the one case where the site renders names
only - the log says so and the JSON endpoint is asked instead, so the fallback is automatic
rather than a setting to get right. `--no-pages` (capture tool) and
`AppSettings.PreferCharacterPages` force the endpoint.

A page the parser cannot read is never silently empty: the log reports its size and how many rows
were recognised, and the HTML is saved to `diagnostics/builds-<skill>-<time>.html` so the markup
can be inspected rather than guessed at.

The **builds table is not scraped**: `/poe1/builds/{league}?skills={skill}&sort=dps` arrives as
a 46 KB client-rendered shell with no rows in the HTML (measured), so the ladder comes from the
search API, whose per-skill responses name their DPS column after the skill -
`dps-Righteous Fire.total`. That column, not `dps.total`, is what a filtered table is sorted and
displayed on, and the parser matches it by name before falling back to magnitude guessing. The
page scraper survives only as a last resort for a skill the API leaves empty (and reports what
it found when that happens).

### Rate limiting is deliberate

poe.ninja throttles the character endpoint hard and the `Retry-After` penalty escalates
(observed 81s → 168s → 865s → 3294s). The app therefore:

- serialises every request through a pacer (default one request every 5 s, configurable) and
  never crawls faster than the pace you set — relaxing only closes in on it;
- honours `Retry-After` with a visible countdown on the busy panel, and widens the steady pace
  by 1.5× after each 429;
- sits out a stated pause of up to 10 minutes (the penalties are stated in minutes, so a crawl
  has to be able to absorb one) and stops cleanly beyond that: what was sampled is already
  saved, and the status line says when to press ANALYZE again. A pause is reported as a
  status, not as a failure — the ladder and the characters you already have stay usable;
- saves after every few characters so a long crawl can be cancelled and resumed, and skips
  characters it has already sampled, so each run continues where the last one stopped.

Ladder and dictionary calls use a separate, faster gate (~1.2 s) because they are served from an
aggregate cache, and a dictionary is fetched once per hash per session - every per-skill response
references the same handful — a full sync is ~30–40 s. Only per-character calls use the configurable pacing,
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

### Media assets

`python3 tools/sync_notable_text.py` compiles the notable descriptions in
`preview/assets/notables.json` into `Theming/NotableText.g.cs`; the JSON itself is extracted
from a Path of Building tree file by `tools/build_notable_text.py`.

`python3 tools/build_notable_weights.py ModJewelCluster.lua ClusterJewels.lua` extracts every
cluster notable's spawn weight per cluster base tag into `preview/assets/notable_weights.json`
(300 notables, 54 bases, pool totals around 6,000 each), and `tools/sync_notable_weights.py`
compiles that into `Theming/NotableWeights.g.cs`. Both Lua files come from the Path of Building
repository (`src/Data/`), which is generated from the game's own mod data.

`python3 tools/sync_tag_colors.py` mirrors the hand-picked tag palette in
`preview/assets/tag_colors.json` into `Theming/TagColors.g.cs` (one hue per tag, plus the 12%
tint and 30% edge the chips are drawn with). Edit the JSON, re-run the script, and both the
browser and the app repaint together.

`python3 tools/sync_gem_art.py` rebuilds everything derived from the gem art: the preview's
`assets/gems/index.json` (so the browser knows which gems have art before asking for a 404),
the 64px copies in `Resources/Images/gem_*.png`, and the generated `Theming/GemArt.g.cs`
lookup. Both sides resolve a skill name the same way — exact slug first, then a variant
("Raise Spectre" → "Raise Spectre of Transience"), then a neutral gem glyph.

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
