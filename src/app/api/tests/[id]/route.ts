import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { requireAdminClient } from '@/lib/supabase-admin'

// GET /api/tests/[id] - Get a specific test (only if owned by user)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req)
    const admin = requireAdminClient()

    const { data, error } = await admin
      .from('urine_tests')
      .select('*')
      .eq('id', params.id)
      .eq('med_tech_id', user.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 })
    }

    return NextResponse.json({ test: data })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error in GET /api/tests/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/tests/[id] - Update a test (only if owned by user)
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
      .from('urine_tests')
      .select('id')
      .eq('id', params.id)
      .eq('med_tech_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 })
    }

    // Update test
    const { data, error } = await admin
      .from('urine_tests')
      .update(body)
      .eq('id', params.id)
      .eq('med_tech_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating test:', error)
      return NextResponse.json({ error: 'Failed to update test' }, { status: 500 })
    }

    return NextResponse.json({ test: data })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error in PATCH /api/tests/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/tests/[id] - Delete a test (only if owned by user)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req)
    const admin = requireAdminClient()

    // First verify ownership
    const { data: test } = await admin
      .from('urine_tests')
      .select('*')
      .eq('id', params.id)
      .eq('med_tech_id', user.id)
      .single()

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 })
    }

    // Delete associated images from storage (if any)
    // Note: This is a simplified version - you may want to enhance this
    const allImages = [
      ...(test.microscopic_images || []),
      ...(test.hpf_images || []),
      ...(test.lpf_images || [])
    ]

    // Delete images from storage bucket
    for (const imageUrl of allImages) {
      try {
        const url = new URL(imageUrl)
        const pathParts = url.pathname.split('/')
        const filePath = pathParts.slice(-2).join('/')
        await admin.storage.from('urine-images').remove([filePath])
      } catch (err) {
        console.warn(`Failed to delete image ${imageUrl}:`, err)
      }
    }

    // Delete associated data
    await admin.from('sediment_analysis').delete().eq('test_id', params.id)
    await admin.from('image_analysis').delete().eq('test_id', params.id)

    // Delete test
    const { error } = await admin
      .from('urine_tests')
      .delete()
      .eq('id', params.id)
      .eq('med_tech_id', user.id)

    if (error) {
      console.error('Error deleting test:', error)
      return NextResponse.json({ error: 'Failed to delete test' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error in DELETE /api/tests/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

