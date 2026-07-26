import { Env, json, ensureSchema, getSessionUser, resolveDB } from '../_utils'
import { ensureAiUsage } from './_pricing'

// 보관함 서버 소스 — 계정의 생성 아카이브(ai_usage.result_url)를 보관함 목록으로 제공.
//  기존 보관함은 브라우저 IndexedDB(기기 로컬)만 읽어서 ①다른 기기/브라우저에선 비어 보이고
//  ②로그인 확인 전(uid=guest)에 저장된 항목이 숨겨지는 문제가 있었다.
//  생성 성공분은 이미 /api/usage/record 가 result_url(R2 영구화 포함)과 함께 서버에 남기므로,
//  그 기록을 보관함의 1차 소스로 내려 로컬 항목과 병합해 "어디서든 내 생성물"이 보이게 한다.

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureAiUsage(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, needLogin: true }, 401)

  const rows: any = await db.prepare(
    `SELECT id, model, kind, result_kind, result_url, prompt, created_at
       FROM ai_usage
      WHERE user_id = ? AND result_url != ''
      ORDER BY created_at DESC
      LIMIT 200`,
  ).bind(me.id).all().catch(() => ({ results: [] }))

  const items = (rows.results || []).map((r: any) => ({
    id: 'srv-' + r.id,                                     // 로컬(IndexedDB) id 와 충돌 방지
    kind: (r.result_kind || r.kind) === 'image' ? 'image' : 'video',
    url: r.result_url,
    model: r.model || '',
    prompt: r.prompt || '',
    ts: r.created_at ? new Date(r.created_at).getTime() : 0,
  }))
  return json({ ok: true, items })
}

// DELETE ?id=srv-<ai_usage id> — 보관함 목록에서 숨김(result_url 만 비움 · 정산/과금 기록은 보존)
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureAiUsage(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, needLogin: true }, 401)
  const raw = new URL(request.url).searchParams.get('id') || ''
  const id = raw.replace(/^srv-/, '')
  if (!id) return json({ ok: false, error: 'id 필요' }, 400)
  await db.prepare("UPDATE ai_usage SET result_url = '' WHERE id = ? AND user_id = ?").bind(id, me.id).run()
  return json({ ok: true })
}
