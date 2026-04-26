'use client'

import React, { useState, useRef, useEffect } from 'react'
import gsap from 'gsap'
import AnimatedButton from './AnimatedButton'
import AnimatedFormComponent from './AnimatedFormComponent'

interface AuthPageProps {
  onLoginSuccess: () => void
}

const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (contentRef.current) {
      gsap.from(contentRef.current, {
        opacity: 0,
        y: 20,
        duration: 0.6,
        ease: 'power3.out',
      })
    }
  }, [isLogin])

  const handleToggle = () => {
    gsap.to(contentRef.current, {
      opacity: 0,
      y: -20,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => {
        setIsLogin(!isLogin)
        gsap.set(contentRef.current, { opacity: 0, y: 20 })
      },
    })
  }

  const handleSubmit = (data: Record<string, string>) => {
    console.log(isLogin ? 'Login' : 'Register', data)
    gsap.to(contentRef.current, {
      opacity: 0,
      scale: 0.9,
      duration: 0.4,
      ease: 'power2.in',
      onComplete: () => {
        onLoginSuccess()
      },
    })
  }

  return (
    <div ref={contentRef} className="opacity-0 translate-y-5">
      <AnimatedFormComponent
        title={isLogin ? 'Sign In' : 'Create Account'}
        fields={
          isLogin
            ? [
                {
                  id: 'email',
                  type: 'email',
                  label: 'Email',
                  placeholder: 'your@email.com',
                  required: true,
                },
                {
                  id: 'password',
                  type: 'password',
                  label: 'Password',
                  placeholder: '••••••••',
                  required: true,
                },
              ]
            : [
                {
                  id: 'name',
                  type: 'text',
                  label: 'Full Name',
                  placeholder: 'John Doe',
                  required: true,
                },
                {
                  id: 'email',
                  type: 'email',
                  label: 'Email',
                  placeholder: 'your@email.com',
                  required: true,
                },
                {
                  id: 'password',
                  type: 'password',
                  label: 'Password',
                  placeholder: '••••••••',
                  required: true,
                },
                {
                  id: 'confirmPassword',
                  type: 'password',
                  label: 'Confirm Password',
                  placeholder: '••••••••',
                  required: true,
                },
              ]
        }
        onSubmit={handleSubmit}
        submitText={isLogin ? 'Sign In' : 'Create Account'}
      />

      <div className="text-center mt-6">
        <p className="text-muted-foreground text-sm mb-4">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
        </p>
        <AnimatedButton
          variant="outline"
          onClick={handleToggle}
        >
          {isLogin ? 'Create one' : 'Sign in instead'}
        </AnimatedButton>
      </div>
    </div>
  )
}

export default AuthPage
