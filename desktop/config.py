# desktop/config.py
import os

# Supabase configuration
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL', 'https://yplyoveerfiwffvjiwml.supabase.co')
SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwbHlvdmVlcmZpd2Zmdmppd21sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzQ4NzMsImV4cCI6MjA1MDU1MDg3M30.5AYL9fItJju511hc')
GEMINI_API_KEY = os.getenv('NEXT_PUBLIC_GEMINI_API_KEY', 'AIzaSyCkACOBf-v47G3rEqnjL46a79q-OefLcQ4')

# GPIO configuration
MOTOR_PINS = {
    'forward': 18,
    'reverse': 19
}

SENSOR_PINS = {
    'sensor_1': 21
}

# App configuration
APP_TITLE = "Gradalyze Desktop App"
APP_VERSION = "1.0.0"
