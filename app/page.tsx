'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { 
  Smile, 
  Wand2, 
  CloudUpload, 
  X, 
  Check, 
  Download, 
  ShieldCheck, 
  FileArchive, 
  Bell, 
  Layers,
  Sparkles,
  Trash2,
  Plus,
  Coins,
  CreditCard,
  Zap,
  CheckCircle2
} from 'lucide-react'
import WalletConnect from '@/components/WalletConnect'
import EmojiKeyboardSelector from '@/components/EmojiKeyboardSelector'
import EmojiLibrary from '@/components/EmojiLibrary'
import ReferralCard from '@/components/ReferralCard'
import AuthDiagnostics from '@/components/AuthDiagnostics'
import Link from 'next/link'
import { useConfetti } from '@/hooks/useConfetti'
import ProfileDropdown from '@/components/ProfileDropdown'
import { useRealtimePoints } from '@/hooks/useRealtimePoints'
import AnimatedPointsBadge from '@/components/AnimatedPointsBadge'
import { ShoppingBag } from 'lucide-react'

interface HistoryItem {
  uuid: string
  style_type: string
  created_at: string
}

const KAKAO_SITUATIONS = [
  { id: 1, text: "안녕!", prompt: "waving hand politely, smiling warmly, greeting" },
  { id: 2, text: "사랑해💖", prompt: "making a big heart shape with hands, eyes showing affection" },
  { id: 3, text: "흐앙😭", prompt: "weeping out a river of cartoon tears, looking deeply sad" },
  { id: 4, text: "부글부글💢", prompt: "comically angry face with small steam graphics, looking pouty and grumpy, humorous cartoon style" },
  { id: 5, text: "굿모닝☀️", prompt: "waking up sleepily with a stretch, morning sunshine vibe" },
  { id: 6, text: "졸려💤", prompt: "drooling while sleeping bubble pops out of nose" },
  { id: 7, text: "대박!😱", prompt: "shocked expression with widely opened eyes and mouth, comically surprised, cute cartoon sticker" },
  { id: 8, text: "축하해🎉", prompt: "throwing colorful party poppers and confetti, dancing" },
  { id: 9, text: "고마워🙏", prompt: "pressing hands together in polite gratitude, eyes glittering" },
  { id: 10, text: "배고파🤤", prompt: "stomach rumbling, thinking about a dream bubble of juicy meat" },
  { id: 11, text: "퇴근원츄🔥", prompt: "typing quickly on a keyboard with cartoon sweat drops, working hard with cute determination" },
  { id: 12, text: "멘붕🤯", prompt: "completely dizzy with spiral eyes, cute cartoon stars floating above the head" },
  { id: 13, text: "지켜보고있다👁️", prompt: "squinting eyes suspiciously like a detective behind magnifier" },
  { id: 14, text: "최고!👍", prompt: "giving a big confident double thumbs up with a huge grin" },
  { id: 15, text: "노놉🙅", prompt: "gesturing a playful 'no' with hands crossed, looking comically stubborn but very cute, cartoon sticker" },
  { id: 16, text: "어색..😅", prompt: "nervous sweat drop, scratching back of head with a comically shy smile" },
  { id: 17, text: "돈벼락💸", prompt: "surrounded by comically floating yellow star sparkles and shiny cartoon diamonds, feeling extremely lucky, jackpot background" },
  { id: 18, text: "불금이다!🍻", prompt: "holding a cute sparkling soda glass with comically flushed happy cheeks, celebrating joyfully" },
  { id: 19, text: "힘내요💪", prompt: "flexing tiny cute biceps, looking passionate and determined" },
  { id: 20, text: "뒹굴뒹굴🛌", prompt: "lying down flat wrapped in a soft blanket, feeling extremely lazy" },
  { id: 21, text: "감기조심😷", prompt: "wrapped in a huge soft scarf, sneezing comically with a cartoon 'choo!' balloon, looking cute and fluffy" },
  { id: 22, text: "도망쳐🏃", prompt: "running fast with comic speed lines, looking comically scared, funny cartoon style" },
  { id: 23, text: "오예!🕺", prompt: "dancing hysterically, throwing hands in the air, feeling ecstatic" },
  { id: 24, text: "절받으세요🙇", prompt: "cute bowing pose in traditional style, looking respectful and warm" }
]

export default function Home() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null)
  const [selectedCountry, setSelectedCountry] = useState<string>('KR')
  const [customPrompt, setCustomPrompt] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [loadingStepText, setLoadingStepText] = useState<string>('1단계: 대기열 등록 완료')
  const [loadingPercentText, setLoadingPercentText] = useState<number>(15)
  const [serverBusy, setServerBusy] = useState<boolean>(false)
  const [notificationGranted, setNotificationGranted] = useState<boolean>(false)
  
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [selectedUUIDs, setSelectedUUIDs] = useState<Set<string>>(new Set())
  const [canvasResult, setCanvasResult] = useState<string | null>(null)
  const [sliderPos, setSliderPos] = useState<number>(50)
  const [isSliderVisible, setIsSliderVisible] = useState<boolean>(false)
  const [activeSetIndex, setActiveSetIndex] = useState<number>(0)

  // 포인트 경제 모델 상태
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [points, setPoints] = useState<number>(0)
  const [generateQty, setGenerateQty] = useState<number>(6) // 기본 수량 6개
  const [showRechargeModal, setShowRechargeModal] = useState<boolean>(false)
  const [rechargeStep, setRechargeStep] = useState<'plan' | 'loading' | 'success'>('plan')
  const [selectedPackage, setSelectedPackage] = useState<string>('starter')
  const [pointHistory, setPointHistory] = useState<any[]>([])

  // 카카오 로그인 및 모의 결제 상태
  const [showKakaoModal, setShowKakaoModal] = useState<boolean>(false)
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false) // 하이브리드 로그인 통합 창
  const [isConnecting, setIsConnecting] = useState<boolean>(false)
  const [kakaoNickname, setKakaoNickname] = useState<string>('')
  const [kakaoIdInput, setKakaoIdInput] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('toss') // 'toss' | 'kakao' | 'culture'

  // 마이펫 실사 스티커 제작 모드 상태 변수
  const [activeMode, setActiveMode] = useState<'illust' | 'pet'>('illust')
  const { triggerGrandCannon } = useConfetti()
  const [showProfileDropdown, setShowProfileDropdown] = useState<boolean>(false)
  const [pointsDelta, setPointsDelta] = useState<number>(0)
  const profileRef = useRef<HTMLDivElement>(null)
  const [userReferralCode, setUserReferralCode] = useState<string>('')
  const [userReferredBy, setUserReferredBy] = useState<string | null>(null)
  const [petStickers, setPetStickers] = useState<{name: string, label: string, image: string}[]>([])
  const [petStickerZip, setPetStickerZip] = useState<string>('')
  const [isPetGenerating, setIsPetGenerating] = useState<boolean>(false)
  const [isNoBgLoading, setIsNoBgLoading] = useState<boolean>(false)
  const [noBgImageUrl, setNoBgImageUrl] = useState<string>('')

  // Supabase Realtime 실시간 포인트 감지 리스너 연동
  useRealtimePoints(walletAddress, (newPoints, delta) => {
    setPoints(newPoints)
    setPointsDelta(delta)
  })

  // 드롭다운 외부 영역 터치 클릭 시 자동으로 닫기 핸들러
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('wallet_session')
    if (stored) {
      setWalletAddress(stored)
      fetchPoints(stored)
    }
  }, [])

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
        fetchPoints(address)
        setShowLoginModal(false)
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
    setPoints(0)
    setPointHistory([])
    setHistory([]) // 보관함 목록 비우기
    setSelectedUUIDs(new Set()) // 선택된 UUID 목록 비우기
    setUserReferralCode('')
    setUserReferredBy(null)
    localStorage.removeItem('wallet_session')
    
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (e) {
      console.error(e)
    }
  }

  // 모의 카카오 간편 소셜 로그인 처리 함수
  const handleKakaoLogin = async (id?: string, name?: string) => {
    try {
      const res = await fetch('/api/auth/kakao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kakaoId: id || '', nickname: name || '' })
      })
      const data = await res.json()
      if (data.status === 'success') {
        setWalletAddress(data.address)
        localStorage.setItem('wallet_session', data.address)
        setUserReferralCode(data.referralCode || '')
        setUserReferredBy(data.referredBy || null)
        fetchPoints(data.address)
        setShowKakaoModal(false)
        setShowLoginModal(false)
        
        // 보관함 목록 동기화
        try {
          const historyRes = await fetch('/api/get-history')
          const historyData = await historyRes.json()
          if (historyData.status === 'success' && Array.isArray(historyData.data)) {
            setHistory(historyData.data)
            const firstSet = historyData.data.slice(0, 24)
            setSelectedUUIDs(new Set(firstSet.map((item: any) => item.uuid)))
            setActiveSetIndex(0)
          }
        } catch (he) {
          console.error('Failed to reload history after login', he)
        }
        
        // 햅틱 피드백 기동
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([100, 50, 100])
        }
      } else {
        alert(`로그인 실패: ${data.message}`)
      }
    } catch (e) {
      console.error('Kakao login error:', e)
      alert('카카오 로그인 중 오류가 발생했습니다.')
    }
  }

  // 포인트 거래 내역 조회 API
  const fetchPointHistory = async (addr: string) => {
    try {
      const res = await fetch(`/api/points/history?wallet_address=${addr}`)
      const data = await res.json()
      if (data.status === 'success') {
        setPointHistory(data.data || [])
      }
    } catch (e) {
      console.error('Failed to fetch point history', e)
    }
  }

  // 포인트 조회 API
  const fetchPoints = async (addr: string) => {
    try {
      const res = await fetch(`/api/user/points?wallet=${addr}`)
      const data = await res.json()
      if (data.status === 'success') {
        setPoints(data.points)
        setUserReferralCode(data.referralCode || '')
        setUserReferredBy(data.referredBy || null)
        fetchPointHistory(addr) // 거래 내역 실시간 연쇄 갱신
      }
    } catch (e) {
      console.error('Failed to fetch points', e)
    }
  }

  // 가상 결제 토스 충전 기능
  const handleRecharge = async (packageId: string) => {
    if (!walletAddress) return
    setRechargeStep('loading')
    
    // Toss 결제창 성공 모션 연출 1.5초 딜레이
    await new Promise(r => setTimeout(r, 1500))

    try {
      const res = await fetch('/api/user/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: walletAddress,
          packageId
        })
      })
      const data = await res.json()
      if (data.status === 'success') {
        setPoints(data.points)
        setRechargeStep('success')
        
        // 햅틱 진동 작동 (iOS/안드로이드 피드백 오마주)
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([100, 50, 100])
        }
      } else {
        alert(`충전 실패: ${data.message}`)
        setRechargeStep('plan')
      }
    } catch (e) {
      console.error('Recharge error:', e)
      alert('충전 중 오류가 발생했습니다.')
      setRechargeStep('plan')
    }
  }

  // 24종씩 논리 묶음(청크) 처리
  const emojiSets = useMemo(() => {
    const sets: Array<{ id: number; label: string; emojis: HistoryItem[] }> = []
    for (let i = 0; i < history.length; i += 24) {
      const chunk = history.slice(i, i + 24)
      if (chunk.length > 0) {
        const rep = chunk[0]
        const date = new Date(rep.created_at)
        const dateStr = `${String(date.getMonth() + 1).padStart(2, '0')}월 ${String(date.getDate()).padStart(2, '0')}일 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
        
        let styleLabel = '트렌디'
        if (rep.style_type === 'senior') styleLabel = '장년층'
        else if (rep.style_type === 'office') styleLabel = '직장인'
        
        const setId = Math.floor(i / 24) + 1
        sets.push({
          id: setId,
          label: `${setId}세트 (${dateStr} - ${styleLabel} 스타일, ${chunk.length}종)`,
          emojis: chunk
        })
      }
    }
    return sets
  }, [history])

  const activeEmojis = useMemo(() => {
    return emojiSets[activeSetIndex]?.emojis || []
  }, [emojiSets, activeSetIndex])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState<boolean>(false)

  useEffect(() => {
    if (walletAddress) {
      loadHistory()
    } else {
      setHistory([])
    }
  }, [walletAddress])

  const loadHistory = async () => {
    // 비로그인 상태일 때는 Supabase 조회를 원천 차단하여 불필요한 트래픽 낭비 예방
    if (!walletAddress) {
      setHistory([])
      return
    }

    try {
      const res = await fetch('/api/get-history')
      if (!res.ok) throw new Error(`HTTP error ${res.status}`)
      const data = await res.json()
      if (data.status === 'success' && Array.isArray(data.data)) {
        setHistory(data.data)
        // 로드 성공 시 첫 번째 세트(최신 24종)를 기본 활성 및 기본 체크 선택
        const firstSet = data.data.slice(0, 24)
        setSelectedUUIDs(new Set(firstSet.map((item: any) => item.uuid)))
        setActiveSetIndex(0)
      } else {
        setHistory([])
      }
    } catch (e) {
      console.error("Supabase 데이터 연동 에러 방어 처리 (loadHistory):", e)
      setHistory([]) // DB 에러가 발생하더라도 페이지가 다운되지 않고 빈 보관함 UI로 렌더링되도록 방어합니다.
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0])
    }
  }

  // 마이펫 이미지 업로드 및 배경 제거(누끼) API 호출
  const handlePetUpload = async (file: File) => {
    setIsNoBgLoading(true)
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64Image = e.target?.result as string
        const res = await fetch('/api/remove-bg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Image })
        })
        const data = await res.json()
        if (data.status === 'success') {
          setNoBgImageUrl(data.image)
          setUploadedFile(file)
        } else {
          alert(`배경 제거 실패: ${data.message || '알 수 없는 오류'}`)
        }
        setIsNoBgLoading(false)
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      console.error(err)
      alert('펫 이미지 업로드 중 에러가 발생했습니다.')
      setIsNoBgLoading(false)
    }
  }

  // 마이펫 실사 스티커 8종 세트 최종 제작 핸들러
  const handleGeneratePetStickers = async () => {
    if (!walletAddress) {
      alert('🔒 로그인이 완료되면 마이펫 실사 스티커 제작이 가능합니다!')
      setShowLoginModal(true)
      return
    }
    if (!noBgImageUrl) {
      alert('🐶 반려동물 사진을 먼저 업로드해 주세요.')
      return
    }
    if (points < 1) {
      alert('⚠️ 보유 포인트가 부족합니다. 스티커를 제작하려면 최소 1 P가 필요합니다.')
      return
    }

    setIsPetGenerating(true)
    try {
      const response = await fetch('/api/generate/pet-sticker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: noBgImageUrl,
          walletAddress
        })
      })
      const data = await response.json()
      if (data.status === 'success') {
        setPetStickers(data.stickers)
        setPetStickerZip(data.zip)
        setPoints(data.remainingPoints)
        
        // 10대 도파민 폭발 축하 그랜드 캐논 발사!
        triggerGrandCannon()

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([100, 50, 100])
        }

        // 보관함 실시간 새로고침
        loadHistory()
      } else {
        alert(data.message || '마이펫 스티커 생성 중 실패했습니다.')
      }
    } catch (e: any) {
      console.error(e)
      alert('스티커 제작 중 네트워크 오류가 발생했습니다.')
    } finally {
      setIsPetGenerating(false)
    }
  }

  const handleFile = (file: File) => {
    if (!file.type.match('image.*')) {
      alert('이미지 파일만 업로드할 수 있습니다.')
      return
    }
    
    if (activeMode === 'pet') {
      handlePetUpload(file)
    } else {
      setUploadedFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string)
        setIsSliderVisible(false)
        setCanvasResult(null)
      }
      reader.readAsDataURL(file)
    }
  }

  const resetUpload = () => {
    setUploadedFile(null)
    setPreviewUrl(null)
    setCanvasResult(null)
    setIsSliderVisible(false)
    setNoBgImageUrl('')
    setPetStickers([])
    setPetStickerZip('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const requestPushPermission = () => {
    if (!('Notification' in window)) {
      alert('이 브라우저는 웹 알림을 지원하지 않습니다.')
      return
    }
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        setNotificationGranted(true)
        alert('웹 알림 승인 완료! 생성 완료 시 알려드립니다.')
        new Notification('이모지 마켓', {
          body: '나만의 특별한 스티커 알림 설정이 완료되었습니다!',
        })
      }
    })
  }

  const triggerGenerate = async () => {
    if (!uploadedFile || !selectedStyle) return

    setIsGenerating(true)
    setServerBusy(false)
    setLoadingStepText(`1/${generateQty}번째 이모티콘 굽는 중... (대기열 등록)`)
    setLoadingPercentText(0)

    const wallet = localStorage.getItem('wallet_session') || 'guest'
    // 선택된 수량만큼 상황극 프롬프트를 슬라이싱하여 큐 구성
    const tasks = KAKAO_SITUATIONS.slice(0, generateQty)
    let completedCount = 0
    const totalTasks = tasks.length
    const concurrency = 2
    const queue = tasks.map((task, idx) => ({ ...task, taskIndex: idx }))

    const runWorker = async () => {
      while (queue.length > 0) {
        const task = queue.shift()
        if (!task) break

        // API 429 한도 초과 방지를 위한 800ms Throttling 딜레이
        await new Promise(r => setTimeout(r, 800))

        try {
          const formData = new FormData()
          formData.append('emoji_image', uploadedFile)
          formData.append('style_type', selectedStyle) // Webtoon, Pixel, 3D Clay
          formData.append('target_country', selectedCountry)
          formData.append('user_wallet', wallet)
          formData.append('quantity', generateQty.toString()) // 사전 쿼타 검증용으로 전체 개수 전송
          formData.append('task_index', task.taskIndex.toString()) // 첫 요청 시에만 선차감 처리용 인덱스 전송
          formData.append('situation_prompt', task.prompt)
          formData.append('situation_text', task.text)
          formData.append('text', customPrompt) // 커스텀 전체 문구 있을 시 오버라이드

          const response = await fetch('/api/generate', {
            method: 'POST',
            body: formData,
          })

          const result = await response.json()
          if (result.status === 'success') {
            loadEmojiToCanvas(result.uuid, true) // 실시간 캔버스 표출 및 목록 갱신
            // 개별 성공할 때마다 유저 포인트 즉각 차감 동기화 연출
            if (wallet !== 'guest') fetchPoints(wallet)
          } else {
            console.error(`Sticker ${task.id} failed: ${result.message}`)
          }
        } catch (e) {
          console.error(`Sticker ${task.id} network error:`, e)
        } finally {
          completedCount++
          const percent = Math.round((completedCount / totalTasks) * 100)
          setLoadingPercentText(percent)
          
          if (completedCount < totalTasks) {
            setLoadingStepText(`${completedCount + 1}/${generateQty}번째 이모티콘 가공 중...`)
          } else {
            setLoadingStepText(`${generateQty}종 이모티콘 패키지가 완성되었습니다! 🎉`)
          }
        }
      }
    }

    // 지정한 동시성 개수만큼 워커 구동 (타임아웃 우회)
    const workers = Array.from({ length: concurrency }, () => runWorker())
    await Promise.all(workers)

    if (notificationGranted) {
      new Notification('이모지 마켓', {
        body: `나만의 카카오 제안 규격 ${generateQty}종 이모티콘 패키지 빌드가 모두 완료되었습니다!`,
      })
    }

    if (wallet !== 'guest') {
      fetchPoints(wallet)
    }

    // 일러스트 생성 성공 도파민 그랜드 캐논 발사!
    triggerGrandCannon()

    setTimeout(() => {
      setIsGenerating(false)
    }, 1000)
  }

  const loadEmojiToCanvas = (uuid: string, isFresh = false) => {
    const streamUrl = `/api/view?uuid=${uuid}`
    setCanvasResult(streamUrl)
    if (isFresh) {
      setIsSliderVisible(true)
      setSliderPos(50)
      loadHistory()
    } else {
      setIsSliderVisible(false)
    }
  }

  const handleCardClick = (uuid: string) => {
    const nextSelected = new Set(selectedUUIDs)
    if (nextSelected.has(uuid)) {
      nextSelected.delete(uuid)
    } else {
      nextSelected.add(uuid)
    }
    setSelectedUUIDs(nextSelected)
  }

  const toggleSelectAll = () => {
    const activeUUIDs = activeEmojis.map(item => item.uuid)
    const allSelected = activeUUIDs.every(uuid => selectedUUIDs.has(uuid))
    
    const newSelected = new Set(selectedUUIDs)
    if (allSelected) {
      activeUUIDs.forEach(uuid => newSelected.delete(uuid))
    } else {
      activeUUIDs.forEach(uuid => newSelected.add(uuid))
    }
    setSelectedUUIDs(newSelected)
  }

  const downloadZipPackage = async () => {
    const uuidsArray = Array.from(selectedUUIDs)
    if (uuidsArray.length === 0) return

    setIsGenerating(true)
    setLoadingStepText('서버에서 ZIP 파일 압축 진행 중...')
    setLoadingPercentText(50)

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuids: uuidsArray }),
      })

      if (!response.ok) throw new Error('ZIP download failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = 'emoji_market_package.zip'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      setSelectedUUIDs(new Set())
      setIsGenerating(false)
    } catch (e) {
      setIsGenerating(false)
      alert('ZIP 압축 패키징 중 오류가 발생했습니다.')
    }
  }

  const deleteEmoji = async (uuid: string) => {
    if (!confirm('이 이모티콘을 보관함에서 영구 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch('/api/delete-emoji', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid }),
      })

      const result = await response.json()
      if (result.status === 'success') {
        // 로컬 선택 상태 정리
        const nextSelected = new Set(selectedUUIDs)
        nextSelected.delete(uuid)
        setSelectedUUIDs(nextSelected)

        // 보관함 목록 갱신
        loadHistory()
      } else {
        alert('삭제 실패: ' + result.message)
      }
    } catch (e) {
      alert('삭제 처리 도중 오류가 발생했습니다.')
    }
  }

  const isFormValid = uploadedFile && selectedStyle

  return (
    <div className="min-h-screen flex flex-col justify-between pb-24">
      {/* Header */}
      <header className="border-b border-gray-100/80 bg-white/70 backdrop-blur-md sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center shadow-md shadow-blue-500/20">
              <Smile className="text-white text-xl w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">이모지 마켓</h1>
              <p className="text-[10px] text-blue-500 font-mono tracking-wider">NEXT.JS AI EMOTICON BUILDER</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* 10대 실시간 벼룩시장 바로가기 */}
            <Link
              href="/market"
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-indigo-600 border border-indigo-100 px-3.5 py-1.5 rounded-2xl text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-indigo-500 animate-bounce" />
              <span>벼룩시장 🪙</span>
            </Link>

            {!walletAddress ? (
              <button
                type="button"
                onClick={() => setShowLoginModal(true)}
                className="flex items-center gap-1.5 bg-[#FEE500] hover:bg-[#F0D200] text-[#191919] px-3.5 py-1.5 rounded-2xl text-xs font-black shadow-sm transition-all duration-300 animate-pulse active:scale-95 cursor-pointer"
              >
                <span>로그인 시 무료 3P 선물 🎁</span>
              </button>
            ) : (
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined' && navigator.vibrate) {
                      navigator.vibrate(60)
                    }
                    setShowProfileDropdown(!showProfileDropdown)
                  }}
                  className="flex items-center gap-2 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 text-slate-700 px-3.5 py-1.5 rounded-2xl text-xs font-extrabold border border-slate-200/60 shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <span className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs">
                    🍞
                  </span>
                  <span className="max-w-[70px] truncate">{nickname || '식빵냥'}</span>
<AnimatedPointsBadge points={points} delta={pointsDelta} />
                </button>

                {showProfileDropdown && (
                  <ProfileDropdown
                    walletAddress={walletAddress}
                    nickname={nickname || '식빵냥'}
                    points={points}
                    referralCode={userReferralCode}
                    onLogout={disconnectWallet}
                    onRechargeClick={() => {
                      setShowProfileDropdown(false)
                      setRechargeStep('plan')
                      setShowRechargeModal(true)
                    }}
                  />
                )}
              </div>
            )}
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
              소셜 & Web3 통합 App
            </span>
            <WalletConnect
              walletAddress={walletAddress}
              isConnecting={isConnecting}
              onConnect={() => setShowLoginModal(true)}
              onDisconnect={disconnectWallet}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-6xl w-full mx-auto px-4 py-8 flex flex-col gap-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column */}
          <section className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Upload Box */}
            <div className="bg-white border border-gray-200/60 rounded-3xl p-6 shadow-xl shadow-gray-200/30 transition-all duration-300">
              <h2 className="text-md font-bold mb-4 flex items-center gap-2 text-gray-800">
                <span className="w-1 h-4 bg-brand-primary rounded-full"></span>
                1. 캐릭터 베이스 이미지 업로드
              </h2>

              {/* iOS 스타일 세그먼트 컨트롤 */}
              <div className="bg-gray-100 p-1 rounded-2xl flex gap-1 w-full mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('illust')
                    resetUpload()
                  }}
                  className={`flex-1 text-center py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                    activeMode === 'illust'
                      ? 'bg-white shadow-sm text-brand-primary'
                      : 'text-gray-400 hover:text-gray-700'
                  }`}
                >
                  🎨 AI 일러스트 생성
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('pet')
                    resetUpload()
                  }}
                  className={`flex-1 text-center py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                    activeMode === 'pet'
                      ? 'bg-white shadow-sm text-brand-primary'
                      : 'text-gray-400 hover:text-gray-700'
                  }`}
                >
                  🐶 마이펫 실사 스티커 제작
                </button>
              </div>
              
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => {
                  if (!isNoBgLoading && !isPetGenerating) {
                    fileInputRef.current?.click()
                  }
                }}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300 relative group ${
                  dragOver ? 'border-brand-primary bg-blue-50/30 scale-[0.99]' : 'border-gray-300 hover:border-brand-primary/50 bg-gray-50/50 hover:bg-gray-50/20'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*" 
                  className="hidden" 
                />
                
                {isNoBgLoading ? (
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="w-10 h-10 rounded-full border-2 border-brand-primary border-t-transparent animate-spin"></div>
                    <p className="text-xs text-gray-400 mt-1">배경 투명화 가공 중...</p>
                  </div>
                ) : !previewUrl ? (
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border border-gray-200 shadow-sm group-hover:scale-110 transition-transform duration-300">
                      <CloudUpload className="text-gray-400 group-hover:text-brand-primary transition-colors w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">
                        {activeMode === 'pet' ? '반려동물 정면 사진을 드래그 앤 드롭하세요' : '여기에 이미지를 드래그 앤 드롭하거나 클릭하세요'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WEBP 지원 (1:1 비율 권장)</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 relative z-10 w-full max-w-[200px]" onClick={(e) => e.stopPropagation()}>
                    <img src={previewUrl} alt="Preview" className="w-full aspect-square object-cover rounded-xl border border-gray-200 shadow-sm" />
                    <button 
                      type="button" 
                      onClick={resetUpload}
                      disabled={isPetGenerating}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center text-xs shadow-md transition-colors disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* 8종 감정 시안 리스트 & 제작 버튼 */}
              {activeMode === 'pet' && noBgImageUrl && !isPetGenerating && (
                <div className="mt-6 border-t border-gray-100 pt-6 space-y-5 animate-fade-in">
                  <div>
                    <h3 className="text-xs font-extrabold text-gray-500 mb-2.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      아래 8종의 감정 스티커 세트가 함께 제작됩니다! (1 P 소모)
                    </h3>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: '💖 감사', desc: '감사합니다' },
                        { label: '🔥 화이팅', desc: '화이팅!' },
                        { label: '💡 반짝', desc: '반짝!' },
                        { label: '🦖 크앙', desc: '크앙!' },
                        { label: '💢 쳇', desc: '쳇!' },
                        { label: '🌟 우와', desc: '우와!' },
                        { label: '😭 힝', desc: '힝ㅠㅠㅠㅠ' },
                        { label: '👍 네', desc: '네!' }
                      ].map((theme, i) => (
                        <div key={i} className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-center flex flex-col justify-center items-center gap-1 shadow-sm">
                          <span className="text-[10px] font-black text-gray-700">{theme.label}</span>
                          <span className="text-[9px] font-semibold text-gray-400 font-mono">"{theme.desc}"</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGeneratePetStickers}
                    className="w-full py-4 bg-brand-primary hover:bg-brand-primary-hover text-white font-black rounded-2xl text-xs transition-all active:scale-[0.98] shadow-md shadow-blue-500/10 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    🐶 마이펫 실사 스티커 8종 세트 제작하기 (1 P)
                  </button>
                </div>
              )}

              {/* 제작 중 스피너 */}
              {activeMode === 'pet' && isPetGenerating && (
                <div className="mt-6 border-t border-gray-100 pt-6 flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-full border-2 border-brand-primary border-t-transparent animate-spin"></div>
                  <p className="text-xs font-semibold text-gray-500">실사 스티커 패키지 합성 가공 중...</p>
                </div>
              )}

            </div>

            {/* Target Market Selector */}
            <div className={`bg-white border border-gray-200/60 rounded-3xl p-6 shadow-xl shadow-gray-200/30 ${activeMode === 'illust' ? '' : 'hidden'}`}>
              <h2 className="text-md font-bold mb-4 flex items-center gap-2 text-gray-800">
                <span className="w-1 h-4 bg-brand-primary rounded-full"></span>
                Target Market (타겟 국가)
              </h2>
              <div className="bg-gray-100 p-1 rounded-xl flex gap-1 w-full max-w-md mx-auto mb-6">
                {[
                  { code: 'KR', label: '🇰🇷 KR (한국)' },
                  { code: 'JP', label: '🇯🇵 JP (일본)' },
                  { code: 'US', label: '🇺🇸 US (미국)' },
                  { code: 'LA', label: '🇲🇽 LA (라틴)' },
                  { code: 'FR', label: '🇫🇷 FR (프랑스)' }
                ].map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => setSelectedCountry(item.code)}
                    className={`flex-1 text-center py-2 text-xs md:text-sm rounded-lg transition-all cursor-pointer ${
                      selectedCountry === item.code 
                        ? 'bg-white shadow-sm font-semibold text-blue-600' 
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-2">선택한 국가의 이모티콘 선호도와 정서적 특징에 최적화된 프롬프트가 이미지 분석 단계에 동적으로 융합됩니다.</p>
            </div>

            {/* Style Selector */}
            <div className={`bg-white border border-gray-200/60 rounded-3xl p-6 shadow-xl shadow-gray-200/30 ${activeMode === 'illust' ? '' : 'hidden'}`}>
              <h2 className="text-md font-bold mb-4 flex items-center gap-2 text-gray-800">
                <span className="w-1 h-4 bg-brand-primary rounded-full"></span>
                3. 캐릭터 기본 화풍 선택
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    id: 'Webtoon',
                    tag: '웹툰 스타일',
                    title: '식빵냥 🐱',
                    desc: '애매모호하고 표정 변화 풍부. 위트와 뚱함의 조화',
                    hash: '#웹툰화풍 #상황묘사',
                    labelColor: 'text-violet-600 bg-violet-50 border-violet-100',
                    label: 'CAT'
                  },
                  {
                    id: 'Pixel',
                    tag: '픽셀 스타일',
                    title: '라떼 곰 🐻',
                    desc: '직관적 의사전달. 격려와 칭찬의 따뜻한 텍스트 결합',
                    hash: '#픽셀화풍 #레트로게임',
                    labelColor: 'text-cyan-600 bg-cyan-50 border-cyan-100',
                    label: 'BEAR'
                  },
                  {
                    id: '3D Clay',
                    tag: '3D 클레이 스타일',
                    title: '일하는 토끼 🐰',
                    desc: '현실 밀착형 오피스 공감. 눈밑 그늘진 토끼',
                    hash: '#3D점토 #클레이스타일',
                    labelColor: 'text-pink-600 bg-pink-50 border-pink-100',
                    label: 'RABBIT'
                  }
                ].map((style) => (
                  <div
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`border p-4 rounded-2xl cursor-pointer transition-all duration-300 flex flex-col justify-between h-44 relative overflow-hidden group select-none ${
                      selectedStyle === style.id 
                        ? 'ring-4 ring-blue-500 border-blue-500 bg-blue-50/30 shadow-md shadow-blue-500/5' 
                        : 'border-gray-200 bg-white hover:shadow-md'
                    }`}
                  >
                    <div className="z-10">
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${style.labelColor}`}>
                        {style.tag}
                      </span>
                      <h3 className="text-md font-bold text-gray-800 mt-2">{style.title}</h3>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{style.desc}</p>
                    </div>
                    <div className="text-[10px] text-gray-400 italic mt-auto z-10">{style.hash}</div>
                    <div className="absolute -right-4 -bottom-4 text-7xl opacity-[0.02] group-hover:opacity-[0.05] transition-all duration-300 font-bold group-hover:scale-110">
                      {style.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div className={`bg-white border border-gray-200/60 rounded-3xl p-6 shadow-xl shadow-gray-200/30 ${activeMode === 'illust' ? '' : 'hidden'}`}>
              <h2 className="text-md font-bold mb-4 flex items-center gap-2 text-gray-800">
                <span className="w-1 h-4 bg-brand-primary rounded-full"></span>
                4. 커스텀 텍스트 및 프롬프트
              </h2>
              <div className="relative">
                <input 
                  type="text" 
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="예: '오늘 퇴근 각!', '최고다냥!', '힘내라곰!' (비워두면 스타일별 기본 문구 적용)"
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3.5 px-4 pr-12 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all duration-300"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-2">이모티콘 하단에 합성될 텍스트를 입력해 주세요. 나눔고딕 Bold 기반 산돌 스타일 한글 폰트가 자동 적용됩니다.</p>
            </div>

            {/* Quantity Selector */}
            <div className={`bg-white border border-gray-200/60 rounded-3xl p-6 shadow-xl shadow-gray-200/30 ${activeMode === 'illust' ? '' : 'hidden'}`}>
              <h2 className="text-md font-bold mb-4 flex items-center gap-2 text-gray-800">
                <span className="w-1 h-4 bg-brand-primary rounded-full"></span>
                생성 수량 및 소모 포인트 설정
              </h2>
              <div className="bg-gray-100 p-1 rounded-2xl flex gap-1 border border-gray-200/50">
                {[1, 6, 12, 24].map((qty) => (
                  <button
                    key={qty}
                    type="button"
                    onClick={() => setGenerateQty(qty)}
                    className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                      generateQty === qty
                        ? 'bg-white text-gray-800 shadow-md shadow-gray-200/30 transform scale-[1.02]'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {qty === 24 ? '24개 풀세트' : `${qty}개`}
                    <span className="block text-[9px] opacity-75 font-normal mt-0.5">{qty}P 소모</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button 
              onClick={() => {
                if (!walletAddress) {
                  setShowLoginModal(true)
                  return
                }
                if (points < generateQty) {
                  setRechargeStep('plan')
                  setShowRechargeModal(true)
                  return
                }
                triggerGenerate()
              }}
              style={{ display: activeMode === 'illust' ? 'flex' : 'none' }}
              disabled={isGenerating || (walletAddress && !isFormValid)}
              className={`w-full py-4.5 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 text-md select-none ${
                isGenerating || (walletAddress && !isFormValid)
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : !walletAddress
                    ? 'bg-[#FEE500] hover:bg-[#F0D200] text-[#191919] font-black active:scale-[0.98] shadow-lg shadow-yellow-500/10 cursor-pointer'
                    : points < generateQty
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white cursor-pointer active:scale-[0.98] shadow-lg shadow-orange-500/20'
                      : 'bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-blue-600 hover:to-indigo-600 text-white cursor-pointer active:scale-[0.98] shadow-lg shadow-blue-500/25'
              }`}
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                  {loadingStepText}
                </>
              ) : (
                <>
                  {!walletAddress ? (
                    <>
                      <span className="text-lg">🎉</span>
                      3초 만에 로그인하고 무료 이모티콘 3개 받기
                    </>
                  ) : points < generateQty ? (
                    <>
                      <Zap className="w-5 h-5 animate-bounce" />
                      ⚠️ 포인트가 부족합니다 (포인트 충전하기)
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      ✨ {generateQty}개 이모티콘 즉시 생성 ({generateQty} P 소모)
                    </>
                  )}
                </>
              )}
            </button>

          </section>

          {/* Right Column */}
          <section className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-white border border-gray-200/60 rounded-3xl p-6 shadow-xl shadow-gray-200/30 flex flex-col items-center justify-center min-h-[480px]">
              <h2 className="text-md font-bold mb-6 w-full flex items-center gap-2 text-gray-800">
                <span className="w-1 h-4 bg-brand-secondary rounded-full"></span>
                실시간 렌더링 & 비교 캔버스
              </h2>
              
              <div className="relative w-[320px] h-[320px] sm:w-[360px] sm:h-[360px] overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-inner flex items-center justify-center">
                
                {!previewUrl && !canvasResult && (
                  <div className="flex flex-col items-center justify-center gap-3 p-8 text-center text-gray-400 z-10">
                    <div className="w-16 h-16 rounded-full border border-gray-200 bg-white flex items-center justify-center mb-2 shadow-sm">
                      <Layers className="text-2xl text-gray-300 w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold">이미지와 스타일을 설정하고<br />변환을 실행하세요</p>
                    <p className="text-xs text-gray-400">360x360 규격 자동 가공 지원</p>
                  </div>
                )}

                {previewUrl && (
                  <img src={previewUrl} alt="Before" className="absolute inset-0 w-full h-full object-cover select-none" />
                )}

                {canvasResult && (
                  <div 
                    className="absolute inset-0 overflow-hidden border-r border-brand-primary select-none z-10"
                    style={{ width: isSliderVisible ? `${sliderPos}%` : '100%' }}
                  >
                    <img 
                      src={canvasResult} 
                      alt="After" 
                      className="absolute inset-0 w-[320px] h-[320px] sm:w-[360px] sm:h-[360px] max-w-none object-cover" 
                    />
                  </div>
                )}

                {canvasResult && isSliderVisible && (
                  <>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={sliderPos}
                      onChange={(e) => setSliderPos(Number(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20" 
                    />
                    <div 
                      className="absolute top-0 bottom-0 w-[2px] bg-brand-primary pointer-events-none z-20"
                      style={{ left: `${sliderPos}%` }}
                    >
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-brand-primary/20 border border-brand-primary backdrop-blur-md flex items-center justify-center shadow-lg">
                        <div className="flex gap-0.5 text-[10px] text-brand-primary font-bold">
                          ◀ ▶
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {canvasResult && (
                  <div className="absolute bottom-3 right-3 px-2 py-0.5 bg-white/80 backdrop-blur-sm border border-gray-200 rounded text-[10px] text-gray-500 z-20 font-mono">
                    360x360 PNG (72dpi)
                  </div>
                )}

              </div>

              {/* Download group */}
              <div className="w-full grid grid-cols-1 gap-3 mt-6">
                {canvasResult && (
                  <a 
                    href={canvasResult} 
                    download="emoji_market_sticker.png"
                    className="w-full py-3.5 bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-blue-600 hover:to-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-blue-500/20"
                  >
                    <Download className="w-5 h-5" />
                    카카오 규격 PNG 다운로드
                  </a>
                )}
                <div className="text-[11px] text-gray-400 text-center flex items-center justify-center gap-1.5">
                  <ShieldCheck className="text-brand-primary w-4 h-4" />
                  가상 DRM 보안: 이미지가 로컬 디스크에 저장되지 않고 실시간 스트리밍 렌더링됩니다.
                </div>
              </div>

            </div>

            {/* 안심 전송 키보드 셀렉터 보드 */}
            <EmojiKeyboardSelector 
              emojis={activeEmojis.map(item => ({
                id: item.uuid,
                uuid: item.uuid,
                style_type: item.style_type,
                file_path: `/api/view?uuid=${item.uuid}`
              }))} 
              isLoggedIn={!!walletAddress}
            />
          </section>

        </div>

        {/* History Library */}
        <EmojiLibrary 
          isLoggedIn={!!walletAddress}
          myEmojis={activeEmojis}
          emojiSets={emojiSets}
          activeSetIndex={activeSetIndex}
          setActiveSetIndex={setActiveSetIndex}
          selectedUUIDs={selectedUUIDs}
          toggleSelectAll={toggleSelectAll}
          handleCardClick={handleCardClick}
          deleteEmoji={deleteEmoji}
          onLoginClick={() => setShowLoginModal(true)}
        />

        {/* 추천인 보상 포인트 시스템 공유 카드 */}
        {walletAddress && (
          <div className="mt-8">
            <ReferralCard 
              walletAddress={walletAddress}
              referralCode={userReferralCode}
              referredBy={userReferredBy}
              onReferralSuccess={(newPoints) => {
                setPoints(newPoints)
                fetchPoints(walletAddress)
              }}
            />
          </div>
        )}

      </main>

      {/* Floating Action Bar */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 border border-gray-200/80 backdrop-blur-md px-6 py-4 rounded-3xl shadow-2xl flex items-center justify-between gap-6 z-40 transition-all duration-500 max-w-lg w-full ${
        selectedUUIDs.size > 0 ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'
      }`}>
        <div className="text-xs font-semibold text-gray-700">
          <span className="text-brand-primary font-bold text-sm">{selectedUUIDs.size}</span>개 선택됨 
          <span className="text-gray-400 text-[10px] block mt-0.5">(카카오 제안 규격 24종 권장)</span>
        </div>
        <button 
          onClick={downloadZipPackage}
          className="bg-gradient-to-r from-brand-primary to-indigo-600 hover:from-blue-600 hover:to-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all duration-300 shadow-lg shadow-blue-500/20 flex items-center gap-1.5 active:scale-95"
        >
          <FileArchive className="w-4 h-4" />
          제출용 ZIP 패키지 다운로드
        </button>
      </div>

      {/* Background Task Waiting Modal */}
      {isGenerating && (
        <div className="fixed inset-0 bg-white/75 backdrop-blur-xl flex flex-col items-center justify-center z-50 p-6">
          <div className="max-w-md w-full flex flex-col items-center gap-6 text-center">
            
            <div className="relative w-28 h-28 flex items-center justify-center character-bounce">
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/10 to-brand-secondary/10 rounded-full blur-xl"></div>
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center shadow-xl shadow-blue-500/20 relative border border-white/40">
                <Smile className="text-white text-5xl w-12 h-12" />
                <Sparkles className="text-yellow-300 w-6 h-6 absolute -top-2 -right-2 animate-pulse" />
              </div>
            </div>

            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              serverBusy 
                ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' 
                : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${serverBusy ? 'bg-amber-500' : 'bg-emerald-500'} animate-ping`}></span>
              <span>서버 대기 상황: {serverBusy ? '대기열 발생 (혼잡)' : '원활'}</span>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-900">서버에서 스티커를 만들고 있어요</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                AI 화풍 변환과 카카오 표준 규격 가공을 차례대로 수행합니다.<br />
                앱을 나가도 괜찮아요. 나중에 다시 열면 이어서 확인할 수 있어요.
              </p>
            </div>

            <div className="w-full space-y-2 bg-gray-50/80 p-4 rounded-2xl border border-gray-200/60 shadow-sm">
              <div className="flex justify-between text-xs text-gray-600 font-mono font-medium">
                <span>{loadingStepText}</span>
                <span>{loadingPercentText}%</span>
              </div>
              <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary transition-all duration-500" 
                  style={{ width: `${loadingPercentText}%` }}
                ></div>
              </div>
            </div>

            <div className="w-full bg-white border border-gray-200/80 p-5 rounded-3xl text-left space-y-3 relative overflow-hidden shadow-xl shadow-gray-200/20">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-brand-primary flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-800">나만의 스티커가 만들어졌을 때 알림을 받아볼까요?</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">알림에 동의하시면 백그라운드 생성이 끝났을 때 브라우저 푸시 알림을 즉시 띄워드립니다.</p>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button 
                  type="button" 
                  onClick={() => alert('알림 설정을 취소했습니다.')}
                  className="px-3.5 py-1.5 rounded-lg text-[10px] font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  나중에
                </button>
                <button 
                  type="button" 
                  onClick={requestPushPermission}
                  className="px-4 py-1.5 bg-brand-primary hover:bg-blue-600 text-white rounded-lg text-[10px] font-bold transition-all shadow-md shadow-blue-500/10"
                >
                  동의하고 알림받기
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
      {/* Toss Style Recharge Modal */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl relative border border-gray-100/50 transform scale-100 transition-all duration-500 animate-slide-up">
            
            {/* 닫기 버튼 */}
            <button
              type="button"
              onClick={() => {
                setShowRechargeModal(false)
                setRechargeStep('plan')
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>

            {rechargeStep === 'plan' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-1.5">
                    <Zap className="text-amber-500 w-5 h-5 fill-amber-500" />
                    포인트 간편 충전
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">포인트를 즉시 충전하여 대량 생성을 시작해 보세요.</p>
                </div>

                {/* 패키지 카드 목록 */}
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'starter', points: 10, price: '1,900원', tag: '인기' },
                    { id: 'value', points: 20, price: '3,500원', tag: null },
                    { id: 'creator', points: 50, price: '7,900원', tag: '가성비' },
                    { id: 'pro', points: 100, price: '14,900원', tag: null },
                  ].map((pkg) => (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPackage(pkg.id)}
                      className={`border p-3.5 rounded-2xl cursor-pointer flex flex-col justify-between transition-all duration-300 relative overflow-hidden select-none ${
                        selectedPackage === pkg.id
                          ? 'border-brand-primary bg-blue-50/20 shadow-md ring-2 ring-blue-500/10'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-start w-full">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          selectedPackage === pkg.id ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <Coins className="w-4 h-4" />
                        </div>
                        {pkg.tag && (
                          <span className="text-[8px] font-extrabold bg-blue-100 text-brand-primary px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                            {pkg.tag}
                          </span>
                        )}
                      </div>
                      <div className="mt-3">
                        <div className="text-xs font-bold text-gray-800">
                          {pkg.points} P 충전
                        </div>
                        <div className="text-[10px] text-gray-900 font-extrabold mt-1">{pkg.price}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 10대 소셜 결제수단 선택 영역 */}
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-gray-400 block">결제수단 선택</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'toss', label: '토스페이', color: 'border-blue-500 bg-blue-50/30 text-blue-600' },
                      { id: 'kakao', label: '카카오페이', color: 'border-yellow-400 bg-yellow-50/30 text-yellow-700' },
                      { id: 'culture', label: '문화상품권', color: 'border-amber-600 bg-amber-50/20 text-amber-800' }
                    ].map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setPaymentMethod(method.id)}
                        className={`py-2 rounded-xl text-[10px] font-bold text-center border transition-all cursor-pointer ${
                          paymentMethod === method.id
                            ? `${method.color} ring-2 ring-opacity-20`
                            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {method.id === 'toss' ? '🔵 ' : method.id === 'kakao' ? '💛 ' : '🎫 '}
                        {method.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRecharge(selectedPackage)}
                  className="w-full py-3.5 bg-brand-primary hover:bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
                >
                  <CreditCard className="w-4 h-4" />
                  {paymentMethod === 'toss'
                    ? '토스페이로 안전 결제하기'
                    : paymentMethod === 'kakao'
                      ? '카카오페이로 3초 결제하기'
                      : '문화상품권 PIN 번호로 충전하기'}
                </button>

                {/* Toss Style 포인트 이용 내역 타임라인 */}
                <div className="border-t border-gray-100 pt-5">
                  <h4 className="text-xs font-extrabold text-gray-800 mb-3 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-gray-400" />
                    포인트 이용 내역
                  </h4>
                  
                  {pointHistory.length === 0 ? (
                    <div className="py-7 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200/60 flex flex-col items-center justify-center gap-1">
                      <span className="text-lg">🎉</span>
                      <p className="text-[10px] font-bold text-gray-500">아직 포인트 거래 내역이 없습니다.</p>
                      <p className="text-[8px] text-gray-400">첫 이모티콘을 만들고 보너스를 확인해보세요!</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1 select-none scrollbar-thin">
                      {pointHistory.map((tx) => {
                        let icon = '🎨'
                        let amountColor = 'text-gray-900'
                        let amountSign = tx.amount > 0 ? `+${tx.amount}` : `${tx.amount}`
                        
                        if (tx.transaction_type === 'charge') {
                          icon = '💳'
                          amountColor = 'text-blue-600 font-black'
                        } else if (tx.transaction_type === 'gift') {
                          icon = '🎉'
                          amountColor = 'text-purple-600 font-black'
                        }
                        
                        const txDate = new Date(tx.created_at)
                        const formattedDate = `${String(txDate.getMonth() + 1).padStart(2, '0')}.${String(txDate.getDate()).padStart(2, '0')} ${String(txDate.getHours()).padStart(2, '0')}:${String(txDate.getMinutes()).padStart(2, '0')}`

                        return (
                          <div key={tx.id} className="flex justify-between items-center gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7.5 h-7.5 rounded-lg bg-gray-50 flex items-center justify-center text-xs border border-gray-100">
                                {icon}
                              </div>
                              <div>
                                <p className="text-[11px] font-bold text-gray-800 leading-tight">{tx.description}</p>
                                <p className="text-[8px] text-gray-400 mt-0.5">{formattedDate}</p>
                              </div>
                            </div>
                            <div className={`text-[11px] font-extrabold ${amountColor}`}>
                              {amountSign} P
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {rechargeStep === 'loading' && (
              <div className="py-12 flex flex-col items-center justify-center gap-6 text-center">
                <div className="w-16 h-16 rounded-full border-4 border-blue-500/25 border-t-brand-primary animate-spin"></div>
                <div className="space-y-1.5">
                  <h4 className="text-md font-bold text-gray-900">
                    {paymentMethod === 'toss'
                      ? '토스페이 결제 승인 요청 중'
                      : paymentMethod === 'kakao'
                        ? '카카오페이 결제 승인 요청 중'
                        : '문화상품권 PIN 번호 조회 중'}
                  </h4>
                  <p className="text-xs text-gray-400">결제창 안전 암호화 세션이 작동하고 있습니다.</p>
                </div>
              </div>
            )}

            {rechargeStep === 'success' && (
              <div className="py-8 flex flex-col items-center justify-center gap-6 text-center animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-100/50 text-emerald-500 flex items-center justify-center border border-emerald-200/50 shadow-md shadow-emerald-500/10">
                  <CheckCircle2 className="w-10 h-10 animate-scale-up" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-lg font-black text-gray-900">결제가 성공적으로 완료되었습니다!</h4>
                  <p className="text-xs text-gray-500">
                    충전된 포인트가 즉시 지급되었습니다.<br />
                    <span className="font-extrabold text-brand-primary text-sm block mt-1">현재 포인트: {points} P</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowRechargeModal(false)
                    setRechargeStep('plan')
                  }}
                  className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-bold text-sm shadow-md transition-all active:scale-[0.98]"
                >
                  확인 (이모티콘 구우러 가기)
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Hybrid Login Dialog Modal (투트랙 통합 로그인 관문) */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative border border-gray-100/50 transform scale-100 transition-all duration-500 animate-slide-up space-y-6 text-center">
            
            {/* 닫기 버튼 */}
            <button
              type="button"
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-primary to-indigo-600 text-white flex items-center justify-center shadow-md">
                <Smile className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-md font-black text-gray-900">로그인 방식 선택</h3>
                <p className="text-xs text-gray-400 mt-1">간편 로그인 및 지갑 주소 매핑을 모두 지원합니다.</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {/* 카카오 소셜 로그인 버튼 */}
              <button
                type="button"
                onClick={() => {
                  setShowLoginModal(false)
                  setShowKakaoModal(true)
                }}
                className="w-full py-3.5 bg-[#FEE500] hover:bg-[#F0D200] text-[#191919] font-black rounded-2xl text-xs transition-all active:scale-[0.98] shadow-sm shadow-yellow-500/10 flex items-center justify-center gap-2"
              >
                <span className="text-sm">💬</span>
                카카오 계정으로 3초 로그인
              </button>

              {/* 메타마스크 지갑 연결 버튼 */}
              <button
                type="button"
                onClick={connectWallet}
                disabled={isConnecting}
                className="w-full py-3.5 bg-[#f6851b]/10 hover:bg-[#f6851b]/20 text-[#f6851b] border border-[#f6851b]/20 font-black rounded-2xl text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span className="text-sm">🦊</span>
                메타마스크 지갑 연결 (Web3)
              </button>
            </div>

            <div className="text-[10px] text-gray-400 bg-gray-50 p-3 rounded-xl border border-gray-100 leading-relaxed text-left">
              💡 <b>보이지 않는 Web3 안내:</b> 카카오 로그인 시 계정 ID를 기반으로 가상 이더리움 지갑 주소가 1:1 결정적(Deterministic)으로 매핑되어 지갑 설치 없이도 포인트와 스티커를 안전하게 보관할 수 있습니다.
            </div>

          </div>
        </div>
      )}

      {/* Kakao Social Mock Login Modal */}
      {showKakaoModal && (
        <div className="fixed inset-0 bg-[#191919]/60 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative border border-yellow-200/50 transform scale-100 transition-all duration-500 animate-slide-up">
            
            {/* 닫기 버튼 */}
            <button
              type="button"
              onClick={() => {
                setShowKakaoModal(false)
                setKakaoNickname('')
                setKakaoIdInput('')
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-6 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-[#FEE500] flex items-center justify-center shadow-lg animate-pulse">
                  <span className="text-3xl">💬</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">카카오 3초 간편 가입</h3>
                  <p className="text-xs text-gray-400 mt-1">지갑 연동 없이 버튼 클릭 한 번에 즉시 가입됩니다.</p>
                </div>
              </div>

              {/* 1-Click 간편 로그인 단독 버튼 */}
              <button
                type="button"
                onClick={() => handleKakaoLogin()}
                className="w-full py-4.5 bg-[#FEE500] hover:bg-[#F0D200] text-[#191919] font-black rounded-2xl text-xs transition-all active:scale-[0.98] shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                💛 카카오 계정으로 3초 만에 시작하기 (무료 3P 즉시 지급)
              </button>
              
              <p className="text-[10px] text-gray-400">
                가입 보너스 3P는 지갑 주소 매핑 직후 지연 없이 즉시 적립됩니다.
              </p>
            </div>

          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-200/80 py-6 bg-white text-center text-xs text-gray-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p>&copy; 2026 이모지 마켓. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-gray-600 transition-colors">이용약관</a>
            <a href="#" className="hover:text-gray-600 transition-colors">개인정보처리방침</a>
            <span className="text-gray-200">|</span>
            <span className="font-mono text-[10px] text-brand-primary/80">BUILD FOR KAKAO EMOTICON SPEC</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
