# desktop/ui/dashboard_ui.py
import tkinter as tk
from tkinter import ttk, messagebox
from ui.gpio_control_ui import GPIOControlUI
from services.supabase_client import SupabaseClient

class DashboardUI(tk.Frame):
    def __init__(self, parent, app):
        super().__init__(parent, bg='#ffffff')
        self.app = app
        self.supabase_client = SupabaseClient()
        self.create_widgets()
        
    def create_widgets(self):
        # Main container
        main_frame = tk.Frame(self, bg='#ffffff')
        main_frame.pack(expand=True, fill="both")
        
        # Top navigation bar
        nav_frame = tk.Frame(main_frame, bg='#F3F4F6', height=70)
        nav_frame.pack(fill="x", padx=0, pady=0)
        nav_frame.pack_propagate(False)
        
        # Logo and title
        logo_frame = tk.Frame(nav_frame, bg='#F3F4F6')
        logo_frame.pack(side="left", padx=20, pady=15)
        
        # Microscope icon
        icon_label = tk.Label(logo_frame, text="🔬", font=("Arial", 16), 
                             fg="#ffffff", bg="#3B82F6", width=2, height=1)
        icon_label.pack(side="left", padx=(0, 8))
        
        tk.Label(logo_frame, text="MicroView AI", font=("Arial", 20, "bold"), 
                fg="#1F2937", bg='#F3F4F6').pack(side="left")
        
        tk.Label(logo_frame, text="Desktop", font=("Arial", 14), 
                fg="#6B7280", bg='#F3F4F6').pack(side="left", padx=(10, 0))
        
        # User info and logout
        user_frame = tk.Frame(nav_frame, bg='#F3F4F6')
        user_frame.pack(side="right", padx=20, pady=15)
        
        tk.Label(user_frame, text=f"Welcome, {self.app.current_user.get('name', 'User')}", 
                font=("Arial", 12), fg="#374151", bg='#F3F4F6').pack(side="left", padx=(0, 15))
        
        logout_btn = tk.Button(user_frame, text="Logout", command=self.logout,
                              bg="#EF4444", fg="white", font=("Arial", 10, "bold"),
                              relief="flat", bd=0, cursor="hand2", padx=15, pady=5)
        logout_btn.pack(side="right")
        
        # Main content area
        content_frame = tk.Frame(main_frame, bg='#ffffff')
        content_frame.pack(expand=True, fill="both", padx=20, pady=20)
        
        # Left sidebar
        sidebar = tk.Frame(content_frame, bg='#F9FAFB', width=250)
        sidebar.pack(side="left", fill="y", padx=(0, 20))
        sidebar.pack_propagate(False)
        
        # Navigation buttons (matching MicroView AI functionality)
        nav_buttons = [
            ("🏠 Dashboard", self.show_dashboard),
            ("📊 Urinalysis Report", self.show_urinalysis_report),
            ("📷 Image Capture", self.show_image_capture),
            ("🔬 Microscope Control", self.show_microscope_control),
            ("📈 Analysis Results", self.show_analysis_results),
            ("⚙️ Settings", self.show_settings)
        ]
        
        for text, command in nav_buttons:
            btn = tk.Button(sidebar, text=text, command=command,
                           font=("Arial", 12), bg='#ffffff', fg="#374151",
                           width=25, anchor="w", relief="solid", bd=1,
                           cursor="hand2", padx=20, pady=10)
            btn.pack(fill="x", padx=10, pady=5)
            
        # Right content area
        self.content_area = tk.Frame(content_frame, bg='#ffffff')
        self.content_area.pack(side="right", expand=True, fill="both")
        
        # Show default dashboard
        self.show_dashboard()
        
    def show_dashboard(self):
        self.clear_content()
        
        # Main container with gray background (matching Next.js app)
        main_frame = tk.Frame(self.content_area, bg='#F9FAFB')
        main_frame.pack(expand=True, fill="both")
        
        # Header (matching the Next.js header)
        header_frame = tk.Frame(main_frame, bg='#ffffff', relief="solid", bd=1)
        header_frame.pack(fill="x", pady=(0, 0))
        
        # Header content
        header_content = tk.Frame(header_frame, bg='#ffffff')
        header_content.pack(fill="x", padx=20, pady=15)
        
        # Left side - Menu button and title
        left_frame = tk.Frame(header_content, bg='#ffffff')
        left_frame.pack(side="left", fill="x", expand=True)
        
        # Menu button
        menu_btn = tk.Button(left_frame, text="☰ Menu", command=self.toggle_sidebar,
                           bg="#3B82F6", fg="white", font=("Arial", 10, "bold"),
                           relief="flat", bd=0, cursor="hand2", padx=10, pady=5)
        menu_btn.pack(side="left", padx=(0, 15))
        
        # Title and date
        title_frame = tk.Frame(left_frame, bg='#ffffff')
        title_frame.pack(side="left")
        
        title_label = tk.Label(title_frame, text="Microscopy Urinalysis Report", 
                              font=("Arial", 16, "bold"), fg="#1F2937", bg='#ffffff')
        title_label.pack(anchor="w")
        
        date_label = tk.Label(title_frame, text="Today", 
                            font=("Arial", 10), fg="#6B7280", bg='#ffffff')
        date_label.pack(anchor="w")
        
        # Right side - Action buttons
        right_frame = tk.Frame(header_content, bg='#ffffff')
        right_frame.pack(side="right")
        
        # Add Test button
        add_test_btn = tk.Button(right_frame, text="+ Add Test", command=self.add_new_test,
                                bg="#10B981", fg="white", font=("Arial", 10, "bold"),
                                relief="flat", bd=0, cursor="hand2", padx=10, pady=5)
        add_test_btn.pack(side="left", padx=(0, 10))
        
        # Focus Field button
        focus_field_btn = tk.Button(right_frame, text="🔬 Focus Field", command=self.focus_field,
                                   bg="#3B82F6", fg="white", font=("Arial", 10, "bold"),
                                   relief="flat", bd=0, cursor="hand2", padx=10, pady=5)
        focus_field_btn.pack(side="left", padx=(0, 10))
        
        # Focus Report button
        focus_report_btn = tk.Button(right_frame, text="📊 Focus Report", command=self.focus_report,
                                   bg="#10B981", fg="white", font=("Arial", 10, "bold"),
                                   relief="flat", bd=0, cursor="hand2", padx=10, pady=5)
        focus_report_btn.pack(side="left")
        
        # Main content area
        content_frame = tk.Frame(main_frame, bg='#F9FAFB')
        content_frame.pack(expand=True, fill="both", padx=20, pady=20)
        
        # Left sidebar (Patient list)
        self.sidebar_frame = tk.Frame(content_frame, bg='#ffffff', width=300, relief="solid", bd=1)
        self.sidebar_frame.pack(side="left", fill="y", padx=(0, 20))
        self.sidebar_frame.pack_propagate(False)
        
        # Sidebar header
        sidebar_header = tk.Frame(self.sidebar_frame, bg='#F3F4F6', height=50)
        sidebar_header.pack(fill="x")
        
        tk.Label(sidebar_header, text="Patient List", font=("Arial", 14, "bold"),
                fg="#1F2937", bg='#F3F4F6').pack(pady=15)
        
        # Search box
        search_frame = tk.Frame(self.sidebar_frame, bg='#ffffff')
        search_frame.pack(fill="x", padx=15, pady=10)
        
        tk.Label(search_frame, text="Search:", font=("Arial", 10, "bold"),
                fg="#374151", bg='#ffffff').pack(anchor="w")
        
        self.search_entry = tk.Entry(search_frame, font=("Arial", 10), width=25)
        self.search_entry.pack(fill="x", pady=(5, 0))
        
        # Patient list
        self.patient_listbox = tk.Listbox(self.sidebar_frame, font=("Arial", 10), 
                                         bg='#ffffff', fg="#374151", selectbackground="#3B82F6",
                                         relief="flat", bd=0)
        self.patient_listbox.pack(fill="both", expand=True, padx=15, pady=(0, 15))
        
        # Add sample patients
        sample_patients = [
            "John Doe - Test #001",
            "Jane Smith - Test #002", 
            "Bob Johnson - Test #003",
            "Alice Brown - Test #004"
        ]
        for patient in sample_patients:
            self.patient_listbox.insert(tk.END, patient)
        
        # Right content area
        self.right_content = tk.Frame(content_frame, bg='#F9FAFB')
        self.right_content.pack(side="right", expand=True, fill="both")
        
        # Show default content
        self.show_default_content()
        
    def show_default_content(self):
        """Show the default content when no patient is selected"""
        # Clear right content
        for widget in self.right_content.winfo_children():
            widget.destroy()
            
        # Welcome message
        welcome_frame = tk.Frame(self.right_content, bg='#F9FAFB')
        welcome_frame.pack(expand=True, fill="both")
        
        # Center the welcome content
        center_frame = tk.Frame(welcome_frame, bg='#F9FAFB')
        center_frame.place(relx=0.5, rely=0.5, anchor="center")
        
        # Welcome icon
        icon_label = tk.Label(center_frame, text="🔬", font=("Arial", 48), 
                             fg="#3B82F6", bg='#F9FAFB')
        icon_label.pack(pady=(0, 20))
        
        # Welcome text
        welcome_label = tk.Label(center_frame, text="Welcome to MicroView AI", 
                                font=("Arial", 24, "bold"), fg="#1F2937", bg='#F9FAFB')
        welcome_label.pack(pady=(0, 10))
        
        subtitle_label = tk.Label(center_frame, text="Select a patient from the list to begin urinalysis", 
                                 font=("Arial", 14), fg="#6B7280", bg='#F9FAFB')
        subtitle_label.pack(pady=(0, 30))
        
        # Quick actions
        actions_frame = tk.Frame(center_frame, bg='#F9FAFB')
        actions_frame.pack()
        
        tk.Button(actions_frame, text="📊 New Urinalysis Report", command=self.add_new_test,
                 bg="#3B82F6", fg="white", font=("Arial", 12, "bold"), 
                 relief="flat", bd=0, cursor="hand2", padx=20, pady=10).pack(side="left", padx=(0, 10))
        
        tk.Button(actions_frame, text="📷 Capture Image", command=self.show_image_capture,
                 bg="#10B981", fg="white", font=("Arial", 12, "bold"),
                 relief="flat", bd=0, cursor="hand2", padx=20, pady=10).pack(side="left")
        
    def toggle_sidebar(self):
        """Toggle sidebar visibility"""
        if self.sidebar_frame.winfo_viewable():
            self.sidebar_frame.pack_forget()
        else:
            self.sidebar_frame.pack(side="left", fill="y", padx=(0, 20))
            
    def add_new_test(self):
        """Add new patient test"""
        messagebox.showinfo("Info", "Adding new patient test...")
        
    def focus_field(self):
        """Focus on camera field"""
        messagebox.showinfo("Info", "Focusing on camera field...")
        
    def focus_report(self):
        """Focus on report section"""
        messagebox.showinfo("Info", "Focusing on report section...")
        
    def show_urinalysis_report(self):
        self.clear_content()
        report_frame = tk.Frame(self.content_area, bg='#ffffff')
        report_frame.pack(expand=True, fill="both", padx=30, pady=30)
        
        tk.Label(report_frame, text="📊 Urinalysis Report", 
                font=("Arial", 24, "bold"), fg="#1F2937", bg='#ffffff').pack(anchor="w", pady=(0, 20))
        
        # Patient info section
        patient_card = tk.Frame(report_frame, bg='#F9FAFB', relief="raised", bd=1)
        patient_card.pack(fill="x", pady=(0, 20))
        
        tk.Label(patient_card, text="👤 Patient Information", font=("Arial", 16, "bold"),
                fg="#1F2937", bg='#F9FAFB').pack(anchor="w", pady=20, padx=20)
        
        # Patient form
        form_frame = tk.Frame(patient_card, bg='#F9FAFB')
        form_frame.pack(anchor="w", padx=20, pady=(0, 20))
        
        # Patient name
        tk.Label(form_frame, text="Patient Name:", font=("Arial", 12, "bold"), 
                fg="#374151", bg='#F9FAFB').grid(row=0, column=0, sticky="w", padx=(0, 10), pady=5)
        name_entry = tk.Entry(form_frame, font=("Arial", 12), width=30)
        name_entry.grid(row=0, column=1, padx=(0, 20), pady=5)
        
        # Patient age
        tk.Label(form_frame, text="Age:", font=("Arial", 12, "bold"), 
                fg="#374151", bg='#F9FAFB').grid(row=0, column=2, sticky="w", padx=(0, 10), pady=5)
        age_entry = tk.Entry(form_frame, font=("Arial", 12), width=10)
        age_entry.grid(row=0, column=3, pady=5)
        
        # Gender
        tk.Label(form_frame, text="Gender:", font=("Arial", 12, "bold"), 
                fg="#374151", bg='#F9FAFB').grid(row=1, column=0, sticky="w", padx=(0, 10), pady=5)
        gender_var = tk.StringVar(value="Male")
        gender_combo = ttk.Combobox(form_frame, textvariable=gender_var, 
                                   font=("Arial", 12), width=15)
        gender_combo['values'] = ("Male", "Female", "Other")
        gender_combo.grid(row=1, column=1, padx=(0, 20), pady=5)
        
        # Collection time
        tk.Label(form_frame, text="Collection Time:", font=("Arial", 12, "bold"), 
                fg="#374151", bg='#F9FAFB').grid(row=1, column=2, sticky="w", padx=(0, 10), pady=5)
        time_entry = tk.Entry(form_frame, font=("Arial", 12), width=15)
        time_entry.grid(row=1, column=3, pady=5)
        
        # Action buttons
        button_frame = tk.Frame(report_frame, bg='#ffffff')
        button_frame.pack(fill="x", pady=20)
        
        tk.Button(button_frame, text="📷 Capture Images", command=self.show_image_capture,
                 bg="#3B82F6", fg="white", font=("Arial", 12, "bold"), 
                 relief="flat", bd=0, cursor="hand2", padx=20, pady=10).pack(side="left", padx=(0, 10))
        
        tk.Button(button_frame, text="🔬 Start Analysis", command=self.start_analysis,
                 bg="#10B981", fg="white", font=("Arial", 12, "bold"),
                 relief="flat", bd=0, cursor="hand2", padx=20, pady=10).pack(side="left")
        
    def show_image_capture(self):
        self.clear_content()
        capture_frame = tk.Frame(self.content_area, bg='#ffffff')
        capture_frame.pack(expand=True, fill="both", padx=30, pady=30)
        
        tk.Label(capture_frame, text="📷 Image Capture", 
                font=("Arial", 24, "bold"), fg="#1F2937", bg='#ffffff').pack(anchor="w", pady=(0, 20))
        
        # Camera controls
        camera_card = tk.Frame(capture_frame, bg='#F9FAFB', relief="raised", bd=1)
        camera_card.pack(fill="x", pady=(0, 20))
        
        tk.Label(camera_card, text="🔬 Microscope Camera", font=("Arial", 16, "bold"),
                fg="#1F2937", bg='#F9FAFB').pack(anchor="w", pady=20, padx=20)
        
        # Camera controls
        controls_frame = tk.Frame(camera_card, bg='#F9FAFB')
        controls_frame.pack(anchor="w", padx=20, pady=(0, 20))
        
        tk.Button(controls_frame, text="📷 Capture LPF Image", command=self.capture_lpf,
                 bg="#3B82F6", fg="white", font=("Arial", 12, "bold"), 
                 relief="flat", bd=0, cursor="hand2", padx=20, pady=10).pack(side="left", padx=(0, 10))
        
        tk.Button(controls_frame, text="📷 Capture HPF Image", command=self.capture_hpf,
                 bg="#10B981", fg="white", font=("Arial", 12, "bold"),
                 relief="flat", bd=0, cursor="hand2", padx=20, pady=10).pack(side="left")
        
        # Image preview area
        preview_card = tk.Frame(capture_frame, bg='#F9FAFB', relief="raised", bd=1)
        preview_card.pack(fill="both", expand=True)
        
        tk.Label(preview_card, text="📸 Captured Images", font=("Arial", 16, "bold"),
                fg="#1F2937", bg='#F9FAFB').pack(anchor="w", pady=20, padx=20)
        
        # Placeholder for image preview
        preview_text = tk.Text(preview_card, height=15, width=70, 
                              bg='#ffffff', fg="#1F2937", font=("Consolas", 10),
                              relief="solid", bd=1, insertbackground='#1F2937')
        preview_text.pack(fill="both", expand=True, padx=20, pady=(0, 20))
        preview_text.insert(tk.END, "No images captured yet.\n")
        preview_text.insert(tk.END, "Click 'Capture LPF Image' or 'Capture HPF Image' to start.\n\n")
        
    def show_microscope_control(self):
        self.clear_content()
        self.gpio_control = GPIOControlUI(self.content_area, self.app)
        self.gpio_control.pack(expand=True, fill="both", padx=30, pady=30)
        
    def show_analysis_results(self):
        self.clear_content()
        analysis_frame = tk.Frame(self.content_area, bg='#ffffff')
        analysis_frame.pack(expand=True, fill="both", padx=30, pady=30)
        
        tk.Label(analysis_frame, text="📈 Analysis Results", 
                font=("Arial", 24, "bold"), fg="#1F2937", bg='#ffffff').pack(anchor="w", pady=(0, 20))
        
        # Results card
        results_card = tk.Frame(analysis_frame, bg='#F9FAFB', relief="raised", bd=1)
        results_card.pack(fill="both", expand=True)
        
        tk.Label(results_card, text="🔬 Microscopic Findings", font=("Arial", 16, "bold"),
                fg="#1F2937", bg='#F9FAFB').pack(anchor="w", pady=20, padx=20)
        
        # Results table placeholder
        results_text = tk.Text(results_card, height=20, width=80, 
                              bg='#ffffff', fg="#1F2937", font=("Consolas", 10),
                              relief="solid", bd=1, insertbackground='#1F2937')
        results_text.pack(fill="both", expand=True, padx=20, pady=(0, 20))
        results_text.insert(tk.END, "Analysis results will appear here after processing images.\n\n")
        results_text.insert(tk.END, "Expected findings:\n")
        results_text.insert(tk.END, "- Epithelial Cells: 0-5/hpf\n")
        results_text.insert(tk.END, "- Red Blood Cells: 0-2/hpf\n")
        results_text.insert(tk.END, "- White Blood Cells: 0-2/hpf\n")
        results_text.insert(tk.END, "- Bacteria: 0-10/hpf\n")
        results_text.insert(tk.END, "- Crystals: 0-2/hpf\n")
        results_text.insert(tk.END, "- Casts: 0-2/hpf\n")
        
    def show_settings(self):
        self.clear_content()
        settings_frame = tk.Frame(self.content_area, bg='#ffffff')
        settings_frame.pack(expand=True, fill="both", padx=30, pady=30)
        
        tk.Label(settings_frame, text="⚙️ Settings", 
                font=("Arial", 24, "bold"), fg="#1F2937", bg='#ffffff').pack(anchor="w", pady=(0, 20))
        
        tk.Label(settings_frame, text="Settings panel coming soon!", 
                font=("Arial", 14), fg="#6B7280", bg='#ffffff').pack(anchor="w")
        
    def clear_content(self):
        for widget in self.content_area.winfo_children():
            widget.destroy()
            
    def run_analysis(self):
        messagebox.showinfo("Info", "Analysis feature coming soon!")
        
    def start_analysis(self):
        messagebox.showinfo("Info", "Starting urinalysis analysis...")
        
    def capture_lpf(self):
        messagebox.showinfo("Info", "Capturing LPF (Low Power Field) image...")
        
    def capture_hpf(self):
        messagebox.showinfo("Info", "Capturing HPF (High Power Field) image...")
        
    def logout(self):
        self.app.current_user = None
        self.app.show_login()
