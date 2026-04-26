'use client'

import React, { useRef, useEffect, useState } from 'react'
import gsap from 'gsap'

interface FormField {
  id: string
  type: 'text' | 'email' | 'password'
  label: string
  placeholder: string
  required?: boolean
}

interface AnimatedFormComponentProps {
  fields: FormField[]
  onSubmit: (data: Record<string, string>) => void
  submitText?: string
  title?: string
}

const AnimatedFormComponent: React.FC<AnimatedFormComponentProps> = ({
  fields,
  onSubmit,
  submitText = 'Submit',
  title,
}) => {
  const formRef = useRef<HTMLFormElement>(null)
  const fieldRefs = useRef<Record<string, HTMLDivElement>>({})
  const [formData, setFormData] = useState<Record<string, string>>({})

  useEffect(() => {
    gsap.from(formRef.current, {
      opacity: 0,
      y: 20,
      duration: 0.6,
      ease: 'power3.out',
    })

    Object.values(fieldRefs.current).forEach((field, index) => {
      gsap.from(field, {
        opacity: 0,
        y: 20,
        duration: 0.5,
        delay: 0.1 + index * 0.05,
        ease: 'power3.out',
      })
    })
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.currentTarget
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const button = (e.target as HTMLFormElement).querySelector('button')
    if (button) {
      gsap.to(button, {
        scale: 0.95,
        duration: 0.2,
        ease: 'power2.inOut',
        onComplete: () => {
          gsap.to(button, {
            scale: 1,
            duration: 0.2,
            ease: 'power2.out',
          })
        },
      })
    }
    onSubmit(formData)
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-6 glass p-8 rounded-xl w-full max-w-md mx-auto"
    >
      {title && (
        <h2 className="text-2xl font-bold text-foreground text-center mb-8">
          {title}
        </h2>
      )}

      {fields.map((field) => (
        <div
          key={field.id}
          ref={(el) => {
            if (el) fieldRefs.current[field.id] = el
          }}
          className="relative"
        >
          <input
            type={field.type}
            name={field.id}
            id={field.id}
            required={field.required}
            placeholder={field.placeholder}
            value={formData[field.id] || ''}
            onChange={handleChange}
            className="peer w-full px-4 py-3 bg-transparent border-2 border-muted rounded-lg text-foreground placeholder-transparent transition-colors duration-300 focus:outline-none focus:border-primary"
          />
          <label
            htmlFor={field.id}
            className="absolute left-4 top-3 text-muted-foreground pointer-events-none transition-all duration-300 peer-focus:top-0 peer-focus:text-xs peer-focus:text-primary peer-not-empty:top-0 peer-not-empty:text-xs peer-not-empty:text-muted-foreground"
          >
            {field.label}
          </label>
        </div>
      ))}

      <button
        type="submit"
        className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:shadow-lg shadow-black/20 transition-all duration-300 hover:scale-105 active:scale-95"
      >
        {submitText}
      </button>
    </form>
  )
}

export default AnimatedFormComponent
