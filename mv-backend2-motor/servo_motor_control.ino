/*
 * Servo Motor Control for X and Y Axis
 * MicroView AI - Urinalysis System
 * 
 * Controls two servo motors for X and Y axis positioning
 * Accepts serial commands for precise sample positioning
 */

#include <Servo.h>

// Servo pin definitions
#define SERVO_X_PIN 3    // X-axis servo on pin 3 (PWM)
#define SERVO_Y_PIN 5    // Y-axis servo on pin 5 (PWM)

// Servo objects
Servo servoX;
Servo servoY;

// Servo configuration
#define SERVO_MIN_ANGLE 0      // Minimum servo angle (degrees)
#define SERVO_MAX_ANGLE 180     // Maximum servo angle (degrees)
#define SERVO_X_CENTER 90      // Center position for X-axis (degrees)
#define SERVO_Y_CENTER 90      // Center position for Y-axis (degrees)

// Position tracking (in degrees)
float currentX = SERVO_X_CENTER;
float currentY = SERVO_Y_CENTER;

// Movement speed (delay in milliseconds between degree steps)
#define MOVEMENT_DELAY 15

// Sample positions (in degrees from center)
// These correspond to the sample positions in motor_server.py
struct Position {
  float x;
  float y;
};

// Sample positions mapping
Position samplePositions[] = {
  {SERVO_X_CENTER, SERVO_Y_CENTER},      // Home position (lpf)
  {SERVO_X_CENTER + 5, SERVO_Y_CENTER + 5},   // lpf_1
  {SERVO_X_CENTER + 15, SERVO_Y_CENTER + 5},  // lpf_2
  {SERVO_X_CENTER + 25, SERVO_Y_CENTER + 5},  // lpf_3
  {SERVO_X_CENTER + 35, SERVO_Y_CENTER + 5},  // lpf_4
  {SERVO_X_CENTER + 45, SERVO_Y_CENTER + 5},  // lpf_5
  {SERVO_X_CENTER + 5, SERVO_Y_CENTER + 15},  // lpf_6
  {SERVO_X_CENTER + 15, SERVO_Y_CENTER + 15}, // lpf_7
  {SERVO_X_CENTER + 25, SERVO_Y_CENTER + 15}, // lpf_8
  {SERVO_X_CENTER + 35, SERVO_Y_CENTER + 15}, // lpf_9
  {SERVO_X_CENTER + 45, SERVO_Y_CENTER + 15}, // lpf_10
  {SERVO_X_CENTER + 2, SERVO_Y_CENTER + 2},   // hpf_1
  {SERVO_X_CENTER + 6, SERVO_Y_CENTER + 2},   // hpf_2
  {SERVO_X_CENTER + 10, SERVO_Y_CENTER + 2},  // hpf_3
  {SERVO_X_CENTER + 14, SERVO_Y_CENTER + 2},  // hpf_4
  {SERVO_X_CENTER + 18, SERVO_Y_CENTER + 2},  // hpf_5
  {SERVO_X_CENTER + 2, SERVO_Y_CENTER + 6},   // hpf_6
  {SERVO_X_CENTER + 6, SERVO_Y_CENTER + 6},  // hpf_7
  {SERVO_X_CENTER + 10, SERVO_Y_CENTER + 6}, // hpf_8
  {SERVO_X_CENTER + 14, SERVO_Y_CENTER + 6}, // hpf_9
  {SERVO_X_CENTER + 18, SERVO_Y_CENTER + 6}  // hpf_10
};

String currentSample = "";

void setup() {
  // Initialize serial communication
  Serial.begin(9600);
  while (!Serial) {
    ; // Wait for serial port to connect
  }
  
  Serial.println("=== Servo Motor Control System ===");
  Serial.println("Initializing servos...");
  
  // Attach servos to pins
  servoX.attach(SERVO_X_PIN);
  servoY.attach(SERVO_Y_PIN);
  
  // Move to center/home position
  homeServos();
  
  Serial.println("System ready!");
  Serial.println("Commands:");
  Serial.println("  HOME - Home servos to center");
  Serial.println("  MOVE x,y - Move to absolute position (degrees)");
  Serial.println("  SAMPLE lpf_1 to lpf_10 or hpf_1 to hpf_10");
  Serial.println("  STATUS - Get current position");
  Serial.println("  HELP - Show this help");
}

void loop() {
  // Check for serial commands
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    command.toUpperCase();
    
    processCommand(command);
  }
  
  delay(10);
}

void processCommand(String cmd) {
  if (cmd.startsWith("HOME")) {
    homeServos();
    sendResponse("SUCCESS", "Servos homed to center position");
  }
  else if (cmd.startsWith("MOVE")) {
    // Parse MOVE x,y command
    int commaIndex = cmd.indexOf(',');
    if (commaIndex > 0) {
      float x = cmd.substring(5, commaIndex).toFloat();
      float y = cmd.substring(commaIndex + 1).toFloat();
      moveToPosition(x, y);
      sendResponse("SUCCESS", "Moved to position");
    } else {
      sendResponse("ERROR", "Invalid MOVE command. Use: MOVE x,y");
    }
  }
  else if (cmd.startsWith("SAMPLE")) {
    // Parse SAMPLE command (e.g., SAMPLE lpf_1)
    String sampleName = cmd.substring(7);
    sampleName.trim();
    sampleName.toLowerCase();
    moveToSample(sampleName);
  }
  else if (cmd.startsWith("STATUS")) {
    sendStatus();
  }
  else if (cmd.startsWith("HELP")) {
    printHelp();
  }
  else {
    sendResponse("ERROR", "Unknown command: " + cmd);
  }
}

void homeServos() {
  Serial.println("Homing servos to center position...");
  moveToPosition(SERVO_X_CENTER, SERVO_Y_CENTER);
  currentSample = "";
  Serial.println("Homing complete");
}

void moveToPosition(float targetX, float targetY) {
  // Constrain target positions to valid servo range
  targetX = constrain(targetX, SERVO_MIN_ANGLE, SERVO_MAX_ANGLE);
  targetY = constrain(targetY, SERVO_MIN_ANGLE, SERVO_MAX_ANGLE);
  
  Serial.print("Moving from (");
  Serial.print(currentX);
  Serial.print(", ");
  Serial.print(currentY);
  Serial.print(") to (");
  Serial.print(targetX);
  Serial.print(", ");
  Serial.print(targetY);
  Serial.println(")");
  
  // Calculate step size for smooth movement
  float deltaX = targetX - currentX;
  float deltaY = targetY - currentY;
  float maxDelta = max(abs(deltaX), abs(deltaY));
  
  if (maxDelta > 0) {
    int steps = (int)maxDelta;
    float stepX = deltaX / steps;
    float stepY = deltaY / steps;
    
    for (int i = 0; i <= steps; i++) {
      float newX = currentX + (stepX * i);
      float newY = currentY + (stepY * i);
      
      servoX.write((int)newX);
      servoY.write((int)newY);
      
      delay(MOVEMENT_DELAY);
    }
  }
  
  // Update current position
  currentX = targetX;
  currentY = targetY;
  
  servoX.write((int)currentX);
  servoY.write((int)currentY);
  
  Serial.print("Movement complete. Current position: (");
  Serial.print(currentX);
  Serial.print(", ");
  Serial.print(currentY);
  Serial.println(")");
}

void moveToSample(String sampleName) {
  int index = -1;
  
  // Map sample names to indices
  if (sampleName == "lpf" || sampleName == "home") {
    index = 0;
  } else if (sampleName == "lpf_1") {
    index = 1;
  } else if (sampleName == "lpf_2") {
    index = 2;
  } else if (sampleName == "lpf_3") {
    index = 3;
  } else if (sampleName == "lpf_4") {
    index = 4;
  } else if (sampleName == "lpf_5") {
    index = 5;
  } else if (sampleName == "lpf_6") {
    index = 6;
  } else if (sampleName == "lpf_7") {
    index = 7;
  } else if (sampleName == "lpf_8") {
    index = 8;
  } else if (sampleName == "lpf_9") {
    index = 9;
  } else if (sampleName == "lpf_10") {
    index = 10;
  } else if (sampleName == "hpf_1") {
    index = 11;
  } else if (sampleName == "hpf_2") {
    index = 12;
  } else if (sampleName == "hpf_3") {
    index = 13;
  } else if (sampleName == "hpf_4") {
    index = 14;
  } else if (sampleName == "hpf_5") {
    index = 15;
  } else if (sampleName == "hpf_6") {
    index = 16;
  } else if (sampleName == "hpf_7") {
    index = 17;
  } else if (sampleName == "hpf_8") {
    index = 18;
  } else if (sampleName == "hpf_9") {
    index = 19;
  } else if (sampleName == "hpf_10") {
    index = 20;
  }
  
  if (index >= 0 && index < sizeof(samplePositions) / sizeof(samplePositions[0])) {
    // Extract sample number for logging
    int sampleNum = 0;
    String fieldType = "";
    if (sampleName.startsWith("lpf_")) {
      fieldType = "LPF";
      sampleNum = sampleName.substring(4).toInt();
    } else if (sampleName.startsWith("hpf_")) {
      fieldType = "HPF";
      sampleNum = sampleName.substring(4).toInt();
    }
    
    // Log movement start
    Serial.println("========================================");
    Serial.print("MOVED TO SAMPLE ");
    Serial.print(sampleNum);
    Serial.print(" ");
    Serial.println(fieldType);
    Serial.println("========================================");
    
    Position target = samplePositions[index];
    Serial.print("Target position: X=");
    Serial.print(target.x);
    Serial.print(", Y=");
    Serial.println(target.y);
    
    // Move to position
    moveToPosition(target.x, target.y);
    currentSample = sampleName;
    
    // Log completion
    Serial.print("✓ Successfully moved to sample ");
    Serial.print(sampleNum);
    Serial.print(" ");
    Serial.println(fieldType);
    Serial.print("Current position: X=");
    Serial.print(currentX);
    Serial.print(", Y=");
    Serial.println(currentY);
    Serial.println("========================================");
    
    sendResponse("SUCCESS", "Moved to sample: " + sampleName);
  } else {
    sendResponse("ERROR", "Invalid sample name: " + sampleName);
  }
}

void sendStatus() {
  Serial.println("=== STATUS ===");
  Serial.print("X Position: ");
  Serial.print(currentX);
  Serial.println(" degrees");
  Serial.print("Y Position: ");
  Serial.print(currentY);
  Serial.println(" degrees");
  Serial.print("Current Sample: ");
  Serial.println(currentSample.length() > 0 ? currentSample : "None");
  Serial.println("==============");
}

void sendResponse(String status, String message) {
  Serial.print("[");
  Serial.print(status);
  Serial.print("] ");
  Serial.println(message);
}

void printHelp() {
  Serial.println("=== COMMAND HELP ===");
  Serial.println("HOME              - Move servos to center/home position");
  Serial.println("MOVE x,y          - Move to absolute position (e.g., MOVE 90,90)");
  Serial.println("SAMPLE lpf_1      - Move to sample position (lpf_1 to lpf_10, hpf_1 to hpf_10)");
  Serial.println("STATUS            - Get current position and status");
  Serial.println("HELP              - Show this help message");
  Serial.println("===================");
}
