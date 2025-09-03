import { useState, useEffect, useCallback } from 'react'
import { MotorPosition } from '@/lib/motor-control'

interface DesktopMotorControl {
  // Motor control functions
  moveTo: (position: Partial<MotorPosition>) => Promise<void>
  moveRelative: (delta: Partial<MotorPosition>) => Promise<void>
  home: () => Promise<void>
  emergencyStop: () => Promise<void>
  focusAdjust: (direction: 'up' | 'down', steps?: number) => Promise<void>
  scanArea: (startX: number, startY: number, endX: number, endY: number, stepSize: number) => Promise<void>
  
  // System functions
  openFileDialog: () => Promise<string | null>
  saveFileDialog: (defaultPath?: string) => Promise<string | null>
  getSystemInfo: () => Promise<any>
  
  // State
  isMoving: boolean
  currentPosition: MotorPosition
  error: string | null
  isDesktop: boolean
}

export function useDesktopMotorControl(): DesktopMotorControl {
  const [isMoving, setIsMoving] = useState(false)
  const [currentPosition, setCurrentPosition] = useState<MotorPosition>({ x: 0, y: 0, z: 0 })
  const [error, setError] = useState<string | null>(null)
  const [isDesktop, setIsDesktop] = useState(false)

  // Check if running in Electron
  useEffect(() => {
    const checkDesktop = () => {
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        setIsDesktop(true)
        console.log('Running in Electron desktop app')
      } else {
        console.log('Running in web browser')
      }
    }
    
    checkDesktop()
  }, [])

  // Handle motor commands
  const executeMotorCommand = useCallback(async (command: string, params: any = {}) => {
    if (!isDesktop) {
      throw new Error('Motor control only available in desktop app')
    }

    setIsMoving(true)
    setError(null)

    try {
      const result = await (window as any).electronAPI.motorCommand(command, params)
      
      if (!result.success) {
        throw new Error(result.error || 'Motor command failed')
      }

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Motor control failed'
      setError(errorMessage)
      throw err
    } finally {
      setIsMoving(false)
    }
  }, [isDesktop])

  // Motor control functions
  const moveTo = useCallback(async (position: Partial<MotorPosition>) => {
    await executeMotorCommand('move_to', position)
    setCurrentPosition(prev => ({ ...prev, ...position }))
  }, [executeMotorCommand])

  const moveRelative = useCallback(async (delta: Partial<MotorPosition>) => {
    await executeMotorCommand('move_relative', delta)
    setCurrentPosition(prev => ({
      x: prev.x + (delta.x || 0),
      y: prev.y + (delta.y || 0),
      z: prev.z + (delta.z || 0)
    }))
  }, [executeMotorCommand])

  const home = useCallback(async () => {
    await executeMotorCommand('home')
    setCurrentPosition({ x: 0, y: 0, z: 0 })
  }, [executeMotorCommand])

  const emergencyStop = useCallback(async () => {
    await executeMotorCommand('emergency_stop')
    setCurrentPosition({ x: 0, y: 0, z: 0 })
  }, [executeMotorCommand])

  const focusAdjust = useCallback(async (direction: 'up' | 'down', steps: number = 1) => {
    await executeMotorCommand('focus_adjust', { direction, steps })
    const delta = direction === 'up' ? steps : -steps
    setCurrentPosition(prev => ({ ...prev, z: prev.z + delta }))
  }, [executeMotorCommand])

  const scanArea = useCallback(async (startX: number, startY: number, endX: number, endY: number, stepSize: number) => {
    await executeMotorCommand('scan_area', { startX, startY, endX, endY, stepSize })
  }, [executeMotorCommand])

  // System functions
  const openFileDialog = useCallback(async (): Promise<string | null> => {
    if (!isDesktop) {
      throw new Error('File dialog only available in desktop app')
    }

    try {
      const result = await (window as any).electronAPI.openFileDialog()
      return result.canceled ? null : result.filePaths[0]
    } catch (err) {
      console.error('Error opening file dialog:', err)
      return null
    }
  }, [isDesktop])

  const saveFileDialog = useCallback(async (defaultPath?: string): Promise<string | null> => {
    if (!isDesktop) {
      throw new Error('File dialog only available in desktop app')
    }

    try {
      const result = await (window as any).electronAPI.saveFileDialog(defaultPath)
      return result.canceled ? null : result.filePath
    } catch (err) {
      console.error('Error opening save dialog:', err)
      return null
    }
  }, [isDesktop])

  const getSystemInfo = useCallback(async () => {
    if (!isDesktop) {
      return { platform: 'web', isDesktop: false }
    }

    try {
      return await (window as any).electronAPI.getSystemInfo()
    } catch (err) {
      console.error('Error getting system info:', err)
      return { platform: 'unknown', isDesktop: true }
    }
  }, [isDesktop])

  // Listen for menu events
  useEffect(() => {
    if (!isDesktop) return

    const handleMenuNewTest = () => {
      // Navigate to new test page
      window.location.href = '/report?date=' + new Date().toISOString().split('T')[0]
    }

    const handleMenuOpenDashboard = () => {
              window.location.href = '/report'
    }

    const handleMenuHomeMotors = () => {
      home()
    }

    const handleMenuEmergencyStop = () => {
      emergencyStop()
    }

    const handleMenuMotorSettings = () => {
      // Open motor settings modal or page
      console.log('Open motor settings')
    }

    const handleMenuOpenDocs = () => {
      // Open documentation
      console.log('Open documentation')
    }

    // Add event listeners
    ;(window as any).electronAPI.onMenuNewTest(handleMenuNewTest)
    ;(window as any).electronAPI.onMenuOpenDashboard(handleMenuOpenDashboard)
    ;(window as any).electronAPI.onMenuHomeMotors(handleMenuHomeMotors)
    ;(window as any).electronAPI.onMenuEmergencyStop(handleMenuEmergencyStop)
    ;(window as any).electronAPI.onMenuMotorSettings(handleMenuMotorSettings)
    ;(window as any).electronAPI.onMenuOpenDocs(handleMenuOpenDocs)

    // Cleanup
    return () => {
      if ((window as any).electronAPI) {
        ;(window as any).electronAPI.removeAllListeners('menu-new-test')
        ;(window as any).electronAPI.removeAllListeners('menu-open-dashboard')
        ;(window as any).electronAPI.removeAllListeners('menu-home-motors')
        ;(window as any).electronAPI.removeAllListeners('menu-emergency-stop')
        ;(window as any).electronAPI.removeAllListeners('menu-motor-settings')
        ;(window as any).electronAPI.removeAllListeners('menu-open-docs')
      }
    }
  }, [isDesktop, home, emergencyStop])

  return {
    // Motor control functions
    moveTo,
    moveRelative,
    home,
    emergencyStop,
    focusAdjust,
    scanArea,
    
    // System functions
    openFileDialog,
    saveFileDialog,
    getSystemInfo,
    
    // State
    isMoving,
    currentPosition,
    error,
    isDesktop
  }
}
