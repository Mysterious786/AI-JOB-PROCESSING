'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { useRouter } from 'next/navigation'
import JobForm, { JobData } from '@/components/JobForm'
import JobStatusCard, { Job } from '@/components/JobStatusCard'
import Toast from '@/components/Toast'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { api, ApiError, JobStatusResponse, ProfileResponse } from '@/lib/api'
import { session } from '@/lib/session'
import { Search, X, RefreshCw } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type JobStatus = Job['status']
type FilterStatus = 'all' | JobStatus
type FilterType = 'all' | string

interface ToastItem {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusToUi = (status: string): JobStatus => {
  switch (status.toUpperCase()) {
    case 'CREATED':    return 'pending'
    case 'PROCESSING': return 'processing'
    case 'COMPLETED':  return 'completed'
    case 'FAILED':     return 'failed'
    default:           return 'pending'
  }
}

const progressByStatus = (status: JobStatus): number => {
  if (status === 'completed') return 100
  if (status === 'processing') return 60
  if (status === 'failed') return 100
  return 20
}

const isAuthError = (err: unknown): boolean =>
  err instanceof ApiError && (err.status === 401 || err.status === 403)

const serverJobToUi = (s: JobStatusResponse): Job => ({
  id: s.jobId,
  title: s.jobId.slice(0, 8),          // fallback title — overridden by localStorage merge
  description: '',
  jobType: (s.jobType as Job['jobType']) ?? undefined,
  aiResult: s.result ?? undefined,
  errorMessage: s.errorMessage ?? undefined,
  status: statusToUi(s.status),
  priority: 'medium',
  estimatedTime: 1,
  createdAt: s.createdAt ?? new Date().toISOString(),
  progress: progressByStatus(statusToUi(s.status)),
})

// ─── Component ────────────────────────────────────────────────────────────────

const DashboardPage = () => {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [auditLog, setAuditLog] = useState<string[]>([])
  // Batch state
  const [showBatch, setShowBatch] = useState(false)
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchRows, setBatchRows] = useState<{ jobType: JobData['jobType']; inputText: string }[]>([
    { jobType: 'summarize', inputText: '' },
  ])
  // History state
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live')
  const [history, setHistory] = useState<import('@/lib/api').JobHistoryResponse | null>(null)
  const [historyPage, setHistoryPage] = useState(0)
  const [historyLoading, setHistoryLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // ── Toast helpers ──────────────────────────────────────────────────────────

  const addToast = useCallback((message: string, type: ToastItem['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // ── Auth guard ─────────────────────────────────────────────────────────────

  const forceReauth = useCallback(() => {
    session.clearAuth()
    addToast('Session expired. Please sign in again.', 'error')
    router.push('/')
  }, [router, addToast])

  // ── Auto refresh token ────────────────────────────────────────────────────

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!session.isTokenExpiringSoon()) return
      const refreshToken = session.getRefreshToken()
      if (!refreshToken) return
      try {
        const res = await api.refresh(refreshToken)
        const email = session.getUserEmail() ?? ''
        session.setAuth(email, res.accessToken, res.refreshToken, res.expiresIn)
      } catch {
        forceReauth()
      }
    }, 30000) // check every 30s
    return () => clearInterval(interval)
  }, [forceReauth])

  // ── Load quota ─────────────────────────────────────────────────────────────

  const loadQuota = useCallback(async () => {
    const token = session.getAccessToken()
    if (!token) return
    try {
      const q = await api.getQuota(token)
      setQuota({ used: q.used, limit: q.limit })
    } catch { /* non-critical */ }
  }, [])

  // ── Load profile + audit ───────────────────────────────────────────────────

  const loadProfile = useCallback(async () => {
    const token = session.getAccessToken()
    if (!token) return
    try {
      const [p, a] = await Promise.all([api.getProfile(token), api.getAuditLog(token)])
      setProfile(p)
      setAuditLog(a)
    } catch { /* non-critical */ }
  }, [])

  // ── Load history from PostgreSQL ───────────────────────────────────────────

  const loadHistory = useCallback(async (page = 0) => {
    const token = session.getAccessToken()
    if (!token) return
    setHistoryLoading(true)
    try {
      const res = await api.getHistory(token, page, 10)
      setHistory(res)
      setHistoryPage(page)
    } catch { /* non-critical */ } finally {
      setHistoryLoading(false)
    }
  }, [])

  const mergeWithLocal = useCallback((serverJobs: JobStatusResponse[]): Job[] => {
    const stored: Job[] = (() => {
      try { return JSON.parse(localStorage.getItem('jobs') || '[]') } catch { return [] }
    })()
    const localMap = new Map(stored.map((j) => [j.id, j]))

    return serverJobs.map((s) => {
      const local = localMap.get(s.jobId)
      return {
        id: s.jobId,
        title: local?.title ?? s.jobId.slice(0, 8),
        description: local?.description ?? '',
        jobType: (s.jobType as Job['jobType']) ?? local?.jobType,
        aiResult: s.result ?? local?.aiResult,
        errorMessage: s.errorMessage ?? local?.errorMessage,
        status: statusToUi(s.status),
        priority: local?.priority ?? 'medium',
        estimatedTime: local?.estimatedTime ?? 1,
        createdAt: s.createdAt ?? local?.createdAt ?? new Date().toISOString(),
        progress: progressByStatus(statusToUi(s.status)),
      }
    })
  }, [])

  // ── Load jobs from backend ─────────────────────────────────────────────────

  const loadJobs = useCallback(async (silent = false) => {
    const token = session.getAccessToken()
    if (!token) return
    if (!silent) setRefreshing(true)
    try {
      const serverJobs = await api.listJobs(token)
      const merged = mergeWithLocal(serverJobs)
      setJobs(merged)
      localStorage.setItem('jobs', JSON.stringify(merged))
    } catch (err) {
      if (isAuthError(err)) { forceReauth(); return }
      // silently fall back to localStorage
      const stored = localStorage.getItem('jobs')
      if (stored) setJobs(JSON.parse(stored))
    } finally {
      if (!silent) setRefreshing(false)
    }
  }, [mergeWithLocal, forceReauth])

  // ── Initial load ───────────────────────────────────────────────────────────

  useEffect(() => {
    const token = session.getAccessToken()
    if (!token) { router.push('/'); return }
    loadJobs()
    loadQuota()
  }, [router, loadJobs, loadQuota])

  // ── Persist to localStorage whenever jobs change ───────────────────────────

  useEffect(() => {
    if (jobs.length > 0) localStorage.setItem('jobs', JSON.stringify(jobs))
  }, [jobs])

  // ── GSAP entrance ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.8 })
    }
  }, [])

  // ── Modal animation ───────────────────────────────────────────────────────

  useEffect(() => {
    if (selectedJob && modalRef.current) {
      gsap.fromTo(modalRef.current,
        { opacity: 0, scale: 0.95, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      )
    }
  }, [selectedJob])

  // ── Poll pending/processing jobs ───────────────────────────────────────────

  useEffect(() => {
    const token = session.getAccessToken()
    if (!token) return

    const pendingJobs = jobs.filter((j) => j.status === 'pending' || j.status === 'processing')
    if (pendingJobs.length === 0) return

    const interval = setInterval(async () => {
      await Promise.all(
        pendingJobs.map(async (job) => {
          try {
            const s = await api.getJobStatus(job.id, token)
            const uiStatus = statusToUi(s.status)
            const wasTerminal = job.status === 'completed' || job.status === 'failed'
            const nowTerminal = uiStatus === 'completed' || uiStatus === 'failed'

            setJobs((prev) =>
              prev.map((existing) =>
                existing.id === job.id
                  ? {
                      ...existing,
                      status: uiStatus,
                      aiResult: s.result ?? existing.aiResult,
                      errorMessage: s.errorMessage ?? existing.errorMessage,
                      jobType: (s.jobType as Job['jobType']) ?? existing.jobType,
                      progress: progressByStatus(uiStatus),
                      createdAt: s.createdAt || existing.createdAt,
                    }
                  : existing
              )
            )

            // Toast on completion/failure
            if (!wasTerminal && nowTerminal) {
              if (uiStatus === 'completed') {
                addToast(`Job "${job.title}" completed ✓`, 'success')
              } else {
                addToast(`Job "${job.title}" failed`, 'error')
              }
            }
          } catch (err) {
            if (isAuthError(err)) { forceReauth(); return }
          }
        })
      )
    }, 2000)

    return () => clearInterval(interval)
  }, [jobs, forceReauth, addToast])

  // ── Create job ─────────────────────────────────────────────────────────────

  const handleCreateJob = async (formData: JobData) => {
    const token = session.getAccessToken()
    if (!token) { router.push('/'); return }

    setLoading(true)
    try {
      const created = await api.createJob(
        {
          jobType: formData.jobType,
          inputText: `${formData.title}: ${formData.description}`,
          callbackUrl: formData.callbackUrl || undefined,
        },
        token
      )

      const newJob: Job = {
        id: created.jobId,
        title: formData.title,
        description: formData.description,
        jobType: formData.jobType,
        priority: formData.priority,
        estimatedTime: formData.estimatedTime,
        callbackUrl: formData.callbackUrl || undefined,
        status: statusToUi(created.status),
        createdAt: new Date().toISOString(),
        progress: progressByStatus(statusToUi(created.status)),
      }

      setJobs((prev) => [newJob, ...prev])
      setShowForm(false)
      addToast(`Job "${formData.title}" created`, 'success')
      loadQuota()
    } catch (err) {
      if (isAuthError(err)) { forceReauth(); return }
      addToast(err instanceof Error ? err.message : 'Could not create job', 'error')
    } finally {
      setLoading(false)
    }
  }

  // ── Retry job ──────────────────────────────────────────────────────────────

  const handleRetryJob = async (id: string) => {
    const token = session.getAccessToken()
    if (!token) { router.push('/'); return }
    const job = jobs.find((j) => j.id === id)
    try {
      await api.retryJob(id, token)
      setJobs((prev) => prev.map((j) =>
        j.id === id
          ? { ...j, status: 'pending', progress: 20, errorMessage: undefined, retryCount: (j.retryCount ?? 0) + 1 }
          : j
      ))
      addToast(`Job "${job?.title ?? id.slice(0, 8)}" re-queued`, 'info')
    } catch (err) {
      if (isAuthError(err)) { forceReauth(); return }
      addToast(err instanceof Error ? err.message : 'Retry failed', 'error')
    }
  }

  // ── Batch create ───────────────────────────────────────────────────────────

  const handleBatchCreate = async (items: { jobType: JobData['jobType']; inputText: string }[]) => {
    const token = session.getAccessToken()
    if (!token) { router.push('/'); return }
    setBatchLoading(true)
    try {
      const res = await api.createBatch(
        { jobs: items.map((i) => ({ jobType: i.jobType, inputText: i.inputText })) },
        token
      )
      const newJobs: Job[] = res.jobs.map((created, idx) => ({
        id: created.jobId,
        title: `Batch #${idx + 1} — ${items[idx].jobType}`,
        description: items[idx].inputText.slice(0, 80),
        jobType: items[idx].jobType,
        priority: 'medium',
        estimatedTime: 1,
        status: statusToUi(created.status),
        createdAt: new Date().toISOString(),
        progress: progressByStatus(statusToUi(created.status)),
      }))
      setJobs((prev) => [...newJobs, ...prev])
      setShowBatch(false)
      addToast(`Batch of ${res.total} jobs created`, 'success')
      loadQuota()
    } catch (err) {
      if (isAuthError(err)) { forceReauth(); return }
      addToast(err instanceof Error ? err.message : 'Batch failed', 'error')
    } finally {
      setBatchLoading(false)
    }
  }

  // ── Delete job ─────────────────────────────────────────────────────────────

  const handleDeleteJob = async (id: string) => {
    const token = session.getAccessToken()
    const job = jobs.find((j) => j.id === id)
    // Optimistic remove
    setJobs((prev) => prev.filter((j) => j.id !== id))
    if (selectedJob?.id === id) setSelectedJob(null)
    if (token) {
      try {
        await api.deleteJob(id, token)
        addToast(`Job "${job?.title ?? id.slice(0, 8)}" deleted`, 'info')
      } catch {
        // Already removed from UI — no need to revert for a delete
      }
    }
  }

  const handleUpdateStatus = (id: string, status: JobStatus) => {
    setJobs((prev) =>
      prev.map((job) => (job.id === id ? { ...job, status, progress: progressByStatus(status) } : job))
    )
  }

  const handleLogout = () => {
    session.clearAuth()
    router.push('/')
  }

  // ── Filtered jobs ──────────────────────────────────────────────────────────

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchStatus = filterStatus === 'all' || job.status === filterStatus
      const matchType   = filterType === 'all' || job.jobType === filterType
      const matchSearch = searchQuery === '' ||
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.description.toLowerCase().includes(searchQuery.toLowerCase())
      return matchStatus && matchType && matchSearch
    })
  }, [jobs, filterStatus, filterType, searchQuery])

  // ── Chart data ─────────────────────────────────────────────────────────────

  const chartData = useMemo(() => [{
    name: 'Jobs',
    completed: jobs.filter((j) => j.status === 'completed').length,
    pending:   jobs.filter((j) => j.status === 'pending').length,
    failed:    jobs.filter((j) => j.status === 'failed').length,
  }], [jobs])

  const statusDistribution = useMemo(() => [
    { name: 'Completed',  value: jobs.filter((j) => j.status === 'completed').length,  fill: '#10b981' },
    { name: 'Pending',    value: jobs.filter((j) => j.status === 'pending').length,    fill: '#fbbf24' },
    { name: 'Processing', value: jobs.filter((j) => j.status === 'processing').length, fill: '#3b82f6' },
    { name: 'Failed',     value: jobs.filter((j) => j.status === 'failed').length,     fill: '#ef4444' },
  ], [jobs])

  const stats = useMemo(() => [
    { label: 'Total Jobs',  value: jobs.length,                                              color: 'from-purple-600 to-pink-600' },
    { label: 'Completed',   value: jobs.filter((j) => j.status === 'completed').length,      color: 'from-green-600 to-emerald-600' },
    { label: 'In Progress', value: jobs.filter((j) => j.status === 'processing').length,     color: 'from-blue-600 to-cyan-600' },
    { label: 'Pending',     value: jobs.filter((j) => j.status === 'pending').length,        color: 'from-yellow-600 to-orange-600' },
  ], [jobs])

  const jobTypes = ['all', 'summarize', 'classify', 'translate', 'sentiment', 'keywords', 'qa']
  const statusFilters: FilterStatus[] = ['all', 'pending', 'processing', 'completed', 'failed']

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="min-h-screen bg-slate-950 text-white">

      {/* Toast stack */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} type={t.type} duration={3500} onClose={() => removeToast(t.id)} />
        ))}
      </div>

      {/* Profile Modal */}
      {showProfile && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShowProfile(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Profile & Activity</h2>
              <button onClick={() => setShowProfile(false)} className="rounded-lg p-2 hover:bg-white/10 transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {profile && (
              <div className="space-y-6">
                {/* Profile Info */}
                <div className="rounded-lg border border-white/10 bg-slate-800/60 p-4">
                  <h3 className="text-sm font-semibold text-slate-400 mb-3">Account</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Email</span>
                      <span className="text-white font-mono">{profile.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Jobs</span>
                      <span className="text-white font-semibold">{profile.totalJobs}</span>
                    </div>
                  </div>
                </div>

                {/* Quota */}
                <div className="rounded-lg border border-white/10 bg-slate-800/60 p-4">
                  <h3 className="text-sm font-semibold text-slate-400 mb-3">Rate Limit (Hourly)</h3>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">
                      {profile.quotaUsed} / {profile.quotaLimit} jobs
                    </span>
                    <span className="text-xs text-slate-400">
                      {profile.quotaRemaining} remaining
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full transition-all duration-500 ${
                        profile.quotaRemaining === 0 ? 'bg-red-500' : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
                      }`}
                      style={{ width: `${(profile.quotaUsed / profile.quotaLimit) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Audit Log */}
                <div className="rounded-lg border border-white/10 bg-slate-800/60 p-4">
                  <h3 className="text-sm font-semibold text-slate-400 mb-3">Recent Activity</h3>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {auditLog.length === 0 ? (
                      <p className="text-xs text-slate-500">No activity yet</p>
                    ) : (
                      auditLog.map((entry, i) => (
                        <div key={i} className="text-xs font-mono text-slate-400 py-1 border-b border-white/5 last:border-0">
                          {entry}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {!profile && (
              <div className="py-12 text-center text-slate-400">Loading profile...</div>
            )}
          </div>
        </div>
      )}

      {/* Job Detail Modal */}
      {selectedJob && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setSelectedJob(null)}
        >
          <div
            ref={modalRef}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedJob.title}</h2>
                <p className="text-sm text-slate-400 mt-1">{selectedJob.description}</p>
              </div>
              <button onClick={() => setSelectedJob(null)} className="rounded-lg p-2 hover:bg-white/10 transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 text-xs text-slate-400">
              <div className="rounded-lg bg-slate-800/60 px-3 py-2">
                <span className="block text-slate-500 mb-1">Job ID</span>
                <span className="font-mono text-slate-300">{selectedJob.id}</span>
              </div>
              <div className="rounded-lg bg-slate-800/60 px-3 py-2">
                <span className="block text-slate-500 mb-1">Type</span>
                <span className="text-slate-300 capitalize">{selectedJob.jobType ?? '—'}</span>
              </div>
              <div className="rounded-lg bg-slate-800/60 px-3 py-2">
                <span className="block text-slate-500 mb-1">Status</span>
                <span className="text-slate-300 capitalize">{selectedJob.status}</span>
              </div>
              <div className="rounded-lg bg-slate-800/60 px-3 py-2">
                <span className="block text-slate-500 mb-1">Created</span>
                <span className="text-slate-300">{new Date(selectedJob.createdAt).toLocaleString()}</span>
              </div>
            </div>

            {selectedJob.aiResult && (
              <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-emerald-300">Full AI Result</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(selectedJob.aiResult!); addToast('Copied!', 'success') }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{selectedJob.aiResult}</p>
              </div>
            )}

            {selectedJob.errorMessage && (
              <div className="mt-3 rounded-lg border border-red-500/25 bg-red-500/5 p-4">
                <span className="text-sm font-semibold text-red-300 block mb-2">Error</span>
                <p className="text-sm text-red-200 whitespace-pre-wrap">{selectedJob.errorMessage}</p>
              </div>
            )}

            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => { handleDeleteJob(selectedJob.id); setSelectedJob(null) }}
                className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400 hover:bg-red-500 hover:text-white transition-colors"
              >
                Delete Job
              </button>
              <button
                onClick={() => setSelectedJob(null)}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-white/10 bg-slate-950/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">AI Job Dashboard</h1>
              <p className="text-slate-400 text-sm mt-0.5">OpenAI-backed summarize · classify · translate · sentiment · keywords · Q&A</p>
            </div>
            <div className="flex gap-3 items-center">
              <button
                onClick={() => loadJobs()}
                disabled={refreshing}
                className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
                title="Refresh jobs from server"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => { setShowProfile(true); loadProfile() }}
                className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-slate-300 transition hover:bg-slate-700"
                title="Profile & Audit Log"
              >
                👤
              </button>
              <button
                onClick={() => setShowBatch(true)}
                className="rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-5 py-2.5 font-semibold text-sm text-cyan-200 transition hover:bg-cyan-500/20"
              >
                ⚡ Batch
              </button>
              <button
                onClick={() => setShowForm(!showForm)}
                className="rounded-lg bg-indigo-500 px-5 py-2.5 font-semibold text-sm transition hover:bg-indigo-400"
              >
                {showForm ? 'Close' : '+ New Job'}
              </button>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-red-400/40 bg-red-500/10 px-5 py-2.5 font-semibold text-sm text-red-200 transition hover:bg-red-500/20"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Quota Bar */}
        {quota && (
          <div className="max-w-7xl mx-auto px-6 pb-3">
            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-400">Rate Limit:</span>
              <div className="flex-1 max-w-xs">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full transition-all duration-500 ${
                      quota.used >= quota.limit ? 'bg-red-500' : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
                    }`}
                    style={{ width: `${Math.min(100, (quota.used / quota.limit) * 100)}%` }}
                  />
                </div>
              </div>
              <span className={`font-mono ${quota.used >= quota.limit ? 'text-red-400' : 'text-slate-400'}`}>
                {quota.used} / {quota.limit}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {stats.map((stat) => (
            <div key={stat.label} className={`rounded-xl border border-white/10 bg-gradient-to-br ${stat.color} p-5`}>
              <p className="text-white/70 text-xs font-medium mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Form */}
          <div className="lg:col-span-1">
            {showForm && <JobForm onSubmit={handleCreateJob} loading={loading} />}
          </div>

          {/* Job list */}
          <div className={showForm ? 'lg:col-span-2' : 'lg:col-span-3'}>

            {/* Tabs: Live / History */}
            <div className="flex gap-1 mb-5 rounded-lg border border-white/10 bg-slate-900/60 p-1 w-fit">
              {(['live', 'history'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); if (tab === 'history') loadHistory(0) }}
                  className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                    activeTab === tab ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab === 'live' ? '⚡ Live' : '📋 History'}
                </button>
              ))}
            </div>

            {/* ── HISTORY TAB ── */}
            {activeTab === 'history' && (
              <div>
                {historyLoading ? (
                  <div className="py-16 text-center text-slate-400">Loading history…</div>
                ) : !history || history.jobs.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-slate-900/50 py-16 text-center">
                    <p className="text-slate-400">No job history yet.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-500 mb-4">
                      {history.totalElements} total records · page {history.page + 1} of {history.totalPages}
                    </p>
                    <div className="space-y-3">
                      {history.jobs.map((s) => {
                        const uiJob: Job = {
                          id: s.jobId,
                          title: s.jobId.slice(0, 8),
                          description: '',
                          jobType: s.jobType as Job['jobType'],
                          aiResult: s.result ?? undefined,
                          errorMessage: s.errorMessage ?? undefined,
                          status: statusToUi(s.status),
                          priority: 'medium',
                          estimatedTime: 1,
                          createdAt: s.createdAt ?? new Date().toISOString(),
                          progress: progressByStatus(statusToUi(s.status)),
                          retryCount: s.retryCount,
                          callbackUrl: s.callbackUrl,
                        }
                        return (
                          <div key={s.jobId} onClick={() => setSelectedJob(uiJob)} className="cursor-pointer">
                            <JobStatusCard
                              job={uiJob}
                              onDelete={handleDeleteJob}
                              onUpdate={handleUpdateStatus}
                              onRetry={handleRetryJob}
                            />
                          </div>
                        )
                      })}
                    </div>
                    {/* Pagination */}
                    <div className="flex justify-center gap-2 mt-6">
                      <button
                        disabled={history.page === 0}
                        onClick={() => loadHistory(history.page - 1)}
                        className="rounded-lg border border-white/10 bg-slate-800 px-4 py-2 text-sm text-slate-300 disabled:opacity-40 hover:bg-slate-700"
                      >← Prev</button>
                      <button
                        disabled={history.page + 1 >= history.totalPages}
                        onClick={() => loadHistory(history.page + 1)}
                        className="rounded-lg border border-white/10 bg-slate-800 px-4 py-2 text-sm text-slate-300 disabled:opacity-40 hover:bg-slate-700"
                      >Next →</button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── LIVE TAB ── */}
            {activeTab === 'live' && (<>

            {/* Search + Filters */}
            <div className="mb-5 flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search jobs by title or description…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-slate-400 hover:text-white" />
                  </button>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                {statusFilters.map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                      filterStatus === s
                        ? 'bg-indigo-500 text-white'
                        : 'border border-white/10 bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
                <span className="text-white/20 self-center">|</span>
                {jobTypes.map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                      filterType === t
                        ? 'bg-cyan-500 text-white'
                        : 'border border-white/10 bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">
                Jobs
                <span className="ml-2 text-sm font-normal text-slate-400">
                  {filteredJobs.length} of {jobs.length}
                </span>
              </h2>
            </div>

            <div className="space-y-4">
              {filteredJobs.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-slate-900/50 py-16 text-center">
                  <p className="text-slate-400">
                    {jobs.length === 0 ? 'No jobs yet. Create one to get started!' : 'No jobs match your filters.'}
                  </p>
                </div>
              ) : (
                filteredJobs.map((job) => (
                  <div key={job.id} onClick={() => setSelectedJob(job)} className="cursor-pointer">
                    <JobStatusCard
                      job={job}
                      onDelete={handleDeleteJob}
                      onUpdate={handleUpdateStatus}
                      onRetry={handleRetryJob}
                    />
                  </div>
                ))
              )}
            </div>
            </>)}
          </div>
        </div>

      {/* Batch Job Modal */}
      {showBatch && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShowBatch(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Batch Job Submit</h2>
                <p className="text-sm text-slate-400 mt-1">Submit up to 20 jobs at once</p>
              </div>
              <button onClick={() => setShowBatch(false)} className="rounded-lg p-2 hover:bg-white/10 transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              {batchRows.map((row, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <select
                    value={row.jobType}
                    onChange={(e) => setBatchRows((prev) => prev.map((r, i) => i === idx ? { ...r, jobType: e.target.value as JobData['jobType'] } : r))}
                    className="rounded-lg border border-white/15 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-400 shrink-0"
                  >
                    {['summarize','classify','translate','sentiment','keywords','qa'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <textarea
                    rows={2}
                    placeholder={`Input text for job ${idx + 1}…`}
                    value={row.inputText}
                    onChange={(e) => setBatchRows((prev) => prev.map((r, i) => i === idx ? { ...r, inputText: e.target.value } : r))}
                    className="flex-1 resize-none rounded-lg border border-white/15 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400"
                  />
                  <button
                    onClick={() => setBatchRows((prev) => prev.filter((_, i) => i !== idx))}
                    className="rounded-lg p-2 text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                    title="Remove"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setBatchRows((prev) => [...prev, { jobType: 'summarize', inputText: '' }])}
                disabled={batchRows.length >= 20}
                className="rounded-lg border border-white/10 bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-40"
              >
                + Add Row
              </button>
              <button
                onClick={() => handleBatchCreate(batchRows.filter((r) => r.inputText.trim()))}
                disabled={batchLoading || batchRows.every((r) => !r.inputText.trim())}
                className="flex-1 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {batchLoading ? 'Submitting…' : `Submit ${batchRows.filter((r) => r.inputText.trim()).length} Jobs`}
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Charts */}
        <div className="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6">
            <h3 className="text-lg font-bold mb-6">Queue Summary</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                <XAxis stroke="rgba(255,255,255,0.4)" />
                <YAxis stroke="rgba(255,255,255,0.4)" />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="completed" fill="#10b981" radius={[4,4,0,0]} />
                <Bar dataKey="pending"   fill="#fbbf24" radius={[4,4,0,0]} />
                <Bar dataKey="failed"    fill="#ef4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6">
            <h3 className="text-lg font-bold mb-6">Status Distribution</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={65} outerRadius={105} dataKey="value" paddingAngle={3}>
                  {statusDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
