/* 생성물 영구 보관 — 정기 실행
   ──────────────────────────────────────────────────────────────────────────
   사람이 [결과물 되찾기]를 눌러야만 옮겨진다면 그건 "평생 남는다" 가 아니다.
   회원이 만든 영상은 아무도 아무것도 안 눌러도 우리 도메인에 남아 있어야 한다.

   평소에는 생성이 끝나는 그 자리에서 바로 옮긴다(generate.js → archiveGenResult).
   여기는 그게 실패했을 때의 그물이다 — 제공사가 잠깐 죽었거나, R2 가 한 번 튕겼거나,
   고치기 전에 이미 쌓여 있던 옛 기록들.

   ⚠ 제공사 주소는 며칠이면 만료된다. 원본이 살아 있는 동안 옮겨야 하므로 자주 돈다.
   ⚠ 한 번에 조금씩만 한다. 수백 건을 한 요청에서 받아 올리면 그 요청이 죽고
     아무것도 안 옮겨진 채 끝난다(그러면 다음 실행 때도 같은 자리에서 죽는다).

   GET  — 옮길 게 몇 건 남았는지만 본다(워커가 이걸 보고 POST 를 아낀다)
   POST — 한 묶음 옮기고 { processed, hasMore } 를 돌려준다
*/
import { Env, json, resolveDB } from '../_utils'
import { saveMediaToR2 } from '../_media'
import { ensureAiUsage } from '../studio/_pricing'

const BATCH = 6        // 한 번에 옮길 건수 — 건마다 내려받기+올리기가 붙는다

function auth(request: Request, env: any): boolean {
  const expected = String(env.CRON_TOKEN || '')
  return !!expected && (request.headers.get('X-Cron-Token') || '') === expected
}

/** 아직 제공사 주소를 붙들고 있는 줄 수 — 이게 0 이어야 "다 우리 것" 이다. */
async function pending(db: D1Database): Promise<number> {
  const r: any = await db.prepare(
    `SELECT COUNT(*) AS c FROM ai_usage WHERE result_url LIKE 'http%'`).first().catch(() => ({ c: 0 }))
  return Number(r?.c) || 0
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  if (!auth(request, env as any)) return json({ ok: false, error: '인증 실패' }, 401)
  await ensureAiUsage(db)
  const due = await pending(db)
  return json({ ok: true, due, hasMore: due > 0 })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  if (!auth(request, env as any)) return json({ ok: false, error: '인증 실패' }, 401)
  await ensureAiUsage(db)

  /* 최근 것부터 옮긴다. 오래된 주소는 이미 만료됐을 가능성이 높고, 방금 만든 것은
     아직 살아 있다 — 살릴 수 있는 것부터 살리는 게 맞다. */
  const rows: any = await db.prepare(
    `SELECT id, result_url FROM ai_usage
      WHERE result_url LIKE 'http%' ORDER BY created_at DESC LIMIT ?`)
    .bind(BATCH).all().catch(() => ({ results: [] }))

  let moved = 0
  const stuck: any[] = []
  for (const r of (rows.results || []) as any[]) {
    const saved = await saveMediaToR2(env as any, String(r.result_url))
    if (saved.moved) {
      await db.prepare('UPDATE ai_usage SET result_url = ? WHERE id = ?')
        .bind(saved.url, String(r.id)).run().catch(() => {})
      moved++
    } else {
      stuck.push({ id: String(r.id), why: saved.reason || '옮기지 못함' })
    }
  }

  const left = await pending(db)
  /* ⚠ hasMore 를 "남은 게 있다" 로만 두면 안 된다.
     이미 만료돼 영영 못 옮기는 줄이 남아 있으면 워커가 영원히 같은 묶음을 다시 집는다.
     이번에 하나도 못 옮겼으면 더 두드려 봐야 소용없다 — 다음 정기 실행으로 넘긴다. */
  const processed = moved
  return json({ ok: true, processed, moved, stuck: stuck.slice(0, BATCH), left,
                hasMore: left > 0 && moved > 0 })
}
