import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const uuid = searchParams.get('uuid')

    if (!uuid) {
      return new NextResponse('UUID is required', { status: 400 })
    }

    const supabase = await createClient(true) // service_role

    // 1. DB에서 파일 경로 조회
    const { data: record, error: dbError } = await supabase
      .from('emojis')
      .select('file_path')
      .eq('uuid', uuid)
      .single()

    if (dbError || !record) {
      return new NextResponse('Emoji not found in DB', { status: 404 })
    }

    // 1.5. 로컬 에셋(temp_...)인 경우 로컬에서 초고속 서빙 (스토리지 404 예방)
    if (record.file_path.startsWith('temp_')) {
      const fs = require('fs')
      const path = require('path')
      const localFilePath = path.join(process.cwd(), 'public', 'assets', 'custom-emojis', `${record.file_path}.png`)
      
      try {
        if (fs.existsSync(localFilePath)) {
          const imageBuffer = fs.readFileSync(localFilePath)
          const responseHeaders = new Headers()
          responseHeaders.set('Content-Type', 'image/png')
          responseHeaders.set('Cache-Control', 'public, max-age=31536000, immutable')
          
          return new Response(imageBuffer, {
            status: 200,
            headers: responseHeaders
          })
        }
      } catch (fsError) {
        console.error('Local asset read error:', fsError)
      }
    }

    // 2. Storage에서 60초 임시 Signed URL 생성
    const { data: signedData, error: storageError } = await supabase.storage
      .from('emojis')
      .createSignedUrl(record.file_path, 60)

    if (storageError || !signedData?.signedUrl) {
      return new NextResponse('Failed to generate Signed URL', { status: 500 })
    }

    // 3. Signed URL로부터 다이렉트 바이너리 Fetch (보안 스트리밍)
    const imageResponse = await fetch(signedData.signedUrl)
    if (!imageResponse.ok) {
      return new NextResponse('Failed to fetch image bytes', { status: 500 })
    }

    const imageBuffer = await imageResponse.arrayBuffer()

    // 4. DRM 캐시 차단 및 Content-Type 응답 전송
    const responseHeaders = new Headers()
    responseHeaders.set('Content-Type', 'image/png')
    responseHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
    responseHeaders.set('Pragma', 'no-cache')
    responseHeaders.set('Expires', '0')

    return new Response(imageBuffer, {
      status: 200,
      headers: responseHeaders
    })

  } catch (error) {
    console.error('View API error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
