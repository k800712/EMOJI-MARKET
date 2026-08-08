import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, emojiId, price } = await req.json()

    if (!walletAddress || !emojiId || !price) {
      return NextResponse.json({ status: 'error', message: '필수 파라미터가 누락되었습니다.' }, { status: 400 })
    }

    if (price <= 0) {
      return NextResponse.json({ status: 'error', message: '판매 가격은 1 P 이상이어야 합니다.' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. 해당 이모지를 본인이 소유하고 있는지 검증
    const { data: emoji, error: emojiError } = await supabase
      .from('emojis')
      .select('id, owner_wallet, creator_wallet')
      .eq('id', emojiId)
      .single()

    if (emojiError || !emoji) {
      return NextResponse.json({ status: 'error', message: '존재하지 않는 이모지입니다.' }, { status: 404 })
    }

    // 소유자 검사 (owner_wallet이 null이면 creator_wallet이 소유자)
    const currentOwner = emoji.owner_wallet || emoji.creator_wallet
    if (currentOwner.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json({ status: 'error', message: '해당 이모지의 소유자가 아닙니다.' }, { status: 403 })
    }

    // 2. 이미 활성화된 판매 매물인지 중복 체크
    const { data: activeListing } = await supabase
      .from('emoji_market_listings')
      .select('id')
      .eq('emoji_id', emojiId)
      .eq('status', 'active')
      .maybeSingle()

    if (activeListing) {
      return NextResponse.json({ status: 'error', message: '이미 벼룩시장에 판매 등록되어 있는 매물입니다.' }, { status: 400 })
    }

    // 3. P2P 마켓 판매글 등록
    const { error: insertError } = await supabase
      .from('emoji_market_listings')
      .insert({
        emoji_id: emojiId,
        seller_wallet: walletAddress.toLowerCase(),
        price: Math.floor(price),
        status: 'active'
      })

    if (insertError) {
      throw insertError
    }

    return NextResponse.json({
      status: 'success',
      message: '벼룩시장에 스티커를 판매 등록했습니다!'
    })

  } catch (e: any) {
    console.error('List sticker error:', e)
    return NextResponse.json({ status: 'error', message: '서버 에러가 발생했습니다.' }, { status: 500 })
  }
}

// 벼룩시장의 판매 중인 매물 목록 조회 GET API 지원
export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 판매 중인 매물과 이모티콘 메타데이터, 판매자 정보 조인 조회
    const { data, error } = await supabase
      .from('emoji_market_listings')
      .select(`
        id,
        emoji_id,
        seller_wallet,
        price,
        status,
        created_at,
        emojis (
          uuid,
          style_type,
          file_path
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) throw error

    // 판매자 지갑 주소의 닉네임 조회 연동 (성능 보장을 위해 메모리 조인)
    const { data: users } = await supabase
      .from('web3_users')
      .select('wallet_address, nickname')

    const userMap = new Map()
    users?.forEach(u => userMap.set(u.wallet_address.toLowerCase(), u.nickname))

    const result = data.map((item: any) => ({
      id: item.id,
      emoji_id: item.emoji_id,
      seller_wallet: item.seller_wallet,
      seller_nickname: userMap.get(item.seller_wallet.toLowerCase()) || '급식냥',
      price: item.price,
      status: item.status,
      created_at: item.created_at,
      uuid: item.emojis?.uuid,
      style_type: item.emojis?.style_type,
      file_path: item.emojis?.file_path
    }))

    return NextResponse.json({
      status: 'success',
      data: result
    })

  } catch (e: any) {
    console.error('Fetch listings error:', e)
    return NextResponse.json({ status: 'error', message: '매물 목록 로드에 실패했습니다.' }, { status: 500 })
  }
}
