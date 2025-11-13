import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from './auth'

/**
 * Wrapper for API route handlers that require authentication
 * Automatically checks authentication and provides the current user
 */
export function withAuth(
  handler: (req: NextRequest, user: { id: string; email: string; full_name: string; role: string }) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const user = await requireAuth(req)
      return await handler(req, user)
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      console.error('API route error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}

