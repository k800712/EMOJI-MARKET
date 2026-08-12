'use client'

import React from 'react'

interface CelebrationModalProps {
  isOpen: boolean
  onConfirm: () => void
  unreadCount: number
}

export default function CelebrationModal({ isOpen, onConfirm, unreadCount }: CelebrationModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md transition-opacity duration-300">
      <div className="relative mx-4 w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl text-center text-white">
        
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 opacity-30 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 opacity-20 blur-2xl pointer-events-none" />

        <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-yellow-400 to-amber-500 shadow-lg shadow-amber-500/20 text-4xl">
          🍞
        </div>

        <h2 className="relative mb-3 text-2xl font-extrabold tracking-tight text-yellow-200">
          축하합니다! 완공 완료! 🎉
        </h2>
        
        <p className="relative mb-6 text-sm leading-relaxed text-gray-200">
          요청하신 <strong className="text-yellow-300 font-bold">{unreadCount}종</strong>의 식빵이 이모지 제작이<br />
          성공적으로 완료되어 마이룸 보관함에 구워졌습니다!
        </p>

        <button
          onClick={onConfirm}
          className="relative w-full py-4 rounded-xl font-bold text-sm tracking-wide bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 active:scale-[0.98] transition-all shadow-lg shadow-amber-500/25 text-neutral-900 focus:outline-none"
        >
          🎁 보관함에서 확인하기
        </button>

      </div>
    </div>
  )
}
