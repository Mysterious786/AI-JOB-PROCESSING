'use client'

import React, { useRef, useEffect } from 'react'
import gsap from 'gsap'
import Counter from './Counter'

interface AnimatedStatsCardProps {
  title: string
  value: number
  unit?: string
  change?: number
  icon?: React.ReactNode
  color?: 'primary' | 'secondary' | 'accent'
}

const AnimatedStatsCard: React.FC<AnimatedStatsCardProps> = ({
  title,
  value,
  unit = '',
  change,
  icon,
  color = 'primary',
}) => {
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    const handleMouseEnter = () => {
      gsap.to(card, {
        y: -8,
        boxShadow: '0 20px 40px rgba(139, 92, 246, 0.2)',
        duration: 0.3,
        ease: 'power2.out',
      })
    }

    const handleMouseLeave = () => {
      gsap.to(card, {
        y: 0,
        boxShadow: '0 10px 20px rgba(139, 92, 246, 0.1)',
        duration: 0.3,
        ease: 'power2.out',
      })
    }

    card.addEventListener('mouseenter', handleMouseEnter)
    card.addEventListener('mouseleave', handleMouseLeave)

    // Initial animation
    gsap.from(card, {
      opacity: 0,
      y: 20,
      duration: 0.5,
      ease: 'power3.out',
    })

    return () => {
      card.removeEventListener('mouseenter', handleMouseEnter)
      card.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  const colorClasses = {
    primary: 'from-blue-500/10 to-purple-500/10',
    secondary: 'from-cyan-500/10 to-blue-500/10',
    accent: 'from-pink-500/10 to-purple-500/10',
  }

  return (
    <div
      ref={cardRef}
      className={`glass p-6 rounded-xl bg-gradient-to-br ${colorClasses[color]} cursor-pointer transition-all duration-300`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-muted-foreground text-sm font-medium mb-2">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold text-foreground">
              <Counter from={0} to={value} />
            </div>
            {unit && (
              <span className="text-muted-foreground text-sm">{unit}</span>
            )}
          </div>
          {change !== undefined && (
            <p className={`text-sm mt-2 ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {change >= 0 ? '+' : ''}{change}% from last week
            </p>
          )}
        </div>
        {icon && (
          <div className="text-2xl opacity-60">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

export default AnimatedStatsCard
