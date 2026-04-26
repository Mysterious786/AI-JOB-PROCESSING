'use client'

import React, { useRef, useEffect } from 'react'
import gsap from 'gsap'

interface AnimatedButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  type?: 'button' | 'submit' | 'reset'
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const rippleRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const button = buttonRef.current
    if (!button) return

    const handleMouseEnter = () => {
      gsap.to(button, {
        scale: 1.05,
        duration: 0.3,
        ease: 'power2.out',
      })
    }

    const handleMouseLeave = () => {
      gsap.to(button, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out',
      })
    }

    const handleClick = (e: MouseEvent) => {
      const ripple = rippleRef.current
      if (!ripple) return

      const rect = button.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height)
      const x = e.clientX - rect.left - size / 2
      const y = e.clientY - rect.top - size / 2

      gsap.set(ripple, {
        width: size,
        height: size,
        left: x,
        top: y,
        opacity: 0.6,
      })

      gsap.to(ripple, {
        scale: 2,
        opacity: 0,
        duration: 0.6,
        ease: 'power3.out',
      })

      onClick?.()
    }

    button.addEventListener('mouseenter', handleMouseEnter)
    button.addEventListener('mouseleave', handleMouseLeave)
    button.addEventListener('click', handleClick)

    return () => {
      button.removeEventListener('mouseenter', handleMouseEnter)
      button.removeEventListener('mouseleave', handleMouseLeave)
      button.removeEventListener('click', handleClick)
    }
  }, [onClick])

  const variantClasses = {
    primary: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg shadow-purple-500/20',
    secondary: 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:shadow-lg shadow-purple-400/20',
    outline: 'bg-transparent border-2 border-purple-400 text-purple-400 hover:bg-purple-400/10',
  }

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  }

  return (
    <button
      ref={buttonRef}
      type={type}
      onClick={onClick}
      className={`relative overflow-hidden rounded-lg font-semibold transition-all duration-300 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {/* Ripple effect */}
      <span
        ref={rippleRef}
        className="absolute rounded-full bg-white/20 pointer-events-none"
        style={{
          transform: 'scale(0)',
        }}
      />

      {/* Button content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  )
}

export default AnimatedButton
