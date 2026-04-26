'use client'

import React, { useRef, useEffect } from 'react'
import gsap from 'gsap'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastProps {
  message: string
  type?: ToastType
  duration?: number
  onClose?: () => void
}

const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 3000,
  onClose,
}) => {
  const toastRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const toast = toastRef.current
    if (!toast) return

    // Entrance animation
    gsap.from(toast, {
      opacity: 0,
      x: 400,
      duration: 0.4,
      ease: 'power3.out',
    })

    // Exit animation and callback
    const timeline = gsap.timeline()
    timeline.to(
      toast,
      {
        opacity: 1,
        duration: duration / 1000 - 0.4,
      },
      0
    )
    timeline.to(
      toast,
      {
        opacity: 0,
        x: 400,
        duration: 0.4,
        ease: 'power3.in',
        onComplete: onClose,
      },
      duration / 1000 - 0.4
    )

    return () => {
      timeline.kill()
    }
  }, [duration, onClose])

  const colors = {
    success: 'bg-green-500/20 border-green-500/50 text-green-700',
    error: 'bg-red-500/20 border-red-500/50 text-red-700',
    info: 'bg-blue-500/20 border-blue-500/50 text-blue-700',
    warning: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-700',
  }

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  }

  return (
    <div
      ref={toastRef}
      className={`fixed bottom-6 right-6 px-6 py-4 rounded-lg border backdrop-blur-md flex items-center gap-3 max-w-sm z-50 ${colors[type]}`}
    >
      <span className="text-xl font-bold flex-shrink-0">
        {icons[type]}
      </span>
      <span className="text-sm font-medium">
        {message}
      </span>
    </div>
  )
}

export default Toast
