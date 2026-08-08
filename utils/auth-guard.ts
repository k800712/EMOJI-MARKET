import { createClient } from '@/utils/supabase/server'

/**
 * 유저의 계정 상태가 제재(blocked) 중인지 안전하게 검증합니다.
 * @param walletAddress 검증할 유저의 지갑 주소
 * @returns status가 'blocked'인 경우 true, 그 외(active, not found 등) false 반환
 */
export async function isUserBlocked(walletAddress: string | null): Promise<boolean> {
  if (!walletAddress) return false

  try {
    const supabase = await createClient(true) // service_role bypass RLS
    const { data, error } = await supabase
      .from('web3_users')
      .select('status')
      .eq('wallet_address', walletAddress.toLowerCase())
      .maybeSingle()

    if (error || !data) {
      return false
    }

    return data.status === 'blocked'
  } catch (err) {
    console.error('[auth-guard] Failed to check user status:', err)
    return false // DB 장애 상황 등에서는 안전을 위해 차단하지 않고 통과 처리
  }
}
