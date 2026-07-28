/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  eslint: { ignoreDuringBuilds: true },
  // 앱 타입 오류는 빌드에서 막는다. functions/ 는 Workers 런타임이라 Next 빌드가 보지 못하므로
  // 별도 tsconfig 로 `npm run typecheck` 에서 함께 검사한다.
  typescript: { ignoreBuildErrors: false },
}

export default nextConfig
