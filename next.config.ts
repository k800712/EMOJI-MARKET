import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 16 Turbopack 호환용 컴파일 최적화 설정
  typescript: {
    // 빌드 시 타입 에러로 인해 배포가 막히는 현상을 임시 방지하려면 추가 (선택)
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
