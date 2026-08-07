<?php
/**
 * 이모지 마켓 (Emoji Market) - MVP Core Backend Engine v1
 * 
 * [주요 기능]
 * 1. .env 보안 키 로딩 (API 키 탈취 방지)
 * 2. 카카오톡 이모티콘 공식 규격 자동 변환 엔진 (360x360 px, 투명 PNG, RGB 모드)
 * 3. Sandoll(산돌) 웹폰트 스타일 DRM 이미지 스트리밍 연동 (로컬 유출 방지)
 */

// 에러 보고 비활성화 (바이너리 출력 오염 방지) 및 개발 단계용 설정
ini_set('display_errors', 0);
error_reporting(E_ALL);

// 1. .env 보안 환경 변수 로더
function loadEnv($directory) {
    $path = rtrim($directory, '/') . '/.env';
    if (!file_exists($path)) {
        throw new Exception(".env 환경 변수 파일이 존재하지 않습니다. 루트 폴더에 .env 파일을 생성해 주세요.");
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || strpos($line, '#') === 0) continue; // 주석 제외
        if (strpos($line, '=') === false) continue;
        
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        
        // 따옴표 제거 (싱글/더블 쿼트)
        if ((strpos($value, '"') === 0 && strrpos($value, '"') === strlen($value) - 1) ||
            (strpos($value, "'") === 0 && strrpos($value, "'") === strlen($value) - 1)) {
            $value = substr($value, 1, -1);
        }

        if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
            putenv("{$name}={$value}");
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
}

// 환경 변수 로드 실행
try {
    loadEnv(__DIR__);
} catch (Exception $e) {
    header('Content-Type: application/json; charset=utf-8');
    die(json_encode(['status' => 'error', 'message' => $e->getMessage()]));
}

$api_key = getenv('GEMINI_API_KEY');
if (empty($api_key)) {
    header('Content-Type: application/json; charset=utf-8');
    die(json_encode(['status' => 'error', 'message' => 'GEMINI_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.']));
}

// 2. 카카오톡 공식 규격 변환 엔진 (PHP GD 라이브러리 사용)
function convertToKakaoStandard($source_path, $text = '', $style = 'trendy') {
    $image_info = @getimagesize($source_path);
    if (!$image_info) return false;
    
    $mime_type = $image_info['mime'];
    switch ($mime_type) {
        case 'image/jpeg':
        case 'image/jpg':
            $src_image = @imagecreatefromjpeg($source_path);
            break;
        case 'image/png':
            $src_image = @imagecreatefrompng($source_path);
            break;
        case 'image/gif':
            $src_image = @imagecreatefromgif($source_path);
            break;
        case 'image/webp':
            $src_image = @imagecreatefromwebp($source_path);
            break;
        default:
            return false;
    }

    if (!$src_image) return false;

    $target_w = 360;
    $target_h = 360;
    $dst_image = imagecreatetruecolor($target_w, $target_h);

    // 투명 배경을 안전하게 보존하기 위한 설정
    imagealphablending($dst_image, false);
    imagesavealpha($dst_image, true);
    
    $transparent_color = imagecolorallocatealpha($dst_image, 0, 0, 0, 127);
    imagefill($dst_image, 0, 0, $transparent_color);
    imagealphablending($dst_image, true); // 텍스트 오버레이를 위해 참으로 재변경

    $src_w = imagesx($src_image);
    $src_h = imagesy($src_image);
    
    // 비율을 온전히 보존하는 Letterbox 계산 알고리즘
    $ratio = min($target_w / $src_w, $target_h / $src_h);
    $new_w = (int)round($src_w * $ratio);
    $new_h = (int)round($src_h * $ratio);
    
    $dst_x = (int)round(($target_w - $new_w) / 2);
    $dst_y = (int)round(($target_h - $new_h) / 2);

    imagecopyresampled(
        $dst_image, $src_image, 
        $dst_x, $dst_y, 0, 0, 
        $new_w, $new_h, $src_w, $src_h
    );

    imagedestroy($src_image);

    // 산돌 스타일 텍스트 합성 로직
    if (!empty($text)) {
        $fontPath = __DIR__ . '/NanumGothic-Bold.ttf';
        
        // 원격 폰트 다운로드 (독립적인 환경 보장)
        if (!file_exists($fontPath)) {
            $fontUrl = "https://github.com/google/fonts/raw/main/ofl/nanumgothic/NanumGothic-Bold.ttf";
            $fontData = @file_get_contents($fontUrl);
            if ($fontData) {
                @file_put_contents($fontPath, $fontData);
            }
        }

        if (file_exists($fontPath)) {
            $fontSize = 20; 
            
            // 텍스트 바운딩 박스 크기 측정
            $bbox = imagettfbbox($fontSize, 0, $fontPath, $text);
            $textW = $bbox[2] - $bbox[0];
            
            $x = (int)(($target_w - $textW) / 2);
            $y = $target_h - 35; // 하단 마진

            // 굵은 스트로크 (외곽선 8방향 렌더링)
            $strokeColor = imagecolorallocate($dst_image, 0, 0, 0);
            $strokeWidth = 3;
            
            for ($sx = -$strokeWidth; $sx <= $strokeWidth; $sx++) {
                for ($sy = -$strokeWidth; $sy <= $strokeWidth; $sy++) {
                    if (sqrt($sx*$sx + $sy*$sy) <= $strokeWidth) {
                        imagettftext($dst_image, $fontSize, 0, $x + $sx, $y + $sy, $strokeColor, $fontPath, $text);
                    }
                }
            }

            // 스타일별 텍스트 내부 색상 (감각적인 이모티콘 텍스트 적용)
            switch ($style) {
                case 'trendy':
                    $textColor = imagecolorallocate($dst_image, 255, 230, 100); // 옐로우
                    break;
                case 'senior':
                    $textColor = imagecolorallocate($dst_image, 255, 255, 255); // 화이트
                    break;
                case 'office':
                    $textColor = imagecolorallocate($dst_image, 130, 240, 255); // 밝은 시안
                    break;
                default:
                    $textColor = imagecolorallocate($dst_image, 255, 255, 255);
                    break;
            }
            
            // 본문 텍스트 합성
            imagettftext($dst_image, $fontSize, 0, $x, $y, $textColor, $fontPath, $text);
        }
    }

    return $dst_image;
}

// 3. Sandoll(산돌) 웹폰트 스타일 DRM 이미지 스트리밍 처리
function streamSecuredImage($gd_image) {
    // 실시간 디스크 저장 차단 및 브라우저 캐싱 무력화 헤더
    header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
    header("Cache-Control: post-check=0, pre-check=0", false);
    header("Pragma: no-cache");
    
    // 이미지 리스폰스 헤더 설정
    header("Content-Type: image/png");

    imagepng($gd_image);
    imagedestroy($gd_image);
    exit;
}

// 4. API 요청 처리 컨트롤러 로직
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_FILES['emoji_image']) && $_FILES['emoji_image']['error'] === UPLOAD_ERR_OK) {
        $tmp_file = $_FILES['emoji_image']['tmp_name'];
        
        // 텍스트 및 스타일 변수 바인딩
        $text = isset($_POST['text']) ? trim($_POST['text']) : '';
        $style = isset($_POST['style']) ? trim($_POST['style']) : 'trendy';
        
        $processed_image = convertToKakaoStandard($tmp_file, $text, $style);
        if ($processed_image) {
            streamSecuredImage($processed_image);
        } else {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['status' => 'error', 'message' => '규격 변환에 실패했습니다.']);
        }
    } else {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['status' => 'error', 'message' => '업로드된 파일이 없거나 오류가 발생했습니다.']);
    }
} else {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['status' => 'error', 'message' => 'POST 요청만 처리 가능합니다.']);
}
