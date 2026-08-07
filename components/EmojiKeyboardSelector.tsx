'use client'

import React, { useState, useEffect } from 'react'
import { Clipboard, ShieldCheck, AlertCircle, ShoppingCart, X, Check } from 'lucide-react'

interface Emoji {
  uuid: string
  style_type: string
  view_url: string
}

export default function EmojiKeyboardSelector({ emojis }: { emojis: Emoji[] }) {
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState<boolean>(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false)
  const [selectedEmoji, setSelectedEmoji] = useState<Emoji | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('wallet_session')
    if (stored) {
      setWalletAddress(stored)
    }

    // 지갑 세션 동적 싱크용 주기 리스너
    const interval = setInterval(() => {
      const current = localStorage.getItem('wallet_session')
      if (current !== walletAddress) {
        setWalletAddress(current)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [walletAddress])

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(40) // 40ms 미세 햅틱 진동
    }
  }

  const showToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), 2500)
  }

  // 시스템 클립보드 직접 쓰기 및 브라우저별 폴백 우회
  const copyImageToClipboard = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()

      // 안전한 복사를 위해 image/png 규격 보장
      const imageBlob = blob.type.startsWith('image/png') 
        ? blob 
        : new Blob([blob], { type: 'image/png' })

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            [imageBlob.type]: imageBlob
          })
        ])
        triggerHaptic()
        showToast('클립보드에 복사되었습니다! 메신저에 바로 붙여넣으세요 💚')
      } else {
        throw new Error('ClipboardItem API 미지원')
      }
    } catch (err) {
      console.warn('ClipboardItem 직접 쓰기 우회 폴백 활성화:', err)
      try {
        // 폴백: 이미지 주소 텍스트 복사 처리
        const absoluteUrl = window.location.origin + imageUrl
        await navigator.clipboard.writeText(absoluteUrl)
        triggerHaptic()
        showToast('클립보드 이미지 주소가 복사되었습니다! 붙여넣어 전송하세요.')
      } catch (textErr) {
        showToast('복사에 실패했습니다. 이모티콘을 길게 눌러 직접 복사/저장해 주세요.')
      }
    }
  }

  const handleEmojiTouch = async (emoji: Emoji) => {
    if (isVerifying) return

    // 1. 지갑 로그인 사전 검증
    if (!walletAddress) {
      triggerHaptic()
      showToast('⚠️ Web3 지갑 로그인이 필요한 서비스입니다.')
      return
    }

    setIsVerifying(true)

    try {
      // 2. 실시간 온체인 소유권 검증 API 호출
      const res = await fetch('/api/verify-ownership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uuid: emoji.uuid,
          wallet: walletAddress
        })
      })

      const result = await res.json()

      if (result.status === 'success' && result.hasOwnership) {
        // 검증 성공 시 클립보드 바이너리 복사 실행
        await copyImageToClipboard(emoji.view_url)
      } else {
        // 검증 실패 시 물리 햅틱 작동 후 경고 팝업 카드 표출
        triggerHaptic()
        setSelectedEmoji(emoji)
        setShowWarningModal(true)
      }
    } catch (error) {
      console.error(error)
      showToast('소유권 검증 처리 도중 오류가 발생했습니다.')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="relative w-full bg-white border border-gray-200/60 rounded-3xl p-6 shadow-xl shadow-gray-200/30">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-md font-bold flex items-center gap-2 text-gray-800">
          <span className="w-1 h-4 bg-brand-primary rounded-full"></span>
          안심 전송 키보드 보드
        </h2>
        <span className="text-[10px] font-semibold text-brand-primary bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" />
          온체인 검증 연동
        </span>
      </div>
      
      <p className="text-xs text-gray-500 mb-4">이모티콘을 터치하는 즉시 클립보드에 복사되어 카카오톡/라인 등 모바일 메신저 대화방에 붙여넣을 수 있습니다.</p>

      {/* 이모티콘 4열 터치 보드 */}
      <div className="grid grid-cols-4 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 shadow-inner">
        {emojis.length === 0 ? (
          <p className="text-[11px] text-gray-400 col-span-full text-center py-6">보관함의 이모티콘이 여기에 동기화됩니다.</p>
        ) : (
          emojis.map((emoji) => (
            <button
              key={emoji.uuid}
              type="button"
              onClick={() => handleEmojiTouch(emoji)}
              disabled={isVerifying}
              className="aspect-square flex items-center justify-center p-1 rounded-xl bg-white border border-gray-100 hover:border-brand-primary/30 transition-all duration-150 active:scale-90 shadow-sm focus:outline-none hover:shadow"
            >
              <img
                src={emoji.view_url}
                alt={emoji.style_type}
                className="w-full h-full object-contain pointer-events-none"
                loading="lazy"
              />
            </button>
          ))
        )}
      </div>

      {/* iOS 소프트 글래스모피즘 토스트 알림 */}
      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full backdrop-blur-md bg-white/90 text-gray-800 text-xs md:text-sm font-semibold shadow-xl border border-gray-200/50 flex items-center gap-1.5 animate-bounce">
          <Check className="w-4 h-4 text-emerald-500" />
          {toastMessage}
        </div>
      )}

      {/* iOS 스타일 소유권 미보유 경고 모달 */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white/95 backdrop-blur-xl border border-gray-200/60 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative">
            <button 
              type="button"
              onClick={() => setShowWarningModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center gap-4 mt-2">
              <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-md font-bold text-gray-900">이모티콘 사용 권한이 없습니다</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  선택하신 캐릭터 이모티콘은 전용 MCI NFT 소유자에게만 사용 권한이 부여됩니다. 에그버스 마켓에서 이모티콘을 구매하시겠습니까?
                </p>
              </div>
              
              <div className="w-full flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowWarningModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  나중에
                </button>
                <a
                  href="https://www.eggverse.io"
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setShowWarningModal(false)}
                  className="flex-1 py-2.5 bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10 flex items-center justify-center gap-1 active:scale-95"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  MCI NFT 구매하기
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
