import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import sharp from 'sharp'

// UUID 생성용 헬퍼
function generateUUID() {
  return crypto.randomUUID()
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('emoji_image') as File | null
    const style = (formData.get('style') as string) || 'trendy'
    const targetCountry = (formData.get('target_country') as string) || 'KR'
    const customText = (formData.get('text') as string) || ''

    if (!file) {
      return NextResponse.json({ status: 'error', message: '이미지 파일이 필요합니다.' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const inputBuffer = Buffer.from(arrayBuffer)
    const mimeType = file.type

    // 글로벌 감정문화 기반 프롬프트 매트릭스
    const localizationPromptMap: Record<string, string> = {
      KR: "Focus on highly relatable, detailed situational descriptions (like studying, tired, or hungry) and rich, indirect non-verbal facial expressions favored by Korean 20s. Outline should be soft and cute.",
      JP: "Apply 'Kawaii' style with extremely cute, simplified characters. Prioritize subtle, non-verbal emotional cues and symbolic manga elements (like sweat drops or speech bubbles) reflecting Japanese Kaomoji culture. Minimize hard text.",
      US: "Incorporate bold outlines, American cartoon/comic book aesthetics, and clever metaphorical wit. Emphasize humorous, B-grade humor and slightly sarcastic or funny expressions.",
      LA: "Focus on highly dramatic, comically exaggerated expressions of frustration, struggle, or daily stress (like Monday blues). Accentuate dynamic eye and hand movements to convey passionate emotions.",
      FR: "Emphasize beautiful heart symbols, positive energy, aesthetically soft, pastel-toned colors, and highly artistic, romantic illustration styles."
    }

    const localizationPrompt = localizationPromptMap[targetCountry] || localizationPromptMap.KR

    const apiKey = process.env.GEMINI_API_KEY || ''
    const isFallback = !apiKey || apiKey === 'your_actual_gemini_api_key_here'
    let generatedImageBuffer: Buffer | null = null

    // 1. AI 생성 시도
    if (!isFallback) {
      try {
        generatedImageBuffer = await callGeminiImageToImage(
          inputBuffer,
          mimeType,
          style,
          customText,
          localizationPrompt,
          apiKey
        )
      } catch (e) {
        console.error('AI Generation failed, falling back to sharp filter:', e)
      }
    }

    // 2. 폴백: 로컬 sharp 필터 가공
    if (!generatedImageBuffer) {
      generatedImageBuffer = await applyLocalSharpFilter(inputBuffer, style)
    }

    // 3. 카카오 표준 규격 가공 (360x360 px, 투명 PNG, 72dpi, 텍스트 오버레이)
    const processedImageBuffer = await formatToKakaoSpecification(generatedImageBuffer, customText, style)

    // 4. Supabase Storage & Database 저장
    const supabase = await createClient(true) // bypass RLS = true (service_role 사용)
    const uuid = generateUUID()
    const fileName = `${uuid}.png`

    // Storage 업로드
    const { error: uploadError } = await supabase.storage
      .from('emojis')
      .upload(fileName, processedImageBuffer, {
        contentType: 'image/png',
        upsert: true
      })

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`)
    }

    // DB 기록
    const { error: dbError } = await supabase
      .from('emojis')
      .insert({
        uuid: uuid,
        style_type: style,
        file_path: fileName
      })

    if (dbError) {
      throw new Error(`Database insert failed: ${dbError.message}`)
    }

    return NextResponse.json({ status: 'success', uuid: uuid })

  } catch (error: any) {
    console.error('Generate Route error:', error)
    return NextResponse.json({ status: 'error', message: error.message || '이모티콘 생성 도중 에러가 발생했습니다.' }, { status: 500 })
  }
}

/**
 * Gemini 1.5 Flash와 Imagen 3.0 API 연동을 통한 이미지 분석 및 재생성
 */
async function callGeminiImageToImage(
  imageBuffer: Buffer,
  mimeType: string,
  style: string,
  customText: string,
  localizationPrompt: string,
  apiKey: string
): Promise<Buffer> {
  // 1단계: Gemini Flash 이미지 분석 및 영어 프롬프트 추출
  const analysisUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`

  const styleInstructions: Record<string, string> = {
    trendy: "Trendy Style: Cute, round-shaped bread cat (식빵냥) yellow/cream-colored kitten style. Warm-toned and soft outlines, showing comically flat or emotional faces.",
    senior: "Senior Style: Soft teddy bear style. Warm brown/beige tones, cute cozy vibes, showing warm encouragements or positive greetings.",
    office: "Office Style: Cute bunny with slight dark circles under the eyes, showing relatable workplace emotions like Monday blues, keyboard typing, or eager notifications."
  }

  let promptText = "Analyze the uploaded image. Analyze its shape, main features, colors, and pose. Then, rewrite a detailed English prompt to recreate this character as a cute individual emoji sticker using the following style guidelines and target market localization prompt.\n"
  promptText += `Style Guidelines: ${styleInstructions[style] || styleInstructions.trendy}\n`
  promptText += `Localization Target Guidelines: ${localizationPrompt}\n`
  if (customText) {
    promptText += `Custom Situational Text to reflect in design: ${customText}\n`
  }
  promptText += "Output format: Write exactly ONE descriptive English sentence starting with 'An emoticon sticker of...'"

  const analysisPayload = {
    contents: [
      {
        parts: [
          { text: promptText },
          {
            inlineData: {
              mimeType: mimeType,
              data: imageBuffer.toString('base64')
            }
          }
        ]
      }
    ]
  }

  const analysisResponse = await fetch(analysisUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(analysisPayload)
  })

  if (!analysisResponse.ok) {
    throw new Error(`Gemini Analysis API failed with status ${analysisResponse.status}`)
  }

  const analysisRes = await analysisResponse.json()
  const generatedPrompt = analysisRes.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''

  if (!generatedPrompt) {
    throw new Error("Failed to extract analysis prompt from Gemini Flash")
  }

  // 2단계: Imagen 3.0 API 호출
  const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages?key=${apiKey}`
  const finalPrompt = `${generatedPrompt}, cute chibi sticker design, vector art style, isolated on clean solid white background, high resolution, 2d vector style`

  const imagenPayload = {
    prompt: finalPrompt,
    numberOfImages: 1,
    outputMimeType: 'image/png',
    aspectRatio: '1:1'
  }

  const imagenResponse = await fetch(imagenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(imagenPayload)
  })

  if (!imagenResponse.ok) {
    throw new Error(`Imagen API failed with status ${imagenResponse.status}`)
  }

  const imagenRes = await imagenResponse.json()
  const base64ImageBytes = imagenRes.generatedImages?.[0]?.image?.imageBytes

  if (!base64ImageBytes) {
    throw new Error("Imagen API returned no image bytes")
  }

  return Buffer.from(base64ImageBytes, 'base64')
}

/**
 * sharp 라이브러리를 활용해 로컬 화풍 필터 가공 (Fallback 엔진)
 */
async function applyLocalSharpFilter(imageBuffer: Buffer, style: string): Promise<Buffer> {
  const pipeline = sharp(imageBuffer)

  // 간단한 스타일링 컬러 모듈레이션
  if (style === 'trendy') {
    // 따뜻한 톤
    pipeline.modulate({ saturation: 1.2 }).tint({ r: 255, g: 235, b: 200 })
  } else if (style === 'senior') {
    // 아늑한 톤
    pipeline.modulate({ saturation: 0.9, brightness: 1.05 }).tint({ r: 240, g: 220, b: 200 })
  } else if (style === 'office') {
    // 차분하고 대비가 살짝 있는 오피스 느낌
    pipeline.modulate({ saturation: 0.8, hue: 180 }).tint({ r: 200, g: 230, b: 255 })
  }

  return await pipeline.png().toBuffer()
}

/**
 * 카카오톡 공식 규격 변환: 360x360 px, 투명 배경 PNG, SVG 텍스트 오버레이 합성
 */
async function formatToKakaoSpecification(imageBuffer: Buffer, text: string, style: string): Promise<Buffer> {
  // 1. 이미지를 360x360 크기 내로 비율 유지하며 리사이징 및 투명 여백 채우기
  const resized = await sharp(imageBuffer)
    .resize(360, 360, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer()

  if (!text) {
    return resized
  }

  // 2. 텍스트 합성용 SVG 생성
  let textColor = '#FFFFFF'
  if (style === 'trendy') {
    textColor = '#FFE664'
  } else if (style === 'office') {
    textColor = '#82F0FF'
  }

  // SVG 텍스트 오버레이
  const svgText = `
    <svg width="360" height="360">
      <style>
        .text {
          fill: ${textColor};
          stroke: #000000;
          stroke-width: 4px;
          stroke-linejoin: round;
          font-family: sans-serif;
          font-size: 22px;
          font-weight: 800;
          text-anchor: middle;
        }
      </style>
      <text x="180" y="325" class="text">${text}</text>
    </svg>
  `

  const textBuffer = Buffer.from(svgText)

  // 3. 텍스트 오버레이 합성
  return await sharp(resized)
    .composite([{ input: textBuffer, blend: 'over' }])
    .png()
    .toBuffer()
}
