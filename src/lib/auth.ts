import { NextRequest } from 'next/server'
import { requireAdminClient } from './supabase-admin'

export interface User {
  id: string
  email: string
  full_name: string
  role: string
}

/**
 * Get the current authenticated user from the session cookie
 * Returns null if not authenticated or if demo account has expired
 */
export async function getCurrentUser(req: NextRequest): Promise<User | null> {
  try {
    // Get user ID from session cookie
    const userId = req.cookies.get('user_id')?.value
    
    if (!userId) {
      return null
    }

    // Verify user exists and is active
    const admin = requireAdminClient()
    const { data: user, error } = await admin
      .from('med_tech')
      .select('id, email, full_name, role')
      .eq('id', userId)
      .eq('is_active', true)
      .maybeSingle()

    if (error || !user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name || '',
      role: user.role
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Require authentication - throws error if user is not authenticated
 */
export async function requireAuth(req: NextRequest): Promise<User> {
  const user = await getCurrentUser(req)
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

