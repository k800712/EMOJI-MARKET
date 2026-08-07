<?php
/**
 * Emoji Market - view.php
 * 보안 DRM 이미지 스트리밍 게이트웨이 컨트롤러
 */

// 에러 보고 비활성화 (바이너리 출력 오염 방지)
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once 'env_loader.php';
require_once 'db_supabase.php';

try {
    loadEnv(__DIR__ . '/.env');
    
    $uuid = $_GET['uuid'] ?? '';
    if (empty($uuid)) {
        throw new Exception("잘못된 요청입니다. UUID가 존재하지 않습니다.");
    }

    $supabase = new SupabaseHelper();
    
    // 1. Supabase DB에서 UUID로 file_path 조회
    $record = $supabase->getEmojiRecordByUUID('emojis', $uuid);
    if (!$record || empty($record['file_path'])) {
        throw new Exception("해당 UUID의 이모티콘을 찾을 수 없습니다.");
    }
    
    $filePath = $record['file_path'];
    $bucketName = "emojis";

    // 2. Supabase Storage API를 통해 60초 서명된 Signed URL 획득
    $signedUrl = $supabase->createSignedUrl($bucketName, $filePath, 60);
    if (!$signedUrl) {
        throw new Exception("보안 이미지 URL 생성 실패");
    }

    // 3. 서명된 URL을 통해 바이너리 이미지 다운로드
    $ch = curl_init($signedUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    $imageData = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 || !$imageData) {
        throw new Exception("이미지 리소스 획득 실패");
    }

    // 4. 캐싱 방지 헤더 설정 및 실시간 바이너리 스트리밍 (DRM)
    header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
    header("Cache-Control: post-check=0, pre-check=0", false);
    header("Pragma: no-cache");
    header("Content-Type: image/png");

    echo $imageData;
    exit;

} catch (Exception $e) {
    // 오류가 발생한 경우 기본 투명 1x1 픽셀 PNG 반환하여 깨지는 박스 방지
    header("Content-Type: image/png");
    echo base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
    exit;
}
