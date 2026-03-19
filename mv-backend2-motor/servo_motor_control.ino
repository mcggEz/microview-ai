/*
 * Stepper Motor Control for X and Y Axis
 * MicroView AI - Urinalysis System
 *
 * Controls two stepper motors (ULN2003 + 28BYJ-48)
 * Y-axis: Pins 4, 5, 6, 7
 * X-axis: Pins 8, 9, 10, 11
 *
 * The Arduino is "dumb muscle" — it only moves motors.
 * The Flask server is the "brain" — it calculates WHERE to move
 * based on scan method and sensitivity.
 *
 * Serial Commands (9600 baud):
 *   STATUS      → responds "OK"
 *   HOME        → returns to origin (0,0), responds "STABLE_READY"
 *   ZERO        → marks current position as origin (no movement), responds "STABLE_READY"
 *   MOVE dx,dy  → relative move by dx,dy units, responds "STABLE_READY"
 *
 * All MOVE values are in "units". Converted to steps via UNITS_TO_STEPS.
 * After every move, waits SETTLE_TIME_MS before responding — this
 * prevents the camera from capturing while the stage is still vibrating.
 */

#include <Stepper.h>

// === HARDWARE CONFIG ===
// Different steps-per-revolution to compensate for hardware differences
const int X_STEPS_PER_REV = 1024;  // X motor
const int Y_STEPS_PER_REV = 1024;  // Y motor (needs more steps for same travel)
const int MOTOR_SPEED = 12;        // RPM (higher = faster, but may skip steps)

// Pin order for ULN2003 driver
// X-axis: reversed (4-2-3-1) so first scan direction is counter-clockwise
Stepper stepperX(X_STEPS_PER_REV, 11, 9, 10, 8);
Stepper stepperY(Y_STEPS_PER_REV, 4, 6, 5, 7);

// === TUNING ===
// How many motor steps per 1.0 "unit" from Flask (per axis).
// These scale with each motor's steps-per-revolution so both axes
// travel the same physical distance for the same unit value.
const float X_UNITS_TO_STEPS = 200.0;  // 1 unit = 200 steps on X (1024 SPR)
const float Y_UNITS_TO_STEPS = 400.0;  // 1 unit = 400 steps on Y (2048 SPR)

// Settle time (ms) after each move completes.
// This lets vibrations die down before the camera captures.
const int SETTLE_TIME_MS = 600;

// === STATE ===
// Tracks accumulated steps from origin so HOME can return.
long totalXSteps = 0;
long totalYSteps = 0;

void setup() {
  Serial.begin(9600);
  stepperX.setSpeed(MOTOR_SPEED);
  stepperY.setSpeed(MOTOR_SPEED);

  Serial.println("=== Stepper Control System Ready ===");
  Serial.println("OK");
}

void loop() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();

    if (command.startsWith("STATUS")) {
      Serial.println("OK");
    }
    else if (command.startsWith("ZERO")) {
      // Mark current physical position as origin — NO motor movement.
      // Used when user manually positions stage at top-left before scanning.
      totalXSteps = 0;
      totalYSteps = 0;
      Serial.println("STABLE_READY");
    }
    else if (command.startsWith("HOME")) {
      // Physically return to origin by reversing all accumulated steps.
      Serial.print("Returning to origin: X=");
      Serial.print(-totalXSteps);
      Serial.print(" Y=");
      Serial.println(-totalYSteps);

      doMove(-totalXSteps, -totalYSteps);
      totalXSteps = 0;
      totalYSteps = 0;

      delay(SETTLE_TIME_MS);
      Serial.println("STABLE_READY");
    }
    else if (command.startsWith("MOVE ")) {
      // Relative move: MOVE dx,dy (in units, converted to steps)
      int commaIndex = command.indexOf(',');
      if (commaIndex > 0) {
        float dx = command.substring(5, commaIndex).toFloat();
        float dy = command.substring(commaIndex + 1).toFloat();

        long stepsX = (long)(dx * X_UNITS_TO_STEPS);
        long stepsY = (long)(dy * Y_UNITS_TO_STEPS);

        Serial.print("Move: dx=");
        Serial.print(dx);
        Serial.print(" dy=");
        Serial.print(dy);
        Serial.print(" (steps X=");
        Serial.print(stepsX);
        Serial.print(" Y=");
        Serial.print(stepsY);
        Serial.println(")");

        doMove(stepsX, stepsY);
        totalXSteps += stepsX;
        totalYSteps += stepsY;

        delay(SETTLE_TIME_MS);
        Serial.println("STABLE_READY");
      }
    }
  }
}

void doMove(long stepsX, long stepsY) {
  if (stepsX != 0) {
    stepperX.step(stepsX);
  }
  if (stepsY != 0) {
    stepperY.step(stepsY);
  }


  // Power down all motor pins to prevent overheating
  digitalWrite(4, LOW); digitalWrite(5, LOW);
  digitalWrite(6, LOW); digitalWrite(7, LOW);
  digitalWrite(8, LOW); digitalWrite(9, LOW);
  digitalWrite(10, LOW); digitalWrite(11, LOW);
}
