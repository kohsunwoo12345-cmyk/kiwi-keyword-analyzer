import { Env, json, geoFrom } from './_utils'

/** 국가코드 → 서비스 언어 매핑. 미지정/기타는 영어. */
const COUNTRY_LANG: Record<string, string> = {
  KR: 'ko', // 대한민국
  JP: 'ja', // 일본
  CN: 'zh', // 중국
  TW: 'zh', // 대만
  HK: 'zh', // 홍콩
  MO: 'zh', // 마카오
}

// GET /api/geo → 접속 IP의 국가와 추천 언어 (공개)
export const onRequestGet: PagesFunction<Env> = async ({ request }) => {
  const geo = geoFrom(request)
  const country = (geo.country || request.headers.get('CF-IPCountry') || '').toUpperCase()
  const lang = COUNTRY_LANG[country] || 'en'
  return json({ ok: true, country, city: geo.city || '', lang })
}
