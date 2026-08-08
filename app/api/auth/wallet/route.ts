import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { verifyMessage } from 'ethers'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { address, signature, nonce } = body

    if (!address || !signature || !nonce) {
      return NextResponse.json({ status: 'error', message: '필수 파라미터가 누락되었습니다.' }, { status: 400 })
    }

    const supabase = await createClient(true) // service_role

    // 1. DB에서 지갑 주소에 매핑된 최신 Nonce 조회
    const { data: record, error: dbError } = await supabase
      .from('web3_users')
      .select('nonce, nonce_expires_at')
      .eq('wallet_address', address.toLowerCase())
      .single()

    if (dbError || !record) {
      return NextResponse.json({ status: 'error', message: '발급된 유효 난스가 존재하지 않습니다. 다시 시도해 주세요.' }, { status: 400 })
    }

    // 2. 만료 시간 체크
    if (new Date(record.nonce_expires_at) < new Date()) {
      return NextResponse.json({ status: 'error', message: '서명 시간이 초과되었습니다. 다시 시도해 주세요.' }, { status: 400 })
    }

    // 3. 전송된 난스가 DB에 저장된 난스와 일치하는지 검증
    if (record.nonce !== nonce) {
      return NextResponse.json({ status: 'error', message: '난스가 일치하지 않습니다.' }, { status: 400 })
    }

    // 4. ethers v6 verifyMessage를 통한 서명 복구 및 검증
    const recoveredAddress = verifyMessage(nonce, signature)
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ status: 'error', message: '서명 검증 실패: 지갑 주소가 일치하지 않습니다.' }, { status: 401 })
    }

    // 5. web3_users 테이블의 유저 상태 및 난스 일괄 업데이트 (리플레이 차단 및 로그인 시간 기록)
    const { error: userError } = await supabase
      .from('web3_users')
      .update({
        nonce: 'USED',
        updated_at: new Date().toISOString()
      })
      .eq('wallet_address', address.toLowerCase())

    if (userError) {
      throw new Error(`Failed to update user session in DB: ${userError.message}`)
    }

    // 6. 보안 로그인 세션 쿠키 생성
    const cookieStore = await cookies()
    cookieStore.set('wallet_address', address.toLowerCase(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7일간 세션 유지
      path: '/'
    })

    return NextResponse.json({ status: 'success', address: address.toLowerCase() })

  } catch (error: any) {
    console.error('Wallet Login error:', error)
    return NextResponse.json({ status: 'error', message: error.message || '지갑 서명 로그인에 실패했습니다.' }, { status: 500 })
  }
}
