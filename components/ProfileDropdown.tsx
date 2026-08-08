'use client'

import React, { useState, useEffect } from 'react'
import { Copy, Share2, LogOut, Coins, Wallet, Gift, Check } from 'lucide-react'

interface ProfileDropdownProps {
  walletAddress: string
  nickname: string
  points: number
  referralCode: string
  onLogout: () => void
  onRechargeClick: () => void
}

export default function ProfileDropdown({
  walletAddress,
  nickname,
  points,
  referralCode,
  onLogout,
  onRechargeClick
}: ProfileDropdownProps) {
  const [copiedWallet, setCopiedWallet] = useState(false)
  const [copiedReferral, setCopiedReferral] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(60)
    }
  }

  // 1. 지갑 주소 마스킹 처리
  const maskAddress = (addr: string) => {
    if (!addr) return ''
    if (addr.length <= 10) return addr
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`
  }

  // 2. 가상 지갑 주소 복사
  const handleCopyWallet = async () => {
    triggerHaptic()
    try {
      await navigator.clipboard.writeText(walletAddress)
      setCopiedWallet(true)
      showToast('지갑 주소가 복사되었습니다!')
      setTimeout(() => setCopiedWallet(false), 2000)
    } catch (err) {
      showToast('주소 복사에 실패했습니다.')
    }
  }

  // 3. 추천인 코드 복사
  const handleCopyReferral = async () => {
    triggerHaptic()
    try {
      await navigator.clipboard.writeText(referralCode)
      setCopiedReferral(true)
      showToast('추천 코드가 복사되었습니다!')
      setTimeout(() => setCopiedReferral(false), 2000)
    } catch (err) {
      showToast('추천 코드 복사에 실패했습니다.')
    }
  }

  // 4. 친구 초대 링크 공유
  const handleShareInvite = () => {
    triggerHaptic()
    if (typeof window === 'undefined') return
    const inviteUrl = `${window.location.origin}?ref=${referralCode}`
    
    if (navigator.share) {
      navigator.share({
        title: '식빵이 이모지 마켓 초대',
        text: `친구 초대 코드 [${referralCode}] 입력하고 웰컴 보너스 포인트를 받아보세요!`,
        url: inviteUrl,
      }).catch(console.error)
    } else {
      navigator.clipboard.writeText(inviteUrl)
      showToast('초대 링크가 복사되었습니다! 친구에게 보내보세요.')
    }
  }

  const showToast = (msg: string) => {
    setToastMessage(msg)
  }

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000)
      return () => clearInterval(timer)
    }
  }, [toastMessage])

  return (
    <div className="absolute right-0 mt-3 w-80 bg-white/95 backdrop-blur-md border border-slate-100 rounded-3xl p-5 shadow-2xl z-50 text-slate-800 animate-fade-in font-sans">
      
      {/* 닉네임 & 아바타 프로필 정보 */}
      <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
        <div className="w-11 h-11 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-lg font-black shadow-inner">
          🍞
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-extrabold text-sm text-slate-900 truncate leading-snug">{nickname || '식빵냥'}</h4>
          <span className="text-[10px] font-bold text-slate-400 block mt-0.5">MCI 이모지 멤버십 유저</span>
        </div>
      </div>

      {/* 포인트 정보 카드 */}
      <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/30 border border-indigo-100/50 rounded-2xl p-3.5 my-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-indigo-500 animate-pulse" />
          <span className="text-xs font-black text-slate-700">현재 보유 포인트</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-black text-indigo-600">{points} P</span>
          <button
            type="button"
            onClick={onRechargeClick}
            className="text-[10px] font-black bg-indigo-600 text-white px-2 py-1 rounded-lg hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer"
          >
            충전
          </button>
        </div>
      </div>

      {/* 가상 지갑 주소 영역 */}
      <div className="space-y-1.5 my-4">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <Wallet className="w-3 h-3 text-slate-400" />
          마이 가상 Web3 지갑
        </span>
        <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl p-2.5">
          <span className="text-[11px] font-bold text-slate-600 font-mono tracking-tight">{maskAddress(walletAddress)}</span>
          <button
            type="button"
            onClick={handleCopyWallet}
            className="p-1.5 hover:bg-slate-200/50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors active:scale-90"
            title="지갑 주소 복사"
          >
            {copiedWallet ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 추천인 코드 및 카톡 공유 영역 */}
      <div className="space-y-1.5 my-4">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <Gift className="w-3 h-3 text-slate-400" />
          초대 코드 보상 혜택
        </span>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center justify-between bg-indigo-50/30 border border-indigo-100/50 rounded-xl p-2.5">
            <span className="text-[11px] font-black text-indigo-600 tracking-wider font-mono">{referralCode || 'DUMMY'}</span>
            <button
              type="button"
              onClick={handleCopyReferral}
              className="p-1.5 hover:bg-indigo-100/30 rounded-lg text-indigo-400 hover:text-indigo-600 transition-colors active:scale-90"
              title="추천 코드 복사"
            >
              {copiedReferral ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <button
            type="button"
            onClick={handleShareInvite}
            className="bg-yellow-100 hover:bg-yellow-200/80 border border-yellow-200/50 p-2.5 rounded-xl text-yellow-800 transition-all active:scale-95 cursor-pointer flex items-center justify-center"
            title="초대장 링크 공유"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 로그아웃 버튼 */}
      <div className="border-t border-slate-50 pt-3.5 mt-2 flex justify-center">
        <button
          type="button"
          onClick={() => {
            triggerHaptic()
            onLogout()
          }}
          className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
        >
          <LogOut className="w-3 h-3" />
          <span>안전하게 로그아웃</span>
        </button>
      </div>

      {/* 내부 플로팅 미니 토스트 알림 */}
      {toastMessage && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-[10px] px-3.5 py-1.5 rounded-full font-bold shadow-lg shadow-indigo-950/20 border border-white/5 animate-bounce">
          {toastMessage}
        </div>
      )}

    </div>
  )
}
