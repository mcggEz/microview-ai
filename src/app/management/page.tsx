'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { getTestsInRange } from '@/lib/api'
import { useRouter } from 'next/navigation'

interface DayCount {
  date: string
  count: number
}

export default function Management() {
  const router = useRouter()
  const [current, setCurrent] = useState(new Date())
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const firstDayOfMonth = useMemo(() => new Date(current.getFullYear(), current.getMonth(), 1), [current])
  const lastDayOfMonth = useMemo(() => new Date(current.getFullYear(), current.getMonth() + 1, 0), [current])

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
  const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  const loadCounts = async () => {
    setLoading(true)
    setError(null)
    try {
      const start = toISO(firstDayOfMonth)
      const end = toISO(lastDayOfMonth)
      const tests = await getTestsInRange(start, end)
      const map: Record<string, number> = {}
      for (const t of tests) {
        map[t.analysis_date] = (map[t.analysis_date] || 0) + 1
      }
      setCounts(map)
    } catch (err) {
      setError('Failed to load test counts')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCounts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current])

  const days: Date[] = useMemo(() => {
    const daysInMonth = lastDayOfMonth.getDate()
    const startWeekday = firstDayOfMonth.getDay() // 0-6, Sun-Sat
    const result: Date[] = []
    // fill leading blanks with previous month days (optional); here we just leave empty slots
    for (let i = 0; i < startWeekday; i++) result.push(new Date(NaN))
    for (let day = 1; day <= daysInMonth; day++) {
      result.push(new Date(current.getFullYear(), current.getMonth(), day))
    }
    return result
  }, [current, firstDayOfMonth, lastDayOfMonth])

  const goPrev = () => setCurrent(new Date(current.getFullYear(), current.getMonth() - 1, 1))
  const goNext = () => setCurrent(new Date(current.getFullYear(), current.getMonth() + 1, 1))

  const onSelectDate = (date: Date) => {
    if (isNaN(date.getTime())) return
    router.push(`/report?date=${toISO(date)}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-6 w-6 mr-2" /> Project Management
          </h1>
          <div className="flex items-center space-x-2">
            <button onClick={goPrev} className="p-2 rounded hover:bg-gray-100"><ChevronLeft className="h-5 w-5" /></button>
            <div className="font-semibold text-gray-900">{current.toLocaleString('default', { month: 'long' })} {current.getFullYear()}</div>
            <button onClick={goNext} className="p-2 rounded hover:bg-gray-100"><ChevronRight className="h-5 w-5" /></button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {error && <div className="text-red-600 mb-4">{error}</div>}
        <div className="grid grid-cols-7 gap-2">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="text-xs font-semibold text-gray-600 text-center">{d}</div>
          ))}
          {days.map((date, idx) => {
            const isEmpty = isNaN(date.getTime())
            const iso = isEmpty ? '' : toISO(date)
            const count = iso ? counts[iso] || 0 : 0
            return (
              <button
                key={idx}
                disabled={isEmpty}
                onClick={() => onSelectDate(date)}
                className={`h-24 border rounded-lg bg-white flex flex-col items-center justify-center ${isEmpty ? 'opacity-0 cursor-default' : 'hover:bg-gray-50'}`}
              >
                {!isEmpty && (
                  <>
                    <div className="text-sm font-semibold text-gray-900">{date.getDate()}</div>
                    <div className={`text-xs mt-1 px-2 py-1 rounded-full ${count > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                      {loading ? '...' : `${count} tests`}
                    </div>
                  </>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}


