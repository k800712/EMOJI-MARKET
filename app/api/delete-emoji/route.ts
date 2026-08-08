import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { uuid } = body

    if (!uuid) {
      return NextResponse.json({ status: 'error', message: '삭제할 이모티콘 UUID가 필요합니다.' }, { status: 400 })
    }

    const supabase = await createClient(true) // bypass RLS = true (service_role 사용)

    // 1. DB에서 이미지 파일 경로(file_path) 조회
    const { data: record, error: findError } = await supabase
      .from('emojis')
      .select('file_path')
      .eq('uuid', uuid)
      .single()

    if (findError || !record) {
      return NextResponse.json({ status: 'error', message: '이모티콘 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    const filePath = record.file_path

    // 2. Supabase Storage 물리 이미지 파일 영구 삭제
    const { error: storageError } = await supabase.storage
      .from('emojis')
      .remove([filePath])

    if (storageError) {
      console.warn(`Storage file deletion warning: ${storageError.message}`)
    }

    // 3. Supabase Database 레코드 영구 삭제
    const { error: dbError } = await supabase
      .from('emojis')
      .delete()
      .eq('uuid', uuid)

    if (dbError) {
      throw new Error(`Database deletion failed: ${dbError.message}`)
    }

    return NextResponse.json({ status: 'success' })

  } catch (error: any) {
    console.error('Delete Emoji API error:', error)
    return NextResponse.json({ status: 'error', message: error.message || '이모티콘 삭제에 실패했습니다.' }, { status: 500 })
  }
}
