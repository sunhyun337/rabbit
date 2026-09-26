/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 서버 라우트가 런타임에 fs로 읽는 설계원리.md를 서버리스 번들에 포함
  // (Vercel 등 배포 시 파일 누락 방지)
  outputFileTracingIncludes: {
    "/api/chat": ["./설계원리.md"],
  },
};

export default nextConfig;
