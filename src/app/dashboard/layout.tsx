import { TestTube } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <TestTube className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">MicroView AI</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button className="text-sm text-gray-600 hover:text-gray-900">Logout</button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
