import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { wallet, packageId } = body

    if (!wallet || !packageId) {
      return NextResponse.json({ status: 'error', message: '필수 매개변수가 누락되었습니다.' }, { status: 400 })
    }

    let rechargeAmount = 0
    switch (packageId) {
      case 'starter':
        rechargeAmount = 10
        break
      case 'value':
        rechargeAmount = 20
        break
      case 'creator':
        rechargeAmount = 50
        break
      case 'pro':
        rechargeAmount = 100
        break
    }

    const packageNames: Record<string, string> = {
      starter: '스타터 팩',
      value: '실속 팩',
      creator: '창작자 팩',
      pro: '프로 패키지'
    }
    const packageName = packageNames[packageId] || '포인트 팩'

    const supabase = await createClient(true) // service_role

    // 1. 유저의 현재 포인트를 가져와서 충전 (Atomic simulation)
    const { data: userRecord, error: fetchError } = await supabase
      .from('web3_users')
      .select('points')
      .eq('wallet_address', wallet.toLowerCase())
      .single()

    if (fetchError || !userRecord) {
      // 혹시라도 가입 데이터가 누락되었다면 신규 웰컴 지급(3P) + 충전량 설정
      const { error: insertError } = await supabase
        .from('web3_users')
        .insert({
          wallet_address: wallet.toLowerCase(),
          nonce: 'USED',
          nonce_expires_at: new Date().toISOString(),
          points: 3 + rechargeAmount
        })

      if (insertError) {
        throw insertError
      }

      // 신규 유저 생성 거래 이력 적재
      await supabase.from('point_transactions').insert([
        {
          wallet_address: wallet.toLowerCase(),
          amount: 3,
          transaction_type: 'gift',
          description: '웰컴 가입 보너스 3P 지급'
        },
        {
          wallet_address: wallet.toLowerCase(),
          amount: rechargeAmount,
          transaction_type: 'charge',
          description: `${packageName} ${rechargeAmount}P 충전`
        }
      ])

      return NextResponse.json({
        status: 'success',
        points: 3 + rechargeAmount,
        message: '포인트가 성공적으로 충전되었습니다.'
      })
    }

    const nextPoints = (userRecord.points ?? 0) + rechargeAmount

    const { error: updateError } = await supabase
      .from('web3_users')
      .update({
        points: nextPoints,
        updated_at: new Date().toISOString()
      })
      .eq('wallet_address', wallet.toLowerCase())

    if (updateError) {
      throw updateError
    }

    // 기존 유저 충전 거래 이력 적재
    await supabase.from('point_transactions').insert({
      wallet_address: wallet.toLowerCase(),
      amount: rechargeAmount,
      transaction_type: 'charge',
      description: `${packageName} ${rechargeAmount}P 충전`
    })

    return NextResponse.json({
      status: 'success',
      points: nextPoints,
      message: '포인트가 성공적으로 충전되었습니다.'
    })

  } catch (error: any) {
    console.error('Recharge Points API error:', error)
    return NextResponse.json({ status: 'error', message: error.message || '포인트 충전에 실패했습니다.' }, { status: 500 })
  }
}
