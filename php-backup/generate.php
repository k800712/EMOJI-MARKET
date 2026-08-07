<?php
/**
 * Emoji Market - generate.php
 * AI 이모티콘 변환 처리 및 Supabase 클라우드 업로드 백엔드 컨트롤러
 */

// 에러 보고 비활성화 (JSON 출력 오염 방지)
ini_set('display_errors', 0);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');

require_once 'env_loader.php';
require_once 'db_supabase.php';

// UUIDv4 생성 함수
function generateUUIDv4() {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40); // version 4
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80); // variant
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

// 1. 환경 변수 로드
try {
    loadEnv(__DIR__ . '/.env');
} catch (Exception $e) {
    die(json_encode(['status' => 'error', 'message' => $e->getMessage()]));
}

// 2. 요청 검증
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    die(json_encode(['status' => 'error', 'message' => 'POST 요청만 허용됩니다.']));
}

if (!isset($_FILES['emoji_image']) || $_FILES['emoji_image']['error'] !== UPLOAD_ERR_OK) {
    die(json_encode(['status' => 'error', 'message' => '이미지 파일 업로드에 실패했습니다.']));
}

$style = $_POST['style'] ?? 'trendy'; // trendy, senior, office
$targetCountry = $_POST['target_country'] ?? 'KR'; // KR, JP, US, LA, FR
$customText = trim($_POST['text'] ?? ''); // 하단 텍스트 합성

$uploadedFile = $_FILES['emoji_image']['tmp_name'];
$fileType = $_FILES['emoji_image']['type'];

// 글로벌 감정문화 기반 프롬프트 매트릭스
$localizationPromptMap = [
    'KR' => "Focus on highly relatable, detailed situational descriptions (like studying, tired, or hungry) and rich, indirect non-verbal facial expressions favored by Korean 20s. Outline should be soft and cute.",
    'JP' => "Apply 'Kawaii' style with extremely cute, simplified characters. Prioritize subtle, non-verbal emotional cues and symbolic manga elements (like sweat drops or speech bubbles) reflecting Japanese Kaomoji culture. Minimize hard text.",
    'US' => "Incorporate bold outlines, American cartoon/comic book aesthetics, and clever metaphorical wit. Emphasize humorous, B-grade humor and slightly sarcastic or funny expressions.",
    'LA' => "Focus on highly dramatic, comically exaggerated expressions of frustration, struggle, or daily stress (like Monday blues). Accentuate dynamic eye and hand movements to convey passionate emotions.",
    'FR' => "Emphasize beautiful heart symbols, positive energy, aesthetically soft, pastel-toned colors, and highly artistic, romantic illustration styles."
];

$localizationPrompt = $localizationPromptMap[$targetCountry] ?? $localizationPromptMap['KR'];

try {
    $apiKey = getenv('GEMINI_API_KEY') ?: '';
    $isFallback = empty($apiKey) || $apiKey === 'your_actual_gemini_api_key_here';
    $convertedImageBytes = null;

    $originalData = file_get_contents($uploadedFile);

    // AI 생성 시도
    if (!$isFallback) {
        try {
            $convertedImageBytes = callGeminiImageToImage($originalData, $fileType, $style, $customText, $localizationPrompt, $apiKey);
        } catch (Exception $e) {
            $isFallback = true; // API 실패 시 로컬 GD 필터로 폴백
        }
    }

    // 로컬 GD 필터 가공 모드 (API Key 부재 또는 API 호출 실패 시 작동)
    if ($isFallback || !$convertedImageBytes) {
        $convertedImageBytes = applyLocalStyleFilter($uploadedFile, $fileType, $style);
    }

    // 카카오 표준 규격 가공 (360x360 px, 투명 PNG) 및 텍스트 오버레이
    $processedImageBytes = formatToKakaoSpecification($convertedImageBytes, $customText, $style);
    if (!$processedImageBytes) {
        throw new Exception("카카오 규격 이미지 변환에 실패했습니다.");
    }

    // Supabase 저장 파이프라인 가동
    $supabase = new SupabaseHelper();
    $uuid = generateUUIDv4();
    $fileName = "{$uuid}.png";
    $bucketName = "emojis";

    // 1. Storage 업로드
    $uploadSuccess = $supabase->uploadToStorage($bucketName, $fileName, $processedImageBytes, 'image/png');
    if (!$uploadSuccess) {
        throw new Exception("Supabase Storage 파일 업로드에 실패했습니다.");
    }

    // 2. DB 이력 기록
    $dbData = [
        'uuid' => $uuid,
        'style_type' => $style,
        'file_path' => $fileName
    ];

    $dbResult = $supabase->insertEmojiRecord('emojis', $dbData);
    if (!$dbResult) {
        throw new Exception("Supabase Database 이력 기록에 실패했습니다.");
    }

    // 3. 성공 응답 반환
    echo json_encode([
        'status' => 'success',
        'uuid' => $uuid
    ]);

} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
exit;

/**
 * Gemini Multimodal 및 Imagen API를 활용한 Image-to-Image 파이프라인 호출
 */
function callGeminiImageToImage(string $imageBytes, string $mimeType, string $style, string $customText, string $localizationPrompt, string $apiKey): ?string
{
    $analysisUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" . $apiKey;
    
    $styleInstructions = [
        'trendy' => "Trendy Style: Cute, round-shaped bread cat (식빵냥) yellow/cream-colored kitten style. Warm-toned and soft outlines, showing comically flat or emotional faces.",
        'senior' => "Senior Style: Soft teddy bear style. Warm brown/beige tones, cute cozy vibes, showing warm encouragements or positive greetings.",
        'office' => "Office Style: Cute bunny with slight dark circles under the eyes, showing relatable workplace emotions like Monday blues, keyboard typing, or eager notifications."
    ];

    $promptText = "Analyze the uploaded image. Analyze its shape, main features, colors, and pose. Then, rewrite a detailed English prompt to recreate this character as a cute individual emoji sticker using the following style guidelines and target market localization prompt.\n";
    $promptText .= "Style Guidelines: " . ($styleInstructions[$style] ?? $styleInstructions['trendy']) . "\n";
    $promptText .= "Localization Target Guidelines: " . $localizationPrompt . "\n";
    if ($customText) {
        $promptText .= "Custom Situational Text to reflect in design: " . $customText . "\n";
    }
    $promptText .= "Output format: Write exactly ONE descriptive English sentence starting with 'An emoticon sticker of...'.";

    $payload = [
        'contents' => [
            [
                'parts' => [
                    ['text' => $promptText],
                    [
                        'inlineData' => [
                            'mimeType' => $mimeType,
                            'data' => base64_encode($imageBytes)
                        ]
                    ]
                ]
            ]
        ]
    ];

    $ch = curl_init($analysisUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        throw new Exception("Gemini API 호출 실패 (코드: $httpCode)");
    }

    $analysisRes = json_decode($result, true);
    $generatedPrompt = $analysisRes['candidates'][0]['content']['parts'][0]['text'] ?? '';
    $generatedPrompt = trim($generatedPrompt);

    if (empty($generatedPrompt)) {
        throw new Exception("Gemini 이미지 분석 프롬프트 파싱 실패");
    }

    // 2단계: Imagen 3.0 API 호출
    $imagenUrl = "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages?key=" . $apiKey;
    $finalPrompt = $generatedPrompt . ", cute chibi sticker design, vector art style, isolated on clean solid white background, high resolution, 2d vector style";

    $imagenPayload = [
        'prompt' => $finalPrompt,
        'numberOfImages' => 1,
        'outputMimeType' => 'image/png',
        'aspectRatio' => '1:1'
    ];

    $ch = curl_init($imagenUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($imagenPayload));
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    $imagenResult = curl_exec($ch);
    $imagenHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($imagenHttpCode !== 200) {
        throw new Exception("Imagen API 이미지 생성 실패 (코드: $imagenHttpCode)");
    }

    $imagenRes = json_decode($imagenResult, true);
    $base64ImageBytes = $imagenRes['generatedImages'][0]['image']['imageBytes'] ?? null;

    if (!$base64ImageBytes) {
        throw new Exception("Imagen API 이미지 바이트 수신 실패");
    }

    return base64_decode($base64ImageBytes);
}

/**
 * GD 라이브러리를 활용하여 원본 이미지를 캐릭터 스타일 필터로 1차 가공하는 Fallback 엔진
 */
function applyLocalStyleFilter(string $tempFilePath, string $mimeType, string $style): string
{
    switch ($mimeType) {
        case 'image/png':
            $src = @imagecreatefrompng($tempFilePath);
            break;
        case 'image/webp':
            $src = @imagecreatefromwebp($tempFilePath);
            break;
        case 'image/gif':
            $src = @imagecreatefromgif($tempFilePath);
            break;
        case 'image/jpeg':
        case 'image/jpg':
        default:
            $src = @imagecreatefromjpeg($tempFilePath);
            break;
    }

    if (!$src) {
        throw new Exception("이미지 리소스 생성 실패");
    }

    $srcW = imagesx($src);
    $srcH = imagesy($src);

    $filtered = imagecreatetruecolor($srcW, $srcH);
    imagealphablending($filtered, false);
    imagesavealpha($filtered, true);
    
    $trans = imagecolorallocatealpha($filtered, 0, 0, 0, 127);
    imagefill($filtered, 0, 0, $trans);
    imagecopyresampled($filtered, $src, 0, 0, 0, 0, $srcW, $srcH, $srcW, $srcH);

    // 필터 효과
    switch ($style) {
        case 'trendy':
            imagefilter($filtered, IMG_FILTER_COLORIZE, 30, 15, -10);
            imagefilter($filtered, IMG_FILTER_SMOOTH, 5);
            break;
        case 'senior':
            imagefilter($filtered, IMG_FILTER_COLORIZE, 40, 20, -20);
            imagefilter($filtered, IMG_FILTER_CONTRAST, -10);
            break;
        case 'office':
            imagefilter($filtered, IMG_FILTER_COLORIZE, -10, 5, 30);
            imagefilter($filtered, IMG_FILTER_MEAN_REMOVAL);
            imagefilter($filtered, IMG_FILTER_SMOOTH, 2);
            break;
    }

    ob_start();
    imagepng($filtered);
    $outputBytes = ob_get_clean();

    imagedestroy($src);
    imagedestroy($filtered);

    return $outputBytes;
}

/**
 * 카카오톡 표준 규격으로 변환하고 텍스트 워터마크(이모티콘 문구)를 합성하는 최종 가공기
 */
function formatToKakaoSpecification(string $imageBytes, string $text, string $style): ?string
{
    $src = @imagecreatefromstring($imageBytes);
    if (!$src) return null;

    $srcW = imagesx($src);
    $srcH = imagesy($src);

    $targetSize = 360;
    $dst = imagecreatetruecolor($targetSize, $targetSize);
    imagealphablending($dst, false);
    imagesavealpha($dst, true);

    $transparentColor = imagecolorallocatealpha($dst, 0, 0, 0, 127);
    imagefill($dst, 0, 0, $transparentColor);
    imagealphablending($dst, true);

    $ratio = min($targetSize / $srcW, $targetSize / $srcH);
    $newW = (int)round($srcW * $ratio);
    $newH = (int)round($srcH * $ratio);

    $dstX = (int)round(($targetSize - $newW) / 2);
    $dstY = (int)round(($targetSize - $newH) / 2);

    imagecopyresampled($dst, $src, $dstX, $dstY, 0, 0, $newW, $newH, $srcW, $srcH);

    // 텍스트 합성
    if (!empty($text)) {
        $fontPath = __DIR__ . '/NanumGothic-Bold.ttf';
        if (!file_exists($fontPath)) {
            $fontUrl = "https://github.com/google/fonts/raw/main/ofl/nanumgothic/NanumGothic-Bold.ttf";
            $fontData = @file_get_contents($fontUrl);
            if ($fontData) {
                @file_put_contents($fontPath, $fontData);
            }
        }

        if (file_exists($fontPath)) {
            $fontSize = 20;
            $bbox = imagettfbbox($fontSize, 0, $fontPath, $text);
            $textW = $bbox[2] - $bbox[0];
            $x = (int)(($targetSize - $textW) / 2);
            $y = $targetSize - 35;

            $strokeColor = imagecolorallocate($dst, 0, 0, 0);
            $strokeWidth = 3;
            for ($sx = -$strokeWidth; $sx <= $strokeWidth; $sx++) {
                for ($sy = -$strokeWidth; $sy <= $strokeWidth; $sy++) {
                    if (sqrt($sx*$sx + $sy*$sy) <= $strokeWidth) {
                        imagettftext($dst, $fontSize, 0, $x + $sx, $y + $sy, $strokeColor, $fontPath, $text);
                    }
                }
            }

            switch ($style) {
                case 'trendy':
                    $textColor = imagecolorallocate($dst, 255, 230, 100);
                    break;
                case 'senior':
                    $textColor = imagecolorallocate($dst, 255, 255, 255);
                    break;
                case 'office':
                    $textColor = imagecolorallocate($dst, 130, 240, 255);
                    break;
                default:
                    $textColor = imagecolorallocate($dst, 255, 255, 255);
                    break;
            }
            
            imagettftext($dst, $fontSize, 0, $x, $y, $textColor, $fontPath, $text);
        }
    }

    ob_start();
    imagepng($dst);
    $binaryData = ob_get_clean();

    imagedestroy($src);
    imagedestroy($dst);

    return $binaryData;
}
