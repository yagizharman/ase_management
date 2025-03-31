import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const isAuthenticated = request.cookies.has('auth-token') // You can adjust this based on your auth implementation
  const isAuthPage = request.nextUrl.pathname.startsWith('/login')

  // If trying to access authenticated routes without auth
  if (request.nextUrl.pathname.startsWith('/(authenticated)') && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If trying to access login page while authenticated
  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL('/(authenticated)', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
} 