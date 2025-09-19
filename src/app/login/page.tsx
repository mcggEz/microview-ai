'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Microscope, TestTube, ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      if (!email || !password) {
        throw new Error('Please enter your email and password')
      }
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Login failed')
      }
      const redirect = new URLSearchParams(window.location.search).get('redirect') || '/report'
      router.push(redirect)
    } catch (err: any) {
      setError(err?.message || 'Login failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const continueAsDemo = () => {
    router.push('/report')
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl border border-gray-200 p-8">
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

        <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign in</h2>
        <p className="text-sm text-gray-700 mb-6">MedTech access to the urinalysis workspace</p>

        {error && (
          <div className="mb-5 rounded-md border border-red-300 bg-red-50 p-3">
            <div className="text-sm font-semibold text-red-800">Sign in error</div>
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[13px] font-medium text-gray-900 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 pr-10"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 px-3 text-sm text-gray-600 hover:text-gray-900 focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white font-semibold rounded-md shadow-sm hover:from-blue-700 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="flex items-center my-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="px-3 text-xs text-gray-600 uppercase tracking-wider">Or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <button
          onClick={continueAsDemo}
          className="w-full px-4 py-3 border border-gray-300 text-gray-900 font-semibold rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition"
        >
          <TestTube className="w-4 h-4 inline mr-2" />
          Continue as Demo
        </button>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <button
              onClick={() => router.push('/signup')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}


