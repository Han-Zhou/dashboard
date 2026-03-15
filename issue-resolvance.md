# Issue Resolvance

## 1. Support 64 independent parameter combinations

**Problem:** The dashboard enforced mutual exclusivity across the three intervention parameters (contact reduction, COVID testing, flu testing), resetting the others whenever one changed. Only 10 CSV files existed, each varying one parameter at a time. Contact reduction levels were {10%, 20%, 30%}.

**Fix:**
- Copied all 64 combination CSVs from `abm-tripledemic/` into `public/data/`; removed the old `contact_10` and `contact_20` files
- Replaced upfront preloading of all files (~230 MB) with lazy per-scenario fetching (~3.7 MB on demand, cached after first load)
- Rewrote `selectedScenario` to directly construct the filename key from all three parameter values simultaneously
- Removed mutual exclusivity from `onChange` handlers — each dropdown now controls only itself
- Updated contact reduction option values to `30/60/90` (was `low/medium/high`) and coverage values to `1/5/10` (was `low/medium/high`)
- `availableCsvFiles` is now generated programmatically over all 64 combinations

## 2. Show data for all three diseases

**Problem:** Only COVID-19 data was displayed; `selectedDisease` was hardcoded to `'covid'`.

**Fix:** Made `selectedDisease` stateful and added a tab bar (COVID-19 / Influenza / RSV) above the charts. Clicking a tab switches all chart sections to the corresponding disease's columns.

## 3. Clearer axis labels

**Problem:** Y-axes used inconsistent and uninformative labels ("Count", "People", "Hospitalizations") and X-axes said "Day" without context.

**Fix:** Standardised all Y-axes to "Hospitalizations" and all X-axes to "Day".

**Problem:** The rotated "Hospitalizations" label overlapped the numeric tick values on the Y-axis in the Daily Hospitalizations charts.

**Fix:** Added `left: 40` to the `ComposedChart` margin and adjusted the label offset so the label and tick numbers no longer overlap.

## 4. Not implemented yet

## 5. Clarify decimal hospitalization values

**Problem:** Hospitalization values in the charts are decimals (e.g., 0.285) because the CSV data contains means averaged across many stochastic simulation runs — not raw headcounts. Non-expert users see values like 0.3 and interpret them as errors or meaningless fractions.

**Fix:** Added a small explanatory note directly beneath each Daily Hospitalizations chart card (in `renderDailyHospitalCardByAge`), rendered as small (0.75rem) gray italic text: *"Values are averages across simulation runs. Decimal values (e.g., 0.3) represent the expected number of hospitalizations on a given day — not a whole-person count."*

## 6. Model overview on the landing page

**Problem:** Users were unlikely to click the ⓘ info buttons next to each parameter, leaving them without context on what the model represents, who the age groups are, or what the parameters actually do.

**Fix:** Added a collapsible "About This Model" section between the dashboard header and the parameter controls, open by default. It contains two cards:
- **Population Groups** — lists all five age groups with their chart colors and age ranges; uses "Older adults 65+" in place of "Seniors" (per issue #13).
- **Intervention Parameters** — plain-language descriptions of each parameter and what each level (Low/Medium/High) concretely means, with a prompt to use the ⓘ icons for full details.

Added `overviewExpanded` state (defaults to `true`) and a toggle button with an animated chevron. CSS added: `.model-overview`, `.overview-toggle`, `.overview-chevron`, `.overview-body`, `.overview-intro`, `.overview-grid`, `.overview-card`, `.age-dot`, `.overview-hint`.

## 7. Brief interpretive descriptions for chart sections

**Problem:** Section headings ("Uncertainty Bands", "Daily Hospitalizations", "Age Group Breakdown") gave no context to non-expert users about what the charts represent or how to read them.

**Fix:** Added a `.section-subtitle` paragraph below each section heading with a plain-language explanation:
- **Uncertainty Bands** — explains that the solid line is the mean across simulation runs and the shaded band is the 95% CI; notes that a wider band signals higher sensitivity to random variation.
- **Daily Hospitalizations** — clarifies that values are new admissions per day and that peaks indicate periods of peak healthcare strain.
- **Age Group Breakdown** — clarifies that these are cumulative outcomes and that the chart reveals which populations bear the greatest burden.

Added `.section-subtitle` CSS class (0.9rem, muted gray `#64748b`, 1.5 line-height) and reduced `.section-title` bottom margin from 24px to 8px so the subtitle sits flush under the heading.

## 8. Not implemented yet

## 9. Remove peak infections summary

**Problem:** The "Summary Statistics" section at the top of the dashboard showed a peak infections/recoveries count per scenario. The metric was not clearly defined for non-expert users and added little actionable value.

**Fix:** Removed the entire `key-findings` section from the JSX, the `summaryCards` variable, and the `getSummaryStats` helper function.

## 10. Clarify scenario labels for contact reduction parameter

**Problem:** When a user selected a contact reduction level (e.g. "Medium (60%)"), the "Active scenario" badge and chart titles displayed "Contact 60%". A user unfamiliar with the model would naturally read this as "students are in 60% contact with each other" rather than "student-student contact is reduced by 60%".

**Fix:**
- Changed `parseCsvFilename()` to render contact levels as `"60% contact reduction"` instead of `"Contact 60%"`. This label propagates automatically to the Active scenario badge, chart section titles, uncertainty card headers, and any other display that reads from `shortLabel`.
- Replaced the raw filename string-manipulation in the Active scenario display (`selectedScenario.replace(...)`) with `scenarioConfig[selectedScenario]?.shortLabel`, so all label rendering goes through one canonical source.

## 11. Correct parameter coverage levels in HTML description pages

**Problem:** The three HTML detail pages (linked via the ⓘ icons) showed parameter ranges that did not match the actual simulation values used in the model. Specifically:
- `covid-testing.html` and `flu-testing.html` listed coverage rates of 5–10% / 10–20% / 20–30% for Low / Medium / High, but the model uses 1% / 5% / 10%.
- `student-student-contact.html` listed contact reductions of 10–20% / 30–50% / 60–80% for Low / Medium / High, but the model uses 30% / 60% / 90%.

**Fix:**
- Updated the Coverage Levels table in `public/covid-testing.html`: Low → 1%, Medium → 5%, High → 10%.
- Updated the Coverage Levels table in `public/flu-testing.html`: same correction.
- Updated the Parameter Settings table in `public/student-student-contact.html`: Low → 30%, Medium → 60%, High → 90%.
- Updated the "Impact on Disease Transmission" bullet points in `student-student-contact.html` to state the actual contact reduction percentages rather than fabricated transmission-reduction ranges.

## 13. Use inclusive age-group labels; replace "Senior" with "Older Adults"

**Problem:** The term "senior" has fallen out of favour in geriatric medicine (British Geriatrics Society preferred-language guidance; Lundebjerg et al., 2017, *JAGS*). Additionally, no age ranges were shown next to age-group names in chart legends, tooltips, or section headings, making it unclear who each group contained.

**Fix:**
- Added an `ageLabels` lookup object in `Dashboard.jsx` that maps each internal CSV key to a human-readable label with an explicit age range:
  - `infant` → `Infants (0–2)`
  - `preschool` → `Preschool (3–5)`
  - `child` → `Children (6–17)`
  - `adult` → `Adults (18–64)`
  - `senior` → `Older Adults (65+)`
- Replaced the three `age.charAt(0).toUpperCase() + age.slice(1)` usages (chart line `name` prop, bar-chart data builder, and per-age heading) with `ageLabels[age]`.
- Removed the now-redundant `textTransform: 'capitalize'` style from the two per-age-group `<h3>` headings.
- Updated the "Population Groups" legend in the model overview panel: "Older adults" → "Older Adults" to match the new label casing.

The internal CSV column keys (`infant`, `preschool`, `child`, `adult`, `senior`) are unchanged.
