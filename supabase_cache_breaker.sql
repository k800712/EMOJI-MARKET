-- 1. 새 컬럼 및 테이블에 대해 API 호출 역할(anon, authenticated, service_role)에 명시적으로 권한 재부여
GRANT ALL PRIVILEGES ON TABLE public.web3_users TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.point_transactions TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.emojis TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.emoji_market_listings TO postgres, anon, authenticated, service_role;

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
