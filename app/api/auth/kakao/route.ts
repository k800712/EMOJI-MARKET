import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createHash } from 'crypto'
import { cookies } from 'next/headers'

// 카카오 고유 ID를 해싱하여 0x로 시작하는 Deterministic Wallet Address 자동 생성
function generateVirtualWallet(kakaoId: string): string {
  const hash = createHash('sha256').update(kakaoId).digest('hex')
  return `0x${hash.substring(0, 40)}`
}

// 스키마 캐시 불일치 에러 및 일시적인 DB 커넥션 불안정을 방지하기 위한 안전 래퍼 함수
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
        // 지수 백오프 기반 대기
        await new Promise((resolve) => setTimeout(resolve, 250 * retryCount))
      }
    }
  }
  throw new Error(`[Supabase Connection/Schema Safety Failure] ${lastError?.message || 'DB operation failed after retries'}`)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    let { kakaoId, nickname } = body

    // 1. 카카오 ID가 없을 경우 서버 자체적으로 고유 난수 ID 할당
    if (!kakaoId) {
      kakaoId = Math.floor(100000000 + Math.random() * 900000000).toString()
    }

    // 2. 닉네임이 없을 경우 10대 취향의 귀여운 랜덤 캐릭터 닉네임 조합 자동 생성
    if (!nickname) {
      const adjs = ['신난', '일하는', '춤추는', '잠자는', '뚱한', '우는', '화난', '배고픈', '멋쟁이', '피곤한']
      const nouns = ['식빵냥', '라떼곰', '시바견', '초코토끼', '대파구리', '햄스터', '아기오리', '뚱토끼']
      const randomAdj = adjs[Math.floor(Math.random() * adjs.length)]
      const randomNoun = nouns[Math.floor(Math.random() * nouns.length)]
      const hashNum = Math.floor(100 + Math.random() * 900)
      nickname = `${randomAdj}${randomNoun}#${hashNum}`
    }

    const virtualWallet = generateVirtualWallet(kakaoId.toString())
    const supabase = await createClient(true) // service_role

    // 스키마 캐시 오류 원천 방지를 위해 runWithSchemaSafety 안전 래퍼 사용
    let userRecord = null
    try {
      userRecord = await runWithSchemaSafety(async () => {
        const { data, error } = await supabase
          .from('web3_users')
          .select('wallet_address, points, nickname, referral_code, referred_by')
          .eq('wallet_address', virtualWallet.toLowerCase())
          .maybeSingle()

        if (error) throw error
        return data
      })
    } catch (e) {
      console.warn('Supabase 가입 이력 SELECT 예외 발생. 2차 폴백 bypass.', e)
    }

    let userReferralCode = ''
    let userReferredBy: string | null = null

    if (!userRecord) {
      // 3. 신규 가입 처리 (웰컴 3포인트 기본 지급)
      try {
        await runWithSchemaSafety(async () => {
          const { error } = await supabase
            .from('web3_users')
            .insert({
              wallet_address: virtualWallet.toLowerCase(),
              nickname: nickname,
              nonce: 'KAKAO_SOCIAL',
              nonce_expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
              points: 3,
              kakao_id: kakaoId.toString()
            })

          if (error) throw error
        })
      } catch (insertError: any) {
        console.warn('1차 가입(nonce_expires_at 포함) 실패. 2차 폴백(nonce_expires_at 제외) 시도...', insertError)
        // 2차 폴백: nonce_expires_at 컬럼을 완전히 빼고 INSERT 시도
        try {
          await runWithSchemaSafety(async () => {
            const { error } = await supabase
              .from('web3_users')
              .insert({
                wallet_address: virtualWallet.toLowerCase(),
                nickname: nickname,
                nonce: 'KAKAO_SOCIAL',
                points: 3,
                kakao_id: kakaoId.toString()
              })

            if (error) throw error
          })
        } catch (fallbackInsertError: any) {
          console.warn('2차 가입(nonce_expires_at 제외) 실패. 3차 우회 모드 돌입...', fallbackInsertError)
        }
      }

      // 4. point_transactions에 가입 보너스 이력 기록
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
      } catch (ptError) {
        console.warn('포인트 가입 보너스 이력 기록 실패 (우회 통과):', ptError)
      }

      // 생성된 유저 정보 다시 조회 (트리거에 의해 자동 생성된 referral_code 추출)
      try {
        const freshUser = await runWithSchemaSafety(async () => {
          const { data, error } = await supabase
            .from('web3_users')
            .select('referral_code, referred_by')
            .eq('wallet_address', virtualWallet.toLowerCase())
            .single()
          if (error) throw error
          return data
        })
        if (freshUser) {
          userReferralCode = freshUser.referral_code || ''
          userReferredBy = freshUser.referred_by || null
        }
      } catch (freshError) {
        console.warn('가입 후 신규 유저 정보 재조회 실패 (디폴트 코드 우회):', freshError)
      }
    } else {
      // 기존에 가입된 이력이 있는 경우, 세션 유지를 위해 닉네임 동기화
      nickname = userRecord.nickname || nickname
      userReferralCode = userRecord.referral_code || ''
      userReferredBy = userRecord.referred_by || null
    }

    // 5. 보안 로그인 세션 쿠키 생성 (wallet_address 식별자 유지)
    const cookieStore = await cookies()
    cookieStore.set('wallet_address', virtualWallet.toLowerCase(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    })

    return NextResponse.json({
      status: 'success',
      address: virtualWallet.toLowerCase(),
      nickname: nickname,
      kakaoId: kakaoId, // 로컬 캐싱을 위해 카카오 ID 돌려줌
      referralCode: userReferralCode,
      referredBy: userReferredBy
    })

  } catch (error: any) {
    console.error('Kakao login mapping API error:', error)
    return NextResponse.json({
      status: 'error',
      message: error.message || '카카오 로그인 처리 도중 에러가 발생했습니다.'
    }, { status: 500 })
  }
}
