import { NextRequest, NextResponse } from 'next/server'

// Public paths that never require auth
const PUBLIC_PATHS: readonly string[] = ['/', '/login', '/signup', '/favicon.ico']

// Static asset prefixes
const PUBLIC_PREFIXES: readonly string[] = ['/assets', '/_next', '/static', '/images', '/public']

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Public API routes (auth endpoints)
  const publicApiRoutes = ['/api/auth/login', '/api/auth/signup']
  const isPublicApiRoute = publicApiRoutes.some(route => pathname.startsWith(route))

  // Protect API routes (except public auth routes)
  if (pathname.startsWith('/api/') && !isPublicApiRoute) {
    const session = req.cookies.get('app_session')?.value
    const userId = req.cookies.get('user_id')?.value
    
    if (!session || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    return NextResponse.next()
  }

  // Skip middleware for other API routes (they handle their own auth)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // Check authentication for all other routes
  const session = req.cookies.get('app_session')?.value
  const userId = req.cookies.get('user_id')?.value
  
  if (!session || !userId) {
    const loginUrl = new URL('/login', req.url)
    if (pathname && pathname !== '/login') {
      loginUrl.searchParams.set('redirect', pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  // Match all paths except ones starting with the listed segments
  matcher: ['/((?!api/|_next/|static/|images/|public/).*)'],
}


