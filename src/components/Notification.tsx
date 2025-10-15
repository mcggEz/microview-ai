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
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'warning':
        return 'bg-amber-50 border-amber-200'
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  const getTextColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-800'
      case 'error':
        return 'text-red-800'
      case 'warning':
        return 'text-amber-800'
      default:
        return 'text-blue-800'
    }
  }

  const getCloseButtonColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-600 hover:bg-green-100'
      case 'error':
        return 'text-red-600 hover:bg-red-100'
      case 'warning':
        return 'text-amber-600 hover:bg-amber-100'
      default:
        return 'text-blue-600 hover:bg-blue-100'
    }
  }

  return (
    <div
      className={`fixed top-4 right-4 z-50 transform transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className={`flex items-center p-4 rounded-xl border shadow-lg max-w-sm backdrop-blur-sm ${getBackgroundColor()}`}>
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
