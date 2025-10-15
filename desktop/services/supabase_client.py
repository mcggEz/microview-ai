# desktop/services/supabase_client.py
from supabase import create_client, Client
import os
from config import SUPABASE_URL, SUPABASE_KEY

class SupabaseClient:
    def __init__(self):
        self.url = SUPABASE_URL
        self.key = SUPABASE_KEY
        
        # Check if we have valid credentials
        if not self.url or not self.key or 'placeholder' in self.url or 'placeholder' in self.key:
            print("⚠️  Supabase credentials not configured - running in offline mode")
            self.client = None
        else:
            try:
                self.client: Client = create_client(self.url, self.key)
                print("✅ Supabase connected successfully")
            except Exception as e:
                print(f"❌ Supabase connection failed: {e}")
                self.client = None
        
    def get_user(self, email):
        """Get user by email"""
        if not self.client:
            print("Supabase not connected - returning mock user")
            return {
                'id': 'mock-user-id',
                'email': email,
                'name': 'Mock User',
                'course': 'BS Information Technology',
                'student_number': 'MOCK001'
            }
        
        try:
            response = self.client.table('users').select('*').eq('email', email).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error getting user: {e}")
            return None
            
    def create_user(self, user_data):
        """Create new user"""
        if not self.client:
            print("Supabase not connected - returning mock user")
            return {
                'id': 'mock-user-id',
                'email': user_data.get('email'),
                'name': user_data.get('name'),
                'course': user_data.get('course'),
                'student_number': user_data.get('student_number')
            }
        
        try:
            response = self.client.table('users').insert(user_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error creating user: {e}")
            return None
            
    def update_user(self, user_id, update_data):
        """Update user data"""
        if not self.client:
            print("Supabase not connected - mock update")
            return update_data
        
        try:
            response = self.client.table('users').update(update_data).eq('id', user_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error updating user: {e}")
            return None
