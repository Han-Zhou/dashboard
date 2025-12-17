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

// CSV filename to intervention parameters mapping
// Maps CSV filenames to their corresponding intervention parameters:
// - dynamics_df_base.csv -> Baseline (No Additional Mitigations)
// - dynamics_df_contact_10.csv -> Contact Reduction 10%
// - dynamics_df_contact_20.csv -> Contact Reduction 20%
// - dynamics_df_contact_30.csv -> Contact Reduction 30%
// - dynamics_df_test_covid_1.csv -> COVID-19 Testing 1%
// - dynamics_df_test_covid_5.csv -> COVID-19 Testing 5%
// - dynamics_df_test_covid_10.csv -> COVID-19 Testing 10%
// - dynamics_df_test_flu_1.csv -> Influenza Testing 1%
// - dynamics_df_test_flu_5.csv -> Influenza Testing 5%
// - dynamics_df_test_flu_10.csv -> Influenza Testing 10%
const parseCsvFilename = (filename) => {
  // Remove .csv extension and path
  const name = filename.replace(/\.csv$/, '').replace(/^.*\//, '')
  
  // Parse baseline
  if (name === 'dynamics_df_base') {
    return {
      type: 'baseline',
      label: 'Baseline (No Additional Mitigations)',
      shortLabel: 'Baseline',
      badge: 'Base',
      color: '#0ea5e9',
      contactReduction: null,
      testing: { disease: null, percentage: null },
      vaccination: null
    }
  }
  
  // Parse contact reduction: dynamics_df_contact_10, dynamics_df_contact_20, dynamics_df_contact_30
  const contactMatch = name.match(/dynamics_df_contact_(\d+)/)
  if (contactMatch) {
    const percentage = parseInt(contactMatch[1])
    return {
      type: 'contact',
      label: `Contact Reduction ${percentage}%`,
      shortLabel: `Contact ${percentage}%`,
      badge: `Contact ${percentage}%`,
      color: '#8b5cf6',
      contactReduction: percentage,
      testing: { disease: null, percentage: null },
      vaccination: null
    }
  }
  
  // Parse testing: dynamics_df_test_covid_1, dynamics_df_test_covid_5, dynamics_df_test_covid_10
  // or dynamics_df_test_flu_1, dynamics_df_test_flu_5, dynamics_df_test_flu_10
  const testMatch = name.match(/dynamics_df_test_(covid|flu)_(\d+)/)
  if (testMatch) {
    const disease = testMatch[1]
    const percentage = parseInt(testMatch[2])
    return {
      type: 'testing',
      label: `${disease === 'covid' ? 'COVID-19' : 'Influenza'} Testing ${percentage}%`,
      shortLabel: `${disease === 'covid' ? 'COVID' : 'Flu'} Test ${percentage}%`,
      badge: `Test ${disease === 'covid' ? 'COVID' : 'Flu'} ${percentage}%`,
      color: '#f97316',
      contactReduction: null,
      testing: { disease, percentage },
      vaccination: null
    }
  }
  
  // Default fallback
  return {
    type: 'unknown',
    label: filename,
    shortLabel: filename,
    badge: 'Unknown',
    color: '#64748b',
    contactReduction: null,
    testing: { disease: null, percentage: null },
    vaccination: null
  }
}

// Available CSV files and their configurations
const availableCsvFiles = [
  'dynamics_df_base.csv',
  'dynamics_df_contact_10.csv',
  'dynamics_df_contact_20.csv',
  'dynamics_df_contact_30.csv',
  'dynamics_df_test_covid_1.csv',
  'dynamics_df_test_covid_5.csv',
  'dynamics_df_test_covid_10.csv',
  'dynamics_df_test_flu_1.csv',
  'dynamics_df_test_flu_5.csv',
  'dynamics_df_test_flu_10.csv'
]

// Generate scenario configurations from CSV files
const generateScenarioConfig = () => {
  const config = {}
  availableCsvFiles.forEach(filename => {
    const parsed = parseCsvFilename(filename)
    const key = filename.replace(/\.csv$/, '').replace(/^dynamics_df_/, '')
    config[key] = {
      ...parsed,
      dynamicsPath: `/data/${filename}`,
      weeklyHospPath: null // Weekly hospitalization files may not exist for all scenarios
    }
  })
  return config
}

const scenarioConfig = generateScenarioConfig()

// Generate scenario options from available files, sorted logically
const scenarioOptions = Object.entries(scenarioConfig)
  .map(([key, config]) => ({
    id: key,
    label: config.label,
    type: config.type,
    order: config.type === 'baseline' ? 0 : 
           config.type === 'contact' ? 1 : 
           config.type === 'testing' ? 2 : 3
  }))
  .sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order
    return a.label.localeCompare(b.label)
  })

  const diseases = ['covid', 'flu', 'rsv']
  const ages = ['infant', 'preschool', 'child', 'adult', 'senior']
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

const intensityOptions = [
  { label: 'Base', value: 'base' },
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' }
]

const coverageOptions = [
  { label: 'None', value: 'none' },
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' }
]

const parameterDefinitions = [
  {
    id: 'studentStudentContact',
    label: 'Students ↔ Students',
    description: 'Reduction on student contact rate with other students at school',
    optionSet: 'intensity',
    defaultValue: 'base',
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
  const [weeklyHospData, setWeeklyHospData] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadErrors, setLoadErrors] = useState([])
  // Default to COVID-19 and infections view (no longer user-selectable)
  const selectedDisease = 'covid'
  const selectedView = 'infections'
  const [parameterSelections, setParameterSelections] = useState(parameterDefaults)

  useEffect(() => {
    const fetchCsv = async path => {
      const response = await fetch(path)
      if (!response.ok) {
        throw new Error(`Unable to load ${path}`)
      }
      const text = await response.text()
      const parsed = Papa.parse(text, { header: true, dynamicTyping: true })
      return parsed.data.filter(row =>
        Object.values(row).some(value => value !== null && value !== undefined && value !== '')
      )
    }

    const loadData = async () => {
      setLoading(true)
      const errors = []
      const dynamics = {}
      const weekly = {}

      await Promise.all(
        Object.entries(scenarioConfig).map(async ([key, config]) => {
          try {
            const dyn = await fetchCsv(config.dynamicsPath)
            dynamics[key] = dyn
            // Weekly hospitalization files may not exist for all scenarios
            if (config.weeklyHospPath) {
              try {
                const hosp = await fetchCsv(config.weeklyHospPath)
                weekly[key] = hosp
              } catch (hospError) {
                // Weekly hospitalization file not found, skip it
                weekly[key] = null
              }
            } else {
              weekly[key] = null
            }
          } catch (error) {
            errors.push(`${config.shortLabel}: ${error.message}`)
          }
        })
      )

      setDynamicsData(dynamics)
      setWeeklyHospData(weekly)
      setLoadErrors(errors)
      setLoading(false)
    }

    loadData()
  }, [])

  const chartClassType = selectedView === 'infections' ? 'symptomatic' : 'recovered'

  // Find matching scenario based on parameter selections
  const selectedScenario = useMemo(() => {
    // Map parameter selections to CSV file
    const contactReduction = parameterSelections.studentStudentContact
    const covidTesting = parameterSelections.covidTesting
    const fluTesting = parameterSelections.fluTesting

    // Priority: Check testing first (more specific), then contact reduction, then baseline
    // Check testing match (COVID or Flu)
    if (covidTesting !== 'none') {
      const testingMap = { none: null, low: 1, medium: 5, high: 10 }
      const targetPercentage = testingMap[covidTesting]
      for (const [key, config] of Object.entries(scenarioConfig)) {
        if (config.testing.disease === 'covid' && config.testing.percentage === targetPercentage) {
          return key
        }
      }
    }

    if (fluTesting !== 'none') {
      const testingMap = { none: null, low: 1, medium: 5, high: 10 }
      const targetPercentage = testingMap[fluTesting]
      for (const [key, config] of Object.entries(scenarioConfig)) {
        if (config.testing.disease === 'flu' && config.testing.percentage === targetPercentage) {
          return key
        }
      }
    }

    // Check contact reduction match (only reached if no testing is active)
    if (contactReduction === 'base') {
      // "base" means no contact reduction, match baseline
      for (const [key, config] of Object.entries(scenarioConfig)) {
        if (config.type === 'baseline') {
          return key
        }
      }
    } else {
      // Check for contact reduction scenarios (low: 10%, medium: 20%, high: 30%)
      const contactMap = { low: 10, medium: 20, high: 30 }
      const targetPercentage = contactMap[contactReduction]
      for (const [key, config] of Object.entries(scenarioConfig)) {
        if (config.contactReduction === targetPercentage) {
          return key
        }
      }
    }

    // Default to baseline
    for (const [key, config] of Object.entries(scenarioConfig)) {
      if (config.type === 'baseline') {
        return key
      }
    }

    // Fallback to first available scenario
    return scenarioOptions[0]?.id || 'base'
  }, [parameterSelections])

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

  if (loading) {
    return (
      <div className="dashboard">
        <div
          style={{
            textAlign: 'center',
            padding: '100px',
            fontSize: '1.5rem',
            color: '#64748b'
          }}
        >
          Loading data...
        </div>
      </div>
    )
  }

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
                  label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
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
                    name={age.charAt(0).toUpperCase() + age.slice(1)}
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
              label={{ value: 'People', angle: -90, position: 'insideLeft' }}
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
        <h3 style={{ textTransform: 'capitalize' }}>
          {age} · Daily Hospitalizations · {selectedDisease === 'covid' ? 'COVID-19' : selectedDisease.toUpperCase()}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={dailySeries}>
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
              label={{ value: 'Hospitalizations', angle: -90, position: 'insideLeft' }}
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
        <h3 style={{ textTransform: 'capitalize' }}>
          {age} · {selectedDisease === 'covid' ? 'COVID-19' : selectedDisease.toUpperCase()}
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
              label={{ value: 'People', angle: -90, position: 'insideLeft' }}
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

  const summaryCards = [selectedScenario]

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>School Disease Simulation Dashboard</h1>
        <p>Explore intervention parameters, uncertainty bands, and hospitalization trends.</p>
        {loadErrors.length > 0 && (
          <p style={{ marginTop: '12px', fontSize: '0.95rem', color: '#fee2e2' }}>
            Some datasets did not load: {loadErrors.join(' · ')}
          </p>
        )}
      </header>

      <section className="parameter-controls">
        <div className="parameter-controls-header">
          <div>
            <h2>Intervention Parameters</h2>
            <p className="parameter-hint">
              Use these dropdowns to capture the planning values the modeling team wants to explore.
              Data files currently cover baseline, 10% testing, 10% vaccination, and the combined case;
              additional combinations will snap in as new CSVs arrive.
            </p>
          </div>
          <div className="parameter-hint" style={{ color: '#0369a1' }}>
            Current selections align best with:{' '}
            {selectedScenario && scenarioConfig[selectedScenario]
              ? scenarioConfig[selectedScenario].shortLabel
              : 'No matching scenario found'}
          </div>
        </div>
        <div className="parameter-grid">
          {parameterDefinitions.map(def => {
            const options = def.optionSet === 'intensity' ? intensityOptions : coverageOptions
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
                  onChange={event => {
                    const newValue = event.target.value
                    setParameterSelections(prev => {
                      const updated = { ...prev, [def.id]: newValue }
                      // Reset other parameters to their defaults when one is changed
                      if (def.id === 'studentStudentContact') {
                        updated.covidTesting = 'none'
                        updated.fluTesting = 'none'
                      } else if (def.id === 'covidTesting') {
                        updated.studentStudentContact = 'base'
                        updated.fluTesting = 'none'
                      } else if (def.id === 'fluTesting') {
                        updated.studentStudentContact = 'base'
                        updated.covidTesting = 'none'
                      }
                      return updated
                    })
                  }}
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

      <section className="key-findings">
        <h2>
          Summary Statistics · {selectedDisease === 'covid' ? 'COVID-19' : selectedDisease.toUpperCase()} ·{' '}
          {selectedView === 'infections' ? 'Infections' : 'Recoveries'}
        </h2>
        <div className="findings-grid">
          {summaryCards.map(scenarioKey => {
            const stats = getSummaryStats(
              dynamicsData[scenarioKey],
              selectedDisease,
              chartClassType
            )
            const scenarioMeta = scenarioConfig[scenarioKey]
            const cardClass =
              scenarioKey === 'vaccination'
                ? 'finding-low'
                : scenarioKey === 'combo'
                ? 'finding-high'
                : 'finding-moderate'

            return (
              <div key={`summary-${scenarioKey}`} className={`finding-card ${cardClass}`}>
              <div className="finding-header">
                  <h3>{scenarioMeta.shortLabel}</h3>
                  <span className="status-badge status-moderate">{scenarioMeta.badge}</span>
              </div>
                <div className="finding-value">{stats.peak}</div>
                <p className="finding-description">
                  Peak {selectedView === 'infections' ? 'infections' : 'recoveries'}
                </p>
                <div className="trend-indicator trend-stable">→ Average: {stats.avg}</div>
              </div>
            )
          })}
        </div>
      </section>

      <div className="dashboard-content">
        {availableScenarioKeys.length === 0 ? (
          <div className="no-selection">
            No data available for this scenario yet. Please adjust the selections above.
              </div>
        ) : (
          availableScenarioKeys.map(renderScenarioLineChart)
        )}


        <section className="chart-section">
          <h2 className="section-title">Uncertainty Bands</h2>
          <div className="dashboard-grid">
            {availableScenarioKeys.map(renderUncertaintyCard)}
          </div>
        </section>

        <section className="chart-section">
          <h2 className="section-title">Daily Hospitalizations</h2>
          <div className="dashboard-grid">
            {ages.map(renderDailyHospitalCardByAge)}
          </div>
        </section>

        <section className="chart-section">
          <h2 className="section-title">Age Group Breakdown</h2>
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

const getSummaryStats = (data, disease, classType) => {
  if (!data) return { peak: 0, total: 0, avg: 0 }

  let peak = 0
  let total = 0
  let count = 0

  ages.forEach(age => {
    const columnName = `${disease}_${classType}_${age}_mean`
    data.forEach(row => {
      const value = row[columnName] || 0
      if (value > peak) peak = value
      total += value
      count++
    })
  })

  return {
    peak: Math.round(peak),
    total: Math.round(total),
    avg: count > 0 ? Math.round(total / count) : 0
  }
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
      age: age.charAt(0).toUpperCase() + age.slice(1),
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
