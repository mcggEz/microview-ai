'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Microscope, ArrowLeft, Eye, EyeOff } from 'lucide-react'

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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center px-4">
      {/* animated background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl animate-[float_18s_linear_infinite]" />
        <div className="absolute -bottom-24 -right-16 h-96 w-96 rounded-full bg-green-600/20 blur-3xl animate-[float_22s_linear_infinite_reverse]" />
      </div>
      <div className="relative w-full max-w-md bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl border border-white/20 p-6 sm:p-8">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-green-600 rounded-lg flex items-center justify-center">
            <Microscope className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MicroView AI</h1>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Create Account</h2>
        <p className="text-sm text-gray-700 mb-6">Sign up for MedTech access to the urinalysis workspace</p>

        {error && (
          <div className="mb-5 rounded-md border border-red-300 bg-red-50 p-3">
            <div className="text-sm font-semibold text-red-800">Signup error</div>
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[13px] font-medium text-gray-900 mb-1.5">Full Name</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              placeholder="Enter your full name"
              autoComplete="name"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-900 mb-1.5">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-900 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 pr-10"
                placeholder="Enter your password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 px-3 text-sm text-gray-600 hover:text-gray-900 focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-900 mb-1.5">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 pr-10"
                placeholder="Confirm your password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute inset-y-0 right-0 px-3 text-sm text-gray-600 hover:text-gray-900 focus:outline-none"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !isFormValid}
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white font-semibold rounded-md shadow hover:shadow-lg hover:-translate-y-0.5 transition disabled:opacity-60"
          >
            {isSubmitting ? 'Creating Account…' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <button
              onClick={() => router.push('/login')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
      {/* keyframes */}
      <style jsx>{`
        @keyframes float { 0% { transform: translateY(10px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(10px); } }
      `}</style>
    </div>
  )
}
