// SUPERPLACE 이식: GET /api/landing/submissions-count?slugs=a,b,c — 페이지별 신청자 수
import { Env, resolveDB, ensureSchema, getSessionUser } from '../_utils'
import { ensureLandingSchema } from './_lschema'

const j = (o: any, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return j({ counts: {} })
  await ensureSchema(db); await ensureLandingSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return j({ counts: {} })
  const url = new URL(request.url)
  const slugsParam = url.searchParams.get('slugs') || ''
  const slugs = slugsParam.split(',').filter(Boolean).slice(0, 50)
  const counts: Record<string, number> = {}
  for (const slug of slugs) counts[slug] = 0
  if (!slugs.length) return j({ counts })
  /* 예전에는 슬러그마다 한 번씩 물어봤다 — 50개면 질의가 50번이다.
     Cloudflare 는 요청 하나가 쓸 수 있는 서브리퀘스트 수를 세고, 넘으면 그 요청이
     통째로 죽는다. 페이지를 많이 만든 회원일수록 숫자가 안 뜨는 이유가 이것이다.
     한 번에 센다. 못 셌으면 0 으로 얼버무리지 않고 못 셌다고 말한다. */
  try {
    const holes = slugs.map(() => '?').join(',')
    const rows: any = await db.prepare(
      `SELECT lp.slug AS slug, COUNT(fs.id) AS cnt
         FROM landing_pages lp
         LEFT JOIN form_submissions fs ON fs.landing_page_id = lp.id
        WHERE lp.user_id = ? AND lp.slug IN (${holes})
        GROUP BY lp.slug`).bind(me.id, ...slugs).all()
    for (const r of ((rows.results || []) as any[])) counts[String(r.slug)] = Number(r.cnt || 0)
  } catch {
    return j({ ok: false, error: '신청자 수를 세지 못했습니다.' }, 500)
  }
  return j({ counts })
}
