'use client'

import { useState, useRef, useEffect } from 'react'
import gsap from 'gsap'
import AnimatedButton from '@/components/AnimatedButton'
import Link from 'next/link'
import { api } from '@/lib/api'
import { session } from '@/lib/session'

export default function Home() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [warming, setWarming] = useState(true)
  const contentRef = useRef<HTMLDivElement>(null)

  // Warm up ALL Render services on page load (free tier sleeps after 15min inactivity)
  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://aiq-api-gateway.onrender.com'
    const timeout = { signal: AbortSignal.timeout(60000) }

    // Ping gateway + core service in parallel
    Promise.allSettled([
      fetch(`${API}/actuator/health`, timeout),
      fetch(`${API}/core/actuator/health`, timeout),
    ]).finally(() => setWarming(false))
  }, [])

  useEffect(() => {
    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }
      )
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const authResponse = isLogin
        ? await api.login({ email, password })
        : await api.register({ email, password })

      session.setAuth(email, authResponse.accessToken, authResponse.refreshToken, authResponse.expiresIn)
      window.location.href = '/dashboard'
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden text-white">

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-white">
            AI Task Queue
          </h1>
          <div className="flex gap-4">
            <Link href="/dashboard">
              <AnimatedButton variant="outline" size="sm">
                Dashboard
              </AnimatedButton>
            </Link>
          </div>
        </div>
      </header>

      {/* Login Section */}
      <main className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 relative z-10">
        <div ref={contentRef} className="max-w-md mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-semibold mb-4 text-white">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-slate-300 text-lg">
              {isLogin
                ? 'Sign in to manage AI tasks'
                : 'Register to start submitting AI jobs'}
            </p>
          </div>

          {/* Login Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-2xl border border-white/15 bg-slate-900/60 p-8 shadow-xl backdrop-blur"
          >
            <div>
              <label className="block text-white text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-white/15 bg-slate-900/70 px-4 py-3 text-white placeholder:text-slate-400 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-white/15 bg-slate-900/70 px-4 py-3 text-white placeholder:text-slate-400 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-white text-sm font-medium mb-2">Confirm Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-white/15 bg-slate-900/70 px-4 py-3 text-white placeholder:text-slate-400 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            )}

            {error && <p className="text-sm text-red-300">{error}</p>}

            <AnimatedButton variant="primary" size="lg" className="w-full" type="submit" disabled={warming}>
              {warming ? '⏳ Waking up servers... (30-60s on free tier)' : loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            </AnimatedButton>

            <button
              type="button"
              onClick={() => {
                setError('')
                setIsLogin((prev) => !prev)
              }}
              className="w-full text-sm text-slate-300 transition-colors hover:text-white"
            >
              {isLogin ? "Don't have an account? Register" : 'Already registered? Sign in'}
            </button>
          </form>

          {/* Features List */}
          <div className="mt-12 space-y-3">
            <p className="text-center text-gray-400 mb-6">Features included:</p>
            {[
              { icon: '🤖', title: 'Real OpenAI Jobs', desc: 'Summarize and classify with model inference' },
              { icon: '⚡', title: 'Asynchronous Queue', desc: 'RabbitMQ + worker processing + Redis statuses' },
              { icon: '📈', title: 'Live Dashboard', desc: 'Track job lifecycle in real time' },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="flex items-start gap-4 rounded-lg border border-white/10 bg-slate-900/50 p-4 transition-colors hover:bg-slate-900/80"
              >
                <span className="text-2xl">{feature.icon}</span>
                <div>
                  <h4 className="text-white font-semibold">{feature.title}</h4>
                  <p className="text-gray-400 text-sm">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
