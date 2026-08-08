import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, referralCode } = await req.json()

    if (!walletAddress || !referralCode) {
      return NextResponse.json({ status: 'error', message: '필수 파라미터가 누락되었습니다.' }, { status: 400 })
    }

    // 0. 블랙리스트 제재 어뷰저 차단 가드
    const { isUserBlocked } = require('@/utils/auth-guard')
    if (await isUserBlocked(walletAddress)) {
      return NextResponse.json({
        status: 'error',
        message: '🚨 어뷰징 의심 단말로 자동 제재 조치되었습니다. 관리자에게 문의하세요.'
      }, { status: 403 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. 신규 유저(본인) 정보 조회
    const { data: user, error: userError } = await supabase
      .from('web3_users')
      .select('wallet_address, referral_code, referred_by, points')
      .eq('wallet_address', walletAddress)
      .single()

    if (userError || !user) {
      return NextResponse.json({ status: 'error', message: '가입 유저 정보를 조회할 수 없습니다.' }, { status: 404 })
    }

    // 이미 추천인을 등록한 유저인지 검증
    if (user.referred_by) {
      return NextResponse.json({ status: 'error', message: '이미 추천인을 등록한 계정입니다.' }, { status: 400 })
    }

    // 본인 추천인 코드 입력 차단
    if (user.referral_code === referralCode.toUpperCase()) {
      return NextResponse.json({ status: 'error', message: '본인의 추천 코드는 입력할 수 없습니다.' }, { status: 400 })
    }

    // 2. 추천 코드를 소유한 초대한 사람(Referrer) 조회
    const { data: referrer, error: referrerError } = await supabase
      .from('web3_users')
      .select('wallet_address, referral_count, points')
      .eq('referral_code', referralCode.toUpperCase())
      .single()

    if (referrerError || !referrer) {
      return NextResponse.json({ status: 'error', message: '유효하지 않은 추천인 코드입니다.' }, { status: 400 })
    }

    const referrerAddress = referrer.wallet_address

    // 3. 추천인 한도 조회
    // 3-1) 누적 한도 체크 (누적 최대 100P = 50명 초대분)
    if ((referrer.referral_count || 0) >= 50) {
      return NextResponse.json({ status: 'error', message: '해당 추천인은 누적 초대 한도(50명)를 초과하여 더 이상 추천 혜택을 받을 수 없습니다.' }, { status: 400 })
    }

    // 3-2) 오늘 획득한 포인트 이력 체크 (일 최대 10P = 5명 초대분)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayIso = today.toISOString()

    const { data: todayTx, error: txError } = await supabase
      .from('point_transactions')
      .select('amount')
      .eq('wallet_address', referrerAddress)
      .eq('transaction_type', 'referral_bonus')
      .gte('created_at', todayIso)

    if (txError) {
      return NextResponse.json({ status: 'error', message: '추천인 트랜잭션 한도 검사 중 에러가 발생했습니다.' }, { status: 500 })
    }

    const todayPoints = todayTx ? todayTx.reduce((sum, tx) => sum + tx.amount, 0) : 0
    if (todayPoints >= 10) {
      // ⚠️ 부정 추천인(Referral) 의심 경보 웹훅 발송
      const { sendAdminAlert } = require('@/utils/adminAlert')
      sendAdminAlert({
        title: '추천 코드 일일 한도 초과 시도',
        level: 'warning',
        message: '유저가 일일 추천 적립 한도(10 P)를 넘어서 추천 혜택을 강제로 획득하려 시도했습니다.',
        metadata: {
          '피초대자(신규)': walletAddress,
          '초대자(기존)': referrerAddress,
          '초대자 추천 코드': referralCode,
          '초대자 오늘 획득 포인트': todayPoints
        }
      })
      return NextResponse.json({ status: 'error', message: '해당 추천인은 오늘의 초대 한도(5명)를 초과하여 더 이상 추천 혜택을 받을 수 없습니다.' }, { status: 400 })
    }

    // 4. 포인트 일괄 정산 처리
    // 4-1) 신규 유저 업데이트 (referred_by 매핑 및 보너스 1P 지급)
    const { error: newUserUpdateError } = await supabase
      .from('web3_users')
      .update({
        referred_by: referrerAddress,
        points: (user.points || 0) + 1
      })
      .eq('wallet_address', walletAddress)

    if (newUserUpdateError) {
      return NextResponse.json({ status: 'error', message: '신규 가입 유저 포인트 적립에 실패했습니다.' }, { status: 500 })
    }

    // 4-2) 초대한 유저 업데이트 (보너스 2P 지급 및 referral_count + 1)
    const { error: referrerUpdateError } = await supabase
      .from('web3_users')
      .update({
        points: (referrer.points || 0) + 2,
        referral_count: (referrer.referral_count || 0) + 1
      })
      .eq('wallet_address', referrerAddress)

    if (referrerUpdateError) {
      // 롤백 대안: 신규 유저 정보 복구 시도
      await supabase.from('web3_users').update({ referred_by: null, points: user.points }).eq('wallet_address', walletAddress)
      return NextResponse.json({ status: 'error', message: '추천인 포인트 적립에 실패했습니다.' }, { status: 500 })
    }

    // 4-3) point_transactions 테이블에 2건 인서트
    const txRecords = [
      {
        wallet_address: walletAddress,
        amount: 1,
        transaction_type: 'referral_bonus',
        description: '추천인 코드 등록 보너스 1P 지급'
      },
      {
        wallet_address: referrerAddress,
        amount: 2,
        transaction_type: 'referral_bonus',
        description: '친구 초대 보너스 2P 지급'
      }
    ]

    const { error: txInsertError } = await supabase
      .from('point_transactions')
      .insert(txRecords)

    if (txInsertError) {
      console.warn('Failed to insert point transactions for referral:', txInsertError)
    }

    return NextResponse.json({
      status: 'success',
      message: '추천 보너스 지급이 성공적으로 완료되었습니다!',
      newPoints: (user.points || 0) + 1
    })

  } catch (e: any) {
    console.error('Referral error:', e)
    return NextResponse.json({ status: 'error', message: '서버 에러가 발생했습니다.' }, { status: 500 })
  }
}
