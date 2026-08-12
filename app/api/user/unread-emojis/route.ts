import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

async function runWithSchemaSafety<T>(operation: () => Promise<T>): Promise<T> {
  const maxRetries = 3
  let retryCount = 0
  let lastError = null

  while (retryCount < maxRetries) {
    try {
      return await operation()
    } catch (e: any) {
      lastError = e
      console.warn(`[Unread Emojis API Safety Wrapper] Attempt ${retryCount + 1} failed. Error:`, e.message || e)
      retryCount++
      if (retryCount < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 250 * retryCount))
      }
    }
  }
  throw new Error(`[Unread Emojis API Safety Failure] ${lastError?.message || 'DB operation failed after retries'}`)
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const wallet = searchParams.get('wallet')

    if (!wallet) {
      return NextResponse.json({ status: 'error', message: '지갑 주소가 필요합니다.' }, { status: 400 })
    }

    const supabase = await createClient(true) // service_role

    const count = await runWithSchemaSafety(async () => {
      const { count, error } = await supabase
        .from('emojis')
        .select('*', { count: 'exact', head: true })
        .eq('owner_wallet', wallet.toLowerCase())
        .eq('status', 'completed')
        .eq('is_viewed', false)

      if (error) throw error
      return count || 0
    })

    return NextResponse.json({ status: 'success', count })

  } catch (error: any) {
    console.error('Get unread emojis count API error:', error)
    return NextResponse.json({ status: 'success', count: 0 }) // 폴백
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { walletAddress } = body

    if (!walletAddress) {
      return NextResponse.json({ status: 'error', message: '지갑 주소가 필요합니다.' }, { status: 400 })
    }

    const supabase = await createClient(true) // service_role

    await runWithSchemaSafety(async () => {
      // 1. 미확인 이모지들 모두 확인 완료 처리
      const { error: emojiError } = await supabase
        .from('emojis')
        .update({ is_viewed: true })
        .eq('owner_wallet', walletAddress.toLowerCase())
        .eq('status', 'completed')
        .eq('is_viewed', false)

      if (emojiError) throw emojiError

      // 2. pending_emoji_notifications 카운트도 0으로 동기화 리셋
      const { error: userError } = await supabase
        .from('web3_users')
        .update({ pending_emoji_notifications: 0 })
        .eq('wallet_address', walletAddress.toLowerCase())

      if (userError) throw userError
    })

    return NextResponse.json({ status: 'success', message: '완공 축하 확인 완료 처리되었습니다.' })

  } catch (error: any) {
    console.error('Confirm unread emojis API error:', error)
    return NextResponse.json({
      status: 'error',
      message: error.message || '확인 처리 중 에러가 발생했습니다.'
    }, { status: 500 })
  }
}
