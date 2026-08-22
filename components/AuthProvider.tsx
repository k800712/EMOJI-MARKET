'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
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

  useEffect(() => {
    const verifySession = async () => {
      if (typeof window === 'undefined') {
        setIsVerifying(false)
        return
      }

      try {
        const windowClosedAt = localStorage.getItem('window_closed_at')
        if (windowClosedAt) {
          const closedTime = parseInt(windowClosedAt, 10)
          const now = Date.now()

          // 10초(10000ms) 경과 시 강제 로그아웃
          if (!isNaN(closedTime) && now - closedTime > 10000) {
            console.log('🛡️ [AuthProvider] 브라우저 종료 후 10초 경과 감지. 강제 로그아웃을 처리합니다.')
            
            // 1. Supabase Auth 로그아웃
            const supabase = createClient()
            if (supabase) {
              try {
                await supabase.auth.signOut()
              } catch (err) {
                console.error('Supabase signOut error:', err)
              }
            }

            // 2. 로컬 스토리지 정리
            localStorage.removeItem('wallet_session')
            localStorage.removeItem('kakao_nickname')
            localStorage.removeItem('kakao_realname')
            localStorage.removeItem('kakao_profile_img')

            // 3. API 세션(쿠키) 제거
            try {
              await fetch('/api/auth/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
              })
            } catch (err) {
              console.error('Logout API error:', err)
            }

            // 세션 리셋을 위한 새로고침
            window.location.reload()
            return
          }
        }
      } catch (e) {
        console.error('[AuthProvider] 세션 검증 도중 오류 발생:', e)
      } finally {
        // 판별 후 다음 사이클을 위해 정리 및 완료 처리
        if (typeof window !== 'undefined') {
          localStorage.removeItem('window_closed_at')
        }
        setIsVerifying(false)
      }
    }

    verifySession()

    // beforeunload 이벤트 핸들러 장착
    const handleBeforeUnload = () => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('window_closed_at', Date.now().toString())
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleBeforeUnload)
      }
    }
  }, [])

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
