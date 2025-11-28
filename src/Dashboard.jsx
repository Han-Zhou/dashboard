import React, { useState, useEffect, useMemo } from 'react'
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
  ResponsiveContainer,
  ErrorBar
} from 'recharts'
import Papa from 'papaparse'

const scenarioConfig = {
  base: {
    label: 'Baseline (No Additional Mitigations)',
    shortLabel: 'Baseline',
    badge: 'Base',
    color: '#0ea5e9',
    dynamicsPath: '/data/dynamics_df_base.csv',
    weeklyHospPath: '/data/weekly_hosp_df_base.csv'
  },
  testing: {
    label: 'Testing 10% of Students Daily',
    shortLabel: 'Testing 10%',
    badge: 'Test',
    color: '#f97316',
    dynamicsPath: '/data/dynamics_df_test_10.csv',
    weeklyHospPath: '/data/weekly_hosp_df_test_10.csv'
  },
  vaccination: {
    label: 'Vaccination 10% of Students',
    shortLabel: 'Vaccination 10%',
    badge: 'Vax',
    color: '#10b981',
    dynamicsPath: '/data/dynamics_df_vax_10.csv',
    weeklyHospPath: '/data/weekly_hosp_df_vax_10.csv'
  },
  combo: {
    label: 'Vaccination + Testing (10%)',
    shortLabel: 'Vax + Test',
    badge: 'Combo',
    color: '#6366f1',
    dynamicsPath: '/data/dynamics_df_vax_10_test_10.csv',
    weeklyHospPath: '/data/weekly_hosp_df_vax_10_test_10.csv'
  }
}

const scenarioOptions = [
  { id: 'base', label: scenarioConfig.base.label },
  { id: 'testing', label: scenarioConfig.testing.label },
  { id: 'vaccination', label: scenarioConfig.vaccination.label },
  { id: 'combo', label: scenarioConfig.combo.label },
  { id: 'compare', label: 'Compare Testing vs Vaccination' }
]

  const diseases = ['covid', 'flu', 'rsv']
  const ages = ['infant', 'preschool', 'child', 'adult', 'senior']
  const ageColors = {
    infant: '#ef4444',
    preschool: '#f59e0b',
    child: '#10b981',
    adult: '#3b82f6',
    senior: '#8b5cf6'
  }

const intensityOptions = [
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
    defaultValue: 'medium'
  },
  {
    id: 'studentAdultContact',
    label: 'Students ↔ Adults',
    description: 'Reduction on student contact rate with adults at school',
    optionSet: 'intensity',
    defaultValue: 'medium'
  },
  {
    id: 'adultStudentContact',
    label: 'Adults ↔ Students',
    description: 'Reduction on adult contact rate with students at school',
    optionSet: 'intensity',
    defaultValue: 'medium'
  },
  {
    id: 'adultAdultContact',
    label: 'Adults ↔ Adults',
    description: 'Reduction on adult contact rate with other adults at school',
    optionSet: 'intensity',
    defaultValue: 'medium'
  },
  {
    id: 'covidVaccination',
    label: 'COVID-19 vaccination',
    description: 'Proportion vaccinated',
    optionSet: 'coverage',
    defaultValue: 'none'
  },
  {
    id: 'fluVaccination',
    label: 'Influenza vaccination',
    description: 'Proportion vaccinated',
    optionSet: 'coverage',
    defaultValue: 'none'
  },
  {
    id: 'covidTesting',
    label: 'COVID-19 testing',
    description: 'Proportion of students tested daily',
    optionSet: 'coverage',
    defaultValue: 'none'
  },
  {
    id: 'fluTesting',
    label: 'Influenza testing',
    description: 'Proportion of students tested daily',
    optionSet: 'coverage',
    defaultValue: 'none'
  },
  {
    id: 'rsvTesting',
    label: 'RSV testing',
    description: 'Proportion of students tested daily',
    optionSet: 'coverage',
    defaultValue: 'none'
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
  const [selectedDisease, setSelectedDisease] = useState('covid')
  const [selectedScenario, setSelectedScenario] = useState('compare')
  const [selectedView, setSelectedView] = useState('infections')
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
        Object.entries(scenarioConfig).map(async ([key, files]) => {
          try {
            const [dyn, hosp] = await Promise.all([
              fetchCsv(files.dynamicsPath),
              fetchCsv(files.weeklyHospPath)
            ])
            dynamics[key] = dyn
            weekly[key] = hosp
      } catch (error) {
            errors.push(`${files.shortLabel}: ${error.message}`)
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

  const activeScenarioKeys =
    selectedScenario === 'compare' ? ['testing', 'vaccination'] : [selectedScenario]

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

  const scenarioMatchFromParameters = useMemo(() => {
    const contactSettings = [
      parameterSelections.studentStudentContact,
      parameterSelections.studentAdultContact,
      parameterSelections.adultStudentContact,
      parameterSelections.adultAdultContact
    ]
    const contactsAtDefault = contactSettings.every(setting => setting === 'medium')

    if (!contactsAtDefault) {
      return null
    }

    const vaccinationSettings = [
      parameterSelections.covidVaccination,
      parameterSelections.fluVaccination
    ]
    const testingSettings = [
      parameterSelections.covidTesting,
      parameterSelections.fluTesting,
      parameterSelections.rsvTesting
    ]

    const vaccinationActive = vaccinationSettings.some(setting => setting !== 'none')
    const testingActive = testingSettings.some(setting => setting !== 'none')

    if (!vaccinationActive && !testingActive) return 'base'
    if (vaccinationActive && !testingActive) return 'vaccination'
    if (!vaccinationActive && testingActive) return 'testing'
    if (vaccinationActive && testingActive) return 'combo'
    return null
  }, [parameterSelections])

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
          {selectedDisease.toUpperCase()} {selectedView === 'infections' ? 'Infections' : 'Recoveries'} ·{' '}
          {scenarioMeta.shortLabel}
        </h2>
        <div className="dashboard-grid">
          <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
            <h3>Time Series by Age Group</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
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
            </ResponsiveContainer>
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
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={series}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              label={{ value: 'Day', position: 'insideBottomRight', offset: -5 }}
            />
            <YAxis
              label={{ value: 'People', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="upper"
              stroke="none"
              fill={`${scenarioMeta.color}66`}
            />
            <Area type="monotone" dataKey="lower" stroke="none" fill="#94a3b8" />
            <Line
              type="monotone"
              dataKey="mean"
              stroke={scenarioMeta.color}
              strokeWidth={2}
              dot={false}
              name="Mean"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )
  }

  const renderWeeklyHospitalCard = scenarioKey => {
    const scenarioMeta = scenarioConfig[scenarioKey]
    const weeklySeries = buildWeeklyHospitalSeries(weeklyHospData[scenarioKey], selectedDisease)
    const latestByAge = buildWeeklyHospitalByAge(weeklyHospData[scenarioKey], selectedDisease)

    if (!weeklySeries.length) {
      return null
    }

    return (
      <div className="chart-card" key={`weekly-${scenarioKey}`}>
        <h3>{scenarioMeta.shortLabel} · Weekly Hospitalizations</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={weeklySeries}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="week"
              label={{ value: 'Week', position: 'insideBottomRight', offset: -5 }}
            />
            <YAxis
              label={{ value: 'Hospitalizations', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="upper" 
              stroke="none" 
              fill={`${scenarioMeta.color}66`} 
              name="Upper CI"
            />
            <Area 
              type="monotone" 
              dataKey="lower" 
              stroke="none" 
              fill="#94a3b8" 
              name="Lower CI"
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
          </ComposedChart>
        </ResponsiveContainer>
        <div style={{ marginTop: '24px' }}>
          <h4 style={{ marginBottom: '12px', color: '#1e293b' }}>Latest Week by Age</h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={latestByAge}
              margin={{ top: 10, right: 20, bottom: 30, left: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="age"
                label={{ value: 'Age Group', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                label={{
                  value: 'Hospitalizations',
                  angle: -90,
                  position: 'insideLeft',
                  dy: 20,
                  style: { textAnchor: 'middle' }
                }}
              />
              <Tooltip />
              <Bar dataKey="mean" fill={scenarioMeta.color} name="Mean">
                <ErrorBar dataKey="error" width={6} stroke="#475569" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  const renderAgeBreakdownCard = age => {
    const chartData =
      selectedScenario === 'compare'
        ? mergeSeriesByDay([
            {
              key: 'testing',
              data: buildAgeSeries(dynamicsData.testing, selectedDisease, chartClassType, age)
            },
            {
              key: 'vaccination',
              data: buildAgeSeries(
                dynamicsData.vaccination,
                selectedDisease,
                chartClassType,
                age
              )
            }
          ])
        : mergeSeriesByDay([
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

    const linesToRender =
      selectedScenario === 'compare'
        ? ['testing', 'vaccination']
        : [selectedScenario]

    return (
      <div key={age} className="chart-card">
        <h3 style={{ textTransform: 'capitalize' }}>
          {age} · {selectedDisease.toUpperCase()}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
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
        </ResponsiveContainer>
      </div>
    )
  }

  const summaryCards =
    selectedScenario === 'compare'
      ? ['testing', 'vaccination']
      : [selectedScenario]

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

      <section className="category-selector">
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '12px', fontSize: '1.1rem', color: '#1e293b' }}>Select Disease:</h3>
          <div className="category-buttons">
            {diseases.map(disease => (
              <button
                key={disease}
                className={`category-btn ${selectedDisease === disease ? 'active' : ''}`}
                onClick={() => setSelectedDisease(disease)}
                style={{ textTransform: 'capitalize' }}
              >
                {disease.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '12px', fontSize: '1.1rem', color: '#1e293b' }}>View Type:</h3>
          <div className="category-buttons">
            <button
              className={`category-btn ${selectedView === 'infections' ? 'active' : ''}`}
              onClick={() => setSelectedView('infections')}
            >
              Infections (Symptomatic)
            </button>
            <button
              className={`category-btn ${selectedView === 'recoveries' ? 'active' : ''}`}
              onClick={() => setSelectedView('recoveries')}
            >
              Recoveries
            </button>
          </div>
        </div>

        <div>
          <h3 style={{ marginBottom: '12px', fontSize: '1.1rem', color: '#1e293b' }}>Scenario:</h3>
          <div className="category-buttons">
            {scenarioOptions.map(option => (
            <button
                key={option.id}
                className={`category-btn ${selectedScenario === option.id ? 'active' : ''}`}
                onClick={() => setSelectedScenario(option.id)}
                disabled={option.id !== 'compare' && !dynamicsData[option.id]}
                style={{
                  opacity:
                    option.id !== 'compare' && !dynamicsData[option.id] ? 0.5 : 1
                }}
              >
                {option.label}
            </button>
            ))}
          </div>
        </div>
      </section>

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
            {scenarioMatchFromParameters && scenarioConfig[scenarioMatchFromParameters]
              ? scenarioConfig[scenarioMatchFromParameters].shortLabel
              : 'Scenario data pending'}
          </div>
        </div>
        <div className="parameter-grid">
          {parameterDefinitions.map(def => {
            const options = def.optionSet === 'intensity' ? intensityOptions : coverageOptions
            return (
              <div key={def.id} className="parameter-card">
                <label htmlFor={def.id}>
                  <span>{def.label}</span>
                  <small>{def.description}</small>
                </label>
                <select
                  id={def.id}
                  className="parameter-select"
                  value={parameterSelections[def.id]}
                  onChange={event =>
                    setParameterSelections(prev => ({
                      ...prev,
                      [def.id]: event.target.value
                    }))
                  }
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
          Summary Statistics · {selectedDisease.toUpperCase()} ·{' '}
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

        {selectedScenario === 'compare' && dynamicsData.testing && dynamicsData.vaccination && (
          <section className="chart-section">
            <h2 className="section-title">Scenario Comparison · Cumulative Burden</h2>
            <div className="dashboard-grid">
              {['testing', 'vaccination'].map(scenarioKey => {
                const chartData = prepareChartData(
                  dynamicsData[scenarioKey],
                  selectedDisease,
                  chartClassType
                )
                const scenarioMeta = scenarioConfig[scenarioKey]
                if (!chartData.length) {
                  return null
                }
                return (
                  <div className="chart-card" key={`cumulative-${scenarioKey}`}>
                    <h3>{scenarioMeta.shortLabel}</h3>
                    <ResponsiveContainer width="100%" height={350}>
                      <AreaChart data={chartData} stackOffset="expand">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="day"
                          label={{ value: 'Day', position: 'insideBottomRight', offset: -5 }}
                        />
                        <YAxis
                          label={{ value: 'Share of Cases', angle: -90, position: 'insideLeft' }}
                        />
                    <Tooltip />
                    <Legend />
                    {ages.map(age => (
                      <Area
                            key={`${scenarioKey}-area-${age}`}
                        type="monotone"
                        dataKey={age}
                        stackId="1"
                        stroke={ageColors[age]}
                            fill={ageColors[age]}
                        name={age.charAt(0).toUpperCase() + age.slice(1)}
                            fillOpacity={0.4}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
                )
              })}
            </div>
          </section>
        )}

        <section className="chart-section">
          <h2 className="section-title">Uncertainty Bands</h2>
          <div className="dashboard-grid">
            {availableScenarioKeys.map(renderUncertaintyCard)}
          </div>
        </section>

        <section className="chart-section">
          <h2 className="section-title">Weekly Hospitalizations</h2>
          <div className="dashboard-grid">
            {availableScenarioKeys.map(renderWeeklyHospitalCard)}
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
      const result = { day: Math.round(row.day_mean) }

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
      const day = Math.round(row.day_mean)
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

      return { day, mean, lower, upper }
    })
    .sort((a, b) => a.day - b.day)
}

const buildWeeklyHospitalSeries = (data, disease) => {
  if (!data) return []

  return data.map((row, index) => {
    const entry = { week: index + 1, mean: 0, lower: 0, upper: 0 }

    ages.forEach(age => {
      entry.mean += row[`${disease}_hospitalized_${age}_weekly_mean`] || 0
      entry.lower += row[`${disease}_hospitalized_${age}_weekly_ci_lower`] || 0
      entry.upper += row[`${disease}_hospitalized_${age}_weekly_ci_upper`] || 0
    })

    return entry
  })
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
      day: Math.round(row.day_mean),
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
