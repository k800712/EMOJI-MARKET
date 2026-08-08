import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient(true) // service_role

    const { data, error } = await supabase
      .from('emojis')
      .select('uuid, style_type, created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      throw error
    }

    return NextResponse.json({
      status: 'success',
      data: data || []
    })

  } catch (error: any) {
    console.error('Get-History API error:', error)
    return NextResponse.json({
      status: 'error',
      message: error.message || '이력을 조회하는 도중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}
