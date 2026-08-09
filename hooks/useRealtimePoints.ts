'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'

export function useRealtimePoints(
  walletAddress: string | null,
  onPointsChange: (newPoints: number, delta: number) => void
) {
  const latestPointsRef = useRef<number | null>(null)

  useEffect(() => {
    if (!walletAddress) return

    const supabase = createClient()
    if (!supabase) return // SSR pre-render 시점 예외 방어

    // 1. 초기 1회성 REST API 포인트 조회 & 기준점 수립
    const fetchInitialPoints = async () => {
      try {
        const res = await fetch(`/api/user/points?wallet=${walletAddress}`)
        const data = await res.json()
        if (data.status === 'success' && typeof data.points === 'number') {
          latestPointsRef.current = data.points
          onPointsChange(data.points, 0)
        }
      } catch (err) {
        console.error('Failed to load initial points in hook', err)
      }
    }
    fetchInitialPoints()

    // 2. Supabase Realtime 채널 구동
    // filter를 통해 본인의 wallet_address 업데이트에 대해서만 통보를 받도록 한도를 지정합니다.
    const channelName = `points_${walletAddress.substring(0, 10)}_${Date.now()}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'web3_users',
          filter: `wallet_address=eq.${walletAddress.toLowerCase()}`
        },
        (payload: any) => {
          const newPoints = payload.new?.points
          if (typeof newPoints === 'number') {
            const oldPoints = latestPointsRef.current ?? newPoints
            const delta = newPoints - oldPoints
            latestPointsRef.current = newPoints
            onPointsChange(newPoints, delta)
          }
        }
      )
      .subscribe()

    // 3. 네트워크 유실 대비 이중 안전 폴백 (30초 주기적 Polling)
    const backupInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/user/points?wallet=${walletAddress}`)
        const data = await res.json()
        if (data.status === 'success' && typeof data.points === 'number') {
          const oldPoints = latestPointsRef.current ?? data.points
          if (data.points !== oldPoints) {
            const delta = data.points - oldPoints
            latestPointsRef.current = data.points
            onPointsChange(data.points, delta)
          }
        }
      } catch (err) {
        console.warn('Backup polling error:', err)
      }
    }, 30000)

    // 4. 언마운트 시 메모리 정리 및 채널 이탈
    return () => {
      clearInterval(backupInterval)
      supabase.removeChannel(channel)
    }
  }, [walletAddress])
}
