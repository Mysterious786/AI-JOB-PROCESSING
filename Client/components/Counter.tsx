'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'

interface CounterProps {
  from: number
  to: number
  duration?: number
  decimals?: number
}

const Counter: React.FC<CounterProps> = ({ from, to, duration = 1, decimals = 0 }) => {
  const counterRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const counter = { value: from }

    gsap.to(counter, {
      value: to,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        if (counterRef.current) {
          counterRef.current.textContent = counter.value.toFixed(decimals)
        }
      },
    })
  }, [from, to, duration, decimals])

  return <span ref={counterRef}>{from.toFixed(decimals)}</span>
}

export default Counter
