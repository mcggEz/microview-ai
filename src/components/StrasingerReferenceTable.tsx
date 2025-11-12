'use client'

import { strasingerReferenceTable } from '@/data/strasinger-reference'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

type StrasingerReferenceTableProps = {
  className?: string
  onClose?: () => void
}

export default function StrasingerReferenceTable({
  className,
  onClose
}: StrasingerReferenceTableProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border border-gray-300 shadow-lg bg-white',
        className
      )}
    >
      <table className="w-full border-collapse text-[10px]">
        <thead className="bg-gray-700 border-b-2 border-gray-600 sticky top-0 z-10">
          <tr>
            <th className="w-[25%] px-1.5 py-1 text-left text-[9px] font-bold text-white uppercase tracking-tight">
              Item
            </th>
            <th className="w-[25%] px-1.5 py-1 text-left text-[9px] font-bold text-white uppercase tracking-tight">
              Quantitated
            </th>
            <th className="w-[10%] px-1 py-1 text-center text-[9px] font-bold text-white uppercase tracking-tight">
              None
            </th>
            <th className="w-[10%] px-1 py-1 text-center text-[9px] font-bold text-white uppercase tracking-tight">
              Rare
            </th>
            <th className="w-[10%] px-1 py-1 text-center text-[9px] font-bold text-white uppercase tracking-tight">
              Few
            </th>
            <th className="w-[10%] px-1 py-1 text-center text-[9px] font-bold text-white uppercase tracking-tight">
              Moderate
            </th>
            <th className="w-[10%] px-1 py-1 text-center text-[9px] font-bold text-white uppercase tracking-tight">
              Many
            </th>
            {onClose && (
              <th className="w-auto px-1 py-1 text-center">
                <button
                  onClick={onClose}
                  className="rounded-md p-0.5 text-white transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  aria-label="Close Strasinger reference"
                >
                  <X className="h-3 w-3" />
                </button>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {strasingerReferenceTable.map((row, index) => (
            <tr
              key={row.item}
              className={`border-b border-gray-200 transition-colors ${
                index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <td className="px-1.5 py-1 align-top font-semibold text-[10px] text-gray-900 leading-tight">
                {row.item}
              </td>
              <td className="px-1.5 py-1 align-top text-[10px] text-gray-700 leading-tight">
                <div className="font-medium">{row.quantitated}</div>
              </td>
              <td className="px-1 py-1 text-center text-[10px] font-medium text-gray-800">
                {row.categories.none ?? '—'}
              </td>
              <td className="px-1 py-1 text-center text-[10px] font-medium text-gray-800">
                {row.categories.rare ?? '—'}
              </td>
              <td className="px-1 py-1 text-center text-[10px] font-medium text-gray-800">
                {row.categories.few ?? '—'}
              </td>
              <td className="px-1 py-1 text-center text-[10px] font-medium text-gray-800">
                {row.categories.moderate ?? '—'}
              </td>
              <td className="px-1 py-1 text-center text-[10px] font-medium text-gray-800">
                {row.categories.many ?? '—'}
              </td>
              {onClose && (
                <td className="px-1 py-1"></td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}


