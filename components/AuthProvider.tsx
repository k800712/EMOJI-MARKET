'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

interface AuthContextType {
  isVerifying: boolean
}

const AuthContext = createContext<AuthContextType>({ isVerifying: true })

export function useAuth() {
  return useContext(AuthContext)
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isVerifying, setIsVerifying] = useState(true)
  const isChecked = useRef(false)
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsVerifying(false)
      return
    }

    const supabase = createClient()

    // 창 닫기 감지 핸들러
    const recordWindowCloseTime = () => {
      localStorage.setItem('window_closed_at', Date.now().toString())
    }

    // 10초 유예 로그아웃 판별 함수
    const verifyGracePeriod = async () => {
      // 1. 중복 실행 방지용 플래그 체크 (무한 루프 차단)
      if (isChecked.current) return
      isChecked.current = true

      try {
        const windowClosedAt = localStorage.getItem('window_closed_at')
        if (windowClosedAt) {
          const closedTime = parseInt(windowClosedAt, 10)
          const now = Date.now()

          // 10초(10000ms) 경과 시 강제 로그아웃
          if (!isNaN(closedTime) && now - closedTime > 10000) {
            console.log('🛡️ [AuthProvider] 브라우저 종료 후 10초 경과 감지. 강제 로그아웃을 처리합니다.')
            
            // 의도적인 로그아웃 시 리스너를 즉시 해제하여 루프 차단
            window.removeEventListener('beforeunload', recordWindowCloseTime)
            
            // Supabase Auth 로그아웃
            if (supabase) {
              try {
                await supabase.auth.signOut()
              } catch (err) {
                console.error('Supabase signOut error:', err)
              }
            }

            // 로컬 스토리지 정리
            localStorage.removeItem('wallet_session')
            localStorage.removeItem('kakao_nickname')
            localStorage.removeItem('kakao_realname')
            localStorage.removeItem('kakao_profile_img')
            localStorage.removeItem('window_closed_at')

            // API 세션(쿠키) 제거
            try {
              await fetch('/api/auth/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
              })
            } catch (err) {
              console.error('Logout API error:', err)
            }

            // 쿠키 강제 초기화
            document.cookie = `sb-access-token=; path=/; max-age=0; SameSite=Lax; Secure`
            document.cookie = `sb-refresh-token=; path=/; max-age=0; SameSite=Lax; Secure`
            document.cookie = `wallet_address=; path=/; max-age=0; SameSite=Lax; Secure`

            // 메인 페이지 이동 및 상태 동기화 리프레시
            router.push('/')
            router.refresh()
            return
          }
        }
      } catch (e) {
        console.error('[AuthProvider] 세션 검증 도중 오류 발생:', e)
      } finally {
        // 판별 후 다음 사이클을 위해 정리 및 완료 처리
        localStorage.removeItem('window_closed_at')
        setIsVerifying(false)
      }
    }

    // 최초 검증 실행
    verifyGracePeriod()

    // beforeunload 이벤트 핸들러 등록
    window.addEventListener('beforeunload', recordWindowCloseTime)

    // 2. Supabase onAuthStateChange 리스너를 활용한 세션/쿠키 동기화 보완
    let authListener: any = null
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`🔐 [AuthProvider] Auth event: ${event}`)

        if (event === 'SIGNED_IN' && session) {
          // access_token, refresh_token 쿠키 굽기 (미들웨어 동기화용)
          const maxAge = session.expires_in ?? 3600
          document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`
          document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`

          // 지갑 로그인 주소 쿠키와 동기화
          if (session.user) {
            const userWallet = session.user.user_metadata?.wallet_address || session.user.email?.split('@')[0]
            if (userWallet) {
              document.cookie = `wallet_address=${userWallet.toLowerCase()}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`
              localStorage.setItem('wallet_session', userWallet.toLowerCase())
            }
          }
          router.refresh()
        } else if (event === 'SIGNED_OUT') {
          // 세션 아웃 시 쿠키 클리어
          document.cookie = `sb-access-token=; path=/; max-age=0; SameSite=Lax; Secure`
          document.cookie = `sb-refresh-token=; path=/; max-age=0; SameSite=Lax; Secure`
          document.cookie = `wallet_address=; path=/; max-age=0; SameSite=Lax; Secure`
          
          localStorage.removeItem('wallet_session')
          localStorage.removeItem('kakao_nickname')
          localStorage.removeItem('kakao_realname')
          localStorage.removeItem('kakao_profile_img')
          
          router.refresh()
        } else if (event === 'TOKEN_REFRESHED' && session) {
          const maxAge = session.expires_in ?? 3600
          document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`
          document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`
        }
      })
      authListener = subscription
    }

    return () => {
      window.removeEventListener('beforeunload', recordWindowCloseTime)
      if (authListener) {
        authListener.unsubscribe()
      }
    }
  }, [router])

  if (isVerifying) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 font-sans">
        <div className="relative flex items-center justify-center">
          {/* 아우터 스피너 그라디언트 회전 */}
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500"></div>
          {/* 이너 스피너 역회전 */}
          <div className="absolute h-10 w-10 animate-spin rounded-full border-4 border-violet-500/10 border-b-violet-400 [animation-direction:reverse]"></div>
        </div>
        <p className="mt-6 text-sm font-semibold tracking-wider text-indigo-400 animate-pulse">
          보안 세션 무결성 검증 중...
        </p>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ isVerifying }}>
      {children}
    </AuthContext.Provider>
  )
}
