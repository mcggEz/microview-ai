#!/usr/bin/env python3
"""
Motor Control Server
Handles motor movements for automated sample positioning
Works with Arduino servo motors on Windows or Raspberry Pi stepper motors
"""

from flask import Flask, request, jsonify 
from flask_cors import CORS
import time
import os
import json
import logging
import platform
from datetime import datetime

# Try to import serial for Arduino communication
try:
    import serial
    SERIAL_AVAILABLE = True
except ImportError:
    SERIAL_AVAILABLE = False
    print("Warning: pyserial not installed. Install with: pip install pyserial")

# Try to import RPi.GPIO (only available on Raspberry Pi)
try:
    import RPi.GPIO as GPIO
    GPIO_AVAILABLE = True
except (ImportError, RuntimeError):
    GPIO_AVAILABLE = False
    GPIO = None

# Configure logging - write log next to this script (works on Windows and Raspberry Pi)
log_path = 'motor_server.log'
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_path),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Arduino configuration
# On Raspberry Pi the Arduino is wired to use this fixed port.
ARDUINO_PORT = '/dev/ttyACM0'
ARDUINO_BAUD = 9600
arduino_serial = None
USE_ARDUINO = True  # Keep using Arduino servos on the Pi

app = Flask(__name__)
# Enable CORS for all routes to allow Next.js frontend to access the API
CORS(app, resources={r"/*": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000"]}})

# GPIO pin configuration for stepper motors (BCM numbering)
MOTOR_PINS = {
    'x': {'step': 17, 'dir': 18, 'enable': 27},
    'y': {'step': 22, 'dir': 23, 'enable': 24},
    'z': {'step': 25, 'dir': 8, 'enable': 7}
}

# Motor configuration (steps per mm)
STEPS_PER_MM = {
    'x': 100,
    'y': 100,
    'z': 200
}

# Sample positions (in mm from home position)
# 10 LPF positions and 10 HPF positions for complete sample collection
SAMPLE_POSITIONS = {
    'lpf': {'x': 0, 'y': 0, 'z': 0},      # Home position for LPF
    
    # LPF Sample positions (10 samples)
    'lpf_1': {'x': 2, 'y': 2, 'z': 0},
    'lpf_2': {'x': 8, 'y': 2, 'z': 0},
    'lpf_3': {'x': 14, 'y': 2, 'z': 0},
    'lpf_4': {'x': 20, 'y': 2, 'z': 0},
    'lpf_5': {'x': 26, 'y': 2, 'z': 0},
    'lpf_6': {'x': 2, 'y': 8, 'z': 0},
    'lpf_7': {'x': 8, 'y': 8, 'z': 0},
    'lpf_8': {'x': 14, 'y': 8, 'z': 0},
    'lpf_9': {'x': 20, 'y': 8, 'z': 0},
    'lpf_10': {'x': 26, 'y': 8, 'z': 0},
    
    # HPF Sample positions (10 samples) - higher magnification, smaller movements
    'hpf_1': {'x': 1, 'y': 1, 'z': 0},
    'hpf_2': {'x': 3, 'y': 1, 'z': 0},
    'hpf_3': {'x': 5, 'y': 1, 'z': 0},
    'hpf_4': {'x': 7, 'y': 1, 'z': 0},
    'hpf_5': {'x': 9, 'y': 1, 'z': 0},
    'hpf_6': {'x': 1, 'y': 3, 'z': 0},
    'hpf_7': {'x': 3, 'y': 3, 'z': 0},
    'hpf_8': {'x': 5, 'y': 3, 'z': 0},
    'hpf_9': {'x': 7, 'y': 3, 'z': 0},
    'hpf_10': {'x': 9, 'y': 3, 'z': 0},
}

# Current position (in mm for stepper motors, degrees for servos)
current_position = {'x': 0.0, 'y': 0.0, 'z': 0.0}
current_sample = None
is_initialized = False

# Servo configuration (for Arduino)
SERVO_CENTER = 90  # Center position in degrees
SERVO_MIN = 0
SERVO_MAX = 180
# Conversion: 1mm movement = ~3 degrees servo movement (adjust as needed)
MM_TO_DEGREES = 3.0

def send_arduino_command(command):
    """Send command to Arduino via serial"""
    global arduino_serial
    
    if not arduino_serial or not arduino_serial.is_open:
        logger.error("Arduino not connected")
        return None
    
    try:
        logger.debug(f"Sending to Arduino: {command}")
        arduino_serial.write(f"{command}\n".encode())
        arduino_serial.flush()
        time.sleep(0.1)  # Small delay for Arduino to process
        
        # Read response if available
        response = ""
        if arduino_serial.in_waiting > 0:
            response = arduino_serial.readline().decode().strip()
            logger.debug(f"Arduino response: {response}")
        
        return response
    except Exception as e:
        logger.error(f"Error sending command to Arduino: {e}")
        return None

def initialize_arduino():
    """Initialize Arduino serial connection"""
    global arduino_serial, is_initialized
    
    if not SERIAL_AVAILABLE:
        logger.error("pyserial not available. Install with: pip install pyserial")
        is_initialized = False
        return False
    
    try:
        logger.info(f"Connecting to Arduino on {ARDUINO_PORT} at {ARDUINO_BAUD} baud...")
        arduino_serial = serial.Serial(ARDUINO_PORT, ARDUINO_BAUD, timeout=2)
        time.sleep(2)  # Wait for Arduino to initialize
        logger.info("Arduino connected successfully")
        
        # Clear any pending data
        if arduino_serial.in_waiting > 0:
            arduino_serial.reset_input_buffer()
        
        # Test connection by sending STATUS command
        send_arduino_command("STATUS")
        time.sleep(0.5)
        
        is_initialized = True
        return True
    except serial.SerialException as e:
        error_msg = str(e)
        logger.error(f"Failed to connect to Arduino: {e}")
        
        # Check for specific error types
        if "PermissionError" in error_msg or "Access is denied" in error_msg or "could not open port" in error_msg.lower():
            logger.error("=" * 60)
            logger.error("COM PORT IS LOCKED BY ANOTHER PROGRAM!")
            logger.error("=" * 60)
            logger.error("SOLUTION:")
            logger.error("  1. Close Arduino IDE Serial Monitor (if open)")
            logger.error("  2. Close any other programs using COM7")
            logger.error("  3. Unplug and replug Arduino USB cable")
            logger.error("  4. Restart this server")
            logger.error("=" * 60)
        elif "could not open port" in error_msg.lower():
            logger.error(f"Port {ARDUINO_PORT} not found. Check:")
            logger.error("  - Arduino is connected via USB")
            logger.error("  - Correct COM port (check Device Manager)")
            logger.error(f"  - Port name in code matches actual port")
        else:
            logger.error(f"Make sure Arduino is connected to {ARDUINO_PORT}")
        
        is_initialized = False
        return False
    except PermissionError as e:
        logger.error("=" * 60)
        logger.error("PERMISSION DENIED - COM PORT IS LOCKED!")
        logger.error("=" * 60)
        logger.error("Another program is using COM7. Please:")
        logger.error("  1. Close Arduino IDE Serial Monitor")
        logger.error("  2. Close any other serial terminal programs")
        logger.error("  3. Unplug and replug Arduino USB")
        logger.error("  4. Restart this server")
        logger.error("=" * 60)
        is_initialized = False
        return False
    except Exception as e:
        logger.error(f"Arduino initialization error: {e}")
        logger.error(f"Error type: {type(e).__name__}")
        is_initialized = False
        return False

def initialize_gpio():
    """Initialize GPIO pins for motor control (Raspberry Pi only)"""
    global is_initialized
    
    if not USE_ARDUINO and GPIO_AVAILABLE:
        if is_initialized:
            logger.info("GPIO already initialized")
            return

        logger.info("Starting GPIO initialization...")
        
        if not os.path.exists('/sys/class/gpio'):
            logger.warning("GPIO not available. Running in simulation mode.")
            is_initialized = True
            return

        try:
            logger.info("Setting GPIO mode to BCM")
            GPIO.setmode(GPIO.BCM)
            
            for axis, pins in MOTOR_PINS.items():
                logger.info(f"Setting up {axis} motor pins: step={pins['step']}, dir={pins['dir']}, enable={pins['enable']}")
                GPIO.setup(pins['step'], GPIO.OUT)
                GPIO.setup(pins['dir'], GPIO.OUT)
                GPIO.setup(pins['enable'], GPIO.OUT)
                GPIO.output(pins['enable'], GPIO.HIGH)  # Disable motors initially
                logger.info(f"{axis} motor pins configured and disabled")

            is_initialized = True
            logger.info("GPIO initialization completed successfully")
        except Exception as e:
            logger.error(f"GPIO initialization failed: {e}")
            is_initialized = True  # Continue in simulation mode

def mm_to_servo_degrees(mm_value):
    """Convert mm position to servo degrees"""
    # Center (0mm) = 90 degrees
    # Scale: 1mm = MM_TO_DEGREES degrees
    degrees = SERVO_CENTER + (mm_value * MM_TO_DEGREES)
    # Constrain to valid servo range
    return max(SERVO_MIN, min(SERVO_MAX, degrees))

def cleanup_gpio():
    """Clean up GPIO resources and Arduino connection"""
    global arduino_serial
    
    # Close Arduino connection
    if arduino_serial and arduino_serial.is_open:
        try:
            arduino_serial.close()
            logger.info("Arduino connection closed")
        except:
            pass
    
    # Cleanup GPIO if available
    if GPIO_AVAILABLE and os.path.exists('/sys/class/gpio'):
        try:
            GPIO.cleanup()
            logger.info("GPIO cleaned up")
        except:
            pass

def control_stepper_motor(axis, steps, speed_delay_us=500):
    """Control a stepper motor for specified steps"""
    logger.info(f"Starting motor control: {axis} axis, {steps} steps, {speed_delay_us}μs delay")
    
    if not is_initialized:
        logger.warning(f"GPIO not initialized. Simulating motor control for {axis} by {steps} steps.")
        time.sleep(abs(steps) * 0.001)  # Simulate movement time
        logger.info(f"Simulated movement completed for {axis}")
        return

    pins = MOTOR_PINS[axis]
    direction = GPIO.HIGH if steps > 0 else GPIO.LOW
    step_count = abs(steps)
    
    logger.info(f"Motor {axis} configuration: pins={pins}, direction={'HIGH' if direction else 'LOW'}, steps={step_count}")

    try:
        logger.info(f"Enabling {axis} motor")
        GPIO.output(pins['enable'], GPIO.LOW)  # Enable motor
        GPIO.output(pins['dir'], direction)
        
        logger.info(f"Starting {step_count} steps for {axis} motor")
        for i in range(step_count):
            GPIO.output(pins['step'], GPIO.HIGH)
            time.sleep(speed_delay_us / 1_000_000.0)
            GPIO.output(pins['step'], GPIO.LOW)
            time.sleep(speed_delay_us / 1_000_000.0)
            
            # Log progress every 100 steps
            if (i + 1) % 100 == 0:
                logger.info(f"{axis} motor: {i + 1}/{step_count} steps completed")

        logger.info(f"Disabling {axis} motor")
        GPIO.output(pins['enable'], GPIO.HIGH)  # Disable motor

        # Update position
        delta_mm = steps / STEPS_PER_MM[axis]
        current_position[axis] += delta_mm
        logger.info(f"Motor {axis} movement completed: {delta_mm:.2f}mm. Current position: {current_position}")
        
    except Exception as e:
        logger.error(f"Error controlling motor {axis}: {e}")
        raise

def move_to_position(target_x, target_y, target_z):
    """Move to absolute position"""
    logger.info(f"Starting movement to position: x={target_x}, y={target_y}, z={target_z}")
    logger.info(f"Current position: {current_position}")
    
    if USE_ARDUINO and is_initialized:
        # Use Arduino servos (X and Y only, Z not supported by servos)
        servo_x = mm_to_servo_degrees(target_x)
        servo_y = mm_to_servo_degrees(target_y)
        
        logger.info(f"Moving servos to: X={servo_x:.1f}°, Y={servo_y:.1f}°")
        command = f"MOVE {servo_x:.1f},{servo_y:.1f}"
        send_arduino_command(command)
        
        # Update position
        current_position['x'] = target_x
        current_position['y'] = target_y
        current_position['z'] = target_z  # Z not controlled by servos
        
        time.sleep(0.5)  # Wait for movement to complete
        logger.info(f"Movement completed. Final position: {current_position}")
    else:
        # Log why we're not using Arduino
        if not USE_ARDUINO:
            logger.warning("USE_ARDUINO is False - using stepper motors instead")
        elif not is_initialized:
            logger.error("Arduino not initialized! Check if Arduino is connected to COM7 and restart the server.")
            logger.error("Falling back to stepper motor simulation (no actual movement)")
        # Use stepper motors (Raspberry Pi)
        # Calculate steps needed for each axis
        steps_x = int((target_x - current_position['x']) * STEPS_PER_MM['x'])
        steps_y = int((target_y - current_position['y']) * STEPS_PER_MM['y'])
        steps_z = int((target_z - current_position['z']) * STEPS_PER_MM['z'])
        
        logger.info(f"Calculated steps: x={steps_x}, y={steps_y}, z={steps_z}")
        
        # Move motors
        if steps_x != 0:
            logger.info(f"Moving X axis by {steps_x} steps")
            control_stepper_motor('x', steps_x)
        else:
            logger.info("X axis already at target position")
            
        if steps_y != 0:
            logger.info(f"Moving Y axis by {steps_y} steps")
            control_stepper_motor('y', steps_y)
        else:
            logger.info("Y axis already at target position")
            
        if steps_z != 0:
            logger.info(f"Moving Z axis by {steps_z} steps")
            control_stepper_motor('z', steps_z)
        else:
            logger.info("Z axis already at target position")
        
        logger.info(f"Movement completed. Final position: {current_position}")

def home_motors():
    """Home all motors to zero position"""
    logger.info("Starting motor homing sequence...")
    
    if USE_ARDUINO and is_initialized:
        # Use Arduino HOME command
        logger.info("Sending HOME command to Arduino")
        send_arduino_command("HOME")
        time.sleep(1)  # Wait for homing to complete
        
        # Reset position to zero
        current_position['x'] = 0.0
        current_position['y'] = 0.0
        current_position['z'] = 0.0
        
        logger.info("Motor homing sequence completed successfully")
        logger.info(f"Motors homed. Position reset to: {current_position}")
    else:
        # Log why we're not using Arduino
        if not USE_ARDUINO:
            logger.warning("USE_ARDUINO is False - using stepper motors instead")
        elif not is_initialized:
            logger.error("Arduino not initialized! Check if Arduino is connected to COM7 and restart the server.")
            logger.error("Falling back to stepper motor simulation (no actual movement)")
        # Use stepper motors (Raspberry Pi)
        # Move to negative positions to find home
        logger.info("Moving X axis to home position")
        control_stepper_motor('x', -50 * STEPS_PER_MM['x'])
        
        logger.info("Moving Y axis to home position")
        control_stepper_motor('y', -50 * STEPS_PER_MM['y'])
        
        logger.info("Moving Z axis to home position")
        control_stepper_motor('z', -20 * STEPS_PER_MM['z'])
        
        # Reset position to zero
        current_position['x'] = 0.0
        current_position['y'] = 0.0
        current_position['z'] = 0.0
        
        logger.info("Motor homing sequence completed successfully")
        logger.info(f"Motors homed. Position reset to: {current_position}")

@app.route('/status', methods=['GET'])
def get_status():
    """Get current motor status"""
    logger.info("Status request received")
    status_data = {
        'status': 'ready',
        'current_position': current_position,
        'current_sample': current_sample,
        'timestamp': datetime.now().isoformat()
    }
    logger.info(f"Status response: {status_data}")
    return jsonify(status_data)

@app.route('/home', methods=['POST'])
def home_motors_endpoint():
    """Home all motors"""
    try:
        home_motors()
        return jsonify({
            'status': 'success',
            'message': 'Motors homed successfully',
            'position': current_position
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/move_to', methods=['POST'])
def move_to_position_endpoint():
    """Move to absolute position"""
    try:
        data = request.json
        target_x = data.get('x', current_position['x'])
        target_y = data.get('y', current_position['y'])
        target_z = data.get('z', current_position['z'])
        
        move_to_position(target_x, target_y, target_z)
        
        return jsonify({
            'status': 'success',
            'message': 'Moved to position',
            'position': current_position
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/get_samples', methods=['POST'])
def get_samples_routine():
    """
    Initialize sample collection:
    - Home motors
    - Move to the first LPF sample (lpf_1)
    - Return a single-step status payload
    
    Subsequent samples should be requested via /next_sample.
    """
    global current_sample
    logger.info("=== GET SAMPLES ROUTINE (STEP 1) STARTED ===")
    try:
        logger.info("Starting 'Get Samples' routine (home + first sample)...")

        # Step 1: Home motors first
        logger.info("Step 1: Homing motors")
        home_motors()
        time.sleep(1)  # Wait for homing to complete

        # Step 2: Move to first LPF sample only
        sample_num = 1
        sample_name = f'lpf_{sample_num}'
        logger.info("Step 2: Moving to first LPF sample (lpf_1)")

        target_pos = SAMPLE_POSITIONS.get(sample_name)
        if not target_pos:
            error_msg = f"Sample position {sample_name} not defined"
            logger.error(error_msg)
            return jsonify({
                'status': 'error',
                'message': error_msg
            }), 500

        logger.info(f"Target position for {sample_name}: {target_pos}")

        # Move to sample position
        if USE_ARDUINO and is_initialized:
            # Use Arduino SAMPLE command for direct positioning
            logger.info(f"Sending SAMPLE command to Arduino: {sample_name}")
            send_arduino_command(f"SAMPLE {sample_name}")
            time.sleep(0.5)  # Wait for Arduino to process
        else:
            logger.info(
                f"Moving to position: x={target_pos['x']}, y={target_pos['y']}, z={target_pos['z']}"
            )
            move_to_position(target_pos['x'], target_pos['y'], target_pos['z'])

        # Update current sample
        current_sample = sample_name
        logger.info(f"Current sample updated to: {current_sample}")
        logger.info("✓ Successfully moved to first LPF sample (1/10)")

        # Build response consistent with /next_sample
        field_type = 'lpf'
        total_samples = 10
        response = {
            'status': 'success',
            'message': f'{field_type.upper()} sample {sample_num}/{total_samples} ready for capture',
            'sample': sample_name,
            'sample_number': sample_num,
            'total_samples': total_samples,
            'field_type': field_type,
            'position': current_position,
            'ready_for_capture': True
        }

        logger.info(f"Get samples (step 1) completed successfully. Response: {response}")
        logger.info("=== GET SAMPLES ROUTINE (STEP 1) COMPLETED ===")
        return jsonify(response)

    except Exception as e:
        logger.error(f"Error in get_samples routine: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/next_sample', methods=['POST'])
def next_sample():
    """Move to next sample position in sequence"""
    global current_sample
    logger.info("=== NEXT SAMPLE REQUEST ===")
    try:
        logger.info(f"Current sample: {current_sample}")
        
        if not current_sample:
            logger.error("No current sample. User must run /get_samples first.")
            return jsonify({
                'status': 'error',
                'message': 'No current sample. Please run /get_samples first.'
            }), 400
        
        # Determine next sample in sequence
        logger.info("Determining next sample in sequence...")
        next_sample_name = get_next_sample_in_sequence(current_sample)
        logger.info(f"Next sample determined: {next_sample_name}")
        
        if not next_sample_name:
            logger.info("All samples completed!")
            return jsonify({
                'status': 'complete',
                'message': 'All samples completed',
                'sample': current_sample,
                'position': current_position,
                'ready_for_capture': False
            })
        
        # Move to next sample position
        logger.info(f"Moving to next sample: {next_sample_name}")
        target_pos = SAMPLE_POSITIONS[next_sample_name]
        logger.info(f"Target position: {target_pos}")
        
        if USE_ARDUINO and is_initialized:
            # Use Arduino SAMPLE command for direct positioning
            send_arduino_command(f"SAMPLE {next_sample_name}")
            time.sleep(0.5)
        else:
            move_to_position(target_pos['x'], target_pos['y'], target_pos['z'])
        
        current_sample = next_sample_name
        logger.info(f"Current sample updated to: {current_sample}")
        
        # Determine field type and sample number
        field_type = 'lpf' if next_sample_name.startswith('lpf') else 'hpf'
        sample_number = int(next_sample_name.split('_')[1])
        
        response = {
            'status': 'success',
            'message': f'{field_type.upper()} sample {sample_number}/10 ready for capture',
            'sample': next_sample_name,
            'sample_number': sample_number,
            'total_samples': 10,
            'field_type': field_type,
            'position': current_position,
            'ready_for_capture': True
        }
        
        logger.info(f"Next sample positioned successfully. Response: {response}")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error in next_sample: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

def get_next_sample_in_sequence(current_sample_name):
    """Get the next sample in the sequence"""
    if current_sample_name == 'lpf_10':
        return 'hpf_1'  # After LPF 10, move to HPF 1
    elif current_sample_name == 'hpf_10':
        return None    # All samples completed
    elif current_sample_name.startswith('lpf_'):
        # Get next LPF sample
        current_num = int(current_sample_name.split('_')[1])
        return f'lpf_{current_num + 1}'
    elif current_sample_name.startswith('hpf_'):
        # Get next HPF sample
        current_num = int(current_sample_name.split('_')[1])
        return f'hpf_{current_num + 1}'
    else:
        return 'lpf_1'  # Default to first LPF sample

@app.route('/sync_mode', methods=['POST'])
def sync_mode():
    """Sync motor state with frontend LPF/HPF mode"""
    logger.info("=== SYNC MODE REQUEST ===")
    try:
        data = request.json
        frontend_mode = data.get('mode', '').lower()
        current_sample_num = data.get('sample_number', 1)
        
        logger.info(f"Frontend mode: {frontend_mode}")
        logger.info(f"Frontend sample number: {current_sample_num}")
        logger.info(f"Current motor sample: {current_sample}")
        
        # Validate mode
        if frontend_mode not in ['lpf', 'hpf']:
            logger.error(f"Invalid mode: {frontend_mode}")
            return jsonify({
                'status': 'error',
                'message': f'Invalid mode: {frontend_mode}. Must be "lpf" or "hpf"'
            }), 400
        
        # Determine target sample based on frontend state
        target_sample = f"{frontend_mode}_{current_sample_num}"
        logger.info(f"Target sample determined: {target_sample}")
        
        # Check if target sample exists
        if target_sample not in SAMPLE_POSITIONS:
            logger.error(f"Target sample not found: {target_sample}")
            return jsonify({
                'status': 'error',
                'message': f'Sample position {target_sample} not found'
            }), 400
        
        # Check if we need to move
        if current_sample == target_sample:
            logger.info(f"Already at target sample: {target_sample}")
            return jsonify({
                'status': 'success',
                'message': f'Already positioned at {target_sample}',
                'sample': target_sample,
                'sample_number': current_sample_num,
                'field_type': frontend_mode,
                'position': current_position,
                'ready_for_capture': True
            })
        
        # Move to target position
        logger.info(f"Moving to target sample: {target_sample}")
        target_pos = SAMPLE_POSITIONS[target_sample]
        logger.info(f"Target position: {target_pos}")
        
        if USE_ARDUINO and is_initialized:
            # Use Arduino SAMPLE command for direct positioning
            send_arduino_command(f"SAMPLE {target_sample}")
            time.sleep(0.5)
        else:
            move_to_position(target_pos['x'], target_pos['y'], target_pos['z'])
        
        # Update current sample
        current_sample = target_sample
        logger.info(f"Current sample updated to: {current_sample}")
        
        # Prepare response
        response = {
            'status': 'success',
            'message': f'{frontend_mode.upper()} sample {current_sample_num}/10 positioned',
            'sample': target_sample,
            'sample_number': current_sample_num,
            'total_samples': 10,
            'field_type': frontend_mode,
            'position': current_position,
            'ready_for_capture': True
        }
        
        logger.info(f"Mode sync completed successfully. Response: {response}")
        logger.info("=== SYNC MODE COMPLETED ===")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error in sync_mode: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/configure_microscope', methods=['POST'])
def configure_microscope():
    """Configure microscope by running motors based on request"""
    global current_sample
    logger.info("=== CONFIGURE MICROSCOPE REQUEST ===")
    try:
        data = request.json
        configuration = data.get('configuration', {})
        
        logger.info(f"Configuration request: {configuration}")
        
        # Extract configuration parameters
        target_mode = configuration.get('mode', 'lpf').lower()
        target_sample = configuration.get('sample_number', 1)
        focus_adjustment = configuration.get('focus_adjustment', 0)  # Z-axis adjustment
        brightness_position = configuration.get('brightness_position', 0)  # Additional positioning
        
        logger.info(f"Target mode: {target_mode}")
        logger.info(f"Target sample: {target_sample}")
        logger.info(f"Focus adjustment: {focus_adjustment}mm")
        logger.info(f"Brightness position: {brightness_position}mm")
        
        # Validate mode
        if target_mode not in ['lpf', 'hpf']:
            logger.error(f"Invalid mode: {target_mode}")
            return jsonify({
                'status': 'error',
                'message': f'Invalid mode: {target_mode}. Must be "lpf" or "hpf"'
            }), 400
        
        # Determine target sample position
        target_sample_name = f"{target_mode}_{target_sample}"
        logger.info(f"Target sample name: {target_sample_name}")
        
        if target_sample_name not in SAMPLE_POSITIONS:
            logger.error(f"Target sample not found: {target_sample_name}")
            return jsonify({
                'status': 'error',
                'message': f'Sample position {target_sample_name} not found'
            }), 400
        
        # Get base position and apply adjustments
        base_pos = SAMPLE_POSITIONS[target_sample_name]
        target_x = base_pos['x'] + brightness_position
        target_y = base_pos['y']
        target_z = base_pos['z'] + focus_adjustment
        
        logger.info(f"Base position: {base_pos}")
        logger.info(f"Adjusted target position: x={target_x}, y={target_y}, z={target_z}")
        
        # Step 1: Move to target sample position
        logger.info("Step 1: Moving to target sample position")
        move_to_position(target_x, target_y, target_z)
        
        # Step 2: Fine-tune focus if needed
        if focus_adjustment != 0:
            logger.info(f"Step 2: Fine-tuning focus by {focus_adjustment}mm")
            control_stepper_motor('z', int(focus_adjustment * STEPS_PER_MM['z']))
        
        # Step 3: Apply brightness positioning if needed
        if brightness_position != 0:
            logger.info(f"Step 3: Applying brightness positioning by {brightness_position}mm")
            control_stepper_motor('x', int(brightness_position * STEPS_PER_MM['x']))
        
        # Update current sample
        current_sample = target_sample_name
        logger.info(f"Current sample updated to: {current_sample}")
        
        # Prepare response
        response = {
            'status': 'success',
            'message': f'Microscope configured for {target_mode.upper()} sample {target_sample}',
            'configuration': {
                'mode': target_mode,
                'sample_number': target_sample,
                'sample_name': target_sample_name,
                'focus_adjustment': focus_adjustment,
                'brightness_position': brightness_position
            },
            'position': current_position,
            'ready_for_capture': True
        }
        
        logger.info(f"Microscope configuration completed. Response: {response}")
        logger.info("=== CONFIGURE MICROSCOPE COMPLETED ===")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error in configure_microscope: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/emergency_stop', methods=['POST'])
def emergency_stop():
    """Emergency stop all motors"""
    logger.info("=== EMERGENCY STOP REQUESTED ===")
    try:
        if USE_ARDUINO and is_initialized:
            # For Arduino, we can send HOME to stop movement
            send_arduino_command("HOME")
            logger.info("Emergency stop sent to Arduino")
        elif GPIO_AVAILABLE:
            # Disable all motors immediately (Raspberry Pi)
            for axis, pins in MOTOR_PINS.items():
                if is_initialized:
                    logger.info(f"Disabling {axis} motor")
                    GPIO.output(pins['enable'], GPIO.HIGH)  # Disable motor
        
        logger.info("Emergency stop executed successfully")
        return jsonify({
            'status': 'success',
            'message': 'Emergency stop executed',
            'position': current_position
        })
    except Exception as e:
        logger.error(f"Error in emergency stop: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    logger.info("=" * 50)
    logger.info("Starting Motor Control Server...")
    logger.info(f"Platform: {platform.system()}")
    logger.info("=" * 50)
    
    # Initialize motors based on configuration
    if USE_ARDUINO:
        logger.info("Using Arduino servo motors")
        logger.info(f"Attempting to connect to Arduino on {ARDUINO_PORT}...")
        if not initialize_arduino():
            logger.error("=" * 50)
            logger.error("ARDUINO INITIALIZATION FAILED!")
            logger.error("Possible reasons:")
            logger.error(f"  1. Arduino not connected to {ARDUINO_PORT}")
            logger.error("  2. Wrong COM port (check Device Manager)")
            logger.error("  3. Arduino sketch not uploaded")
            logger.error("  4. Another program using the COM port")
            logger.error("=" * 50)
            logger.warning("Server will continue but motor control will be SIMULATED (no actual movement)")
        else:
            logger.info("✓ Arduino initialized successfully!")
    else:
        logger.info("Using Raspberry Pi GPIO stepper motors")
        initialize_gpio()
    
    try:
        logger.info("Server starting on http://127.0.0.1:3001")
        logger.info("Available endpoints:")
        logger.info("  GET  /status - Get current status")
        logger.info("  POST /home - Home all motors")
        logger.info("  POST /get_samples - Start sample collection")
        logger.info("  POST /next_sample - Move to next sample")
        logger.info("  POST /sync_mode - Sync with frontend LPF/HPF mode")
        logger.info("  POST /configure_microscope - Configure microscope with motors")
        logger.info("  POST /emergency_stop - Emergency stop")
        logger.info("=" * 50)
        
        app.run(host='127.0.0.1', port=3001, debug=False)
    except KeyboardInterrupt:
        logger.info("\nShutting down server...")
    except Exception as e:
        logger.error(f"Server error: {e}")
    finally:
        logger.info("Cleaning up...")
        cleanup_gpio()
        logger.info("Server shutdown complete")
