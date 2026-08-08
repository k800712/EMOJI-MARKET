'use client'

import React, { useState, useEffect } from 'react'
import { Terminal, ShieldAlert, Cpu, RefreshCw, CheckCircle } from 'lucide-react'

interface AuthDiagnosticsProps {
  walletAddress: string | null
}

export default function AuthDiagnostics({ walletAddress }: AuthDiagnosticsProps) {
  const [isKakaoLoaded, setIsKakaoLoaded] = useState<boolean>(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [dbStatus, setDbStatus] = useState<'pending' | 'pass' | 'fail'>('pending')
  const [dbDetails, setDbDetails] = useState<string>('')
  const [diagnosticReport, setDiagnosticReport] = useState<any>(null)
  const [showReport, setShowReport] = useState<boolean>(false)
  const [isRunning, setIsRunning] = useState<boolean>(false)

  // 1. 카카오 SDK 로드 여부 실시간 진단
  useEffect(() => {
    if (typeof window === 'undefined') return
    const interval = setInterval(() => {
      const Kakao = (window as any).Kakao
      if (Kakao && Kakao.isInitialized()) {
        setIsKakaoLoaded(true)
        clearInterval(interval)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // 2. 난스 인증 만료 세션 실시간 카운트다운
  useEffect(() => {
    if (!walletAddress) {
      setCountdown(null)
      return
    }
    setCountdown(300) // 5분 부여
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [walletAddress])

  // 3. Supabase DB 커넥션 및 JWT 서명 검증 디버깅 실행
  const runDiagnostics = async () => {
    setIsRunning(true)
    setDbStatus('pending')
    setDbDetails('Supabase API 연결 및 Upsert 검증 수행 중...')

    try {
      const response = await fetch('/api/auth/kakao/verify-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: null
        })
      })

      const data = await response.json()
      if (data.status === 'success') {
        setDbStatus('pass')
        setDbDetails('Supabase web3_users 테이블 쓰기/읽기 무결성 검증 완벽 통과!')
        setDiagnosticReport(data)
      } else {
        setDbStatus('fail')
        setDbDetails(data.message || '인증 검증 과정 중 실패가 검출되었습니다.')
        setDiagnosticReport(data)
      }
    } catch (err: any) {
      setDbStatus('fail')
      setDbDetails(err.message || '네트워크 통신 중 에러가 발생했습니다.')
      setDiagnosticReport({
        status: 'error',
        errorStack: err.stack || err.toString()
      })
    } finally {
      setIsRunning(false)
    }
  }

  // 4. 모바일 햅틱 진동
  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(60)
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-slate-300 font-mono text-xs shadow-2xl space-y-5 max-w-3xl mx-auto mt-8">
      
      {/* 타이틀 바 */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-indigo-500 animate-pulse" />
          <span className="font-extrabold text-sm text-white tracking-tight">K-Auth 세션 무결성 정밀 진단 보드</span>
        </div>
        <button
          type="button"
          onClick={() => {
            triggerHaptic()
            runDiagnostics()
          }}
          disabled={isRunning}
          className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-white font-black px-3.5 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
          <span>진단 쿼리 기동</span>
        </button>
      </div>

      {/* 진단 항목 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
        
        {/* Kakao SDK 로드 상태 */}
        <div className="bg-slate-950 border border-slate-800/60 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-1.5 text-gray-400 font-extrabold">
            <Cpu className="w-3.5 h-3.5" />
            <span>Kakao SDK 로드</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isKakaoLoaded ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
            <span className="font-bold text-white">{isKakaoLoaded ? 'INITIALIZED (🟢)' : 'PENDING (🔴)'}</span>
          </div>
        </div>

        {/* 세션 난스 만료 시간 카운트다운 */}
        <div className="bg-slate-950 border border-slate-800/60 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-1.5 text-gray-400 font-extrabold">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>난스 세션 만료 시간</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${countdown !== null && countdown > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
            <span className="font-bold text-white">
              {countdown !== null ? `${countdown}s` : 'NOT LOGGED IN (🔒)'}
            </span>
          </div>
        </div>

        {/* Supabase DB Connection */}
        <div className="bg-slate-950 border border-slate-800/60 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-1.5 text-gray-400 font-extrabold">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Supabase DB 커넥션</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${
              dbStatus === 'pass' ? 'bg-emerald-500 animate-pulse' : dbStatus === 'fail' ? 'bg-red-500' : 'bg-amber-500'
            }`}></span>
            <span className="font-bold text-white">
              {dbStatus === 'pass' ? 'PASSED (🟢)' : dbStatus === 'fail' ? 'FAILED (🔴)' : 'WAITING (🟡)'}
            </span>
          </div>
        </div>

      </div>

      {/* 진단 상태 텍스트 가이드 */}
      <div className="text-[11px] text-gray-400 bg-slate-950 border border-slate-800 rounded-xl p-3.5 leading-relaxed font-mono">
        <span className="text-indigo-400 font-extrabold block mb-1">SYSTEM STATE LOG:</span>
        {dbDetails || '진단 쿼리 기동 버튼을 누르면 실시간 Supabase API 쓰기/읽기 무결성 진단이 실행됩니다.'}
      </div>

      {/* [진단 결과 보기] 상세 리포트 팝업 슬라이더 */}
      {diagnosticReport && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic()
              setShowReport(!showReport)
            }}
            className="text-[11px] text-indigo-400 hover:text-indigo-300 font-black hover:underline cursor-pointer flex items-center gap-1"
          >
            {showReport ? '▼ [상세 진단 보고서 접기]' : '▶ [상세 진단 보고서 펼치기]'}
          </button>
          
          {showReport && (
            <pre className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[10px] text-emerald-400 overflow-x-auto max-h-[220px] font-mono leading-relaxed shadow-inner animate-fade-in">
              {JSON.stringify(diagnosticReport, null, 2)}
            </pre>
          )}
        </div>
      )}

    </div>
  )
}
