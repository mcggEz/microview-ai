'use client'

import { useState, useEffect } from 'react'
import { Move, Home, AlertTriangle, Focus, Scan, RotateCcw, RotateCw } from 'lucide-react'
import { motorController, MotorPosition } from '@/lib/motor-control'

interface MotorControlPanelProps {
  className?: string
}

export default function MotorControlPanel({ className = '' }: MotorControlPanelProps) {
  const [currentPosition, setCurrentPosition] = useState<MotorPosition>({ x: 0, y: 0, z: 0 })
  const [isMoving, setIsMoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Update position display
  useEffect(() => {
    const updatePosition = () => {
      setCurrentPosition(motorController.getCurrentPosition())
    }

    // Update position every second
    const interval = setInterval(updatePosition, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleMotorCommand = async (command: () => Promise<void>) => {
    setIsMoving(true)
    setError(null)
    
    try {
      await command()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Motor control failed')
    } finally {
      setIsMoving(false)
    }
  }

  const moveToPosition = async (position: Partial<MotorPosition>) => {
    await handleMotorCommand(() => motorController.moveTo(position))
  }

  const moveRelative = async (delta: Partial<MotorPosition>) => {
    await handleMotorCommand(() => motorController.moveRelative(delta))
  }

  const homeMotors = async () => {
    await handleMotorCommand(() => motorController.home())
  }

  const emergencyStop = async () => {
    await handleMotorCommand(() => motorController.emergencyStop())
  }

  const focusAdjust = async (direction: 'up' | 'down') => {
    await handleMotorCommand(() => motorController.focusAdjust(direction, 1))
  }

  const scanArea = async () => {
    await handleMotorCommand(() => motorController.scanArea(0, 0, 10, 10, 1))
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Move className="h-5 w-5 mr-2 text-blue-600" />
          Motor Control
        </h3>
        <div className="flex items-center space-x-2">
          <span className={`w-3 h-3 rounded-full ${isMoving ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></span>
          <span className="text-sm text-gray-600">
            {isMoving ? 'Moving...' : 'Ready'}
          </span>
        </div>
      </div>

      {/* Current Position Display */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Current Position</h4>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="text-center">
            <span className="text-gray-500">X:</span>
            <span className="ml-1 font-mono">{currentPosition.x.toFixed(2)}mm</span>
          </div>
          <div className="text-center">
            <span className="text-gray-500">Y:</span>
            <span className="ml-1 font-mono">{currentPosition.y.toFixed(2)}mm</span>
          </div>
          <div className="text-center">
            <span className="text-gray-500">Z:</span>
            <span className="ml-1 font-mono">{currentPosition.z.toFixed(2)}mm</span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Control Buttons */}
      <div className="space-y-4">
        {/* Emergency Stop */}
        <button
          onClick={emergencyStop}
          disabled={isMoving}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <AlertTriangle className="h-5 w-5" />
          <span>Emergency Stop</span>
        </button>

        {/* Home Motors */}
        <button
          onClick={homeMotors}
          disabled={isMoving}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Home className="h-5 w-5" />
          <span>Home All Motors</span>
        </button>

        {/* Focus Controls */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => focusAdjust('up')}
            disabled={isMoving}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCw className="h-4 w-4" />
            <span>Focus Up</span>
          </button>
          <button
            onClick={() => focusAdjust('down')}
            disabled={isMoving}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Focus Down</span>
          </button>
        </div>

        {/* Movement Controls */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => moveRelative({ y: -1 })}
            disabled={isMoving}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ↑
          </button>
          <button
            onClick={() => moveRelative({ x: -1 })}
            disabled={isMoving}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ←
          </button>
          <button
            onClick={() => moveRelative({ x: 1 })}
            disabled={isMoving}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            →
          </button>
          <div></div>
          <button
            onClick={() => moveRelative({ y: 1 })}
            disabled={isMoving}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ↓
          </button>
          <div></div>
        </div>

        {/* Quick Position Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => moveToPosition({ x: 0, y: 0 })}
            disabled={isMoving}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Go to Origin
          </button>
          <button
            onClick={() => moveToPosition({ x: 5, y: 5 })}
            disabled={isMoving}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Go to Center
          </button>
        </div>

        {/* Scan Area */}
        <button
          onClick={scanArea}
          disabled={isMoving}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Scan className="h-5 w-5" />
          <span>Scan Area (10x10mm)</span>
        </button>
      </div>

      {/* Position Input */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Move to Position</h4>
        <div className="grid grid-cols-3 gap-2">
          <input
            type="number"
            placeholder="X (mm)"
            step="0.1"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const x = parseFloat(e.currentTarget.value)
                if (!isNaN(x)) moveToPosition({ x })
              }
            }}
          />
          <input
            type="number"
            placeholder="Y (mm)"
            step="0.1"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const y = parseFloat(e.currentTarget.value)
                if (!isNaN(y)) moveToPosition({ y })
              }
            }}
          />
          <input
            type="number"
            placeholder="Z (mm)"
            step="0.1"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const z = parseFloat(e.currentTarget.value)
                if (!isNaN(z)) moveToPosition({ z })
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}
