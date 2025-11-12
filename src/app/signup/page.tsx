"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Microscope, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError(null) // Clear error when user starts typing
  }

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.confirmPassword || !formData.fullName) {
      return 'All fields are required'
    }
    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match'
    }
    if (formData.password.length < 6) {
      return 'Password must be at least 6 characters'
    }
    if (!formData.email.includes('@')) {
      return 'Please enter a valid email address'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Signup failed')
      }
      router.push('/login?message=Account created successfully')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Signup failed'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = formData.email && formData.password && formData.confirmPassword && formData.fullName && formData.password === formData.confirmPassword

  return (
    <div className="h-screen w-screen bg-[#f5f5f5] text-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md h-[calc(100vh-2rem)] rounded-2xl overflow-hidden border border-gray-200 shadow-xl bg-white">
        <div className="h-full w-full p-5 sm:p-7 md:p-8">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
          Back
        </button>

        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white shadow-sm">
              <Microscope className="h-4 w-4" />
            </div>
            <div className="text-left">
              <h1 className="text-xl font-semibold tracking-tight text-black">MicroView AI</h1>
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold">Create Account</h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Sign up to access your urinalysis workspace</p>
        </div>

        {error && (
          <div className="mb-5 rounded-md border border-red-300 bg-red-50 p-3">
            <div className="text-sm font-semibold text-red-800">Signup error</div>
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              className="w-full px-4 py-2.5 sm:py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Enter your full name"
              autoComplete="name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full px-4 py-2.5 sm:py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="w-full pl-4 pr-12 py-2.5 sm:py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="Enter your password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className="w-full pl-4 pr-12 py-2.5 sm:py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="Confirm your password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !isFormValid}
            size="lg"
            className="w-full rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 bg-black hover:bg-gray-900 text-white disabled:opacity-60"
          >
            {isSubmitting ? 'Creating Account…' : 'Create Account'}
          </Button>
        </form>

        
        </div>
      </div>
    </div>
  )
}
