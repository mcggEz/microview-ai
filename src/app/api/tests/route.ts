import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { requireAdminClient } from '@/lib/supabase-admin'

// GET /api/tests - Get tests for the authenticated user
// Query params: ?patientId=xxx or ?date=YYYY-MM-DD
export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const admin = requireAdminClient()
    const { searchParams } = new URL(req.url)
    const patientId = searchParams.get('patientId')
    const date = searchParams.get('date')

    let query = admin
      .from('urine_tests')
      .select('*')
      .eq('med_tech_id', user.id)

    if (patientId) {
      query = query.eq('patient_id', patientId)
    }

    if (date) {
      query = query.eq('analysis_date', date)
    }

    query = query.order('analysis_date', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Error fetching tests:', error)
      return NextResponse.json({ error: 'Failed to fetch tests' }, { status: 500 })
    }

    return NextResponse.json({ tests: data || [] })
  } catch (error) {
    console.error('Error in GET /api/tests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

// POST /api/tests - Create a new test for the authenticated user
export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json()
    const { test_code, patient_id, analysis_date, collection_time, technician } = body

    if (!test_code || !patient_id || !analysis_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify patient belongs to user
    const admin = requireAdminClient()
    const { data: patient } = await admin
      .from('patients')
      .select('id')
      .eq('id', patient_id)
      .eq('med_tech_id', user.id)
      .single()

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    const { data, error } = await admin
      .from('urine_tests')
      .insert({
        test_code,
        patient_id,
        analysis_date,
        collection_time,
        technician,
        med_tech_id: user.id,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating test:', error)
      return NextResponse.json({ error: 'Failed to create test' }, { status: 500 })
    }

    return NextResponse.json({ test: data }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/tests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

