'use client'

import React, { useState, useRef, useEffect } from 'react'
import gsap from 'gsap'
import AnimatedButton from './AnimatedButton'

interface Job {
  id: string
  name: string
  description: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  createdAt: Date
  updatedAt: Date
}

interface JobManagerProps {
  initialJobs?: Job[]
  onJobsChange?: (jobs: Job[]) => void
}

const JobManager: React.FC<JobManagerProps> = ({
  initialJobs = [],
  onJobsChange,
}) => {
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '' })
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    onJobsChange?.(jobs)
  }, [jobs, onJobsChange])

  const handleAddJob = () => {
    if (!formData.name) return

    const newJob: Job = {
      id: Date.now().toString(),
      name: formData.name,
      description: formData.description,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    gsap.to(formRef.current, {
      opacity: 0,
      y: -20,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => {
        setJobs([newJob, ...jobs])
        setFormData({ name: '', description: '' })
        setShowForm(false)
        gsap.set(formRef.current, { opacity: 1, y: 0 })
      },
    })
  }

  const handleDeleteJob = (id: string) => {
    setJobs(jobs.filter((job) => job.id !== id))
  }

  const handleStatusChange = (id: string, newStatus: Job['status']) => {
    setJobs(
      jobs.map((job) =>
        job.id === id
          ? {
              ...job,
              status: newStatus,
              progress: newStatus === 'completed' ? 100 : job.progress,
            }
          : job
      )
    )
  }

  const statusColors = {
    pending: 'bg-yellow-500/20 text-yellow-700',
    processing: 'bg-blue-500/20 text-blue-700',
    completed: 'bg-green-500/20 text-green-700',
    failed: 'bg-red-500/20 text-red-700',
  }

  return (
    <div className="space-y-6">
      {/* Add Job Button */}
      <div className="flex justify-end">
        <AnimatedButton
          variant="primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ New Job'}
        </AnimatedButton>
      </div>

      {/* Add Job Form */}
      {showForm && (
        <div
          ref={formRef}
          className="glass p-6 rounded-xl space-y-4"
        >
          <input
            type="text"
            placeholder="Job name"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.currentTarget.value })
            }
            className="w-full px-4 py-2 bg-transparent border-2 border-muted rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
          />
          <textarea
            placeholder="Job description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.currentTarget.value })
            }
            className="w-full px-4 py-2 bg-transparent border-2 border-muted rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary resize-none"
            rows={3}
          />
          <AnimatedButton
            variant="primary"
            onClick={handleAddJob}
            className="w-full"
          >
            Create Job
          </AnimatedButton>
        </div>
      )}

      {/* Jobs List */}
      <div className="space-y-3">
        {jobs.length === 0 ? (
          <div className="glass p-12 rounded-xl text-center">
            <p className="text-muted-foreground">No jobs yet. Create your first one!</p>
          </div>
        ) : (
          jobs.map((job) => (
            <div
              key={job.id}
              className="glass p-4 rounded-xl hover:shadow-lg transition-all duration-300 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground text-lg">
                    {job.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {job.description || 'No description'}
                  </p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <select
                    value={job.status}
                    onChange={(e) =>
                      handleStatusChange(job.id, e.currentTarget.value as Job['status'])
                    }
                    className="px-3 py-1 bg-primary/10 border border-primary/30 rounded text-sm font-semibold text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                  </select>
                  <button
                    onClick={() => handleDeleteJob(job.id)}
                    className="px-3 py-1 bg-red-500/10 border border-red-500/30 rounded text-sm font-semibold text-red-600 hover:bg-red-500/20 transition-colors duration-200"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-muted-foreground w-12 text-right">
                  {job.progress}%
                </span>
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    statusColors[job.status]
                  }`}
                >
                  {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(job.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default JobManager
