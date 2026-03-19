#!/usr/bin/env python3
"""
Motor Control Server (Laptop Edition)
Handles motor movements for automated sample positioning.

The Flask server is the "brain" — it knows the scan method, sensitivity,
and calculates the exact relative moves to send to the Arduino.

The Arduino is "dumb muscle" — it just executes MOVE dx,dy commands.

Scan Method: Longitudinal strip (serpentine) — left×4, down×1, right×4.

Each move distance = sensitivity value (in motor units).
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import time
import os
import json
import logging
import serial
import serial.tools.list_ports

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler('motor_server.log'), logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

ARDUINO_BAUD = 9600
arduino_serial = None

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["*"]}})

# Persistent State
CONFIG_FILE = 'motor_config.json'
state = {'sensitivity': 1.0}

# Command timeout (seconds)
COMMAND_TIMEOUT = 60

# ---------------------------------------------------------------------------
# Config persistence
# ---------------------------------------------------------------------------

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
    """Save config while preserving any existing keys."""
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

# ---------------------------------------------------------------------------
# Scan pattern generation
# ---------------------------------------------------------------------------

def generate_scan_moves(sensitivity):
    """Generate the list of relative (dx, dy) moves for samples 2-10.

    Sample 1 is captured at the origin (no move needed), so we return 9 moves.
    Each move distance = sensitivity.

    Longitudinal strip (serpentine, 5 cols x 2 rows):
        Start at top-right.
        Row 1 (R->L): <-  <-  <-  <-       (samples 1-5, moving left)
        Row 2 (L->R): v   ->  ->  ->  ->   (samples 6-10, serpentine back right)

         5 << 4 << 3 << 2 << 1(start)
         v
         6 >> 7 >> 8 >> 9 >> 10
    """
    S = sensitivity
    moves = []
    # Row 1: left 4 times (samples 2-5)
    for _ in range(4):
        moves.append((-S, 0))
    # Down to row 2 (sample 6)
    moves.append((0, S))
    # Row 2: right 4 times, serpentine (samples 7-10)
    for _ in range(4):
        moves.append((S, 0))
    return moves

# ---------------------------------------------------------------------------
# Scan state
# ---------------------------------------------------------------------------

scan = {
    'active': False,
    'field_type': 'lpf',       # 'lpf' or 'hpf'
    'index': 0,                # current sample index (1-based)
    'moves': [],               # remaining (dx, dy) moves
}
is_initialized = False

def current_sample_name():
    """Return the sample name like 'lpf_3' from scan state."""
    if not scan['active']:
        return None
    return f"{scan['field_type']}_{scan['index']}"

# ---------------------------------------------------------------------------
# Arduino communication
# ---------------------------------------------------------------------------

def find_arduino_port():
    """Scan serial ports to find an Arduino. Skips Bluetooth ports."""
    ports = list(serial.tools.list_ports.comports())
    ports = [p for p in ports if 'BLUETOOTH' not in (p.device + ' ' + p.description).upper()
             and 'BTHENUM' not in (p.hwid or '').upper()]
    ports.sort(key=lambda p: not any(name in (p.device + ' ' + p.description).upper()
                                     for name in ['USB', 'ARDUINO', 'CH340', 'ACM']))
    logger.info(f"Scanning {len(ports)} serial ports (Bluetooth excluded)...")
    for port in ports:
        try:
            logger.info(f"Trying port {port.device} ({port.description})...")
            ser = serial.Serial(port.device, ARDUINO_BAUD, timeout=3)
            time.sleep(3)
            # Drain boot messages
            boot_lines = []
            while ser.in_waiting > 0:
                line = ser.readline().decode('utf-8', errors='ignore').strip()
                boot_lines.append(line)
            if boot_lines:
                logger.info(f"  Boot messages: {boot_lines}")
            if any("OK" in line.upper() for line in boot_lines):
                logger.info(f"Arduino identified on {port.device} (via boot message)")
                return ser
            # Fallback: send STATUS
            ser.reset_input_buffer()
            ser.write(b"STATUS\n")
            ser.flush()
            line = ser.readline().decode('utf-8', errors='ignore').strip()
            logger.info(f"  STATUS response: '{line}'")
            if line and "OK" in line.upper():
                logger.info(f"Arduino identified on {port.device} (via STATUS)")
                return ser
            ser.close()
        except Exception as e:
            logger.warning(f"  Port {port.device} failed: {e}")
            continue
    return None

def initialize_arduino():
    global arduino_serial, is_initialized
    if arduino_serial and arduino_serial.is_open:
        return True
    arduino_serial = find_arduino_port()
    is_initialized = arduino_serial is not None
    if is_initialized:
        logger.info("Arduino initialized successfully")
    else:
        logger.warning("Arduino initialization failed — no device found")
    return is_initialized

def send_command(command, timeout=None):
    """Send a command to Arduino and wait for STABLE_READY or OK."""
    if timeout is None:
        timeout = COMMAND_TIMEOUT
    if not arduino_serial or not arduino_serial.is_open:
        logger.warning(f"Cannot send '{command}': Arduino not connected")
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
                        logger.error(f"Arduino error: {line}")
                        return None
            time.sleep(0.05)
        logger.warning(f"'{command}' timed out after {timeout}s")
    except Exception as e:
        logger.error(f"Command error for '{command}': {e}")
    return None

def move_relative(dx, dy):
    """Send a relative MOVE command to the Arduino."""
    result = send_command(f"MOVE {dx},{dy}")
    return result is not None

# ---------------------------------------------------------------------------
# Flask routes
# ---------------------------------------------------------------------------

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
    success = initialize_arduino()
    return jsonify({
        'status': 'success' if success else 'error',
        'message': 'Arduino connected' if success else 'No Arduino found'
    }), 200 if success else 503

@app.route('/ports')
def list_ports():
    ports = list(serial.tools.list_ports.comports())
    port_info = []
    for p in ports:
        is_bt = 'BLUETOOTH' in (p.description or '').upper() or 'BTHENUM' in (p.hwid or '').upper()
        port_info.append({
            'device': p.device,
            'description': p.description,
            'manufacturer': p.manufacturer,
            'is_bluetooth': is_bt
        })
    return jsonify({
        'ports': port_info,
        'arduino_connected': is_initialized,
        'arduino_port': arduino_serial.port if arduino_serial and arduino_serial.is_open else None
    })

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
    """Start a scan. The user has already positioned the stage at top-left.

    1. ZERO the Arduino (mark current position as origin — no movement)
    2. Generate the move sequence based on scan method + sensitivity
    3. Return success for sample 1 (captured at current position)
    """
    if not is_initialized and not initialize_arduino():
        return jsonify({'status': 'error', 'message': 'Hardware not connected. Is the Arduino plugged in?'}), 503

    # Tell Arduino: "wherever you are now = origin". No motor movement.
    zero_result = send_command("ZERO", timeout=5)
    if not zero_result:
        logger.warning("ZERO command failed — attempting to continue anyway")

    # Generate the 9 relative moves for samples 2-10 (longitudinal strip)
    moves = generate_scan_moves(state['sensitivity'])

    # Initialize scan state
    scan['active'] = True
    scan['field_type'] = 'lpf'
    scan['index'] = 1
    scan['moves'] = list(moves)  # copy

    logger.info(f"Scan started: longitudinal, sensitivity={state['sensitivity']}, field=lpf")
    logger.info(f"Move sequence ({len(moves)} moves): {moves}")

    return jsonify({
        'status': 'success',
        'sample': current_sample_name(),
        'sample_number': 1,
        'field_type': 'lpf',
        'total_samples': 10,
        'position': {'x': 0, 'y': 0, 'z': 0},
        'ready_for_capture': True
    })

@app.route('/next_sample', methods=['POST'])
def next_sample():
    """Move to the next sample position.

    Pops the next (dx, dy) from the move list and sends it to Arduino.
    """
    if not scan['active']:
        return jsonify({'status': 'error', 'message': 'No active scan. Call /get_samples first.'}), 400

    field_type = scan['field_type']
    index = scan['index']

    # After capturing the last sample of LPF, signal objective switch
    if field_type == 'lpf' and index >= 10:
        return jsonify({'status': 'switch_objective', 'message': 'Please switch to 40x (HPF)'})

    # After capturing the last sample of HPF, scan is complete
    if field_type == 'hpf' and index >= 10:
        scan['active'] = False
        return jsonify({'status': 'complete', 'message': 'All samples completed.'})

    # Pop next move
    if not scan['moves']:
        scan['active'] = False
        return jsonify({'status': 'complete', 'message': 'All samples completed.'})

    dx, dy = scan['moves'].pop(0)
    scan['index'] += 1

    logger.info(f"Moving to {scan['field_type']}_{scan['index']}: dx={dx}, dy={dy}")

    if move_relative(dx, dy):
        return jsonify({
            'status': 'success',
            'sample': current_sample_name(),
            'sample_number': scan['index'],
            'field_type': scan['field_type'],
            'total_samples': 10,
            'position': {'x': dx, 'y': dy, 'z': 0},
            'ready_for_capture': True
        })

    return jsonify({'status': 'error', 'message': f"Failed to move to {current_sample_name()}"}), 500

@app.route('/continue_after_switch', methods=['POST'])
def handle_continue():
    """After user switches objective (LPF → HPF), return to origin and start HPF scan."""
    if not is_initialized:
        return jsonify({'status': 'error', 'message': 'Hardware not connected'}), 503

    # Return to origin (top-left of slide)
    home_result = send_command("HOME", timeout=120)
    if not home_result:
        logger.warning("HOME failed before HPF scan — attempting to continue")

    # Mark this position as new origin for HPF
    send_command("ZERO", timeout=5)

    # Generate HPF moves (same pattern, same sensitivity)
    moves = generate_scan_moves(state['sensitivity'])

    scan['field_type'] = 'hpf'
    scan['index'] = 1
    scan['moves'] = list(moves)

    logger.info(f"HPF scan started: longitudinal, sensitivity={state['sensitivity']}")

    return jsonify({
        'status': 'success',
        'sample': current_sample_name(),
        'sample_number': 1,
        'field_type': 'hpf',
        'total_samples': 10,
        'position': {'x': 0, 'y': 0, 'z': 0}
    })

@app.route('/stop', methods=['POST'])
def stop_scan():
    """Emergency stop: abort scan and return motors to home position."""
    scan['active'] = False
    scan['moves'] = []
    scan['index'] = 0

    homed = False
    if is_initialized:
        home_result = send_command("HOME", timeout=120)
        if home_result:
            send_command("ZERO", timeout=5)
            homed = True
            logger.info("Stop: motors returned to home position")
        else:
            logger.warning("Stop: HOME command failed")

    logger.info("Scan stopped by user")
    return jsonify({
        'status': 'success',
        'message': 'Scan stopped. Motors returned to home.' if homed else 'Scan stopped. Could not home motors.',
        'homed': homed
    })

@app.route('/manual_zero', methods=['POST'])
def manual_zero():
    """Mark the current position as the new origin (no movement)."""
    if not is_initialized and not initialize_arduino():
        return jsonify({'status': 'error', 'message': 'Hardware not connected'}), 503

    result = send_command("ZERO", timeout=5)
    if result:
        logger.info("Manual ZERO: origin set to current position")
        return jsonify({'status': 'success', 'message': 'Origin set'})
    return jsonify({'status': 'error', 'message': 'ZERO command failed'}), 500

@app.route('/manual_home', methods=['POST'])
def manual_home():
    """Return motors to the origin position."""
    if not is_initialized and not initialize_arduino():
        return jsonify({'status': 'error', 'message': 'Hardware not connected'}), 503

    result = send_command("HOME", timeout=120)
    if result:
        send_command("ZERO", timeout=5)
        logger.info("Manual HOME: motors returned to origin")
        return jsonify({'status': 'success', 'message': 'Returned to origin'})
    return jsonify({'status': 'error', 'message': 'HOME command failed'}), 500

@app.route('/manual_move', methods=['POST'])
def manual_move():
    """Manually move a single axis by a specified amount.

    Body: {"axis": "x"|"y", "units": float}
    Positive units = right (X) or down (Y). Negative = opposite.
    """
    if not is_initialized and not initialize_arduino():
        return jsonify({'status': 'error', 'message': 'Hardware not connected'}), 503

    data = request.json or {}
    axis = data.get('axis', '').lower()
    units = float(data.get('units', 0))

    if axis not in ('x', 'y'):
        return jsonify({'status': 'error', 'message': 'axis must be "x" or "y"'}), 400
    if units == 0:
        return jsonify({'status': 'error', 'message': 'units must be non-zero'}), 400

    if axis == 'x':
        dx, dy = units, 0
    else:
        dx, dy = 0, units

    logger.info(f"Manual move: axis={axis}, units={units}")
    result = move_relative(dx, dy)

    if result:
        return jsonify({'status': 'success', 'axis': axis, 'units': units})
    return jsonify({'status': 'error', 'message': f'Motor did not respond'}), 500

@app.route('/test_motors', methods=['POST'])
def test_motors():
    """Test each motor independently. Moves X then Y, then returns HOME.

    Use this to verify both motors are wired and working correctly.
    Optional body: {"steps": 500} to control how many steps each motor takes.
    """
    if not is_initialized and not initialize_arduino():
        return jsonify({'status': 'error', 'message': 'Hardware not connected'}), 503

    data = request.json or {}
    units = float(data.get('units', 2.0))  # default 2.0 units = very visible movement

    results = []

    # Mark current position
    send_command("ZERO", timeout=5)

    # Test X motor: move right then back
    logger.info(f"Testing X motor: {units} units")
    x_result = send_command(f"MOVE {units},0")
    results.append({'axis': 'X', 'direction': 'positive', 'ok': x_result is not None})

    time.sleep(0.5)

    x_back = send_command(f"MOVE {-units},0")
    results.append({'axis': 'X', 'direction': 'return', 'ok': x_back is not None})

    time.sleep(0.5)

    # Test Y motor: move down then back
    logger.info(f"Testing Y motor: {units} units")
    y_result = send_command(f"MOVE 0,{units}")
    results.append({'axis': 'Y', 'direction': 'positive', 'ok': y_result is not None})

    time.sleep(0.5)

    y_back = send_command(f"MOVE 0,{-units}")
    results.append({'axis': 'Y', 'direction': 'return', 'ok': y_back is not None})

    # Reset
    send_command("ZERO", timeout=5)

    x_ok = all(r['ok'] for r in results if r['axis'] == 'X')
    y_ok = all(r['ok'] for r in results if r['axis'] == 'Y')

    return jsonify({
        'status': 'success',
        'x_motor': 'working' if x_ok else 'FAILED',
        'y_motor': 'working' if y_ok else 'FAILED',
        'units_tested': units,
        'details': results
    })

if __name__ == '__main__':
    initialize_arduino()
    app.run(host='0.0.0.0', port=3001)
