# desktop/ui/login_ui.py
import tkinter as tk
from tkinter import ttk, messagebox
from services.auth_service import AuthService

class LoginUI(tk.Frame):
    def __init__(self, parent, app):
        super().__init__(parent, bg='#ffffff')
        self.app = app
        self.auth_service = AuthService()
        self.create_widgets()
        
    def create_widgets(self):
        # Main container
        main_frame = tk.Frame(self, bg='#ffffff')
        main_frame.pack(expand=True, fill="both")
        
        # Center the login form
        center_frame = tk.Frame(main_frame, bg='#ffffff')
        center_frame.place(relx=0.5, rely=0.5, anchor="center")
        
        # Logo and title (matching MicroView AI design)
        logo_frame = tk.Frame(center_frame, bg='#ffffff')
        logo_frame.pack(pady=(0, 20))
        
        # Microscope icon (using text as icon)
        icon_label = tk.Label(logo_frame, text="🔬", font=("Arial", 24), 
                             fg="#ffffff", bg="#3B82F6", width=3, height=1)
        icon_label.pack(side="left", padx=(0, 10))
        
        title_label = tk.Label(logo_frame, text="MicroView AI", 
                              font=("Arial", 24, "bold"), 
                              fg="#1F2937", bg='#ffffff')
        title_label.pack(side="left")
        
        # Subtitle
        subtitle_label = tk.Label(center_frame, text="MedTech access to the urinalysis workspace", 
                                 font=("Arial", 12), 
                                 fg="#6B7280", bg='#ffffff')
        subtitle_label.pack(pady=(0, 30))
        
        # Sign in header
        signin_label = tk.Label(center_frame, text="Sign in", 
                               font=("Arial", 20, "bold"), 
                               fg="#1F2937", bg='#ffffff')
        signin_label.pack(anchor="w", pady=(0, 5))
        
        # Login form
        form_frame = tk.Frame(center_frame, bg='#ffffff', relief="flat", bd=0)
        form_frame.pack(pady=20, padx=0)
        
        # Email field
        tk.Label(form_frame, text="Email", font=("Arial", 13, "bold"), 
                fg="#1F2937", bg='#ffffff').pack(anchor="w", pady=(0, 5))
        self.email_entry = tk.Entry(form_frame, font=("Arial", 12), 
                                   width=40, bg='#ffffff', fg='#1F2937',
                                   relief="solid", bd=1, insertbackground='#1F2937')
        self.email_entry.pack(pady=(0, 20), ipady=8)
        self.email_entry.insert(0, "you@example.com")
        
        # Password field
        tk.Label(form_frame, text="Password", font=("Arial", 13, "bold"), 
                fg="#1F2937", bg='#ffffff').pack(anchor="w", pady=(0, 5))
        self.password_entry = tk.Entry(form_frame, font=("Arial", 12), 
                                      width=40, show="*", bg='#ffffff', fg='#1F2937',
                                      relief="solid", bd=1, insertbackground='#1F2937')
        self.password_entry.pack(pady=(0, 20), ipady=8)
        self.password_entry.insert(0, "Enter your password")
        
        # Login button (gradient style)
        login_btn = tk.Button(form_frame, text="Sign in", 
                             command=self.login, font=("Arial", 12, "bold"),
                             bg="#3B82F6", fg="white", width=40, height=2,
                             relief="flat", bd=0, cursor="hand2")
        login_btn.pack(pady=(0, 20))
        
        # Divider
        divider_frame = tk.Frame(center_frame, bg='#ffffff')
        divider_frame.pack(fill="x", pady=20)
        
        tk.Frame(divider_frame, bg='#E5E7EB', height=1).pack(side="left", fill="x", expand=True)
        tk.Label(divider_frame, text="Or", font=("Arial", 10), 
                fg="#6B7280", bg='#ffffff').pack(side="left", padx=10)
        tk.Frame(divider_frame, bg='#E5E7EB', height=1).pack(side="right", fill="x", expand=True)
        
        # Demo button
        demo_btn = tk.Button(center_frame, text="🧪 Continue as Demo", 
                           command=self.continue_as_demo, font=("Arial", 12, "bold"),
                           bg="#ffffff", fg="#1F2937", width=40, height=2,
                           relief="solid", bd=1, cursor="hand2")
        demo_btn.pack(pady=(0, 20))
        
        # Signup link
        signup_label = tk.Label(center_frame, text="Don't have an account? Sign up", 
                               font=("Arial", 12), fg="#3B82F6", bg='#ffffff',
                               cursor="hand2")
        signup_label.pack(pady=(0, 20))
        signup_label.bind("<Button-1>", self.show_signup)
        
        # Bind Enter key to login
        self.password_entry.bind('<Return>', lambda e: self.login())
        
    def login(self):
        email = self.email_entry.get()
        password = self.password_entry.get()
        
        if not email or not password:
            messagebox.showerror("Error", "Please fill in all fields")
            return
            
        try:
            user_data = self.auth_service.login(email, password)
            if user_data:
                self.app.show_dashboard(user_data)
            else:
                messagebox.showerror("Error", "Invalid credentials")
        except Exception as e:
            messagebox.showerror("Error", f"Login failed: {str(e)}")
            
    def continue_as_demo(self):
        """Continue as demo user"""
        demo_user = {
            'id': 'demo-user',
            'email': 'demo@microview.ai',
            'name': 'Demo User',
            'role': 'MedTech',
            'student_number': 'DEMO001'
        }
        self.app.show_dashboard(demo_user)
            
    def show_signup(self, event):
        """Switch to signup interface"""
        from ui.signup_ui import SignupUI
        self.clear_widgets()
        self.signup_ui = SignupUI(self, self.app)
        self.signup_ui.pack(fill="both", expand=True)
        
    def clear_widgets(self):
        for widget in self.winfo_children():
            widget.destroy()
