import { NextRequest, NextResponse } from 'next/server'
import { raspberryPiGPIO } from '@/lib/raspberry-pi-gpio'

// This interface defines the motor control commands
interface MotorCommand {
  command: string
  params: any
  timestamp: number
}

export async function POST(request: NextRequest) {
  try {
    const body: MotorCommand = await request.json()
    const { command, params } = body

    console.log(`Received motor command: ${command}`, params)

    let result: any

    switch (command) {
      case 'move_to':
        await raspberryPiGPIO.moveTo(params)
        result = { message: `Moved to position: ${JSON.stringify(params)}` }
        break
      
      case 'move_relative':
        await raspberryPiGPIO.moveRelative(params)
        result = { message: `Moved relative: ${JSON.stringify(params)}` }
        break
      
      case 'home':
        await raspberryPiGPIO.home()
        result = { message: 'All motors homed successfully' }
        break
      
      case 'emergency_stop':
        await raspberryPiGPIO.emergencyStop()
        result = { message: 'Emergency stop executed' }
        break
      
      case 'focus_adjust':
        await raspberryPiGPIO.focusAdjust(params.direction, params.steps)
        result = { message: `Focus adjusted ${params.direction} by ${params.steps} steps` }
        break
      
      case 'get_position':
        result = raspberryPiGPIO.getCurrentPosition()
        break
      
      case 'get_status':
        result = {
          position: raspberryPiGPIO.getCurrentPosition(),
          isMoving: raspberryPiGPIO.getIsMoving(),
          isInitialized: raspberryPiGPIO['isInitialized']
        }
        break
      
      case 'scan_area':
        // Implement scan area logic
        result = { message: `Scan area: ${params.startX},${params.startY} to ${params.endX},${params.endY}` }
        break
      
      default:
        return NextResponse.json(
          { error: `Unknown command: ${command}` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      command,
      result,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Motor control error:', error)
    return NextResponse.json(
      { error: 'Motor control failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Real motor control is now handled by raspberryPiGPIO class
