'use client'

import { useEffect, useRef } from 'react'

interface SessionGuardProps {
  onLogout: () => void
}

export default function SessionGuard({ onLogout }: SessionGuardProps) {
  const isTriggeredRef = useRef(false)
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        // 파일 선택 다이얼로그 오픈 등으로 인한 일시적 이탈(hidden) 시 즉시 로그아웃하지 않고
        // 2초의 유예 시간을 주어 모바일/데스크톱 파일 업로드 트랩을 완벽 방어합니다.
        if (!isTriggeredRef.current && !logoutTimerRef.current) {
          console.log('[SessionGuard] 창 이탈 감지. 2초 후 자동 로그아웃을 예약합니다.')
          logoutTimerRef.current = setTimeout(async () => {
            if (document.visibilityState === 'hidden') {
              const isUploadingPin = localStorage.getItem('emoji_market_upload_lock') === 'true'
              if (isUploadingPin) {
                console.log("🛡️ [SessionGuard] 모바일 이미지 업로드 중 포커스 복귀 지연 감지. 로그아웃 요청을 가드하고 세션을 유지합니다.")
                return
              }

              isTriggeredRef.current = true
              console.log('[SessionGuard] 2초 이상 이탈 확인. 자동 로그아웃을 실행합니다.')
              
              localStorage.removeItem('wallet_session')
              try {
                await fetch('/api/auth/logout', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  keepalive: true
                })
              } catch (e) {
                console.error('[SessionGuard] 로그아웃 API 전송 실패:', e)
              } finally {
                onLogout()
              }
            }
          }, 2000)
        }
      } else if (document.visibilityState === 'visible') {
        // 유저가 복귀(visible)하면 예약된 로그아웃 타이머를 즉시 취소하여 세션을 유지합니다.
        if (logoutTimerRef.current) {
          console.log('[SessionGuard] 유저 복귀 확인. 자동 로그아웃 예약을 취소합니다.')
          clearTimeout(logoutTimerRef.current)
          logoutTimerRef.current = null
        }
        // 포커스 복귀 후 1초 뒤에 락을 자연스럽게 해제하여 다음번 동작에 지장이 없도록 동기화합니다.
        setTimeout(() => {
          localStorage.removeItem('emoji_market_upload_lock')
        }, 1000)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current)
      }
    }
  }, [onLogout])

  return null
}
