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
  Trash2
} from 'lucide-react'
import WalletConnect from '@/components/WalletConnect'
import EmojiKeyboardSelector from '@/components/EmojiKeyboardSelector'

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
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/get-history')
      const data = await res.json()
      if (data.status === 'success' && Array.isArray(data.data)) {
        setHistory(data.data)
        // 로드 성공 시 첫 번째 세트(최신 24종)를 기본 활성 및 기본 체크 선택
        const firstSet = data.data.slice(0, 24)
        setSelectedUUIDs(new Set(firstSet.map((item: any) => item.uuid)))
        setActiveSetIndex(0)
      }
    } catch (e) {
      console.error('Failed to load history', e)
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

  const handleFile = (file: File) => {
    if (!file.type.match('image.*')) {
      alert('이미지 파일만 업로드할 수 있습니다.')
      return
    }
    setUploadedFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
      setIsSliderVisible(false)
      setCanvasResult(null)
    }
    reader.readAsDataURL(file)
  }

  const resetUpload = () => {
    setUploadedFile(null)
    setPreviewUrl(null)
    setCanvasResult(null)
    setIsSliderVisible(false)
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
    setLoadingStepText('1/24번째 이모티콘 굽는 중... (대기열 등록)')
    setLoadingPercentText(0)

    const wallet = localStorage.getItem('wallet_session') || 'guest'
    const tasks = [...KAKAO_SITUATIONS]
    let completedCount = 0
    const totalTasks = tasks.length
    const concurrency = 2
    const queue = [...tasks]

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
            setLoadingStepText(`${completedCount + 1}/24번째 이모티콘 가공 중...`)
          } else {
            setLoadingStepText('24종 이모티콘 패키지가 완성되었습니다! 🎉')
          }
        }
      }
    }

    // 지정한 동시성 개수만큼 워커 구동 (타임아웃 우회)
    const workers = Array.from({ length: concurrency }, () => runWorker())
    await Promise.all(workers)

    if (notificationGranted) {
      new Notification('이모지 마켓', {
        body: '나만의 카카오 제안 규격 24종 이모티콘 패키지 빌드가 모두 완료되었습니다!',
      })
    }

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
      <header className="border-b border-gray-200/55 bg-white/75 backdrop-blur-lg sticky top-0 z-40">
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
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
              Next.js Full-Stack App
            </span>
            <WalletConnect />
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
              
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
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
                
                {!previewUrl ? (
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border border-gray-200 shadow-sm group-hover:scale-110 transition-transform duration-300">
                      <CloudUpload className="text-gray-400 group-hover:text-brand-primary transition-colors w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">여기에 이미지를 드래그 앤 드롭하거나 클릭하세요</p>
                      <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WEBP 지원 (1:1 비율 권장)</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 relative z-10 w-full max-w-[200px]" onClick={(e) => e.stopPropagation()}>
                    <img src={previewUrl} alt="Preview" className="w-full aspect-square object-cover rounded-xl border border-gray-200 shadow-sm" />
                    <button 
                      type="button" 
                      onClick={resetUpload}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center text-xs shadow-md transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Target Market Selector */}
            <div className="bg-white border border-gray-200/60 rounded-3xl p-6 shadow-xl shadow-gray-200/30">
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
            <div className="bg-white border border-gray-200/60 rounded-3xl p-6 shadow-xl shadow-gray-200/30">
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
            <div className="bg-white border border-gray-200/60 rounded-3xl p-6 shadow-xl shadow-gray-200/30">
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

            {/* Submit Button */}
            <button 
              onClick={triggerGenerate}
              disabled={!isFormValid}
              className={`w-full py-4 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 text-md ${
                isFormValid 
                  ? 'bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-blue-600 hover:to-indigo-600 text-white cursor-pointer active:scale-[0.98] shadow-lg shadow-blue-500/25' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Sparkles className="w-5 h-5" />
              AI 이모티콘 빌드 시작
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
                uuid: item.uuid,
                style_type: item.style_type,
                view_url: `/api/view?uuid=${item.uuid}`
              }))} 
            />
          </section>

        </div>

        {/* History Library */}
        <section className="border-t border-gray-200/80 pt-8 mt-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div>
              <h2 className="text-md font-bold flex items-center gap-2 text-gray-800">
                <span className="w-1 h-4 bg-brand-accent rounded-full animate-pulse"></span>
                카카오 제안용 24종 고정 액자형 보관함
              </h2>
              <p className="text-xs text-gray-500 mt-1">카카오 제출 규격에 부합하는 6열 4행 보드판입니다. 드롭다운으로 세트를 선택하세요.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              {emojiSets.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500 font-semibold">세트 선택:</span>
                  <select
                    value={activeSetIndex}
                    onChange={(e) => {
                      const idx = Number(e.target.value)
                      setActiveSetIndex(idx)
                      const currentSetUUIDs = emojiSets[idx]?.emojis.map(item => item.uuid) || []
                      setSelectedUUIDs(new Set(currentSetUUIDs))
                    }}
                    className="text-xs bg-white border border-gray-200 rounded-xl px-3 py-2 font-semibold text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  >
                    {emojiSets.map((set, idx) => (
                      <option key={set.id} value={idx}>
                        {set.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <button 
                onClick={toggleSelectAll}
                className="text-xs text-brand-primary hover:text-blue-600 font-semibold px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all"
              >
                현재 세트 전체 선택/해제
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 p-4 bg-gray-50/50 border border-gray-100 rounded-3xl animate-fade-in">
            {activeEmojis.length === 0 ? (
              <p className="text-xs text-gray-400 col-span-full text-center py-8">선택된 세트에 이모티콘이 없거나 생성된 이력이 존재하지 않습니다.</p>
            ) : (
              activeEmojis.map((item) => {
                const isSelected = selectedUUIDs.has(item.uuid)
                let badgeLabel = '트렌디'
                let badgeColor = 'text-violet-600 bg-violet-50 border-violet-100'
                if (item.style_type === 'senior') {
                  badgeLabel = '장년층'
                  badgeColor = 'text-cyan-600 bg-cyan-50 border-cyan-100'
                } else if (item.style_type === 'office') {
                  badgeLabel = '직장인'
                  badgeColor = 'text-pink-600 bg-pink-50 border-pink-100'
                }

                return (
                  <div
                    key={item.uuid}
                    onClick={() => handleCardClick(item.uuid)}
                    className={`bg-white border rounded-2xl p-3 flex flex-col items-center gap-2 cursor-pointer transition-all duration-300 relative group ${
                      isSelected 
                        ? 'ring-4 ring-blue-500 border-blue-500 bg-blue-50/20 shadow-md shadow-blue-500/5' 
                        : 'border-gray-200 bg-white hover:shadow-md'
                    }`}
                  >
                    <div className="absolute top-2 left-2 z-20">
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => {}} // 부모의 onClick에서 처리
                        className="w-5 h-5 rounded-full border border-gray-300 bg-white text-brand-primary cursor-pointer accent-blue-500" 
                      />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteEmoji(item.uuid)
                      }}
                      className="absolute top-2 right-2 z-20 p-1.5 rounded-lg bg-white/90 hover:bg-rose-50 border border-gray-200/60 hover:border-rose-200 text-gray-400 hover:text-rose-500 transition-all shadow-sm"
                      title="이모티콘 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-full aspect-square bg-gray-50 rounded-xl overflow-hidden relative flex items-center justify-center border border-gray-100">
                      <img 
                        src={`/api/view?uuid=${item.uuid}`} 
                        alt="Sticker"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${badgeColor}`}>
                      {badgeLabel}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {item.created_at.substring(0, 10)}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </section>

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
