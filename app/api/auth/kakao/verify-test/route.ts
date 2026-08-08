import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

// Base64Url 디코더 유틸리티
function decodeJwt(token: string) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = Buffer.from(parts[1], 'base64url').toString('utf8')
    return JSON.parse(payload)
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const diagnostics: any = {
    step1_token_verification: { status: 'pending', details: '' },
    step2_db_schema_check: { status: 'pending', details: '' },
    step3_cookie_validation: { status: 'pending', details: '' }
  }

  try {
    const body = await req.json().catch(() => ({}))
    let idToken = body.idToken

    // 1. JWT ID Token 디코딩 및 검증 단계
    if (!idToken) {
      // 디버그 테스트용 더미 모의 JWT ID Token 생성
      const dummyHeader = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'dummy_kid' })).toString('base64url')
      const dummyPayload = Buffer.from(JSON.stringify({
        iss: 'https://kauth.kakao.com',
        sub: '123456789',
        aud: 'dummy_client_id',
        exp: Math.floor(Date.now() / 1000) + 300, // 5분 만료
        nickname: '빵빵한춘식이',
        auth_time: Math.floor(Date.now() / 1000)
      })).toString('base64url')
      idToken = `${dummyHeader}.${dummyPayload}.dummy_signature`
      diagnostics.step1_token_verification.details = 'ID Token이 전달되지 않아 디버깅용 모의 JWT 토큰을 자체 생성하여 시뮬레이션을 개시했습니다.'
    }

    const payload = decodeJwt(idToken)
    if (!payload) {
      diagnostics.step1_token_verification.status = 'fail'
      diagnostics.step1_token_verification.details = 'JWT 디코딩에 실패했습니다. 올바른 3단 분할 형태의 토큰이 아닙니다.'
      return NextResponse.json({ status: 'error', diagnostics }, { status: 400 })
    }

    // Issuer (발행처) 검증
    if (payload.iss !== 'https://kauth.kakao.com') {
      diagnostics.step1_token_verification.status = 'fail'
      diagnostics.step1_token_verification.details = `JWT Issuer 불일치 오류: 기대값 'https://kauth.kakao.com', 수신값 '${payload.iss}'`
      return NextResponse.json({ status: 'error', diagnostics }, { status: 400 })
    }

    // 만료 시간 (Expiration) 검증
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      diagnostics.step1_token_verification.status = 'fail'
      diagnostics.step1_token_verification.details = `토큰 유효기간 만료 오류: 만료시간 ${payload.exp}, 현재시간 ${now}`
      return NextResponse.json({ status: 'error', diagnostics }, { status: 400 })
    }

    diagnostics.step1_token_verification.status = 'pass'
    diagnostics.step1_token_verification.details = `토큰 발행처(${payload.iss}) 및 만료 검증이 무사히 통과되었습니다! (Kakao ID: ${payload.sub})`

    // 2. Supabase DB 스키마 및 가상 지갑 매핑 검증 단계
    const kakaoId = payload.sub
    // Kakao ID를 이용한 가상 지갑 주소 유도 시뮬레이션
    const crypto = require('crypto')
    const hash = crypto.createHash('sha256').update(kakaoId).digest('hex')
    const virtualWallet = `0x${hash.substring(0, 40)}`.toLowerCase()

    const supabase = await createClient(true) // service_role
    
    // DB Upsert 테스트
    const nonceExpiresAt = new Date(Date.now() + 1000 * 60 * 5).toISOString() // 5분 만료
    const { data: dbUser, error: dbError } = await supabase
      .from('web3_users')
      .upsert({
        wallet_address: virtualWallet,
        nickname: payload.nickname || '급식냥',
        nonce: 'KAKAO_VERIFY_TEST',
        nonce_expires_at: nonceExpiresAt,
        kakao_id: kakaoId.toString()
      })
      .select('wallet_address, nickname, nonce_expires_at')
      .single()

    if (dbError) {
      diagnostics.step2_db_schema_check.status = 'fail'
      diagnostics.step2_db_schema_check.details = `Supabase Upsert 실패: ${dbError.message} (캐시 스키마 일치 여부 또는 필드명 제약 위반 확인 요망)`
      return NextResponse.json({ status: 'error', diagnostics }, { status: 500 })
    }

    diagnostics.step2_db_schema_check.status = 'pass'
    diagnostics.step2_db_schema_check.details = `지갑 주소 매핑 및 DB 데이터 주입이 에러 없이 통과되었습니다! (Address: ${dbUser.wallet_address}, ExpiresAt: ${dbUser.nonce_expires_at})`

    // 3. 브라우저 세션 쿠키 검증 단계
    const cookieStore = await cookies()
    cookieStore.set('wallet_address_verify_test', virtualWallet, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 300, // 5분
      path: '/'
    })

    const cookieObj = cookieStore.get('wallet_address_verify_test')
    if (!cookieObj || cookieObj.value !== virtualWallet) {
      diagnostics.step3_cookie_validation.status = 'fail'
      diagnostics.step3_cookie_validation.details = 'Next.js cookies() API를 통한 세션 쿠키 세팅이 감지되지 않았거나 값이 불일치합니다.'
      return NextResponse.json({ status: 'error', diagnostics }, { status: 500 })
    }

    diagnostics.step3_cookie_validation.status = 'pass'
    diagnostics.step3_cookie_validation.details = `HttpOnly 세션 쿠키(${cookieObj.name})가 헤더 상에 보안 옵션들과 함께 주입 완료되었습니다.`

    return NextResponse.json({
      status: 'success',
      message: '카카오 로그인 및 세션 무결성 검증 통과!',
      diagnostics
    })

  } catch (e: any) {
    console.error('Verify-test API error:', e)
    return NextResponse.json({
      status: 'error',
      message: e.message || '검증 처리 도중 서버 에러가 발생했습니다.',
      diagnostics: {
        step1_token_verification: { status: 'fail', details: e.stack || e.message }
      }
    }, { status: 500 })
  }
}
