# desktop/ui/signup_ui.py
import tkinter as tk
from tkinter import ttk, messagebox
from services.auth_service import AuthService

class SignupUI(tk.Frame):
    def __init__(self, parent, app):
        super().__init__(parent, bg='#ffffff')
        self.app = app
        self.auth_service = AuthService()
        self.create_widgets()
        
    def create_widgets(self):
        # Main container
        main_frame = tk.Frame(self, bg='#ffffff')
        main_frame.pack(expand=True, fill="both")
        
        # Center the signup form
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
        subtitle_label = tk.Label(center_frame, text="Sign up for MedTech access to the urinalysis workspace", 
                                 font=("Arial", 12), 
                                 fg="#6B7280", bg='#ffffff')
        subtitle_label.pack(pady=(0, 30))
        
        # Create Account header
        create_label = tk.Label(center_frame, text="Create Account", 
                               font=("Arial", 20, "bold"), 
                               fg="#1F2937", bg='#ffffff')
        create_label.pack(anchor="w", pady=(0, 5))
        
        # Signup form
        form_frame = tk.Frame(center_frame, bg='#ffffff', relief="flat", bd=0)
        form_frame.pack(pady=20, padx=0)
        
        # Full Name field
        tk.Label(form_frame, text="Full Name", font=("Arial", 13, "bold"), 
                fg="#1F2937", bg='#ffffff').pack(anchor="w", pady=(0, 5))
        self.name_entry = tk.Entry(form_frame, font=("Arial", 12), 
                                  width=40, bg='#ffffff', fg='#1F2937',
                                  relief="solid", bd=1, insertbackground='#1F2937')
        self.name_entry.pack(pady=(0, 20), ipady=8)
        self.name_entry.insert(0, "Enter your full name")
        
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
        
        # Confirm password field
        tk.Label(form_frame, text="Confirm Password", font=("Arial", 13, "bold"), 
                fg="#1F2937", bg='#ffffff').pack(anchor="w", pady=(0, 5))
        self.confirm_password_entry = tk.Entry(form_frame, font=("Arial", 12), 
                                              width=40, show="*", bg='#ffffff', fg='#1F2937',
                                              relief="solid", bd=1, insertbackground='#1F2937')
        self.confirm_password_entry.pack(pady=(0, 20), ipady=8)
        self.confirm_password_entry.insert(0, "Confirm your password")
        
        # Signup button (gradient style)
        signup_btn = tk.Button(form_frame, text="Create Account", 
                              command=self.signup, font=("Arial", 12, "bold"),
                              bg="#3B82F6", fg="white", width=40, height=2,
                              relief="flat", bd=0, cursor="hand2")
        signup_btn.pack(pady=(0, 20))
        
        # Login link
        login_label = tk.Label(center_frame, text="Already have an account? Sign in", 
                              font=("Arial", 12), fg="#3B82F6", bg='#ffffff',
                              cursor="hand2")
        login_label.pack(pady=(0, 20))
        login_label.bind("<Button-1>", self.show_login)
        
    def signup(self):
        name = self.name_entry.get()
        email = self.email_entry.get()
        course = self.course_var.get()
        password = self.password_entry.get()
        confirm_password = self.confirm_password_entry.get()
        
        if not all([name, email, course, password, confirm_password]):
            messagebox.showerror("Error", "Please fill in all fields")
            return
            
        if password != confirm_password:
            messagebox.showerror("Error", "Passwords do not match")
            return
            
        try:
            user_data = self.auth_service.signup(name, email, course, password)
            if user_data:
                messagebox.showinfo("Success", "Account created successfully!")
                self.app.show_dashboard(user_data)
            else:
                messagebox.showerror("Error", "Signup failed")
        except Exception as e:
            messagebox.showerror("Error", f"Signup failed: {str(e)}")
            
    def show_login(self, event):
        """Switch to login interface"""
        from ui.login_ui import LoginUI
        self.clear_widgets()
        self.login_ui = LoginUI(self, self.app)
        self.login_ui.pack(fill="both", expand=True)
        
    def clear_widgets(self):
        for widget in self.winfo_children():
            widget.destroy()
