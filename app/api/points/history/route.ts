import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const walletAddress = searchParams.get('wallet_address')

    if (!walletAddress) {
      return NextResponse.json({ status: 'error', message: '지갑 주소가 필요합니다.' }, { status: 400 })
    }

    const supabase = await createClient(true) // service_role

    const { data, error } = await supabase
      .from('point_transactions')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({
      status: 'success',
      data: data || []
    })

  } catch (error: any) {
    console.error('Get point history API error:', error)
    return NextResponse.json({
      status: 'error',
      message: error.message || '포인트 거래 내역을 조회하는 도중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}
