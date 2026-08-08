import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(req: NextRequest) {
  try {
    // 1. x-admin-token 헤더 보안 검증
    const adminToken = req.headers.get('x-admin-token')
    const expectedToken = process.env.ADMIN_ACCESS_TOKEN || 'admin123'

    if (!adminToken || adminToken !== expectedToken) {
      return NextResponse.json({
        status: 'error',
        message: '🔒 승인되지 않은 관리자 요청입니다. 토큰이 올바르지 않습니다.'
      }, { status: 403 })
    }

    const supabase = await createClient(true) // service_role

    // UTC 기준 금일 시작 시각 계산
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)
    const todayIso = todayStart.toISOString()

    // 2. 비동기 Promise.all 병렬 집계 기동 (대시보드 로딩 레이턴시 최소화)
    const [
      totalUsersRes,
      todayUsersRes,
      totalEmojisRes,
      totalPointsRes,
      todayTxCountRes,
      todayTxSumRes
    ] = await Promise.all([
      // 총 유저 수
      supabase.from('web3_users').select('*', { count: 'exact', head: true }),
      // 오늘 가입 유저
      supabase.from('web3_users').select('*', { count: 'exact', head: true }).gte('created_at', todayIso),
      // 누적 이모지
      supabase.from('emojis').select('*', { count: 'exact', head: true }),
      // 유저 보유 포인트 합산
      supabase.from('web3_users').select('points'),
      // 오늘 포인트 트랜잭션 개수
      supabase.from('point_transactions').select('*', { count: 'exact', head: true }).gte('created_at', todayIso),
      // 오늘 포인트 변동 합산
      supabase.from('point_transactions').select('amount').gte('created_at', todayIso)
    ])

    if (totalUsersRes.error) throw totalUsersRes.error
    if (todayUsersRes.error) throw todayUsersRes.error
    if (totalEmojisRes.error) throw totalEmojisRes.error
    if (totalPointsRes.error) throw totalPointsRes.error
    if (todayTxCountRes.error) throw todayTxCountRes.error
    if (todayTxSumRes.error) throw todayTxSumRes.error

    // 포인트 합산 계산
    const pointsData = totalPointsRes.data || []
    const totalPoints = pointsData.reduce((sum, item) => sum + (item.points || 0), 0)

    // 오늘 포인트 변동량 합산 계산
    const txData = todayTxSumRes.data || []
    const todayPointsChange = txData.reduce((sum, item) => sum + (item.amount || 0), 0)

    return NextResponse.json({
      status: 'success',
      data: {
        totalUsers: totalUsersRes.count || 0,
        todayNewUsers: todayUsersRes.count || 0,
        totalEmojis: totalEmojisRes.count || 0,
        systemTotalPoints: totalPoints,
        todayTransactionsCount: todayTxCountRes.count || 0,
        todayPointsDelta: todayPointsChange
      }
    })

  } catch (error: any) {
    console.error('Admin stats API error:', error)
    return NextResponse.json({
      status: 'error',
      message: error.message || '실시간 지표 집계 도중 에러가 발생했습니다.'
    }, { status: 500 })
  }
}
