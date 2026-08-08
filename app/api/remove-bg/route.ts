import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { image } = body // base64 포맷 이미지

    if (!image) {
      return NextResponse.json({
        status: 'error',
        message: '이미지 데이터가 없습니다.'
      }, { status: 400 })
    }

    // base64 헤더 제거 및 버퍼 변환
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '')
    const imageBuffer = Buffer.from(base64Data, 'base64')

    // 1. sharp를 이용해 이미지를 360x360 비율로 중앙 크롭 및 리사이징
    const resizedImage = await sharp(imageBuffer)
      .resize(360, 360, {
        fit: 'cover',
        position: 'center'
      })
      .png()
      .toBuffer()

    // 2. 동물 얼굴 중심의 부드러운 스티커 컷(타원형 마스크) 만들기
    const mask = Buffer.from(`
      <svg width="360" height="360">
        <ellipse cx="180" cy="180" rx="150" ry="150" fill="#ffffff" />
      </svg>
    `)

    // 3. 마스크 합성을 통한 배경 제거 (dest-in 모드 사용)
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
