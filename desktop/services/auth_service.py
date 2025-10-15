# desktop/services/auth_service.py
from services.supabase_client import SupabaseClient
import hashlib
import time

class AuthService:
    def __init__(self):
        self.supabase_client = SupabaseClient()
        
    def login(self, email, password):
        """Login user"""
        try:
            # Get user from database
            user = self.supabase_client.get_user(email)
            if not user:
                return None
                
            # Simple password check (in production, use proper hashing)
            if user.get('password') == password:
                return user
            return None
            
        except Exception as e:
            print(f"Login error: {e}")
            return None
            
    def signup(self, name, email, course, password):
        """Signup new user"""
        try:
            # Check if user already exists
            existing_user = self.supabase_client.get_user(email)
            if existing_user:
                return None
                
            # Create new user
            user_data = {
                'name': name,
                'email': email,
                'course': course,
                'password': password,  # In production, hash this
                'student_number': f"STU{int(time.time())}",
                'created_at': time.time()
            }
            
            return self.supabase_client.create_user(user_data)
            
        except Exception as e:
            print(f"Signup error: {e}")
            return None
