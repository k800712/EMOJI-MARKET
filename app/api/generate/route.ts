import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'

// Supabase 마스터 서비스 롤 클라이언트 세팅
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 지수 백오프 기반 HTTP 호출 재시도 헬퍼 (429/503 방어)
async function fetchWithRetry(url: string, options: RequestInit, retries = 3, initialDelay = 1500): Promise<Response> {
  let delay = initialDelay
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options)
      if (res.ok) {
        return res
      }
      if (res.status === 429 || res.status === 503 || res.status === 500) {
        console.warn(`[Gemini API 429/503/500] Status ${res.status}. Retrying in ${delay}ms... (${i + 1}/${retries})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        delay *= 1.5
        continue
      }
      return res
    } catch (e) {
      if (i === retries - 1) throw e
      console.warn(`[Gemini API Network Error] ${e}. Retrying in ${delay}ms... (${i + 1}/${retries})`)
      await new Promise(resolve => setTimeout(resolve, delay))
      delay *= 1.5
    }
  }
  return fetch(url, options)
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('emoji_image') as File | null
    const targetCountry = (formData.get('target_country') as string) || 'KR'
    const styleType = (formData.get('style_type') as string) || 'Webtoon'
    const userWallet = (formData.get('user_wallet') as string) || 'guest'
    const situationPrompt = (formData.get('situation_prompt') as string) || ''
    const situationText = (formData.get('situation_text') as string) || ''
    const customText = (formData.get('text') as string) || ''
    const quantity = Number(formData.get('quantity') || '1')
    const taskIndex = Number(formData.get('task_index') || '0')

    // 0. 블랙리스트 제재 어뷰저 차단 가드
    const { isUserBlocked } = require('@/utils/auth-guard')
    if (userWallet !== 'guest' && await isUserBlocked(userWallet)) {
      return NextResponse.json({
        status: 'error',
        message: '🚨 어뷰징 의심 단말로 자동 제재 조치되었습니다. 관리자에게 문의하세요.'
      }, { status: 403 })
    }

    if (!file) {
      return NextResponse.json({ status: 'error', message: '파일이 업로드되지 않았습니다.' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const inputBuffer = Buffer.from(arrayBuffer)

    // ----------------------------------------------------
    // STEP 0: 유저 포인트 검증 로직 (보유 포인트 부족 시 AI 호출 차단)
    // ----------------------------------------------------
    if (userWallet !== 'guest') {
      const { data: userRecord, error: userFetchError } = await supabase
        .from('web3_users')
        .select('points')
        .eq('wallet_address', userWallet.toLowerCase())
        .single()

      if (userFetchError || !userRecord) {
        return NextResponse.json({ status: 'error', message: '가입된 지갑 회원 정보가 존재하지 않습니다.' }, { status: 403 })
      }

      // 첫 번째 이미지 생성 요청(taskIndex === 0) 시점에 전체 생성량(quantity)에 대한 보유 포인트를 선검증
      if (taskIndex === 0 && (userRecord.points ?? 0) < quantity) {
        return NextResponse.json({ 
          status: 'error', 
          message: `포인트가 부족합니다. 보유: ${userRecord.points ?? 0}P / 필요: ${quantity}P` 
        }, { status: 403 })
      }
    }

    // ----------------------------------------------------
    // STEP 1: Gemini 1.5를 사용한 원본 이미지 멀티모달 분석
    // ----------------------------------------------------
    const base64Image = inputBuffer.toString('base64')
    const geminiPayload = {
      contents: [{
        parts: [
          { text: "Analyze this character or face image in detail. Describe key features like hair style, hair color, facial expression, age, glasses, and gender in 2-3 short English sentences to be used as an image generation prompt. Avoid any complex backgrounds." },
          {
            inlineData: {
              mimeType: file.type,
              data: base64Image
            }
          }
        ]
      }]
    }

    const geminiRes = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiPayload)
      }
    )
    
    if (!geminiRes.ok) {
      throw new Error(`Gemini API Analysis failed with status ${geminiRes.status}`)
    }

    const geminiData = await geminiRes.json()
    const analyzedDescription = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "A cute character"

    // ----------------------------------------------------
    // STEP 2: 국가별 감정 및 디자인 화풍 마스터 프롬프트 결합
    // ----------------------------------------------------
    let stylePrompt = ""
    if (styleType === 'Webtoon') {
      stylePrompt = "clean digital webtoon illustration, bold solid outlines, vibrant flat colors"
    } else if (styleType === 'Pixel') {
      stylePrompt = "16-bit cute pixel art style, retro game sprite, crisp pixel edges"
    } else if (styleType === '3D Clay') {
      stylePrompt = "cute 3D claymation model, soft clay texture, plasticine toy style, studio lighting"
    }

    // 국가별 감정 메커니즘 인젝션
    let emotionPrompt = ""
    if (targetCountry === 'KR') {
      emotionPrompt = "subtle and cute facial expression showing situational reaction, korean soft pastel colors"
    } else if (targetCountry === 'JP') {
      emotionPrompt = "extremely cute chibi style, simple kaomoji facial expression, kawaii anime sticker"
    } else if (targetCountry === 'US') {
      emotionPrompt = "bold comical reaction, witty humor, expressive cartoon facial expression"
    } else if (targetCountry === 'LA') {
      emotionPrompt = "passionate and comically exaggerated dramatic reaction with expressive eyes"
    } else if (targetCountry === 'FR') {
      emotionPrompt = "romantic pastel-toned vibe, aesthetic and gentle illustration with subtle heart metaphors"
    }

    // 최종 Imagen 3 전용 고화질 인풋 프롬프트 조립
    const actionPrompt = situationPrompt ? situationPrompt : 'posing cutout sticker'
    const finalPrompt = `A premium mobile emoticon sticker of ${analyzedDescription}, ${actionPrompt}. ${stylePrompt}, ${emotionPrompt}, white thick sticker outline around the character, isolated on a pure #FFFFFF solid white background, high contrast, studio lighting.`

    // ----------------------------------------------------
    // STEP 3: Google Gemini Image Generator API를 사용한 고화질 이모티콘 생성 (Safety/Rate-limit 방어)
    // ----------------------------------------------------
    const imagenPayload = {
      contents: [
        {
          parts: [
            { text: `Generate an image of: ${finalPrompt}. Return only the image output.` }
          ]
        }
      ]
    }

    let generatedBase64 = ""
    let imageRetryDelay = 1500

    for (let i = 0; i < 3; i++) {
      try {
        const imagenRes = await fetchWithRetry(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(imagenPayload)
          }
        )

        if (imagenRes.ok) {
          const imagenData = await imagenRes.json()
          generatedBase64 = imagenData.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || ""
          if (generatedBase64) {
            break // 이미지 획득 성공 시 루프 탈출
          }
        }
        
        console.warn(`[Image Generation Warning] Empty base64 or Safety filter triggered. Retrying in ${imageRetryDelay}ms... (${i + 1}/3)`)
        await new Promise(resolve => setTimeout(resolve, imageRetryDelay))
        imageRetryDelay *= 1.5
      } catch (e) {
        if (i === 2) throw e
        console.warn(`[Image Generation Error] ${e}. Retrying in ${imageRetryDelay}ms...`)
        await new Promise(resolve => setTimeout(resolve, imageRetryDelay))
        imageRetryDelay *= 1.5
      }
    }

    if (!generatedBase64) {
      throw new Error("이미지 생성에 실패했거나 세이프티 필터(Safety)에 의해 권한이 제한되었습니다.")
    }

    const generatedBuffer = Buffer.from(generatedBase64, 'base64')

    // ----------------------------------------------------
    // STEP 4: Sharp를 활용한 카카오 표준(360x360 px, 투명배경 PNG) 가공
    // ----------------------------------------------------
    // #FFFFFF 순수 흰색 배경을 정밀 탐지하여 투명(Alpha 0)으로 날리는 크로마키 알고리즘 탑재
    const { data: rawData, info: rawInfo } = await sharp(generatedBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    // R, G, B 임계값을 정의해 흰색에 가까우면 알파 채널을 0(투명)으로 치환
    const thresholdVal = 240
    for (let i = 0; i < rawData.length; i += 4) {
      const r = rawData[i]
      const g = rawData[i+1]
      const b = rawData[i+2]
      if (r > thresholdVal && g > thresholdVal && b > thresholdVal) {
        rawData[i+3] = 0 // alpha = 0 (투명)
      }
    }

    const resizedPngBuffer = await sharp(rawData, {
      raw: {
        width: rawInfo.width,
        height: rawInfo.height,
        channels: rawInfo.channels
      }
    })
      .resize(360, 360, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: sharp.kernel.lanczos3 // 무손실 보간 알고리즘
      })
      .png({ compressionLevel: 9, quality: 100 })
      .toBuffer()

    const textToSynthesize = customText || situationText
    let highQualityProcessedBuffer = resizedPngBuffer

    if (textToSynthesize) {
      let textColor = '#FFFFFF'
      if (styleType === 'Webtoon') {
        textColor = '#FFE664' // 노랑
      } else if (styleType === '3D Clay') {
        textColor = '#82F0FF' // 하늘
      }
      
      const svgText = `
        <svg width="360" height="360">
          <style>
            .text {
              fill: ${textColor};
              stroke: #000000;
              stroke-width: 5px;
              stroke-linejoin: round;
              font-family: sans-serif;
              font-size: 24px;
              font-weight: 900;
              text-anchor: middle;
            }
          </style>
          <text x="180" y="325" class="text">${textToSynthesize}</text>
        </svg>
      `
      const textBuffer = Buffer.from(svgText)
      highQualityProcessedBuffer = await sharp(resizedPngBuffer)
        .composite([{ input: textBuffer, blend: 'over' }])
        .png()
        .toBuffer()
    }

    // ----------------------------------------------------
    // STEP 5: Supabase Storage 업로드 & DB 영구 기록
    // ----------------------------------------------------
    const emojiUuid = crypto.randomUUID()
    const filePath = `emojis/${emojiUuid}.png`

    // emojis 스토리지 버킷이 없으면 백엔드 단에서 자동 Private 생성 (무오류 연동)
    try {
      const { data: buckets } = await supabase.storage.listBuckets()
      const hasBucket = buckets?.some(b => b.name === 'emojis')
      if (!hasBucket) {
        console.log("emojis bucket not found. Auto-creating private emojis bucket...")
        await supabase.storage.createBucket('emojis', {
          public: false,
          allowedMimeTypes: ['image/png']
        })
      }
    } catch (e) {
      console.warn("Storage bucket pre-check failed, proceeding to upload:", e)
    }

    const { error: uploadError } = await supabase.storage
      .from('emojis')
      .upload(filePath, highQualityProcessedBuffer, {
        contentType: 'image/png',
        cacheControl: '31536000',
        upsert: true
      })

    if (uploadError) throw uploadError

    // 데이터베이스 적재
    const { error: dbError } = await supabase
      .from('emojis')
      .insert({
        uuid: emojiUuid,
        style_type: styleType, // Webtoon, Pixel, 3D Clay 화풍 저장 (정합성 보정)
        file_path: filePath,
        creator_wallet: userWallet === 'guest' ? null : userWallet.toLowerCase(),
        owner_wallet: userWallet === 'guest' ? null : userWallet.toLowerCase(),
        status: 'active',
        is_viewed: false
      })

    if (dbError) throw dbError

    // 지갑 회원이고 첫 번째 태스크(taskIndex === 0)인 경우에 한해 전체 quantity 분량 일괄 선차감 수행
    if (userWallet !== 'guest' && taskIndex === 0) {
      const { data: currentUser } = await supabase
        .from('web3_users')
        .select('points')
        .eq('wallet_address', userWallet.toLowerCase())
        .single()

      if (currentUser) {
        const nextPoints = Math.max(0, (currentUser.points ?? 0) - quantity)
        await supabase
          .from('web3_users')
          .update({
            points: nextPoints,
            updated_at: new Date().toISOString()
          })
          .eq('wallet_address', userWallet.toLowerCase())

        // 포인트 차감 거래 내역 1회 일괄 기록
        await supabase
          .from('point_transactions')
          .insert({
            wallet_address: userWallet.toLowerCase(),
            amount: -quantity,
            transaction_type: 'use',
            description: `${styleType} 이모티콘 ${quantity}개 생성`
          })
      }
    }

    return NextResponse.json({ status: 'success', uuid: emojiUuid })

  } catch (error: any) {
    console.error('Generation engine error:', error)
    return NextResponse.json({ status: 'error', message: error.message || '이모티콘 생성 도중 에러가 발생했습니다.' }, { status: 500 })
  }
}
