import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { requireAdminClient } from '@/lib/supabase-admin'
import { Patient } from '@/types/database'

// GET /api/patients - Get all patients for the authenticated user
export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const admin = requireAdminClient()
    const { data, error } = await admin
      .from('patients')
      .select('*')
      .eq('med_tech_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching patients:', error)
      return NextResponse.json({ error: 'Failed to fetch patients' }, { status: 500 })
    }

    return NextResponse.json({ patients: data || [] })
  } catch (error) {
    console.error('Error in GET /api/patients:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

// POST /api/patients - Create a new patient for the authenticated user
export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json()
    let { name, patient_id, age, gender } = body

    // Convert age to number if it's a string
    if (typeof age === 'string') {
      age = parseInt(age, 10)
      if (isNaN(age)) {
        return NextResponse.json({ error: 'Age must be a valid number' }, { status: 400 })
      }
    }

    // Validate required fields (age can be 0, so check for null/undefined specifically)
    if (!name || !patient_id || age === null || age === undefined || !gender) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: `Missing: ${!name ? 'name, ' : ''}${!patient_id ? 'patient_id, ' : ''}${age === null || age === undefined ? 'age, ' : ''}${!gender ? 'gender' : ''}`.replace(/,\s*$/, '')
      }, { status: 400 })
    }

    // Validate age is a number and non-negative
    if (typeof age !== 'number' || isNaN(age) || age < 0) {
      return NextResponse.json({ error: 'Age must be a valid non-negative number' }, { status: 400 })
    }

    const admin = requireAdminClient()
    const { data, error } = await admin
      .from('patients')
      .insert({
        name,
        patient_id,
        age,
        gender,
        med_tech_id: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating patient:', error)
      return NextResponse.json({ error: 'Failed to create patient' }, { status: 500 })
    }

    return NextResponse.json({ patient: data }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/patients:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

