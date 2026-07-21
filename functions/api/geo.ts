import { Env, json, geoFrom } from './_utils'

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
}

// GET /api/geo → 접속 IP의 국가와 추천 언어 (공개)
export const onRequestGet: PagesFunction<Env> = async ({ request }) => {
  const geo = geoFrom(request)
  const country = (geo.country || request.headers.get('CF-IPCountry') || '').toUpperCase()
  const lang = COUNTRY_LANG[country] || 'en'
  return json({ ok: true, country, city: geo.city || '', lang })
}
