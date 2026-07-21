// SUPERPLACE 이식: GET /api/landing/traffic-report/:token — 공개 공유 리포트 데이터(로그인 불필요)
import { Env, resolveDB, ensureSchema } from '../../_utils'
import { ensureLandingSchema } from '../_lschema'

const j = (o: any, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const token = String((params as any).token || '')
  const db = resolveDB(env)
  if (!db) return j({ ok: false, error: 'DB 없음' }, 500)
  await ensureSchema(db); await ensureLandingSchema(db)
  const share: any = await db.prepare(`SELECT * FROM landing_traffic_shares WHERE token = ?`).bind(token).first().catch(() => null)
  if (!share) return j({ ok: false, error: '유효하지 않은 링크입니다.' }, 404)

  const slug = share.slug
  const url = new URL(request.url)
  const dateFrom = url.searchParams.get('from') || ''
  const dateTo = url.searchParams.get('to') || ''
  const conditions = ['v.landing_slug = ?']
  const binds: any[] = [slug]
  if (dateFrom) { conditions.push('v.created_at >= ?'); binds.push(dateFrom + ' 00:00:00') }
  if (dateTo) { conditions.push('v.created_at <= ?'); binds.push(dateTo + ' 23:59:59') }
  const wh = conditions.join(' AND ')
  const bw = (stmt: any) => stmt.bind(...binds)

  const [totalRow, channelRows, trendRows, campaignRows, cityRows] = await Promise.all([
    bw(db.prepare(`SELECT COUNT(*) as cnt FROM landing_page_views v WHERE ${wh}`)).first().catch(() => ({ cnt: 0 })),
    bw(db.prepare(`SELECT CASE
      WHEN utm_source='naver' AND (utm_medium='cpc' OR utm_medium='ppc') THEN '네이버 검색광고'
      WHEN utm_source='naver' AND utm_medium='blog' THEN '네이버 블로그'
      WHEN utm_source='naver' AND utm_medium='cafe' THEN '네이버 카페'
      WHEN utm_source='naver' THEN '네이버'
      WHEN utm_source='kakao' AND utm_medium='alimtalk' THEN '카카오 알림톡'
      WHEN utm_source='kakao' THEN '카카오'
      WHEN utm_source='sms' THEN 'SMS 문자'
      WHEN utm_source='instagram' THEN '인스타그램'
      WHEN utm_source='facebook' THEN '페이스북'
      WHEN utm_source='youtube' THEN '유튜브'
      WHEN utm_source='google' THEN '구글'
      WHEN utm_source!='' AND utm_source IS NOT NULL THEN utm_source
      WHEN referrer LIKE '%naver.com%' THEN '네이버 (referrer)'
      WHEN referrer LIKE '%kakao.com%' THEN '카카오 (referrer)'
      WHEN referrer LIKE '%google.com%' THEN '구글 (referrer)'
      WHEN referrer!='' AND referrer IS NOT NULL THEN '기타 외부 링크'
      ELSE '직접 방문' END as channel, COUNT(*) as cnt
      FROM landing_page_views v WHERE ${wh} GROUP BY channel ORDER BY cnt DESC`)).all().catch(() => ({ results: [] })),
    bw(db.prepare(`SELECT DATE(v.created_at) as day, COUNT(*) as views FROM landing_page_views v WHERE ${wh} AND v.created_at >= datetime('now','-30 days') GROUP BY day ORDER BY day ASC`)).all().catch(() => ({ results: [] })),
    bw(db.prepare(`SELECT CASE WHEN utm_campaign!='' AND utm_campaign IS NOT NULL THEN utm_campaign ELSE '(없음)' END as campaign, COUNT(*) as cnt FROM landing_page_views v WHERE ${wh} GROUP BY campaign ORDER BY cnt DESC LIMIT 10`)).all().catch(() => ({ results: [] })),
    bw(db.prepare(`SELECT CASE WHEN city!='' AND city IS NOT NULL THEN city ELSE '알 수 없음' END as city, CASE WHEN country!='' AND country IS NOT NULL THEN country ELSE '' END as country, COUNT(*) as cnt FROM landing_page_views v WHERE ${wh} GROUP BY city, country ORDER BY cnt DESC LIMIT 10`)).all().catch(() => ({ results: [] })),
  ])

  return j({
    ok: true,
    share: { title: share.title, subtitle: share.subtitle, thumbnail_url: share.thumbnail_url, slug },
    total: (totalRow as any)?.cnt || 0,
    channels: (channelRows as any).results || [],
    trend: (trendRows as any).results || [],
    campaigns: (campaignRows as any).results || [],
    cities: (cityRows as any).results || [],
  })
}
