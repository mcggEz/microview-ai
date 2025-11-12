'use client'

import StrasingerReferenceTable from '@/components/StrasingerReferenceTable'

type StrasingerReferenceModalProps = {
  isOpen: boolean
  onClose: () => void
}

export default function StrasingerReferenceModal({
  isOpen,
  onClose
}: StrasingerReferenceModalProps) {
  return (
    <div className="w-full max-h-[calc(100vh-12rem)] flex flex-col overflow-hidden rounded-md bg-white shadow-2xl border border-gray-300">
      {/* Table Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-1.5 py-1 min-h-0">
        <StrasingerReferenceTable onClose={onClose} />
      </div>
    </div>
  )
}


