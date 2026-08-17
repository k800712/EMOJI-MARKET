'use client'

import React, { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { copyImageToClipboard } from '@/utils/clipboard'
import { useConfetti } from '@/hooks/useConfetti'

interface Emoji {
  uuid: string
  style_type: string
  created_at: string
  file_path?: string
}

interface EmojiLibraryProps {
  isLoggedIn: boolean
  myEmojis: Emoji[]
  emojiSets: any[]
  activeSetIndex: number
  setActiveSetIndex: (idx: number) => void
  selectedUUIDs: Set<string>
  toggleSelectAll: () => void
  handleCardClick: (uuid: string) => void
  deleteEmoji: (uuid: string) => void
  onLoginClick: () => void
}

export default function EmojiLibrary({
  isLoggedIn,
  myEmojis,
  emojiSets,
  activeSetIndex,
  setActiveSetIndex,
  selectedUUIDs,
  toggleSelectAll,
  handleCardClick,
  deleteEmoji,
  onLoginClick,
}: EmojiLibraryProps) {
  const [copyingUuid, setCopyingUuid] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const { triggerMicroSparkle } = useConfetti()

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(60) // 60ms 통통 튀는 햅틱 피드백
    }
  }

  const handleCardTouch = async (item: Emoji, e: React.MouseEvent) => {
    if (!isLoggedIn) return
    if (copyingUuid) return

    // 1. 모바일 햅틱 피드백
    triggerHaptic()

    // 2. 복사 중 로딩 상태 활성화
    setCopyingUuid(item.uuid)

    // 3. 비동기 이미지 복사 수행
    const imageUrl = item.file_path && item.file_path.startsWith('temp_')
      ? `/assets/custom-emojis/${item.file_path}.png`
      : `/api/view?uuid=${item.uuid}`
    const success = await copyImageToClipboard(imageUrl)

    // 4. 복사 완료 연출 및 토스트 메세지 표출
    setCopyingUuid(null)

    if (success) {
      // 마이크로 스파클 파티클 효과 실행
      triggerMicroSparkle(e.clientX, e.clientY)
      setToastMessage('클립보드 복사 완료!')
      setTimeout(() => setToastMessage(null), 3000) // 3초 뒤 자동 제거
    } else {
      alert('이미지 복사에 실패했습니다. 다른 메신저로 전송해 주세요.')
    }

    // 5. 체크박스 선택 토글 연동
    handleCardClick(item.uuid)
  }

  return (
    <section className="border-t border-gray-200/80 pt-8 mt-4 relative overflow-hidden min-h-[300px]">
      {/* 1. 비로그인 상태일 때의 Blur Lock 오버레이 */}
      {!isLoggedIn && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-[6px] z-10 flex flex-col items-center justify-center p-6 text-center transition-all duration-500 ease-in-out">
          <div className="max-w-md w-full bg-white/95 border border-gray-100 rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-5 transform scale-100 animate-slide-up">
            
            {/* 🔒 잠금 애니메이션 모션 아이콘 */}
            <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shadow-inner relative animate-bounce">
              <span className="text-3xl text-blue-600 animate-pulse">🔒</span>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-md font-bold text-slate-800">나만의 비밀 보관함이 숨겨져 있어요! 🔒</h3>
              <p className="text-xs text-gray-500 leading-relaxed px-4">
                카카오로 3초 만에 로그인하시면 내가 만든 귀여운 이모티콘들을 평생 안전하게 보관하고 단톡방으로 바로 전송할 수 있습니다.
              </p>
            </div>

            <button
              type="button"
              onClick={onLoginClick}
              className="w-full max-w-xs py-4 bg-[#FEE500] hover:bg-[#F0D200] text-[#191919] font-black rounded-2xl text-xs transition-all active:scale-[0.98] shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              💛 카카오 계정으로 3초 만에 시작하기 (무료 3P 지급)
            </button>
          </div>
        </div>
      )}

      {/* 2. 보관함 헤더 영역 */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h2 className="text-md font-bold flex items-center gap-2 text-gray-800">
            <span className="w-1 h-4 bg-brand-accent rounded-full animate-pulse"></span>
            카카오 제안용 24종 고정 액자형 보관함
          </h2>
          <p className="text-xs text-gray-500 mt-1">카카오 제출 규격에 부합하는 6열 4행 보드판입니다. 드롭다운으로 세트를 선택하세요.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {emojiSets.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 font-semibold">세트 선택:</span>
              <select
                value={activeSetIndex}
                onChange={(e) => {
                  setActiveSetIndex(Number(e.target.value))
                }}
                className="text-xs bg-white border border-gray-200 rounded-xl px-3 py-2 font-semibold text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                {emojiSets.map((set, idx) => (
                  <option key={set.id} value={idx}>
                    {set.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <button 
            type="button"
            onClick={toggleSelectAll}
            className="text-xs text-brand-primary hover:text-blue-600 font-semibold px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all"
          >
            현재 세트 전체 선택/해제
          </button>
        </div>
      </div>

      {/* 3. 보관함 Grid 영역 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 p-4 bg-gray-50/50 border border-gray-100 rounded-3xl animate-fade-in min-h-[220px]">
        {isLoggedIn && myEmojis.length === 0 ? (
          /* Fallback UI: 로그인 성공하였으나 데이터가 없을 때 */
          <div className="col-span-full flex flex-col items-center justify-center gap-3 py-16 text-center text-gray-400">
            <span className="text-3xl">🐶</span>
            <p className="text-xs font-bold text-slate-700">아직 보관함이 비어있어요. 🐶</p>
            <p className="text-[10px] text-gray-400 max-w-sm leading-relaxed px-4">
              상단 업로드 창에 귀여운 사진을 올리고 나만의 첫 실사 스티커 이모티콘을 무료로 만들어 보세요!
            </p>
          </div>
        ) : (
          myEmojis.map((item) => {
            const isSelected = selectedUUIDs.has(item.uuid)
            const isCopying = copyingUuid === item.uuid

            let badgeLabel = '트렌디'
            let badgeColor = 'text-violet-600 bg-violet-50 border-violet-100'
            if (item.style_type === 'senior') {
              badgeLabel = '장년층'
              badgeColor = 'text-cyan-600 bg-cyan-50 border-cyan-100'
            } else if (item.style_type === 'office') {
              badgeLabel = '직장인'
              badgeColor = 'text-pink-600 bg-pink-50 border-pink-100'
            } else if (item.style_type === 'PREMIUM_CONCEPT') {
              badgeLabel = '프리미엄'
              badgeColor = 'text-amber-600 bg-amber-50 border-amber-100'
            }

            return (
              <div
                key={item.uuid}
                onClick={(e) => handleCardTouch(item, e)}
                className={`bg-white border rounded-2xl p-3 flex flex-col items-center gap-2 cursor-pointer transition-all duration-300 relative group active:scale-95 ${
                  isSelected 
                    ? 'ring-4 ring-blue-500 border-blue-500 bg-blue-50/20 shadow-md shadow-blue-500/5' 
                    : 'border-gray-200 bg-white hover:shadow-md'
                }`}
              >
                <div className="absolute top-2 left-2 z-20" onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    checked={isSelected}
                    onChange={() => handleCardClick(item.uuid)}
                    className="w-5 h-5 rounded-full border border-gray-300 bg-white text-brand-primary cursor-pointer accent-blue-500" 
                  />
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteEmoji(item.uuid)
                  }}
                  className="absolute top-2 right-2 z-20 p-1.5 rounded-lg bg-white/90 hover:bg-rose-50 border border-gray-200/60 hover:border-rose-200 text-gray-400 hover:text-rose-500 transition-all shadow-sm"
                  title="이모티콘 삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                
                <div className="w-full aspect-square bg-gray-50 rounded-xl overflow-hidden relative flex items-center justify-center border border-gray-100">
                  {isCopying && (
                    /* 복사 로딩 표시 스피너 */
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                      <div className="w-6 h-6 rounded-full border-2 border-brand-primary border-t-transparent animate-spin"></div>
                    </div>
                  )}
                  <img 
                    src={item.file_path && item.file_path.startsWith('temp_') ? `/assets/custom-emojis/${item.file_path}.png` : `/api/view?uuid=${item.uuid}`} 
                    alt="Sticker"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
                
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${badgeColor}`}>
                  {badgeLabel}
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {item.created_at ? item.created_at.substring(0, 10) : ''}
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* Toss 스타일 복사 완료 안내 다크 토스트 알림 */}
      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-2xl bg-slate-900/95 backdrop-blur-md text-white text-xs font-semibold shadow-2xl border border-white/10 flex flex-col items-center gap-1.5 animate-bounce shadow-blue-500/10">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">💬</span>
            <span className="font-bold text-sm text-white">클립보드 복사 완료!</span>
          </div>
          <span className="text-[10px] text-gray-400 font-medium">카카오톡 대화창을 꾹 눌러 '붙여넣기' 하시면 즉시 전송할 수 있습니다.</span>
        </div>
      )}
    </section>
  )
}
