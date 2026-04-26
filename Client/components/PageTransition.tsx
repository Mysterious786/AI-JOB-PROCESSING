'use client'

import React, { useRef, useEffect } from 'react'
import gsap from 'gsap'

interface PageTransitionProps {
  children: React.ReactNode
  trigger?: string
}

const PageTransition: React.FC<PageTransitionProps> = ({ children, trigger }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Entrance animation
    gsap.from(containerRef.current, {
      opacity: 0,
      y: 30,
      duration: 0.6,
      ease: 'power3.out',
    })

    return () => {
      // Optional exit animation setup
    }
  }, [trigger])

  return (
    <div
      ref={containerRef}
      className="w-full"
    >
      {children}
    </div>
  )
}

export default PageTransition
