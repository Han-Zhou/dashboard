# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # Install dependencies
npm run dev       # Start dev server at http://localhost:5173
npm run build     # Build for production (outputs to dist/)
npm run preview   # Preview production build
```

No test suite exists in this project.

## Architecture

Single-page React app built with Vite. No backend — entirely client-side. All simulation data is pre-generated CSV files served from `public/data/`.

**Data flow:**
1. On mount, `Dashboard.jsx` fetches all 10 CSV files from `/public/data/` in parallel using PapaParse
2. Each CSV maps to a scenario via its filename (parsed by `parseCsvFilename()`)
3. User parameter dropdowns (`parameterSelections` state) determine which scenario's data is displayed
4. Chart rendering functions read from `dynamicsData` state and transform it for Recharts

**Scenario → CSV filename mapping:**
- Baseline: `dynamics_df_base.csv`
- Student-student contact reduction: `dynamics_df_contact_[10|20|30].csv`
- COVID testing coverage: `dynamics_df_test_covid_[1|5|10].csv`
- Flu testing coverage: `dynamics_df_test_flu_[1|5|10].csv`

Parameters are mutually exclusive — selecting one resets the others to their defaults.

**CSV column naming convention:** `{disease}_{metric}_{ageGroup}_{statistic}`
- Diseases: `covid`, `flu`, `rsv`
- Metrics: `infections`, `symptomatic`, `recovered`, `hospitalized`, `new_hospitalizations`
- Age groups: `infant`, `preschool`, `child`, `adult`, `senior`
- Statistics: `_mean`, `_p2_5` (lower 95% CI bound), `_p97_5` (upper 95% CI bound)

**Key files:**
- `src/Dashboard.jsx` — entire app logic (1000+ lines): data loading, state, parameter definitions, chart renderers
- `src/App.jsx` — thin wrapper that renders `<Dashboard />`
- `public/data/*.csv` — simulation output data (~37 MB total)
- `public/*.html` — standalone parameter description pages (covid-testing.html, flu-testing.html, student-student-contact.html)

**Charting:** Recharts library (LineChart, BarChart, ComposedChart). Age group colors are fixed: infant=#ef4444, preschool=#f59e0b, child=#10b981, adult=#3b82f6, senior=#8b5cf6.

**Known issues:** See `issues.md` for a list of UX/data problems including: parameters can't be combined, only COVID data is shown (flu/RSV not yet wired up), axis labels are unclear, and terminology needs clarification for non-expert users.
