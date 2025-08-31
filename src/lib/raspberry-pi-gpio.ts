import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// GPIO pin configuration for stepper motors
export const MOTOR_PINS = {
  x: {
    step: 17,    // GPIO17
    dir: 18,     // GPIO18
    enable: 27,  // GPIO27
  },
  y: {
    step: 22,    // GPIO22
    dir: 23,     // GPIO23
    enable: 24,  // GPIO24
  },
  z: {
    step: 25,    // GPIO25
    dir: 8,      // GPIO8
    enable: 7,   // GPIO7
  }
}

// Motor configuration
export const MOTOR_CONFIG = {
  xStepsPerMm: 100,
  yStepsPerMm: 100,
  zStepsPerMm: 200,
  maxSpeed: 1000,
  acceleration: 500
}

export class RaspberryPiGPIO {
  private isInitialized = false
  private currentPosition = { x: 0, y: 0, z: 0 }
  private isMoving = false

  // Initialize GPIO pins
  async initialize() {
    if (this.isInitialized) return

    try {
      console.log('Initializing Raspberry Pi GPIO...')
      
      // Set up all GPIO pins
      for (const [axis, pins] of Object.entries(MOTOR_PINS)) {
        await this.setupGPIO(pins.step, 'out')
        await this.setupGPIO(pins.dir, 'out')
        await this.setupGPIO(pins.enable, 'out')
        
        // Disable motors initially
        await this.writeGPIO(pins.enable, 1)
      }

      this.isInitialized = true
      console.log('Raspberry Pi GPIO initialized successfully')
    } catch (error) {
      console.error('Failed to initialize Raspberry Pi GPIO:', error)
      throw error
    }
  }

  // Setup GPIO pin
  async setupGPIO(pin: number, direction: 'in' | 'out') {
    try {
      await execAsync(`gpio -g mode ${pin} ${direction}`)
    } catch (error) {
      console.error(`GPIO setup error for pin ${pin}:`, error)
      throw error
    }
  }

  // Write to GPIO pin
  async writeGPIO(pin: number, value: number) {
    try {
      await execAsync(`gpio -g write ${pin} ${value}`)
    } catch (error) {
      console.error(`GPIO write error for pin ${pin}:`, error)
      throw error
    }
  }

  // Read from GPIO pin
  async readGPIO(pin: number): Promise<number> {
    try {
      const { stdout } = await execAsync(`gpio -g read ${pin}`)
      return parseInt(stdout.trim())
    } catch (error) {
      console.error(`GPIO read error for pin ${pin}:`, error)
      throw error
    }
  }

  // Control stepper motor
  async controlStepperMotor(axis: 'x' | 'y' | 'z', steps: number, speed = 1000) {
    if (!this.isInitialized) {
      await this.initialize()
    }

    const pins = MOTOR_PINS[axis]
    const direction = steps > 0 ? 1 : 0
    const stepCount = Math.abs(steps)
    
    console.log(`Controlling ${axis} motor: ${steps} steps, direction: ${direction}, speed: ${speed}`)

    try {
      // Enable motor
      await this.writeGPIO(pins.enable, 0)
      
      // Set direction
      await this.writeGPIO(pins.dir, direction)
      
      // Generate step pulses
      const stepDelay = 1000000 / speed // microseconds
      
      for (let i = 0; i < stepCount; i++) {
        await this.writeGPIO(pins.step, 1)
        await this.delayMicroseconds(stepDelay)
        await this.writeGPIO(pins.step, 0)
        await this.delayMicroseconds(stepDelay)
      }
      
      // Disable motor
      await this.writeGPIO(pins.enable, 1)
      
      // Update position
      const stepsPerMm = MOTOR_CONFIG[`${axis}StepsPerMm` as keyof typeof MOTOR_CONFIG]
      const delta = steps / stepsPerMm
      this.currentPosition[axis] += delta
      
      console.log(`${axis} motor moved ${steps} steps (${delta.toFixed(3)}mm)`)
      
    } catch (error) {
      console.error(`Error controlling ${axis} motor:`, error)
      // Disable motor on error
      await this.writeGPIO(pins.enable, 1)
      throw error
    }
  }

  // Delay in microseconds
  async delayMicroseconds(microseconds: number) {
    return new Promise(resolve => {
      const start = process.hrtime.bigint()
      while (process.hrtime.bigint() - start < microseconds * 1000n) {
        // Busy wait
      }
      resolve()
    })
  }

  // Move to specific position
  async moveTo(position: { x?: number; y?: number; z?: number }) {
    if (this.isMoving) {
      throw new Error('Motor is already moving')
    }

    this.isMoving = true
    
    try {
      const movements = []
      
      for (const [axis, targetPos] of Object.entries(position)) {
        if (targetPos !== undefined) {
          const currentPos = this.currentPosition[axis as keyof typeof this.currentPosition]
          const delta = targetPos - currentPos
          const steps = Math.round(delta * MOTOR_CONFIG[`${axis}StepsPerMm` as keyof typeof MOTOR_CONFIG])
          
          if (steps !== 0) {
            movements.push(this.controlStepperMotor(axis as 'x' | 'y' | 'z', steps))
          }
        }
      }
      
      // Execute movements sequentially
      for (const movement of movements) {
        await movement
      }
      
      console.log(`Moved to position:`, position)
      
    } finally {
      this.isMoving = false
    }
  }

  // Move relative to current position
  async moveRelative(delta: { x?: number; y?: number; z?: number }) {
    const targetPosition = {
      x: this.currentPosition.x + (delta.x || 0),
      y: this.currentPosition.y + (delta.y || 0),
      z: this.currentPosition.z + (delta.z || 0)
    }
    
    await this.moveTo(targetPosition)
  }

  // Home all motors
  async home() {
    console.log('Homing all motors...')
    
    // Move to limit switches (simplified - in real implementation you'd check limit switches)
    await this.moveTo({ x: -50, y: -50, z: -20 })
    
    // Reset position to 0
    this.currentPosition = { x: 0, y: 0, z: 0 }
    
    console.log('All motors homed')
  }

  // Emergency stop
  async emergencyStop() {
    console.log('EMERGENCY STOP - Stopping all motors')
    
    try {
      // Disable all motors immediately
      for (const pins of Object.values(MOTOR_PINS)) {
        await this.writeGPIO(pins.enable, 1)
      }
      
      this.isMoving = false
      console.log('Emergency stop executed')
      
    } catch (error) {
      console.error('Error during emergency stop:', error)
    }
  }

  // Focus adjustment
  async focusAdjust(direction: 'up' | 'down', steps = 1) {
    const delta = direction === 'up' ? steps : -steps
    await this.moveRelative({ z: delta })
  }

  // Get current position
  getCurrentPosition() {
    return { ...this.currentPosition }
  }

  // Check if motors are moving
  getIsMoving() {
    return this.isMoving
  }

  // Cleanup
  async cleanup() {
    console.log('Cleaning up Raspberry Pi GPIO...')
    
    try {
      // Disable all motors
      for (const pins of Object.values(MOTOR_PINS)) {
        await this.writeGPIO(pins.enable, 1)
      }
      
      this.isInitialized = false
      console.log('Raspberry Pi GPIO cleaned up')
      
    } catch (error) {
      console.error('Error during cleanup:', error)
    }
  }
}

// Create singleton instance
export const raspberryPiGPIO = new RaspberryPiGPIO()
