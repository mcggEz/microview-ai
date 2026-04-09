'use client'

import { useEffect, useMemo, useState, useRef, useCallback, Fragment } from 'react'
import { Calendar, ChevronLeft, ChevronRight, ArrowLeft, BarChart3, FileDown, Table, Image as ImageIcon, Plus, X as XIcon } from 'lucide-react'
import { Document, Packer, Paragraph, TextRun, TableRow as DocTableRow, TableCell, WidthType, AlignmentType, BorderStyle, HeadingLevel, Table as DocTable } from 'docx'
import { saveAs } from 'file-saver'

import { useRouter } from 'next/navigation'
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

interface Detection {
  imageUrl: string
  x: number
  y: number
  width: number
  height: number
  class: string
  confidence: number
}

interface SampleRow {
  id: string
  index: number
  testCode: string
  patientName: string
  patientId: string
  analysisDate: string
  status: string
  technician: string | null
  ai: {
    avgRbc: number | null
    avgWbc: number | null
    avgEpithelial: number | null
    avgCasts: number | null
    hpfFieldsAnalyzed: number
    lpfFieldsAnalyzed: number
    avgConfidence: number | null
  }
  detections: Detection[]
  // Editable RMT fields (local state)
  rmt1Wbc: string
  rmt1Rbc: string
  rmt2Wbc: string
  rmt2Rbc: string
  agreementWbc: string
  agreementRbc: string
}

type TemplateView = 'table' | 'sediment'

export default function Management() {
  const router = useRouter()
  const [current, setCurrent] = useState(new Date())
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [templateView, setTemplateView] = useState<TemplateView>('table')

  // Comparison table data (from API) — single source of truth
  const [samples, setSamples] = useState<SampleRow[]>([])
  const [samplesLoading, setSamplesLoading] = useState(false)
  const [croppedImages, setCroppedImages] = useState<Record<string, string[]>>({}) // sampleId -> base64[]
  const [croppingInProgress, setCroppingInProgress] = useState(false)
  // Validation state per detection: key = "sampleId-detIndex", value = "valid" | "invalid" | ""
  const [detectionValidation, setDetectionValidation] = useState<Record<string, string>>({})
  // Dynamic RMT columns: each has an editable name
  const [rmtColumns, setRmtColumns] = useState<{ id: string; name: string }[]>([
    { id: 'rmt1', name: 'RMT 1' },
    { id: 'rmt2', name: 'RMT 2' },
  ])
  const addRmtColumn = () => {
    const nextNum = rmtColumns.length + 1
    setRmtColumns(prev => [...prev, { id: `rmt${nextNum}`, name: `RMT ${nextNum}` }])
  }
  const updateRmtName = (id: string, name: string) => {
    setRmtColumns(prev => prev.map(r => r.id === id ? { ...r, name } : r))
  }
  const removeRmtColumn = (id: string) => {
    if (rmtColumns.length <= 1) return
    setRmtColumns(prev => prev.filter(r => r.id !== id))
  }
  const tableRef = useRef<HTMLDivElement>(null)

  // Crop a single detection from its source image
  const cropImageFromBoundingBox = useCallback(async (
    imageUrl: string, x: number, y: number, width: number, height: number
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image()
      try { img.crossOrigin = 'anonymous' } catch {}
      const timeout = setTimeout(() => reject(new Error('timeout')), 10000)
      img.onload = () => {
        clearTimeout(timeout)
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) { reject(new Error('no ctx')); return }
          const cropX = Math.max(0, Math.min(x, img.width))
          const cropY = Math.max(0, Math.min(y, img.height))
          const cropW = Math.min(Math.max(1, width), img.width - cropX)
          const cropH = Math.min(Math.max(1, height), img.height - cropY)
          canvas.width = cropW
          canvas.height = cropH
          ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)
          resolve(canvas.toDataURL('image/jpeg', 0.9))
        } catch (e) { reject(e) }
      }
      img.onerror = () => { clearTimeout(timeout); reject(new Error('load failed')) }
      img.src = imageUrl
    })
  }, [])

  // Crop all detections when switching to sediment view
  const cropAllDetections = useCallback(async (sampleList: SampleRow[]) => {
    setCroppingInProgress(true)
    const result: Record<string, string[]> = {}
    for (const sample of sampleList) {
      if (!sample.detections || sample.detections.length === 0) continue
      const crops: string[] = []
      // Limit to 20 detections per sample to avoid overload
      const dets = sample.detections.slice(0, 20)
      for (const det of dets) {
        try {
          const cropped = await cropImageFromBoundingBox(det.imageUrl, det.x, det.y, det.width, det.height)
          crops.push(cropped)
        } catch {
          // skip failed crops
        }
      }
      if (crops.length > 0) result[sample.id] = crops
    }
    setCroppedImages(result)
    setCroppingInProgress(false)
  }, [cropImageFromBoundingBox])

  const firstDayOfMonth = useMemo(() => new Date(current.getFullYear(), current.getMonth(), 1), [current])
  const lastDayOfMonth = useMemo(() => new Date(current.getFullYear(), current.getMonth() + 1, 0), [current])

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
  const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  // Derive calendar counts from samples (no extra API calls)
  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of samples) {
      map[s.analysisDate] = (map[s.analysisDate] || 0) + 1
    }
    return map
  }, [samples])

  // Load comparison data from API — all tests, no date filter
  const loadComparisonData = async () => {
    setSamplesLoading(true)
    try {
      const res = await fetch(`/api/comparison-data`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      const rows: SampleRow[] = (data.samples || []).map((s: any) => ({
        ...s,
        rmt1Wbc: '',
        rmt1Rbc: '',
        rmt2Wbc: '',
        rmt2Rbc: '',
        agreementWbc: '',
        agreementRbc: '',
      }))
      setSamples(rows)
    } catch (err) {
      console.error('Failed to load comparison data:', err)
    } finally {
      setSamplesLoading(false)
    }
  }

  // Load all samples once on mount
  useEffect(() => {
    loadComparisonData()
  }, [])

  const updateSampleById = (sampleId: string, field: keyof SampleRow, value: string) => {
    setSamples(prev => prev.map(s => s.id === sampleId ? { ...s, [field]: value } : s))
  }

  const [showOnlyWithResults, setShowOnlyWithResults] = useState(false)

  // Filter samples: date filter + optionally only those with RBC/WBC results
  const filteredSamples = useMemo(() => {
    let result = samples
    if (selectedDate) {
      result = result.filter(s => s.analysisDate === selectedDate)
    }
    if (showOnlyWithResults) {
      result = result.filter(s => s.ai.avgRbc !== null || s.ai.avgWbc !== null)
    }
    return result
  }, [samples, selectedDate, showOnlyWithResults])

  // Crop detections when switching to sediment view
  useEffect(() => {
    if (templateView === 'sediment' && Object.keys(croppedImages).length === 0 && filteredSamples.some(s => s.detections?.length > 0)) {
      cropAllDetections(filteredSamples)
    }
  }, [templateView, filteredSamples, croppedImages, cropAllDetections])

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

  const onSelectDate = (date: Date) => {
    if (isNaN(date.getTime())) return
    setSelectedDate(toISO(date))
  }

  const onSelectWholeMonth = () => {
    setSelectedDate(null)
  }

  const dailyData = useMemo(() => {
    const days = []
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const date = new Date(current.getFullYear(), current.getMonth(), i)
      const iso = toISO(date)
      days.push({ day: i, date: iso, count: counts[iso] || 0 })
    }
    return days
  }, [counts, current, lastDayOfMonth])

  // All possible sediment types
  const allSedimentTypes = ['RBC', 'WBC', 'Epithelial', 'Crystals', 'Casts', 'Yeast', 'Bacteria']
  const [activeSedimentFilters, setActiveSedimentFilters] = useState<Set<string>>(new Set(['RBC', 'WBC']))
  const toggleSedimentFilter = (type: string) => {
    setActiveSedimentFilters(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }
  const sedimentOptions = [...allSedimentTypes, 'Others']

  // Compute accuracy summary from all remarks dropdowns
  const [accuracySummary, setAccuracySummary] = useState({ totalRemarks: 0, validCount: 0, invalidCount: 0, accuracy: null as string | null })
  useEffect(() => {
    let totalRemarks = 0
    let validCount = 0
    let invalidCount = 0
    for (const sample of filteredSamples) {
      const allDets = sample.detections?.slice(0, 20) || []
      allDets.forEach((det, i) => {
        const typeKey = det.class.toLowerCase().replace(/\s+/g, '')
        const key = `${sample.id}-${typeKey}-${i}`
        const val = detectionValidation[key]
        if (val === 'valid') { totalRemarks++; validCount++ }
        else if (val === 'invalid') { totalRemarks++; invalidCount++ }
      })
    }
    const accuracy = totalRemarks > 0 ? ((validCount / totalRemarks) * 100).toFixed(1) : null
    setAccuracySummary({ totalRemarks, validCount, invalidCount, accuracy })
  }, [filteredSamples, detectionValidation])

  // Download as Word (.docx) — supports both templates
  const handleDownloadWord = async () => {
    const font = 'Times New Roman'
    const sz = 24 // 12pt in half-points
    const szSmall = 20 // 10pt
    const border = { style: BorderStyle.SINGLE, size: 1, color: '000000' }
    const cellBorders = { top: border, bottom: border, left: border, right: border }

    const headerCell = (text: string) =>
      new TableCell({
        borders: cellBorders,
        shading: { fill: '374151' },
        verticalAlign: 'center',
        children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 }, children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: sz, font })] })],
      })

    const cell = (text: string, bold = false) =>
      new TableCell({
        borders: cellBorders,
        verticalAlign: 'center',
        children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 }, children: [new TextRun({ text, bold, size: sz, font })] })],
      })

    const cellSpan = (text: string, rowSpan: number, bold = false) =>
      new TableCell({
        borders: cellBorders,
        rowSpan,
        verticalAlign: 'center',
        children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 }, children: [new TextRun({ text, bold, size: sz, font })] })],
      })

    const sections: any[] = []

    // ── Template 1: Table view ──
    const tableRows: DocTableRow[] = []
    tableRows.push(new DocTableRow({ children: ['Samples', '', ...rmtColumns.map(r => r.name), 'MicroView AI Result', 'Remarks'].map(h => headerCell(h)) }))

    for (const sample of filteredSamples) {
      const label = `Sample ${sample.index}\n${sample.testCode}\n${sample.patientName}`
      tableRows.push(new DocTableRow({
        children: [
          cellSpan(label, 2, true),
          cell('WBC', true),
          ...rmtColumns.map(rmt => cell(detectionValidation[`${sample.id}-table-wbc-${rmt.id}`] || '—')),
          cell(formatAI(sample.ai.avgWbc), true),
          cell(detectionValidation[`${sample.id}-table-wbc-agreement`] || '—'),
        ],
      }))
      tableRows.push(new DocTableRow({
        children: [
          cell('RBC', true),
          ...rmtColumns.map(rmt => cell(detectionValidation[`${sample.id}-table-rbc-${rmt.id}`] || '—')),
          cell(formatAI(sample.ai.avgRbc), true),
          cell(detectionValidation[`${sample.id}-table-rbc-agreement`] || '—'),
        ],
      }))
    }

    const filterLabel = [
      selectedDate ? `Date: ${selectedDate}` : 'All Dates',
      showOnlyWithResults ? 'With Results Only' : 'All Tests',
    ].join('    |    ')

    sections.push({
      properties: { page: { size: { orientation: 'portrait' } } },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: 'MicroView AI', bold: true, size: 32, font })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: 'Sample Comparison Report', size: sz, font })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: 'RMT vs MicroView AI Result Agreement', size: szSmall, font, color: '666666' })] }),
        new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: `Date Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}    |    Samples: ${filteredSamples.length}    |    Filter: ${filterLabel}`, size: szSmall, font, color: '888888' })] }),
        new DocTable({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows }),
        new Paragraph({ spacing: { before: 300 }, children: [new TextRun({ text: 'Generated by MicroView AI. AI results are averages across analyzed HPF fields. RMT values entered manually.', size: szSmall, font, color: 'AAAAAA', italics: true })] }),
      ],
    })

    // ── Template 2: Sediment view ──
    const sedimentRows: DocTableRow[] = []
    sedimentRows.push(new DocTableRow({ children: ['Samples', 'Cropped Sediment', ...rmtColumns.map(r => r.name), 'MicroView AI Result', 'Remarks'].map(h => headerCell(h)) }))

    for (const sample of filteredSamples) {
      const label = `Sample ${sample.index}\n${sample.testCode}\n${sample.patientName}`
      const allDets = sample.detections?.slice(0, 20) || []
      const wbcDets = allDets.filter(d => d.class === 'WBC')
      const rbcDets = allDets.filter(d => d.class === 'RBC')
      const wbcRows = Math.max(wbcDets.length, 1)
      const rbcRows = Math.max(rbcDets.length, 1)
      const totalRows = wbcRows + rbcRows

      // WBC rows
      for (let i = 0; i < wbcRows; i++) {
        const children: TableCell[] = []
        if (i === 0) children.push(cellSpan(label, totalRows, true))
        children.push(cell(wbcDets[i] ? `WBC #${i + 1}` : '—'))
        const valKey = `${sample.id}-wbc-${i}`
        rmtColumns.forEach(rmt => children.push(cell(detectionValidation[`${valKey}-${rmt.id}`] || '—')))
        children.push(cell(wbcDets[i] ? 'WBC' : '—', true))
        const val = detectionValidation[valKey] || '—'
        children.push(cell(val === 'valid' ? 'Valid' : val === 'invalid' ? 'Invalid' : '—'))
        sedimentRows.push(new DocTableRow({ children }))
      }

      // RBC rows
      for (let i = 0; i < rbcRows; i++) {
        const children: TableCell[] = []
        children.push(cell(rbcDets[i] ? `RBC #${i + 1}` : '—'))
        const valKey = `${sample.id}-rbc-${i}`
        rmtColumns.forEach(rmt => children.push(cell(detectionValidation[`${valKey}-${rmt.id}`] || '—')))
        children.push(cell(rbcDets[i] ? 'RBC' : '—', true))
        const val = detectionValidation[valKey] || '—'
        children.push(cell(val === 'valid' ? 'Valid' : val === 'invalid' ? 'Invalid' : '—'))
        sedimentRows.push(new DocTableRow({ children }))
      }
    }

    // Summary row in Word
    const sedColCount = 2 + rmtColumns.length + 2 // samples + cropped + rmts + ai + remarks
    const summaryCells: TableCell[] = []
    summaryCells.push(new TableCell({
      borders: cellBorders, columnSpan: sedColCount - 2, shading: { fill: 'F3F4F6' }, verticalAlign: 'center',
      children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Total Accuracy', bold: true, size: sz, font })] })],
    }))
    summaryCells.push(cell(accuracySummary.accuracy ? `${accuracySummary.accuracy}%` : '—', true))
    summaryCells.push(cell(accuracySummary.totalRemarks > 0 ? `${accuracySummary.validCount} valid, ${accuracySummary.invalidCount} invalid / ${accuracySummary.totalRemarks}` : 'No remarks'))
    sedimentRows.push(new DocTableRow({ children: summaryCells }))

    sections.push({
      properties: { page: { size: { orientation: 'portrait' } } },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: 'MicroView AI', bold: true, size: 32, font })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: 'AI Sediment Detection Remarks Report', size: sz, font })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: 'Remarks on individual sediments detected by MicroView AI (YOLO + Gemini) against RMT manual readings', size: szSmall, font, color: '666666' })] }),
        new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: `Date Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}    |    Samples: ${filteredSamples.length}    |    Filter: ${filterLabel}`, size: szSmall, font, color: '888888' })] }),
        new DocTable({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: sedimentRows }),
        new Paragraph({ spacing: { before: 300 }, children: [new TextRun({ text: 'Each row represents an individual sediment detected by MicroView AI software (YOLOv11 + Gemini 2.5 Pro pipeline). RMT values and remarks were entered manually by licensed medical technologists.', size: szSmall, font, color: 'AAAAAA', italics: true })] }),
      ],
    })

    const doc = new Document({ sections })
    const blob = await Packer.toBlob(doc)
    saveAs(blob, `MicroView_Comparison_${new Date().toISOString().split('T')[0]}.docx`)
  }


  // Format AI value for display
  const formatAI = (val: number | null) => {
    if (val === null) return '—'
    return String(val)
  }

  // Daily Test Bar Chart (Recharts)
  const DailyTestBarChart = ({ data, title }: { data: any[], title: string }) => {
    const chartData = data.map((item) => {
      const date = new Date(current.getFullYear(), current.getMonth(), item.day)
      const isToday = date.getDate() === new Date().getDate() &&
                     date.getMonth() === new Date().getMonth() &&
                     date.getFullYear() === new Date().getFullYear()
      return { day: item.day, tests: item.count, isToday, date: item.date }
    })

    const CustomXAxisTick = (props: any) => {
      const { x, y, payload } = props
      const entry = chartData[payload.index]
      if (!entry) return null
      return (
        <g transform={`translate(${x},${y})`}>
          <text x={0} y={0} dy={18} textAnchor="middle" fill={entry.isToday ? '#1f2937' : '#6b7280'} fontSize={10} fontWeight={entry.isToday ? 'bold' : 'normal'}>
            {entry.day}
          </text>
        </g>
      )
    }

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

    const todayColor = '#1f2937'
    const defaultColor = '#6b7280'

    return (
      <div className="bg-white rounded-md border border-gray-300 p-3 shadow-lg h-full flex flex-col print:hidden">
        <div className="mb-2 flex-shrink-0">
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 15, left: 5, bottom: 35 }} barGap={1}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={<CustomXAxisTick />} interval={0} padding={{ left: 5, right: 5 }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 500 }} width={35} domain={[0, 'dataMax + 1']} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
              <Bar dataKey="tests" radius={[3, 3, 0, 0]} minPointSize={2}
                onClick={(data: any) => {
                  if (data?.activePayload?.[0]) {
                    const entry = data.activePayload[0].payload
                    if (entry?.date) router.push(`/report?date=${entry.date}`)
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.isToday ? todayColor : entry.tests > 0 ? defaultColor : '#e5e7eb'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex-shrink-0 flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: defaultColor }} />
            <span className="text-gray-700">Days with tests</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: todayColor }} />
            <span className="text-gray-700">Today</span>
          </div>
        </div>
      </div>
    )
  }

  const monthLabel = new Date(current.getFullYear(), current.getMonth()).toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <>
      <div className="h-screen bg-gray-50 overflow-hidden flex flex-col print:h-auto print:overflow-visible">
        {/* Header Section */}
        <div className="bg-white border-b border-gray-200 px-3 md:px-4 py-2 md:py-3 flex-shrink-0 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3">
            <div className="flex items-center gap-2 md:gap-4 order-1">
              <Button variant="outline" size="sm" onClick={() => router.push('/report')} className="flex items-center gap-2 hover:bg-gray-50" title="Back to Report">
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <div>
                <h1 className="text-sm md:text-base font-bold text-gray-900 leading-tight">Management</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3 flex-nowrap overflow-x-auto whitespace-nowrap w-full md:w-auto justify-end order-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <label className="text-sm font-medium text-gray-700">Select Period:</label>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    value={current.getMonth()}
                    onChange={(e) => setCurrent(new Date(current.getFullYear(), parseInt(e.target.value), 1))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent appearance-none bg-white pr-8 text-sm"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={i}>
                        {new Date(0, i).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <ChevronLeft className="h-4 w-4 text-gray-400 rotate-90" />
                  </div>
                </div>
                <div className="flex items-center border border-gray-300 rounded-md bg-white overflow-hidden">
                  <button onClick={() => setCurrent(new Date(current.getFullYear() - 1, current.getMonth(), 1))} className="px-3 py-2 hover:bg-gray-100 transition-colors" title="Previous year">
                    <ChevronLeft className="h-4 w-4 text-gray-600" />
                  </button>
                  <div className="px-4 py-2 border-x border-gray-300 bg-gray-50">
                    <span className="text-sm font-semibold text-gray-900">{current.getFullYear()}</span>
                  </div>
                  <button onClick={() => setCurrent(new Date(current.getFullYear() + 1, current.getMonth(), 1))} className="px-3 py-2 hover:bg-gray-100 transition-colors" title="Next year">
                    <ChevronRight className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex gap-3 p-3 print:flex-col print:overflow-visible print:p-0">
          {error && (
            <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-50 rounded-md bg-gray-100 border border-gray-300 p-4 print:hidden">
              <div className="text-gray-900 text-sm font-medium">{error}</div>
            </div>
          )}

          {/* Left Section - Sample Comparison Table */}
          <div ref={tableRef} className="w-[55%] flex-shrink-0 bg-white rounded-md border border-gray-300 shadow-lg p-3 flex flex-col overflow-hidden print:w-full print:shadow-none print:border-0 print:rounded-none print:overflow-visible">
            {/* Print-only header */}
            <div className="hidden print:block mb-4 text-center border-b-2 border-gray-900 pb-3">
              <h1 className="text-xl font-bold text-gray-900">MicroView AI - Sample Comparison Report</h1>
              <p className="text-xs text-gray-500 mt-1">RMT vs MicroView AI Result Agreement | {monthLabel}{selectedDate ? ` | ${selectedDate}` : ''}</p>
            </div>

            <div className="mb-2 flex-shrink-0 flex items-center justify-between print:hidden">
              <div>
                <h2 className="text-base font-bold text-gray-900">Sample Comparison</h2>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  RMT vs MicroView AI Result Agreement
                  {selectedDate && <span className="ml-1 font-semibold text-gray-700">| {selectedDate}</span>}
                  {!selectedDate && <span className="ml-1 font-semibold text-gray-700">| All Tests</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400">
                  {filteredSamples.length} sample{filteredSamples.length !== 1 ? 's' : ''}
                </span>
                {/* With results filter */}
                <button
                  onClick={() => setShowOnlyWithResults(prev => !prev)}
                  className={`px-2 py-1 rounded text-[10px] font-semibold border transition-all ${
                    showOnlyWithResults
                      ? 'bg-gray-700 text-white border-gray-700'
                      : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
                  }`}
                  title="Show only samples with RBC/WBC results"
                >
                  With Results
                </button>
                {/* Template toggle */}
                <div className="flex items-center bg-gray-200 p-0.5 rounded-md border border-gray-300 shadow-sm">
                  <button
                    onClick={() => setTemplateView('table')}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold transition-all ${
                      templateView === 'table'
                        ? 'bg-gray-700 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    title="Table view"
                  >
                    <Table className="h-3 w-3" />
                    Table
                  </button>
                  <button
                    onClick={() => { setTemplateView('sediment'); setCroppedImages({}) }}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold transition-all ${
                      templateView === 'sediment'
                        ? 'bg-gray-700 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    title="Sediment gallery view"
                  >
                    <ImageIcon className="h-3 w-3" />
                    Sediment
                  </button>
                </div>
                <button
                  onClick={addRmtColumn}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-white text-gray-700 text-[10px] font-semibold border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm"
                  title="Add another RMT column"
                >
                  <Plus className="h-3 w-3" />
                  Add RMT
                </button>
                <button
                  onClick={handleDownloadWord}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-gray-700 text-white text-[10px] font-semibold hover:bg-gray-800 transition-colors shadow-sm"
                  title="Download as Word document"
                >
                  <FileDown className="h-3 w-3" />
                  Word
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 print:overflow-visible">
              {samplesLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
                </div>
              ) : filteredSamples.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                  <BarChart3 className="h-8 w-8 mb-2 text-gray-300" />
                  <p className="text-xs">No tests found.</p>
                  <p className="text-[10px] text-gray-300 mt-1">Run AI analysis on tests in the Report page first.</p>
                </div>
              ) : templateView === 'sediment' ? (
                /* ── Sediment View — each detection gets its own row ── */
                <>
                  {croppingInProgress && (
                    <div className="flex items-center justify-center gap-2 py-2 text-xs text-gray-500">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700" />
                      Cropping sediment detections...
                    </div>
                  )}
                  {/* Sediment type filter chips */}
                  <div className="flex flex-wrap gap-1.5 mb-2 print:hidden">
                    <span className="text-[9px] text-gray-400 self-center mr-1">Filter:</span>
                    {allSedimentTypes.map(type => (
                      <button
                        key={type}
                        onClick={() => toggleSedimentFilter(type)}
                        className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border transition-all ${
                          activeSedimentFilters.has(type)
                            ? 'bg-gray-700 text-white border-gray-700'
                            : 'bg-white text-gray-400 border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                    <button
                      onClick={() => setActiveSedimentFilters(new Set(allSedimentTypes))}
                      className="px-2 py-0.5 rounded-full text-[9px] font-semibold border border-gray-300 text-gray-500 hover:bg-gray-100 transition-all"
                    >All</button>
                    <button
                      onClick={() => setActiveSedimentFilters(new Set())}
                      className="px-2 py-0.5 rounded-full text-[9px] font-semibold border border-gray-300 text-gray-500 hover:bg-gray-100 transition-all"
                    >None</button>
                  </div>
                  <table className="w-full border-collapse text-xs border border-gray-300">
                    <thead className="bg-gray-700 sticky top-0 z-10 print:bg-gray-700">
                      <tr>
                        <th className="px-2 py-2.5 text-center text-[10px] font-bold text-white uppercase tracking-tight border border-gray-600">Samples</th>
                        <th className="px-2 py-2.5 text-center text-[10px] font-bold text-white uppercase tracking-tight border border-gray-600">Cropped Sediment</th>
                        {rmtColumns.map(rmt => (
                          <th key={rmt.id} className="px-1 py-1.5 text-center text-[10px] font-bold text-white uppercase tracking-tight border border-gray-600 relative group">
                            <input
                              type="text"
                              value={rmt.name}
                              onChange={(e) => updateRmtName(rmt.id, e.target.value)}
                              className="w-full text-center text-[10px] font-bold text-white bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-white/40 rounded px-1 py-0.5 uppercase tracking-tight placeholder:text-gray-400"
                              placeholder="Name"
                            />
                            {rmtColumns.length > 1 && (
                              <button
                                onClick={() => removeRmtColumn(rmt.id)}
                                className="absolute -top-1 -right-1 hidden group-hover:flex items-center justify-center w-4 h-4 bg-red-500 text-white rounded-full text-[8px] shadow print:hidden"
                                title="Remove column"
                              >
                                <XIcon className="h-2.5 w-2.5" />
                              </button>
                            )}
                          </th>
                        ))}
                        <th className="px-2 py-2.5 text-center text-[10px] font-bold text-white uppercase tracking-tight border border-gray-600">MicroView AI Result</th>
                        <th className="px-2 py-2.5 text-center text-[10px] font-bold text-white uppercase tracking-tight border border-gray-600">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSamples.map((sample, sIdx) => {
                        const sampleCrops = croppedImages[sample.id] || []
                        const allDets = sample.detections?.slice(0, 20) || []
                        // Group detections by class, filtered by active filters
                        const filteredDets = allDets
                          .map((det, i) => ({ det, crop: i < sampleCrops.length ? sampleCrops[i] : null, idx: i }))
                          .filter(item => activeSedimentFilters.has(item.det.class))
                        const totalRows = Math.max(filteredDets.length, 1)
                        const bg = sIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'

                        return (
                          <Fragment key={sample.id}>
                            {filteredDets.length === 0 ? (
                              <tr className={bg}>
                                <td className="px-2 py-2 text-center text-[11px] font-bold text-gray-900 border border-gray-300 align-middle">
                                  <div>Sample {sample.index}</div>
                                  <div className="text-[8px] font-normal text-gray-500 mt-0.5">{sample.testCode}</div>
                                </td>
                                <td className="px-1 py-1 text-center border border-gray-300 text-[9px] text-gray-300 italic">—</td>
                                {rmtColumns.map(rmt => (
                                  <td key={rmt.id} className="px-1 py-1 text-center border border-gray-300 text-[9px] text-gray-300">—</td>
                                ))}
                                <td className="px-1 py-1 text-center border border-gray-300 text-[9px] text-gray-300">—</td>
                                <td className="px-1 py-1 text-center border border-gray-300 text-[9px] text-gray-300">—</td>
                              </tr>
                            ) : (
                              filteredDets.map((item, i) => {
                                const typeKey = item.det.class.toLowerCase().replace(/\s+/g, '')
                                const detKey = `${sample.id}-${typeKey}-${item.idx}`
                                return (
                                  <tr key={detKey} className={bg}>
                                    {i === 0 && (
                                      <td rowSpan={totalRows} className="px-2 py-2 text-center text-[11px] font-bold text-gray-900 border border-gray-300 align-middle">
                                        <div>Sample {sample.index}</div>
                                        <div className="text-[8px] font-normal text-gray-500 mt-0.5">{sample.testCode}</div>
                                        <div className="text-[8px] text-gray-400 truncate max-w-[80px] mx-auto">{sample.patientName}</div>
                                        <div className={`text-[9px] font-semibold mt-1 px-1.5 py-0.5 rounded-full inline-block ${
                                          sample.status === 'reviewed' ? 'bg-emerald-100 text-emerald-700'
                                            : sample.status === 'completed' ? 'bg-blue-100 text-blue-700'
                                            : 'bg-amber-100 text-amber-700'
                                        }`}>{sample.status}</div>
                                      </td>
                                    )}
                                    {/* Cropped sediment */}
                                    <td className="px-1 py-1 text-center border border-gray-300">
                                      {item.crop ? (
                                        <div className="w-12 h-12 mx-auto rounded border border-gray-200 overflow-hidden bg-black">
                                          <img src={item.crop} alt={`${item.det.class} ${i+1}`} className="w-full h-full object-contain" />
                                        </div>
                                      ) : (
                                        <span className="text-[9px] text-gray-300 italic">...</span>
                                      )}
                                    </td>
                                    {/* Dynamic RMT columns */}
                                    {rmtColumns.map(rmt => (
                                      <td key={rmt.id} className="px-1 py-1 text-center border border-gray-300">
                                        <select
                                          value={detectionValidation[`${detKey}-${rmt.id}`] || ''}
                                          onChange={(e) => setDetectionValidation(prev => ({ ...prev, [`${detKey}-${rmt.id}`]: e.target.value }))}
                                          className="w-full text-center text-[10px] text-gray-900 bg-white border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-gray-400 cursor-pointer">
                                          <option value="">—</option>
                                          {sedimentOptions.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                      </td>
                                    ))}
                                    {/* MicroView AI Result — auto from detection class */}
                                    <td className="px-1 py-1 text-center border border-gray-300 font-semibold text-[10px] text-gray-900">
                                      {item.det.class}
                                    </td>
                                    {/* Remarks */}
                                    <td className="px-1 py-1 text-center border border-gray-300">
                                      <select
                                        value={detectionValidation[detKey] || ''}
                                        onChange={(e) => setDetectionValidation(prev => ({ ...prev, [detKey]: e.target.value }))}
                                        className="w-full text-center text-[10px] text-gray-900 bg-white border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-gray-400 cursor-pointer"
                                      >
                                        <option value="">—</option>
                                        <option value="valid">Valid</option>
                                        <option value="invalid">Invalid</option>
                                      </select>
                                    </td>
                                  </tr>
                                )
                              })
                            )}
                          </Fragment>
                        )
                      })}
                      {/* Summary / Accuracy Row */}
                      <tr className="bg-gray-100 border-t-2 border-gray-400">
                        <td colSpan={2 + rmtColumns.length} className="px-3 py-2 text-right text-[10px] font-bold text-gray-700 border border-gray-300">
                          Total Accuracy
                        </td>
                        <td className="px-2 py-2 text-center border border-gray-300">
                          <div className="text-[11px] font-bold text-gray-900">
                            {accuracySummary.accuracy ? `${accuracySummary.accuracy}%` : '—'}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-center border border-gray-300 text-[9px] text-gray-500">
                          {accuracySummary.totalRemarks > 0
                            ? `${accuracySummary.validCount} valid, ${accuracySummary.invalidCount} invalid out of ${accuracySummary.totalRemarks}`
                            : 'No remarks yet'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </>
              ) : (
                <table className="w-full border-collapse text-xs border border-gray-300">
                  <thead className="bg-gray-700 sticky top-0 z-10 print:bg-gray-700">
                    <tr>
                      <th className="px-2 py-2.5 text-center text-[10px] font-bold text-white uppercase tracking-tight border border-gray-600">Samples</th>
                      <th className="px-2 py-2.5 text-center text-[10px] font-bold text-white uppercase tracking-tight border border-gray-600"></th>
                      {rmtColumns.map(rmt => (
                        <th key={rmt.id} className="px-1 py-1.5 text-center text-[10px] font-bold text-white uppercase tracking-tight border border-gray-600 relative group">
                          <input
                            type="text"
                            value={rmt.name}
                            onChange={(e) => updateRmtName(rmt.id, e.target.value)}
                            className="w-full text-center text-[10px] font-bold text-white bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-white/40 rounded px-1 py-0.5 uppercase tracking-tight placeholder:text-gray-400"
                            placeholder="Name"
                          />
                          {rmtColumns.length > 1 && (
                            <button
                              onClick={() => removeRmtColumn(rmt.id)}
                              className="absolute -top-1 -right-1 hidden group-hover:flex items-center justify-center w-4 h-4 bg-red-500 text-white rounded-full text-[8px] shadow print:hidden"
                              title="Remove column"
                            >
                              <XIcon className="h-2.5 w-2.5" />
                            </button>
                          )}
                        </th>
                      ))}
                      <th className="px-2 py-2.5 text-center text-[10px] font-bold text-white uppercase tracking-tight border border-gray-600">MicroView AI Result</th>
                      <th className="px-2 py-2.5 text-center text-[10px] font-bold text-white uppercase tracking-tight border border-gray-600">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSamples.map((sample, sIdx) => (
                      <Fragment key={sample.id}>
                        {/* WBC Row */}
                        <tr className={sIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td rowSpan={2} className="px-2 py-2 text-center text-[11px] font-bold text-gray-900 border border-gray-300 align-middle">
                            <div>Sample {sample.index}</div>
                            <div className="text-[8px] font-normal text-gray-500 mt-0.5">{sample.testCode}</div>
                            <div className="text-[8px] text-gray-400 truncate max-w-[80px] mx-auto">{sample.patientName}</div>
                            <div className={`text-[9px] font-semibold mt-1 px-1.5 py-0.5 rounded-full inline-block ${
                              sample.status === 'reviewed' ? 'bg-emerald-100 text-emerald-700'
                                : sample.status === 'completed' ? 'bg-blue-100 text-blue-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>{sample.status}</div>
                          </td>
                          <td className="px-2 py-2 text-center text-[10px] font-semibold text-gray-700 border border-gray-300 bg-gray-100">WBC</td>
                          {rmtColumns.map(rmt => (
                            <td key={rmt.id} className="px-1 py-1 text-center border border-gray-300">
                              <select
                                value={detectionValidation[`${sample.id}-table-wbc-${rmt.id}`] || ''}
                                onChange={(e) => setDetectionValidation(prev => ({ ...prev, [`${sample.id}-table-wbc-${rmt.id}`]: e.target.value }))}
                                className="w-full text-center text-[10px] text-gray-900 bg-white border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-gray-400 cursor-pointer">
                                <option value="">—</option>
                                {sedimentOptions.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            </td>
                          ))}
                          <td className="px-1 py-1 text-center border border-gray-300">
                            <select
                              value={detectionValidation[`${sample.id}-table-wbc-ai`] || ''}
                              onChange={(e) => setDetectionValidation(prev => ({ ...prev, [`${sample.id}-table-wbc-ai`]: e.target.value }))}
                              className="w-full text-center text-[10px] text-gray-900 bg-white border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-gray-400 cursor-pointer">
                              <option value="">—</option>
                              {sedimentOptions.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </td>
                          <td className="px-1 py-1 text-center border border-gray-300">
                            <input type="text"
                              value={detectionValidation[`${sample.id}-table-wbc-agreement`] || ''}
                              onChange={(e) => setDetectionValidation(prev => ({ ...prev, [`${sample.id}-table-wbc-agreement`]: e.target.value }))}
                              className="w-full text-center text-[10px] text-gray-900 bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-gray-400 rounded px-1 py-0.5 print:border-none print:ring-0" placeholder="—" />
                          </td>
                        </tr>
                        {/* RBC Row */}
                        <tr className={sIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-2 py-2 text-center text-[10px] font-semibold text-gray-700 border border-gray-300 bg-gray-100">RBC</td>
                          {rmtColumns.map(rmt => (
                            <td key={rmt.id} className="px-1 py-1 text-center border border-gray-300">
                              <select
                                value={detectionValidation[`${sample.id}-table-rbc-${rmt.id}`] || ''}
                                onChange={(e) => setDetectionValidation(prev => ({ ...prev, [`${sample.id}-table-rbc-${rmt.id}`]: e.target.value }))}
                                className="w-full text-center text-[10px] text-gray-900 bg-white border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-gray-400 cursor-pointer">
                                <option value="">—</option>
                                {sedimentOptions.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            </td>
                          ))}
                          <td className="px-1 py-1 text-center border border-gray-300">
                            <select
                              value={detectionValidation[`${sample.id}-table-rbc-ai`] || ''}
                              onChange={(e) => setDetectionValidation(prev => ({ ...prev, [`${sample.id}-table-rbc-ai`]: e.target.value }))}
                              className="w-full text-center text-[10px] text-gray-900 bg-white border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-gray-400 cursor-pointer">
                              <option value="">—</option>
                              {sedimentOptions.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </td>
                          <td className="px-1 py-1 text-center border border-gray-300">
                            <input type="text"
                              value={detectionValidation[`${sample.id}-table-rbc-agreement`] || ''}
                              onChange={(e) => setDetectionValidation(prev => ({ ...prev, [`${sample.id}-table-rbc-agreement`]: e.target.value }))}
                              className="w-full text-center text-[10px] text-gray-900 bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-gray-400 rounded px-1 py-0.5 print:border-none print:ring-0" placeholder="—" />
                          </td>
                        </tr>
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Print-only footer */}
            <div className="hidden print:block mt-4 pt-3 border-t border-gray-200 text-center">
              <p className="text-[9px] text-gray-400">
                Generated by MicroView AI | AI results are averages across analyzed HPF fields | RMT values entered manually
              </p>
            </div>
          </div>

          {/* Right Section */}
          <div className="w-[45%] flex-shrink-0 flex flex-col gap-3 overflow-hidden print:hidden">
            {/* Test Calendar */}
            <div className="flex-1 overflow-hidden">
              {samplesLoading ? (
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
                                  isSelected ? 'text-white' : 'text-gray-900'
                                }`}>
                                  {date.getDate()}
                                </div>
                                {count > 0 && (
                                  <div className={`mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                                    isSelected
                                      ? 'bg-white/20 text-white border border-white/30'
                                      : 'bg-gray-700 text-white'
                                  }`}>
                                    {samplesLoading ? '...' : count}
                                  </div>
                                )}
                                {count === 0 && !samplesLoading && (
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

            {/* Daily Test Volume */}
            <div className="flex-1 overflow-hidden">
              {samplesLoading ? (
                <div className="bg-white rounded-md border border-gray-300 shadow-lg p-4 h-full">
                  <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="h-full bg-gray-200 rounded"></div>
                  </div>
                </div>
              ) : (
                <div className="h-full">
                  <DailyTestBarChart data={dailyData} title="Daily Test Volume" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          @page { size: A4 portrait; margin: 0.5in; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          input { border: none !important; outline: none !important; box-shadow: none !important; }
        }
      `}</style>
    </>
  )
}
