# Raspberry Pi Motor Control Server

This server runs on the Raspberry Pi to control stepper motors for automated sample positioning in the urinalysis system.

## Features

- **Automated Sample Positioning**: Moves microscope stage to predefined sample positions
- **LPF/HPF Mode Support**: Positions for low-power and high-power field analysis
- **Real-time Status**: Provides current position and sample status
- **Emergency Stop**: Immediate motor shutdown capability
- **RESTful API**: Easy integration with web frontend

## Hardware Requirements

- Raspberry Pi (3B+ or newer recommended)
- Stepper motors with drivers
- GPIO connections as configured in `motor_server.py`

## Installation

1. **Copy files to Raspberry Pi**:
   ```bash
   scp -r desktop/ pi@your-pi-ip:/home/pi/
   ```

2. **Run setup script**:
   ```bash
   cd /home/pi/desktop
   chmod +x setup.sh
   ./setup.sh
   ```

3. **Start the service**:
   ```bash
   sudo systemctl start motor-server.service
   ```

## API Endpoints

### GET /status
Get current motor status and position.

### POST /home
Home all motors to zero position.

### POST /get_samples
Execute automated sample positioning routine:
1. Home motors
2. Move to LPF position
3. Signal ready for capture

### POST /next_sample
Move to specific sample position:
```json
{
  "sample": "sample_1"  // sample_1, sample_2, sample_3, sample_4, sample_5
}
```

### POST /sync_mode
Sync motor state with frontend LPF/HPF mode:
```json
{
  "mode": "lpf",        // "lpf" or "hpf"
  "sample_number": 3    // 1-10
}
```

### POST /configure_microscope
Configure microscope by running motors:
```json
{
  "configuration": {
    "mode": "lpf",              // "lpf" or "hpf"
    "sample_number": 3,         // 1-10
    "focus_adjustment": 0.5,    // Z-axis fine-tuning (mm)
    "brightness_position": 0.2  // X-axis positioning (mm)
  }
}
```

### POST /emergency_stop
Immediately stop all motors.

## Sample Positions

### LPF Samples (10 positions for Low Power Field)
- **lpf**: Home position (0, 0, 0)
- **lpf_1**: (2, 2, 0) - **lpf_5**: (26, 2, 0)
- **lpf_6**: (2, 8, 0) - **lpf_10**: (26, 8, 0)

### HPF Samples (10 positions for High Power Field)
- **hpf_1**: (1, 1, 0) - **hpf_5**: (9, 1, 0)
- **hpf_6**: (1, 3, 0) - **hpf_10**: (9, 3, 0)

**Total: 20 sample positions** (10 LPF + 10 HPF)

## GPIO Configuration

| Motor | Step Pin | Direction Pin | Enable Pin |
|-------|----------|--------------|------------|
| X     | 17       | 18           | 27         |
| Y     | 22       | 23           | 24         |
| Z     | 25       | 8            | 7          |

## Usage with Frontend

The frontend "Get Samples" button will:
1. **Send POST request to `/get_samples`** - Moves to LPF sample 1/10
2. **Server responds** with `ready_for_capture: true` and sample info
3. **Frontend captures image** automatically
4. **Send POST request to `/next_sample`** - Moves to next sample in sequence
5. **Repeat steps 3-4** until all 20 samples are captured (10 LPF + 10 HPF)
6. **Server responds** with `status: 'complete'` when all samples are done

### Sample Sequence:
- **LPF 1-10**: Low Power Field samples (wider coverage)
- **HPF 1-10**: High Power Field samples (detailed analysis)
- **Total**: 20 automated sample positions

## Troubleshooting

- **Check service status**: `sudo systemctl status motor-server.service`
- **View logs**: `sudo journalctl -u motor-server.service -f`
- **Test API**: `curl http://127.0.0.1:3001/status`
- **GPIO issues**: Ensure proper wiring and power supply
