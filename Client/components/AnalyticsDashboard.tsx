'use client'

import React, { useRef, useEffect } from 'react'
import gsap from 'gsap'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import AnimatedStatsCard from './AnimatedStatsCard'

interface AnalyticsDashboardProps {
  stats?: {
    totalJobs: number
    completed: number
    processing: number
    avgTime: number
  }
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  stats = {
    totalJobs: 284,
    completed: 156,
    processing: 45,
    avgTime: 2.4,
  },
}) => {
  const dashboardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.from(dashboardRef.current?.querySelectorAll('.analytics-card'), {
      opacity: 0,
      y: 20,
      duration: 0.5,
      stagger: 0.1,
      ease: 'power3.out',
    })
  }, [])

  const chartData = [
    { name: 'Mon', jobs: 40, completed: 24, failed: 3 },
    { name: 'Tue', jobs: 30, completed: 13, failed: 2 },
    { name: 'Wed', jobs: 20, completed: 9, failed: 1 },
    { name: 'Thu', jobs: 39, completed: 39, failed: 0 },
    { name: 'Fri', jobs: 47, completed: 37, failed: 2 },
    { name: 'Sat', jobs: 35, completed: 28, failed: 1 },
    { name: 'Sun', jobs: 48, completed: 41, failed: 3 },
  ]

  const statusData = [
    { name: 'Completed', value: stats.completed, color: '#10b981' },
    { name: 'Processing', value: stats.processing, color: '#3b82f6' },
    { name: 'Pending', value: 60, color: '#f59e0b' },
    { name: 'Failed', value: 23, color: '#ef4444' },
  ]

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

  return (
    <div ref={dashboardRef} className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 analytics-card">
        <AnimatedStatsCard
          title="Total Jobs"
          value={stats.totalJobs}
          unit="jobs"
          change={12}
          color="primary"
        />
        <AnimatedStatsCard
          title="Completed"
          value={stats.completed}
          unit="jobs"
          change={8}
          color="secondary"
        />
        <AnimatedStatsCard
          title="Processing"
          value={stats.processing}
          unit="jobs"
          change={5}
          color="accent"
        />
        <AnimatedStatsCard
          title="Avg Time"
          value={stats.avgTime}
          unit="min"
          change={-3}
          decimals={1}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area Chart */}
        <div className="lg:col-span-2 glass p-6 rounded-xl analytics-card">
          <h3 className="text-lg font-semibold mb-4 text-foreground">
            Job Completion Trends
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(139, 92, 246, 0.1)"
              />
              <XAxis stroke="rgba(255, 255, 255, 0.5)" />
              <YAxis stroke="rgba(255, 255, 255, 0.5)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '8px',
                }}
                cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="jobs"
                stroke="#8b5cf6"
                fillOpacity={1}
                fill="url(#colorJobs)"
              />
              <Area
                type="monotone"
                dataKey="completed"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorCompleted)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Donut Chart */}
        <div className="glass p-6 rounded-xl analytics-card">
          <h3 className="text-lg font-semibold mb-4 text-foreground">
            Status Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="glass p-6 rounded-xl analytics-card">
        <h3 className="text-lg font-semibold mb-4 text-foreground">
          Weekly Performance Metrics
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(139, 92, 246, 0.1)"
            />
            <XAxis stroke="rgba(255, 255, 255, 0.5)" />
            <YAxis stroke="rgba(255, 255, 255, 0.5)" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '8px',
              }}
              cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }}
            />
            <Legend />
            <Bar dataKey="jobs" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            <Bar dataKey="completed" fill="#10b981" radius={[8, 8, 0, 0]} />
            <Bar dataKey="failed" fill="#ef4444" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Line Chart */}
      <div className="glass p-6 rounded-xl analytics-card">
        <h3 className="text-lg font-semibold mb-4 text-foreground">
          Completion Rate Trend
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(139, 92, 246, 0.1)"
            />
            <XAxis stroke="rgba(255, 255, 255, 0.5)" />
            <YAxis stroke="rgba(255, 255, 255, 0.5)" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '8px',
              }}
              cursor={{ stroke: 'rgba(139, 92, 246, 0.3)' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="completed"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ fill: '#10b981', r: 5 }}
              activeDot={{ r: 7 }}
            />
            <Line
              type="monotone"
              dataKey="failed"
              stroke="#ef4444"
              strokeWidth={3}
              dot={{ fill: '#ef4444', r: 5 }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default AnalyticsDashboard
