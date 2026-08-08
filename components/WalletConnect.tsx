'use client'

import React from 'react'
import { Wallet, LogOut, ShieldCheck, RefreshCw } from 'lucide-react'

interface WalletConnectProps {
  walletAddress: string | null
  isConnecting: boolean
  onConnect: () => void
  onDisconnect: () => void
}

export default function WalletConnect({
  walletAddress,
  isConnecting,
  onConnect,
  onDisconnect
}: WalletConnectProps) {
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
          onClick={onDisconnect}
          className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors focus:outline-none"
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
      onClick={onConnect}
      disabled={isConnecting}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-primary to-indigo-600 hover:from-blue-600 hover:to-indigo-500 text-white transition-all shadow-md shadow-blue-500/10 active:scale-95 focus:outline-none"
    >
      {isConnecting ? (
        <>
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          연동 중...
        </>
      ) : (
        <>
          <Wallet className="w-3.5 h-3.5" />
          지갑 연결 (Web3)
        </>
      )}
    </button>
  )
}
