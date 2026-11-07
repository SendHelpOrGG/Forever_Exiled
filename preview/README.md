# UI preview

A browser mirror of the **Forever Exiled** desktop app. It exists because the real
thing is a Windows-only .NET MAUI binary: you can look at, click through and judge the
interface long before the first `dotnet build`.

```bash
python3 preview/serve.py        # → http://localhost:8080
```

Open the URL, press `1`–`4` to jump between screens, `/` to focus the skill search.

## What is real and what is simulated

| Real | Simulated |
|---|---|
| Layout, palette, type scale, all copy | `SYNC`, `ANALYZE`, `SAMPLE ALL` — a progress overlay runs, then says so |
| Aggregation: combo keys, per-build de-duplication, share-of-sample, weighted DPS, peak DPS, anchoring build, notable usage, class and size mix | Network calls — the page only ever reads `data/demo-snapshot.json` |
| Skill search, DPS/popularity sort, Large/Medium/Small switch, meta size filter, ladder sorting and filtering | League switching |
| **Popularity floor slider** — genuinely re-runs the analysis and re-ranks everything | Cache / folder actions (toasts explain) |
| CSV export (downloads from the sample) | |
| Meta size filter (All / Large / Medium) — a preview extra: the desktop Meta screen shows the combined top 12 | |

The numbers are produced by the same rules as `MetaAnalyzer.cs`, so they match what the
Windows app shows for the bundled snapshot: 18 tracked skills, 234 characters,
576 cluster jewels, 41 distinct combinations, Winter Orb → Medium → *Eye to Eye + Repeater*
at 53.8 % of sampled builds.

## Smoke test

`tools/preview_smoke_test.js` loads this page in jsdom and drives every screen —
skill selection, size switch, search, the four tabs, ladder filter/sort, the popularity
floor and the busy overlay — then asserts that each one rendered real numbers:

```bash
npm install jsdom                    # anywhere on NODE_PATH
node tools/preview_smoke_test.js     # 28/28 checks passed
```

## Files

| File | Purpose |
|---|---|
| `index.html` | App shell, four screens, icon sprite |
| `styles.css` | Design tokens copied from `Themes/Colors.xaml` + `Themes/Styles.xaml` |
| `app.js` | Aggregation port of `MetaAnalyzer`/`DpsFormatter` + rendering |
| `data/demo-snapshot.json` | Copy of the snapshot embedded in `ForeverExiled.Core` |
| `assets/` | Logo and cluster jewel art from the MAUI resources |
| `serve.py` | Dependency-free static server (binds `0.0.0.0`) |

This folder is a design aid, not part of the shipped application and not referenced by
`ForeverExiled.sln`. If the C# models change, `app.js` needs the same edit.
