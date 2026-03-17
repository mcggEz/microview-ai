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

# Grids
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
    return positions

scan_config = {'method': 'longitudinal'}
SAMPLE_POSITIONS = generate_sample_positions('longitudinal')
current_position = {'x': 0.0, 'y': 0.0, 'z': 0.0}
current_sample = None
is_initialized = False

def find_arduino_port():
    logger.info("Auto-detecting Arduino port...")
    ports = list(serial.tools.list_ports.comports())
    
    # Sort: put Arduino/USB ports first
    ports.sort(key=lambda p: (
        not ('USB' in p.description.upper() or 'ARDUINO' in p.description.upper() or 'CH340' in p.description.upper()),
        p.device
    ))
    
    for port in ports:
        if 'bluetooth' in port.description.lower() or 'bth' in port.description.lower():
            continue
            
        logger.info(f"Probing {port.device} ({port.description})...")
        try:
            # Open port with a fresh connection
            ser = serial.Serial(port.device, ARDUINO_BAUD, timeout=2)
            
            # Most Arduinos reset on connection. Give it plenty of time to boot.
            time.sleep(3) 
            
            # 1. First, check if it already sent a "Ready" message on boot
            if ser.in_waiting > 0:
                boot_msg = ser.read(ser.in_waiting).decode('utf-8', errors='ignore').lower()
                if any(x in boot_msg for x in ["ready", "ok", "system"]):
                    logger.info(f"✓ Arduino detected via boot message on {port.device}")
                    return ser
            
            # 2. If no boot message, try sending a STATUS command
            ser.write(b"STATUS\n")
            ser.flush()
            time.sleep(1.0) # Wait for response
            
            if ser.in_waiting > 0:
                resp = ser.readline().decode('utf-8', errors='ignore').strip().lower()
                logger.info(f"Received from {port.device}: '{resp}'")
                if any(x in resp for x in ["ok", "status", "ready", "pos", "x:", "y:"]):
                    logger.info(f"✓ Arduino confirmed on {port.device}")
                    return ser
            
            ser.close()
        except Exception as e:
            logger.debug(f"Port {port.device} failed: {e}")
            continue
            
    return None

def initialize_arduino():
    global arduino_serial, is_initialized
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
        return None # Explicitly return None on timeout
    except Exception as e:
        logger.error(f"Hardware error: {e}")
        return None

def move_to_position(x, y, z):
    if is_initialized:
        res = send_arduino_command(f"MOVE {x},{y}")
        if res and res != "timeout": # Only True if we got a real response
            current_position['x'], current_position['y'] = x, y
            current_position['z'] = z
            return True
        else:
            logger.error(f"Failed to move to {x}, {y}. Response: {res}")
    return False

def continue_after_switch():
    global current_sample
    current_sample = 'hpf_1'
    target = SAMPLE_POSITIONS[current_sample]
    move_to_position(target['x'], target['y'], target['z'])
    return True

def home_motors():
    if is_initialized:
        send_arduino_command("HOME")
        current_position['x'] = current_position['y'] = current_position['z'] = 0.0
        return True
    return False

@app.route('/status', methods=['GET'])
def get_status():
    return jsonify({
        'status': 'ready' if is_initialized else 'not_initialized',
        'position': current_position,
        'current_sample': current_sample,
        'scan_method': scan_config['method']
    })

@app.route('/configure_scan', methods=['POST'])
def configure_scan():
    global SAMPLE_POSITIONS, scan_config
    method = request.json.get('method', 'longitudinal').lower()
    scan_config['method'] = method
    SAMPLE_POSITIONS = generate_sample_positions(method)
    return jsonify({'status': 'success', 'method': method})

@app.route('/continue_after_switch', methods=['POST'])
def handle_continue():
    if continue_after_switch():
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
            return jsonify({'status': 'error', 'message': 'Hardware not connected. Check Arduino connection.'}), 503
            
    if not home_motors():
        return jsonify({'status': 'error', 'message': 'Communication failure during homing.'}), 500
        
    current_sample = 'lpf_1'
    target = SAMPLE_POSITIONS[current_sample]
    if not move_to_position(target['x'], target['y'], target['z']):
        return jsonify({'status': 'error', 'message': 'Hardware failed to move.'}), 500
        
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

@app.route('/next_sample', methods=['POST'])
def next_sample():
    global current_sample
    if not current_sample: return jsonify({'status': 'error', 'message': 'Run get_samples first'}), 400
    
    if current_sample == 'lpf_10':
        # Don't update current_sample yet, wait for continue_after_switch
        return jsonify({
            'status': 'switch_objective', 
            'next_sample': 'hpf_1',
            'message': 'LPF complete. Please switch to HPF objective.'
        })
    
    parts = current_sample.split('_')
    num = int(parts[1])
    if num >= 10:
        if parts[0] == 'lpf': 
            current_sample = 'hpf_1'
        else: 
            return jsonify({'status': 'complete'})
    else:
        current_sample = f"{parts[0]}_{num + 1}"
    
    target = SAMPLE_POSITIONS[current_sample]
    if not move_to_position(target['x'], target['y'], target['z']):
        return jsonify({'status': 'error', 'message': 'Motor movement failed. Check hardware.'}), 500
        
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

if __name__ == '__main__':
    initialize_arduino()
    app.run(host='0.0.0.0', port=3001)
