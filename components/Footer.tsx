import React, { useState } from 'react'
import TermsModal from './TermsModal'

export default function Footer() {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'tos' | 'privacy'>('tos')

  const openTerms = (type: 'tos' | 'privacy') => {
    setModalType(type)
    setModalOpen(true)
  }

  return (
    <footer className="border-t border-gray-200/80 py-8 bg-white text-center text-xs text-gray-400">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        
        {/* 상단 약관 및 방침 링크 */}
        <div className="flex justify-center items-center gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => openTerms('tos')}
            className="hover:text-gray-600 transition-colors cursor-pointer"
          >
            서비스 이용약관
          </button>
          <span className="text-gray-200">|</span>
          <button
            type="button"
            onClick={() => openTerms('privacy')}
            className="text-indigo-600 hover:text-indigo-800 font-bold transition-colors cursor-pointer"
          >
            개인정보처리방침
          </button>
        </div>

        {/* 하단 에임하이 사업자 정보 */}
        <div className="text-[10px] text-gray-400 leading-relaxed max-w-2xl mx-auto space-y-1">
          <p>
            상호명: <b>에임하이(AimHigh)</b> &nbsp;|&nbsp; 대표: <b>김민성</b> &nbsp;|&nbsp; 사업자등록번호: <b>150-04-03407</b>
          </p>
          <p>
            업태: <b>정보통신업</b> &nbsp;|&nbsp; 업종: <b>응용소프트웨어 개발 및 공급업</b>
          </p>
          <p className="pt-2 font-mono text-[9px]">
            &copy; 2026 에임하이. All rights reserved. &nbsp;|&nbsp; <span className="text-brand-primary/80">BUILD FOR KAKAO EMOTICON SPEC</span>
          </p>
        </div>

      </div>

      {/* 공통 약관 조회 팝업 모달 */}
      <TermsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        type={modalType}
      />
    </footer>
  )
}
