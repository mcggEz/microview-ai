'use client'

import React from 'react'
import { Microscope } from 'lucide-react'

type CalculationBreakdownProps = {
  isOpen: boolean
  onClose: () => void
  data: {
    lpf: {
      fields: number
      epithelialCells: number[]
      casts: number[]
      squamous: number[]
    }
    hpf: {
      fields: number
      rbc: number[]
      wbc: number[]
      bacteria: number[]
    }
    averages: {
      rbc: number
      wbc: number
      epithelialCells: number
      bacteria: number
      casts: number
    }
  } | null
}

export default function CalculationBreakdown({ isOpen, data }: CalculationBreakdownProps) {
  if (!isOpen || !data) return null

  const MathRow = ({ label, values, avg, unit }: { label: string, values: number[], avg: number, unit: string }) => {
    const sum = values.reduce((a, b) => a + b, 0);
    const count = values.length || 1;
    
    return (
      <div className="flex items-center justify-between py-1 px-1 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-[10px] font-bold text-gray-700 w-20 truncate leading-none">{label}</span>
          <div className="flex flex-wrap gap-1 items-center flex-grow max-w-[140px]">
            {values.map((v, j) => (
              <div key={j} className="min-w-[14px] h-4 px-1 flex items-center justify-center bg-gray-50 border border-gray-100 rounded text-[9px] text-gray-400 font-mono">
                {v}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4 shrink-0 font-mono whitespace-nowrap">
          <span className="text-[9px] text-gray-400">({sum}÷{count})=</span>
          <span className="text-[12px] font-black text-gray-900 flex items-baseline gap-0.5">
            {avg.toFixed(1)}<span className="text-[8px] font-normal text-gray-400">/{unit}</span>
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute top-full left-0 mt-1 w-[400px] bg-white border border-gray-200 shadow-2xl rounded-lg z-[500] animate-in slide-in-from-top-1 duration-200 overflow-hidden">
      <div className="p-2 space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-1.5 px-1">
          <div className="flex items-center gap-1.5 text-gray-500">
            <Microscope className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[10px] font-black tracking-tight uppercase">Calculation Logic</span>
          </div>
          <div className="flex gap-1.5">
            <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-1.5 rounded-sm">{data.hpf.fields} HPF</span>
            <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-1.5 rounded-sm">{data.lpf.fields} LPF</span>
          </div>
        </div>

        {/* HPF */}
        <div>
          <div className="text-[8px] font-black uppercase text-gray-400 tracking-wider pl-1 mb-1">HPF (40x)</div>
          <MathRow label="RBC" values={data.hpf.rbc} avg={data.averages.rbc} unit="HPF" />
          <MathRow label="WBC" values={data.hpf.wbc} avg={data.averages.wbc} unit="HPF" />
          <MathRow label="Bacteria" values={data.hpf.bacteria} avg={data.averages.bacteria} unit="HPF" />
        </div>

        {/* LPF */}
        <div>
          <div className="text-[8px] font-black uppercase text-gray-400 tracking-wider pl-1 mb-1 mt-1">LPF (10x)</div>
          <MathRow label="Epithelial" values={data.lpf.epithelialCells} avg={data.averages.epithelialCells} unit="LPF" />
          <MathRow label="Casts" values={data.lpf.casts} avg={data.averages.casts} unit="LPF" />
        </div>
      </div>
    </div>
  )
}
