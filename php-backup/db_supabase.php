<?php
/**
 * db_supabase.php - Supabase Cloud Database & Storage Connector (cURL)
 */

class SupabaseHelper {
    private $url;
    private $anonKey;
    private $serviceKey;

    public function __construct() {
        $this->url = rtrim(getenv('SUPABASE_URL') ?: '', '/');
        $this->anonKey = getenv('SUPABASE_ANON_KEY') ?: '';
        $this->serviceKey = getenv('SUPABASE_BYPASS_RLS_KEY') ?: '';

        if (empty($this->url) || empty($this->anonKey) || empty($this->serviceKey)) {
            throw new Exception("Supabase 환경설정(SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_BYPASS_RLS_KEY)이 존재하지 않거나 비어있습니다. .env 파일을 확인해 주세요.");
        }
    }

    /**
     * Supabase Storage에 파일 바이너리를 업로드합니다.
     */
    public function uploadToStorage(string $bucket, string $path, string $binaryData, string $mimeType = 'image/png'): bool {
        $endpoint = "{$this->url}/storage/v1/object/{$bucket}/{$path}";
        
        $ch = curl_init($endpoint);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $binaryData);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "apikey: {$this->serviceKey}",
            "Authorization: Bearer {$this->serviceKey}",
            "Content-Type: {$mimeType}"
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        
        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return ($httpCode === 200 || $httpCode === 201);
    }

    /**
     * Supabase Database 테이블에 레코드를 삽입합니다.
     */
    public function insertEmojiRecord(string $table, array $data): ?array {
        $endpoint = "{$this->url}/rest/v1/{$table}";
        
        $ch = curl_init($endpoint);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "apikey: {$this->serviceKey}",
            "Authorization: Bearer {$this->serviceKey}",
            "Content-Type: application/json",
            "Prefer: return=representation"
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        
        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200 || $httpCode === 201) {
            $decoded = json_decode($result, true);
            return is_array($decoded) && isset($decoded[0]) ? $decoded[0] : null;
        }

        return null;
    }

    /**
     * Supabase Database emojis 테이블에서 UUID로 단일 레코드를 가져옵니다.
     */
    public function getEmojiRecordByUUID(string $table, string $uuid): ?array {
        $endpoint = "{$this->url}/rest/v1/{$table}?select=*&uuid=eq.{$uuid}";
        
        $ch = curl_init($endpoint);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "apikey: {$this->anonKey}",
            "Authorization: Bearer {$this->anonKey}"
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        
        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200) {
            $decoded = json_decode($result, true);
            return is_array($decoded) && isset($decoded[0]) ? $decoded[0] : null;
        }

        return null;
    }

    /**
     * Supabase Database emojis 테이블에서 최신 생성 이력 12개를 가져옵니다.
     */
    public function getLatestEmojiRecords(string $table, int $limit = 12): array {
        $endpoint = "{$this->url}/rest/v1/{$table}?select=*&order=created_at.desc&limit={$limit}";
        
        $ch = curl_init($endpoint);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "apikey: {$this->anonKey}",
            "Authorization: Bearer {$this->anonKey}"
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        
        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200) {
            $decoded = json_decode($result, true);
            return is_array($decoded) ? $decoded : [];
        }

        return [];
    }

    /**
     * Supabase Storage의 Private 파일에 대해 60초 유효한 Signed URL을 발급받습니다.
     */
    public function createSignedUrl(string $bucket, string $path, int $expiresIn = 60): ?string {
        $endpoint = "{$this->url}/storage/v1/object/sign/{$bucket}/{$path}";
        
        $payload = json_encode(["expiresIn" => $expiresIn]);
        
        $ch = curl_init($endpoint);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "apikey: {$this->serviceKey}",
            "Authorization: Bearer {$this->serviceKey}",
            "Content-Type: application/json"
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        
        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200) {
            $decoded = json_decode($result, true);
            if (isset($decoded['signedURL'])) {
                return $decoded['signedURL'];
            } elseif (isset($decoded['signedUrl'])) {
                return $decoded['signedUrl'];
            }
        }

        return null;
    }

    /**
     * Supabase Database emojis 테이블에서 복수 UUID로 레코드 목록을 가져옵니다.
     */
    public function getEmojiRecordsByUUIDs(array $uuids): array {
        if (empty($uuids)) return [];
        
        $uuidList = implode(',', array_map(function($u) { return '"' . trim($u) . '"'; }, $uuids));
        $endpoint = "{$this->url}/rest/v1/emojis?select=*&uuid=in.({$uuidList})";
        
        $ch = curl_init($endpoint);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "apikey: {$this->anonKey}",
            "Authorization: Bearer {$this->anonKey}"
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        
        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200) {
            $decoded = json_decode($result, true);
            return is_array($decoded) ? $decoded : [];
        }
        return [];
    }

    /**
     * Supabase Storage로부터 파일 바이너리를 다이렉트로 다운로드합니다.
     */
    public function downloadFromStorage(string $bucket, string $path): ?string {
        $endpoint = "{$this->url}/storage/v1/object/{$bucket}/{$path}";
        
        $ch = curl_init($endpoint);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "apikey: {$this->serviceKey}",
            "Authorization: Bearer {$this->serviceKey}"
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        
        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200) {
            return $result;
        }
        return null;
    }
}

