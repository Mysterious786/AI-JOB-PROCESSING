'use client'

import React, { useRef, useEffect, useState } from 'react'
import gsap from 'gsap'

interface HoverCardProps {
  children: React.ReactNode
  title: string
  description?: string
  icon?: React.ReactNode
  onClick?: () => void
}

const HoverCard: React.FC<HoverCardProps> = ({
  children,
  title,
  description,
  icon,
  onClick,
}) => {
  const cardRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    const handleMouseEnter = () => {
      setIsHovered(true)
      gsap.to(card, {
        y: -12,
        boxShadow: '0 20px 40px rgba(139, 92, 246, 0.3)',
        duration: 0.3,
        ease: 'power2.out',
      })

      gsap.to(contentRef.current, {
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out',
      })
    }

    const handleMouseLeave = () => {
      setIsHovered(false)
      gsap.to(card, {
        y: 0,
        boxShadow: '0 10px 20px rgba(139, 92, 246, 0.1)',
        duration: 0.3,
        ease: 'power2.out',
      })

      gsap.to(contentRef.current, {
        opacity: 0,
        duration: 0.2,
        ease: 'power2.in',
      })
    }

    card.addEventListener('mouseenter', handleMouseEnter)
    card.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      card.removeEventListener('mouseenter', handleMouseEnter)
      card.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      className="glass p-6 rounded-xl cursor-pointer transition-all duration-300 relative overflow-hidden group"
    >
      <div className="flex items-start gap-4 mb-3">
        {icon && (
          <div className="text-3xl flex-shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h3 className="font-semibold text-foreground text-lg">
            {title}
          </h3>
        </div>
      </div>

      <div className="text-muted-foreground text-sm">
        {description}
      </div>

      {/* Animated content on hover */}
      <div
        ref={contentRef}
        className="mt-4 opacity-0 transition-all duration-300"
      >
        {children}
      </div>

      {/* Animated border on hover */}
      <div className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-10"
          style={{
            animation: isHovered ? 'shimmer 2s infinite' : 'none',
          }}
        />
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}

export default HoverCard
