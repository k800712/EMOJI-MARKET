<?php
/**
 * Emoji Market - .env File Loader
 * .env 파일을 안전하게 로드하여 $_ENV, $_SERVER 및 getenv()에 등록합니다.
 */

function loadEnv(string $filePath): void
{
    if (!file_exists($filePath)) {
        throw new Exception("환경 설정 파일(.env)을 찾을 수 없습니다. 경로를 확인해 주세요: " . basename($filePath));
    }

    if (!is_readable($filePath)) {
        throw new Exception("환경 설정 파일(.env)을 읽을 수 없습니다. 파일 권한을 확인해 주세요.");
    }

    $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    
    foreach ($lines as $line) {
        $line = trim($line);
        
        // 주석이거나 빈 줄이면 건너뜀
        if (empty($line) || str_starts_with($line, '#')) {
            continue;
        }
        
        // KEY=VALUE 분리
        if (!str_contains($line, '=')) {
            continue;
        }
        
        list($key, $value) = explode('=', $line, 2);
        
        $key = trim($key);
        $value = trim($value);
        
        // 값의 따옴표 제거 (싱글 쿼트, 더블 쿼트)
        if ((str_starts_with($value, '"') && str_ends_with($value, '"')) ||
            (str_starts_with($value, "'") && str_ends_with($value, "'"))) {
            $value = substr($value, 1, -1);
        }
        
        // 환경 변수 등록
        putenv("{$key}={$value}");
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
    }
}
