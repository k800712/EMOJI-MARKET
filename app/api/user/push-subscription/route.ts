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
      console.warn(`[Push Subscription API Safety Wrapper] Attempt ${retryCount + 1} failed. Error:`, e.message || e)
      retryCount++
      if (retryCount < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 250 * retryCount))
      }
    }
  }
  throw new Error(`[Push Subscription API Safety Failure] ${lastError?.message || 'DB operation failed after retries'}`)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { walletAddress, subscription } = body

    if (!walletAddress) {
      return NextResponse.json({ status: 'error', message: '지갑 주소가 필요합니다.' }, { status: 400 })
    }

    if (!subscription) {
      return NextResponse.json({ status: 'error', message: '구독 정보(subscription)가 필요합니다.' }, { status: 400 })
    }

    const supabase = await createClient(true) // service_role

    await runWithSchemaSafety(async () => {
      const { error } = await supabase
        .from('web3_users')
        .update({ push_subscription: subscription })
        .eq('wallet_address', walletAddress.toLowerCase())

      if (error) throw error
    })

    return NextResponse.json({ status: 'success', message: '웹 푸시 구독 정보가 성공적으로 등록되었습니다.' })

  } catch (error: any) {
    console.error('Push subscription save API error:', error)
    return NextResponse.json({
      status: 'error',
      message: error.message || '푸시 구독 등록 중 에러가 발생했습니다.'
    }, { status: 500 })
  }
}
