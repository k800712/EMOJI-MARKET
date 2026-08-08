import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// 1. GET: 어뷰징 의심 사용자 조회
export async function GET(req: NextRequest) {
  try {
    const adminToken = req.headers.get('x-admin-token')
    const expectedToken = process.env.ADMIN_ACCESS_TOKEN || 'admin123'

    if (!adminToken || adminToken !== expectedToken) {
      return NextResponse.json({
        status: 'error',
        message: '🔒 승인되지 않은 관리자 요청입니다.'
      }, { status: 403 })
    }

    const supabase = await createClient(true) // service_role

    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 1000 * 60 * 60).toISOString()
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)
    const todayIso = todayStart.toISOString()

    // 어뷰저 탐지 룰 1: 1시간 이내 동일 추천 코드(referred_by)를 이용한 가입 3회 이상 발생건 집계
    const { data: recentReferred, error: err1 } = await supabase
      .from('web3_users')
      .select('referred_by, created_at')
      .not('referred_by', 'is', null)
      .gte('created_at', oneHourAgo)

    if (err1) throw err1

    const codeCounts: any = {}
    if (recentReferred) {
      recentReferred.forEach((u: any) => {
        codeCounts[u.referred_by] = (codeCounts[u.referred_by] || 0) + 1
      })
    }

    const suspectCodes = Object.keys(codeCounts).filter(code => codeCounts[code] >= 3)

    // 어뷰저 탐지 룰 2: 오늘 하루 동안 추천 적립금 합산이 5 P를 초과한 사용자 집계
    const { data: txList, error: err2 } = await supabase
      .from('point_transactions')
      .select('wallet_address, amount, description')
      .gte('created_at', todayIso)

    if (err2) throw err2

    const rewardSum: any = {}
    if (txList) {
      txList.forEach((tx: any) => {
        const desc = tx.description || ''
        if (desc.includes('추천') || desc.includes('초대') || desc.includes('레퍼럴')) {
          rewardSum[tx.wallet_address] = (rewardSum[tx.wallet_address] || 0) + (tx.amount || 0)
        }
      })
    }

    const suspectWallets = Object.keys(rewardSum).filter(wallet => rewardSum[wallet] > 5)

    // 용의자 정보 구체화
    let mappedSuspectWallets: string[] = [...suspectWallets]
    if (suspectCodes.length > 0) {
      const { data: codeOwners } = await supabase
        .from('web3_users')
        .select('wallet_address, referral_code')
        .in('referral_code', suspectCodes)
      
      if (codeOwners) {
        codeOwners.forEach((owner: any) => {
          if (!mappedSuspectWallets.includes(owner.wallet_address)) {
            mappedSuspectWallets.push(owner.wallet_address)
          }
        })
      }
    }

    if (mappedSuspectWallets.length === 0) {
      return NextResponse.json({ status: 'success', suspects: [] })
    }

    const { data: users, error: err3 } = await supabase
      .from('web3_users')
      .select('wallet_address, nickname, points, status, created_at')
      .in('wallet_address', mappedSuspectWallets)

    if (err3) throw err3

    // 통계 정보와 합성하여 상세 사유 부여
    const suspectsReport = (users || []).map((u: any) => {
      const todayReward = rewardSum[u.wallet_address] || 0
      const reasons = []
      if (todayReward > 5) reasons.push(`오늘 하루 추천 적립금 ${todayReward} P 획득 (5 P 초과 한도 위반)`)
      
      const codeMatches = recentReferred?.filter(r => r.referred_by && suspectCodes.includes(r.referred_by))
      if (codeMatches && codeMatches.length >= 3) {
        reasons.push('1시간 이내 다계정 추천 가입 발생(3회 이상)')
      }

      return {
        ...u,
        abuseReason: reasons.join(' / ') || '어뷰징 의심 단말 규격 위반'
      }
    })

    return NextResponse.json({
      status: 'success',
      suspects: suspectsReport
    })

  } catch (error: any) {
    console.error('Abuse GET API error:', error)
    return NextResponse.json({
      status: 'error',
      message: error.message || '어뷰징 유저 조회 도중 서버 에러가 발생했습니다.'
    }, { status: 500 })
  }
}

// 2. POST: 사용자 즉각 블랙리스트 및 해제 처리
export async function POST(req: NextRequest) {
  try {
    const adminToken = req.headers.get('x-admin-token')
    const expectedToken = process.env.ADMIN_ACCESS_TOKEN || 'admin123'

    if (!adminToken || adminToken !== expectedToken) {
      return NextResponse.json({
        status: 'error',
        message: '🔒 승인되지 않은 관리자 요청입니다.'
      }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const { walletAddress, status } = body

    if (!walletAddress || !status || !['active', 'blocked'].includes(status)) {
      return NextResponse.json({
        status: 'error',
        message: '필수 매개변수(walletAddress, status=\'active\'|\'blocked\')가 올바르지 않습니다.'
      }, { status: 400 })
    }

    const supabase = await createClient(true) // service_role

    const { data, error } = await supabase
      .from('web3_users')
      .update({ status })
      .eq('wallet_address', walletAddress.toLowerCase())
      .select('wallet_address, nickname, status')
      .single()

    if (error) throw error

    // 🚫 서비스 자동/수동 차단(Block) 로그 웹훅 발송
    const { sendAdminAlert } = require('@/utils/adminAlert')
    sendAdminAlert({
      title: '유저 블랙리스트 상태 변경',
      level: 'info',
      message: '관리자가 특정 유저의 지갑 활성 제재 상태를 업데이트하였습니다.',
      metadata: {
        '대상 지갑 주소': data.wallet_address,
        '대상 닉네임': data.nickname,
        '변경된 상태': data.status === 'blocked' ? '🔴 제재(BLOCKED)' : '🟢 활성(ACTIVE)'
      }
    })

    return NextResponse.json({
      status: 'success',
      message: `사용자 상태가 성공적으로 [${status === 'blocked' ? '제재' : '활성'}]으로 업데이트되었습니다.`,
      user: data
    })

  } catch (error: any) {
    console.error('Abuse POST API error:', error)
    return NextResponse.json({
      status: 'error',
      message: error.message || '블랙리스트 상태 변경 중 서버 에러가 발생했습니다.'
    }, { status: 500 })
  }
}
