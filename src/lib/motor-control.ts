// Motor control functions for Raspberry Pi integration
// These functions will be called from the frontend to control motors via API

export interface MotorPosition {
  x: number
  y: number
  z: number
}

export interface MotorConfig {
  xStepsPerMm: number
  yStepsPerMm: number
  zStepsPerMm: number
  maxSpeed: number
  acceleration: number
}

export class MotorController {
  private config: MotorConfig
  private currentPosition: MotorPosition

  constructor(config: MotorConfig) {
    this.config = config
    this.currentPosition = { x: 0, y: 0, z: 0 }
  }

  // Move to specific coordinates
  async moveTo(position: Partial<MotorPosition>): Promise<void> {
    const targetPosition = {
      x: position.x ?? this.currentPosition.x,
      y: position.y ?? this.currentPosition.y,
      z: position.z ?? this.currentPosition.z
    }

    console.log(`Moving motors to: X=${targetPosition.x}, Y=${targetPosition.y}, Z=${targetPosition.z}`)
    
    // This would make API calls to Raspberry Pi endpoints
    await this.sendMotorCommand('move_to', targetPosition)
    
    this.currentPosition = targetPosition
  }

  // Move relative to current position
  async moveRelative(delta: Partial<MotorPosition>): Promise<void> {
    const targetPosition = {
      x: this.currentPosition.x + (delta.x ?? 0),
      y: this.currentPosition.y + (delta.y ?? 0),
      z: this.currentPosition.z + (delta.z ?? 0)
    }

    await this.moveTo(targetPosition)
  }

  // Home all motors
  async home(): Promise<void> {
    console.log('Homing all motors...')
    await this.sendMotorCommand('home', {})
    this.currentPosition = { x: 0, y: 0, z: 0 }
  }

  // Focus adjustment (Z-axis)
  async focusAdjust(direction: 'up' | 'down', steps: number = 1): Promise<void> {
    const delta = direction === 'up' ? steps : -steps
    await this.moveRelative({ z: delta })
  }

  // Scan pattern for microscopy
  async scanArea(startX: number, startY: number, endX: number, endY: number, stepSize: number): Promise<void> {
    console.log(`Starting scan pattern: ${startX},${startY} to ${endX},${endY} with step ${stepSize}`)
    
    for (let y = startY; y <= endY; y += stepSize) {
      for (let x = startX; x <= endX; x += stepSize) {
        await this.moveTo({ x, y })
        // Wait for image capture
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  }

  // Emergency stop
  async emergencyStop(): Promise<void> {
    console.log('EMERGENCY STOP - Stopping all motors')
    await this.sendMotorCommand('emergency_stop', {})
  }

  // Get current position
  getCurrentPosition(): MotorPosition {
    return { ...this.currentPosition }
  }

  // Private method to send commands to Raspberry Pi
  private async sendMotorCommand(command: string, params: any): Promise<void> {
    try {
      const response = await fetch('/api/motor-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command,
          params,
          timestamp: Date.now()
        })
      })

      if (!response.ok) {
        throw new Error(`Motor control failed: ${response.statusText}`)
      }

      const result = await response.json()
      console.log(`Motor command ${command} executed:`, result)
    } catch (error) {
      console.error(`Error sending motor command ${command}:`, error)
      throw error
    }
  }
}

// Default motor configuration for typical microscope setup
export const defaultMotorConfig: MotorConfig = {
  xStepsPerMm: 100,    // Steps per millimeter for X-axis
  yStepsPerMm: 100,    // Steps per millimeter for Y-axis
  zStepsPerMm: 200,    // Steps per millimeter for Z-axis (focus)
  maxSpeed: 1000,      // Maximum speed in steps per second
  acceleration: 500    // Acceleration in steps per second squared
}

// Create a singleton instance
export const motorController = new MotorController(defaultMotorConfig)
