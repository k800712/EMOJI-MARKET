'use client'

import { useEffect, useRef } from 'react'

interface SessionGuardProps {
  onLogout: () => void
}

export default function SessionGuard({ onLogout }: SessionGuardProps) {
  const isTriggeredRef = useRef(false)

  useEffect(() => {
    const handleVisibilityChange = async () => {
      // 탭 이탈 (visibilityState = hidden) 감지 시 작동
      if (document.visibilityState === 'hidden' && !isTriggeredRef.current) {
        isTriggeredRef.current = true // 단타 트리거 락
        console.log('[SessionGuard] 창 이탈(visibilitychange: hidden) 감지. 즉시 자동 로그아웃을 수행합니다.')
        
        // 1. 로컬 스토리지의 자동 로그인 키 선제 소거 (복귀 시 강제 자동로그인 복구 차단)
        localStorage.removeItem('wallet_session')

        try {
          // 2. 백엔드 로그아웃 API 호출 (keepalive: true 를 주어 페이지 언로드 상황에서도 끝까지 전송 보장)
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            keepalive: true
          })
        } catch (e) {
          console.error('[SessionGuard] 로그아웃 API 전송 실패:', e)
        } finally {
          // 3. 프론트엔드 리액트 로그인 상태 초기화
          onLogout()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [onLogout])

  return null
}
