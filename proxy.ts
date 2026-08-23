import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. 쿠키 정보 기반으로 로그인 여부 확인
  const token = request.cookies.get('sb-access-token')?.value
  const wallet = request.cookies.get('wallet_address')?.value
  const isLoggedIn = !!(token || wallet)

  // 2. 보호된 경로 리스트 설정
  const isProtectedRoute = pathname.startsWith('/pet-sticker') || pathname.startsWith('/my-room')
  
  // 3. 로그인 라우트 확인
  const isLoginRoute = pathname === '/login'

  // 비로그인 상태인데 보호된 경로로 접근하면 -> /login 으로 강제 전환
  if (isProtectedRoute && !isLoggedIn) {
    console.log(`🛡️ [Middleware] 비로그인 유저 보호 경로 진입 차단 -> /login 리다이렉트`)
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // 로그인 상태인데 로그인 페이지로 접근하면 -> /pet-sticker 로 자동 우회 (루프 방지)
  if (isLoginRoute && isLoggedIn) {
    console.log(`🛡️ [Middleware] 이미 로그인된 유저 로그인 경로 진입 차단 -> /pet-sticker 리다이렉트`)
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = '/pet-sticker'
    return NextResponse.redirect(dashboardUrl)
  }

  return NextResponse.next()
}

export const config = {
  // matcher 지정을 통해 꼭 필요한 경로에서만 미들웨어가 작동하도록 정밀 제어
  matcher: [
    '/pet-sticker/:path*',
    '/my-room/:path*',
    '/login'
  ]
}
