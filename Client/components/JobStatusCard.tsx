'use client'

import React, { useRef, useEffect, useState } from 'react'
import gsap from 'gsap'
import { Trash2, Edit2, CheckCircle, Clock, AlertCircle, Zap, ChevronDown, ChevronUp, Sparkles, Copy } from 'lucide-react'

export interface Job {
  id: string
  title: string
  description: string
  /** The raw AI output returned by the worker */
  aiResult?: string
  /** Error message if the job failed */
  errorMessage?: string
  /** The AI task type */
  jobType?: 'summarize' | 'classify' | 'translate' | 'sentiment' | 'keywords' | 'qa'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  priority: 'low' | 'medium' | 'high'
  estimatedTime: number
  createdAt: string
  progress?: number
  retryCount?: number
  callbackUrl?: string
}

interface JobStatusCardProps {
  job: Job
  onDelete: (id: string) => void
  onUpdate: (id: string, status: Job['status']) => void
  onRetry?: (id: string) => void
  onEdit?: (job: Job) => void
}

const JobStatusCard: React.FC<JobStatusCardProps> = ({ job, onDelete, onUpdate, onRetry, onEdit }) => {
  const cardRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)
  const [resultExpanded, setResultExpanded] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
      )
    }
  }, [])

  // Animate in the AI result box when it first appears
  useEffect(() => {
    if (job.aiResult && resultRef.current) {
      gsap.fromTo(
        resultRef.current,
        { opacity: 0, y: 10, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power2.out' }
      )
    }
  }, [job.aiResult])

  useEffect(() => {
    if (cardRef.current && hovered) {
      gsap.to(cardRef.current, {
        y: -5,
        boxShadow: '0 20px 40px rgba(139, 92, 246, 0.3)',
        duration: 0.3,
        ease: 'power2.out',
      })
    } else if (cardRef.current) {
      gsap.to(cardRef.current, {
        y: 0,
        boxShadow: '0 10px 20px rgba(0, 0, 0, 0.1)',
        duration: 0.3,
        ease: 'power2.out',
      })
    }
  }, [hovered])

  const handleCopy = () => {
    if (job.aiResult) {
      navigator.clipboard.writeText(job.aiResult)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const statusConfig = {
    pending: { color: 'bg-yellow-500', textColor: 'text-yellow-400', borderColor: 'border-yellow-500/30', icon: Clock, label: 'Pending' },
    processing: { color: 'bg-blue-500', textColor: 'text-blue-400', borderColor: 'border-blue-500/30', icon: Zap, label: 'Processing' },
    completed: { color: 'bg-green-500', textColor: 'text-green-400', borderColor: 'border-green-500/30', icon: CheckCircle, label: 'Completed' },
    failed: { color: 'bg-red-500', textColor: 'text-red-400', borderColor: 'border-red-500/30', icon: AlertCircle, label: 'Failed' },
  }

  const priorityConfig = {
    low: 'text-blue-400 bg-blue-500/10 border border-blue-500/20',
    medium: 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20',
    high: 'text-red-400 bg-red-500/10 border border-red-500/20',
  }

  const jobTypeLabel: Record<string, string> = {
    summarize: '✦ Summarize',
    classify:  '⬡ Classify',
    translate: '⟳ Translate',
    sentiment: '◎ Sentiment',
    keywords:  '⌘ Keywords',
    qa:        '? Q&A',
  }

  // Parse classify result: "Label: technical\nReason: ..."
  const parseClassifyResult = (raw: string): { label: string; reason: string } | null => {
    const labelMatch = raw.match(/label:\s*(\w+)/i)
    const reasonMatch = raw.match(/reason:\s*(.+)/i)
    if (labelMatch) {
      return {
        label: labelMatch[1].toLowerCase(),
        reason: reasonMatch ? reasonMatch[1].trim() : '',
      }
    }
    return null
  }

  // Parse translate result: "Language: Spanish\nTranslation: ..."
  const parseTranslateResult = (raw: string): { language: string; translation: string } | null => {
    const langMatch = raw.match(/language:\s*(.+)/i)
    const transMatch = raw.match(/translation:\s*([\s\S]+)/i)
    if (transMatch) {
      return {
        language: langMatch ? langMatch[1].trim() : 'Unknown',
        translation: transMatch[1].trim(),
      }
    }
    return null
  }

  // Parse sentiment result: "Sentiment: Positive\nScore: 0.8\nConfidence: High\nSummary: ..."
  const parseSentimentResult = (raw: string): { sentiment: string; score: string; confidence: string; summary: string } | null => {
    const sentMatch = raw.match(/sentiment:\s*(\w+)/i)
    const scoreMatch = raw.match(/score:\s*([-\d.]+)/i)
    const confMatch = raw.match(/confidence:\s*(\w+)/i)
    const summaryMatch = raw.match(/summary:\s*(.+)/i)
    if (sentMatch) {
      return {
        sentiment: sentMatch[1],
        score: scoreMatch ? scoreMatch[1] : '0',
        confidence: confMatch ? confMatch[1] : 'Medium',
        summary: summaryMatch ? summaryMatch[1].trim() : '',
      }
    }
    return null
  }

  // Parse keywords result: "Keywords: k1, k2, k3\nContext: ..."
  const parseKeywordsResult = (raw: string): { keywords: string[]; context: string } | null => {
    const kwMatch = raw.match(/keywords:\s*(.+)/i)
    const ctxMatch = raw.match(/context:\s*(.+)/i)
    if (kwMatch) {
      return {
        keywords: kwMatch[1].split(',').map((k) => k.trim()).filter(Boolean),
        context: ctxMatch ? ctxMatch[1].trim() : '',
      }
    }
    return null
  }

  const sentimentColors: Record<string, string> = {
    positive: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    negative: 'text-red-400 bg-red-500/10 border-red-500/30',
    neutral:  'text-slate-300 bg-slate-500/10 border-slate-500/30',
    mixed:    'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  }

  const classifyLabelColors: Record<string, string> = {
    technical:  'bg-blue-500/15 border-blue-500/30 text-blue-300',
    support:    'bg-purple-500/15 border-purple-500/30 text-purple-300',
    billing:    'bg-yellow-500/15 border-yellow-500/30 text-yellow-300',
    sales:      'bg-green-500/15 border-green-500/30 text-green-300',
    general:    'bg-slate-500/15 border-slate-500/30 text-slate-300',
  }

  const config = statusConfig[job.status]
  const StatusIcon = config.icon

  return (
    <article
      ref={cardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-xl border border-white/15 bg-slate-900/60 p-5 shadow-md transition-all duration-300"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-3">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-lg font-semibold text-white truncate">{job.title}</h3>
            {job.jobType && (
              <span className="shrink-0 rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-xs font-medium text-indigo-300">
                {jobTypeLabel[job.jobType] ?? job.jobType}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 line-clamp-2">{job.description}</p>
        </div>
        <div className={`shrink-0 rounded-lg p-2 ${config.color}/20 border ${config.borderColor}`}>
          <StatusIcon className={`w-5 h-5 ${config.textColor}`} />
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-semibold ${config.textColor}`}>{config.label}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${priorityConfig[job.priority]}`}>
            {job.priority.charAt(0).toUpperCase() + job.priority.slice(1)}
          </span>
        </div>
        {job.progress !== undefined && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full transition-all duration-700 ${
                job.status === 'failed'
                  ? 'bg-red-500'
                  : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
              }`}
              style={{ width: `${job.progress}%` }}
            />
          </div>
        )}
      </div>

      {/* AI Result — shown when completed */}
      {job.status === 'completed' && job.aiResult && (() => {
        const classified = job.jobType === 'classify' ? parseClassifyResult(job.aiResult) : null
        const translated = job.jobType === 'translate' ? parseTranslateResult(job.aiResult) : null
        const sentiment  = job.jobType === 'sentiment' ? parseSentimentResult(job.aiResult) : null
        const keywords   = job.jobType === 'keywords'  ? parseKeywordsResult(job.aiResult)  : null

        return (
          <div ref={resultRef} className="mb-4 rounded-lg border border-emerald-500/25 bg-emerald-500/5 overflow-hidden">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setResultExpanded((v) => !v)}
              onKeyDown={(e) => e.key === 'Enter' && setResultExpanded((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-emerald-500/10 transition-colors select-none"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-300">AI Result</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); handleCopy() }}
                  className="rounded px-2 py-0.5 text-xs text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                  title="Copy result"
                >
                  {copied ? 'Copied!' : <Copy className="w-3.5 h-3.5" />}
                </button>
                {resultExpanded
                  ? <ChevronUp className="w-4 h-4 text-emerald-400" />
                  : <ChevronDown className="w-4 h-4 text-emerald-400" />}
              </div>
            </div>

            {resultExpanded && (
              <div className="px-4 pb-4 pt-1">

                {/* CLASSIFY */}
                {classified && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Category:</span>
                      <span className={`rounded-full border px-3 py-0.5 text-xs font-semibold capitalize ${classifyLabelColors[classified.label] ?? classifyLabelColors.general}`}>
                        {classified.label}
                      </span>
                    </div>
                    {classified.reason && <p className="text-sm text-slate-300 leading-relaxed">{classified.reason}</p>}
                  </div>
                )}

                {/* TRANSLATE */}
                {translated && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Language:</span>
                      <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-0.5 text-xs font-semibold text-indigo-300">
                        {translated.language}
                      </span>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed">{translated.translation}</p>
                  </div>
                )}

                {/* SENTIMENT */}
                {sentiment && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`rounded-full border px-3 py-0.5 text-xs font-semibold capitalize ${sentimentColors[sentiment.sentiment.toLowerCase()] ?? sentimentColors.neutral}`}>
                        {sentiment.sentiment}
                      </span>
                      <span className="text-xs text-slate-400">Score: <span className="text-white font-mono">{sentiment.score}</span></span>
                      <span className="text-xs text-slate-400">Confidence: <span className="text-white">{sentiment.confidence}</span></span>
                    </div>
                    {/* Score bar */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-400">-1</span>
                      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-500 via-yellow-400 to-emerald-500"
                          style={{ width: `${((parseFloat(sentiment.score) + 1) / 2) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-emerald-400">+1</span>
                    </div>
                    {sentiment.summary && <p className="text-sm text-slate-300 leading-relaxed">{sentiment.summary}</p>}
                  </div>
                )}

                {/* KEYWORDS */}
                {keywords && (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2">
                      {keywords.keywords.map((kw) => (
                        <span key={kw} className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-0.5 text-xs font-medium text-cyan-300">
                          {kw}
                        </span>
                      ))}
                    </div>
                    {keywords.context && <p className="text-sm text-slate-400 leading-relaxed">{keywords.context}</p>}
                  </div>
                )}

                {/* SUMMARIZE or Q&A — plain text / bullet points */}
                {!classified && !translated && !sentiment && !keywords && (
                  <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{job.aiResult}</p>
                )}

              </div>
            )}
          </div>
        )
      })()}

      {/* Processing pulse */}
      {job.status === 'processing' && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
          </span>
          <span className="text-xs text-blue-300">OpenAI is processing your request…</span>
        </div>
      )}

      {/* Error message */}
      {job.status === 'failed' && job.errorMessage && (
        <div className="mb-4 rounded-lg border border-red-500/25 bg-red-500/5 px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-xs font-semibold text-red-300">Error</span>
          </div>
          <p className="text-xs text-red-200 whitespace-pre-wrap">{job.errorMessage}</p>
        </div>
      )}

      {/* Meta + Actions */}
      <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span>Est. {job.estimatedTime}h</span>
          <span className="text-white/20">·</span>
          <span>{new Date(job.createdAt).toLocaleDateString()}</span>
          <span className="text-white/20">·</span>
          <span className="font-mono text-slate-500">{job.id.slice(0, 8)}</span>
          {job.retryCount != null && job.retryCount > 0 && (
            <>
              <span className="text-white/20">·</span>
              <span className="text-orange-400">↺ {job.retryCount} retr{job.retryCount === 1 ? 'y' : 'ies'}</span>
            </>
          )}
        </div>
        <div className="flex gap-2">
          {/* Retry button — only for failed jobs */}
          {job.status === 'failed' && onRetry && (
            <button
              onClick={() => onRetry(job.id)}
              title="Retry this job"
              className="rounded-lg bg-orange-500/15 px-3 py-1.5 text-orange-300 transition-colors hover:bg-orange-500 hover:text-white flex items-center gap-1"
            >
              <span className="text-xs font-medium">↺ Retry</span>
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(job)}
              className="rounded-lg bg-indigo-500/20 px-3 py-1.5 text-indigo-300 transition-colors hover:bg-indigo-500 hover:text-white"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => onDelete(job.id)}
            className="rounded-lg bg-red-500/10 px-3 py-1.5 text-red-400 transition-colors hover:bg-red-500 hover:text-white"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </article>
  )
}

export default JobStatusCard
