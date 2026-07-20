// SUPERPLACE 마케팅 자동화 API 이식: GET/POST /api/marketing-automation?action=...
// 원본 handleMarketingAutomation 을 그대로 사용하되, 우리 환경(env)에 맞춰 정규화하여 전달.
//  - DB: resolveDB 로 D1 바인딩 확보
//  - RESEND_API_KEY: 대소문자 무관 조회(우리 환경은 Resend_API_KEY)
//  - RESEND_FROM: 우리 브랜드 발신자(cs@bygency.co) 기본값 → 캠페인 이메일이 우리 도메인으로 발송
import { resolveDB } from './_utils'
import { handleMarketingAutomation } from './_marketing'

function pick(env: any, ...names: string[]): string | undefined {
  for (const n of names) { const v = env?.[n]; if (v) return v as string }
  return undefined
}

function normalizeEnv(env: any) {
  return {
    ...env,
    DB: resolveDB(env),
    RESEND_API_KEY: pick(env, 'RESEND_API_KEY', 'Resend_API_KEY', 'RESEND_KEY', 'RESEND_APIKEY'),
    RESEND_FROM: env?.RESEND_FROM || 'BYGENCY <cs@bygency.co>',
  }
}

export const onRequest: PagesFunction = async ({ request, env }) => {
  return handleMarketingAutomation(request, normalizeEnv(env) as any)
}
