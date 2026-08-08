'use client';

import React, { useState, useEffect } from 'react';
import { useConfetti } from '@/hooks/useConfetti';
import { ShieldCheck } from 'lucide-react';

interface Emoji {
  id: string | number;
  uuid?: string;
  file_path: string; // 이모티콘 이미지 CDN 또는 스토리지 URL
  style_type?: string;
}

interface EmojiKeyboardSelectorProps {
  emojis: Emoji[];
  isLoggedIn: boolean;
}

export default function EmojiKeyboardSelector({ emojis, isLoggedIn }: EmojiKeyboardSelectorProps) {
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false,
  });
  const [copyingId, setCopyingId] = useState<string | number | null>(null);
  const { triggerMicroSparkle } = useConfetti();

  // 햅틱 진동 피드백 유틸리티
  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(60); // 60ms의 쫀득한 네이티브 터치 진동
    }
  };

  // 비동기 이미지 복사 실행 (CORS 및 iOS 사파리 비동기 이슈 대응)
  const copyImageToClipboard = async (imageUrl: string, emojiId: string | number, x: number, y: number) => {
    if (copyingId) return; // 연속 클릭 방지
    setCopyingId(emojiId);

    // 1. 브라우저 지원 여부 즉시 검증
    if (typeof window === 'undefined' || !navigator.clipboard || !window.ClipboardItem) {
      showToast('⚠️ 현재 브라우저 환경에서는 원터치 복사가 지원되지 않습니다. 사파리/크롬 브라우저를 이용해 주세요.');
      setCopyingId(null);
      return;
    }

    try {
      // iOS 사파리의 비동기 클립보드 쓰기 보안 제약 우회 적용
      // ClipboardItem 생성 시 직접 fetch 함수를 Promise 형태로 전달하여 동기적 제약 조건을 만족시킵니다.
      await navigator.clipboard.write([
        new window.ClipboardItem({
          'image/png': (async () => {
            const response = await fetch(imageUrl, {
              mode: 'cors', // Storage 버킷 CORS 대응 필수
              cache: 'no-cache',
            });
            if (!response.ok) throw new Error('Image fetch failed');
            return await response.blob();
          })()
        })
      ]);

      // 성공 처리
      triggerHaptic();
      triggerMicroSparkle(x, y);
      showToast('💬 클립보드 복사 완료! 카톡 대화창을 꾹 눌러 "붙여넣기" 해보세요.');
    } catch (err) {
      console.error('Image copying to clipboard failed:', err);
      // 폴백 가이드 제공 (URL 복사 유도)
      try {
        await navigator.clipboard.writeText(imageUrl);
        showToast('🔗 이미지 링크가 복사되었습니다. 사파리/크롬 권한을 켜시면 이모티콘 본체가 복사됩니다!');
      } catch (fallbackErr) {
        showToast('⚠️ 복사에 실패했습니다. 브라우저 설정에서 클립보드 권한을 확인해 주세요.');
      }
    } finally {
      setCopyingId(null);
    }
  };

  const showToast = (message: string) => {
    setToast({ message, visible: true });
  };

  // 토스트 자동 숨김 타이머
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

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

      {/* 이모티콘 4열 터치 보드 그리드 영역 */}
      <div className="grid grid-cols-4 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 shadow-inner">
        {emojis.length === 0 ? (
          <p className="text-[11px] text-gray-400 col-span-full text-center py-6">보관함의 이모티콘이 여기에 동기화됩니다.</p>
        ) : (
          emojis.map((emoji) => (
            <button
              key={emoji.id}
              onClick={(e) => {
                if (!isLoggedIn) {
                  showToast('🔒 로그인이 완료되면 이모티콘 전송이 활성화됩니다!');
                  triggerHaptic();
                  return;
                }
                copyImageToClipboard(emoji.file_path, emoji.id, e.clientX, e.clientY);
              }}
              disabled={copyingId !== null}
              className={`group relative aspect-square flex items-center justify-center p-2 rounded-2xl bg-white border border-gray-100 transition-all duration-200 active:scale-95 hover:border-brand-primary/30 focus:outline-none shadow-sm hover:shadow ${
                copyingId === emoji.id ? 'animate-pulse bg-blue-50/30 border-blue-200' : ''
              }`}
            >
              <img
                src={emoji.file_path}
                alt={emoji.style_type || 'My Emoji'}
                className="w-full h-full object-contain pointer-events-none transition-transform group-hover:scale-110 duration-200"
              />
              {/* 복사 중 오버레이 플레이스홀더 */}
              {copyingId === emoji.id && (
                <div className="absolute inset-0 bg-white/70 rounded-2xl flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 text-brand-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              )}
            </button>
          ))
        )}
      </div>

      {/* 토스(Toss) 스타일 모던 플로팅 알림 토스트 */}
      {toast.visible && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 animate-bounce shadow-blue-500/10">
          <div className="flex flex-col gap-1 px-5 py-3.5 rounded-2xl bg-slate-900/95 backdrop-blur-md text-white text-center shadow-2xl border border-white/10">
            <span className="text-xs md:text-sm font-bold tracking-tight">
              {toast.message.split('!')[0]}!
            </span>
            {toast.message.includes('!') && (
              <span className="text-[11px] text-slate-400 font-medium mt-0.5">
                {toast.message.split('!')[1]}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
