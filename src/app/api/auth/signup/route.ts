import { NextRequest, NextResponse } from 'next/server'
import { requireAdminClient } from '@/lib/supabase-admin'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName } = await req.json()

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: 'Email, password, and full name are required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    if (!email.includes('@')) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
    }

    // Check if user already exists
    const admin = requireAdminClient()
    const { data: existingUser } = await admin
      .from('med_tech')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create new user
    const { data: newUser, error } = await admin
      .from('med_tech')
      .insert({
        email,
        password_hash: passwordHash,
        full_name: fullName,
        role: 'medtech',
        is_active: true
      })
      .select('id, email, full_name, role')
      .single()

    if (error) {
      console.error('Error creating user:', error)
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      user: { 
        id: newUser.id, 
        email: newUser.email, 
        full_name: newUser.full_name,
        role: newUser.role 
      } 
    })
  } catch (err) {
    console.error('Signup error:', err)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
