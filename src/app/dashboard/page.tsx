'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { Calendar, ChevronLeft, ChevronRight, TestTube, RefreshCw, ChevronDown } from 'lucide-react'
import { getTestsInRange } from '@/lib/api'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const router = useRouter()
  const [current, setCurrent] = useState(new Date())
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMonthDropdown, setShowMonthDropdown] = useState(false)

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

  // Close month dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMonthDropdown && !(event.target as Element).closest('.month-dropdown')) {
        setShowMonthDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMonthDropdown])

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
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900 flex items-center">
            <Calendar className="h-5 w-5 mr-2" /> Management Dashboard
          </h1>
                     <div className="flex items-center space-x-2">
                       <button onClick={goPrev} className="p-1.5 rounded hover:bg-gray-100 border border-gray-200"><ChevronLeft className="h-4 w-4 text-gray-700" /></button>
                       
                       {/* Month Navigation Dropdown */}
                       <div className="relative month-dropdown">
                         <button
                           onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                           className="flex items-center space-x-1.5 px-2.5 py-1.5 text-gray-600 hover:text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-xs"
                         >
                           <Calendar className="h-3 w-3" />
                           <span className="font-medium">{current.toLocaleString('default', { month: 'long' })} {current.getFullYear()}</span>
                           <ChevronDown className={`h-3 w-3 text-black transition-transform ${showMonthDropdown ? 'rotate-180' : ''}`} />
                         </button>
                         
                         {showMonthDropdown && (
                           <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                             {/* Year Selection */}
                             <div className="border-b border-gray-200">
                               <div className="px-3 py-1.5 bg-gray-50">
                                 <div className="flex items-center justify-between">
                                   <span className="text-xs font-medium text-gray-700">Year</span>
                                   <div className="flex items-center space-x-1">
                                     <button
                                       onClick={() => setCurrent(new Date(current.getFullYear() - 1, current.getMonth(), 1))}
                                       className="p-1 hover:bg-gray-200 rounded"
                                     >
                                       <ChevronLeft className="h-3 w-3 text-black" />
                                     </button>
                                     <span className="text-xs font-semibold text-gray-900">{current.getFullYear()}</span>
                                     <button
                                       onClick={() => setCurrent(new Date(current.getFullYear() + 1, current.getMonth(), 1))}
                                       className="p-1 hover:bg-gray-200 rounded"
                                     >
                                       <ChevronRight className="h-3 w-3 text-black" />
                                     </button>
                                   </div>
                                 </div>
                               </div>
                             </div>
                             
                             {/* Month Selection */}
                             <div className="py-1.5">
                               <div className="px-3 py-1 text-xs font-medium text-gray-700">Month</div>
                               {Array.from({ length: 12 }, (_, i) => {
                                 const month = new Date(current.getFullYear(), i, 1).toLocaleString('default', { month: 'long' })
                                 const isCurrentMonth = i === current.getMonth()
                                 return (
                                   <button
                                     key={i}
                                     onClick={() => {
                                       setCurrent(new Date(current.getFullYear(), i, 1))
                                       setShowMonthDropdown(false)
                                     }}
                                     className={`w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100 transition-colors ${
                                       isCurrentMonth ? 'bg-blue-50 text-blue-700 font-medium' : ''
                                     }`}
                                   >
                                     {month}
                                   </button>
                                 )
                               })}
                             </div>
                           </div>
                         )}
                       </div>
                       
                       <button onClick={goNext} className="p-1.5 rounded hover:bg-gray-100 border border-gray-200"><ChevronRight className="h-4 w-4 text-gray-700" /></button>
             <button 
               onClick={loadCounts} 
               className="p-1.5 rounded hover:bg-gray-100 border border-gray-200"
               title="Refresh test counts"
             >
               <RefreshCw className={`h-4 w-4 text-gray-700 ${loading ? 'animate-spin' : ''}`} />
             </button>
           </div>
        </div>
      </div>

             <div className="max-w-6xl mx-auto p-3 flex-1 overflow-y-auto">
         {error && <div className="text-red-600 mb-2 text-xs">{error}</div>}
         
         <div className="grid grid-cols-7 gap-3">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="text-sm font-semibold text-gray-600 text-center py-2">{d}</div>
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
                className={`h-24 min-w-[120px] border rounded-lg flex flex-col items-center justify-center transition-all duration-200 ${
                  isEmpty 
                    ? 'opacity-0 cursor-default' 
                    : count > 0 
                      ? 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300 shadow-sm' 
                      : 'bg-white hover:bg-gray-50 border-gray-200'
                }`}
              >
                {!isEmpty && (
                  <>
                    <div className={`text-base font-semibold ${count > 0 ? 'text-blue-700' : 'text-gray-900'} flex items-center space-x-1`}>
                      <span>{date.getDate()}</span>
                      {count > 0 && <TestTube className="h-3 w-3 text-blue-600" />}
                    </div>
                    <div className={`text-sm mt-1 px-2 py-1 rounded-full font-medium ${
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


