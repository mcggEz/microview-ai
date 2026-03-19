#!/usr/bin/env python3
"""
Motor Control Server (Raspberry Pi Edition)
Same logic as the Laptop edition, with GPIO fallback for direct stepper control.
"""

import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import time
import os
import json

try:
    import serial
    import serial.tools.list_ports
    SERIAL_AVAILABLE = True
except ImportError:
    SERIAL_AVAILABLE = False

try:
    import RPi.GPIO as GPIO
    GPIO_AVAILABLE = True
except (ImportError, RuntimeError):
    GPIO_AVAILABLE = False
    GPIO = None

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler('motor_server_rasp.log'), logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["*"]}})

# --- CONFIG ---
ARDUINO_BAUD = 9600
MOTOR_PINS = {
    'x': {'step': 17, 'dir': 18, 'enable': 27},
    'y': {'step': 22, 'dir': 23, 'enable': 24},
}
STEPS_PER_UNIT = {'x': 400, 'y': 400}
CONFIG_FILE = 'motor_config.json'
COMMAND_TIMEOUT = 60

state = {'sensitivity': 1.0}
is_initialized = False
arduino_serial = None

# --- Scan state ---
scan = {
    'active': False,
    'field_type': 'lpf',
    'index': 0,
    'moves': [],
}

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                loaded = json.load(f)
                if 'sensitivity' in loaded:
                    state['sensitivity'] = float(loaded['sensitivity'])
            logger.info(f"Loaded sensitivity: {state['sensitivity']}")
        except Exception as e:
            logger.error(f"Error loading config: {e}")

def save_config():
    try:
        existing = {}
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, 'r') as f:
                existing = json.load(f)
        existing['sensitivity'] = state['sensitivity']
        with open(CONFIG_FILE, 'w') as f:
            json.dump(existing, f, indent=4)
    except Exception as e:
        logger.error(f"Error saving config: {e}")

load_config()

def generate_scan_moves(sensitivity):
    """Longitudinal strip (serpentine). Start at top-right, scan LEFT."""
    S = sensitivity
    moves = []
    for _ in range(4):
        moves.append((-S, 0))
    moves.append((0, S))
    for _ in range(4):
        moves.append((S, 0))
        return moves

def current_sample_name():
    if not scan['active']:
        return None
    return f"{scan['field_type']}_{scan['index']}"

# --- Hardware ---

def find_arduino_port():
    if not SERIAL_AVAILABLE:
        return None
    try:
        ports = list(serial.tools.list_ports.comports())
        ports.sort(key=lambda p: not any(name in (p.device + ' ' + p.description).upper()
                                         for name in ['USB', 'ARDUINO', 'CH340', 'ACM']))
        for port in ports:
            try:
                logger.info(f"Trying port {port.device} ({port.description})...")
                ser = serial.Serial(port.device, ARDUINO_BAUD, timeout=3)
                time.sleep(3)
                boot_lines = []
                while ser.in_waiting > 0:
                    boot_lines.append(ser.readline().decode('utf-8', errors='ignore').strip())
                if any("OK" in l.upper() for l in boot_lines):
                    logger.info(f"Arduino on {port.device} (boot)")
                    return ser
                ser.reset_input_buffer()
                ser.write(b"STATUS\n")
                ser.flush()
                line = ser.readline().decode('utf-8', errors='ignore').strip()
                if line and "OK" in line.upper():
                    logger.info(f"Arduino on {port.device} (STATUS)")
                    return ser
                ser.close()
            except Exception as e:
                logger.warning(f"  {port.device} failed: {e}")
                continue
    except Exception as e:
        logger.error(f"Port scan error: {e}")
    return None

def init_hw():
    global arduino_serial, is_initialized
    logger.info("Initializing hardware...")
    arduino_serial = find_arduino_port()
    if arduino_serial:
        is_initialized = True
        return True
    if GPIO_AVAILABLE:
        try:
            GPIO.setwarnings(False)
            GPIO.setmode(GPIO.BCM)
            for axis, pins in MOTOR_PINS.items():
                GPIO.setup(pins['step'], GPIO.OUT)
                GPIO.setup(pins['dir'], GPIO.OUT)
                GPIO.setup(pins['enable'], GPIO.OUT)
                GPIO.output(pins['enable'], GPIO.HIGH)
            is_initialized = True
            logger.info("GPIO initialized")
            return True
        except Exception as e:
            logger.error(f"GPIO init error: {e}")
    logger.error("Hardware init failed")
    is_initialized = False
    return False

def send_command(command, timeout=None):
    if timeout is None:
        timeout = COMMAND_TIMEOUT
    if not arduino_serial or not arduino_serial.is_open:
        return None
    try:
        arduino_serial.reset_input_buffer()
        arduino_serial.write(f"{command}\n".encode())
        arduino_serial.flush()
        logger.info(f"Sent: {command}")
        start = time.time()
        while (time.time() - start) < timeout:
            if arduino_serial.in_waiting > 0:
                line = arduino_serial.readline().decode('utf-8', errors='ignore').strip()
                if line:
                    logger.info(f"Arduino: {line}")
                    upper = line.upper()
                    if "STABLE_READY" in upper or "OK" in upper:
                        return line
                    if "ERROR" in upper:
                        return None
            time.sleep(0.05)
    except Exception as e:
        logger.error(f"Command error: {e}")
    return None

def move_relative(dx, dy):
    """Move by (dx, dy) units. Uses Arduino serial or GPIO fallback."""
    if arduino_serial and arduino_serial.is_open:
        return send_command(f"MOVE {dx},{dy}") is not None

    if GPIO_AVAILABLE:
        try:
            for axis, delta in [('x', dx), ('y', dy)]:
                steps = int(delta * STEPS_PER_UNIT[axis])
                if steps == 0:
                    continue
                pins = MOTOR_PINS[axis]
                GPIO.output(pins['enable'], GPIO.LOW)
                GPIO.output(pins['dir'], GPIO.HIGH if steps > 0 else GPIO.LOW)
                for _ in range(abs(steps)):
                    GPIO.output(pins['step'], GPIO.HIGH)
                    time.sleep(0.0005)
                    GPIO.output(pins['step'], GPIO.LOW)
                    time.sleep(0.0005)
                GPIO.output(pins['enable'], GPIO.HIGH)
            time.sleep(0.6)  # settle time
            return True
        except Exception as e:
            logger.error(f"GPIO move error: {e}")
    return False

# --- Routes ---

@app.route('/status')
def get_status():
    return jsonify({
        'status': 'ready' if is_initialized else 'not_initialized',
        'current_sample': current_sample_name(),
        'sensitivity': state['sensitivity'],
        'scan_active': scan['active'],
    })

@app.route('/initialize', methods=['POST'])
def init_endpoint():
    success = init_hw()
    return jsonify({
        'status': 'success' if success else 'error',
        'message': 'Hardware connected' if success else 'No hardware found'
    }), 200 if success else 503

@app.route('/get_config')
def get_config():
    return jsonify({'sensitivity': state['sensitivity']})

@app.route('/update_config', methods=['POST'])
def update_config():
    data = request.json
    if data and 'sensitivity' in data:
        state['sensitivity'] = float(data['sensitivity'])
        save_config()
        return jsonify({'status': 'success'})
    return jsonify({'status': 'error'}), 400

@app.route('/get_samples', methods=['POST'])
def get_samples():
    if not is_initialized and not init_hw():
        return jsonify({'status': 'error', 'message': 'Hardware not connected'}), 503

    # Mark current position as origin
    if arduino_serial and arduino_serial.is_open:
        send_command("ZERO")

    moves = generate_scan_moves(state['sensitivity'])
    scan['active'] = True
    scan['field_type'] = 'lpf'
    scan['index'] = 1
    scan['moves'] = list(moves)

    logger.info(f"Scan started: method={method}, sensitivity={state['sensitivity']}")

    return jsonify({
        'status': 'success', 'sample': current_sample_name(),
        'sample_number': 1, 'field_type': 'lpf',
        'total_samples': 10, 'position': {'x': 0, 'y': 0, 'z': 0},
        'ready_for_capture': True
    })

@app.route('/next_sample', methods=['POST'])
def next_sample():
    if not scan['active']:
        return jsonify({'status': 'error', 'message': 'No active scan'}), 400

    ft = scan['field_type']
    idx = scan['index']

    if ft == 'lpf' and idx >= 10:
        return jsonify({'status': 'switch_objective', 'message': 'Please switch to 40x (HPF)'})
    if ft == 'hpf' and idx >= 10:
        scan['active'] = False
        return jsonify({'status': 'complete', 'message': 'All samples completed.'})
    if not scan['moves']:
        scan['active'] = False
        return jsonify({'status': 'complete', 'message': 'All samples completed.'})

    dx, dy = scan['moves'].pop(0)
    scan['index'] += 1

    if move_relative(dx, dy):
        return jsonify({
            'status': 'success', 'sample': current_sample_name(),
            'sample_number': scan['index'], 'field_type': ft,
            'total_samples': 10, 'position': {'x': dx, 'y': dy, 'z': 0},
            'ready_for_capture': True
        })
    return jsonify({'status': 'error', 'message': f'Failed to move to {current_sample_name()}'}), 500

@app.route('/continue_after_switch', methods=['POST'])
def handle_continue():
    if not is_initialized:
        return jsonify({'status': 'error', 'message': 'Hardware not connected'}), 503

    if arduino_serial and arduino_serial.is_open:
        send_command("HOME")
        send_command("ZERO")

    moves = generate_scan_moves(state['sensitivity'])
    scan['field_type'] = 'hpf'
    scan['index'] = 1
    scan['moves'] = list(moves)

    return jsonify({
        'status': 'success', 'sample': current_sample_name(),
        'sample_number': 1, 'field_type': 'hpf',
        'total_samples': 10, 'position': {'x': 0, 'y': 0, 'z': 0}
    })

@app.route('/stop', methods=['POST'])
def stop_scan():
    scan['active'] = False
    scan['moves'] = []
    scan['index'] = 0
    homed = False
    if is_initialized and arduino_serial and arduino_serial.is_open:
        if send_command("HOME", timeout=120):
            send_command("ZERO", timeout=5)
            homed = True
    return jsonify({
        'status': 'success',
        'message': 'Scan stopped. Motors returned to home.' if homed else 'Scan stopped.',
        'homed': homed
    })

if __name__ == '__main__':
    init_hw()
    app.run(host='0.0.0.0', port=3001, debug=False)
