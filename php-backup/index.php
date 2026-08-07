<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>이모지 마켓 - AI 이모티콘 빌더 MVP</title>
    
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        brand: {
                            dark: '#f9fafb', /* gray-50 */
                            card: '#ffffff', /* white */
                            border: '#e5e7eb', /* gray-200 */
                            primary: '#007AFF', /* apple-blue */
                            secondary: '#6366f1', /* indigo-500 */
                            accent: '#ec4899', /* pink-500 */
                        }
                    },
                    fontFamily: {
                        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
                    }
                }
            }
        }
    </script>
    
    <!-- Google Fonts & Icons -->
    <link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- jQuery CDN -->
    <script src="https://code.jquery.com/jquery-3.6.4.min.js"></script>

    <style>
        body {
            font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
            background-color: #f9fafb;
            color: #1f2937;
        }
        /* 스크롤바 커스텀 */
        ::-webkit-scrollbar {
            width: 8px;
        }
        ::-webkit-scrollbar-track {
            background: #f9fafb;
        }
        ::-webkit-scrollbar-thumb {
            background: #d1d5db;
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #9ca3af;
        }
        /* 레인지 인풋 커스텀 */
        #compareSlider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 40px;
            height: 40px;
            background: transparent;
            cursor: ew-resize;
        }
        /* Toss 스타일 캐릭터 튕김 효과 애니메이션 */
        @keyframes tossBounce {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-15px) scale(0.95); }
        }
        .character-bounce {
            animation: tossBounce 1.6s ease-in-out infinite;
        }
    </style>
</head>
<body class="min-h-screen flex flex-col justify-between selection:bg-brand-primary selection:text-white pb-24">

    <!-- Header -->
    <header class="border-b border-gray-200/55 bg-white/75 backdrop-blur-lg sticky top-0 z-40">
        <div class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center shadow-md shadow-blue-500/20 animate-pulse">
                    <i class="fa-solid fa-face-smile-wink text-white text-xl"></i>
                </div>
                <div>
                    <h1 class="text-lg font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">이모지 마켓</h1>
                    <p class="text-[10px] text-blue-500 font-mono tracking-wider">AI EMOTICON BUILDER MVP</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                    <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
                    iOS Minimal Light Theme
                </span>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="flex-grow max-w-6xl w-full mx-auto px-4 py-8 flex flex-col gap-8">
        
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <!-- Left Column: Settings (Upload & Style Selection) -->
            <section class="lg:col-span-7 flex flex-col gap-6">
                
                <!-- Upload Area -->
                <div class="bg-white border border-gray-200/60 rounded-3xl p-6 shadow-xl shadow-gray-200/30 transition-all duration-300">
                    <h2 class="text-md font-bold mb-4 flex items-center gap-2 text-gray-800">
                        <span class="w-1 h-4 bg-brand-primary rounded-full"></span>
                        1. 캐릭터 베이스 이미지 업로드
                    </h2>
                    
                    <div id="dropzone" class="border-2 border-dashed border-gray-300 hover:border-brand-primary/50 bg-gray-50/50 hover:bg-gray-50/20 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300 relative group">
                        <input type="file" id="fileInput" accept="image/*" class="hidden">
                        
                        <div id="uploadPrompt" class="flex flex-col items-center gap-3 text-center">
                            <div class="w-12 h-12 rounded-full bg-white flex items-center justify-center border border-gray-200 shadow-sm group-hover:scale-110 transition-transform duration-300">
                                <i class="fa-solid fa-cloud-arrow-up text-gray-400 group-hover:text-brand-primary transition-colors"></i>
                            </div>
                            <div>
                                <p class="text-sm font-semibold text-gray-700">여기에 이미지를 드래그 앤 드롭하거나 클릭하세요</p>
                                <p class="text-xs text-gray-400 mt-1">JPEG, PNG, WEBP 지원 (1:1 비율 권장)</p>
                            </div>
                        </div>
                        
                        <div id="uploadPreview" class="hidden flex-col items-center gap-3 relative z-10 w-full max-w-[200px]">
                            <img id="previewImg" class="w-full aspect-square object-cover rounded-xl border border-gray-200 shadow-sm">
                            <button type="button" id="removeFileBtn" class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center text-xs shadow-md transition-colors">
                                <i class="fa-solid fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Global Target Market Selection Area -->
                <div class="bg-white border border-gray-200/60 rounded-3xl p-6 shadow-xl shadow-gray-200/30">
                    <h2 class="text-md font-bold mb-4 flex items-center gap-2 text-gray-800">
                        <span class="w-1 h-4 bg-brand-primary rounded-full"></span>
                        Target Market (타겟 국가)
                    </h2>
                    <div class="bg-gray-100 p-1 rounded-xl flex gap-1 w-full max-w-md mx-auto mb-6" id="countrySelector">
                        <button type="button" class="country-btn flex-1 text-center py-2 text-xs md:text-sm rounded-lg transition-all cursor-pointer bg-white shadow-sm font-semibold text-blue-600" data-country="KR">🇰🇷 KR (한국)</button>
                        <button type="button" class="country-btn flex-1 text-center py-2 text-xs md:text-sm rounded-lg transition-all cursor-pointer text-gray-500 hover:text-gray-800" data-country="JP">🇯🇵 JP (일본)</button>
                        <button type="button" class="country-btn flex-1 text-center py-2 text-xs md:text-sm rounded-lg transition-all cursor-pointer text-gray-500 hover:text-gray-800" data-country="US">🇺🇸 US (미국)</button>
                        <button type="button" class="country-btn flex-1 text-center py-2 text-xs md:text-sm rounded-lg transition-all cursor-pointer text-gray-500 hover:text-gray-800" data-country="LA">🇲🇽 LA (라틴)</button>
                        <button type="button" class="country-btn flex-1 text-center py-2 text-xs md:text-sm rounded-lg transition-all cursor-pointer text-gray-500 hover:text-gray-800" data-country="FR">🇫🇷 FR (프랑스)</button>
                    </div>
                    <p class="text-[11px] text-gray-400 mt-2">선택한 국가의 이모티콘 선호도와 정서적 특징에 최적화된 프롬프트가 이미지 분석 단계에 동적으로 융합됩니다.</p>
                </div>
                
                <!-- Style Selector -->
                <div class="bg-white border border-gray-200/60 rounded-3xl p-6 shadow-xl shadow-gray-200/30">
                    <h2 class="text-md font-bold mb-4 flex items-center gap-2 text-gray-800">
                        <span class="w-1 h-4 bg-brand-primary rounded-full"></span>
                        3. 캐릭터 기본 화풍 선택
                    </h2>
                    
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4" id="styleGrid">
                        <!-- Style 1: Trendy (식빵냥) -->
                        <div class="style-card border border-gray-200 bg-white p-4 rounded-2xl cursor-pointer transition-all duration-300 flex flex-col justify-between h-44 relative overflow-hidden group select-none hover:shadow-md" data-style="trendy">
                            <div class="z-10">
                                <span class="text-[10px] uppercase font-bold tracking-wider text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100">식빵냥 스타일</span>
                                <h3 class="text-md font-bold text-gray-800 mt-2 flex items-center gap-1.5">
                                    식빵냥
                                    <span class="text-gray-400 text-xs">🐱</span>
                                </h3>
                                <p class="text-xs text-gray-500 mt-1 leading-relaxed">애매모호하고 표정 변화 풍부. 위트와 뚱함의 조화</p>
                            </div>
                            <div class="text-[10px] text-gray-400 italic mt-auto z-10">#식빵냥화풍 #상황묘사</div>
                            <div class="absolute -right-4 -bottom-4 text-7xl opacity-[0.02] group-hover:opacity-[0.05] transition-all duration-300 font-bold group-hover:scale-110">CAT</div>
                        </div>
                        
                        <!-- Style 2: Senior (라떼 곰) -->
                        <div class="style-card border border-gray-200 bg-white p-4 rounded-2xl cursor-pointer transition-all duration-300 flex flex-col justify-between h-44 relative overflow-hidden group select-none hover:shadow-md" data-style="senior">
                            <div class="z-10">
                                <span class="text-[10px] uppercase font-bold tracking-wider text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-100">라떼곰 스타일</span>
                                <h3 class="text-md font-bold text-gray-800 mt-2 flex items-center gap-1.5">
                                    라떼 곰
                                    <span class="text-gray-400 text-xs">🐻</span>
                                </h3>
                                <p class="text-xs text-gray-500 mt-1 leading-relaxed">직관적 의사전달. 격려와 칭찬의 따뜻한 텍스트 결합</p>
                            </div>
                            <div class="text-[10px] text-gray-400 italic mt-auto z-10">#라떼곰 #따뜻한메시지</div>
                            <div class="absolute -right-4 -bottom-4 text-7xl opacity-[0.02] group-hover:opacity-[0.05] transition-all duration-300 font-bold group-hover:scale-110">BEAR</div>
                        </div>
                        
                        <!-- Style 3: Office (일하는 토끼) -->
                        <div class="style-card border border-gray-200 bg-white p-4 rounded-2xl cursor-pointer transition-all duration-300 flex flex-col justify-between h-44 relative overflow-hidden group select-none hover:shadow-md" data-style="office">
                            <div class="z-10">
                                <span class="text-[10px] uppercase font-bold tracking-wider text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-100">토끼 스타일</span>
                                <h3 class="text-md font-bold text-gray-800 mt-2 flex items-center gap-1.5">
                                    일하는 토끼
                                    <span class="text-gray-400 text-xs">🐰</span>
                                </h3>
                                <p class="text-xs text-gray-500 mt-1 leading-relaxed">현실 밀착형 오피스 공감. 눈밑 그늘진 토끼</p>
                            </div>
                            <div class="text-[10px] text-gray-400 italic mt-auto z-10">#현실리액션 #넵병兔</div>
                            <div class="absolute -right-4 -bottom-4 text-7xl opacity-[0.02] group-hover:opacity-[0.05] transition-all duration-300 font-bold group-hover:scale-110">RABBIT</div>
                        </div>
                    </div>
                </div>
                
                <!-- Custom Prompt Input -->
                <div class="bg-white border border-gray-200/60 rounded-3xl p-6 shadow-xl shadow-gray-200/30">
                    <h2 class="text-md font-bold mb-4 flex items-center gap-2 text-gray-800">
                        <span class="w-1 h-4 bg-brand-primary rounded-full"></span>
                        4. 커스텀 텍스트 및 프롬프트
                    </h2>
                    <div class="relative">
                        <input type="text" id="customPrompt" placeholder="예: '오늘 퇴근 각!', '최고다냥!', '힘내라곰!' (비워두면 스타일별 기본 문구 적용)" class="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3.5 px-4 pr-12 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all duration-300">
                        <div class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                            <i class="fa-solid fa-keyboard"></i>
                        </div>
                    </div>
                    <p class="text-[11px] text-gray-400 mt-2">이모티콘 하단에 합성될 텍스트를 입력해 주세요. 나눔고딕 Bold 기반 산돌 스타일 한글 폰트가 자동 적용됩니다.</p>
                </div>
                
                <!-- Generate Button -->
                <button id="generateBtn" disabled class="w-full py-4 bg-gray-100 text-gray-400 font-bold rounded-2xl flex items-center justify-center gap-2 cursor-not-allowed transition-all duration-300 text-md">
                    <i class="fa-solid fa-wand-magic-sparkles"></i>
                    AI 이모티콘 빌드 시작
                </button>
                
            </section>
            
            <!-- Right Column: Interactive Rendering Canvas (Before/After Slider) -->
            <section class="lg:col-span-5 flex flex-col gap-6">
                <div class="bg-white border border-gray-200/60 rounded-3xl p-6 shadow-xl shadow-gray-200/30 flex flex-col items-center justify-center min-h-[480px]">
                    <h2 class="text-md font-bold mb-6 w-full flex items-center gap-2 text-gray-800">
                        <span class="w-1 h-4 bg-brand-secondary rounded-full"></span>
                        실시간 렌더링 & 비교 캔버스
                    </h2>
                    
                    <!-- Main Slider Container -->
                    <div class="relative w-[320px] h-[320px] sm:w-[360px] sm:h-[360px] overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-inner flex items-center justify-center" id="canvasContainer">
                        
                        <!-- Empty State Placeholder -->
                        <div id="canvasPlaceholder" class="flex flex-col items-center justify-center gap-3 p-8 text-center text-gray-400 z-10">
                            <div class="w-16 h-16 rounded-full border border-gray-200 bg-white flex items-center justify-center mb-2 shadow-sm">
                                <i class="fa-solid fa-images text-2xl text-gray-300"></i>
                            </div>
                            <p class="text-sm font-semibold">이미지와 스타일을 설정하고<br>변환을 실행하세요</p>
                            <p class="text-xs text-gray-400">360x360 규격 자동 가공 지원</p>
                        </div>

                        <!-- Before Image (Original) -->
                        <img id="beforeImg" src="" class="hidden absolute inset-0 w-full h-full object-cover select-none">
                        
                        <!-- After Image Container (Converted & Resized) -->
                        <div id="afterImgContainer" class="hidden absolute inset-0 w-1/2 overflow-hidden border-r border-brand-primary select-none z-10">
                            <img id="afterImg" src="" class="absolute inset-0 w-[320px] h-[320px] sm:w-[360px] sm:h-[360px] max-w-none object-cover">
                        </div>
                        
                        <!-- Interactive Comparison Range Input -->
                        <input type="range" min="0" max="100" value="50" id="compareSlider" class="hidden absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20">
                        
                        <!-- Visual Slider Handle -->
                        <div id="sliderHandle" class="hidden absolute top-0 bottom-0 w-[2px] bg-brand-primary left-1/2 -ml-[1px] pointer-events-none z-20">
                            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-brand-primary/20 border border-brand-primary backdrop-blur-md flex items-center justify-center shadow-lg">
                                <div class="flex gap-0.5 text-[10px] text-brand-primary">
                                    <i class="fa-solid fa-caret-left"></i>
                                    <i class="fa-solid fa-caret-right"></i>
                                </div>
                            </div>
                        </div>

                        <!-- Badge overlay -->
                        <div id="resultBadge" class="hidden absolute bottom-3 right-3 px-2 py-0.5 bg-white/80 backdrop-blur-sm border border-gray-200 rounded text-[10px] text-gray-500 z-20 font-mono">
                            360x360 PNG (72dpi)
                        </div>
                    </div>

                    <!-- Action Button Group -->
                    <div class="w-full grid grid-cols-1 gap-3 mt-6">
                        <a id="downloadBtn" href="#" class="hidden w-full py-3.5 bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-blue-600 hover:to-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-blue-500/20">
                            <i class="fa-solid fa-download"></i>
                            카카오 규격 PNG 다운로드
                        </a>
                        <div class="text-[11px] text-gray-400 text-center flex items-center justify-center gap-1.5" id="drmNotice">
                            <i class="fa-solid fa-shield-halved text-brand-primary"></i>
                            가상 DRM 보안: 이미지가 로컬 디스크에 저장되지 않고 실시간 스트리밍 렌더링됩니다.
                        </div>
                    </div>
                </div>
            </section>
        </div>

        <!-- History Section (보관함) -->
        <section class="border-t border-gray-200/80 pt-8 mt-4">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h2 class="text-md font-bold flex items-center gap-2 text-gray-800">
                        <span class="w-1 h-4 bg-brand-accent rounded-full animate-pulse"></span>
                        나의 이모티콘 보관함 (Supabase 실시간 클라우드 동기화)
                    </h2>
                    <p class="text-xs text-gray-500 mt-1">원하는 이모티콘을 다중 선택하여 ZIP 패키지로 한번에 다운로드할 수 있습니다.</p>
                </div>
                <button id="selectAllBtn" class="text-xs text-brand-primary hover:text-blue-600 font-semibold flex items-center gap-1">
                    <i class="fa-regular fa-square-check"></i>
                    전체 선택/해제
                </button>
            </div>
            
            <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4" id="historyGrid">
                <!-- 비동기로 로드될 생성 이력들 -->
            </div>
        </section>
        
    </main>

    <!-- Floating Actions Bar (하단 다중 선택 제어바) -->
    <div id="floatingActionBar" class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 border border-gray-200 backdrop-blur-md px-6 py-4 rounded-3xl shadow-2xl flex items-center justify-between gap-6 z-40 transition-all duration-500 transform translate-y-24 opacity-0 max-w-lg w-full">
        <div class="text-xs font-semibold text-gray-700">
            <span id="selectedCount" class="text-brand-primary font-bold text-sm">0</span>개 선택됨 
            <span class="text-gray-400 text-[10px] block mt-0.5">(카카오 제안 규격 24종 권장)</span>
        </div>
        <button id="zipDownloadBtn" class="bg-gradient-to-r from-brand-primary to-indigo-600 hover:from-blue-600 hover:to-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all duration-300 shadow-lg shadow-blue-500/20 flex items-center gap-1.5 active:scale-95">
            <i class="fa-solid fa-file-zipper"></i>
            제출용 ZIP 패키지 다운로드
        </button>
    </div>

    <!-- Toss Style Background Task View (비동기 대기 모달) - Frost Glass iOS Theme -->
    <div id="loadingModal" class="hidden fixed inset-0 bg-white/75 backdrop-blur-xl flex flex-col items-center justify-center z-50 p-6">
        <div class="max-w-md w-full flex flex-col items-center gap-6 text-center">
            
            <!-- 튕김 헬퍼 캐릭터 -->
            <div class="relative w-28 h-28 flex items-center justify-center character-bounce">
                <div class="absolute inset-0 bg-gradient-to-tr from-brand-primary/10 to-brand-secondary/10 rounded-full blur-xl"></div>
                <div class="w-24 h-24 rounded-3xl bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center shadow-xl shadow-blue-500/20 relative border border-white/40">
                    <i class="fa-solid fa-face-smile-wink text-white text-5xl"></i>
                    <i class="fa-solid fa-wand-magic-sparkles text-yellow-300 text-2xl absolute -top-2 -right-2 animate-pulse"></i>
                </div>
            </div>

            <!-- 서버 상태 배지 -->
            <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" id="serverStatusBadge">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span>서버 대기 상황: 원활</span>
            </div>

            <div class="space-y-2">
                <h3 class="text-xl font-bold text-gray-900" id="loadingTitle">서버에서 스티커를 만들고 있어요</h3>
                <p class="text-sm text-gray-500 leading-relaxed" id="loadingSubtitle">
                    AI 화풍 변환과 카카오 표준 규격 가공을 차례대로 수행합니다.<br>
                    앱을 나가도 괜찮아요. 나중에 다시 열면 이어서 확인할 수 있어요.
                </p>
            </div>

            <!-- 3단계 로딩 진행 상태바 -->
            <div class="w-full space-y-2 bg-gray-50/80 p-4 rounded-2xl border border-gray-200/60 shadow-sm">
                <div class="flex justify-between text-xs text-gray-600 font-mono font-medium">
                    <span id="loadingStepText">1단계: 대기열 등록 완료</span>
                    <span id="loadingPercentText">15%</span>
                </div>
                <!-- Progress Bar -->
                <div class="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <div id="loadingProgressBar" class="h-full bg-gradient-to-r from-brand-primary to-brand-secondary transition-all duration-500" style="width: 15%;"></div>
                </div>
            </div>

            <!-- 웹 푸시 알림 동의 팝업 카드 -->
            <div class="w-full bg-white border border-gray-200/80 p-5 rounded-3xl text-left space-y-3 relative overflow-hidden shadow-xl shadow-gray-200/20">
                <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-lg bg-blue-500/10 text-brand-primary flex items-center justify-center shrink-0">
                        <i class="fa-solid fa-bell"></i>
                    </div>
                    <div>
                        <h4 class="text-xs font-bold text-gray-800">나만의 스티커가 만들어졌을 때 알림을 받아볼까요?</h4>
                        <p class="text-[10px] text-gray-400 mt-0.5 leading-relaxed">알림에 동의하시면 백그라운드 생성이 끝났을 때 브라우저 푸시 알림을 즉시 띄워드립니다.</p>
                    </div>
                </div>
                <div class="flex gap-2 justify-end pt-1">
                    <button type="button" id="pushDenyBtn" class="px-3.5 py-1.5 rounded-lg text-[10px] font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">나중에</button>
                    <button type="button" id="pushAllowBtn" class="px-4 py-1.5 bg-brand-primary hover:bg-blue-600 text-white rounded-lg text-[10px] font-bold transition-all shadow-md shadow-blue-500/10">동의하고 알림받기</button>
                </div>
            </div>

        </div>
    </div>

    <!-- Footer -->
    <footer class="border-t border-gray-200/80 py-6 bg-white text-center text-xs text-gray-400">
        <div class="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p>&copy; 2026 이모지 마켓. All rights reserved.</p>
            <div class="flex items-center gap-4">
                <a href="#" class="hover:text-gray-600 transition-colors">이용약관</a>
                <a href="#" class="hover:text-gray-600 transition-colors">개인정보처리방침</a>
                <span class="text-gray-200">|</span>
                <span class="font-mono text-[10px] text-brand-primary/80">BUILD FOR KAKAO EMOTICON SPEC</span>
            </div>
        </div>
    </footer>

    <!-- Interactive Javascript Logic -->
    <script>
        $(document).ready(function() {
            let uploadedFile = null;
            let selectedStyle = null;
            let selectedCountry = 'KR'; // 타겟 시장 기본값 🇰🇷
            let currentBlobUrl = null;
            let selectedUUIDs = new Set();

            // 페이지 로딩 시 최신 이력 12개 가져오기
            loadHistory();

            // --- 0. Global Target Country Selector ---
            $('.country-btn').on('click', function() {
                $('.country-btn')
                    .removeClass('bg-white shadow-sm font-semibold text-blue-600')
                    .addClass('text-gray-500 hover:text-gray-800');
                
                $(this)
                    .removeClass('text-gray-500 hover:text-gray-800')
                    .addClass('bg-white shadow-sm font-semibold text-blue-600');
                
                selectedCountry = $(this).data('country');
            });

            // --- 1. Drag & Drop Upload Logic ---
            const $dropzone = $('#dropzone');
            const $fileInput = $('#fileInput');
            const $uploadPrompt = $('#uploadPrompt');
            const $uploadPreview = $('#uploadPreview');
            const $previewImg = $('#previewImg');
            const $removeFileBtn = $('#removeFileBtn');

            $dropzone.on('click', function(e) {
                if (e.target !== $removeFileBtn[0] && !$removeFileBtn.has(e.target).length) {
                    $fileInput.click();
                }
            });

            $fileInput.on('change', function() {
                const files = this.files;
                if (files.length > 0) {
                    handleFile(files[0]);
                }
            });

            $dropzone.on('dragenter dragover', function(e) {
                e.preventDefault();
                e.stopPropagation();
                $dropzone.addClass('border-brand-primary bg-blue-50/30 scale-[0.99]');
            });

            $dropzone.on('dragleave drop', function(e) {
                e.preventDefault();
                e.stopPropagation();
                $dropzone.removeClass('border-brand-primary bg-blue-50/30 scale-[0.99]');
            });

            $dropzone.on('drop', function(e) {
                const dt = e.originalEvent.dataTransfer;
                const files = dt.files;
                if (files.length > 0) {
                    handleFile(files[0]);
                }
            });

            function handleFile(file) {
                if (!file.type.match('image.*')) {
                    alert('이미지 파일만 업로드할 수 있습니다.');
                    return;
                }
                uploadedFile = file;
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    $previewImg.attr('src', e.target.result);
                    $uploadPrompt.addClass('hidden');
                    $uploadPreview.removeClass('hidden');
                    
                    $('#beforeImg').attr('src', e.target.result);
                    checkFormValidity();
                }
                reader.readAsDataURL(file);
            }

            $removeFileBtn.on('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                resetUpload();
            });

            function resetUpload() {
                uploadedFile = null;
                $fileInput.val('');
                $uploadPrompt.removeClass('hidden');
                $uploadPreview.addClass('hidden');
                $previewImg.attr('src', '');
                $('#beforeImg').attr('src', '');
                checkFormValidity();
                resetCanvas();
            }

            // --- 2. Style Card Selection ---
            $('.style-card').on('click', function() {
                $('.style-card')
                    .removeClass('ring-4 ring-blue-500 border-blue-500 bg-blue-50/30 shadow-md shadow-blue-500/5')
                    .addClass('border-gray-200 bg-white');
                
                $(this)
                    .removeClass('border-gray-200 bg-white')
                    .addClass('ring-4 ring-blue-500 border-blue-500 bg-blue-50/30 shadow-md shadow-blue-500/5');
                
                selectedStyle = $(this).data('style');
                checkFormValidity();
            });

            // --- 3. Form Validation ---
            function checkFormValidity() {
                if (uploadedFile && selectedStyle) {
                    $('#generateBtn')
                        .removeAttr('disabled')
                        .removeClass('bg-gray-100 text-gray-400 cursor-not-allowed')
                        .addClass('bg-gradient-to-r from-brand-primary to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white cursor-pointer active:scale-[0.98] shadow-lg shadow-blue-500/25');
                } else {
                    $('#generateBtn')
                        .attr('disabled', true)
                        .addClass('bg-gray-100 text-gray-400 cursor-not-allowed')
                        .removeClass('bg-gradient-to-r from-brand-primary to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white cursor-pointer active:scale-[0.98] shadow-lg shadow-blue-500/25');
                }
            }

            function resetCanvas() {
                $('#canvasPlaceholder').removeClass('hidden');
                $('#beforeImg').addClass('hidden');
                $('#afterImgContainer').addClass('hidden');
                $('#compareSlider').addClass('hidden');
                $('#sliderHandle').addClass('hidden');
                $('#resultBadge').addClass('hidden');
                $('#downloadBtn').addClass('hidden');
                
                if (currentBlobUrl) {
                    URL.revokeObjectURL(currentBlobUrl);
                    currentBlobUrl = null;
                }
            }

            // --- 4. Before/After 1:1 Slider ---
            const $slider = $('#compareSlider');
            const $afterContainer = $('#afterImgContainer');
            const $handle = $('#sliderHandle');

            $slider.on('input', function() {
                const value = $(this).val();
                $afterContainer.css('width', value + '%');
                $handle.css('left', value + '%');
            });

            // --- 5. Push Notification Request ---
            let notificationGranted = false;
            
            $('#pushAllowBtn').on('click', function() {
                if (!("Notification" in window)) {
                    alert("이 브라우저는 웹 알림을 지원하지 않습니다.");
                    return;
                }
                
                Notification.requestPermission().then(permission => {
                    if (permission === "granted") {
                        notificationGranted = true;
                        alert("웹 알림 승인 완료! 생성 완료 시 즉시 알려드릴게요.");
                        new Notification("이모지 마켓", {
                            body: "나만의 특별한 스티커 알림 설정이 완료되었습니다!",
                            icon: "/favicon.ico"
                        });
                    }
                });
            });

            $('#pushDenyBtn').on('click', function() {
                alert("알림 받기를 연기하셨습니다. 작업 완료 후에 화면을 통해 직접 확인해 주세요.");
            });

            // --- 6. AI Emoticon Generate (Supabase + Toss UI + Global Country Link) ---
            $('#generateBtn').on('click', function() {
                if (!uploadedFile || !selectedStyle) return;

                // 토스형 로딩 모달 초기화
                $('#loadingProgressBar').css('width', '15%');
                $('#loadingStepText').text('1단계: 대기열 등록 완료');
                $('#loadingPercentText').text('15%');
                
                const isBusy = Math.random() > 0.6;
                const $badge = $('#serverStatusBadge');
                if (isBusy) {
                    $badge.removeClass('bg-emerald-500/10 text-emerald-600 border-emerald-500/20')
                          .addClass('bg-amber-500/10 text-amber-600 border-amber-500/20')
                          .html('<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span><span>서버 대기 상황: 대기열 발생 (혼잡)</span>');
                } else {
                    $badge.addClass('bg-emerald-500/10 text-emerald-600 border-emerald-500/20')
                          .removeClass('bg-amber-500/10 text-amber-600 border-amber-500/20')
                          .html('<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span><span>서버 대기 상황: 원활</span>');
                }

                $('#loadingModal').removeClass('hidden');

                let processTimer = setTimeout(() => {
                    $('#loadingProgressBar').css('width', '60%');
                    $('#loadingStepText').text('2단계: AI 화풍 가공 및 텍스트 합성 중...');
                    $('#loadingPercentText').text('60%');
                }, 1200);

                let processTimer2 = setTimeout(() => {
                    $('#loadingProgressBar').css('width', '90%');
                    $('#loadingStepText').text('3단계: Supabase 안전 백업 및 동기화 중...');
                    $('#loadingPercentText').text('90%');
                }, 3500);

                const formData = new FormData();
                formData.append('emoji_image', uploadedFile);
                formData.append('style', selectedStyle);
                formData.append('target_country', selectedCountry); // 타겟 국가 전달
                formData.append('text', $('#customPrompt').val());

                $.ajax({
                    url: 'generate.php',
                    type: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false,
                    dataType: 'json',
                    success: function(response) {
                        clearTimeout(processTimer);
                        clearTimeout(processTimer2);

                        if (response.status === 'success') {
                            $('#loadingProgressBar').css('width', '100%');
                            $('#loadingPercentText').text('100%');
                            $('#loadingStepText').text('완료되었습니다!');
                            
                            if (notificationGranted) {
                                new Notification("이모지 마켓", {
                                    body: "축하합니다! 나만의 스티커 가공이 완료되었습니다.",
                                    icon: "view.php?uuid=" + response.uuid
                                });
                            }

                            setTimeout(() => {
                                loadEmojiToCanvas(response.uuid, true);
                            }, 500);
                        } else {
                            $('#loadingModal').addClass('hidden');
                            alert('이모티콘 생성 실패: ' + response.message);
                            resetCanvas();
                        }
                    },
                    error: function() {
                        clearTimeout(processTimer);
                        clearTimeout(processTimer2);
                        $('#loadingModal').addClass('hidden');
                        alert('이모티콘 생성 요청 중 서버 오류가 발생했습니다.');
                        resetCanvas();
                    }
                });
            });

            // --- 7. Supabase 실시간 동기화 보관함 로드 ---
            function loadHistory() {
                $.ajax({
                    url: 'get_history.php',
                    type: 'GET',
                    dataType: 'json',
                    success: function(res) {
                        if (res.status === 'success' && Array.isArray(res.data)) {
                            const $grid = $('#historyGrid');
                            $grid.empty();
                            
                            if (res.data.length === 0) {
                                $grid.html('<p class="text-xs text-gray-400 col-span-full text-center py-8">아직 생성된 이모티콘 이력이 없습니다.</p>');
                                return;
                            }

                            res.data.forEach(item => {
                                let label = '트렌디';
                                let colorClass = 'text-violet-600 bg-violet-50 border-violet-100';
                                if (item.style_type === 'senior') {
                                    label = '장년층';
                                    colorClass = 'text-cyan-600 bg-cyan-50 border-cyan-100';
                                } else if (item.style_type === 'office') {
                                    label = '직장인';
                                    colorClass = 'text-pink-600 bg-pink-50 border-pink-100';
                                }

                                const isChecked = selectedUUIDs.has(item.uuid);
                                const ringClass = isChecked ? 'ring-4 ring-blue-500 border-blue-500 bg-blue-50/20 shadow-md shadow-blue-500/5' : 'border-gray-200 bg-white hover:shadow-md';

                                const cardHtml = `
                                    <div class="history-card bg-white border ${ringClass} rounded-2xl p-3 flex flex-col items-center gap-2 cursor-pointer transition-all duration-300 relative group" data-uuid="${item.uuid}">
                                        
                                        <!-- 원형 체크박스 -->
                                        <div class="absolute top-2 left-2 z-20">
                                            <input type="checkbox" class="emoji-checkbox w-5 h-5 rounded-full border border-gray-300 bg-white text-brand-primary cursor-pointer focus:ring-0 accent-blue-500" data-uuid="${item.uuid}" ${isChecked ? 'checked' : ''}>
                                        </div>

                                        <div class="w-full aspect-square bg-gray-50 rounded-xl overflow-hidden relative flex items-center justify-center border border-gray-100">
                                            <img src="view.php?uuid=${item.uuid}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy">
                                        </div>
                                        <span class="text-[9px] font-bold ${colorClass} px-2 py-0.5 rounded border uppercase tracking-wider">${label}</span>
                                        <span class="text-[10px] text-gray-400 font-mono">${item.created_at.substring(0, 10)}</span>
                                    </div>
                                `;
                                $grid.append(cardHtml);
                            });
                        }
                    }
                });
            }

            // 보관함 카드 클릭 분기
            $(document).on('click', '.history-card', function(e) {
                const uuid = $(this).data('uuid');
                const $checkbox = $(this).find('.emoji-checkbox');

                if (e.target.classList.contains('emoji-checkbox') || e.target.type === 'checkbox') {
                    toggleSelectCard(uuid, $checkbox.is(':checked'), $(this));
                } else {
                    const nextCheckState = !$checkbox.is(':checked');
                    $checkbox.prop('checked', nextCheckState);
                    toggleSelectCard(uuid, nextCheckState, $(this));
                }
            });

            function toggleSelectCard(uuid, isChecked, $card) {
                if (isChecked) {
                    selectedUUIDs.add(uuid);
                    $card.removeClass('border-gray-200 bg-white').addClass('ring-4 ring-blue-500 border-blue-500 bg-blue-50/20 shadow-md shadow-blue-500/5');
                } else {
                    selectedUUIDs.delete(uuid);
                    $card.removeClass('ring-4 ring-blue-500 border-blue-500 bg-blue-50/20 shadow-md shadow-blue-500/5').addClass('border-gray-200 bg-white');
                }

                updateFloatingActionBar();
            }

            function updateFloatingActionBar() {
                const count = selectedUUIDs.size;
                $('#selectedCount').text(count);

                const $bar = $('#floatingActionBar');
                if (count > 0) {
                    $bar.removeClass('translate-y-24 opacity-0').addClass('translate-y-0 opacity-100');
                } else {
                    $bar.removeClass('translate-y-0 opacity-100').addClass('translate-y-24 opacity-0');
                }
            }

            // 전체 선택 / 해제
            let isAllSelected = false;
            $('#selectAllBtn').on('click', function() {
                const $checkboxes = $('.emoji-checkbox');
                isAllSelected = !isAllSelected;

                $checkboxes.each(function() {
                    const uuid = $(this).data('uuid');
                    const $card = $(this).closest('.history-card');
                    $(this).prop('checked', isAllSelected);
                    
                    if (isAllSelected) {
                        selectedUUIDs.add(uuid);
                        $card.removeClass('border-gray-200 bg-white').addClass('ring-4 ring-blue-500 border-blue-500 bg-blue-50/20 shadow-md shadow-blue-500/5');
                    } else {
                        selectedUUIDs.delete(uuid);
                        $card.removeClass('ring-4 ring-blue-500 border-blue-500 bg-blue-50/20 shadow-md shadow-blue-500/5').addClass('border-gray-200 bg-white');
                    }
                });

                updateFloatingActionBar();
            });

            // --- 8. ZIP 패키징 내보내기 (export.php 연동) ---
            $('#zipDownloadBtn').on('click', function() {
                const uuidsArray = Array.from(selectedUUIDs);
                if (uuidsArray.length === 0) return;

                $('#loadingProgressBar').css('width', '50%');
                $('#loadingPercentText').text('50%');
                $('#loadingStepText').text('서버에서 ZIP 파일 압축 진행 중...');
                $('#loadingTitle').text('제출용 ZIP 패키지 생성 중');
                $('#loadingSubtitle').text('스토리지에서 선택하신 이모티콘을 취합하고 있습니다. 잠시만 기다려주세요.');
                $('#loadingModal').removeClass('hidden');

                $.ajax({
                    url: 'export.php',
                    type: 'POST',
                    data: JSON.stringify({ uuids: uuidsArray }),
                    contentType: 'application/json',
                    xhrFields: {
                        responseType: 'blob'
                    },
                    success: function(blob) {
                        $('#loadingModal').addClass('hidden');
                        
                        $('#loadingTitle').text('서버에서 스티커를 만들고 있어요');
                        $('#loadingSubtitle').text('AI 화풍 변환과 카카오 표준 규격 가공을 차례대로 수행합니다. 앱을 나가도 괜찮아요. 나중에 다시 열면 이어서 확인할 수 있어요.');

                        const zipUrl = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.style.display = 'none';
                        a.href = zipUrl;
                        a.download = 'emoji_market_package.zip';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(zipUrl);

                        selectedUUIDs.clear();
                        $('.emoji-checkbox').prop('checked', false);
                        $('.history-card').removeClass('ring-4 ring-blue-500 border-blue-500 bg-blue-50/20 shadow-md shadow-blue-500/5').addClass('border-gray-200 bg-white');
                        updateFloatingActionBar();
                    },
                    error: function() {
                        $('#loadingModal').addClass('hidden');
                        $('#loadingTitle').text('서버에서 스티커를 만들고 있어요');
                        $('#loadingSubtitle').text('AI 화풍 변환과 카카오 표준 규격 가공을 차례대로 수행합니다. 앱을 나가도 괜찮아요. 나중에 다시 열면 이어서 확인할 수 있어요.');
                        alert('ZIP 압축 내보내기 처리 중 서버 오류가 발생했습니다.');
                    }
                });
            });

            // 캔버스에 이모지 로드 (Blob DRM)
            function loadEmojiToCanvas(uuid, isFreshGenerate = false) {
                if (!isFreshGenerate) {
                    $('#canvasPlaceholder').addClass('hidden');
                    $('#canvasLoading').removeClass('hidden');
                    $('#downloadBtn').addClass('hidden');
                }

                $.ajax({
                    url: 'view.php?uuid=' + uuid,
                    type: 'GET',
                    xhrFields: {
                        responseType: 'blob'
                    },
                    success: function(blob) {
                        $('#loadingModal').addClass('hidden');
                        $('#canvasLoading').addClass('hidden');

                        if (currentBlobUrl) {
                            URL.revokeObjectURL(currentBlobUrl);
                        }
                        currentBlobUrl = URL.createObjectURL(blob);

                        if (isFreshGenerate) {
                            $('#beforeImg').removeClass('hidden');
                            $afterContainer.css('width', '50%').removeClass('hidden');
                            $handle.css('left', '50%').removeClass('hidden');
                            $slider.val(50).removeClass('hidden');
                        } else {
                            $('#beforeImg').addClass('hidden');
                            $afterContainer.css('width', '100%').removeClass('hidden');
                            $handle.addClass('hidden');
                            $slider.addClass('hidden');
                        }

                        $('#afterImg').attr('src', currentBlobUrl);
                        $('#resultBadge').removeClass('hidden');
                        $('#downloadBtn')
                            .attr('href', currentBlobUrl)
                            .attr('download', `emoji_market_${uuid}.png`)
                            .removeClass('hidden');

                        if (isFreshGenerate) {
                            loadHistory();
                        }
                    },
                    error: function() {
                        $('#loadingModal').addClass('hidden');
                        $('#canvasLoading').addClass('hidden');
                        alert('보안 이미지를 불러오는 데 실패했습니다.');
                        resetCanvas();
                    }
                });
            }
        });
    </script>
</body>
</html>
