import React, { useState } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

// Sample research data - replace with your actual data
const timeSeriesData = [
  { month: 'Jan', value: 45, participants: 120 },
  { month: 'Feb', value: 52, participants: 135 },
  { month: 'Mar', value: 48, participants: 128 },
  { month: 'Apr', value: 61, participants: 150 },
  { month: 'May', value: 55, participants: 142 },
  { month: 'Jun', value: 67, participants: 165 },
  { month: 'Jul', value: 72, participants: 180 },
  { month: 'Aug', value: 68, participants: 175 },
  { month: 'Sep', value: 75, participants: 190 },
  { month: 'Oct', value: 80, participants: 200 },
  { month: 'Nov', value: 78, participants: 195 },
  { month: 'Dec', value: 85, participants: 210 }
]

const categoryData = [
  { category: 'Category A', value: 400, percentage: 35 },
  { category: 'Category B', value: 300, percentage: 28 },
  { category: 'Category C', value: 200, percentage: 20 },
  { category: 'Category D', value: 150, percentage: 12 },
  { category: 'Category E', value: 100, percentage: 5 }
]

const pieData = [
  { name: 'Group 1', value: 400, color: '#0088FE' },
  { name: 'Group 2', value: 300, color: '#00C49F' },
  { name: 'Group 3', value: 200, color: '#FFBB28' },
  { name: 'Group 4', value: 100, color: '#FF8042' }
]

const ageGroupData = [
  { ageGroup: '<1 year', value: 5.5 },
  { ageGroup: '1-4 years', value: 5.0 },
  { ageGroup: '5-11 years', value: 7.8 },
  { ageGroup: '12-19 years', value: 4.2 },
  { ageGroup: '20-64 years', value: 3.5 },
  { ageGroup: '65+ years', value: 7.5 }
]

const Dashboard = () => {
  const [selectedCategories, setSelectedCategories] = useState({
    overview: true,
    timeSeries: true,
    comparisons: true,
    distributions: true,
    trends: true
  })

  const toggleCategory = (category) => {
    setSelectedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  const categories = [
    { id: 'overview', label: 'Overview', description: 'Key metrics and summary' },
    { id: 'timeSeries', label: 'Time Series', description: 'Trends over time' },
    { id: 'comparisons', label: 'Comparisons', description: 'Category comparisons' },
    { id: 'distributions', label: 'Distributions', description: 'Data distribution' },
    { id: 'trends', label: 'Trends', description: 'Trend analysis' }
  ]

  const keyFindings = {
    period: 'October 26 – November 1, 2025',
    findings: [
      {
        title: 'Overall Activity',
        status: 'moderate',
        value: '6.0%',
        description: 'Overall activity was similar to the previous week',
        trend: 'stable'
      },
      {
        title: 'Primary Metric',
        status: 'low',
        value: '52',
        description: 'Primary metric shows consistent performance',
        trend: 'increasing'
      },
      {
        title: 'Participants',
        status: 'moderate',
        value: '165',
        description: 'Participant count increased this week',
        trend: 'increasing'
      }
    ]
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Research Dashboard</h1>
        <p>Comprehensive visualization of research data</p>
      </header>

      {/* Key Findings Section */}
      <section className="key-findings">
        <h2>Key Findings for {keyFindings.period}</h2>
        <div className="findings-grid">
          {keyFindings.findings.map((finding, index) => (
            <div key={index} className={`finding-card finding-${finding.status}`}>
              <div className="finding-header">
                <h3>{finding.title}</h3>
                <span className={`status-badge status-${finding.status}`}>
                  {finding.status}
                </span>
              </div>
              <div className="finding-value">{finding.value}</div>
              <p className="finding-description">{finding.description}</p>
              <div className={`trend-indicator trend-${finding.trend}`}>
                {finding.trend === 'increasing' ? '↑' : finding.trend === 'decreasing' ? '↓' : '→'} {finding.trend}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Category Selection */}
      <section className="category-selector">
        <h2>Select Data Categories to Display</h2>
        <div className="category-buttons">
          {categories.map(category => (
            <button
              key={category.id}
              className={`category-btn ${selectedCategories[category.id] ? 'active' : ''}`}
              onClick={() => toggleCategory(category.id)}
            >
              <input
                type="checkbox"
                checked={selectedCategories[category.id]}
                onChange={() => toggleCategory(category.id)}
                className="category-checkbox"
              />
              <div className="category-info">
                <span className="category-label">{category.label}</span>
                <span className="category-description">{category.description}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Charts Section */}
      <div className="dashboard-content">
        {/* Overview Charts */}
        {selectedCategories.overview && (
          <section className="chart-section">
            <h2 className="section-title">Overview</h2>
            <div className="dashboard-grid">
              <div className="chart-card">
                <h3>Monthly Trends</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#2563eb" 
                      strokeWidth={2}
                      name="Research Metric"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="participants" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Participants"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h3>Distribution Overview</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#2563eb"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}

        {/* Time Series Charts */}
        {selectedCategories.timeSeries && (
          <section className="chart-section">
            <h2 className="section-title">Time Series Analysis</h2>
            <div className="dashboard-grid">
              <div className="chart-card">
                <h3>Monthly Trends</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#2563eb" 
                      strokeWidth={2}
                      name="Research Metric"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="participants" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Participants"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}

        {/* Comparison Charts */}
        {selectedCategories.comparisons && (
          <section className="chart-section">
            <h2 className="section-title">Comparisons</h2>
            <div className="dashboard-grid">
              <div className="chart-card">
                <h3>Category Comparison</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#2563eb" name="Value" />
                    <Bar dataKey="percentage" fill="#10b981" name="Percentage" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h3>Age Group Analysis</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={ageGroupData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="ageGroup" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#8b5cf6" name="Value (%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}

        {/* Distribution Charts */}
        {selectedCategories.distributions && (
          <section className="chart-section">
            <h2 className="section-title">Distributions</h2>
            <div className="dashboard-grid">
              <div className="chart-card">
                <h3>Data Distribution</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#2563eb"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}

        {/* Trend Charts */}
        {selectedCategories.trends && (
          <section className="chart-section">
            <h2 className="section-title">Trend Analysis</h2>
            <div className="dashboard-grid">
              <div className="chart-card">
                <h3>Cumulative Trends</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={timeSeriesData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#2563eb" 
                      fillOpacity={1} 
                      fill="url(#colorValue)"
                      name="Research Metric"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}

        {!Object.values(selectedCategories).some(v => v) && (
          <div className="no-selection">
            <p>Please select at least one category to display charts.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
