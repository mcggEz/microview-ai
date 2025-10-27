'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, ArrowLeft, BarChart3, TrendingUp, Activity, Home } from 'lucide-react'
import { getTestsInRange } from '@/lib/api'
import { useRouter } from 'next/navigation'
import type { UrineTest } from '@/types/database'
import { Button } from '@/components/ui/button'



export default function Management() {
  const router = useRouter()
  const [current, setCurrent] = useState(new Date())
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [tests, setTests] = useState<UrineTest[]>([])
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
      const testData = await getTestsInRange(start, end)
      const map: Record<string, number> = {}
      for (const t of testData) {
        map[t.analysis_date] = (map[t.analysis_date] || 0) + 1
      }
      setCounts(map)
      setTests(testData)
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

  // Data processing for visualizations
  const dailyData = useMemo(() => {
    const days = []
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const date = new Date(current.getFullYear(), current.getMonth(), i)
      const iso = toISO(date)
      days.push({
        day: i,
        date: iso,
        count: counts[iso] || 0
      })
    }
    return days
  }, [counts, current, lastDayOfMonth])

  const statusData = useMemo(() => {
    const statusCounts = { pending: 0, in_progress: 0, completed: 0, reviewed: 0 }
    tests.forEach(test => {
      statusCounts[test.status]++
    })
    return Object.entries(statusCounts).map(([status, count]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
      count,
      color: status === 'pending' ? '#ef4444' : 
             status === 'in_progress' ? '#f59e0b' : 
             status === 'completed' ? '#10b981' : '#3b82f6'
    }))
  }, [tests])

  const aiAnalysisData = useMemo(() => {
    const aiFields = [
      'ai_epithelial_cells_count',
      'ai_crystals_normal_count', 
      'ai_bacteria_count',
      'ai_mucus_threads_count',
      'ai_casts_count',
      'ai_rbcs_count',
      'ai_wbcs_count'
    ]
    
    return aiFields.map(field => {
      const total = tests.reduce((sum, test) => {
        const value = test[field as keyof UrineTest] as string
        return sum + (value ? parseInt(value) || 0 : 0)
      }, 0)
      
      return {
        name: field.replace('ai_', '').replace('_count', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: total,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`
      }
    }).filter(item => item.value > 0)
  }, [tests])

  // Enhanced Bar Chart Component for Daily Test Volume
  const DailyTestBarChart = ({ data, title, height = 300 }: { data: any[], title: string, height?: number }) => {
    const maxValue = Math.max(...data.map(d => d.count), 1) // Ensure minimum of 1 to avoid division by zero
    
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">Daily test volume distribution</p>
          </div>
        </div>
        
        {/* Chart Container */}
        <div className="relative" style={{ height: `${height}px` }}>
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between text-xs text-gray-500">
            {[maxValue, Math.ceil(maxValue * 0.75), Math.ceil(maxValue * 0.5), Math.ceil(maxValue * 0.25), 0].map((value, index) => (
              <div key={index} className="text-right pr-1">
                {value}
              </div>
            ))}
          </div>
          
          {/* Chart Area */}
          <div className="ml-10 mr-4 h-full flex items-end justify-between gap-1">
            {data.map((item, index) => {
              const barHeight = (item.count / maxValue) * (height - 60) // Leave space for labels
              const isToday = new Date().getDate() === item.day && 
                             new Date().getMonth() === current.getMonth() && 
                             new Date().getFullYear() === current.getFullYear()
              
              return (
                <div key={index} className="flex flex-col items-center flex-1 group">
                  {/* Bar */}
                  <div 
                    className={`w-full rounded-t-lg transition-all duration-300 hover:opacity-80 cursor-pointer relative ${
                      isToday ? 'ring-2 ring-blue-400 ring-opacity-50' : ''
                    }`}
                    style={{ 
                      height: `${Math.max(barHeight, 2)}px`, // Minimum 2px height for visibility
                      backgroundColor: isToday ? '#3b82f6' : item.count > 0 ? '#10b981' : '#e5e7eb'
                    }}
                    title={`Day ${item.day}: ${item.count} test${item.count !== 1 ? 's' : ''}`}
                    onClick={() => {
                      const date = new Date(current.getFullYear(), current.getMonth(), item.day)
                      router.push(`/report?date=${toISO(date)}`)
                    }}
                  >
                    {/* Hover tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {item.count} test{item.count !== 1 ? 's' : ''}
                    </div>
                    
                    {/* Value label on top of bar */}
                    {item.count > 0 && (
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-gray-700">
                        {item.count}
                      </div>
                    )}
                  </div>
                  
                  {/* Day label */}
                  <div className={`text-xs mt-2 text-center font-medium ${
                    isToday ? 'text-blue-600 font-semibold' : 'text-gray-600'
                  }`}>
                    {item.day}
                  </div>
                  
                  {/* Day of week label */}
                  <div className="text-xs text-gray-400 mt-1">
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(current.getFullYear(), current.getMonth(), item.day).getDay()]}
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Grid lines */}
          <div className="absolute inset-0 ml-10 mr-4 pointer-events-none">
            {[0.25, 0.5, 0.75, 1].map((ratio, index) => (
              <div 
                key={index}
                className="absolute w-full border-t border-gray-100"
                style={{ bottom: `${ratio * (height - 60)}px` }}
              />
            ))}
          </div>
        </div>
        
        {/* Chart Summary */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-600">Days with tests</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm text-gray-600">Today</span>
              </div>
            </div>
            <div className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-full">
              Peak: {maxValue} test{maxValue !== 1 ? 's' : ''} per day
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Simple Bar Chart Component for other charts
  const SimpleBarChart = ({ data, title, height = 200 }: { data: any[], title: string, height?: number }) => {
    const maxValue = Math.max(...data.map(d => d.count || d.value), 1)
    
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">Data visualization</p>
          </div>
        </div>
        <div className="flex items-end justify-between gap-1" style={{ height: `${height}px` }}>
          {data.map((item, index) => (
            <div key={index} className="flex flex-col items-center flex-1 group">
              <div 
                className="w-full rounded-t transition-all duration-300 hover:opacity-80 cursor-pointer relative"
                style={{ 
                  height: `${((item.count || item.value) / maxValue) * (height - 40)}px`,
                  backgroundColor: item.color || '#3b82f6'
                }}
                title={`${item.status || item.name || item.day}: ${item.count || item.value}`}
              >
                {/* Hover tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  {item.status || item.name || item.day}: {item.count || item.value}
                </div>
              </div>
              <div className="text-xs text-gray-600 mt-2 text-center">
                {item.status || item.name || item.day}
              </div>
              <div className="text-xs font-semibold text-gray-900">
                {item.count || item.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Left side - Back button and title */}
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2 hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">
                    Test Analytics
                  </h1>
                  <p className="text-sm text-gray-600">
                    Monitor test volumes and daily trends
                  </p>
                </div>
              </div>
            </div>
            
            {/* Right side - Date controls */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <label className="text-sm font-medium text-gray-700">Select Period:</label>
              </div>
              <div className="flex items-center gap-2">
                {/* Month Selector */}
                <div className="relative">
                  <select
                    value={current.getMonth()}
                    onChange={(e) => {
                      const newMonth = parseInt(e.target.value)
                      setCurrent(new Date(current.getFullYear(), newMonth, 1))
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white pr-8 text-sm"
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const monthName = new Date(0, i).toLocaleString('default', { month: 'long' })
                      return (
                        <option key={i} value={i}>
                          {monthName}
                        </option>
                      )
                    })}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <ChevronLeft className="h-4 w-4 text-gray-400 rotate-90" />
                  </div>
                </div>
                
                 {/* Year Counter */}
                 <div className="flex items-center border border-gray-300 rounded-xl bg-white overflow-hidden">
                   <button
                     onClick={() => {
                       const newYear = current.getFullYear() - 1
                       setCurrent(new Date(newYear, current.getMonth(), 1))
                     }}
                     className="px-3 py-2 hover:bg-gray-100 transition-colors"
                     title="Previous year"
                   >
                     <ChevronLeft className="h-4 w-4 text-gray-600" />
                   </button>
                   
                   <div className="px-4 py-2 border-x border-gray-300 bg-gray-50">
                     <span className="text-sm font-semibold text-gray-900">
                       {current.getFullYear()}
                     </span>
                   </div>
                   
                   <button
                     onClick={() => {
                       const newYear = current.getFullYear() + 1
                       setCurrent(new Date(newYear, current.getMonth(), 1))
                     }}
                     className="px-3 py-2 hover:bg-gray-100 transition-colors"
                     title="Next year"
                   >
                     <ChevronRight className="h-4 w-4 text-gray-600" />
                   </button>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4">
            <div className="text-red-800 text-sm">{error}</div>
          </div>
        )}
        
        {/* Calendar Section */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Test Calendar</h2>
            <p className="text-sm text-gray-600">Click on any date to view detailed reports</p>
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="text-xs font-semibold text-gray-500 text-center py-2">
                {d}
              </div>
            ))}
            {days.map((date, idx) => {
              const isEmpty = isNaN(date.getTime())
              const iso = isEmpty ? '' : toISO(date)
              const count = iso ? counts[iso] || 0 : 0
              const isToday = !isEmpty && 
                             date.getDate() === new Date().getDate() && 
                             date.getMonth() === new Date().getMonth() && 
                             date.getFullYear() === new Date().getFullYear()
              
              return (
                <button
                  key={idx}
                  disabled={isEmpty}
                  onClick={() => onSelectDate(date)}
                  className={`h-20 border rounded-xl bg-white flex flex-col items-center justify-center transition-all duration-200 ${
                    isEmpty 
                      ? 'opacity-0 cursor-default' 
                      : `hover:bg-gray-50 hover:shadow-sm ${
                          isToday ? 'ring-2 ring-blue-400 ring-opacity-50 bg-blue-50' : ''
                        }`
                  }`}
                >
                  {!isEmpty && (
                    <>
                      <div className={`text-sm font-semibold ${
                        isToday ? 'text-blue-600' : 'text-gray-900'
                      }`}>
                        {date.getDate()}
                      </div>
                      <div className={`text-xs mt-1 px-2 py-1 rounded-full ${
                        count > 0 
                          ? 'bg-blue-100 text-blue-700 font-medium' 
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {loading ? '...' : `${count} test${count !== 1 ? 's' : ''}`}
                      </div>
                    </>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Analytics Dashboard */}
        <div className="space-y-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Analytics Dashboard</h2>
              <p className="text-sm text-gray-600">Test volume trends and performance metrics</p>
            </div>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-48 bg-gray-200 rounded"></div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-48 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6">
                {/* Enhanced Daily Test Volume */}
                <DailyTestBarChart 
                  data={dailyData} 
                  title="Daily Test Volume - Number of Tests Per Day" 
                  height={350}
                />
              </div>
            </>
          )}
          
        </div>
      </div>
    </div>
  )
}


