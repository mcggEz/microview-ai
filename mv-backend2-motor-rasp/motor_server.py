#!/usr/bin/env python3
"""
Motor Control Server (Raspberry Pi Edition)
Handles motor movements for automated sample positioning
Works with Arduino stepper motors via Serial (Auto-detection) or RPi GPIO
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
    import serial.tools.list_ports
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

# Configure logging
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
ARDUINO_BAUD = 9600
arduino_serial = None
USE_ARDUINO = True

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["*"]}})

# GPIO pin configuration for stepper motors (BCM numbering)
MOTOR_PINS = {
    'x': {'step': 17, 'dir': 18, 'enable': 27},
    'y': {'step': 22, 'dir': 23, 'enable': 24},
    'z': {'step': 25, 'dir': 8, 'enable': 7}
}

STEPS_PER_MM = {'x': 100, 'y': 100, 'z': 200}

GRID_PARAMS = {
    'lpf': {'start_x': 2, 'end_x': 26, 'start_y': 2, 'end_y': 8, 'cols': 5, 'rows': 2},
    'hpf': {'start_x': 1, 'end_x': 9, 'start_y': 1, 'end_y': 3, 'cols': 5, 'rows': 2}
}

def generate_sample_positions(method='longitudinal'):
    positions = {}
    for field_type, params in GRID_PARAMS.items():
        cols, rows = params['cols'], params['rows']
        total_samples = cols * rows
        x_spacing = (params['end_x'] - params['start_x']) / max(cols - 1, 1)
        y_spacing = (params['end_y'] - params['start_y']) / max(rows - 1, 1)

        if method == 'battlement':
            sample_num = 1
            for i in range(total_samples // 2):
                x = params['start_x'] + i * x_spacing
                if i % 2 == 0:
                    positions[f'{field_type}_{sample_num}'] = {'x': x, 'y': params['start_y'], 'z': 0}
                    sample_num += 1
                    positions[f'{field_type}_{sample_num}'] = {'x': x, 'y': params['end_y'], 'z': 0}
                else:
                    positions[f'{field_type}_{sample_num}'] = {'x': x, 'y': params['end_y'], 'z': 0}
                    sample_num += 1
                    positions[f'{field_type}_{sample_num}'] = {'x': x, 'y': params['start_y'], 'z': 0}
                sample_num += 1
        else: # longitudinal
            sample_num = 1
            for row in range(rows):
                y = params['start_y'] + row * y_spacing
                col_range = range(cols - 1, -1, -1) if row % 2 == 1 else range(cols)
                for col in col_range:
                    x = params['start_x'] + col * x_spacing
                    positions[f'{field_type}_{sample_num}'] = {'x': x, 'y': y, 'z': 0}
                    sample_num += 1
    positions['lpf'] = {'x': 0, 'y': 0, 'z': 0}
    return positions

scan_config = {'method': 'longitudinal'}
SAMPLE_POSITIONS = generate_sample_positions('longitudinal')
current_position = {'x': 0.0, 'y': 0.0, 'z': 0.0}
current_sample = None
is_initialized = False

def find_arduino_port():
    logger.info("Auto-detecting Arduino port...")
    ports = list(serial.tools.list_ports.comports())
    # Prefer TTYACM (USB) on Linux, COM on Windows
    ports.sort(key=lambda p: (
        not ('ACM' in p.device.upper() or 'USB' in p.device.upper()),
        p.device
    ))
    
    for port in ports:
        if 'bluetooth' in port.description.lower() or 'bth' in port.description.lower():
            continue
        logger.info(f"Probing {port.device} ({port.description})...")
        try:
            # Check if port is already open
            ser = serial.Serial(port.device, ARDUINO_BAUD, timeout=2)
            time.sleep(2) # Bootloader delay
            ser.reset_input_buffer()
            ser.write(b"STATUS\n")
            ser.flush()
            time.sleep(0.5)
            if ser.in_waiting > 0:
                resp = ser.readline().decode('utf-8', errors='ignore').strip().lower()
                if any(x in resp for x in ["ok", "status", "ready", "system", "pos", "x:", "y:"]):
                    logger.info(f"✓ Arduino confirmed on {port.device}")
                    return ser
            ser.close()
        except (serial.SerialException, OSError) as e:
            logger.debug(f"Port {port.device} skipped: {e}")
            continue
    return None

def initialize_arduino():
    global arduino_serial, is_initialized
    if not SERIAL_AVAILABLE: return False
    if arduino_serial and arduino_serial.is_open: return True
    
    arduino_serial = find_arduino_port()
    if arduino_serial:
        is_initialized = True
        return True
    
    logger.error("No Arduino found.")
    is_initialized = False
    return False

def send_arduino_command(command, timeout=15):
    if not arduino_serial or not arduino_serial.is_open: return None
    try:
        arduino_serial.reset_input_buffer()
        arduino_serial.write(f"{command}\n".encode())
        arduino_serial.flush()
        start = time.time()
        while (time.time() - start) < timeout:
            if arduino_serial.in_waiting > 0:
                line = arduino_serial.readline().decode('utf-8', errors='ignore').strip()
                if any(x in line.upper() for x in ["OK", "DONE", "SUCCESS", "ARRIVED"]):
                    logger.info(f"Hardware confirms: {command}")
                    return line
            time.sleep(0.01)
        return "timeout"
    except Exception as e:
        logger.error(f"Hardware error: {e}")
        return None

def initialize_gpio():
    global is_initialized
    if not GPIO_AVAILABLE: return
    try:
        GPIO.setmode(GPIO.BCM)
        for pins in MOTOR_PINS.values():
            GPIO.setup(pins['step'], GPIO.OUT)
            GPIO.setup(pins['dir'], GPIO.OUT)
            GPIO.setup(pins['enable'], GPIO.OUT)
            GPIO.output(pins['enable'], GPIO.HIGH)
        is_initialized = True
    except: is_initialized = False

def control_stepper_motor(axis, steps):
    if not is_initialized or not GPIO_AVAILABLE: return
    pins = MOTOR_PINS[axis]
    GPIO.output(pins['enable'], GPIO.LOW)
    GPIO.output(pins['dir'], GPIO.HIGH if steps > 0 else GPIO.LOW)
    for _ in range(abs(steps)):
        GPIO.output(pins['step'], GPIO.HIGH)
        time.sleep(0.0005)
        GPIO.output(pins['step'], GPIO.LOW)
        time.sleep(0.0005)
    GPIO.output(pins['enable'], GPIO.HIGH)
    current_position[axis] += steps / STEPS_PER_MM[axis]

def move_to_position(x, y, z):
    if USE_ARDUINO and is_initialized:
        send_arduino_command(f"MOVE {x},{y}")
        current_position['x'], current_position['y'] = x, y
    else:
        steps_x = int((x - current_position['x']) * STEPS_PER_MM['x'])
        steps_y = int((y - current_position['y']) * STEPS_PER_MM['y'])
        if steps_x != 0: control_stepper_motor('x', steps_x)
        if steps_y != 0: control_stepper_motor('y', steps_y)
    current_position['z'] = z

def home_motors():
    if USE_ARDUINO and is_initialized:
        send_arduino_command("HOME")
    else:
        control_stepper_motor('x', -50 * STEPS_PER_MM['x'])
        control_stepper_motor('y', -50 * STEPS_PER_MM['y'])
    current_position['x'] = current_position['y'] = current_position['z'] = 0.0

@app.route('/status', methods=['GET'])
def get_status():
    return jsonify({'status': 'ready', 'position': current_position, 'sample': current_sample})

@app.route('/configure_scan', methods=['POST'])
def configure_scan():
    global SAMPLE_POSITIONS, scan_config
    method = request.json.get('method', 'longitudinal').lower()
    scan_config['method'] = method
    SAMPLE_POSITIONS = generate_sample_positions(method)
    return jsonify({'status': 'success', 'method': method})

@app.route('/get_samples', methods=['POST'])
def get_samples():
    global current_sample
    home_motors()
    current_sample = 'lpf_1'
    target = SAMPLE_POSITIONS[current_sample]
    move_to_position(target['x'], target['y'], target['z'])
    return jsonify({'status': 'success', 'sample': current_sample, 'ready_for_capture': True})

@app.route('/next_sample', methods=['POST'])
def next_sample():
    global current_sample
    if not current_sample: return jsonify({'status': 'error'}), 400
    
    if current_sample == 'lpf_10':
        return jsonify({'status': 'switch_objective', 'next_sample': 'hpf_1'})
    
    # Simple increment logic for demo
    parts = current_sample.split('_')
    num = int(parts[1])
    if num >= 10:
        if parts[0] == 'lpf': current_sample = 'hpf_1'
        else: return jsonify({'status': 'complete'})
    else:
        current_sample = f"{parts[0]}_{num + 1}"
    
    target = SAMPLE_POSITIONS[current_sample]
    move_to_position(target['x'], target['y'], target['z'])
    return jsonify({'status': 'success', 'sample': current_sample, 'ready_for_capture': True})

if __name__ == '__main__':
    if USE_ARDUINO: initialize_arduino()
    else: initialize_gpio()
    app.run(host='0.0.0.0', port=3001)
