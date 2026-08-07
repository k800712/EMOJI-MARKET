'use client'

import React, { useState, useEffect } from 'react'
import { Wallet, LogOut, ShieldCheck, RefreshCw } from 'lucide-react'

declare global {
  interface Window {
    ethereum?: any
  }
}

export default function WalletConnect() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState<boolean>(false)

  useEffect(() => {
    checkLocalSession()
  }, [])

  const checkLocalSession = () => {
    try {
      const stored = localStorage.getItem('wallet_session')
      if (stored) {
        setWalletAddress(stored)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const connectWallet = async () => {
    if (isConnecting) return
    setIsConnecting(true)

    try {
      if (!window.ethereum) {
        alert('MetaMask 또는 지원되는 Web3 지갑을 설치해 주세요!')
        setIsConnecting(false)
        return
      }

      // 1. MetaMask 계정 연결 요청
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const address = accounts[0]
      if (!address) {
        throw new Error('연결된 지갑 주소가 존재하지 않습니다.')
      }

      // 2. 백엔드 난스(Nonce) 획득
      const nonceRes = await fetch(`/api/auth/nonce?address=${address}`)
      const nonceData = await nonceRes.json()

      if (nonceData.status !== 'success' || !nonceData.nonce) {
        throw new Error(nonceData.message || '임시 서명 메시지 발급 실패')
      }

      const nonceMessage = nonceData.nonce

      // 3. 지갑 서명 요청 (personal_sign)
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [nonceMessage, address],
      })

      // 4. 서명 검증 및 로그인 처리
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
        setWalletAddress(address)
        localStorage.setItem('wallet_session', address)
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

  const disconnectWallet = async () => {
    setWalletAddress(null)
    localStorage.removeItem('wallet_session')
    
    // 쿠키 제거를 위해 세션 삭제 API 비동기 트리거
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (e) {
      console.error(e)
    }
  }

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  if (walletAddress) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{shortenAddress(walletAddress)}</span>
        </div>
        <button
          type="button"
          onClick={disconnectWallet}
          className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors"
          title="로그아웃"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={connectWallet}
      disabled={isConnecting}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-primary to-indigo-600 hover:from-blue-600 hover:to-indigo-500 text-white transition-all shadow-md shadow-blue-500/10 active:scale-95"
    >
      {isConnecting ? (
        <>
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          연동 중...
        </>
      ) : (
        <>
          <Wallet className="w-3.5 h-3.5" />
          지갑 연결 (Web3 Login)
        </>
      )}
    </button>
  )
}
