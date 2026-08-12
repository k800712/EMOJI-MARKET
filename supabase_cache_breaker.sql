-- 1. 현재 SCHEMA 내에 생성되어 존재하는 모든 테이블 및 시퀀스에 대해 API 호출 역할(anon, authenticated, service_role)에 명시적으로 권한 일괄 재부여
-- 개별 테이블명을 명시하는 대신 ALL TABLES를 사용하여 아직 생성되지 않은 테이블로 인한 42P01(relation does not exist) 오류를 원천 예방합니다.
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 2. 일반 세션이 아닌, Superuser 권한을 가진 SECURITY DEFINER 함수를 통해 포스트그레스 시스템 레벨에서 NOTIFY 강제 송출
CREATE OR REPLACE FUNCTION public.force_api_schema_reload()
RETURNS void AS $$
BEGIN
  -- PostgREST 캐시 갱신 신호를 최상위 권한(SECURITY DEFINER)으로 송출합니다.
  EXECUTE 'NOTIFY pgrst, ''reload schema''';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 함수 실행하여 캐시 리로드 강제 트리거
SELECT public.force_api_schema_reload();

-- 3. 물리적인 스키마 카탈로그 자체를 수정하여 PostgREST가 강제로 캐시를 갱신하도록 강제 자극 (더미 컬럼 생성 후 즉시 드롭)
ALTER TABLE public.web3_users ADD COLUMN IF NOT EXISTS temporary_cache_breaker_trigger TEXT;
ALTER TABLE public.web3_users DROP COLUMN IF EXISTS temporary_cache_breaker_trigger;

-- 다시 한번 캐시 리로드 실행
SELECT public.force_api_schema_reload();

-- 4. 실제 이름을 저장할 real_name 컬럼 물리 추가 및 캐시 리로드
ALTER TABLE public.web3_users ADD COLUMN IF NOT EXISTS real_name TEXT;
SELECT public.force_api_schema_reload();

-- 5. 웹 푸시 고유 키 및 미확인 세트 개수 컬럼 안전 추가 및 캐시 리로드
ALTER TABLE public.web3_users ADD COLUMN IF NOT EXISTS push_subscription JSONB;
ALTER TABLE public.web3_users ADD COLUMN IF NOT EXISTS pending_emoji_notifications INTEGER DEFAULT 0;
SELECT public.force_api_schema_reload();

-- 6. emojis 테이블에 status 및 is_viewed 컬럼 안전 추가 및 캐시 리로드
ALTER TABLE public.emojis ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';
ALTER TABLE public.emojis ADD COLUMN IF NOT EXISTS is_viewed BOOLEAN DEFAULT true;
SELECT public.force_api_schema_reload();

-- 7. web3_users 테이블에 profile_image_url 및 status 컬럼 물리 추가 및 캐시 리로드
ALTER TABLE public.web3_users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE public.web3_users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
SELECT public.force_api_schema_reload();

-- 7. web3_users 테이블에 profile_image_url 컬럼 안전 추가 및 캐시 리로드
ALTER TABLE public.web3_users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
SELECT public.force_api_schema_reload();

