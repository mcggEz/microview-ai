'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, ArrowLeft, BarChart3, TrendingUp, Activity, Home } from 'lucide-react'
import { getTestsInRange } from '@/lib/api'
import { useRouter } from 'next/navigation'
import type { UrineTest } from '@/types/database'
import { Button } from '@/components/ui/button'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'



export default function Management() {
  const router = useRouter()
  const [current, setCurrent] = useState(new Date())
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [tests, setTests] = useState<UrineTest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null) // null = whole month, string = specific date

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
    const dateISO = toISO(date)
    setSelectedDate(dateISO)
  }

  const onSelectWholeMonth = () => {
    setSelectedDate(null)
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

  // Filter tests based on selected date
  const filteredTests = useMemo(() => {
    if (!selectedDate) return tests // Whole month
    return tests.filter(test => {
      const testDate = test.analysis_date?.split("T")[0] || test.created_at?.split("T")[0]
      return testDate === selectedDate
    })
  }, [tests, selectedDate])

  // Calculate test accuracy data based on filtered tests
  const accuracyData = useMemo(() => {
    // Sample data structure - in real implementation, this would calculate from filteredTests
    // For now, we'll use sample data but could be filtered by date
    const baseData = [
      { type: 'RBCs', aiDetected: 45, verified: 42, accuracy: 93.3, status: 'Good' },
      { type: 'WBCs', aiDetected: 38, verified: 36, accuracy: 94.7, status: 'Good' },
      { type: 'Epithelial Cells', aiDetected: 52, verified: 50, accuracy: 96.2, status: 'Excellent' },
      { type: 'Casts', aiDetected: 28, verified: 26, accuracy: 92.9, status: 'Good' },
      { type: 'Crystals', aiDetected: 35, verified: 33, accuracy: 94.3, status: 'Good' },
      { type: 'Bacteria', aiDetected: 62, verified: 58, accuracy: 93.5, status: 'Good' },
      { type: 'Yeast', aiDetected: 15, verified: 14, accuracy: 93.3, status: 'Good' },
      { type: 'Mucus Threads', aiDetected: 22, verified: 21, accuracy: 95.5, status: 'Excellent' },
    ]
    
    // If a specific date is selected, you could filter/modify the data here
    // For now, return base data
    return baseData
  }, [filteredTests, selectedDate])

  // Enhanced Bar Chart Component for Daily Test Volume using Recharts
  const DailyTestBarChart = ({ data, title }: { data: any[], title: string }) => {
    // Transform data for Recharts with day of week
    const chartData = data.map((item) => {
      const date = new Date(current.getFullYear(), current.getMonth(), item.day)
      const dayOfWeek = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getDay()]
      const isToday = date.getDate() === new Date().getDate() && 
                     date.getMonth() === new Date().getMonth() && 
                     date.getFullYear() === new Date().getFullYear()
      
      return {
        day: item.day,
        dayOfWeek: dayOfWeek,
        tests: item.count,
        isToday: isToday,
        date: item.date,
      }
    })

    const peakEntry = chartData.reduce((prev, current) =>
      prev.tests > current.tests ? prev : current
    )

    // Custom X-axis tick component
    const CustomXAxisTick = (props: any) => {
      const { x, y, payload } = props
      const entry = chartData[payload.index]
      
      if (!entry) return null

      return (
        <g transform={`translate(${x},${y})`}>
          <text
            x={0}
            y={0}
            dy={18}
            textAnchor="middle"
            fill={entry.isToday ? '#1f2937' : '#6b7280'}
            fontSize={10}
            fontWeight={entry.isToday ? 'bold' : 'normal'}
          >
            {entry.day}
          </text>
        </g>
      )
    }

    // Custom tooltip component
    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload
        return (
          <div className="rounded-md border border-gray-300 bg-white p-2 shadow-lg">
            <p className="font-bold text-gray-900 text-xs">{`Day ${label}`}</p>
            <p className="text-xs text-gray-700">{`Tests: ${data.tests}`}</p>
          </div>
        )
      }
      return null
    }

    const todayColor = '#1f2937' // Gray 800
    const defaultColor = '#6b7280' // Gray 500
    
    return (
      <div className="bg-white rounded-md border border-gray-300 p-3 shadow-lg h-full flex flex-col">
        {/* Header */}
        <div className="mb-2 flex-shrink-0">
          <h3 className="text-sm font-bold text-gray-900">
            {title}
          </h3>
        </div>

        {/* Chart Container */}
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 10,
                right: 15,
                left: 5,
                bottom: 35,
              }}
              barGap={1}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={<CustomXAxisTick />}
                interval={0}
                padding={{ left: 5, right: 5 }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 500 }}
                width={35}
                domain={[0, 'dataMax + 1']}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
              <Bar 
                dataKey="tests" 
                radius={[3, 3, 0, 0]}
                minPointSize={2}
                onClick={(data: any) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    const entry = data.activePayload[0].payload
                    if (entry && entry.date) {
                      router.push(`/report?date=${entry.date}`)
                    }
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isToday ? todayColor : entry.tests > 0 ? defaultColor : '#e5e7eb'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Footer with Legend */}
        <div className="mt-2 flex-shrink-0 flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: defaultColor }}
            />
            <span className="text-gray-700">Days with tests</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: todayColor }}
            />
            <span className="text-gray-700">Today</span>
          </div>
        </div>
      </div>
    )
  }

  // Simple Bar Chart Component for other charts
  const SimpleBarChart = ({ data, title, height = 200 }: { data: any[], title: string, height?: number }) => {
    const maxValue = Math.max(...data.map(d => d.count || d.value), 1)
    
    return (
      <div className="bg-white rounded-md border border-gray-300 p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-700">
            <BarChart3 className="h-4 w-4 text-white" />
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
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
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
    <div className="h-screen bg-gray-50 overflow-hidden flex flex-col">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 px-3 md:px-4 py-2 md:py-3 flex-shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3">
          {/* Left side - Back button and title */}
          <div className="flex items-center gap-2 md:gap-4 order-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 hover:bg-gray-50"
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <div>
              <h1 className="text-sm md:text-base font-bold text-gray-900 leading-tight">
                Management
              </h1>
            </div>
          </div>
            
          {/* Right side - Date controls */}
          <div className="flex items-center gap-2 md:gap-3 flex-nowrap overflow-x-auto whitespace-nowrap w-full md:w-auto justify-end order-3">
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
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent appearance-none bg-white pr-8 text-sm"
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
                 <div className="flex items-center border border-gray-300 rounded-md bg-white overflow-hidden">
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

      {/* Main Content - Responsive Layout */}
      <div className="flex-1 overflow-hidden flex gap-3 p-3">
        {error && (
          <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-50 rounded-md bg-gray-100 border border-gray-300 p-4">
            <div className="text-gray-900 text-sm font-medium">{error}</div>
          </div>
        )}
        
        {/* Left Section - Test Accuracy Table */}
        <div className="w-[55%] flex-shrink-0 bg-white rounded-md border border-gray-300 shadow-lg p-3 flex flex-col overflow-hidden">
          <div className="mb-2 flex-shrink-0">
            <h2 className="text-base font-bold text-gray-900">Test Accuracy</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto min-h-0">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-gray-700 border-b-2 border-gray-600 sticky top-0 z-10">
                <tr>
                  <th className="px-2 py-2 text-left text-[10px] font-bold text-white uppercase tracking-tight">
                    Sediment Type
                  </th>
                  <th className="px-2 py-2 text-center text-[10px] font-bold text-white uppercase tracking-tight">
                    AI Detected
                  </th>
                  <th className="px-2 py-2 text-center text-[10px] font-bold text-white uppercase tracking-tight">
                    Verified
                  </th>
                  <th className="px-2 py-2 text-center text-[10px] font-bold text-white uppercase tracking-tight">
                    Accuracy
                  </th>
                  <th className="px-2 py-2 text-center text-[10px] font-bold text-white uppercase tracking-tight">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {accuracyData.map((row, index) => (
                  <tr
                    key={row.type}
                    className={`border-b border-gray-200 transition-colors ${
                      index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <td className="px-2 py-2 font-semibold text-[10px] text-gray-900">
                      {row.type}
                    </td>
                    <td className="px-2 py-2 text-center text-[10px] text-gray-700">
                      {row.aiDetected}
                    </td>
                    <td className="px-2 py-2 text-center text-[10px] text-gray-700">
                      {row.verified}
                    </td>
                    <td className="px-2 py-2 text-center text-[10px] font-semibold text-gray-900">
                      {row.accuracy}%
                    </td>
                    <td className="px-2 py-2 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          row.accuracy >= 95
                            ? 'bg-gray-700 text-white'
                            : row.accuracy >= 90
                            ? 'bg-gray-600 text-white'
                            : 'bg-gray-500 text-white'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
       
        {/* Right Section - Split into two (45% width) */}
        <div className="w-[45%] flex-shrink-0 flex flex-col gap-3 overflow-hidden">
          {/* Top Right - Test Calendar */}
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="bg-white rounded-md border border-gray-300 shadow-lg p-4 h-full">
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-full bg-gray-200 rounded"></div>
                </div>
              </div>
            ) : (
              <div className="h-full bg-white rounded-md border border-gray-300 shadow-lg p-3 flex flex-col overflow-hidden">
                <div className="mb-2 flex-shrink-0 flex items-center justify-between">
                  <h2 className="text-base font-bold text-gray-900">Test Calendar</h2>
                  <button
                    onClick={onSelectWholeMonth}
                    className={`h-6 px-2 rounded-md text-[10px] font-semibold tracking-tight shadow-sm border transition-colors ${
                      !selectedDate
                        ? 'bg-gray-700 text-white border-gray-700 hover:bg-gray-800'
                        : 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300'
                    }`}
                  >
                    Whole Month
                  </button>
                </div>
                
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="grid grid-cols-7 gap-1 border-b border-gray-300 pb-1 flex-shrink-0">
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                      <div key={d} className="text-[9px] font-bold text-gray-700 text-center py-0.5 uppercase tracking-wider">
                        {d}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1 flex-1 auto-rows-fr pt-1">
                    {days.map((date, idx) => {
                      const isEmpty = isNaN(date.getTime())
                      const iso = isEmpty ? '' : toISO(date)
                      const count = iso ? counts[iso] || 0 : 0
                      const isToday = !isEmpty && 
                                     date.getDate() === new Date().getDate() && 
                                     date.getMonth() === new Date().getMonth() && 
                                     date.getFullYear() === new Date().getFullYear()
                      const isSelected = !isEmpty && iso === selectedDate
                      
                      return (
                        <button
                          key={idx}
                          disabled={isEmpty}
                          onClick={() => onSelectDate(date)}
                          className={`border rounded-md flex flex-col items-center justify-center transition-all duration-200 ${
                            isEmpty 
                              ? 'opacity-0 cursor-default border-transparent' 
                              : isSelected
                              ? 'bg-gray-700 text-white border-gray-700 hover:bg-gray-800'
                              : isToday
                              ? 'bg-gray-100 text-gray-900 border-gray-400 hover:bg-gray-200'
                              : `border-gray-200 hover:border-gray-400 hover:bg-gray-50 hover:shadow-sm ${
                                  count > 0 ? 'border-gray-400' : ''
                                }`
                          }`}
                        >
                          {!isEmpty && (
                            <>
                              <div className={`text-sm font-bold leading-none ${
                                isSelected ? 'text-white' : isToday ? 'text-gray-900' : 'text-gray-900'
                              }`}>
                                {date.getDate()}
                              </div>
                              {count > 0 && (
                                <div className={`mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                                  isSelected
                                    ? 'bg-white/20 text-white border border-white/30'
                                    : isToday
                                    ? 'bg-gray-700 text-white'
                                    : 'bg-gray-700 text-white'
                                }`}>
                                  {loading ? '...' : count}
                                </div>
                              )}
                              {count === 0 && !loading && (
                                <div className="mt-1 w-1 h-1 rounded-full bg-gray-300 opacity-50" />
                              )}
                            </>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Bottom Right - Daily Test Volume */}
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="bg-white rounded-md border border-gray-300 shadow-lg p-4 h-full">
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-full bg-gray-200 rounded"></div>
                </div>
              </div>
            ) : (
              <div className="h-full">
                <DailyTestBarChart 
                  data={dailyData} 
                  title="Daily Test Volume" 
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


