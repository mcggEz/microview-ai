import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { requireAdminClient } from '@/lib/supabase-admin'

// GET /api/patients/[id] - Get a specific patient (only if owned by user)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req)
    const admin = requireAdminClient()

    const { data, error } = await admin
      .from('patients')
      .select('*')
      .eq('id', params.id)
      .eq('med_tech_id', user.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    return NextResponse.json({ patient: data })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error in GET /api/patients/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/patients/[id] - Update a patient (only if owned by user)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req)
    const admin = requireAdminClient()
    const body = await req.json()

    // First verify ownership
    const { data: existing } = await admin
      .from('patients')
      .select('id')
      .eq('id', params.id)
      .eq('med_tech_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    // Update patient
    const { data, error } = await admin
      .from('patients')
      .update(body)
      .eq('id', params.id)
      .eq('med_tech_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating patient:', error)
      return NextResponse.json({ error: 'Failed to update patient' }, { status: 500 })
    }

    return NextResponse.json({ patient: data })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error in PATCH /api/patients/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/patients/[id] - Delete a patient (only if owned by user)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req)
    const admin = requireAdminClient()

    // First verify ownership and check for tests
    const { data: patient } = await admin
      .from('patients')
      .select('id')
      .eq('id', params.id)
      .eq('med_tech_id', user.id)
      .single()

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    // Check if patient has tests
    const { data: tests } = await admin
      .from('urine_tests')
      .select('id')
      .eq('patient_id', params.id)
      .limit(1)

    if (tests && tests.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete patient with existing tests. Please delete all tests first.' },
        { status: 400 }
      )
    }

    // Delete patient
    const { error } = await admin
      .from('patients')
      .delete()
      .eq('id', params.id)
      .eq('med_tech_id', user.id)

    if (error) {
      console.error('Error deleting patient:', error)
      return NextResponse.json({ error: 'Failed to delete patient' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error in DELETE /api/patients/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

