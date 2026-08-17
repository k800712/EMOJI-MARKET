import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createHash } from 'crypto'
import { cookies } from 'next/headers'

function generateVirtualWallet(kakaoId: string): string {
  const hash = createHash('sha256').update(kakaoId).digest('hex')
  return `0x${hash.substring(0, 40)}`
}

async function runWithSchemaSafety<T>(operation: () => Promise<T>): Promise<T> {
  const maxRetries = 3
  let retryCount = 0
  let lastError = null

  while (retryCount < maxRetries) {
    try {
      return await operation()
    } catch (e: any) {
      lastError = e
      console.warn(`[Supabase DB Safety Wrapper] Attempt ${retryCount + 1} failed. Error:`, e.message || e)
      retryCount++
      if (retryCount < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 250 * retryCount))
      }
    }
  }
  throw new Error(`[Supabase Connection/Schema Safety Failure] ${lastError?.message || 'DB operation failed after retries'}`)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')

  // [Kakao Auth] 인가 코드 수신 여부 확인
  console.log(`[Kakao Auth] 인가 코드 수신 여부 확인: ${code ? '성공' : '실패'}, code: ${code}`)

  if (!code) {
    return NextResponse.redirect(new URL('/?error=missing_code', req.url))
  }

  try {
    const client_id = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID || 'c1206f4777e1bf356c39a04a37b3f9ff' 
    const redirect_uri = process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI || `${new URL(req.url).origin}/api/auth/kakao/callback`

    console.log(`[Kakao Auth] 토큰 발급 요청 전송 예정. Redirect URI: ${redirect_uri}`)

    const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id,
        redirect_uri,
        code
      })
    })

    const tokenData = await tokenResponse.json()
    // [Kakao Auth] 토큰 발급 요청 전송 및 응답 상태
    console.log(`[Kakao Auth] 토큰 발급 요청 전송 및 응답 상태: ${tokenResponse.status}, body:`, tokenData)

    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(`카카오 토큰 발급 실패: ${tokenData.error_description || '알 수 없는 오류'}`)
    }

    const accessToken = tokenData.access_token

    const userMeResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-type': 'application/x-www-form-urlencoded;charset=utf-8'
      }
    })

    if (!userMeResponse.ok) {
      throw new Error('카카오 사용자 정보 조회 실패')
    }

    const kakaoUser = await userMeResponse.json()
    // [Kakao Auth] 사용자 정보 조회 응답 성공 여부
    console.log('[Kakao Auth] 사용자 정보 조회 응답 성공 여부: 성공, kakao_account:', kakaoUser.kakao_account)

    const kakaoId = kakaoUser.id?.toString()
    if (!kakaoId) {
      throw new Error('카카오 고유 사용자 식별자를 획득하지 못했습니다.')
    }

    const nickname = kakaoUser.properties?.nickname || kakaoUser.kakao_account?.profile?.nickname || '식빵냥'
    const realName = kakaoUser.kakao_account?.name || nickname
    
    let profileImageUrl = '/images/default-bread-avatar.png'
    if (kakaoUser.kakao_account?.profile) {
      const profile = kakaoUser.kakao_account.profile
      if (profile.profile_image_url && profile.is_default_image !== true && profile.is_default_image !== 'true') {
        profileImageUrl = profile.profile_image_url
      }
    }

    const virtualWallet = generateVirtualWallet(kakaoId)
    const supabase = await createClient(true) 

    let userRecord = null
    try {
      userRecord = await runWithSchemaSafety(async () => {
        const { data, error } = await supabase
          .from('web3_users')
          .select('wallet_address, points')
          .eq('wallet_address', virtualWallet.toLowerCase())
          .maybeSingle()

        if (error) throw error
        return data
      })
    } catch (e) {
      console.warn('[Kakao Auth] 가입 이력 SELECT 중 예외 발생 (가드 통과):', e)
    }

    let isNewUser = !userRecord

    try {
      await runWithSchemaSafety(async () => {
        const { error } = await supabase
          .from('web3_users')
          .upsert({
            wallet_address: virtualWallet.toLowerCase(),
            nickname: nickname,
            real_name: realName,
            profile_image_url: profileImageUrl,
            nonce: 'KAKAO_SOCIAL',
            kakao_id: kakaoId,
            status: 'active',
            updated_at: new Date().toISOString()
          }, { onConflict: 'wallet_address' })

        // [Supabase Auth] DB Upsert 실행 및 결과
        if (error) {
          console.error('[Supabase Auth] DB Upsert 실행 및 결과: 에러 발생, error details:', error)
          throw error
        } else {
          console.log('[Supabase Auth] DB Upsert 실행 및 결과: 성공!')
        }
      })
    } catch (upsertError: any) {
      console.error('[Supabase Auth] DB Upsert 트랜잭션 치명적 실패:', upsertError)
      return NextResponse.redirect(new URL(`/?error=db_upsert_failed&msg=${encodeURIComponent(upsertError.message || '')}`, req.url))
    }

    if (isNewUser) {
      try {
        await runWithSchemaSafety(async () => {
          const { error } = await supabase
            .from('point_transactions')
            .insert({
              wallet_address: virtualWallet.toLowerCase(),
              amount: 3,
              transaction_type: 'gift',
              description: '웰컴 가입 보너스 3P 지급'
            })
          if (error) throw error
        })
        console.log('[Kakao Auth] 신규 회원 가입 포인트 3P 지급 완료!')
      } catch (ptError) {
        console.warn('[Kakao Auth] 포인트 지급 트랜잭션 기록 실패 (우회 통과):', ptError)
      }
    }

    const cookieStore = await cookies()
    cookieStore.set('wallet_address', virtualWallet.toLowerCase(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    })
    cookieStore.set('session_wallet', virtualWallet.toLowerCase(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    })

    return NextResponse.redirect(new URL(`/?login_success=true&wallet=${virtualWallet.toLowerCase()}`, req.url))

  } catch (error: any) {
    console.error('[Kakao Auth] 로그인 처리 도중 예외 크래시 발생:', error)
    return NextResponse.redirect(new URL(`/?error=kakao_auth_failed&msg=${encodeURIComponent(error.message || '')}`, req.url))
  }
}
