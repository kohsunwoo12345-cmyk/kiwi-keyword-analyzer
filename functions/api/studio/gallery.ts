import { Env, json, ensureSchema, getSessionUser, resolveDB } from '../_utils'
import { saveMediaToR2 } from '../_media'
import { ensureAiUsage } from './_pricing'

// 보관함 서버 소스 — 계정의 생성 아카이브(ai_usage.result_url)를 보관함 목록으로 제공.
//  기존 보관함은 브라우저 IndexedDB(기기 로컬)만 읽어서 ①다른 기기/브라우저에선 비어 보이고
//  ②로그인 확인 전(uid=guest)에 저장된 항목이 숨겨지는 문제가 있었다.
//  생성 성공분은 이미 /api/usage/record 가 result_url(R2 영구화 포함)과 함께 서버에 남기므로,
//  그 기록을 보관함의 1차 소스로 내려 로컬 항목과 병합해 "어디서든 내 생성물"이 보이게 한다.

/* ── 뒤늦게라도 우리 R2 로 옮긴다 ──
   예전에는 제공사 결과 주소를 그대로 저장했다. 그 주소는 며칠이면 만료된다 —
   저장한 그날은 잘 보이니 아무도 모르다가, 나중에 보관함이 통째로 비어 보인다.
   지금은 저장 시점에 옮기지만(usage/record → persistMedia), 그 전에 쌓인 기록은
   여전히 제공사 주소를 붙들고 있다. 원본이 아직 살아 있는 동안 옮겨야 하므로
   보관함을 열 때마다 몇 개씩 옮긴다.

   한 번에 다 옮기지 않는 이유: 200건을 한 요청에서 받아 올리면 그 요청이 죽는다.
   열 때마다 조금씩 옮기면 며칠 안에 다 넘어가고, 실패해도 다음에 다시 해 본다.
   ⚠ 이미 만료된 주소는 살릴 방법이 없다 — 이건 앞으로 잃지 않기 위한 장치다. */
const HEAL_PER_LOAD = 3
async function healToR2(env: any, db: any, rows: any[], userId: string): Promise<void> {
  const stale = rows.filter((r) => /^https?:\/\//i.test(String(r.result_url || ''))).slice(0, HEAL_PER_LOAD)
  for (const r of stale) {
    //  옮기는 일은 _media.ts 가 한다 — 길이를 안 알려 주는 몸통까지 거기서 처리한다.
    const saved = await saveMediaToR2(env, String(r.result_url))
    if (!saved.moved) continue                              // 못 옮겼다 — 다음에 다시 해 본다
    await db.prepare('UPDATE ai_usage SET result_url = ? WHERE id = ? AND user_id = ?')
      .bind(saved.url, r.id, userId).run().catch(() => {})
    r.result_url = saved.url                                // 이번 응답부터 바로 새 주소로 준다
  }
}

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

  await healToR2(env, db, rows.results || [], me.id)
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
