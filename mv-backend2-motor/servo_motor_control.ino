/*
 * Stepper Motor Control for X and Y Axis
 * MicroView AI - Urinalysis System
 * 
 * Controls two stepper motors (e.g. ULN2003 + 28BYJ-48)
 * Y-axis: Pins 4, 5, 6, 7
 * X-axis: Pins 8, 9, 10, 11
 */

#include <Stepper.h>

// Motor configuration
const int STEPS_PER_REVOLUTION = 2048; // Adjust based on your motor (2048 for 28BYJ-48)

// Speed in RPM
const int MOTOR_SPEED = 10; 

// Stepper instances
// Note: Sequence 1-3-2-4 (8, 10, 9, 11) is often required for ULN2003/28BYJ-48
Stepper stepperX(STEPS_PER_REVOLUTION, 8, 10, 9, 11);
Stepper stepperY(STEPS_PER_REVOLUTION, 4, 6, 5, 7);

// Position Tracking (in steps)
long currentXSteps = 0;
long currentYSteps = 0;

// Conversion factor: Units (degrees/mm) to Steps
// Adjust this based on your mechanical gear ratio
const float UNITS_TO_STEPS = 400.0; 

// Sample positions (in "units" matching motor_server.py logic)
struct Position {
  float x;
  float y;
};

const float CENTER_X = 90.0;
const float CENTER_Y = 90.0;

Position samplePositions[] = {
  {CENTER_X, CENTER_Y},            // Home (0)
  {CENTER_X + 5, CENTER_Y + 5},    // lpf_1 (1)
  {CENTER_X + 15, CENTER_Y + 5},   // lpf_2 (2)
  {CENTER_X + 25, CENTER_Y + 5},   // lpf_3 (3)
  {CENTER_X + 35, CENTER_Y + 5},   // lpf_4 (4)
  {CENTER_X + 45, CENTER_Y + 5},   // lpf_5 (5)
  {CENTER_X + 45, CENTER_Y + 15},  // lpf_6 (6) - Serpentine START (Right)
  {CENTER_X + 35, CENTER_Y + 15},  // lpf_7 (7)
  {CENTER_X + 25, CENTER_Y + 15},  // lpf_8 (8)
  {CENTER_X + 15, CENTER_Y + 15},  // lpf_9 (9)
  {CENTER_X + 5, CENTER_Y + 15},   // lpf_10 (10) - Serpentine END (Left)
  {CENTER_X + 2, CENTER_Y + 2},    // hpf_1 (11)
  {CENTER_X + 6, CENTER_Y + 2},    // hpf_2 (12)
  {CENTER_X + 10, CENTER_Y + 2},   // hpf_3 (13)
  {CENTER_X + 14, CENTER_Y + 2},   // hpf_4 (14)
  {CENTER_X + 18, CENTER_Y + 2},   // hpf_5 (15)
  {CENTER_X + 18, CENTER_Y + 6},   // hpf_6 (16) - Serpentine START (Right)
  {CENTER_X + 14, CENTER_Y + 6},   // hpf_7 (17)
  {CENTER_X + 10, CENTER_Y + 6},   // hpf_8 (18)
  {CENTER_X + 6, CENTER_Y + 6},    // hpf_9 (19)
  {CENTER_X + 2, CENTER_Y + 6}     // hpf_10 (20) - Serpentine END (Left)
};

void setup() {
  Serial.begin(9600);
  
  stepperX.setSpeed(MOTOR_SPEED);
  stepperY.setSpeed(MOTOR_SPEED);
  
  Serial.println("=== Stepper Control System Ready ===");
  Serial.println("OK"); // Initial ready signal
}

void loop() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command.startsWith("HOME")) {
      moveToPosition(CENTER_X, CENTER_Y);
      Serial.println("OK");
    } 
    else if (command.startsWith("MOVE ")) {
      int commaIndex = command.indexOf(',');
      if (commaIndex > 0) {
        float tx = command.substring(5, commaIndex).toFloat();
        float ty = command.substring(commaIndex + 1).toFloat();
        moveToPosition(tx, ty);
        Serial.println("OK");
      }
    } 
    else if (command.startsWith("STATUS")) {
      Serial.println("OK"); // Respond to auto-detection
    }
    else if (command.startsWith("SAMPLE ")) {
      String sampleName = command.substring(7);
      sampleName.trim();
      processSample(sampleName);
    }
  }
}

void moveToPosition(float targetXUnits, float targetYUnits) {
  Serial.print("Target:"); Serial.print(targetXUnits); Serial.print(","); Serial.println(targetYUnits);
  
  long targetXSteps = (long)(targetXUnits * UNITS_TO_STEPS);
  long targetYSteps = (long)(targetYUnits * UNITS_TO_STEPS);
  
  long diffX = targetXSteps - currentXSteps;
  long diffY = targetYSteps - currentYSteps;
  
  if (diffX != 0) {
    stepperX.step(diffX);
    currentXSteps = targetXSteps;
  }
  
  if (diffY != 0) {
    stepperY.step(diffY);
    currentYSteps = targetYSteps;
  }
  
  // Power down pins after move to prevent overheating
  digitalWrite(4, LOW); digitalWrite(5, LOW); digitalWrite(6, LOW); digitalWrite(7, LOW);
  digitalWrite(8, LOW); digitalWrite(9, LOW); digitalWrite(10, LOW); digitalWrite(11, LOW);
}

void processSample(String name) {
  name.toLowerCase();
  int idx = -1;
  
  if (name == "lpf_1") idx = 1;
  else if (name == "lpf_2") idx = 2;
  else if (name == "lpf_3") idx = 3;
  else if (name == "lpf_4") idx = 4;
  else if (name == "lpf_5") idx = 5;
  else if (name == "lpf_6") idx = 6;
  else if (name == "lpf_7") idx = 7;
  else if (name == "lpf_8") idx = 8;
  else if (name == "lpf_9") idx = 9;
  else if (name == "lpf_10") idx = 10;
  else if (name == "hpf_1") idx = 11;
  else if (name == "hpf_2") idx = 12;
  else if (name == "hpf_3") idx = 13;
  else if (name == "hpf_4") idx = 14;
  else if (name == "hpf_5") idx = 15;
  else if (name == "hpf_6") idx = 16;
  else if (name == "hpf_7") idx = 17;
  else if (name == "hpf_8") idx = 18;
  else if (name == "hpf_9") idx = 19;
  else if (name == "hpf_10") idx = 20;
  else if (name == "home") idx = 0;
  
  if (idx != -1) {
    moveToPosition(samplePositions[idx].x, samplePositions[idx].y);
    Serial.println("OK");
  } else {
    Serial.println("ERROR: Invalid Sample");
  }
}
