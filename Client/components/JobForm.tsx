'use client'

import React, { useRef, useEffect, useState } from 'react'
import gsap from 'gsap'

interface JobFormProps {
  onSubmit: (jobData: JobData) => void
  loading?: boolean
}

export interface JobData {
  title: string
  description: string
  jobType: 'summarize' | 'classify' | 'translate' | 'sentiment' | 'keywords' | 'qa'
  priority: 'low' | 'medium' | 'high'
  estimatedTime: number
  callbackUrl?: string
}

const JobForm: React.FC<JobFormProps> = ({ onSubmit, loading = false }) => {
  const [formData, setFormData] = useState<JobData>({
    title: '',
    description: '',
    jobType: 'summarize',
    priority: 'medium',
    estimatedTime: 1,
    callbackUrl: '',
  })

  const formRef = useRef<HTMLFormElement>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (formRef.current) {
      gsap.fromTo(
        formRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
      )
    }
  }, [])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.title.trim()) newErrors.title = 'Title is required'
    if (!formData.description.trim()) newErrors.description = 'Description is required'
    if (formData.estimatedTime <= 0) newErrors.estimatedTime = 'Time must be positive'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onSubmit(formData)
      setFormData({ title: '', description: '', jobType: 'summarize', priority: 'medium', estimatedTime: 1, callbackUrl: '' })
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'estimatedTime' ? Number(value) : value,
    }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const priorityColors = {
    low: 'border-blue-500 focus:ring-blue-500',
    medium: 'border-yellow-500 focus:ring-yellow-500',
    high: 'border-red-500 focus:ring-red-500',
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-white/15 bg-slate-900/60 p-7 shadow-xl backdrop-blur"
    >
      <h2 className="text-xl font-semibold text-white">
        Create New Job
      </h2>

      {/* Title Field */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          Job Title
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Enter job title..."
          className="w-full rounded-lg border border-white/15 bg-slate-900/70 px-4 py-3 text-white placeholder:text-slate-400 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
      </div>

      {/* Description Field */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          Description
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Enter job description..."
          rows={4}
          className="w-full resize-none rounded-lg border border-white/15 bg-slate-900/70 px-4 py-3 text-white placeholder:text-slate-400 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
      </div>

      {/* Priority & Time Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            AI Task Type
          </label>
          <select
            name="jobType"
            value={formData.jobType}
            onChange={handleChange}
            className="w-full rounded-lg border border-white/15 bg-slate-900/70 px-4 py-3 text-white transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="summarize">✦ Summarize</option>
            <option value="classify">⬡ Classify</option>
            <option value="translate">⟳ Translate</option>
            <option value="sentiment">◎ Sentiment</option>
            <option value="keywords">⌘ Keywords</option>
            <option value="qa">? Q&amp;A</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Priority
          </label>
          <select
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className={`w-full rounded-lg border bg-slate-900/70 px-4 py-3 text-white transition focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${priorityColors[formData.priority]}`}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Est. Time (hours)
          </label>
          <input
            type="number"
            name="estimatedTime"
            value={formData.estimatedTime}
            onChange={handleChange}
            min="0.5"
            step="0.5"
            className="w-full rounded-lg border border-white/15 bg-slate-900/70 px-4 py-3 text-white transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          {errors.estimatedTime && <p className="text-red-500 text-sm mt-1">{errors.estimatedTime}</p>}
        </div>
      </div>

      {/* Callback URL */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          Webhook URL <span className="text-slate-500 font-normal">(optional)</span>
        </label>
        <input
          type="url"
          name="callbackUrl"
          value={formData.callbackUrl}
          onChange={handleChange}
          placeholder="https://your-server.com/webhook"
          className="w-full rounded-lg border border-white/15 bg-slate-900/70 px-4 py-3 text-white placeholder:text-slate-400 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-indigo-500 py-3 font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Creating Job...' : 'Create Job'}
      </button>
    </form>
  )
}

export default JobForm
