<?php
/**
 * Emoji Market - export.php
 * 카카오톡 표준 규격 일괄 압축 ZIP 패키징 익스포터
 */

// 에러 보고 비활성화 (바이너리 오염 방지)
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once 'env_loader.php';
require_once 'db_supabase.php';

try {
    loadEnv(__DIR__ . '/.env');
    
    // POST 데이터 파싱 (JSON 및 일반 POST 폼 데이터 둘 다 지원)
    $uuids = [];
    $rawInput = json_decode(file_get_contents('php://input'), true);
    if (is_array($rawInput) && isset($rawInput['uuids'])) {
        $uuids = $rawInput['uuids'];
    } elseif (isset($_POST['uuids']) && is_array($_POST['uuids'])) {
        $uuids = $_POST['uuids'];
    }

    if (empty($uuids) || !is_array($uuids)) {
        throw new Exception("선택된 이모티콘이 없습니다.");
    }

    $supabase = new SupabaseHelper();
    
    // 1. Supabase Database에서 일괄 조회
    $records = $supabase->getEmojiRecordsByUUIDs($uuids);
    if (empty($records)) {
        throw new Exception("선택된 이모티콘 데이터가 클라우드에 존재하지 않습니다.");
    }

    // 2. 사용자가 요청한 UUID 순서대로 재정렬 (순서 유지)
    $recordsMap = [];
    foreach ($records as $rec) {
        $recordsMap[$rec['uuid']] = $rec;
    }

    $sortedRecords = [];
    foreach ($uuids as $uuid) {
        if (isset($recordsMap[$uuid])) {
            $sortedRecords[] = $recordsMap[$uuid];
        }
    }

    if (empty($sortedRecords)) {
        throw new Exception("패키징할 수 있는 이모티콘이 존재하지 않습니다.");
    }

    // 3. ZipArchive를 활용하여 메모리 기반 패키징 처리 (임시 파일 쓰기 기법 결합)
    $zip = new ZipArchive();
    $zipFilePath = tempnam(sys_get_temp_dir(), 'emoji_zip');
    
    if ($zip->open($zipFilePath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== TRUE) {
        throw new Exception("ZIP 파일을 생성할 수 없습니다.");
    }

    $index = 1;
    $bucketName = "emojis";
    
    foreach ($sortedRecords as $record) {
        $fileName = $record['file_path'];
        // Storage Private 파일 바이너리 direct 다운로드
        $binaryData = $supabase->downloadFromStorage($bucketName, $fileName);
        
        if ($binaryData) {
            // 카카오 스튜디오 표준 규격명 매핑 (emotion_01.png, emotion_02.png ...)
            $standardName = sprintf('emotion_%02d.png', $index);
            $zip->addFromString($standardName, $binaryData);
            $index++;
        }
    }

    $zip->close();

    if ($index === 1) {
        @unlink($zipFilePath);
        throw new Exception("압축할 이미지 데이터를 스토리지로부터 내려받지 못했습니다.");
    }

    // 4. 압축 성공 즉시 ZIP 파일 Direct 다운로드 헤더 전송
    header("Content-Type: application/zip");
    header("Content-Disposition: attachment; filename=emoji_market_package.zip");
    header("Content-Length: " . filesize($zipFilePath));
    header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
    header("Pragma: no-cache");

    readfile($zipFilePath);
    @unlink($zipFilePath); // 다운로드 후 임시 파일 즉시 파기
    exit;

} catch (Exception $e) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
    exit;
}
