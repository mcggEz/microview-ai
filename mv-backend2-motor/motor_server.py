#!/usr/bin/env python3
"""
Motor Control Server (Laptop Edition)
Handles motor movements for automated sample positioning
Works with Arduino stepper motors via Serial (Auto-detection)
"""

from flask import Flask, request, jsonify 
from flask_cors import CORS
import time
import os
import json
import logging
import platform
import serial
import serial.tools.list_ports
from datetime import datetime

# Configure logging
log_path = 'motor_server.log'
logging.basicConfig(
    level=logging.DEBUG,
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

# Conversion settings
STEPS_PER_MM = {'x': 100, 'y': 100, 'z': 200}

# Default Configuration
DEFAULT_CONFIG = {
    'grid_params': {
        'lpf': {'start_x': 2.0, 'end_x': 26.0, 'start_y': 2.0, 'end_y': 8.0, 'cols': 5, 'rows': 2},
        'hpf': {'start_x': 1.0, 'end_x': 9.0, 'start_y': 1.0, 'end_y': 3.0, 'cols': 5, 'rows': 2}
    },
    'sensitivity': 1.0
}

CONFIG_FILE = 'motor_config.json'
CURRENT_CONFIG = DEFAULT_CONFIG.copy()

def load_config():
    global CURRENT_CONFIG
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                loaded = json.load(f)
                if isinstance(loaded, dict):
                    if 'grid_params' in loaded and isinstance(loaded['grid_params'], dict):
                        CURRENT_CONFIG['grid_params'] = loaded['grid_params']
                    if 'sensitivity' in loaded:
                        CURRENT_CONFIG['sensitivity'] = float(loaded['sensitivity'])
            logger.info("Configuration loaded.")
        except Exception as e:
            logger.error(f"Failed to load config: {e}")

def save_config():
    try:
        with open(CONFIG_FILE, 'w') as f:
            json.dump(CURRENT_CONFIG, f, indent=4)
        logger.info("Configuration saved.")
    except Exception as e:
        logger.error(f"Failed to save config: {e}")

load_config()

# Global reference
GRID_PARAMS = CURRENT_CONFIG.get('grid_params', {})

def generate_sample_positions(method='longitudinal'):
    positions = {}
    gp = CURRENT_CONFIG.get('grid_params')
    if not isinstance(gp, dict): 
        return positions
    
    for field_type, params in gp.items():
        if not isinstance(params, dict): continue
        cols = int(params.get('cols', 1))
        rows = int(params.get('rows', 1))
        start_x = float(params.get('start_x', 0.0))
        end_x = float(params.get('end_x', 0.0))
        start_y = float(params.get('start_y', 0.0))
        end_y = float(params.get('end_y', 0.0))

        total_samples = cols * rows
        x_spacing = (end_x - start_x) / max(cols - 1, 1)
        y_spacing = (end_y - start_y) / max(rows - 1, 1)

        if method == 'battlement':
            sample_num = 1
            for i in range(total_samples // 2):
                x = start_x + i * x_spacing
                if i % 2 == 0:
                    positions[f'{field_type}_{sample_num}'] = {'x': x, 'y': start_y, 'z': 0}
                    sample_num += 1
                    positions[f'{field_type}_{sample_num}'] = {'x': x, 'y': end_y, 'z': 0}
                else:
                    positions[f'{field_type}_{sample_num}'] = {'x': x, 'y': end_y, 'z': 0}
                    sample_num += 1
                    positions[f'{field_type}_{sample_num}'] = {'x': x, 'y': start_y, 'z': 0}
                sample_num += 1
        else: # longitudinal
            sample_num = 1
            for row in range(rows):
                y = start_y + row * y_spacing
                col_range = range(cols - 1, -1, -1) if row % 2 == 1 else range(cols)
                for col in col_range:
                    x = start_x + col * x_spacing
                    positions[f'{field_type}_{sample_num}'] = {'x': x, 'y': y, 'z': 0}
                    sample_num += 1
    return positions

scan_config = {'method': 'longitudinal'}
SAMPLE_POSITIONS = generate_sample_positions('longitudinal')
current_position = {'x': 0.0, 'y': 0.0, 'z': 0.0}
current_sample = None
is_initialized = False

def find_arduino_port():
    logger.info("Auto-detecting Arduino port...")
    ports = list(serial.tools.list_ports.comports())
    ports.sort(key=lambda p: (
        not ('USB' in p.description.upper() or 'ARDUINO' in p.description.upper() or 'CH340' in p.description.upper()),
        p.device
    ))
    
    for port in ports:
        if 'bluetooth' in port.description.lower() or 'bth' in port.description.lower():
            continue
        logger.info(f"Probing {port.device}...")
        try:
            ser = serial.Serial(port.device, ARDUINO_BAUD, timeout=2)
            time.sleep(3) 
            if ser.in_waiting > 0:
                boot_msg = ser.read(ser.in_waiting).decode('utf-8', errors='ignore').lower()
                if any(x in boot_msg for x in ["ready", "ok", "system"]):
                    return ser
            ser.write(b"STATUS\n")
            ser.flush()
            time.sleep(1.0)
            if ser.in_waiting > 0:
                resp = ser.readline().decode('utf-8', errors='ignore').strip().lower()
                if any(x in resp for x in ["ok", "status", "ready", "pos", "x:", "y:"]):
                    return ser
            ser.close()
        except: continue
    return None

def initialize_arduino():
    global arduino_serial, is_initialized
    if arduino_serial and arduino_serial.is_open: return True
    arduino_serial = find_arduino_port()
    if arduino_serial:
        is_initialized = True
        return True
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
                if any(x in line.upper() for x in ["OK", "DONE", "SUCCESS", "ARRIVED", "STABLE_READY"]):
                    return line
            time.sleep(0.01)
        return None
    except: return None

def move_to_position(x, y, z):
    if not is_initialized: return False
    cal_x = x * CURRENT_CONFIG['sensitivity']
    cal_y = y * CURRENT_CONFIG['sensitivity']
    
    res = send_arduino_command(f"MOVE {cal_x},{cal_y}")
    if res and res != "timeout":
        current_position['x'], current_position['y'] = x, y
        current_position['z'] = z
        return True
    return False

def home_motors():
    if not is_initialized: return False
    send_arduino_command("HOME")
    current_position['x'] = current_position['y'] = current_position['z'] = 0.0
    return True

@app.route('/status', methods=['GET'])
def get_status():
    return jsonify({
        'status': 'ready' if is_initialized else 'not_initialized',
        'position': current_position,
        'current_sample': current_sample,
        'scan_method': scan_config['method']
    })

@app.route('/get_config', methods=['GET'])
def get_config():
    return jsonify({
        'grid_params': CURRENT_CONFIG['grid_params'],
        'sensitivity': CURRENT_CONFIG['sensitivity'],
        'scan_method': scan_config['method']
    })

@app.route('/update_config', methods=['POST'])
def update_config():
    global GRID_PARAMS, SAMPLE_POSITIONS
    data = request.json
    if not data: return jsonify({'status': 'error'}), 400
    if 'grid_params' in data:
        CURRENT_CONFIG['grid_params'].update(data['grid_params'])
    if 'sensitivity' in data:
        try: CURRENT_CONFIG['sensitivity'] = float(data['sensitivity'])
        except: pass
    save_config()
    GRID_PARAMS = CURRENT_CONFIG['grid_params']
    SAMPLE_POSITIONS = generate_sample_positions(scan_config['method'])
    return jsonify({'status': 'success'})

@app.route('/continue_after_switch', methods=['POST'])
def handle_continue():
    global current_sample
    current_sample = 'hpf_1'
    target = SAMPLE_POSITIONS[current_sample]
    if move_to_position(target['x'], target['y'], target['z']):
        parts = current_sample.split('_')
        return jsonify({
            'status': 'success',
            'sample': current_sample,
            'sample_number': int(parts[1]),
            'field_type': parts[0],
            'total_samples': 10,
            'position': current_position
        })
    return jsonify({'status': 'error'}), 500

@app.route('/get_samples', methods=['POST'])
def get_samples():
    global current_sample
    if not is_initialized: 
        if not initialize_arduino():
            return jsonify({'status': 'error', 'message': 'Hardware not connected.'}), 503
    home_motors()
    current_sample = 'lpf_1'
    target = SAMPLE_POSITIONS[current_sample]
    if move_to_position(target['x'], target['y'], target['z']):
        parts = current_sample.split('_')
        return jsonify({
            'status': 'success',
            'sample': current_sample,
            'sample_number': int(parts[1]),
            'field_type': parts[0],
            'total_samples': 10,
            'position': current_position,
            'ready_for_capture': True
        })
    return jsonify({'status': 'error'}), 500

@app.route('/next_sample', methods=['POST'])
def next_sample():
    global current_sample
    if not current_sample: return jsonify({'status': 'error'}), 400
    if current_sample == 'lpf_10':
        return jsonify({
            'status': 'switch_objective', 
            'next_sample': 'hpf_1',
            'message': 'LPF complete. Switch to HPF.'
        })
    parts = current_sample.split('_')
    num = int(parts[1])
    if num >= 10:
        if parts[0] == 'lpf': current_sample = 'hpf_1'
        else: return jsonify({'status': 'complete'})
    else:
        current_sample = f"{parts[0]}_{num + 1}"
    
    target = SAMPLE_POSITIONS[current_sample]
    if move_to_position(target['x'], target['y'], target['z']):
        current_parts = current_sample.split('_')
        return jsonify({
            'status': 'success',
            'sample': current_sample,
            'sample_number': int(current_parts[1]),
            'field_type': current_parts[0],
            'total_samples': 10,
            'position': current_position,
            'ready_for_capture': True
        })
    return jsonify({'status': 'error'}), 500

@app.route('/configure_scan', methods=['POST'])
def configure_scan():
    global SAMPLE_POSITIONS, scan_config
    method = request.json.get('method', 'longitudinal').lower()
    scan_config['method'] = method
    SAMPLE_POSITIONS = generate_sample_positions(method)
    return jsonify({'status': 'success', 'method': method})

if __name__ == '__main__':
    initialize_arduino()
    app.run(host='0.0.0.0', port=3001)
