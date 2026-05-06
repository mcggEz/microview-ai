# MicroView AI: Comprehensive User Manual

Welcome to the **MicroView AI** system. This manual provides step-by-step instructions for medical technologists to set up, operate, and manage the automated urinalysis platform.

---

## 🏗️ 1. Hardware Initialization
Before launching the software, ensure the physical components are correctly configured.

### Step 1: Power & Connectivity
1. **Control Box**: Plug the motor control box into a stable power source.
2. **USB Bridge**: Connect the USB-A cable from the control box to your workstation (Raspberry Pi).
3. **Microscope Light**: Power on the microscope and adjust the illumination to a comfortable, bright level.
4. **Camera Placement**: Insert the HD camera sensor into the eyepiece or trinocular port and connect its USB cable to the workstation.

### Step 2: Mechanical Alignment
1. Clear the stage of any old slides.
2. Secure your prepared urine sediment slide using the stage clips.
3. Switch the objective lens to **10x (Low Power Field)**.
4. Manually center the slide using the software's **"Tactical Jogging"** hub if necessary (found in Settings).

---

## 💻 2. Software Operation
Follow this workflow for every patient test.

### Phase 1: Registration
1. **Login**: Enter your credentials on the Login Page.
2. **Patient Entry**: On the Dashboard, click **"+ New Patient"**.
3. **Fill Details**: Enter Name, Age, and Gender. The system will generate a unique **Test Code**.

### Phase 2: Image Acquisition (The Scan)
1. **Focusing**: Observe the live video feed. Adjust the microscope's physical focus knob until the sediment is crystal clear.
2. **LPF Scan (10x)**: Click **"Start Auto-Scan"**. The stage will move in a serpentine pattern, capturing 10 fields. **Do not touch the microscope during this phase.**
3. **Objective Switch**: When prompted, rotate the lens to **40x (High Power Field)**.
4. **Fine Focus**: Re-adjust the focus for the new magnification.
5. **HPF Scan (40x)**: Click **"Continue Scan"**. The system will capture another 10 detailed fields.

### Phase 3: AI Analysis & Validation
1. **Run AI**: Click the **"Analyze with Gemini"** button.
2. **The "Auditor" at Work**: Wait about 10–20 seconds as YOLO detects particles and Gemini performs a clinical audit.
3. **Human Review**: 
   - Scroll through the captured images.
   - You will see bounding boxes (e.g., Red boxes for RBC, Blue for WBC).
   - If the AI misidentified an object, click the box and select the correct type.
   - If the AI missed an object, use the **Manual Drawing Tool** to box and label it.

---

## 📊 3. Management & Reporting

### Clinical Reports
- Once analysis is complete, click **"Preview Report"**.
- Review the volumetric calculations (e.g., RBC count per mL).
- Click **"Print / Save PDF"** to generate the final document for the patient.

### System Management
- Navigate to the **Management** page to view historical data.
- Use the **Sediment Gallery** to verify the performance of the AI over time.
- RMTs can mark specific detections as "Valid" or "Invalid" to help improve the system's accuracy metrics.

---

## ⚙️ 4. System Settings
Accessed via the gear icon, the Settings page allows for "under-the-hood" adjustments:
- **API Keys**: If the AI analysis fails, ensure you have active Gemini API keys registered.
- **Motor Calibration**: If the stage moves too far or too little, adjust the **"Sensitivity"** slider.
- **Jogging**: Use the on-screen D-pad or keyboard **WASD** keys to manually move the slide.

---

## ❓ 5. Troubleshooting

| Issue | Potential Solution |
| :--- | :--- |
| **"Bridge Offline"** | Check the USB connection to the control box. Ensure the Python Motor Server is running. |
| **Blurry Captures** | The system includes a 600ms "settle time." If images are still blurry, ensure the slide clips are tight and the objective lens is clean. |
| **AI Analysis Error** | Usually caused by an expired API key or a low-quality Internet connection. Check "Settings" for key status. |
| **Motor Won't Move** | Ensure the "Homing" sequence was completed at the start of the session. |

---

## 🛑 Safety Note
*The MicroView AI is an augmentative tool. All AI findings should be reviewed and signed off by a licensed Medical Technologist or Pathologist before being released to a patient.*
