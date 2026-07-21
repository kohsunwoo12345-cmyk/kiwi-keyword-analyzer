// SUPERPLACE 이식: GET /api/admin/landing-traffic — 랜딩 유입 경로(채널/UTM/지역/트렌드) 분석
import { Env, resolveDB, ensureSchema, requireAdminUser } from '../_utils'
import { ensureLandingSchema } from '../landing/_lschema'

const j = (o: any, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return j({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureLandingSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return j({ ok: false, error: '관리자 권한이 필요합니다.' }, 403)

  try {
    const url = new URL(request.url)
    const slug = url.searchParams.get('slug') || ''
    const dateFrom = url.searchParams.get('from') || ''
    const dateTo = url.searchParams.get('to') || ''
    const conditions: string[] = []
    const binds: string[] = []
    if (slug) { conditions.push('v.landing_slug = ?'); binds.push(slug) }
    if (dateFrom) { conditions.push('v.created_at >= ?'); binds.push(dateFrom + ' 00:00:00') }
    if (dateTo) { conditions.push('v.created_at <= ?'); binds.push(dateTo + ' 23:59:59') }
    const whereClause = conditions.length ? conditions.join(' AND ') : '1=1'
    const bw = (stmt: any) => (binds.length ? stmt.bind(...binds) : stmt)

    const totalRow: any = await bw(db.prepare(`SELECT COUNT(*) as cnt FROM landing_page_views v WHERE ${whereClause}`)).first()

    const channelRows = await bw(db.prepare(`
      SELECT CASE
        WHEN utm_source='naver' AND (utm_medium='cpc' OR utm_medium='ppc') THEN '네이버 검색광고'
        WHEN utm_source='naver' AND utm_medium='blog' THEN '네이버 블로그'
        WHEN utm_source='naver' AND utm_medium='cafe' THEN '네이버 카페'
        WHEN utm_source='naver' AND utm_medium='band' THEN '네이버 밴드'
        WHEN utm_source='naver' THEN '네이버'
        WHEN utm_source='kakao' AND utm_medium='message' THEN '카카오 문자'
        WHEN utm_source='kakao' AND utm_medium='alimtalk' THEN '카카오 알림톡'
        WHEN utm_source='kakao' AND utm_medium='talk' THEN '카카오톡'
        WHEN utm_source='kakao' AND utm_medium='moment' THEN '카카오 모먼트'
        WHEN utm_source='kakao' THEN '카카오'
        WHEN utm_source='sms' THEN 'SMS 문자'
        WHEN utm_source='mms' THEN 'MMS 문자'
        WHEN utm_source='instagram' THEN '인스타그램'
        WHEN utm_source='facebook' THEN '페이스북'
        WHEN utm_source='youtube' THEN '유튜브'
        WHEN utm_source='google' THEN '구글'
        WHEN utm_source!='' AND utm_source IS NOT NULL THEN utm_source
        WHEN referrer LIKE '%naver.com%' THEN '네이버 (referrer)'
        WHEN referrer LIKE '%kakao.com%' THEN '카카오 (referrer)'
        WHEN referrer LIKE '%google.com%' THEN '구글 (referrer)'
        WHEN referrer LIKE '%instagram.com%' THEN '인스타그램 (referrer)'
        WHEN referrer LIKE '%facebook.com%' THEN '페이스북 (referrer)'
        WHEN referrer LIKE '%youtube.com%' THEN '유튜브 (referrer)'
        WHEN referrer LIKE '%t.co%' THEN '트위터/X (referrer)'
        WHEN referrer!='' AND referrer IS NOT NULL THEN '기타 외부 링크'
        ELSE '직접 방문' END as channel, COUNT(*) as cnt
      FROM landing_page_views v WHERE ${whereClause} GROUP BY channel ORDER BY cnt DESC`)).all()

    const campaignRows = await bw(db.prepare(`
      SELECT CASE WHEN utm_campaign!='' AND utm_campaign IS NOT NULL THEN utm_campaign ELSE '(없음)' END as campaign, COUNT(*) as cnt
      FROM landing_page_views v WHERE ${whereClause} GROUP BY campaign ORDER BY cnt DESC LIMIT 20`)).all()

    const pageRows = await bw(db.prepare(`
      SELECT v.landing_slug as slug, lp.title, COUNT(*) as views
      FROM landing_page_views v LEFT JOIN landing_pages lp ON lp.slug = v.landing_slug
      WHERE ${whereClause} GROUP BY v.landing_slug ORDER BY views DESC LIMIT 20`)).all()

    const trendRows = await bw(db.prepare(`
      SELECT DATE(v.created_at) as day, COUNT(*) as views
      FROM landing_page_views v WHERE ${whereClause} AND v.created_at >= datetime('now','-30 days')
      GROUP BY day ORDER BY day ASC`)).all()

    const sourceRows = await bw(db.prepare(`
      SELECT CASE WHEN utm_source!='' AND utm_source IS NOT NULL THEN utm_source ELSE '(직접)' END as source,
             CASE WHEN utm_medium!='' AND utm_medium IS NOT NULL THEN utm_medium ELSE '-' END as medium, COUNT(*) as cnt
      FROM landing_page_views v WHERE ${whereClause} GROUP BY utm_source, utm_medium ORDER BY cnt DESC LIMIT 30`)).all()

    const slugRows = await db.prepare(`
      SELECT DISTINCT v.landing_slug as slug, lp.title
      FROM landing_page_views v LEFT JOIN landing_pages lp ON lp.slug = v.landing_slug
      WHERE v.landing_slug IS NOT NULL AND v.landing_slug != '' ORDER BY v.landing_slug ASC LIMIT 100`).all()

    const countryRows = await bw(db.prepare(`
      SELECT CASE WHEN country!='' AND country IS NOT NULL THEN country ELSE '알 수 없음' END as country, COUNT(*) as cnt
      FROM landing_page_views v WHERE ${whereClause} GROUP BY country ORDER BY cnt DESC LIMIT 20`)).all()

    const cityRows = await bw(db.prepare(`
      SELECT CASE WHEN city!='' AND city IS NOT NULL THEN city ELSE '알 수 없음' END as city,
             CASE WHEN country!='' AND country IS NOT NULL THEN country ELSE '' END as country, COUNT(*) as cnt
      FROM landing_page_views v WHERE ${whereClause} GROUP BY city, country ORDER BY cnt DESC LIMIT 20`)).all()

    const recentRows = await bw(db.prepare(`
      SELECT datetime(v.created_at, '+9 hours') as created_at, v.landing_slug,
        CASE
          WHEN v.utm_source='kakao' AND v.utm_medium='alimtalk' THEN '카카오 알림톡'
          WHEN v.utm_source='kakao' THEN '카카오'
          WHEN v.utm_source='sms' THEN 'SMS 문자'
          WHEN v.utm_source='naver' AND v.utm_medium='blog' THEN '네이버 블로그'
          WHEN v.utm_source='naver' AND v.utm_medium='cafe' THEN '네이버 카페'
          WHEN v.utm_source='naver' THEN '네이버'
          WHEN v.utm_source='instagram' THEN '인스타그램'
          WHEN v.utm_source='facebook' THEN '페이스북'
          WHEN v.utm_source='youtube' THEN '유튜브'
          WHEN v.utm_source!='' AND v.utm_source IS NOT NULL THEN v.utm_source
          WHEN v.referrer LIKE '%naver.com%' THEN '네이버 (referrer)'
          WHEN v.referrer LIKE '%kakao.com%' THEN '카카오 (referrer)'
          WHEN v.referrer!='' AND v.referrer IS NOT NULL THEN '기타 외부 링크'
          ELSE '직접 방문' END as channel,
        COALESCE(NULLIF(v.city,''),'알 수 없음') as city,
        COALESCE(NULLIF(v.country,''),'?') as country, v.utm_campaign
      FROM landing_page_views v WHERE ${whereClause} ORDER BY v.created_at DESC LIMIT 100`)).all()

    return j({
      ok: true, total: totalRow?.cnt || 0,
      channels: channelRows.results || [], campaigns: campaignRows.results || [],
      pages: pageRows.results || [], trend: trendRows.results || [], sources: sourceRows.results || [],
      slugs: slugRows.results || [], countries: countryRows.results || [], cities: cityRows.results || [],
      recent: recentRows.results || [],
    })
  } catch (err: any) {
    return j({ ok: false, error: String(err?.message || err).slice(0, 200) }, 500)
  }
}
