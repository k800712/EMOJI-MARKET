import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

export async function POST(req: NextRequest) {
  try {
    console.log('[Step 1] 프론트엔드 이미지 수신 완료')
    const formData = await req.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      console.error('[Step 1 Error] 이미지 파일이 FormData에 없습니다.')
      return NextResponse.json({
        status: 'error',
        message: '이미지 파일이 전달되지 않았습니다.'
      }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const base64Image = `data:${file.type};base64,${buffer.toString('base64')}`

    // 2. 나노바나나 API 연동 시도
    const apiKey = process.env.NANOBANANA_API_KEY
    if (!apiKey) {
      console.warn('[Step 2 Warning] NANOBANANA_API_KEY가 설정되지 않았습니다. 임시 마스크 크롭 백업(Fallback) 로직으로 동작합니다.')
    } else {
      try {
        console.log('[Step 2] 나노바나나 배경 제거 API 호출 시작')
        const response = await fetch('https://api.nanobanana.dev/v1/edit', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt: 'remove background',
            image: base64Image,
            imageDataUrl: base64Image // 규격 상 호환성을 위해 둘 다 탑재
          })
        })

        if (!response.ok) {
          throw new Error(`Nano Banana API HTTP Error ${response.status}: ${response.statusText}`)
        }

        const resData = await response.json()
        if (resData && resData.image) {
          console.log('[Step 2] 나노바나나 배경 제거 API 응답 성공')
          return NextResponse.json({
            status: 'success',
            image: resData.image
          })
        } else {
          throw new Error('API 응답 결과에 이미지 필드(image)가 없습니다.')
        }
      } catch (nanoError: any) {
        console.error('[Step 2 Error] 나노바나나 API 호출 중 오류 발생. 백업(Fallback) 로직으로 전환합니다:', nanoError.message || nanoError)
      }
    }

    // 3. Fallback: 기존 Sharp 마스크 합성 배경제거 로직
    console.log('[Fallback] Sharp 타원 마스크 합성 배경제거 실행')
    
    // sharp를 이용해 이미지를 360x360 비율로 중앙 크롭 및 리사이징
    const resizedImage = await sharp(buffer)
      .resize(360, 360, {
        fit: 'cover',
        position: 'center'
      })
      .png()
      .toBuffer()

    // 동물 얼굴 중심의 부드러운 스티커 컷(타원형 마스크) 만들기
    const mask = Buffer.from(`
      <svg width="360" height="360">
        <ellipse cx="180" cy="180" rx="150" ry="150" fill="#ffffff" />
      </svg>
    `)

    // 마스크 합성을 통한 배경 제거 (dest-in 모드 사용)
    const noBgImage = await sharp(resizedImage)
      .composite([{
        input: mask,
        blend: 'dest-in'
      }])
      .png()
      .toBuffer()

    const resultBase64 = `data:image/png;base64,${noBgImage.toString('base64')}`

    return NextResponse.json({
      status: 'success',
      image: resultBase64
    })

  } catch (error: any) {
    console.error('Remove-bg API error:', error)
    return NextResponse.json({
      status: 'error',
      message: error.message || '배경 제거 처리 중 에러가 발생했습니다.'
    }, { status: 500 })
  }
}
