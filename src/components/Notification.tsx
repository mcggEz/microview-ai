'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface NotificationProps {
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  onClose: () => void
}

export default function Notification({
  message,
  type,
  duration = 4000,
  onClose
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300) // Wait for fade out animation
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])


  const getBackgroundColor = () => {
    switch (type) {
      case 'error':
        return 'bg-gray-900 border-gray-900'
      case 'warning':
        return 'bg-gray-200 border-gray-400'
      case 'success':
        return 'bg-gray-100 border-gray-300'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const getTextColor = () => {
    switch (type) {
      case 'error':
        return 'text-white'
      case 'warning':
        return 'text-gray-800'
      case 'success':
        return 'text-gray-900'
      case 'warning':
      default:
        return 'text-gray-800'
    }
  }

  const getCloseButtonColor = () => {
    switch (type) {
      case 'error':
        return 'text-white hover:bg-gray-800 focus:ring-gray-300'
      case 'warning':
        return 'text-gray-700 hover:bg-gray-300 focus:ring-gray-400'
      case 'success':
        return 'text-gray-700 hover:bg-gray-200 focus:ring-gray-300'
      default:
        return 'text-gray-600 hover:bg-gray-200 focus:ring-gray-300'
    }
  }

  return (
    <div
      className={`fixed top-20 right-4 z-40 transform transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className={`flex items-center p-3 rounded-md border shadow-lg max-w-sm ${getBackgroundColor()}`}>
        <div className="flex-1">
          <p className={`text-sm font-medium ${getTextColor()}`}>
            {message}
          </p>
        </div>
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={() => {
              setIsVisible(false)
              setTimeout(onClose, 300)
            }}
            className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${getCloseButtonColor()}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
