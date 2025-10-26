'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, ArrowLeft, BarChart3, TrendingUp, Activity } from 'lucide-react'
import { getTestsInRange } from '@/lib/api'
import { useRouter } from 'next/navigation'
import type { UrineTest } from '@/types/database'



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

  // Simple Bar Chart Component
  const BarChart = ({ data, title, height = 200 }: { data: any[], title: string, height?: number }) => {
    const maxValue = Math.max(...data.map(d => d.count || d.value))
    
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          {title}
        </h3>
        <div className="flex items-end justify-between gap-1" style={{ height: `${height}px` }}>
          {data.map((item, index) => (
            <div key={index} className="flex flex-col items-center flex-1">
              <div 
                className="w-full rounded-t transition-all duration-300 hover:opacity-80"
                style={{ 
                  height: `${((item.count || item.value) / maxValue) * (height - 40)}px`,
                  backgroundColor: item.color || '#3b82f6'
                }}
                title={`${item.status || item.name || item.day}: ${item.count || item.value}`}
              />
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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/report')}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to Report"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Report
            </button>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Calendar className="h-6 w-6 mr-2" /> Project Management
            </h1>
          </div>
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

        {/* Data Visualizations */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Analytics Dashboard</h2>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-48 bg-gray-200 rounded"></div>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-48 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Test Volume */}
              <BarChart 
                data={dailyData} 
                title="Daily Test Volume" 
                height={250}
              />
              
              {/* Test Status Distribution */}
              <BarChart 
                data={statusData} 
                title="Test Status Distribution" 
                height={250}
              />
            </div>
          )}
          
          {/* AI Analysis Statistics */}
          {aiAnalysisData.length > 0 && (
            <div className="mt-6">
              <BarChart 
                data={aiAnalysisData} 
                title="AI Analysis Statistics (Total Detected Sediments)" 
                height={300}
              />
            </div>
          )}
          
          {/* Summary Stats */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <Activity className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{tests.length}</div>
                  <div className="text-sm text-gray-600">Total Tests</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-green-600" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {Object.values(counts).reduce((sum, count) => sum + count, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Tests This Month</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-orange-600" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {tests.filter(t => t.status === 'completed' || t.status === 'reviewed').length}
                  </div>
                  <div className="text-sm text-gray-600">Completed Tests</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {Math.round((tests.filter(t => t.status === 'completed' || t.status === 'reviewed').length / Math.max(tests.length, 1)) * 100)}%
                  </div>
                  <div className="text-sm text-gray-600">Completion Rate</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


