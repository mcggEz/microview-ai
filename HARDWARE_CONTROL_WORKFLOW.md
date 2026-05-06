# MicroView AI: Hardware Control Workflow

This document explains the technical implementation of the hardware control system, focusing on the communication between the **Next.js Frontend**, the **Python Motor Server**, and the **Microscope Actuators**.

---

## 1. System Architecture
The hardware system follows a "Bridge" architecture:
- **Frontend**: Next.js (React) dashboard provides the UI for manual jogging and automated scanning.
- **Middleware**: Python Flask server running on a Raspberry Pi (or laptop) acts as the bridge.
- **Actuators**: Stepper motors controlled via an Arduino.

---

## 2. The Python Motor Server (Bridge)
The Python server is the "manager" of the physical actuators. It exposes a REST API for the frontend to call.

### Hardware Initialization
The server connects to the actuators via **Serial (Arduino)**.

```python
# Location: mv-backend2-motor/motor_server.py

def init_hw():
    global arduino_serial, is_initialized
    # Look for Arduino via Serial
    arduino_serial = find_arduino_port()
    if arduino_serial:
        is_initialized = True
        return True
```

---

## 3. Movement Logic: Relative & Absolute
The system moves the microscope stage using **Relative Steps**, which are derived from a "Sensitivity" multiplier.

### Arduino Control (Serial)
The Python server sends string commands over the Serial port to the Arduino.

```python
# Location: mv-backend2-motor/motor_server.py

def move_relative(dx, dy):
    """Send a relative MOVE command to the Arduino."""
    result = send_command(f"MOVE {dx},{dy}")
    return result is not None
```

---

## 4. Automated Scanning Pattern
The "Master Scan" uses a **Serpentine (S-Curve)** pattern to move across the sample slide systematically.

```python
def generate_scan_moves(sensitivity):
    """Generates a serpentine longitudinal strip path."""
    S = sensitivity
    moves = []
    # Strip 1: Move Left
    for _ in range(4): moves.append((-S, 0))
    # Move Down one row
    moves.append((0, S))
    # Strip 2: Move Right
    for _ in range(4): moves.append((S, 0))
    return moves
```

---

## 5. Frontend Integration
The React application (Dashboard) controls the hardware by sending POST requests to the Python server.

### Manual Jogging (React)
```typescript
// Location: src/app/settings/page.tsx

const manualMove = useCallback(async (axis: "x" | "y", direction: 1 | -1) => {
  setIsMoving(true);
  try {
    const res = await fetch(`${motorUrl}/manual_move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        axis, 
        units: sensitivity * direction 
      }),
    });
    if (res.ok) setIsConnected(true);
  } finally {
    setIsMoving(false);
  }
}, [motorUrl, sensitivity]);
```

---

## 6. Key API Endpoints
| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/status` | GET | Checks if actuators are connected and ready. |
| `/get_samples` | POST | Zeros the position and starts a new scan session. |
| `/next_sample` | POST | Moves the stage to the next capture position in the pattern. |
| `/manual_move` | POST | Direct X/Y jogging used for manual centering. |
| `/stop` | POST | Immediately halts movement and returns motors to **HOME**. |
