import { Env, json, geoFrom, isAIBot } from './_utils'

/** 국가코드 → 서비스 언어 매핑. 미지정/기타는 영어. */
const COUNTRY_LANG: Record<string, string> = {
  KR: 'ko', // 대한민국
  JP: 'ja', // 일본
  CN: 'zh', TW: 'zh', HK: 'zh', MO: 'zh', // 중화권
  // 스페인어권
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es', EC: 'es', GT: 'es', CU: 'es', BO: 'es', DO: 'es', HN: 'es', PY: 'es', SV: 'es', NI: 'es', CR: 'es', PA: 'es', UY: 'es',
  // 프랑스어권
  FR: 'fr', BE: 'fr', LU: 'fr', MC: 'fr', SN: 'fr', CI: 'fr',
  // 독일어권
  DE: 'de', AT: 'de', CH: 'de', LI: 'de',
  // 이탈리아어권
  IT: 'it', SM: 'it', VA: 'it',
  // 힌디어권(인도)
  IN: 'hi',
  // 아랍어권
  SA: 'ar', AE: 'ar', EG: 'ar', IQ: 'ar', JO: 'ar', KW: 'ar', QA: 'ar', BH: 'ar', OM: 'ar', LB: 'ar', SY: 'ar', YE: 'ar', LY: 'ar', DZ: 'ar', MA: 'ar', TN: 'ar', SD: 'ar', PS: 'ar',
  // 포르투갈어권
  BR: 'pt', PT: 'pt', AO: 'pt', MZ: 'pt',
  // 러시아어권
  RU: 'ru', BY: 'ru', KZ: 'ru', KG: 'ru',
  // 인도네시아어권
  ID: 'id',
}

// GET /api/geo → 접속 IP의 국가와 추천 언어 (공개)
export const onRequestGet: PagesFunction<Env> = async ({ request }) => {
  const geo = geoFrom(request)
  const country = (geo.country || request.headers.get('CF-IPCountry') || '').toUpperCase()
  // Gemini·Claude·GPT 등 AI 크롤러/에이전트는 국가와 무관하게 항상 한국어로 노출
  if (isAIBot(request.headers.get('User-Agent'))) {
    return json({ ok: true, country, city: geo.city || '', lang: 'ko', ai: true })
  }
  const lang = COUNTRY_LANG[country] || 'en'
  return json({ ok: true, country, city: geo.city || '', lang })
}
