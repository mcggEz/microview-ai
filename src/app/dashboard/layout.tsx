import Link from 'next/link'
import { TestTube, Home } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
              <Home className="h-5 w-5" />
              <span>Home</span>
            </Link>
            <div className="flex items-center space-x-2">
              <TestTube className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">LabTech Pro</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Welcome, Dr. Smith</span>
            <button className="text-sm text-gray-600 hover:text-gray-900">Logout</button>
          </div>
        </div>
      </div>
      
      {children}
    </div>
  )
}
