import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const wallet = searchParams.get('wallet')

    if (!wallet) {
      return NextResponse.json({ status: 'error', message: '지갑 주소가 필요합니다.' }, { status: 400 })
    }

    const supabase = await createClient(true) // service_role

    let data: any = null
    try {
      const { data: dbData, error: dbError } = await supabase
        .from('web3_users')
        .select('points, referral_code, referred_by')
        .eq('wallet_address', wallet.toLowerCase())
        .single()

      if (!dbError && dbData) {
        data = dbData
      } else {
        console.warn('Supabase 데이터 연동 에러 방어 처리 (Points SELECT):', dbError)
      }
    } catch (e) {
      console.warn('Supabase 데이터 연동 에러 방어 처리 (Points SELECT Exception):', e)
    }

    return NextResponse.json({
      status: 'success',
      points: data?.points ?? 0,
      referralCode: data?.referral_code ?? '',
      referredBy: data?.referred_by ?? null
    })

  } catch (error: any) {
    console.error('Get Points API error:', error)
    return NextResponse.json({ status: 'error', message: error.message || '포인트 조회에 실패했습니다.' }, { status: 500 })
  }
}
