'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { session } from '@/lib/session'

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const auth = localStorage.getItem('isAuthenticated')
    const email = localStorage.getItem('userEmail')
    
    if (auth === 'true') {
      setIsAuthenticated(true)
      setUserEmail(email || '')
    } else {
      router.push('/')
    }
    setLoading(false)
  }, [router])

  const logout = () => {
    session.clearAuth()
    setIsAuthenticated(false)
    router.push('/')
  }

  return { isAuthenticated, userEmail, loading, logout }
}
