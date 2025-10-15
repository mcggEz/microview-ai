# desktop/main.py
import tkinter as tk
from tkinter import ttk
from ui.login_ui import LoginUI
from ui.dashboard_ui import DashboardUI
from services.supabase_client import SupabaseClient
import sys
import os

# GPIO functionality commented out for now
# try:
#     import RPi.GPIO as GPIO
#     GPIO_AVAILABLE = True
# except ImportError:
#     GPIO_AVAILABLE = False
#     print("RPi.GPIO not available - running in simulation mode")
GPIO_AVAILABLE = False

class DesktopApp:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("MicroView AI Desktop App")
        self.root.geometry("1000x700")
        self.root.configure(bg='#ffffff')
        self.root.resizable(True, True)
        
        # Set window icon and styling
        self.root.configure(bg='#ffffff')
        
        # Initialize services
        self.supabase_client = SupabaseClient()
        self.current_user = None
        
        # Initialize GPIO
        self.init_gpio()
        
        # Start with login
        self.show_login()
        
    def init_gpio(self):
        """Initialize GPIO pins"""
        if GPIO_AVAILABLE:
            try:
                GPIO.setmode(GPIO.BCM)
                GPIO.setup(18, GPIO.OUT)  # Motor forward
                GPIO.setup(19, GPIO.OUT)  # Motor reverse
                GPIO.setup(21, GPIO.IN)   # Sensor
                print("GPIO initialized successfully")
            except Exception as e:
                print(f"GPIO initialization failed: {e}")
        else:
            print("GPIO simulation mode - no actual hardware control")
            
    def show_login(self):
        """Show login interface"""
        self.clear_window()
        self.login_ui = LoginUI(self.root, self)
        self.login_ui.pack(fill="both", expand=True)
        
    def show_dashboard(self, user_data):
        """Show dashboard after successful login"""
        self.current_user = user_data
        self.clear_window()
        self.dashboard_ui = DashboardUI(self.root, self)
        self.dashboard_ui.pack(fill="both", expand=True)
        
    def clear_window(self):
        """Clear all widgets from window"""
        for widget in self.root.winfo_children():
            widget.destroy()
            
    def run(self):
        """Start the application"""
        self.root.mainloop()
        
    def cleanup(self):
        """Cleanup GPIO on exit"""
        if GPIO_AVAILABLE:
            try:
                GPIO.cleanup()
            except:
                pass

if __name__ == "__main__":
    app = DesktopApp()
    try:
        app.run()
    finally:
        app.cleanup()
