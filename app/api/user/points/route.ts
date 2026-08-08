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

    const { data, error } = await supabase
      .from('web3_users')
      .select('points')
      .eq('wallet_address', wallet.toLowerCase())
      .single()

    if (error) {
      // 해당 유저가 아직 없을 경우 0 반환
      return NextResponse.json({ status: 'success', points: 0 })
    }

    return NextResponse.json({
      status: 'success',
      points: data?.points ?? 0
    })

  } catch (error: any) {
    console.error('Get Points API error:', error)
    return NextResponse.json({ status: 'error', message: error.message || '포인트 조회에 실패했습니다.' }, { status: 500 })
  }
}
