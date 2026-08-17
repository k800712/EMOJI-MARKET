import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createHash } from 'crypto'
import { cookies } from 'next/headers'

// 카카오 고유 ID를 해싱하여 0x로 시작하는 Deterministic Wallet Address 자동 생성
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { accessToken, walletAddress: bodyWalletAddress } = body
    
    let kakaoId = body.kakaoId
    let nickname = body.nickname
    let realName = body.realName
    let profileImageUrl = '/default-avatar.png'

    // 1. 카카오 실제 accessToken 연동 백엔드 처리 (1단계 요구사항)
    if (accessToken) {
      const kakaoResponse = await fetch("https://kapi.kakao.com/v2/user/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-type": "application/x-www-form-urlencoded;charset=utf-8",
        },
      })

      if (!kakaoResponse.ok) {
        throw new Error("카카오 사용자 정보를 가져오는 데 실패했습니다.")
      }

      const kakaoUser = await kakaoResponse.json()
      kakaoId = kakaoUser.id?.toString()
      nickname = kakaoUser.properties?.nickname || '식빵냥'
      realName = kakaoUser.kakao_account?.name || nickname // 필수 동의 실명 우선
      profileImageUrl = kakaoUser.kakao_account?.profile?.profile_image_url || '/default-avatar.png'
    } else {
      // 2. 모의 가입/로그인용 fallback 가드 처리
      if (!kakaoId) {
        kakaoId = Math.floor(100000000 + Math.random() * 900000000).toString()
      }
      if (!nickname) {
        const adjs = ['신난', '일하는', '춤추는', '잠자는', '뚱한', '우는', '화난', '배고픈', '멋쟁이', '피곤한']
        const nouns = ['식빵냥', '라떼곰', '시바견', '초코토끼', '대파구리', '햄스터', '아기오리', '뚱토끼']
        nickname = `${adjs[Math.floor(Math.random() * adjs.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}#${Math.floor(100 + Math.random() * 900)}`
      }
      if (!realName) {
        realName = nickname
      }

      const kakao_account = body.kakao_account
      if (kakao_account && kakao_account.profile) {
        const profile = kakao_account.profile
        const isDefault = profile.is_default_image === true || profile.is_default_image === 'true'
        if (!isDefault) {
          profileImageUrl = profile.profile_image_url || profile.thumbnail_image_url || '/default-avatar.png'
        }
      }
    }

    const targetWallet = bodyWalletAddress || generateVirtualWallet(kakaoId)
    const supabase = await createClient(true) // service_role

    // 기존 유저 조회
    let userRecord = null
    try {
      userRecord = await runWithSchemaSafety(async () => {
        const { data, error } = await supabase
          .from('web3_users')
          .select('wallet_address, points, nickname, referral_code, referred_by, real_name, profile_image_url')
          .eq('wallet_address', targetWallet.toLowerCase())
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
              wallet_address: targetWallet.toLowerCase(),
              nickname: nickname || '식빵냥',
              real_name: realName || nickname || '식빵냥',
              profile_image_url: profileImageUrl || '/default-avatar.png',
              nonce: 'KAKAO_SOCIAL',
              points: 3,
              kakao_id: kakaoId.toString(),
              status: 'active'
            })

          if (error) throw error
        })
      } catch (insertError: any) {
        console.warn('1차 가입 시도 실패 (스키마 캐시 락 우회 작동), RPC 함수 rpc_upsert_web3_user 실행...', insertError.message || insertError)
        try {
          const { data: rpcData, error: rpcError } = await supabase.rpc('rpc_upsert_web3_user', {
            p_wallet_address: targetWallet.toLowerCase(),
            p_kakao_id: kakaoId.toString(),
            p_nickname: nickname || '식빵냥',
            p_real_name: realName || nickname || '식빵냥',
            p_profile_image_url: profileImageUrl || '/default-avatar.png'
          })

          if (rpcError) throw rpcError
          console.log('RPC를 통한 2차 우회 가입 성공!', rpcData)
        } catch (rpcCatchError: any) {
          console.error('RPC를 통한 2차 우회 가입 최종 실패:', rpcCatchError.message || rpcCatchError)
        }
      }

      // 포인트 가입 보너스 이력 기록
      try {
        await runWithSchemaSafety(async () => {
          const { error } = await supabase
            .from('point_transactions')
            .insert({
              wallet_address: targetWallet.toLowerCase(),
              amount: 3,
              transaction_type: 'gift',
              description: '웰컴 가입 보너스 3P 지급'
            })

          if (error) throw error
        })
      } catch (ptError) {
        console.warn('포인트 가입 보너스 이력 기록 실패 (우회 통과):', ptError)
      }

      // referral_code 추출
      try {
        const freshUser = await runWithSchemaSafety(async () => {
          const { data, error } = await supabase
            .from('web3_users')
            .select('referral_code, referred_by')
            .eq('wallet_address', targetWallet.toLowerCase())
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
      // 4. 기존 유저 정보 업데이트 및 동기화
      try {
        await runWithSchemaSafety(async () => {
          const { error } = await supabase
            .from('web3_users')
            .update({
              nickname: nickname || '식빵냥',
              real_name: realName || nickname || '식빵냥',
              profile_image_url: profileImageUrl || '/default-avatar.png',
              status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('wallet_address', targetWallet.toLowerCase())

          if (error) throw error
        })
      } catch (updateError: any) {
        console.warn('기존 유저 프로필 실시간 동기화 업데이트 실패 (RPC 우회 업데이트 수행):', updateError.message || updateError)
        try {
          await supabase.rpc('rpc_upsert_web3_user', {
            p_wallet_address: targetWallet.toLowerCase(),
            p_kakao_id: kakaoId.toString(),
            p_nickname: nickname || '식빵냥',
            p_real_name: realName || nickname || '식빵냥',
            p_profile_image_url: profileImageUrl || '/default-avatar.png'
          })
          console.log('RPC를 통한 기존 유저 정보 2차 업데이트 성공!')
        } catch (rpcUpdateError: any) {
          console.error('RPC를 통한 기존 유저 정보 2차 업데이트 마저 실패 (우회 통과):', rpcUpdateError.message || rpcUpdateError)
        }
      }

      nickname = nickname || userRecord.nickname || '식빵냥'
      realName = realName || userRecord.real_name || nickname
      userReferralCode = userRecord.referral_code || ''
      userReferredBy = userRecord.referred_by || null
    }

    // 5. 보안 로그인 세션 쿠키 생성 (만료시간 지정이 없는 브라우저 닫기 자동 로그아웃 사양 준수)
    const cookieStore = await cookies()
    cookieStore.set('wallet_address', targetWallet.toLowerCase(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    })
    cookieStore.set('session_wallet', targetWallet.toLowerCase(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    })

    return NextResponse.json({
      status: 'success',
      address: targetWallet.toLowerCase(),
      nickname: nickname,
      realName: realName,
      profileImageUrl: profileImageUrl,
      kakaoId: kakaoId,
      referralCode: userReferralCode,
      referredBy: userReferredBy
    })

  } catch (error: any) {
    console.error('Kakao OAuth integration process error:', error)
    return NextResponse.json({
      status: 'error',
      message: error.message || '카카오 로그인 처리 도중 에러가 발생했습니다.'
    }, { status: 500 })
  }
}
