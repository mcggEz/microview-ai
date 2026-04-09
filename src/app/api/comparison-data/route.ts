import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { requireAdminClient } from '@/lib/supabase-admin'

// GET /api/comparison-data - Fetch tests with averaged WBC/RBC from image_analysis
// Query params: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const admin = requireAdminClient()
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Fetch tests for this user
    let testsQuery = admin
      .from('urine_tests')
      .select('id, test_code, patient_id, analysis_date, status, technician')
      .eq('med_tech_id', user.id)
      .order('analysis_date', { ascending: false })

    if (startDate) testsQuery = testsQuery.gte('analysis_date', startDate)
    if (endDate) testsQuery = testsQuery.lte('analysis_date', endDate)

    const { data: tests, error: testsError } = await testsQuery

    if (testsError) {
      console.error('Error fetching tests:', testsError)
      return NextResponse.json({ error: 'Failed to fetch tests' }, { status: 500 })
    }

    if (!tests || tests.length === 0) {
      return NextResponse.json({ samples: [] })
    }

    // Fetch patient names for all tests
    const patientIds = [...new Set(tests.map(t => t.patient_id))]
    const { data: patients } = await admin
      .from('patients')
      .select('id, name, patient_id')
      .in('id', patientIds)

    const patientMap = new Map(
      (patients || []).map(p => [p.id, p])
    )

    // Fetch image_analysis for all test IDs (include image_url + yolo_detections for sediment view)
    const testIds = tests.map(t => t.id)
    const { data: analyses, error: analysisError } = await admin
      .from('image_analysis')
      .select('test_id, power_mode, image_index, image_url, hpf_rbc, hpf_wbc, lpf_epithelial_cells, lpf_casts, lpf_mucus_threads, confidence, yolo_detections')
      .in('test_id', testIds)

    if (analysisError) {
      console.error('Error fetching analyses:', analysisError)
      return NextResponse.json({ error: 'Failed to fetch analysis data' }, { status: 500 })
    }

    // YOLO class name normalization
    const classMap: Record<string, string> = {
      'eryth': 'RBC', 'rbc': 'RBC', 'red blood cell': 'RBC', 'red blood cells': 'RBC',
      'leuko': 'WBC', 'wbc': 'WBC', 'white blood cell': 'WBC', 'white blood cells': 'WBC',
      'epith': 'Epithelial', 'epithn': 'Epithelial', 'epithelial': 'Epithelial', 'epithelial cells': 'Epithelial',
      'cryst': 'Crystals', 'crystals': 'Crystals', 'crystal': 'Crystals',
      'cast': 'Casts', 'casts': 'Casts',
      'mycete': 'Yeast', 'yeast': 'Yeast',
      'bacteria': 'Bacteria',
    }

    // Group analyses by test_id and compute averages + collect detections
    const analysisByTest = new Map<string, {
      hpfCount: number; totalRbc: number; totalWbc: number;
      lpfCount: number; totalEpithelial: number; totalCasts: number; totalMucus: number;
      totalConfidence: number; analysisCount: number;
      detections: Array<{ imageUrl: string; x: number; y: number; width: number; height: number; class: string; confidence: number }>;
    }>()

    for (const a of (analyses || [])) {
      let entry = analysisByTest.get(a.test_id)
      if (!entry) {
        entry = { hpfCount: 0, totalRbc: 0, totalWbc: 0, lpfCount: 0, totalEpithelial: 0, totalCasts: 0, totalMucus: 0, totalConfidence: 0, analysisCount: 0, detections: [] }
        analysisByTest.set(a.test_id, entry)
      }
      if (a.power_mode === 'HPF') {
        entry.hpfCount++
        entry.totalRbc += a.hpf_rbc || 0
        entry.totalWbc += a.hpf_wbc || 0
      }
      if (a.power_mode === 'LPF') {
        entry.lpfCount++
        entry.totalEpithelial += a.lpf_epithelial_cells || 0
        entry.totalCasts += a.lpf_casts || 0
        entry.totalMucus += a.lpf_mucus_threads || 0
      }
      entry.totalConfidence += a.confidence || 0
      entry.analysisCount++

      // Collect all detections with image URLs for cropping
      if (a.yolo_detections && a.image_url) {
        const preds = (a.yolo_detections as any)?.predictions || []
        for (const pred of preds) {
          const cls = (pred.class || '').toLowerCase()
          const normalized = classMap[cls] || cls.charAt(0).toUpperCase() + cls.slice(1)
          entry.detections.push({
            imageUrl: a.image_url,
            x: pred.x,
            y: pred.y,
            width: pred.width,
            height: pred.height,
            class: normalized,
            confidence: pred.confidence || 0,
          })
        }
      }
    }

    // Build response
    const samples = tests.map((t, idx) => {
      const patient = patientMap.get(t.patient_id)
      const stats = analysisByTest.get(t.id)

      const avgRbc = stats && stats.hpfCount > 0 && stats.totalRbc > 0 ? Math.round(stats.totalRbc / stats.hpfCount) : null
      const avgWbc = stats && stats.hpfCount > 0 && stats.totalWbc > 0 ? Math.round(stats.totalWbc / stats.hpfCount) : null
      const avgEpithelial = stats && stats.lpfCount > 0 ? Math.round(stats.totalEpithelial / stats.lpfCount) : null
      const avgCasts = stats && stats.lpfCount > 0 ? Math.round(stats.totalCasts / stats.lpfCount) : null
      const avgConfidence = stats && stats.analysisCount > 0 ? Math.round(stats.totalConfidence / stats.analysisCount) : null

      return {
        id: t.id,
        index: idx + 1,
        testCode: t.test_code,
        patientName: patient?.name || 'Unknown',
        patientId: patient?.patient_id || '',
        analysisDate: t.analysis_date,
        status: t.status,
        technician: t.technician,
        ai: {
          avgRbc,
          avgWbc,
          avgEpithelial,
          avgCasts,
          hpfFieldsAnalyzed: stats?.hpfCount || 0,
          lpfFieldsAnalyzed: stats?.lpfCount || 0,
          avgConfidence,
        },
        detections: stats?.detections || [],
      }
    })

    return NextResponse.json({ samples })
  } catch (error) {
    console.error('Error in GET /api/comparison-data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
