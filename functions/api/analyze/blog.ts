import { Env, json, ensureSchema, getSessionUser, resolveDB, spendCredits, logActivity } from '../_utils'
import { naverSearch } from '../_external'

// POST /api/analyze/blog { keyword } → 네이버 블로그 검색 실데이터 분석 (2 크레딧)
export const onRequestPost: PagesFunction<any> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const body: any = await request.json().catch(() => ({}))
  const keyword = String(body.keyword || '').trim()
  if (!keyword) return json({ ok: false, error: '분석할 키워드를 입력하세요.' }, 400)

  const cost = 2
  const spend = await spendCredits(db, me.id, cost, '블로그 분석', keyword)
  if (!spend.ok) return json({ ok: false, error: spend.error }, 402)
  const refund = async (reason: string) => {
    await db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').bind(cost, me.id).run()
    return json({ ok: false, error: reason, refunded: true }, 200)
  }

  const r = await naverSearch(env, 'blog', keyword, { display: 20, sort: 'sim' })
  if (!r.ok) return refund(r.error || '네이버 API 호출 실패')

  const items = (r.data?.items || []).map((it: any) => ({
    title: String(it.title || '').replace(/<[^>]+>/g, ''),
    link: it.link,
    blogger: it.bloggername,
    postdate: it.postdate,
    desc: String(it.description || '').replace(/<[^>]+>/g, '').slice(0, 120),
  }))
  const total = r.data?.total || 0
  // 간단한 경쟁도/난이도 지표 (문서수 기반)
  const difficulty = total > 500000 ? '매우 높음' : total > 100000 ? '높음' : total > 20000 ? '보통' : '낮음'
  const grade = total > 500000 ? 'F' : total > 100000 ? 'D' : total > 20000 ? 'C' : total > 3000 ? 'B' : 'A'
  const exposureChance = Math.max(3, Math.min(97, Math.round(100 - Math.log10(Math.max(10, total)) * 15)))

  await logActivity(db, me.id, 'credit', `블로그 분석: ${keyword} (-${cost})`)
  const fresh: any = await db.prepare('SELECT credits FROM users WHERE id = ?').bind(me.id).first()
  return json({
    ok: true,
    keyword,
    total,
    difficulty,
    grade,
    exposureChance,
    items,
    credits: fresh?.credits ?? null,
  })
}
