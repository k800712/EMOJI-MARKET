import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import JSZip from 'jszip'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { uuids } = body

    if (!Array.isArray(uuids) || uuids.length === 0) {
      return NextResponse.json({ status: 'error', message: 'UUID 목록이 필요합니다.' }, { status: 400 })
    }

    const supabase = await createClient(true) // service_role

    // 1. DB에서 파일 경로 목록 조회
    const { data: records, error: dbError } = await supabase
      .from('emojis')
      .select('uuid, file_path')
      .in('uuid', uuids)

    if (dbError || !records || records.length === 0) {
      return NextResponse.json({ status: 'error', message: '데이터베이스 조회에 실패했습니다.' }, { status: 404 })
    }

    // 2. JSZip 초기화
    const zip = new JSZip()

    // 3. 파일 바이너리 취합 및 ZIP 빌드 (입력받은 순서대로 emotion_01, emotion_02... 리네이밍)
    let fileIndex = 1
    for (const uuid of uuids) {
      const record = records.find(r => r.uuid === uuid)
      if (!record) continue

      // Storage에서 파일 다운로드
      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from('emojis')
        .download(record.file_path)

      if (downloadError || !fileBlob) {
        console.error(`Download failed for path ${record.file_path}:`, downloadError)
        continue
      }

      const fileBuffer = Buffer.from(await fileBlob.arrayBuffer())
      const formattedName = `emotion_${String(fileIndex).padStart(2, '0')}.png`
      zip.file(formattedName, fileBuffer)
      fileIndex++
    }

    // 4. ZIP 압축
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })

    // 5. Response Headers & Direct Stream 전송
    const responseHeaders = new Headers()
    responseHeaders.set('Content-Type', 'application/zip')
    responseHeaders.set('Content-Disposition', 'attachment; filename="emoji_market_package.zip"')

    return new Response(zipBuffer, {
      status: 200,
      headers: responseHeaders
    })

  } catch (error: any) {
    console.error('Export API error:', error)
    return NextResponse.json({ status: 'error', message: error.message || 'ZIP 압축 중 서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
