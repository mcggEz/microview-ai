import { NextRequest, NextResponse } from 'next/server'

// Public paths that never require auth
const PUBLIC_PATHS: readonly string[] = ['/', '/login', '/favicon.ico']

// Static asset prefixes
const PUBLIC_PREFIXES: readonly string[] = ['/assets', '/_next', '/static', '/images', '/public']

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Always skip API routes from auth middleware
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const session = req.cookies.get('app_session')?.value
  if (!session) {
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


