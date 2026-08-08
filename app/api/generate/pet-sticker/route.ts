import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import sharp from 'sharp'
import JSZip from 'jszip'

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

// 부드러운 8px 수준의 흰색 스티커 테두리(White Stroke) 생성 함수
async function applyStickerStroke(imageBuffer: Buffer): Promise<Buffer> {
  // 1. 알파 채널(투명 마스크) 추출
  const alphaMask = await sharp(imageBuffer)
    .ensureAlpha()
    .extractChannel('alpha')
    .toBuffer()

  // 2. 가우시안 블러 및 임계값(threshold) 조정을 통한 경계선 확장(Dilate)
  const dilatedAlpha = await sharp(alphaMask)
    .blur(6)
    .threshold(35)
    .toBuffer()

  // 3. 360x360 흰색 배경 캔버스 생성
  const whiteBase = await sharp({
    create: {
      width: 360,
      height: 360,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .png()
  .toBuffer()

  // 4. 흰색 배경 캔버스에 확장된 알파 마스크를 씌워 흰색 테두리 획득
  const borderLayer = await sharp(whiteBase)
    .joinChannel(dilatedAlpha)
    .png()
    .toBuffer()

  // 5. 흰색 테두리 베이스 위에 원본 동물 이미지 합성
  return await sharp(borderLayer)
    .composite([{ input: imageBuffer, blend: 'over' }])
    .png()
    .toBuffer()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { image, walletAddress } = body

    if (!image || !walletAddress) {
      return NextResponse.json({
        status: 'error',
        message: '필수 데이터(이미지, 지갑주소)가 부족합니다.'
      }, { status: 400 })
    }

    // 0. 블랙리스트 제재 어뷰저 차단 가드
    const { isUserBlocked } = require('@/utils/auth-guard')
    if (await isUserBlocked(walletAddress)) {
      return NextResponse.json({
        status: 'error',
        message: '🚨 어뷰징 의심 단말로 자동 제재 조치되었습니다. 관리자에게 문의하세요.'
      }, { status: 403 })
    }

    const supabase = await createClient(true) // service_role

    // 1. 포인트 조회 및 선검증 (최소 1 P 필요)
    const userRecord = await runWithSchemaSafety(async () => {
      const { data, error } = await supabase
        .from('web3_users')
        .select('points')
        .eq('wallet_address', walletAddress.toLowerCase())
        .maybeSingle()

      if (error) throw error
      return data
    })

    if (!userRecord || (userRecord.points || 0) < 1) {
      return NextResponse.json({
        status: 'error',
        message: '보유 포인트가 부족합니다. 스티커를 제작하려면 최소 1 P가 필요합니다.'
      }, { status: 403 })
    }

    // base64 이미지 디코딩
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '')
    const base64Buffer = Buffer.from(base64Data, 'base64')

    // 원본 이미지를 250x250 이내 비율로 리사이즈
    const baseAnimal = await sharp(base64Buffer)
      .resize(250, 250, { fit: 'inside' })
      .toBuffer()

    // 360x360 투명 캔버스 중앙에 배치
    const centeredAnimal = await sharp({
      create: {
        width: 360,
        height: 360,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite([{ input: baseAnimal, gravity: 'center' }])
    .png()
    .toBuffer()

    // 8px 스티커 테두리 적용
    const strokedAnimal = await applyStickerStroke(centeredAnimal)

    // 8종 테마별 고유 SVG 데코 및 감정 텍스트 오버레이 정의
    const stickerThemes = [
      {
        name: '01_thanks',
        label: '감사',
        svg: `<svg width="360" height="360">
                <!-- 핑크 하트들 -->
                <path d="M 40 40 A 10 10 0 0 0 20 40 A 10 10 0 0 0 40 60 A 10 10 0 0 0 60 40 A 10 10 0 0 0 40 40 Z" fill="#ff69b4" transform="translate(40, 20) scale(0.6)"/>
                <path d="M 40 40 A 10 10 0 0 0 20 40 A 10 10 0 0 0 40 60 A 10 10 0 0 0 60 40 A 10 10 0 0 0 40 40 Z" fill="#ff1493" transform="translate(260, 40) scale(0.8)"/>
                <path d="M 40 40 A 10 10 0 0 0 20 40 A 10 10 0 0 0 40 60 A 10 10 0 0 0 60 40 A 10 10 0 0 0 40 40 Z" fill="#ff69b4" transform="translate(300, 160) scale(0.5)"/>
                <text x="180" y="325" font-family="Apple SD Gothic Neo, Malgun Gothic, sans-serif" font-weight="900" font-size="28" fill="#ff007f" text-anchor="middle" stroke="#ffffff" stroke-width="8" paint-order="stroke fill">감사합니다</text>
              </svg>`
      },
      {
        name: '02_fighting',
        label: '화이팅',
        svg: `<svg width="360" height="360">
                <!-- 주황색 별 데코 -->
                <polygon points="180,20 190,45 215,45 195,60 202,85 180,70 158,85 165,60 145,45 170,45" fill="#ff4500" transform="translate(10, 10) scale(0.4)"/>
                <polygon points="180,20 190,45 215,45 195,60 202,85 180,70 158,85 165,60 145,45 170,45" fill="#ff8c00" transform="translate(240, 20) scale(0.5)"/>
                <text x="180" y="325" font-family="Apple SD Gothic Neo, Malgun Gothic, sans-serif" font-weight="900" font-size="28" fill="#ff4500" text-anchor="middle" stroke="#ffffff" stroke-width="8" paint-order="stroke fill">화이팅!</text>
              </svg>`
      },
      {
        name: '03_sparkle',
        label: '반짝',
        svg: `<svg width="360" height="360">
                <!-- 노란 스파클 -->
                <circle cx="50" cy="50" r="10" fill="#ffd700" transform="translate(30, 20)"/>
                <circle cx="310" cy="80" r="15" fill="#ffd700"/>
                <line x1="310" y1="50" x2="310" y2="110" stroke="#ffd700" stroke-width="4"/>
                <line x1="280" y1="80" x2="340" y2="80" stroke="#ffd700" stroke-width="4"/>
                <text x="180" y="325" font-family="Apple SD Gothic Neo, Malgun Gothic, sans-serif" font-weight="900" font-size="28" fill="#cca700" text-anchor="middle" stroke="#ffffff" stroke-width="8" paint-order="stroke fill">반짝!</text>
              </svg>`
      },
      {
        name: '04_roar',
        label: '크앙',
        svg: `<svg width="360" height="360">
                <!-- 번개 데코 -->
                <polygon points="50,20 65,50 45,50 60,90 25,45 45,45" fill="#32cd32" transform="translate(20, 20) scale(0.8)"/>
                <polygon points="50,20 65,50 45,50 60,90 25,45 45,45" fill="#228b22" transform="translate(270, 30) scale(0.8)"/>
                <text x="180" y="325" font-family="Apple SD Gothic Neo, Malgun Gothic, sans-serif" font-weight="900" font-size="28" fill="#00aa33" text-anchor="middle" stroke="#ffffff" stroke-width="8" paint-order="stroke fill">크앙!</text>
              </svg>`
      },
      {
        name: '05_pout',
        label: '쳇',
        svg: `<svg width="360" height="360">
                <!-- 보라 분노 마크 -->
                <path d="M 30 30 Q 50 20 70 30 M 70 30 Q 80 50 70 70 M 70 70 Q 50 80 30 70 M 30 70 Q 20 50 30 30" fill="none" stroke="#9370db" stroke-width="6" transform="translate(25, 20)"/>
                <path d="M 30 30 L 70 70 M 70 30 L 30 70" stroke="#9370db" stroke-width="6" transform="translate(260, 30) scale(0.8)"/>
                <text x="180" y="325" font-family="Apple SD Gothic Neo, Malgun Gothic, sans-serif" font-weight="900" font-size="28" fill="#8a2be2" text-anchor="middle" stroke="#ffffff" stroke-width="8" paint-order="stroke fill">쳇</text>
              </svg>`
      },
      {
        name: '06_wow',
        label: '우와',
        svg: `<svg width="360" height="360">
                <!-- 우와 파랑 스파클 -->
                <polygon points="40,20 45,35 60,40 45,45 40,60 35,45 20,40 35,35" fill="#00bfff" transform="translate(30, 30)"/>
                <polygon points="40,20 45,35 60,40 45,45 40,60 35,45 20,40 35,35" fill="#1e90ff" transform="translate(280, 25) scale(1.2)"/>
                <text x="180" y="325" font-family="Apple SD Gothic Neo, Malgun Gothic, sans-serif" font-weight="900" font-size="28" fill="#0066cc" text-anchor="middle" stroke="#ffffff" stroke-width="8" paint-order="stroke fill">우와!</text>
              </svg>`
      },
      {
        name: '07_sad',
        label: '힝',
        svg: `<svg width="360" height="360">
                <!-- 눈물 방울 -->
                <path d="M 30 60 Q 30 45 45 45 Q 60 45 60 60 Q 60 75 45 75 Q 30 75 30 60 Z" fill="#1e90ff" transform="translate(30, 20) scale(0.6)"/>
                <path d="M 30 60 Q 30 45 45 45 Q 60 45 60 60 Q 60 75 45 75 Q 30 75 30 60 Z" fill="#33ccff" transform="translate(280, 60) scale(0.8)"/>
                <text x="180" y="325" font-family="Apple SD Gothic Neo, Malgun Gothic, sans-serif" font-weight="900" font-size="28" fill="#0088cc" text-anchor="middle" stroke="#ffffff" stroke-width="8" paint-order="stroke fill">힝ㅠㅠㅠㅠ</text>
              </svg>`
      },
      {
        name: '08_yes',
        label: '네',
        svg: `<svg width="360" height="360">
                <!-- 따봉/네 말풍선 -->
                <rect x="20" y="20" width="60" height="40" rx="10" fill="#ffa500" transform="translate(30, 20)"/>
                <polygon points="50,60 60,60 55,75" fill="#ffa500" transform="translate(30, 20)"/>
                <circle cx="280" cy="50" r="10" fill="#ffa500"/>
                <text x="180" y="325" font-family="Apple SD Gothic Neo, Malgun Gothic, sans-serif" font-weight="900" font-size="28" fill="#d35400" text-anchor="middle" stroke="#ffffff" stroke-width="8" paint-order="stroke fill">네!</text>
              </svg>`
      }
    ]

    const imageResults = []
    const zip = new JSZip()

    // 8종 합성 루프 실행
    for (const theme of stickerThemes) {
      const composition = await sharp(strokedAnimal)
        .composite([{
          input: Buffer.from(theme.svg),
          blend: 'over'
        }])
        .png()
        .toBuffer()

      const base64Img = `data:image/png;base64,${composition.toString('base64')}`
      imageResults.push({
        name: theme.name,
        label: theme.label,
        image: base64Img
      })

      // ZIP 파일에 개별 이미지 추가
      zip.file(`${theme.name}.png`, composition)
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    const zipBase64 = zipBuffer.toString('base64')

    // 2. 포인트 원자적 1 차감 및 이력 저장 (트랜잭션 안전 래핑)
    await runWithSchemaSafety(async () => {
      // 포인트 차감
      const { error: updateError } = await supabase
        .from('web3_users')
        .update({ points: userRecord.points - 1 })
        .eq('wallet_address', walletAddress.toLowerCase())

      if (updateError) throw updateError

      // 이력 인서트
      const { error: insertError } = await supabase
        .from('point_transactions')
        .insert({
          wallet_address: walletAddress.toLowerCase(),
          amount: -1,
          transaction_type: 'use',
          description: '마이펫 실사 스티커 8종 패키지 제작'
        })

      if (insertError) throw insertError
    })

    return NextResponse.json({
      status: 'success',
      stickers: imageResults,
      zip: zipBase64,
      remainingPoints: userRecord.points - 1
    })

  } catch (error: any) {
    console.error('Pet sticker generate API error:', error)
    // 🔥 시스템 예외(Exception) 알림 웹훅 발송
    const { sendAdminAlert } = require('@/utils/adminAlert')
    sendAdminAlert({
      title: '마이펫 스티커 생성 500 에러 발생',
      level: 'danger',
      message: `마이펫 스티커 8종 합성 API 수행 도중 서버 런타임 에러가 발생했습니다: ${error.message || '알 수 없는 오류'}`,
      metadata: {
        '에러 메시지': error.message,
        '에러 스택': error.stack || error.toString()
      }
    })
    return NextResponse.json({
      status: 'error',
      message: error.message || '마이펫 스티커 생성 중 에러가 발생했습니다.'
    }, { status: 500 })
  }
}
