'use client'

import React, { useRef, useEffect, useState } from 'react'
import gsap from 'gsap'

interface AnimatedModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

const AnimatedModal: React.FC<AnimatedModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      // Show modal
      gsap.to(overlayRef.current, {
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out',
      })

      gsap.to(modalRef.current, {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.4,
        ease: 'back.out(1.2)',
      })
    } else {
      // Hide modal
      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.2,
        ease: 'power2.in',
      })

      gsap.to(modalRef.current, {
        opacity: 0,
        scale: 0.9,
        y: 20,
        duration: 0.3,
        ease: 'power2.in',
      })
    }
  }, [isOpen])

  if (!isOpen && !overlayRef.current?.style.opacity) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center opacity-0"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="glass rounded-xl shadow-2xl max-w-md w-full mx-4 opacity-0 scale-90 translate-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors text-2xl leading-none"
            >
              ×
            </button>
          </div>

          <div className="text-foreground">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnimatedModal
