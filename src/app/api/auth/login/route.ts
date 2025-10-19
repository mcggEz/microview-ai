import { NextRequest, NextResponse } from 'next/server'
import { requireAdminClient } from '@/lib/supabase-admin'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Fetch med_tech user by email
    const admin = requireAdminClient()
    const { data: user, error } = await admin
      .from('med_tech')
      .select('id, email, password_hash, is_active, role, full_name')
      .eq('email', email)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: 'Auth lookup failed' }, { status: 500 })
    }

    if (!user || user.is_active === false) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const res = NextResponse.json({ success: true, user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name } })
    // Minimal session cookie; replace with JWT/secure token later
    res.cookies.set('app_session', 'valid', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    })
    return res
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

