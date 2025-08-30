'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { Calendar, ChevronLeft, ChevronRight, TestTube, RefreshCw } from 'lucide-react'
import { getTestsInRange } from '@/lib/api'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const router = useRouter()
  const [current, setCurrent] = useState(new Date())
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const firstDayOfMonth = useMemo(() => new Date(current.getFullYear(), current.getMonth(), 1), [current])
  const lastDayOfMonth = useMemo(() => new Date(current.getFullYear(), current.getMonth() + 1, 0), [current])

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
  const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  const loadCounts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const start = toISO(firstDayOfMonth)
      const end = toISO(lastDayOfMonth)
      console.log('Dashboard: Loading counts for date range:', start, 'to', end)
      console.log('Dashboard: Current month/year:', current.getMonth() + 1, current.getFullYear())
      
      const tests = await getTestsInRange(start, end)
      console.log('Dashboard: Tests found:', tests.length, tests)
      
      // Log each test's date to debug
      tests.forEach(test => {
        console.log('Dashboard: Test date:', test.analysis_date, 'Test ID:', test.id, 'Patient ID:', test.patient_id)
      })
      
      const map: Record<string, number> = {}
      for (const t of tests) {
        const date = t.analysis_date
        if (date) {
          map[date] = (map[date] || 0) + 1
          console.log('Dashboard: Adding test for date:', date, 'count:', map[date])
        } else {
          console.warn('Dashboard: Test has no analysis_date:', t)
        }
      }
      
      console.log('Dashboard: Final counts map:', map)
      setCounts(map)
    } catch (err) {
      setError('Failed to load test counts')
      console.error('Dashboard: Error loading counts:', err)
    } finally {
      setLoading(false)
    }
  }, [firstDayOfMonth, lastDayOfMonth, current])

  useEffect(() => {
    loadCounts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current])

  // Auto-refresh every 30 seconds to catch new tests
  useEffect(() => {
    const interval = setInterval(() => {
      loadCounts()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [loadCounts])

  const days: Date[] = useMemo(() => {
    const daysInMonth = lastDayOfMonth.getDate()
    const startWeekday = firstDayOfMonth.getDay()
    const result: Date[] = []
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
            <Calendar className="h-6 w-6 mr-2" /> Management Dashboard
          </h1>
                     <div className="flex items-center space-x-2">
             <button onClick={goPrev} className="p-2 rounded hover:bg-gray-100 border border-gray-200"><ChevronLeft className="h-5 w-5 text-gray-700" /></button>
             <div className="font-semibold text-gray-900">{current.toLocaleString('default', { month: 'long' })} {current.getFullYear()}</div>
             <button onClick={goNext} className="p-2 rounded hover:bg-gray-100 border border-gray-200"><ChevronRight className="h-5 w-5 text-gray-700" /></button>
             <button 
               onClick={loadCounts} 
               className="p-2 rounded hover:bg-gray-100 border border-gray-200"
               title="Refresh test counts"
             >
               <RefreshCw className={`h-5 w-5 text-gray-700 ${loading ? 'animate-spin' : ''}`} />
             </button>
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
                className={`h-24 border rounded-lg flex flex-col items-center justify-center transition-all duration-200 ${
                  isEmpty 
                    ? 'opacity-0 cursor-default' 
                    : count > 0 
                      ? 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300 shadow-sm' 
                      : 'bg-white hover:bg-gray-50 border-gray-200'
                }`}
              >
                {!isEmpty && (
                  <>
                    <div className={`text-sm font-semibold ${count > 0 ? 'text-blue-700' : 'text-gray-900'} flex items-center space-x-1`}>
                      <span>{date.getDate()}</span>
                      {count > 0 && <TestTube className="h-3 w-3 text-blue-600" />}
                    </div>
                    <div className={`text-xs mt-1 px-2 py-1 rounded-full font-medium ${
                      count > 0 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {loading ? '...' : count > 0 ? `${count} test${count > 1 ? 's' : ''}` : '0 tests'}
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


