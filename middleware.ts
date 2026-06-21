// middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set({ name, value, ...options }))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set({ name, value, ...options }))
        },
      },
    }
  )

  // Refresh user session token safely
  const { data: { user } } = await supabase.auth.getUser()

  // Protection layer: Redirect unauthenticated users away from private dashboard areas
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/signup')
  const isPublicAsset = request.nextUrl.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico)$/)

  if (!user && !isAuthPage && request.nextUrl.pathname !== '/' && !isPublicAsset) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect users who are already logged in away from auth screens straight to dashboard
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.:text/.*).*)',
  ],
}