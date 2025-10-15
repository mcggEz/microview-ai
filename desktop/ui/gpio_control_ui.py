# desktop/ui/gpio_control_ui.py
import tkinter as tk
from tkinter import ttk, messagebox
import time
import threading

# GPIO functionality commented out for now
# try:
#     import RPi.GPIO as GPIO
#     GPIO_AVAILABLE = True
# except ImportError:
#     GPIO_AVAILABLE = False
#     print("RPi.GPIO not available - running in simulation mode")
GPIO_AVAILABLE = False

class GPIOControlUI(tk.Frame):
    def __init__(self, parent, app):
        super().__init__(parent, bg='#ffffff')
        self.app = app
        self.create_widgets()
        
    def create_widgets(self):
        # Title
        title = tk.Label(self, text="⚡ GPIO Control Panel", 
                        font=("Arial", 24, "bold"), fg="#1F2937", bg='#ffffff')
        title.pack(anchor="w", pady=(0, 30))
        
        # Motor control card
        motor_card = tk.Frame(self, bg='#F9FAFB', relief="raised", bd=1)
        motor_card.pack(fill="x", pady=(0, 20))
        
        tk.Label(motor_card, text="🔧 Motor Control", font=("Arial", 16, "bold"),
                fg="#1F2937", bg='#F9FAFB').pack(anchor="w", pady=20, padx=20)
        
        # Motor buttons
        motor_buttons = tk.Frame(motor_card, bg='#F9FAFB')
        motor_buttons.pack(anchor="w", padx=20, pady=(0, 20))
        
        tk.Button(motor_buttons, text="▶️ Forward", command=self.motor_forward,
                 bg="#10B981", fg="white", font=("Arial", 12, "bold"),
                 relief="flat", bd=0, cursor="hand2", padx=20, pady=10).pack(side="left", padx=(0, 10))
        
        tk.Button(motor_buttons, text="◀️ Reverse", command=self.motor_reverse,
                 bg="#3B82F6", fg="white", font=("Arial", 12, "bold"),
                 relief="flat", bd=0, cursor="hand2", padx=20, pady=10).pack(side="left", padx=(0, 10))
        
        tk.Button(motor_buttons, text="⏹️ Stop", command=self.motor_stop,
                 bg="#EF4444", fg="white", font=("Arial", 12, "bold"),
                 relief="flat", bd=0, cursor="hand2", padx=20, pady=10).pack(side="left")
        
        # Sampling card
        sample_card = tk.Frame(self, bg='#F9FAFB', relief="raised", bd=1)
        sample_card.pack(fill="x", pady=(0, 20))
        
        tk.Label(sample_card, text="📊 Data Sampling", font=("Arial", 16, "bold"),
                fg="#1F2937", bg='#F9FAFB').pack(anchor="w", pady=20, padx=20)
        
        # Sample controls
        sample_controls = tk.Frame(sample_card, bg='#F9FAFB')
        sample_controls.pack(anchor="w", padx=20, pady=(0, 20))
        
        tk.Button(sample_controls, text="📈 Get 10 Samples", command=self.start_sampling,
                 bg="#8B5CF6", fg="white", font=("Arial", 12, "bold"),
                 relief="flat", bd=0, cursor="hand2", padx=20, pady=10).pack(side="left")
        
        # Results area
        results_card = tk.Frame(self, bg='#F9FAFB', relief="raised", bd=1)
        results_card.pack(fill="both", expand=True)
        
        tk.Label(results_card, text="📋 Results", font=("Arial", 16, "bold"),
                fg="#1F2937", bg='#F9FAFB').pack(anchor="w", pady=20, padx=20)
        
        # Results text area
        self.results_text = tk.Text(results_card, height=15, width=70, 
                                   bg='#ffffff', fg="#1F2937", font=("Consolas", 10),
                                   relief="solid", bd=1, insertbackground='#1F2937')
        self.results_text.pack(fill="both", expand=True, padx=20, pady=(0, 20))
        
        # Initial message
        self.results_text.insert(tk.END, "Ready to control GPIO pins...\n")
        self.results_text.insert(tk.END, "Click 'Get 10 Samples' to start sampling.\n\n")
        
    def motor_forward(self):
        if GPIO_AVAILABLE:
            GPIO.output(18, GPIO.HIGH)
            GPIO.output(19, GPIO.LOW)
        self.log_action("Motor Forward")
        
    def motor_reverse(self):
        if GPIO_AVAILABLE:
            GPIO.output(18, GPIO.LOW)
            GPIO.output(19, GPIO.HIGH)
        self.log_action("Motor Reverse")
        
    def motor_stop(self):
        if GPIO_AVAILABLE:
            GPIO.output(18, GPIO.LOW)
            GPIO.output(19, GPIO.LOW)
        self.log_action("Motor Stop")
        
    def start_sampling(self):
        self.results_text.delete(1.0, tk.END)
        self.results_text.insert(tk.END, "🔄 Starting sampling...\n")
        self.results_text.insert(tk.END, "Collecting 10 samples from sensor...\n\n")
        
        # Run sampling in separate thread
        threading.Thread(target=self.sample_data, daemon=True).start()
        
    def sample_data(self):
        for i in range(10):
            if GPIO_AVAILABLE:
                sensor_value = GPIO.input(21)
            else:
                # Simulate sensor data for Windows development
                sensor_value = (i % 3 == 0)  # Simulate some variation
            sample_text = f"Sample {i+1:2d}: {sensor_value} {'✅' if sensor_value else '❌'}\n"
            
            # Update UI in main thread
            self.after(0, self.update_results, sample_text)
            time.sleep(0.1)
            
        # Final message
        self.after(0, self.sampling_complete)
            
    def update_results(self, sample_text):
        self.results_text.insert(tk.END, sample_text)
        self.results_text.see(tk.END)
        
    def sampling_complete(self):
        self.results_text.insert(tk.END, "\n✅ Sampling completed!\n")
        self.results_text.insert(tk.END, "Ready for next operation...\n\n")
        
    def log_action(self, action):
        timestamp = time.strftime("%H:%M:%S")
        log_text = f"[{timestamp}] {action}\n"
        self.results_text.insert(tk.END, log_text)
        self.results_text.see(tk.END)
