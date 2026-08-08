'use client'

import React, { useState, useEffect } from 'react'
import { Coins } from 'lucide-react'

interface AnimatedPointsBadgeProps {
  points: number
  delta: number
}

// 개별 자릿수를 도르륵 굴려주는 오도미터 컬럼 컴포넌트
function OdometerDigit({ value }: { value: number }) {
  return (
    <span className="inline-block h-6 overflow-hidden relative w-[0.6em] font-black text-slate-800 leading-6 text-center select-none">
      <span 
        className="flex flex-col transition-transform duration-300 ease-out absolute left-0 w-full"
        style={{ transform: `translateY(-${value * 24}px)` }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <span key={n} className="h-6 leading-6 text-center select-none font-black text-slate-800">{n}</span>
        ))}
      </span>
    </span>
  )
}

export default function AnimatedPointsBadge({ points, delta }: AnimatedPointsBadgeProps) {
  const [activeDelta, setActiveDelta] = useState<number | null>(null)
  const [key, setKey] = useState<number>(0) // 델타 배지 렌더링 리셋용 키

  // 포인트 숫자를 개별 자릿수 배열로 변환
  const digits = String(points).split('').map(Number)

  useEffect(() => {
    if (delta === 0) return

    // 1. 햅틱 진동 피드백 (포인트 증가 시)
    if (delta > 0 && typeof window !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([30, 50])
    }

    // 2. 델타 배지 트리거
    setActiveDelta(delta)
    setKey((prev) => prev + 1)

    // 3. 1초 뒤 배지 제거
    const timer = setTimeout(() => {
      setActiveDelta(null)
    }, 1000)

    return () => clearTimeout(timer)
  }, [points, delta])

  return (
    <div className="relative inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-800 px-3 py-1.5 rounded-2xl text-xs font-extrabold border border-amber-200/60 shadow-sm shadow-amber-500/5 select-none">
      
      {/* 캡슐화 스타일 주입 */}
      <style>{`
        @keyframes floatUpFade {
          0% {
            transform: translate(-50%, 0) scale(0.8);
            opacity: 0;
          }
          20% {
            transform: translate(-50%, -15px) scale(1.1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -35px) scale(0.9);
            opacity: 0;
          }
        }
        @keyframes floatDownFade {
          0% {
            transform: translate(-50%, 0) scale(0.8);
            opacity: 0;
          }
          20% {
            transform: translate(-50%, 15px) scale(1.1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, 35px) scale(0.9);
            opacity: 0;
          }
        }
        .animate-float-up-fade {
          animation: floatUpFade 1s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
        }
        .animate-float-down-fade {
          animation: floatDownFade 1s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
        }
      `}</style>

      {/* 골드 코인 아이콘 */}
      <Coins className="w-4 h-4 text-amber-500 animate-spin" style={{ animationDuration: '3s' }} />

      {/* 도르륵 오도미터 숫자 영역 */}
      <div className="flex items-center h-6 leading-6 select-none bg-transparent">
        {digits.map((digit, idx) => (
          <OdometerDigit key={`${idx}-${digit}`} value={digit} />
        ))}
        <span className="ml-0.5 text-slate-700 font-extrabold select-none">P</span>
      </div>

      {/* 플로팅 델타 배지 공중 부양 */}
      {activeDelta !== null && (
        <div
          key={key}
          className={`absolute left-1/2 -translate-x-1/2 font-black text-[10px] px-2 py-0.5 rounded-full shadow-md z-30 select-none ${
            activeDelta > 0
              ? 'bg-emerald-500 text-white animate-float-up-fade border border-emerald-400'
              : 'bg-orange-500 text-white animate-float-down-fade border border-orange-400'
          }`}
          style={{ top: activeDelta > 0 ? '-10px' : '20px' }}
        >
          {activeDelta > 0 ? `+${activeDelta} P 🎉` : `${activeDelta} P ⚡`}
        </div>
      )}

    </div>
  )
}
