# School Disease Simulation Dashboard

This dashboard visualizes simulation results for disease spread (COVID-19, Influenza, RSV) in a school setting. Users can select different intervention scenarios (e.g., reducing student contact, testing for COVID or flu) and see how they affect infection curves, hospitalizations, and outcomes across age groups.

Everything runs in the browser — no backend or database needed. The dashboard reads CSV files from the `public/data/` folder and renders interactive charts.

## Getting Started

You need [Node.js](https://nodejs.org/) installed (version 16 or later).

```bash
npm install       # install dependencies (only needed once)
npm run dev       # start the dashboard locally
```

Then open `http://localhost:5173` in your browser.

## Project Structure

There are only a few files you'll need to touch. Here's the full layout:

```
src/
  Dashboard.jsx     ← The main file. Almost all logic lives here.
  App.jsx            (wrapper, you won't need to edit this)
  main.jsx           (entry point, you won't need to edit this)
  index.css          (styling)

public/
  data/              ← CSV simulation data files go here
  *.html             ← Detailed parameter description pages
```

## Where to Put Parameter Descriptions

There are two places where parameter descriptions appear:

### 1. Short descriptions (inline in the dashboard)

These are defined in `src/Dashboard.jsx`. Search for `parameterDefinitions` to find the array. Each entry looks like this:

```js
{
  id: 'covidTesting',
  label: 'COVID-19 testing',                        // dropdown title
  description: 'Proportion of students tested daily', // text shown below the dropdown
  optionSet: 'coverage',                             // which dropdown options to show (see below)
  defaultValue: 'none',                              // starting value
  detailUrl: '/covid-testing.html'                   // links to the detail page
}
```

To change what appears in the dropdown menus, look for `intensityOptions` (Base / Low / Medium / High) and `coverageOptions` (None / Low / Medium / High) in the same file.

### 2. Detailed descriptions (full page)

When users click the "Details" link next to a parameter, they're taken to an HTML page in the `public/` folder:

| Parameter | Detail page file |
|---|---|
| Students ↔ Students contact | `public/student-student-contact.html` |
| COVID-19 testing | `public/covid-testing.html` |
| Influenza testing | `public/flu-testing.html` |

You can edit these HTML files directly — they're standalone pages with no special framework. Just open them in a text editor, change the text, and save.

## How Parameter Switching Works

When a user picks a value from a dropdown (e.g., sets COVID Testing to "High"), two things happen:

### Only one intervention at a time

The dashboard enforces mutual exclusivity. If you change one parameter, the others reset to their default. For example, setting COVID Testing to "High" will automatically reset Student Contact back to "Base" and Flu Testing back to "None".

This logic is in `src/Dashboard.jsx`. Search for `setParameterSelections` to find the onChange handler.

### Dropdown values map to CSV files

The dashboard translates dropdown selections into specific CSV filenames using simple lookup tables:

| Dropdown | None | Low | Medium | High |
|---|---|---|---|---|
| **COVID Testing** | *(baseline)* | 1% daily | 5% daily | 10% daily |
| **Flu Testing** | *(baseline)* | 1% daily | 5% daily | 10% daily |
| **Student Contact** | Base = *(baseline)* | 10% reduction | 20% reduction | 30% reduction |

So "COVID Testing = High" loads `dynamics_df_test_covid_10.csv`, and "Student Contact = Medium" loads `dynamics_df_contact_20.csv`.

This mapping logic is in `src/Dashboard.jsx`. Search for `selectedScenario` to find it. The lookup tables are defined as `testingMap` and `contactMap` inside that block.

## How to Add a New Experiment

### The simple case: adding more levels to an existing intervention

If you just want to add, say, a 40% contact reduction scenario:

**Step 1.** Put the CSV file in `public/data/` with the right name: `dynamics_df_contact_40.csv`

**Step 2.** Open `src/Dashboard.jsx` and search for `availableCsvFiles`. Add your filename to the list:

```js
const availableCsvFiles = [
  'dynamics_df_base.csv',
  'dynamics_df_contact_10.csv',
  'dynamics_df_contact_20.csv',
  'dynamics_df_contact_30.csv',
  'dynamics_df_contact_40.csv',    // ← add this line
  // ... rest of files ...
]
```

That's it for the data side — the dashboard auto-detects files that follow the naming pattern. But you'd also need to update the dropdown mapping so users can actually select it. Search for `contactMap` and add the new level:

```js
const contactMap = { low: 10, medium: 20, high: 30 }
//  maybe change to: { low: 10, medium: 20, high: 30, veryHigh: 40 }
```

And add a matching option to `intensityOptions` so it shows up in the dropdown.

### The advanced case: adding an entirely new intervention type

This requires changes in four places within `src/Dashboard.jsx`:

1. **File parser** — Search for `parseCsvFilename`. Add a new block to recognize your file naming pattern (e.g., `dynamics_df_masking_50.csv`).

2. **Parameter definition** — Search for `parameterDefinitions`. Add a new entry with the label, description, and options for your intervention.

3. **Scenario matching** — Search for `selectedScenario`. Add logic to map your new parameter's dropdown values to the correct CSV files.

4. **Mutual exclusivity** — Search for `setParameterSelections`. Update the reset logic so your new parameter resets when others change, and vice versa.

Optionally, create a detail page (e.g., `public/masking.html`) by copying one of the existing HTML files and changing the content.

### CSV file format

Each CSV file should have one row per simulation day. Columns follow this naming pattern:

```
{disease}_{metric}_{ageGroup}_{statistic}
```

For example: `covid_symptomatic_child_mean`, `flu_hospitalized_senior_p97_5`

| Component | Possible values |
|---|---|
| Disease | `covid`, `flu`, `rsv` |
| Metric | `infections`, `symptomatic`, `recovered`, `hospitalized`, `new_hospitalizations` |
| Age group | `infant`, `preschool`, `child`, `adult`, `senior` |
| Statistic | `_mean`, `_p2_5` (lower 95% CI), `_p97_5` (upper 95% CI) |
