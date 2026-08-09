import React from 'react'
import { X } from 'lucide-react'

export interface TermsModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'tos' | 'privacy'
}

export default function TermsModal({ isOpen, onClose, type }: TermsModalProps) {
  if (!isOpen) return null

  const isTos = type === 'tos'
  const title = isTos ? '서비스 이용약관' : '개인정보처리방침'

  return (
    <div className="fixed inset-0 bg-[#191919]/60 backdrop-blur-md flex items-center justify-center z-[999] p-4 transition-all duration-300 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full max-h-[80vh] shadow-2xl relative border border-gray-100 flex flex-col transform scale-100 transition-all duration-500 animate-slide-up">
        
        {/* 닫기 버튼 */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 헤더 */}
        <div className="mb-4 pr-10">
          <h3 className="text-lg font-black text-gray-900">{title}</h3>
          <p className="text-[10px] text-gray-400 mt-1">공고일자: 2026년 8월 9일 / 시행일자: 2026년 8월 9일</p>
        </div>

        {/* 본문 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto text-xs text-gray-600 space-y-4 pr-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
          {isTos ? (
            <>
              <div>
                <h4 className="font-extrabold text-gray-800 mb-1">제 1 조 (목적)</h4>
                <p className="leading-relaxed">본 약관은 에임하이(AimHigh)(이하 "회사")가 제공하는 '에임하이 이모지 마켓' 서비스(이하 "서비스")의 이용 조건 및 절차, 회사와 회원 간의 권리와 의무 및 책임 사항을 규정함을 목적으로 합니다.</p>
              </div>
              <div>
                <h4 className="font-extrabold text-gray-800 mb-1">제 2 조 (용어의 정의)</h4>
                <p className="leading-relaxed">1. "회원"이란 회사 서비스에 가입하여 본 약관에 동의하고 서비스를 이용하는 자를 의미합니다.<br />
                2. "포인트(Points)"란 서비스 내 이모지 제작, P2P 거래 등에서 화폐 대용으로 사용되는 가상 포인트를 뜻합니다.<br />
                3. "가상 지갑 주소"란 카카오 ID 또는 이더리움 주소에 1:1 결정론적으로 매핑되어 포인트 및 디지털 자산을 보관하는 식별 주소를 말합니다.</p>
              </div>
              <div>
                <h4 className="font-extrabold text-gray-800 mb-1">제 3 조 (가입 및 계약의 성립)</h4>
                <p className="leading-relaxed">회원가입은 이용자가 본 약관 및 개인정보처리방침에 동의하고 카카오 간편 가입 또는 외부 Web3 지갑 주소를 연결함으로써 성립하며, 가입 즉시 가입 웰컴 포인트(3 P)가 계정에 지급됩니다.</p>
              </div>
              <div>
                <h4 className="font-extrabold text-gray-800 mb-1">제 4 조 (서비스의 범위 및 포인트 제도)</h4>
                <p className="leading-relaxed">1. 회사는 AI 기반의 이모티콘 일러스트 및 마이펫 스티커 생성 기능을 제공합니다.<br />
                2. 회원은 포인트를 사용하여 이미지를 생성하거나 플랫폼 내 P2P 마켓을 이용해 자신이 제작한 이모티콘을 사고팔 수 있습니다.<br />
                3. 추천인(레퍼럴) 시스템을 통하여 친구 초대 시 신규 가입자에게 추가 1 P, 기존 초대자에게 2 P가 실시간 지급되며, 어뷰징 방지를 위해 일일 최대 10 P(5명 초대분), 누적 최대 100 P로 적립이 제한됩니다.</p>
              </div>
              <div>
                <h4 className="font-extrabold text-gray-800 mb-1">제 5 조 (P2P 거래 및 정산 수수료 정책)</h4>
                <p className="leading-relaxed">1. 회원 간 이모티콘 거래 완료 시, 거래액의 5%에 해당하는 금액이 플랫폼 거래 수수료(Platform Fee)로 공제(원미만 반올림)된 후 판매 유저에게 정산 지급됩니다.<br />
                2. 거래 성사 즉시 데이터베이스 상의 소유권 정보(owner_wallet)가 Atomic하게 변경되며, 이중 지불 방지를 위해 잠금 처리가 적용됩니다.</p>
              </div>
              <div>
                <h4 className="font-extrabold text-gray-800 mb-1">제 6 조 (지식재산권 및 환불)</h4>
                <p className="leading-relaxed">1. 서비스에서 생성된 이모지 이미지의 상업적 이용 및 가상 소유권은 소유한 회원에게 영구 귀속됩니다.<br />
                2. AI 이미지 생성 및 마이펫 합성 등 포인트가 소모된 서비스는 즉각적인 디지털 자산 생산이 완료된 것으로 취급되므로, 단순 변심에 의한 환불이 불가능합니다.</p>
              </div>
              <div>
                <h4 className="font-extrabold text-gray-800 mb-1">제 7 조 (면책조항 및 관할법원)</h4>
                <p className="leading-relaxed">1. 회사는 천재지변, 블록체인 네트워크 장애, 외부 Supabase 또는 AI API 인프라 점검 등의 사유로 서비스를 제공할 수 없는 경우 책임이 면제됩니다.<br />
                2. 회사와 회원 간 발생한 분쟁에 대해서는 회사의 본점 소재지를 관할하는 법원을 전합 관할법원으로 합니다.</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <h4 className="font-extrabold text-gray-800 mb-1">제 1 조 (수집하는 개인정보 항목 및 수집방법)</h4>
                <p className="leading-relaxed">회사는 서비스 이용을 위해 최초 로그인 시점 또는 회원가입 시점에 다음과 같은 최소한의 개인정보를 수집합니다.<br />
                - **수집 항목**: 카카오 고유 ID (카카오 로그인 시), 닉네임, 가상 지갑 주소, 포인트 거래 이력, 이모지 생성 이력<br />
                - **수집 방법**: 모바일 웹/앱을 통한 로그인 연동 및 API 호출 로그 생성</p>
              </div>
              <div>
                <h4 className="font-extrabold text-gray-800 mb-1">제 2 조 (개인정보의 수집 및 이용 목적)</h4>
                <p className="leading-relaxed">회사는 수집한 정보를 다음의 목적을 위해 활용합니다.<br />
                1. 회원 관리 및 식별: 카카오 간편 가입 계정을 통한 가상 이더리움 지갑 주소 결정론적 매핑 및 복구 제공.<br />
                2. 서비스 제공 및 정산: 포인트 충전, AI 이미지 생성, 마켓 내 P2P 소유권 거래 내역 관리 및 수수료 정산.<br />
                3. 부정 이용 방지: 동일 단말/IP 대역을 이용한 다계정 리워드 포인트 어뷰징(부정 수급) 모니터링 및 블랙리스트 자동 제재 시스템 가동.</p>
              </div>
              <div>
                <h4 className="font-extrabold text-gray-800 mb-1">제 3 조 (개인정보의 보유 및 이용 기간)</h4>
                <p className="leading-relaxed">회원의 개인정보는 원칙적으로 **회원 탈퇴 시 또는 서비스 종료 시까지 보유**하며 목적 달성 즉시 복구 불가능한 방법으로 파기합니다.<br />
                단, 관계 법령(전자상거래법 등)의 규정에 의하여 보존할 필요가 있는 경우 아래의 기한 동안 보관합니다.<br />
                - 계약 또는 청약철회 등에 관한 기록: 5년 / 소비자의 불만 또는 분쟁처리에 관한 기록: 3년</p>
              </div>
              <div>
                <h4 className="font-extrabold text-gray-800 mb-1">제 4 조 (개인정보의 제3자 제공)</h4>
                <p className="leading-relaxed">회사는 정보주체의 동의가 있거나 관계 법령에 규정된 경우를 제외하고는 수집 목적 범위를 초과하여 회원의 개인정보를 제3자에게 임의로 제공하지 않습니다.</p>
              </div>
              <div>
                <h4 className="font-extrabold text-gray-800 mb-1">제 5 조 (정보주체의 권리와 행사방법)</h4>
                <p className="leading-relaxed">회원은 언제든지 회사에 대해 개인정보 열람 요구, 오류 등의 정정 요구, 삭제 요구, 처리 정지 요구 등의 권리를 행사할 수 있으며, 로그인 드롭다운 메뉴를 통해 회원 본인의 지갑 정보 및 포인트 명세를 실시간 조회할 수 있습니다.</p>
              </div>
              <div>
                <h4 className="font-extrabold text-gray-800 mb-1">제 6 조 (개인정보보호 책임자 및 연락처)</h4>
                <p className="leading-relaxed">회사의 개인정보보호 책임자는 에임하이(AimHigh) 대표자이며, 개인정보 관련 문의사항이나 불만 처리는 사이트 하단 어드민 경보 채널 또는 웹 서비스 창구를 통해 신속히 답변받으실 수 있습니다.</p>
              </div>
            </>
          )}
        </div>

        {/* 푸터 확인 단추 */}
        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-black transition-all active:scale-[0.97] cursor-pointer"
          >
            확인
          </button>
        </div>

      </div>
    </div>
  )
}
