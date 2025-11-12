# Research Dashboard

A modern React dashboard for visualizing research data with categorical chart selection, inspired by public health data visualization tools.

## Features

- **Category Selection System** - Users can select which chart categories to display
- **Key Findings Summary** - Overview section with key metrics and trends
- **Multiple Chart Categories**:
  - **Overview** - Summary charts with key metrics
  - **Time Series** - Line charts showing trends over time
  - **Comparisons** - Bar charts for comparing different categories and age groups
  - **Distributions** - Pie charts for showing data distribution
  - **Trends** - Area charts for visualizing cumulative trends
- **Professional Styling** - Clean, modern design similar to public health dashboards
- **Responsive Design** - Works on desktop, tablet, and mobile devices

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The dashboard will be available at `http://localhost:5173`

### Building for Production

Build the project:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Customizing Your Data

To use your own research data, edit the data arrays in `src/Dashboard.jsx`:

- `timeSeriesData` - For time-based data (line and area charts)
- `categoryData` - For categorical comparisons (bar chart)
- `pieData` - For distribution data (pie chart)

## Technologies Used

- React 18
- Vite
- Recharts (charting library)
