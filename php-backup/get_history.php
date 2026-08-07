<?php
/**
 * Emoji Market - get_history.php
 * 최신 생성 이력 12개를 조회하여 JSON 배열로 반환하는 API
 */

// 에러 보고 비활성화 (JSON 출력 오염 방지)
ini_set('display_errors', 0);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');

require_once 'env_loader.php';
require_once 'db_supabase.php';

try {
    loadEnv(__DIR__ . '/.env');
    
    $supabase = new SupabaseHelper();
    
    // 최신 생성 이력 12개 쿼리 (created_at desc)
    $records = $supabase->getLatestEmojiRecords('emojis', 12);
    
    echo json_encode([
        'status' => 'success',
        'data' => $records
    ]);

} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
exit;
