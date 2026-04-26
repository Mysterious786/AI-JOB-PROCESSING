const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface AuthPayload {
  email: string
  password: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export type JobType = 'summarize' | 'classify' | 'translate' | 'sentiment' | 'keywords' | 'qa'

export interface CreateJobPayload {
  jobType: JobType
  inputText: string
  idempotencyKey?: string
  callbackUrl?: string
}

export interface CreateJobResponse {
  jobId: string
  status: string
}

export interface BatchJobPayload {
  jobs: CreateJobPayload[]
}

export interface BatchJobResponse {
  total: number
  jobs: CreateJobResponse[]
}

export interface JobStatusResponse {
  jobId: string
  status: string
  result?: string
  errorMessage?: string
  createdAt?: string
  updatedAt?: string
  jobType?: string
  retryCount?: number
  callbackUrl?: string
}

export interface JobHistoryResponse {
  page: number
  size: number
  totalElements: number
  totalPages: number
  jobs: JobStatusResponse[]
}

export interface QuotaResponse {
  used: number
  limit: number
  remaining: number
}

export interface ProfileResponse {
  email: string
  totalJobs: number
  quotaUsed: number
  quotaLimit: number
  quotaRemaining: number
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })

  if (!response.ok) {
    const message = await response.text()
    if (response.status === 401 || response.status === 403) {
      throw new ApiError('Session expired. Please sign in again.', response.status)
    }
    throw new ApiError(message || `Request failed with status ${response.status}`, response.status)
  }

  if (response.status === 204) return undefined as T

  return response.json() as Promise<T>
}

export const api = {
  register: (payload: AuthPayload) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: AuthPayload) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  refresh: (refreshToken: string) =>
    request<AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  createJob: (payload: CreateJobPayload, token: string) =>
    request<CreateJobResponse>('/api/jobs', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),

  createBatch: (payload: BatchJobPayload, token: string) =>
    request<BatchJobResponse>('/api/jobs/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),

  retryJob: (jobId: string, token: string) =>
    request<CreateJobResponse>(`/api/jobs/${jobId}/retry`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }),

  listJobs: (token: string) =>
    request<JobStatusResponse[]>('/api/jobs', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }),

  getJobStatus: (jobId: string, token: string) =>
    request<JobStatusResponse>(`/api/jobs/${jobId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }),

  deleteJob: (jobId: string, token: string) =>
    request<void>(`/api/jobs/${jobId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }),

  getHistory: (token: string, page = 0, size = 20, params?: {
    status?: string; jobType?: string; from?: string; to?: string
  }) => {
    const q = new URLSearchParams({ page: String(page), size: String(size) })
    if (params?.status)  q.set('status',  params.status)
    if (params?.jobType) q.set('jobType', params.jobType)
    if (params?.from)    q.set('from',    params.from)
    if (params?.to)      q.set('to',      params.to)
    return request<JobHistoryResponse>(`/api/jobs/history?${q}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  getQuota: (token: string) =>
    request<QuotaResponse>('/api/jobs/quota', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }),

  getProfile: (token: string) =>
    request<ProfileResponse>('/api/user/profile', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }),

  getAuditLog: (token: string) =>
    request<string[]>('/api/user/audit', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }),
}
