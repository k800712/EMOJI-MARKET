'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ShoppingBag, ArrowLeft, Plus, Wallet, RefreshCw, X, Tag } from 'lucide-react'

interface Listing {
  id: number
  emoji_id: number
  seller_wallet: string
  seller_nickname: string
  price: number
  status: string
  created_at: string
  uuid: string
  style_type: string
  file_path: string
}

interface MyEmoji {
  id: number
  uuid: string
  file_path: string
  style_type: string
}

export default function MarketPage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [myEmojis, setMyEmojis] = useState<MyEmoji[]>([])
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [points, setPoints] = useState<number>(0)
  
  // 모달 및 상태 변수
  const [showRegisterDrawer, setShowRegisterDrawer] = useState<boolean>(false)
  const [selectedEmojiId, setSelectedEmojiId] = useState<number | null>(null)
  const [sellPrice, setSellPrice] = useState<string>('')
  const [isRegistering, setIsRegistering] = useState<boolean>(false)
  const [isBuying, setIsBuying] = useState<boolean>(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // 햅틱 피드백 기동
  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(60)
    }
  }

  // Toast 팝업
  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // 벼룩시장 매물 로드
  const loadListings = async () => {
    try {
      const res = await fetch('/api/market/list')
      const data = await res.json()
      if (data.status === 'success') {
        setListings(data.data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  // 내 보관함 이모지 로드 (판매 등록용)
  const loadMyEmojis = async () => {
    if (!walletAddress) return
    try {
      const res = await fetch('/api/get-history')
      const data = await res.json()
      if (data.status === 'success' && Array.isArray(data.data)) {
        // 이미 판매 등록 중인 emoji_id는 제외
        const currentListings = new Set(listings.map(l => l.emoji_id))
        const filtered = data.data.filter((item: any) => !currentListings.has(item.id))
        setMyEmojis(filtered)
      }
    } catch (e) {
      console.error(e)
    }
  }

  // 포인트 로드
  const loadPoints = async (addr: string) => {
    try {
      const res = await fetch(`/api/user/points?wallet=${addr}`)
      const data = await res.json()
      if (data.status === 'success') {
        setPoints(data.points)
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('wallet_session')
      if (session) {
        setWalletAddress(session)
        loadPoints(session)
      }
    }
    loadListings()
  }, [])

  useEffect(() => {
    if (walletAddress) {
      loadMyEmojis()
    }
  }, [walletAddress, listings])

  // 판매 등록 핸들러
  const handleRegisterSticker = async () => {
    if (!walletAddress) return
    if (!selectedEmojiId) {
      alert('판매할 스티커를 선택해 주세요!')
      return
    }
    const priceNum = parseInt(sellPrice)
    if (isNaN(priceNum) || priceNum <= 0) {
      alert('올바른 판매 가격을 입력해 주세요 (최소 1 P 이상).')
      return
    }

    try {
      setIsRegistering(true)
      const res = await fetch('/api/market/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          emojiId: selectedEmojiId,
          price: priceNum
        })
      })
      const data = await res.json()
      if (data.status === 'success') {
        triggerHaptic()
        showToast('🚀 스티커가 벼룩시장에 등록되었습니다!')
        setShowRegisterDrawer(false)
        setSelectedEmojiId(null)
        setSellPrice('')
        loadListings()
      } else {
        alert(data.message || '등록 실패')
      }
    } catch (e) {
      console.error(e)
      alert('등록 중 에러가 발생했습니다.')
    } finally {
      setIsRegistering(false)
    }
  }

  // 구매 핸들러
  const handleBuySticker = async (listing: Listing) => {
    if (!walletAddress) {
      alert('로그인이 필요한 서비스입니다! 홈 화면에서 로그인 후 이용해 주세요.')
      return
    }

    if (points < listing.price) {
      alert('보유 포인트가 부족합니다. 홈 화면에서 충전 후 다시 시도해 주세요.')
      return
    }

    if (confirm(`🪙 ${listing.price} P에 이 스티커를 구매하시겠습니까?\n구매 완료 즉시 가상 소유권이 내 지갑으로 이전됩니다.`)) {
      try {
        setIsBuying(true)
        const res = await fetch('/api/market/buy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            buyerWallet: walletAddress,
            listingId: listing.id
          })
        })
        const data = await res.json()
        if (data.status === 'success') {
          triggerHaptic()
          triggerConfetti()
          showToast('🎉 송금 완료! 소유권 이전 완료!')
          loadPoints(walletAddress)
          loadListings()
        } else {
          alert(data.message || '구매 실패')
        }
      } catch (e) {
        console.error(e)
        alert('구매 중 에러가 발생했습니다.')
      } finally {
        setIsBuying(false)
      }
    }
  }

  // Confetti 연출
  const triggerConfetti = () => {
    if (typeof document === 'undefined') return
    const container = document.createElement('div')
    container.style.position = 'fixed'
    container.style.top = '0'
    container.style.left = '0'
    container.style.width = '100vw'
    container.style.height = '100vh'
    container.style.pointerEvents = 'none'
    container.style.zIndex = '9999'
    document.body.appendChild(container)

    const colors = ['#ffd700', '#ff69b4', '#1e90ff', '#32cd32', '#ff4500', '#da70d6']

    for (let i = 0; i < 60; i++) {
      const p = document.createElement('div')
      p.style.position = 'absolute'
      p.style.width = `${Math.random() * 8 + 4}px`
      p.style.height = `${Math.random() * 12 + 6}px`
      p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
      p.style.left = '50%'
      p.style.top = '50%'
      p.style.transform = 'translate(-50%, -50%)'
      p.style.borderRadius = '2px'
      
      const angle = Math.random() * Math.PI * 2
      const velocity = Math.random() * 10 + 6
      const vx = Math.cos(angle) * velocity
      const vy = Math.sin(angle) * velocity - 4
      
      let x = window.innerWidth / 2
      let y = window.innerHeight / 2
      let opacity = 1
      
      container.appendChild(p)
      
      const animate = () => {
        x += vx
        y += vy + 0.3
        opacity -= 0.015
        
        p.style.left = `${x}px`
        p.style.top = `${y}px`
        p.style.opacity = `${opacity}`
        p.style.transform = `rotate(${y}deg)`
        
        if (opacity > 0) {
          requestAnimationFrame(animate)
        } else {
          p.remove()
        }
      }
      requestAnimationFrame(animate)
    }
    
    setTimeout(() => {
      container.remove()
    }, 2500)
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 pb-20 selection:bg-indigo-100 relative">
      
      {/* 상단 벼룩시장 헤더 헤드 보드 */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200/50 px-6 py-4 flex items-center justify-between z-40">
        <div className="flex items-center gap-3">
          <Link 
            href="/"
            className="p-2 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            onClick={triggerHaptic}
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-sm font-black flex items-center gap-1.5 text-slate-900">
              <ShoppingBag className="w-4 h-4 text-indigo-600 animate-pulse" />
              10대 실시간 벼룩시장
            </h1>
            <p className="text-[10px] text-gray-400 font-extrabold mt-0.5">수수료 5% 정산 / 가상 소유권 이전</p>
          </div>
        </div>

        {/* 포인트 현황 */}
        <div className="flex items-center gap-2.5">
          {walletAddress && (
            <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full text-indigo-600 text-xs font-black shadow-sm shadow-indigo-500/5">
              <Wallet className="w-3.5 h-3.5" />
              <span>🪙 {points} P</span>
            </div>
          )}
          
          <button
            type="button"
            onClick={() => {
              triggerHaptic()
              loadListings()
              if (walletAddress) loadPoints(walletAddress)
            }}
            className="p-2 bg-white hover:bg-slate-100 border border-gray-200 rounded-full transition-all cursor-pointer shadow-sm"
            title="새로고침"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 mt-8 space-y-8">
        
        {/* 장터 소개 배너 */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-3xl p-6 shadow-xl shadow-indigo-500/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
          <div className="space-y-1.5 relative z-10">
            <h2 className="text-md font-black">쉬는시간 벼룩시장에서 득템하기! 🎁</h2>
            <p className="text-xs text-indigo-100 leading-relaxed max-w-md">
              내가 만든 귀여운 이모지들을 친구들과 포인트를 주고 안전하게 거래해 보세요. 거래 즉시 가상 지갑 매핑을 통해 소유권이 동기화됩니다!
            </p>
          </div>
          {walletAddress && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic()
                setShowRegisterDrawer(true)
              }}
              className="bg-white hover:bg-slate-50 text-indigo-600 text-xs font-black px-4 py-3 rounded-2xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5 relative z-10"
            >
              <Plus className="w-4 h-4" />
              내 스티커 판매 등록
            </button>
          )}
        </div>

        {/* 판매 리스트 카드 그리드 */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-gray-400 block tracking-wider uppercase">현재 판매 중인 스티커</h3>
          
          {listings.length === 0 ? (
            <div className="bg-white border border-gray-200/60 rounded-3xl p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
              <span className="text-3xl">🪙</span>
              <p className="text-xs font-black text-slate-700">현재 등록된 스티커 매물이 없습니다.</p>
              <p className="text-[10px] text-gray-400 max-w-xs leading-relaxed">
                가장 먼저 내가 만든 예쁜 이모티콘을 벼룩시장에 올려 친구들에게 포인트를 받고 판매해 보세요!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {listings.map((item) => {
                const isOwnListing = walletAddress?.toLowerCase() === item.seller_wallet.toLowerCase()
                
                return (
                  <div 
                    key={item.id} 
                    className="bg-white border border-slate-100 hover:border-indigo-100 rounded-3xl p-4 flex flex-col items-center gap-3 transition-all duration-300 shadow-md hover:shadow-lg relative group"
                  >
                    
                    {/* 가격 배지 */}
                    <div className="absolute top-3 left-3 z-10 bg-amber-400 border border-amber-300 text-amber-950 text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm">
                      🪙 {item.price} P
                    </div>

                    {/* 이모지 이미지 */}
                    <div className="w-full aspect-square bg-slate-50/50 rounded-2xl flex items-center justify-center overflow-hidden border border-gray-150 p-2 relative shadow-inner">
                      <img 
                        src={`/api/view?uuid=${item.uuid}`} 
                        alt="Sticker" 
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        loading="lazy" 
                      />
                    </div>

                    {/* 스티커 메타 및 구매 */}
                    <div className="w-full text-center space-y-3">
                      <div className="space-y-1">
                        <span className="text-[10px] text-indigo-500 font-extrabold tracking-wider block uppercase">{item.style_type === 'illust' ? '🎨 일러스트' : '🐶 마이펫 실사'}</span>
                        <h4 className="text-xs font-black text-slate-800 tracking-tight">{item.seller_nickname}</h4>
                        <span className="text-[9px] text-gray-400 font-mono block">{item.created_at.substring(0, 10)}</span>
                      </div>

                      {isOwnListing ? (
                        <div className="w-full py-2.5 bg-gray-100 text-gray-400 text-xs font-bold rounded-xl select-none">
                          내 등록 스티커
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleBuySticker(item)}
                          disabled={isBuying}
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-xs font-black rounded-xl transition-all active:scale-[0.98] shadow-md shadow-indigo-500/5 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          구매하기
                        </button>
                      )}
                    </div>

                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

      {/* ② 판매 등록 BottomSheet 서랍 모달 */}
      {showRegisterDrawer && (
        <div className="fixed inset-0 bg-[#191919]/60 backdrop-blur-sm z-50 flex items-end justify-center transition-all duration-300 p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full shadow-2xl relative border-t sm:border border-gray-100 transform translate-y-0 transition-transform duration-500 animate-slide-up pb-8 sm:pb-6">
            
            {/* 닫기 버튼 */}
            <button
              type="button"
              onClick={() => {
                setShowRegisterDrawer(false)
                setSelectedEmojiId(null)
                setSellPrice('')
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 space-y-6">
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
                  <Tag className="text-indigo-600 w-4 h-4" />
                </div>
                <h3 className="text-md font-black text-slate-900">내 스티커 벼룩시장 판매 등록</h3>
              </div>

              {/* 내 스티커 목록 선택 */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-gray-400 block uppercase">1. 판매할 내 스티커 선택</label>
                
                {myEmojis.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-gray-200">
                    판매 등록 가능한 소유한 스티커가 없습니다.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2.5 max-h-[160px] overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-gray-100 shadow-inner">
                    {myEmojis.map((emoji) => (
                      <button
                        key={emoji.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic()
                          setSelectedEmojiId(emoji.id)
                        }}
                        className={`aspect-square rounded-xl bg-white border p-1 transition-all flex items-center justify-center relative ${
                          selectedEmojiId === emoji.id 
                            ? 'ring-4 ring-indigo-500 border-indigo-500 scale-95 shadow-md shadow-indigo-500/5' 
                            : 'border-gray-200 hover:border-indigo-200 shadow-sm'
                        }`}
                      >
                        <img src={`/api/view?uuid=${emoji.uuid}`} alt="Emoji preview" className="w-full h-full object-contain" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 희망 판매 가격 입력 */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-gray-400 block uppercase">2. 희망 판매 가격 설정 (Points)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    placeholder="예: 10"
                    disabled={isRegistering}
                    className="w-full bg-slate-50 border border-gray-200 focus:border-indigo-400 rounded-2xl py-3.5 pl-10 pr-12 text-sm font-extrabold focus:outline-none transition-colors"
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                    🪙
                  </div>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold font-mono">
                    P
                  </div>
                </div>
                <p className="text-[9px] text-gray-400 font-extrabold flex items-center gap-1">
                  * 거래 수수료 5%가 플랫폼에 납부되며, 정산 시 차감 후 입금됩니다.
                </p>
              </div>

              {/* 등록 단추 */}
              <button
                type="button"
                onClick={handleRegisterSticker}
                disabled={isRegistering || !selectedEmojiId || !sellPrice.trim()}
                className="w-full py-4.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-black rounded-2xl text-xs transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2 cursor-pointer"
              >
                🚀 벼룩시장에 내다팔기 등록
              </button>

            </div>

          </div>
        </div>
      )}

      {/* Toss 스타일 복사 완료 안내 다크 토스트 알림 */}
      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 animate-bounce shadow-blue-500/10">
          <div className="flex flex-col gap-1 px-5 py-3.5 rounded-2xl bg-slate-900/95 backdrop-blur-md text-white text-center shadow-2xl border border-white/10">
            <span className="text-xs md:text-sm font-bold tracking-tight">
              {toastMessage.split('!')[0]}!
            </span>
            {toastMessage.includes('!') && (
              <span className="text-[11px] text-slate-400 font-medium mt-0.5">
                {toastMessage.split('!')[1]}
              </span>
            )}
          </div>
        </div>
      )}

    </main>
  )
}
