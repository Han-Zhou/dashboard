import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import Papa from 'papaparse'

const parseCsvFilename = (filename) => {
  const base = filename.replace(/\.csv$/, '').replace(/^.*\//, '')
  if (base === 'dynamics_df_base') {
    return {
      type: 'baseline',
      label: 'Baseline (No Additional Mitigations)',
      shortLabel: 'Baseline',
      badge: 'Base',
      color: '#0ea5e9'
    }
  }
  const contactMatch = base.match(/_contact_(\d+)/)
  const covidMatch   = base.match(/_test_covid_(\d+)/)
  const fluMatch     = base.match(/_test_flu_(\d+)/)
  const parts = []
  if (contactMatch) parts.push(`${contactMatch[1]}% contact reduction`)
  if (covidMatch)   parts.push(`COVID Test ${covidMatch[1]}%`)
  if (fluMatch)     parts.push(`Flu Test ${fluMatch[1]}%`)
  const label = parts.join(' + ') || filename
  return {
    type: 'intervention',
    label,
    shortLabel: label,
    badge: label,
    color: '#0ea5e9'
  }
}

// Generate all 64 combination filenames programmatically
const contactVals = [null, 30, 60, 90]
const covidVals   = [null, 1, 5, 10]
const fluVals     = [null, 1, 5, 10]

const availableCsvFiles = []
for (const c of contactVals) for (const cv of covidVals) for (const fv of fluVals) {
  let name = 'dynamics_df'
  if (c)  name += `_contact_${c}`
  if (cv) name += `_test_covid_${cv}`
  if (fv) name += `_test_flu_${fv}`
  if (!c && !cv && !fv) name = 'dynamics_df_base'
  availableCsvFiles.push(`${name}.csv`)
}

// Generate scenario configurations from CSV files
// Build scenarioConfig keyed by filename-stem (e.g. "dynamics_df_base", "dynamics_df_contact_30")
const scenarioConfig = {}
availableCsvFiles.forEach(filename => {
  const key = filename.replace(/\.csv$/, '')
  scenarioConfig[key] = parseCsvFilename(filename)
})

  const diseases = ['covid', 'flu', 'rsv']
  const ages = ['infant', 'preschool', 'child', 'adult', 'senior']
  const ageLabels = {
    infant:    'Infants (0–2)',
    preschool: 'Preschool (3–5)',
    child:     'Children (6–17)',
    adult:     'Adults (18–64)',
    senior:    'Older Adults (65+)',
  }
  const ageColors = {
    infant: '#ef4444',
    preschool: '#f59e0b',
    child: '#10b981',
    adult: '#3b82f6',
    senior: '#8b5cf6'
  }
  // Tick arrays for different screen sizes
  const dayTicks10 = Array.from({length: 25}, (_, i) => i * 10)  // 0,10,20...240
  const dayTicks20 = Array.from({length: 13}, (_, i) => i * 20)  // 0,20,40...240
  const dayTicks30 = Array.from({length: 9}, (_, i) => i * 30)   // 0,30,60...240
  const dayTicks60 = Array.from({length: 5}, (_, i) => i * 60)   // 0,60,120,180,240
  
  // Helper to get appropriate ticks based on width
  const getResponsiveTicks = (width, baseInterval = 10) => {
    if (baseInterval === 20) {
      // For Age Group Breakdown charts
      if (width >= 500) return dayTicks20
      if (width >= 300) return dayTicks60
      return dayTicks60
    }
    // For other charts (base interval 10)
    if (width >= 800) return dayTicks10
    if (width >= 500) return dayTicks20
    if (width >= 350) return dayTicks30
    return dayTicks60
  }

// Responsive chart wrapper that passes width to children for dynamic tick selection
const ResponsiveChartWrapper = ({ height, children, baseInterval = 10 }) => {
  const [chartWidth, setChartWidth] = useState(800)
  
  const handleResize = useCallback((width, height) => {
    if (width > 0) {
      setChartWidth(width)
    }
  }, [])
  
  const ticks = useMemo(() => getResponsiveTicks(chartWidth, baseInterval), [chartWidth, baseInterval])
  
  return (
    <ResponsiveContainer width="100%" height={height} onResize={handleResize}>
      {children(ticks)}
    </ResponsiveContainer>
  )
}

const contactOptions = [
  { label: 'None',         value: 'none' },
  { label: 'Low (30%)',    value: '30' },
  { label: 'Medium (60%)', value: '60' },
  { label: 'High (90%)',   value: '90' },
]

const coverageOptions = [
  { label: 'None',         value: 'none' },
  { label: 'Low (1%)',     value: '1' },
  { label: 'Medium (5%)',  value: '5' },
  { label: 'High (10%)',   value: '10' },
]

const parameterDefinitions = [
  {
    id: 'studentStudentContact',
    label: 'Students ↔ Students',
    description: 'Reduction on student contact rate with other students at school',
    optionSet: 'contact',
    defaultValue: 'none',
    detailUrl: '/student-student-contact.html'
  },
  {
    id: 'covidTesting',
    label: 'COVID-19 testing',
    description: 'Proportion of students tested daily',
    optionSet: 'coverage',
    defaultValue: 'none',
    detailUrl: '/covid-testing.html'
  },
  {
    id: 'fluTesting',
    label: 'Influenza testing',
    description: 'Proportion of students tested daily',
    optionSet: 'coverage',
    defaultValue: 'none',
    detailUrl: '/flu-testing.html'
  }
]

const parameterDefaults = parameterDefinitions.reduce((acc, def) => {
  acc[def.id] = def.defaultValue
  return acc
}, {})

const Dashboard = () => {
  const [dynamicsData, setDynamicsData] = useState({})
  const [scenarioLoading, setScenarioLoading] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [selectedDisease, setSelectedDisease] = useState('covid')
  const selectedView = 'infections'
  const [parameterSelections, setParameterSelections] = useState(parameterDefaults)
  const [overviewExpanded, setOverviewExpanded] = useState(true)

  // Lazy-load the selected scenario's CSV
  const selectedScenario = useMemo(() => {
    const { studentStudentContact: c, covidTesting: cv, fluTesting: fv } = parameterSelections
    if (c === 'none' && cv === 'none' && fv === 'none') return 'dynamics_df_base'
    let key = 'dynamics_df'
    if (c  !== 'none') key += `_contact_${c}`
    if (cv !== 'none') key += `_test_covid_${cv}`
    if (fv !== 'none') key += `_test_flu_${fv}`
    return key
  }, [parameterSelections])

  useEffect(() => {
    if (dynamicsData[selectedScenario]) return
    setScenarioLoading(true)
    setLoadError(null)
    fetch(`/data/${selectedScenario}.csv`)
      .then(r => {
        if (!r.ok) throw new Error(`Unable to load ${selectedScenario}.csv`)
        return r.text()
      })
      .then(text => {
        const result = Papa.parse(text, { header: true, dynamicTyping: true })
        const rows = result.data.filter(r => Object.values(r).some(v => v !== null && v !== ''))
        setDynamicsData(prev => ({ ...prev, [selectedScenario]: rows }))
      })
      .catch(err => setLoadError(err.message))
      .finally(() => setScenarioLoading(false))
  }, [selectedScenario])

  const chartClassType = selectedView === 'infections' ? 'symptomatic' : 'recovered'

  const activeScenarioKeys = [selectedScenario]
  const availableScenarioKeys = activeScenarioKeys.filter(key => dynamicsData[key]?.length)

  const maxValue = useMemo(() => {
    if (!availableScenarioKeys.length) {
      return 100
    }
    return availableScenarioKeys.reduce((maxSoFar, key) => {
      const scenarioMax = getMaxValue(dynamicsData[key], selectedDisease, chartClassType)
      return Math.max(maxSoFar, scenarioMax)
    }, 100)
  }, [availableScenarioKeys, dynamicsData, selectedDisease, chartClassType])

  const renderScenarioLineChart = scenarioKey => {
    const scenarioMeta = scenarioConfig[scenarioKey]
    const chartData = prepareChartData(
      dynamicsData[scenarioKey],
      selectedDisease,
      chartClassType
    )

    if (!chartData.length) {
      return null
    }

    return (
      <section className="chart-section" key={`line-${scenarioKey}`}>
        <h2 className="section-title">
          {selectedDisease === 'covid' ? 'COVID-19' : selectedDisease.toUpperCase()} {selectedView === 'infections' ? 'Infections' : 'Recoveries'} ·{' '}
          {scenarioMeta.shortLabel}
        </h2>
        <div className="dashboard-grid">
          <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
            <h3>Time Series by Age Group</h3>
            <ResponsiveChartWrapper height={400}>
              {(ticks) => (
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  type="number"
                  scale="linear"
                  domain={[0, 240]}
                  ticks={selectedView === 'infections' ? dayTicks10 : dayTicks20}
                  allowDecimals={false}
                  label={{
                    value: 'Day',
                    position: 'insideBottomRight',
                    offset: -5,
                    textAnchor: 'end'
                  }}
                />
                <YAxis
                  label={{ value: 'Hospitalizations', angle: -90, position: 'insideLeft', offset: 10 }}
                  domain={[0, maxValue]}
                />
                <Tooltip />
                <Legend />
                {ages.map(age => (
                  <Line
                    key={`${scenarioKey}-${age}`}
                    type="monotone"
                    dataKey={age}
                    stroke={ageColors[age]}
                    strokeWidth={2}
                    name={ageLabels[age]}
                    dot={false}
                  />
                ))}
              </LineChart>
              )}
            </ResponsiveChartWrapper>
          </div>
        </div>
      </section>
    )
  }

 const renderUncertaintyCard = scenarioKey => {
    const scenarioMeta = scenarioConfig[scenarioKey]
    const series = buildUncertaintySeries(
      dynamicsData[scenarioKey],
      selectedDisease,
      chartClassType
    )

    if (!series.length) {
      return null
    }

    return (
      <div className="chart-card" key={`uncertainty-${scenarioKey}`}>
        <h3>
          {scenarioMeta.shortLabel} · 95% CI
        </h3>
        <ResponsiveChartWrapper height={320}>
          {(ticks) => (
          <ComposedChart data={series} margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              type="number"
              scale="linear"
              domain={[0, 240]}
              ticks={dayTicks20}
              allowDecimals={false}
              label={{
                value: 'Day',
                position: 'insideBottomRight',
                offset: -5,
                textAnchor: 'end'
              }}
            />
            <YAxis
              label={{ value: 'Hospitalizations', angle: -90, position: 'insideLeft', offset: 10 }}
            />
            <Tooltip />
            <Legend />
            {/* UPDATED AREA COMPONENT
                dataKey="ci" uses the [lower, upper] array.
                This automatically creates a floating band.
            */}
            <Area
              type="monotone"
              dataKey="ci"
              stroke="none"
              fill={`${scenarioMeta.color}66`}
              name="95% CI"
            />
            {/* Keep your lines for clarity */}
            <Line
              type="monotone"
              dataKey="lower"
              stroke="#94a3b8"
              strokeWidth={1}
              dot={false}
              name="Lower CI"
            />
            <Line
              type="monotone"
              dataKey="mean"
              stroke={scenarioMeta.color}
              strokeWidth={2.5}
              dot={false}
              name="Mean"
            />
            <Line
              type="monotone"
              dataKey="upper"
              stroke="#94a3b8"
              strokeWidth={1}
              dot={false}
              name="Upper CI"
            />
          </ComposedChart>
          )}
        </ResponsiveChartWrapper>
      </div>
    )
  }

const renderDailyHospitalCardByAge = age => {
    const dynamicsDataForScenario = dynamicsData[selectedScenario]
    const scenarioMeta = scenarioConfig[selectedScenario]
    
    if (!dynamicsDataForScenario || !dynamicsDataForScenario.length) {
      return null
    }
    
    const dailySeries = buildDailyHospitalSeriesByAge(dynamicsDataForScenario, selectedDisease, age)

    if (!dailySeries.length) {
      return null
    }

    return (
      <div className="chart-card" key={`daily-hosp-${age}`}>
        <h3>
          {ageLabels[age]} · Daily Hospitalizations · {selectedDisease === 'covid' ? 'COVID-19' : selectedDisease.toUpperCase()}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={dailySeries} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              type="number"
              scale="linear"
              domain={[0, 240]}
              ticks={dayTicks20}
              allowDecimals={false}
              label={{ value: 'Day', position: 'insideBottomRight', offset: -5 }}
            />
            <YAxis
              label={{ value: 'Hospitalizations', angle: -90, position: 'insideLeft', offset: -10 }}
            />
            <Tooltip />
            <Legend />
            {/* UPDATED AREA COMPONENT */}
            <Area 
              type="monotone" 
              dataKey="ci" 
              stroke="none" 
              fill={`${scenarioMeta.color}66`} 
              name="95% CI"
              legendType="none" // Optional: Hide from legend if you only want lines shown
            />
            <Line
              type="monotone"
              dataKey="lower"
              stroke="#94a3b8"
              strokeWidth={1}
              dot={false}
              name="Lower CI"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="mean"
              stroke={scenarioMeta.color}
              strokeWidth={2}
              dot={false}
              name="Mean"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="upper"
              stroke="#94a3b8"
              strokeWidth={1}
              dot={false}
              name="Upper CI"
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem', fontStyle: 'italic' }}>
          Values are averages across simulation runs. Decimal values (e.g., 0.3) represent the expected number of hospitalizations on a given day — not a whole-person count.
        </p>
      </div>
    )
  }

  const renderAgeBreakdownCard = age => {
    const chartData = mergeSeriesByDay([
      {
        key: selectedScenario,
        data: buildAgeSeries(
          dynamicsData[selectedScenario],
          selectedDisease,
          chartClassType,
          age
        )
      }
    ])

    if (!chartData.length) {
      return null
    }

    const linesToRender = [selectedScenario]

    return (
      <div key={age} className="chart-card">
        <h3>
          {ageLabels[age]} · {selectedDisease === 'covid' ? 'COVID-19' : selectedDisease.toUpperCase()}
        </h3>
        <ResponsiveChartWrapper height={300} baseInterval={20}>
          {(ticks) => (
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              type="number"
              scale="linear"
              domain={[0, 240]}
              ticks={dayTicks20}
              allowDecimals={false}
              label={{ value: 'Day', position: 'insideBottomRight', offset: -5 }}
            />
            <YAxis
              label={{ value: 'Hospitalizations', angle: -90, position: 'insideLeft', offset: 10 }}
            />
            <Tooltip />
            <Legend />
            {linesToRender.map(lineKey => {
              const meta = scenarioConfig[lineKey]
              return (
                <Line
                  key={`${age}-${lineKey}`}
                  type="monotone"
                  dataKey={lineKey}
                  stroke={meta.color}
                  strokeWidth={2}
                  dot={false}
                  name={meta.shortLabel}
                />
              )
            })}
          </LineChart>
          )}
        </ResponsiveChartWrapper>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>School Disease Simulation Dashboard</h1>
        <p>Explore intervention parameters, uncertainty bands, and hospitalization trends.</p>
        {loadError && (
          <p style={{ marginTop: '12px', fontSize: '0.95rem', color: '#fee2e2' }}>
            {loadError}
          </p>
        )}
      </header>

      <section className="model-overview">
        <button
          className="overview-toggle"
          onClick={() => setOverviewExpanded(prev => !prev)}
          aria-expanded={overviewExpanded}
        >
          <span>About This Model</span>
          <svg
            className={`overview-chevron${overviewExpanded ? ' expanded' : ''}`}
            width="18" height="18" viewBox="0 0 18 18" fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M4.5 6.75L9 11.25L13.5 6.75" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {overviewExpanded && (
          <div className="overview-body">
            <div className="overview-intro">
              <p>
                This dashboard presents results from a <strong>compartmental disease model</strong> simulating the spread of
                COVID-19, Influenza, and RSV within a school community over a <strong>240-day school year</strong>.
                The model tracks how infections move through five age groups, and lets you explore how different
                mitigation strategies change outbreak trajectories.
              </p>
            </div>

            <div className="overview-grid">
              <div className="overview-card">
                <h3>Population Groups</h3>
                <ul>
                  <li><span className="age-dot" style={{background:'#ef4444'}}></span><strong>Infants</strong> — age 0–2</li>
                  <li><span className="age-dot" style={{background:'#f59e0b'}}></span><strong>Preschool</strong> — age 3–5</li>
                  <li><span className="age-dot" style={{background:'#10b981'}}></span><strong>Children</strong> — age 6–17 (school students)</li>
                  <li><span className="age-dot" style={{background:'#3b82f6'}}></span><strong>Adults</strong> — age 18–64 (teachers &amp; staff)</li>
                  <li><span className="age-dot" style={{background:'#8b5cf6'}}></span><strong>Older Adults</strong> — age 65+</li>
                </ul>
              </div>

              <div className="overview-card">
                <h3>Intervention Parameters</h3>
                <ul>
                  <li>
                    <strong>Student–Student Contact Reduction</strong> — reduces how frequently students interact with each other
                    (e.g., through staggered schedules, smaller cohorts, or physical distancing).
                    <em> None = no change; Low = ~30% fewer contacts; Medium = ~60%; High = ~90%.</em>
                  </li>
                  <li>
                    <strong>COVID-19 Testing Coverage</strong> — the percentage of students tested for SARS-CoV-2 each day,
                    enabling earlier isolation of infectious individuals.
                    <em> Low = 1%; Medium = 5%; High = 10% daily.</em>
                  </li>
                  <li>
                    <strong>Influenza Testing Coverage</strong> — same concept applied to influenza surveillance.
                    <em> Low = 1%; Medium = 5%; High = 10% daily.</em>
                  </li>
                </ul>
                <p className="overview-hint">Click the <strong>ⓘ</strong> icon next to each parameter for full details.</p>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="parameter-controls">
        <div className="parameter-controls-header">
          <div>
            <h2>Intervention Parameters</h2>
            <p className="parameter-hint">
              Adjust any combination of the three parameters independently. The dashboard loads only the matching scenario.
            </p>
          </div>
          <div className="parameter-hint" style={{ color: '#0369a1' }}>
            {scenarioLoading ? 'Loading data…' : (
              <>
                Active scenario:{' '}
                {scenarioConfig[selectedScenario]?.shortLabel ?? 'Baseline'}
              </>
            )}
          </div>
        </div>
        <div className="parameter-grid">
          {parameterDefinitions.map(def => {
            const options = def.optionSet === 'contact' ? contactOptions : coverageOptions
            return (
              <div key={def.id} className="parameter-card">
                <label htmlFor={def.id}>
                  <span className="parameter-label-wrapper">
                    {def.label}
                    {def.detailUrl ? (
                      <a
                        href={def.detailUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="info-icon-wrapper info-icon-link"
                        onClick={(e) => e.stopPropagation()}
                        title="Click for more details"
                      >
                        <svg
                          className="info-icon"
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                          <path d="M8 5.5V4.5M8 11.5V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          <circle cx="8" cy="5.5" r="0.5" fill="currentColor"/>
                        </svg>
                        <span className="info-tooltip">{def.description} (Click for more details)</span>
                      </a>
                    ) : (
                      <span className="info-icon-wrapper">
                        <svg
                          className="info-icon"
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                          <path d="M8 5.5V4.5M8 11.5V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          <circle cx="8" cy="5.5" r="0.5" fill="currentColor"/>
                        </svg>
                        <span className="info-tooltip">{def.description}</span>
                      </span>
                    )}
                  </span>
                  <small>{def.description}</small>
                </label>
                <select
                  id={def.id}
                  className="parameter-select"
                  value={parameterSelections[def.id]}
                  onChange={e => setParameterSelections(prev => ({ ...prev, [def.id]: e.target.value }))}
                >
                  {options.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )
          })}
        </div>
      </section>

      <div className="disease-tabs">
        {[
          { id: 'covid', label: 'COVID-19' },
          { id: 'flu',   label: 'Influenza' },
          { id: 'rsv',   label: 'RSV' },
        ].map(d => (
          <button
            key={d.id}
            className={`disease-tab${selectedDisease === d.id ? ' disease-tab--active' : ''}`}
            onClick={() => setSelectedDisease(d.id)}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="dashboard-content">
        {scenarioLoading ? (
          <div className="no-selection" style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            Loading scenario data…
          </div>
        ) : availableScenarioKeys.length === 0 ? (
          <div className="no-selection">
            No data available for this scenario yet.
          </div>
        ) : (
          availableScenarioKeys.map(renderScenarioLineChart)
        )}


        <section className="chart-section">
          <h2 className="section-title">Uncertainty Bands</h2>
          <p className="section-subtitle">The solid line shows the average outcome across many simulated runs. The shaded band is the <strong>95% confidence interval</strong> — 95% of simulation runs fell within this range. A wider band means the outcome is more sensitive to random variation.</p>
          <div className="dashboard-grid">
            {availableScenarioKeys.map(renderUncertaintyCard)}
          </div>
        </section>

        <section className="chart-section">
          <h2 className="section-title">Daily Hospitalizations</h2>
          <p className="section-subtitle">Estimated number of new hospital admissions per day by age group. Peaks indicate periods of highest strain on healthcare capacity.</p>
          <div className="dashboard-grid">
            {ages.map(renderDailyHospitalCardByAge)}
          </div>
        </section>

        <section className="chart-section">
          <h2 className="section-title">Age Group Breakdown</h2>
          <p className="section-subtitle">Cumulative outcomes broken down by age group, showing which populations bear the greatest burden under the selected scenario.</p>
          <div className="dashboard-grid">
            {ages.map(renderAgeBreakdownCard)}
          </div>
        </section>
      </div>
    </div>
  )
}

const prepareChartData = (data, disease, classType) => {
  if (!data) return []

  return data
    .filter(row => row.day_mean != null && !isNaN(row.day_mean))
    .map(row => {
      const result = { day: Math.round(row.day_mean) + 1 }

      ages.forEach(age => {
        const columnName = `${disease}_${classType}_${age}_mean`
        const value = row[columnName]
        result[age] = value != null && !isNaN(value) ? value : 0
      })

      return result
    })
    .sort((a, b) => a.day - b.day)
}

const getMaxValue = (data, disease, classType) => {
  if (!data) return 100

  let max = 0
  ages.forEach(age => {
    const columnName = `${disease}_${classType}_${age}_mean`
    data.forEach(row => {
      const value = row[columnName] || 0
      if (value > max) max = value
    })
  })
  return Math.ceil(max * 1.1)
}


const buildUncertaintySeries = (data, disease, classType) => {
  if (!data) return []

  return data
    .filter(row => row.day_mean != null && !isNaN(row.day_mean))
    .map(row => {
      const day = Math.round(row.day_mean) + 1
      let mean = 0
      let lower = 0
      let upper = 0

      ages.forEach(age => {
        const meanKey = `${disease}_${classType}_${age}_mean`
        const lowerKey = `${disease}_${classType}_${age}_p2_5`
        const upperKey = `${disease}_${classType}_${age}_p97_5`

        mean += row[meanKey] || 0
        lower += row[lowerKey] || 0
        upper += row[upperKey] || 0
      })

      // ADD THIS: Create an array [min, max] for the range area
      return { day, mean, lower, upper, ci: [lower, upper] }
    })
    .sort((a, b) => a.day - b.day)
}

const buildDailyHospitalSeriesByAge = (data, disease, age) => {
  if (!data) return []

  // Filter and process daily data for a specific age group
  const dailyData = data
    .filter(row => row.day_mean != null && !isNaN(row.day_mean))
    .map(row => {
      const day = Math.round(row.day_mean) + 1
      const mean = row[`${disease}_new_hospitalizations_${age}_mean`] || 0
      const lower = row[`${disease}_new_hospitalizations_${age}_ci_lower`] || 0
      const upper = row[`${disease}_new_hospitalizations_${age}_ci_upper`] || 0
      
      // Create the range array for CI
      const ci = [lower, upper]
      
      return { day, mean, lower, upper, ci }
    })
    .sort((a, b) => a.day - b.day)
  
  return dailyData
}

const buildWeeklyHospitalByAge = (data, disease) => {
  if (!data || !data.length) return []
  const latest = data[data.length - 1]

  return ages.map(age => {
    const mean = latest[`${disease}_hospitalized_${age}_weekly_mean`] || 0
    const lower = latest[`${disease}_hospitalized_${age}_weekly_ci_lower`] || 0
    const upper = latest[`${disease}_hospitalized_${age}_weekly_ci_upper`] || 0

    return {
      age: ageLabels[age],
      mean,
      error: [Math.max(mean - lower, 0), Math.max(upper - mean, 0)]
    }
  })
}

const buildAgeSeries = (data, disease, classType, age) => {
  if (!data) return []

  return data
    .filter(row => row.day_mean != null && !isNaN(row.day_mean))
    .map(row => ({
      day: Math.round(row.day_mean) + 1,
      value: row[`${disease}_${classType}_${age}_mean`] || 0
    }))
}

const mergeSeriesByDay = seriesList => {
  const dayMap = new Map()

  seriesList.forEach(({ key, data }) => {
    data.forEach(point => {
      if (!dayMap.has(point.day)) {
        dayMap.set(point.day, { day: point.day })
      }
      dayMap.get(point.day)[key] = point.value
    })
  })

  return Array.from(dayMap.values()).sort((a, b) => a.day - b.day)
}

export default Dashboard
