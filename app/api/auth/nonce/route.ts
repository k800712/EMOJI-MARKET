import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const address = searchParams.get('address')

    if (!address) {
      return NextResponse.json({ status: 'error', message: '지갑 주소가 필요합니다.' }, { status: 400 })
    }

    const supabase = await createClient(true) // service_role

    // 1. 리플레이 공격 방지용 램덤 일회용 nonce 생성
    const nonce = `Sign this message to log in to Emoji Market: ${crypto.randomBytes(16).toString('hex')}`
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5분 유효

    // 2. DB에 기록 (upsert)
    const { error } = await supabase
      .from('wallet_nonces')
      .upsert({
        address: address.toLowerCase(),
        nonce: nonce,
        expires_at: expiresAt
      }, {
        onConflict: 'address'
      })

    if (error) {
      throw new Error(`Failed to store nonce: ${error.message}`)
    }

    return NextResponse.json({ status: 'success', nonce: nonce })

  } catch (error: any) {
    console.error('Nonce API error:', error)
    return NextResponse.json({ status: 'error', message: error.message || '임시 서명 난스 생성에 실패했습니다.' }, { status: 500 })
  }
}
