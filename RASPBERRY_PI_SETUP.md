# Raspberry Pi Motor Control Setup

This guide explains how to set up motor control for the MicroView AI microscope automation system on a Raspberry Pi.

## Hardware Requirements

### Motors
- **3x Stepper Motors** (NEMA 17 recommended)
  - X-axis: Stage movement (horizontal)
  - Y-axis: Stage movement (horizontal) 
  - Z-axis: Focus adjustment (vertical)

### Motor Drivers
- **3x A4988 or DRV8825 stepper motor drivers**
- **Motor driver breakout boards** (optional but recommended)

### Power Supply
- **12V power supply** for stepper motors
- **5V power supply** for Raspberry Pi and logic

### Additional Components
- **Limit switches** for homing (3x)
- **Microscope stage** with mounting brackets
- **Camera mount** for Raspberry Pi Camera Module
- **Breadboard and jumper wires**

## GPIO Pin Configuration

The system uses the following GPIO pins:

| Component | Pin | Function |
|-----------|-----|----------|
| X-axis Step | GPIO17 | Step pulse |
| X-axis Dir | GPIO18 | Direction control |
| X-axis Enable | GPIO27 | Motor enable |
| Y-axis Step | GPIO22 | Step pulse |
| Y-axis Dir | GPIO23 | Direction control |
| Y-axis Enable | GPIO24 | Motor enable |
| Z-axis Step | GPIO25 | Step pulse |
| Z-axis Dir | GPIO8 | Direction control |
| Z-axis Enable | GPIO7 | Motor enable |
| X Limit Switch | GPIO9 | Homing sensor |
| Y Limit Switch | GPIO10 | Homing sensor |
| Z Limit Switch | GPIO11 | Homing sensor |

## Software Setup

### 1. Install Required Packages

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python GPIO library
sudo apt install python3-gpiozero python3-pip -y

# Install Node.js (for Next.js)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2
```

### 2. Install GPIO Library for Node.js

```bash
# Install node-gpio (if available) or use Python bridge
npm install onoff
# or
npm install rpi-gpio
```

### 3. Clone and Setup the Project

```bash
# Clone your repository
git clone https://github.com/mcggEz/microview-ai.git
cd microview-ai

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
```

### 4. Configure Environment Variables

Edit `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key

# Raspberry Pi Configuration
RASPBERRY_PI_MODE=true
MOTOR_ENABLED=true
```

## Hardware Assembly

### 1. Motor Wiring

Connect each stepper motor to its driver:

```
Stepper Motor → Driver → Raspberry Pi
├── Coil A+ → A+ → 12V
├── Coil A- → A- → Driver Output
├── Coil B+ → B+ → 12V  
└── Coil B- → B- → Driver Output
```

### 2. Driver Connections

For each A4988/DRV8825 driver:

```
Driver → Raspberry Pi
├── STEP → GPIO (Step pin)
├── DIR → GPIO (Direction pin)
├── ENABLE → GPIO (Enable pin)
├── VDD → 3.3V (Logic power)
├── GND → GND (Logic ground)
├── VMOT → 12V (Motor power)
└── GND → GND (Motor ground)
```

### 3. Limit Switch Wiring

```
Limit Switch → Raspberry Pi
├── VCC → 3.3V
├── GND → GND
└── Signal → GPIO (Limit pin)
```

### 4. Power Distribution

```
12V Power Supply
├── Motor Drivers (VMOT)
└── 5V Regulator → Raspberry Pi
```

## Motor Configuration

### Calibration

1. **Steps per millimeter**: Measure how many steps move the stage 1mm
2. **Maximum speed**: Test safe maximum speed for each axis
3. **Acceleration**: Set appropriate acceleration values

### Example Configuration

```typescript
const MOTOR_CONFIG = {
  xStepsPerMm: 100,    // Adjust based on your setup
  yStepsPerMm: 100,    // Adjust based on your setup
  zStepsPerMm: 200,    // Adjust based on your setup
  maxSpeed: 1000,      // Steps per second
  acceleration: 500    // Steps per second squared
}
```

## Testing Motor Control

### 1. Basic Movement Test

```bash
# Start the development server
npm run dev

# Open browser to http://localhost:3000
# Navigate to a report page and use the motor control panel
```

### 2. Command Line Testing

You can test motors directly using the API:

```bash
# Home all motors
curl -X POST http://localhost:3000/api/motor-control \
  -H "Content-Type: application/json" \
  -d '{"command": "home", "params": {}}'

# Move to position
curl -X POST http://localhost:3000/api/motor-control \
  -H "Content-Type: application/json" \
  -d '{"command": "move_to", "params": {"x": 5, "y": 5}}'
```

## Safety Features

### 1. Emergency Stop

- **Hardware**: Emergency stop button connected to GPIO
- **Software**: Emergency stop function in motor control
- **Automatic**: Limit switch detection

### 2. Limit Switches

```python
# Python script for limit switch monitoring
import RPi.GPIO as GPIO
import time

GPIO.setmode(GPIO.BCM)
GPIO.setup(9, GPIO.IN, pull_up_down=GPIO.PUD_UP)  # X limit
GPIO.setup(10, GPIO.IN, pull_up_down=GPIO.PUD_UP) # Y limit
GPIO.setup(11, GPIO.IN, pull_up_down=GPIO.PUD_UP) # Z limit

def limit_triggered(channel):
    print(f"Limit switch {channel} triggered!")
    # Stop all motors
    # Send emergency stop command

GPIO.add_event_detect(9, GPIO.FALLING, callback=limit_triggered)
GPIO.add_event_detect(10, GPIO.FALLING, callback=limit_triggered)
GPIO.add_event_detect(11, GPIO.FALLING, callback=limit_triggered)
```

### 3. Software Limits

```typescript
// Add position limits to motor control
const POSITION_LIMITS = {
  x: { min: 0, max: 50 },
  y: { min: 0, max: 50 },
  z: { min: 0, max: 20 }
}

function validatePosition(position: MotorPosition): boolean {
  return (
    position.x >= POSITION_LIMITS.x.min && position.x <= POSITION_LIMITS.x.max &&
    position.y >= POSITION_LIMITS.y.min && position.y <= POSITION_LIMITS.y.max &&
    position.z >= POSITION_LIMITS.z.min && position.z <= POSITION_LIMITS.z.max
  )
}
```

## Integration with Microscope

### 1. Stage Mounting

- Mount stepper motors to microscope stage
- Ensure proper alignment and backlash compensation
- Calibrate movement to microscope coordinates

### 2. Camera Integration

- Mount Raspberry Pi Camera Module to microscope
- Align camera with optical path
- Calibrate pixel-to-micron ratio

### 3. Focus Control

- Connect Z-axis motor to microscope focus mechanism
- Calibrate focus steps to actual focus distance
- Implement auto-focus algorithms

## Troubleshooting

### Common Issues

1. **Motors not moving**
   - Check power supply connections
   - Verify GPIO pin assignments
   - Test motor drivers individually

2. **Incorrect movement**
   - Calibrate steps per millimeter
   - Check motor direction wiring
   - Verify limit switch connections

3. **Noisy operation**
   - Adjust motor driver current settings
   - Check for mechanical binding
   - Verify proper grounding

### Debug Commands

```bash
# Check GPIO status
gpio readall

# Test individual pins
gpio -g mode 17 out
gpio -g write 17 1
gpio -g write 17 0

# Monitor system resources
htop
```

## Production Deployment

### 1. PM2 Process Management

```bash
# Build the application
npm run build

# Start with PM2
pm2 start npm --name "microview-ai" -- start

# Enable auto-start
pm2 startup
pm2 save
```

### 2. System Service

Create `/etc/systemd/system/microview-ai.service`:

```ini
[Unit]
Description=MicroView AI Microscope Control
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/microview-ai
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 3. Auto-start on Boot

```bash
sudo systemctl enable microview-ai
sudo systemctl start microview-ai
```

## Advanced Features

### 1. Auto-focus Algorithm

```typescript
async function autoFocus(): Promise<number> {
  const focusPositions = []
  const focusScores = []
  
  // Move through focus range
  for (let z = 0; z <= 20; z += 0.5) {
    await moveToPosition({ z })
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Capture image and calculate focus score
    const image = await captureImage()
    const score = calculateFocusScore(image)
    
    focusPositions.push(z)
    focusScores.push(score)
  }
  
  // Find best focus position
  const bestIndex = focusScores.indexOf(Math.max(...focusScores))
  const bestZ = focusPositions[bestIndex]
  
  await moveToPosition({ z: bestZ })
  return bestZ
}
```

### 2. Automated Scanning

```typescript
async function automatedScan(area: ScanArea): Promise<ScanResult[]> {
  const results = []
  
  for (let y = area.startY; y <= area.endY; y += area.stepSize) {
    for (let x = area.startX; x <= area.endX; x += area.stepSize) {
      // Move to position
      await moveToPosition({ x, y })
      
      // Auto-focus
      await autoFocus()
      
      // Capture image
      const image = await captureImage()
      
      // Analyze with AI
      const analysis = await analyzeImage(image)
      
      results.push({
        position: { x, y },
        image,
        analysis
      })
    }
  }
  
  return results
}
```

## Support and Maintenance

### Regular Maintenance

1. **Clean mechanical components** monthly
2. **Check motor driver settings** quarterly
3. **Calibrate position accuracy** as needed
4. **Update software** regularly

### Monitoring

- Monitor motor temperatures
- Check for unusual vibrations
- Log all motor movements
- Track system performance

For technical support or questions about the motor control system, please refer to the main project documentation or create an issue in the repository.
