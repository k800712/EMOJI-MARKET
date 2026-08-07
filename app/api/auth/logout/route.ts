import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    const cookieStore = await cookies()
    cookieStore.delete('wallet_address')
    return NextResponse.json({ status: 'success' })
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Failed to clear session' }, { status: 500 })
  }
}
