'use client'

import React from 'react'
import { X, Calculator, Info } from 'lucide-react'
import { Button } from './ui/button'

type CalculationModalProps = {
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

export default function CalculationModal({ isOpen, onClose, data }: CalculationModalProps) {
  if (!isOpen || !data) return null

  const FieldRow = ({ label, values, avg, unit }: { label: string, values: number[], avg: number, unit: string }) => (
    <div className="border-b border-gray-100 last:border-0 py-3">
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-bold text-gray-800">{label}</span>
        <div className="text-right">
          <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
            Avg: {avg.toFixed(2)} /{unit}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {values.length > 0 ? (
          values.map((v, i) => (
            <div key={i} className="flex flex-col items-center">
              <span className="text-[8px] text-gray-400">F{i+1}</span>
              <div className="w-8 h-7 flex items-center justify-center bg-gray-50 border border-gray-200 rounded text-[10px] font-medium text-gray-700">
                {v}
              </div>
            </div>
          ))
        ) : (
          <span className="text-[10px] text-gray-400 italic">No data recorded</span>
        )}
      </div>
      <div className="mt-2 text-[9px] text-gray-500 pl-1 border-l-2 border-gray-200">
        Calculation: ({values.join(' + ') || '0'}) ÷ {values.length || 1} fields = {avg.toFixed(2)}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <Calculator className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Summary Calculation Logic</h2>
              <p className="text-[10px] text-gray-500">Breakdown of averaged counts across all fields</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {/* HPF Analysis */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                High Power Fields (40x)
              </span>
              <div className="h-px flex-1 bg-gray-100"></div>
              <span className="text-[10px] text-gray-400 font-medium">
                {data.hpf.fields} {data.hpf.fields === 1 ? 'Field' : 'Fields'} Total
              </span>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 space-y-4">
              <FieldRow label="Red Blood Cells" values={data.hpf.rbc} avg={data.averages.rbc} unit="HPF" />
              <FieldRow label="Pus Cells (WBC)" values={data.hpf.wbc} avg={data.averages.wbc} unit="HPF" />
              <FieldRow label="Bacteria" values={data.hpf.bacteria} avg={data.averages.bacteria} unit="HPF" />
            </div>
          </section>

          {/* LPF Analysis */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-green-600 bg-green-50 px-2 py-0.5 rounded">
                Low Power Fields (10x)
              </span>
              <div className="h-px flex-1 bg-gray-100"></div>
              <span className="text-[10px] text-gray-400 font-medium">
                {data.lpf.fields} {data.lpf.fields === 1 ? 'Field' : 'Fields'} Total
              </span>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 space-y-4">
              <FieldRow label="Epithelial Cells" values={data.lpf.epithelialCells} avg={data.averages.epithelialCells} unit="LPF" />
              <FieldRow label="Casts" values={data.lpf.casts} avg={data.averages.casts} unit="LPF" />
            </div>
          </section>

          {/* Info Box */}
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex gap-3">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-[10px] text-amber-800 leading-relaxed">
              <strong>RMT Reporting Rule:</strong> Most labs require averaging at least 10 fields for accurate reporting. 
              The final ranges (e.g., 2-5/HPF) are determined by mapping these calculated averages to the standard clinical ranges defined in the laboratory SOP.
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex justify-end">
          <Button 
            onClick={onClose}
            className="text-xs font-semibold px-6"
          >
            Close Breakdown
          </Button>
        </div>
      </div>
    </div>
  )
}
