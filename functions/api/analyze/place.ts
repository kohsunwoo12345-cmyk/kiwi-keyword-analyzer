import { Env, json, ensureSchema, getSessionUser, resolveDB, spendCredits, logActivity } from '../_utils'
import { naverSearch } from '../_external'

// POST /api/analyze/place { keyword } → 네이버 지역(플레이스) 검색 실데이터 (1 크레딧)
export const onRequestPost: PagesFunction<any> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const body: any = await request.json().catch(() => ({}))
  const keyword = String(body.keyword || '').trim()
  if (!keyword) return json({ ok: false, error: '검색어를 입력하세요.' }, 400)

  const cost = 1
  const spend = await spendCredits(db, me.id, cost, '플레이스 순위 조회', keyword)
  if (!spend.ok) return json({ ok: false, error: spend.error }, 402)
  const refund = async (reason: string) => {
    await db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').bind(cost, me.id).run()
    return json({ ok: false, error: reason, refunded: true }, 200)
  }

  const r = await naverSearch(env, 'local', keyword, { display: 10 })
  if (!r.ok) return refund(r.error || '네이버 API 호출 실패')

  const items = (r.data?.items || []).map((it: any, i: number) => ({
    rank: i + 1,
    title: String(it.title || '').replace(/<[^>]+>/g, ''),
    category: it.category,
    address: it.roadAddress || it.address,
    telephone: it.telephone,
    link: it.link,
  }))
  await logActivity(db, me.id, 'credit', `플레이스 조회: ${keyword} (-${cost})`)
  const fresh: any = await db.prepare('SELECT credits FROM users WHERE id = ?').bind(me.id).first()
  return json({ ok: true, keyword, total: r.data?.total || items.length, items, credits: fresh?.credits ?? null })
}
