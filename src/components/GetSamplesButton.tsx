'use client'

import { useState } from 'react'

const MOTOR_BASE = process.env.NEXT_PUBLIC_MOTOR_API_BASE || 'http://127.0.0.1:3001'

export default function GetSamplesButton({ className = '' }: { className?: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`${MOTOR_BASE}/get_samples`, { method: 'POST' })
      if (!res.ok) throw new Error(`Motor server error ${res.status}`)
    } catch (e: any) {
      setError(e?.message || 'Failed to trigger sampling')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={className}>
      <button
        onClick={handleClick}
        disabled={busy}
        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-green-700 transition-colors disabled:opacity-50"
      >
        {busy ? 'Getting Samples…' : 'Get Samples'}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}


