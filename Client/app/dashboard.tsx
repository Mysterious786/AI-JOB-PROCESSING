'use client'

import React, { useState, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useRouter } from 'next/navigation'
import JobForm, { JobData } from '@/components/JobForm'
import JobStatusCard, { Job } from '@/components/JobStatusCard'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import ParticleBackground from '@/components/ParticleBackground'

const Dashboard = () => {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Mock data for charts
  const chartData = [
    { name: 'Mon', completed: 4, pending: 2, failed: 0 },
    { name: 'Tue', completed: 3, pending: 4, failed: 1 },
    { name: 'Wed', completed: 7, pending: 1, failed: 0 },
    { name: 'Thu', completed: 5, pending: 3, failed: 2 },
    { name: 'Fri', completed: 8, pending: 2, failed: 1 },
  ]

  const statusDistribution = [
    { name: 'Completed', value: jobs.filter(j => j.status === 'completed').length, fill: '#10b981' },
    { name: 'Pending', value: jobs.filter(j => j.status === 'pending').length, fill: '#fbbf24' },
    { name: 'Processing', value: jobs.filter(j => j.status === 'processing').length, fill: '#3b82f6' },
    { name: 'Failed', value: jobs.filter(j => j.status === 'failed').length, fill: '#ef4444' },
  ]

  // Animation on mount
  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.8, ease: 'power2.out' }
      )
    }
  }, [])

  // Load jobs from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('jobs')
    if (stored) {
      setJobs(JSON.parse(stored))
    }
  }, [])

  // Save jobs to localStorage
  useEffect(() => {
    localStorage.setItem('jobs', JSON.stringify(jobs))
  }, [jobs])

  const handleCreateJob = async (formData: JobData) => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const newJob: Job = {
        id: Date.now().toString(),
        ...formData,
        status: 'pending',
        createdAt: new Date().toISOString(),
        progress: 0,
      }
      
      setJobs([newJob, ...jobs])
      setShowForm(false)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteJob = (id: string) => {
    gsap.to(`[data-job-id="${id}"]`, {
      opacity: 0,
      x: -20,
      duration: 0.3,
      onComplete: () => {
        setJobs(jobs.filter(j => j.id !== id))
      },
    })
  }

  const handleUpdateStatus = (id: string, newStatus: Job['status']) => {
    setJobs(
      jobs.map(job => {
        if (job.id === id) {
          return {
            ...job,
            status: newStatus,
            progress: newStatus === 'processing' ? 50 : newStatus === 'completed' ? 100 : 0,
          }
        }
        return job
      })
    )
  }

  const stats = [
    { label: 'Total Jobs', value: jobs.length, color: 'from-purple-600 to-pink-600' },
    { label: 'Completed', value: jobs.filter(j => j.status === 'completed').length, color: 'from-green-600 to-emerald-600' },
    { label: 'In Progress', value: jobs.filter(j => j.status === 'processing').length, color: 'from-blue-600 to-cyan-600' },
    { label: 'Pending', value: jobs.filter(j => j.status === 'pending').length, color: 'from-yellow-600 to-orange-600' },
  ]

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('userEmail')
    router.push('/')
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white relative overflow-hidden">
      <ParticleBackground />
      
      {/* Header */}
      <div className="relative z-10 border-b border-white/10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                Job Dashboard
              </h1>
              <p className="text-gray-400">Manage and monitor your tasks efficiently</p>
            </div>
            <div className="flex gap-4 items-center">
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-purple-500/50"
              >
                {showForm ? 'Close' : 'New Job'}
              </button>
              <button
                onClick={handleLogout}
                className="px-6 py-3 bg-red-600/20 hover:bg-red-600/40 border border-red-500/50 text-red-400 hover:text-red-300 rounded-lg font-semibold transition-all duration-300"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className={`bg-gradient-to-br ${stat.color} p-6 rounded-xl backdrop-blur-sm border border-white/10 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105`}
            >
              <p className="text-white/80 text-sm font-medium mb-2">{stat.label}</p>
              <p className="text-4xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Form & Form Toggle */}
          <div className="lg:col-span-1">
            {showForm && (
              <JobForm onSubmit={handleCreateJob} loading={loading} />
            )}
          </div>

          {/* Right Column - Jobs List */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold mb-6">Active Jobs</h2>
              {jobs.length === 0 ? (
                <div className="text-center py-12 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                  <p className="text-gray-400">No jobs yet. Create one to get started!</p>
                </div>
              ) : (
                jobs.map(job => (
                  <div key={job.id} data-job-id={job.id}>
                    <JobStatusCard
                      job={job}
                      onDelete={handleDeleteJob}
                      onUpdate={handleUpdateStatus}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Activity Chart */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 shadow-lg">
            <h3 className="text-xl font-bold mb-6">Weekly Activity</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="completed" fill="#10b981" radius={[8, 8, 0, 0]} />
                <Bar dataKey="pending" fill="#fbbf24" radius={[8, 8, 0, 0]} />
                <Bar dataKey="failed" fill="#ef4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Status Distribution */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 shadow-lg">
            <h3 className="text-xl font-bold mb-6">Status Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
