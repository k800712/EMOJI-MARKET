import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { buyerWallet, listingId } = await req.json()

    if (!buyerWallet || !listingId) {
      return NextResponse.json({ status: 'error', message: '필수 파라미터가 누락되었습니다.' }, { status: 400 })
    }

    // 0. 블랙리스트 제재 어뷰저 차단 가드
    const { isUserBlocked } = require('@/utils/auth-guard')
    if (await isUserBlocked(buyerWallet)) {
      return NextResponse.json({
        status: 'error',
        message: '🚨 어뷰징 의심 단말로 자동 제재 조치되었습니다. 관리자에게 문의하세요.'
      }, { status: 403 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. 매물 정보 조회 및 검증 (이중 구매 방지)
    const { data: listing, error: listingError } = await supabase
      .from('emoji_market_listings')
      .select('id, emoji_id, seller_wallet, price, status')
      .eq('id', listingId)
      .single()

    if (listingError || !listing) {
      return NextResponse.json({ status: 'error', message: '존재하지 않는 매물입니다.' }, { status: 404 })
    }

    // 이미 판매 완료 또는 취소된 경우 차단
    if (listing.status !== 'active') {
      return NextResponse.json({ status: 'error', message: '이미 판매 완료되었거나 취소된 거래입니다.' }, { status: 400 })
    }

    const sellerWallet = listing.seller_wallet
    const price = listing.price

    // 본인 거래 방지
    if (sellerWallet.toLowerCase() === buyerWallet.toLowerCase()) {
      return NextResponse.json({ status: 'error', message: '자신이 올린 스티커는 구매할 수 없습니다.' }, { status: 400 })
    }

    // 2. 구매자 포인트 잔액 조회
    const { data: buyerUser, error: buyerError } = await supabase
      .from('web3_users')
      .select('points')
      .eq('wallet_address', buyerWallet.toLowerCase())
      .single()

    if (buyerError || !buyerUser) {
      return NextResponse.json({ status: 'error', message: '구매자 정보를 조회할 수 없습니다.' }, { status: 404 })
    }

    if ((buyerUser.points || 0) < price) {
      return NextResponse.json({ status: 'error', message: '보유 포인트가 부족합니다. 충전 후 다시 시도해 주세요.' }, { status: 400 })
    }

    // 3. 판매자 포인트 및 정보 조회
    const { data: sellerUser, error: sellerError } = await supabase
      .from('web3_users')
      .select('points')
      .eq('wallet_address', sellerWallet.toLowerCase())
      .single()

    if (sellerError || !sellerUser) {
      return NextResponse.json({ status: 'error', message: '판매자 정보를 조회할 수 없습니다.' }, { status: 404 })
    }

    // 4. 원자적 수수료 및 포인트 계산
    const fee = Math.ceil(price * 0.05) // 수수료 5% 올림 계산
    const payout = price - fee // 판매자 정산액

    // 5. 트랜잭션 업데이트 기동
    // 5-1) 매물 상태 변경 (active -> sold)
    const { error: listingUpdateError } = await supabase
      .from('emoji_market_listings')
      .update({ status: 'sold' })
      .eq('id', listingId)
      .eq('status', 'active') // 동시성 락 체크: 찰나에 다른 쿼리가 먼저 바꿨는지 이중 검증

    if (listingUpdateError) {
      return NextResponse.json({ status: 'error', message: '이미 다른 사용자가 구매 중인 스티커입니다.' }, { status: 400 })
    }

    // 5-2) 이모지 소유권 이전 (owner_wallet 변경)
    const { error: emojiOwnerError } = await supabase
      .from('emojis')
      .update({ owner_wallet: buyerWallet.toLowerCase() })
      .eq('id', listing.emoji_id)

    if (emojiOwnerError) {
      // 롤백: 매물 상태 복구
      await supabase.from('emoji_market_listings').update({ status: 'active' }).eq('id', listingId)
      throw new Error(`Failed to transfer emoji ownership: ${emojiOwnerError.message}`)
    }

    // 5-3) 구매자 포인트 차감
    const { error: buyerUpdateError } = await supabase
      .from('web3_users')
      .update({ points: buyerUser.points - price })
      .eq('wallet_address', buyerWallet.toLowerCase())

    if (buyerUpdateError) {
      // 롤백: 소유권 복구 및 매물 상태 복구
      await supabase.from('emojis').update({ owner_wallet: sellerWallet.toLowerCase() }).eq('id', listing.emoji_id)
      await supabase.from('emoji_market_listings').update({ status: 'active' }).eq('id', listingId)
      throw new Error(`Failed to deduct buyer points: ${buyerUpdateError.message}`)
    }

    // 5-4) 판매자 포인트 가산 (수수료 제하고 정산 입금)
    const { error: sellerUpdateError } = await supabase
      .from('web3_users')
      .update({ points: (sellerUser.points || 0) + payout })
      .eq('wallet_address', sellerWallet.toLowerCase())

    if (sellerUpdateError) {
      // 롤백: 구매자 포인트 복구, 소유권 복구, 매물 상태 복구
      await supabase.from('web3_users').update({ points: buyerUser.points }).eq('wallet_address', buyerWallet.toLowerCase())
      await supabase.from('emojis').update({ owner_wallet: sellerWallet.toLowerCase() }).eq('id', listing.emoji_id)
      await supabase.from('emoji_market_listings').update({ status: 'active' }).eq('id', listingId)
      throw new Error(`Failed to credit seller points: ${sellerUpdateError.message}`)
    }

    // 6. 거래 내역 영수증 인서트 및 포인트 기록 생성
    const txRecords = [
      {
        wallet_address: buyerWallet.toLowerCase(),
        amount: -price,
        transaction_type: 'use',
        description: `P2P 장터 스티커 구매 소모 (${price} P)`
      },
      {
        wallet_address: sellerWallet.toLowerCase(),
        amount: payout,
        transaction_type: 'charge',
        description: `P2P 장터 스티커 판매 정산 입금 (+${payout} P, 수수료 5% 차감)`
      }
    ]

    await supabase.from('point_transactions').insert(txRecords)

    await supabase.from('emoji_trade_history').insert({
      listing_id: listingId,
      emoji_id: listing.emoji_id,
      seller_wallet: sellerWallet.toLowerCase(),
      buyer_wallet: buyerWallet.toLowerCase(),
      price: price,
      fee: fee
    })

    return NextResponse.json({
      status: 'success',
      message: '송금 완료 및 스티커 가상 소유권이 나에게로 이동했습니다! 🎉',
      remainingPoints: buyerUser.points - price
    })

  } catch (e: any) {
    console.error('P2P buy error:', e)
    return NextResponse.json({ status: 'error', message: '정산 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
