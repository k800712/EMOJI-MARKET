'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Wallet, MessageCircle, ShieldAlert, Cpu, CheckCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [isConnecting, setIsConnecting] = useState(false)
  const [tosChecked, setTosChecked] = useState(false)
  const [privacyChecked, setPrivacyChecked] = useState(false)

  // 마운트 시 로컬스토리지에 지갑 주소가 있으면 대시보드로 즉각 리다이렉트
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const wallet = localStorage.getItem('wallet_session')
      if (wallet) {
        router.push('/pet-sticker')
      }
    }
  }, [router])

  // 카카오 OAuth 2.0 인가 로그인 리다이렉트 실행
  const connectKakaoRealOAuth = () => {
    if (!tosChecked || !privacyChecked) {
      alert('필수 이용약관 및 개인정보 처리방침에 동의해 주세요.')
      return
    }
    const client_id = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID || 'c1206f4777e1bf356c39a04a37b3f9ff'
    const redirect_uri = process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI || `${window.location.origin}/api/auth/kakao/callback`

    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}`
    window.location.href = kakaoAuthUrl
  }

  // Web3 지갑 로그인 연동 처리
  const connectWallet = async () => {
    if (!tosChecked || !privacyChecked) {
      alert('필수 이용약관 및 개인정보 처리방침에 동의해 주세요.')
      return
    }
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      alert('MetaMask 등 Web3 지갑 연동 환경이 감지되지 않았습니다. 지갑이 내장된 브라우저나 확장 프로그램 환경에서 접속해 주세요.')
      return
    }

    setIsConnecting(true)
    try {
      const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' })
      const address = accounts[0]
      if (!address) {
        throw new Error('연결된 지갑 주소가 존재하지 않습니다.')
      }

      // 백엔드 인증용 Nonce 요청
      const nonceRes = await fetch(`/api/auth/nonce?address=${address}`)
      const nonceData = await nonceRes.json()

      if (nonceData.status !== 'success' || !nonceData.nonce) {
        throw new Error(nonceData.message || '임시 서명 메시지 발급 실패')
      }

      const nonceMessage = nonceData.nonce

      // 메타마스크에 personal_sign 서명 요구
      const signature = await (window as any).ethereum.request({
        method: 'personal_sign',
        params: [nonceMessage, address],
      })

      // 서명 검증 및 세션 수립
      const loginRes = await fetch('/api/auth/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: address,
          signature: signature,
          nonce: nonceMessage
        })
      })

      const loginData = await loginRes.json()
      if (loginData.status === 'success') {
        localStorage.setItem('wallet_session', address)
        document.cookie = `wallet_address=${address.toLowerCase()}; path=/; max-age=86400; SameSite=Lax; Secure`

        // Supabase Auth 세션 승격 (필요시 가상 생성)
        const supabase = createClient()
        if (supabase) {
          try {
            await supabase.auth.signInWithPassword({
              email: `${address.toLowerCase()}@emoji-market.com`,
              password: `DummyPass_${address}`
            })
          } catch (e) {
            // 이모지마켓 특성상 DB에서 wallet 세션 검증이 메인이므로 패스 가능
          }
        }

        router.push('/pet-sticker')
      } else {
        alert(`로그인 실패: ${loginData.message}`)
      }

    } catch (error: any) {
      console.error('Wallet connect error:', error)
      alert(error.message || '지갑 서명 검증 도중 에러가 발생했습니다.')
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-slate-100 relative overflow-hidden select-none">
      
      {/* 백그라운드 퍼플/블루 오로라 광원 */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] rounded-full bg-violet-600/10 blur-[100px] pointer-events-none"></div>

      {/* 로그인 메인 컨테이너 */}
      <div className="w-full max-w-md bg-slate-900/60 border border-slate-800/80 backdrop-blur-2xl rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
        {/* 상단 무지개 그라디언트 라인 */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

        {/* 상단 로고 데코레이션 */}
        <div className="text-center space-y-3.5 mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-1">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">이모지 마켓</h1>
          <p className="text-xs text-slate-400">AI 이모티콘 빌더 & Web3 지갑 연동 MVP</p>
        </div>

        {/* 약관 동의 영역 */}
        <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-4.5 space-y-3.5 mb-6">
          <label className="flex items-start gap-3 cursor-pointer text-xs select-none">
            <input
              type="checkbox"
              checked={tosChecked}
              onChange={(e) => setTosChecked(e.target.checked)}
              className="mt-0.5 rounded border-slate-800 bg-slate-950 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-950 cursor-pointer"
            />
            <span className="text-slate-300">
              <span className="text-indigo-400 font-bold mr-1">[필수]</span> 서비스 이용약관 동의
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer text-xs select-none">
            <input
              type="checkbox"
              checked={privacyChecked}
              onChange={(e) => setPrivacyChecked(e.target.checked)}
              className="mt-0.5 rounded border-slate-800 bg-slate-950 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-950 cursor-pointer"
            />
            <span className="text-slate-300">
              <span className="text-indigo-400 font-bold mr-1">[필수]</span> 개인정보 수집 및 이용 동의
            </span>
          </label>
        </div>

        {/* 로그인 연동 버튼 목록 */}
        <div className="space-y-3.5">
          {/* 카카오계정 소셜 로그인 */}
          <button
            type="button"
            onClick={connectKakaoRealOAuth}
            className="w-full inline-flex items-center justify-center gap-2 py-4 px-4 rounded-2xl bg-[#FEE500] hover:bg-[#FEE500]/90 text-[#191919] font-black text-sm transition-all active:scale-[0.98] shadow-md shadow-yellow-500/5 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 fill-current shrink-0" />
            <span>카카오 계정으로 3초 로그인</span>
          </button>

          {/* Web3 지갑 연결 */}
          <button
            type="button"
            onClick={connectWallet}
            disabled={isConnecting}
            className="w-full inline-flex items-center justify-center gap-2 py-4 px-4 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-white font-black text-sm transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            <Wallet className="w-4 h-4 shrink-0" />
            <span>{isConnecting ? '지갑 서명 진행 중...' : 'Web3 지갑 연결 로그인'}</span>
          </button>
        </div>

        {/* 하단 보안 주의사항 */}
        <div className="mt-8 pt-4 border-t border-slate-800/50 flex items-start gap-2.5 text-[10px] text-slate-500 leading-relaxed font-mono">
          <ShieldAlert className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
          <span>지갑 서명은 사용자의 가스비(수수료)나 자산 양도 권한을 절대로 요구하지 않는 안전한 암호학적 소유권 검증 규격입니다.</span>
        </div>

      </div>
    </div>
  )
}
