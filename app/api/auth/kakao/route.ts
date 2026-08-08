import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createHash } from 'crypto'
import { cookies } from 'next/headers'

// 카카오 고유 ID를 해싱하여 0x로 시작하는 Deterministic Wallet Address 자동 생성
function generateVirtualWallet(kakaoId: string): string {
  const hash = createHash('sha256').update(kakaoId).digest('hex')
  return `0x${hash.substring(0, 40)}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { kakaoId, nickname } = body

    if (!kakaoId) {
      return NextResponse.json({ status: 'error', message: '카카오 회원 고유 ID가 필요합니다.' }, { status: 400 })
    }

    const virtualWallet = generateVirtualWallet(kakaoId.toString())
    const supabase = await createClient(true) // service_role

    // 1. 기존 유저 존재 여부 확인
    const { data: userRecord, error: userError } = await supabase
      .from('web3_users')
      .select('wallet_address, points')
      .eq('wallet_address', virtualWallet.toLowerCase())
      .single()

    if (userError || !userRecord) {
      // 2. 신규 가입 처리 (웰컴 3포인트 기본 지급)
      const { error: insertError } = await supabase
        .from('web3_users')
        .insert({
          wallet_address: virtualWallet.toLowerCase(),
          nickname: nickname || '카카오 학생',
          nonce: 'KAKAO_SOCIAL',
          nonce_expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1시간 만료
          points: 3,
          kakao_id: kakaoId.toString()
        })

      if (insertError) {
        throw insertError
      }

      // 3. point_transactions에 가입 보너스 이력 기록
      await supabase
        .from('point_transactions')
        .insert({
          wallet_address: virtualWallet.toLowerCase(),
          amount: 3,
          transaction_type: 'gift',
          description: '웰컴 가입 보너스 3P 지급'
        })
    }

    // 4. 보안 로그인 세션 쿠키 생성 (기존 시스템 호환을 위해 wallet_address 키 이름 유지)
    const cookieStore = await cookies()
    cookieStore.set('wallet_address', virtualWallet.toLowerCase(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7일간 세션 유지
      path: '/'
    })

    return NextResponse.json({
      status: 'success',
      address: virtualWallet.toLowerCase(),
      nickname: nickname || '카카오 학생'
    })

  } catch (error: any) {
    console.error('Kakao login mapping API error:', error)
    return NextResponse.json({
      status: 'error',
      message: error.message || '카카오 로그인 처리 도중 에러가 발생했습니다.'
    }, { status: 500 })
  }
}
