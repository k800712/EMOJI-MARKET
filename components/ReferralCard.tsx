'use client'

import React, { useState, useEffect } from 'react'
import { Copy, Gift, UserPlus, Check } from 'lucide-react'

interface ReferralCardProps {
  walletAddress: string
  referralCode: string // 본인 추천 코드
  referredBy: string | null // 추천인 등록 여부
  onReferralSuccess: (newPoints: number) => void // 포인트 리프레시용 콜백
}

export default function ReferralCard({
  walletAddress,
  referralCode,
  referredBy,
  onReferralSuccess,
}: ReferralCardProps) {
  const [inputCode, setInputCode] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // 햅틱 진동 피드백
  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(60)
    }
  }

  // Toast 알림 띄우기
  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // 카카오 JS SDK 동적 로드 및 초기화
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const initKakao = () => {
      const Kakao = (window as any).Kakao
      if (Kakao && !Kakao.isInitialized()) {
        // 실제 카카오 앱 키 또는 임의의 가상 앱 키를 활용
        Kakao.init('d4b68e9e1c2763f03cb78fa5e6e32bc0')
      }
    }

    if ((window as any).Kakao) {
      initKakao()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://t1.kakaocdn.net/kakao_js_sdk_v2/2.7.1/kakao.min.js'
    script.async = true
    script.onload = initKakao
    document.head.appendChild(script)
  }, [])

  // 내 추천인 코드 복사
  const copyMyCode = async () => {
    triggerHaptic()
    if (!referralCode) {
      showToast('추천 코드를 불러오는 중입니다.')
      return
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(referralCode)
        showToast('📋 추천 코드 복사 완료!')
      } else {
        throw new Error('Clipboard API not supported')
      }
    } catch (e) {
      showToast('🔗 복사 실패. 추천 코드: ' + referralCode)
    }
  }

  // 추천인 적용 요청 API 실행
  const submitReferralCode = async () => {
    if (!inputCode.trim()) {
      alert('추천인 코드를 입력해 주세요!')
      return
    }
    
    try {
      setIsSubmitting(true)
      const response = await fetch('/api/auth/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          referralCode: inputCode.trim()
        })
      })

      const data = await response.json()
      if (data.status === 'success') {
        triggerHaptic()
        showToast('🎁 추천 보너스 1P 적립 완료!')
        onReferralSuccess(data.newPoints)
        setInputCode('')
      } else {
        alert(data.message || '추천 코드 등록에 실패했습니다.')
      }
    } catch (err) {
      console.error('Failed to submit referral code:', err)
      alert('서버와의 통신에 에러가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 카카오톡 초대 카드 전송
  const shareViaKakao = () => {
    triggerHaptic()
    if (!referralCode) return

    const shareUrl = `${window.location.origin}?ref=${referralCode}`
    const title = '[초대장] 🐶 식빵이네 이모지 마켓 초대장!'
    const description = `내 사진으로 3초 만에 카카오톡 이모티콘 세트 만들기! 지금 추천 코드 [${referralCode}] 입력하고 무료 생성용 웰컴 4P 팩을 즉시 수령하세요!`
    const imageUrl = 'https://zjkpzztludhnmjaamvmb.supabase.co/storage/v1/object/public/emojis/temp_1786176654479.png'

    const Kakao = (window as any).Kakao
    if (Kakao && Kakao.isInitialized()) {
      try {
        Kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: title,
            description: description,
            imageUrl: imageUrl,
            link: {
              mobileWebUrl: shareUrl,
              webUrl: shareUrl,
            },
          },
          buttons: [
            {
              title: '웰컴 4P 받고 시작하기',
              link: {
                mobileWebUrl: shareUrl,
                webUrl: shareUrl,
              },
            },
          ],
        })
      } catch (err) {
        console.error('Failed to send Kakao Share:', err)
        navigator.clipboard.writeText(`${title}\n${description}\n링크: ${shareUrl}`)
        showToast('🔗 카톡 공유 링크가 복사되었습니다!')
      }
    } else {
      navigator.clipboard.writeText(`${title}\n${description}\n링크: ${shareUrl}`)
      showToast('🔗 카톡 공유 링크가 복사되었습니다! 친구 대화방에 붙여넣어 주세요.')
    }
  }

  return (
    <div className="bg-white/80 backdrop-blur-md border border-indigo-100 rounded-3xl p-6 shadow-xl shadow-indigo-100/10 space-y-6 relative overflow-hidden">
      
      {/* 백그라운드 그라데이션 광 효과 */}
      <div className="absolute -top-12 -right-12 w-28 h-28 bg-indigo-400/10 rounded-full blur-2xl pointer-events-none"></div>
      
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100">
          <Gift className="text-indigo-600 w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-800">친구와 함께 꿀포인트 빨자! 🎁</h3>
          <p className="text-[10px] text-indigo-500 font-extrabold mt-0.5">하루 최대 10P(5명) / 누적 최대 100P 한도 지원</p>
        </div>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">
        친구가 내 추천인 코드로 가입하면 **나에게는 2P, 친구에게는 보너스 1P**가 즉시 충전됩니다! 단톡방이나 인스타그램 스토리에 소문을 퍼뜨리세요.
      </p>

      {/* 내 추천 코드 배지 영역 */}
      <div className="border-dashed border-2 border-indigo-400 bg-indigo-50/50 rounded-2xl p-4 text-center flex flex-col items-center justify-center gap-2 relative">
        <span className="text-[10px] font-extrabold text-indigo-500">내 전용 추천인 코드</span>
        <div className="flex items-center gap-2.5">
          <span className="text-xl font-black text-amber-500 tracking-wider font-mono">{referralCode || '------'}</span>
          <button
            type="button"
            onClick={copyMyCode}
            className="p-1.5 rounded-lg bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-500 transition-colors shadow-sm cursor-pointer"
            title="추천 코드 복사"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 추천인 코드 입력창 (신규 유저인 경우에만 렌더링) */}
      {!referredBy ? (
        <div className="bg-gray-50 border border-gray-150 rounded-2xl p-4 space-y-3">
          <span className="text-[10px] font-extrabold text-gray-400 block">초대받은 추천 코드 입력</span>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="예: EMOJ1A"
              disabled={isSubmitting}
              className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold tracking-wider focus:outline-none focus:border-indigo-400 transition-colors"
            />
            <button
              type="button"
              onClick={submitReferralCode}
              disabled={isSubmitting || !inputCode.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              등록
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between text-emerald-800">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <span className="text-xs font-black">추천인 혜택 적용 완료!</span>
          </div>
          <span className="text-[10px] font-semibold text-emerald-600 font-mono">referrer 매핑 완료</span>
        </div>
      )}

      {/* 카카오톡 공유 통합 단추 */}
      <button
        type="button"
        onClick={shareViaKakao}
        disabled={!referralCode}
        className="w-full py-4.5 bg-[#FEE500] hover:bg-[#F0D200] text-[#191919] font-black rounded-2xl text-xs transition-all active:scale-[0.98] shadow-lg shadow-yellow-500/10 flex items-center justify-center gap-2 cursor-pointer"
      >
        💬 카카오톡 친구 초대하고 2P씩 충전받기 (보너스 지급)
      </button>

      {/* Toss 스타일 모던 플로팅 알림 토스트 */}
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

    </div>
  )
}
