#!/usr/bin/env python3
"""
Raspberry Pi Motor Control Server
Handles motor movements for automated sample positioning
"""

from flask import Flask, request, jsonify
import RPi.GPIO as GPIO
import time
import os
import json
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/home/pi/desktop/motor_server.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

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

# Current position (in mm)
current_position = {'x': 0.0, 'y': 0.0, 'z': 0.0}
current_sample = None
is_initialized = False

def initialize_gpio():
    """Initialize GPIO pins for motor control"""
    global is_initialized
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

def cleanup_gpio():
    """Clean up GPIO resources"""
    if os.path.exists('/sys/class/gpio'):
        try:
            GPIO.cleanup()
            print("GPIO cleaned up.")
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
    """Execute the get samples routine - starts with LPF sample 1"""
    global current_sample
    logger.info("=== GET SAMPLES ROUTINE STARTED ===")
    try:
        logger.info("Starting 'Get Samples' routine...")
        
        # Step 1: Home motors first
        logger.info("Step 1: Homing motors")
        home_motors()
        
        # Step 2: Move to first LPF sample position
        logger.info("Step 2: Moving to LPF sample 1 position")
        lpf_1_pos = SAMPLE_POSITIONS['lpf_1']
        logger.info(f"Target LPF_1 position: {lpf_1_pos}")
        move_to_position(lpf_1_pos['x'], lpf_1_pos['y'], lpf_1_pos['z'])
        
        current_sample = 'lpf_1'
        logger.info(f"Current sample set to: {current_sample}")
        
        # Send response that first LPF sample is ready
        response = {
            'status': 'success',
            'message': 'LPF sample 1/10 ready for capture',
            'sample': 'lpf_1',
            'sample_number': 1,
            'total_samples': 10,
            'field_type': 'lpf',
            'position': current_position,
            'ready_for_capture': True
        }
        
        logger.info(f"LPF sample 1 positioned successfully. Response: {response}")
        logger.info("=== GET SAMPLES ROUTINE COMPLETED ===")
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
        # Disable all motors immediately
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
    logger.info("Starting Raspberry Pi Motor Control Server...")
    logger.info("=" * 50)
    
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
        logger.info("Cleaning up GPIO...")
        cleanup_gpio()
        logger.info("Server shutdown complete")
