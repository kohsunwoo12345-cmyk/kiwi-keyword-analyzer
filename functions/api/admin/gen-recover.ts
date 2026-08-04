import { Env, json, ensureSchema, resolveDB, resolveBucket, requireAdminUser } from '../_utils'
import { saveMediaToR2 } from '../_media'

/* ── 잃어버린 결과물을 되찾아 온다 ──
   "미리보기 없음 (아카이브 안 됨)" 은 우리 표에 결과 주소가 없다는 뜻이지, 영상이 없다는
   뜻이 아니다. 대부분은 제공사 쪽에 그대로 남아 있는데 우리가 주소를 잃은 것뿐이다.
   잃은 이유는 두 가지였고 둘 다 고쳤지만(usage/record), 그 전에 만든 것들은 그대로 비어 있다.

   되찾는 길은 있다 — 정산할 때 gen_charges.task_key 에 그 생성의 조회 주소를 통째로
   적어 뒀다. 그 주소로 제공사에 물어보면 완료된 작업은 결과 URL 을 돌려준다.
   받아서 R2 에 넣고 우리 줄에 붙이면 화면에 다시 나온다.

   ⚠ 한 번에 다 하지 않는다. 한 건마다 조회·다운로드·업로드·기록이 붙어서, 수백 건을
     한 요청에서 돌리면 그 요청이 죽고 아무것도 안 고쳐진 채로 끝난다.
     조금씩 하고 "남은 게 있다" 를 돌려준다 — 화면이 끝날 때까지 다시 부른다.

   ⚠ 되찾지 못하는 것도 있다. 제공사 쪽에서 이미 지워졌거나(만료), 애초에 실패한 작업이다.
     그건 그대로 둔다 — 못 찾은 것을 지우거나 성공으로 적지 않는다. */

const BATCH = 8                       // 한 번에 시도할 건수

// POST /api/admin/gen-recover   → { ok, tried, recovered, failed, running, remaining, details[] }
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error
  const bucket = resolveBucket(env)
  if (!bucket) return json({ ok: false, error: 'R2 버킷 바인딩이 없어 되찾아 와도 보관할 곳이 없습니다.' }, 500)

  const u = new URL(request.url)
  const origin = u.origin
  const cookie = request.headers.get('cookie') || ''

  /* 대상: 결과 주소가 빈 줄 중, 제공사에 물어볼 작업 번호가 남아 있는 것.
     실패로 확정돼 환불까지 끝난 건은 물어볼 필요가 없다 — 결과가 있을 리 없다. */
  const sql = `SELECT a.id AS id, g.id AS charge_id, g.task_key AS task_key
                 FROM ai_usage a JOIN gen_charges g ON g.usage_id = a.id
                WHERE a.result_url = '' AND g.task_key != '' AND g.status != 'refunded'
                ORDER BY a.created_at DESC`
  const totalRow: any = await db.prepare(`SELECT COUNT(*) AS c FROM (${sql})`).first().catch(() => ({ c: 0 }))
  const rows: any = await db.prepare(sql + ' LIMIT ?').bind(BATCH).all().catch(() => ({ results: [] }))

  let recovered = 0, failed = 0, running = 0, gone = 0
  const details: any[] = []
  for (const r of rows.results || []) {
    const id = String((r as any).id)
    const taskKey = String((r as any).task_key)
    try {
      /* ⚠ 요금을 건드리지 않는다.
         완료된 작업을 다시 조회하면 응답에 제공사 실측 토큰이 실려 오고, 그러면
         평소 경로(reconcileGenCharge)가 그 값으로 요금을 다시 매긴다. 생성 직후라면
         맞는 동작이지만, 몇 달 지난 기록을 되찾다가 그게 돌면 지나간 청구가 조용히 바뀐다.
         실제로 검사에서 ₩2,471 짜리 한 건이 ₩0 으로 덮였다 — 되찾기는 영상을 되찾는
         일이지 요금을 다시 매기는 일이 아니다.
         정산 자리를 미리 잠가 둔다(이미 잠긴 것은 그대로). 실패 확정 시 환불은 그대로 둔다 —
         그건 되찾기와 무관하게 회원이 받아야 할 돈이다. */
      await db.prepare(`UPDATE gen_charges SET reconciled_at = COALESCE(reconciled_at, ?) WHERE id = ?`)
        .bind(new Date().toISOString(), String((r as any).charge_id)).run().catch(() => {})
      const pr = await fetch(new URL(taskKey, origin).toString(), { headers: { cookie } })
      const j: any = await pr.json().catch(() => ({}))
      if (j && j.url) {
        const saved = await saveMediaToR2(env, String(j.url))
        if (saved.moved) {
          await db.prepare('UPDATE ai_usage SET result_url = ?, result_kind = COALESCE(NULLIF(result_kind,\'\'), ?) WHERE id = ?')
            .bind(saved.url, String(j.kind || 'video'), id).run()
          recovered++; details.push({ id, state: 'recovered', url: saved.url })
        } else {
          /*  제공사는 "있다" 는데 우리가 못 가져왔다.
              ⚠ 예전엔 이걸 전부 "만료 추정" 이라고 적었다. 그런데 실제로는 우리 쪽 보관이
                실패한 경우가 섞여 있었고(길이를 안 알려 주는 몸통을 R2 가 거절), 그걸
                "원본이 사라졌다" 로 적어 버리니 고칠 수 있는 건을 포기하게 만들었다.
                이유를 그대로 적는다. */
          gone++; details.push({ id, state: 'gone', note: saved.reason || '받아 오지 못함' })
        }
      } else if (j && (j.status === 'failed' || j.error)) {
        failed++; details.push({ id, state: 'failed', note: String(j.error || '실패').slice(0, 120) })
      } else {
        running++; details.push({ id, state: 'running' })
      }
    } catch (e: any) {
      gone++; details.push({ id, state: 'error', note: String((e && e.message) || e).slice(0, 120) })
    }
  }

  /* 남은 수를 다시 센다. 되찾은 건은 빠지지만 실패·진행 중은 그대로 남아 있어서,
     그냥 "남은 수" 를 그대로 주면 화면이 영원히 다시 부른다.
     이번에 못 고친 건수를 빼서 "이번 방식으로 더 고칠 수 있는 수" 를 준다. */
  const stuck = failed + running + gone
  const remaining = Math.max(0, (Number(totalRow?.c) || 0) - recovered - stuck)
  return json({ ok: true, tried: (rows.results || []).length, recovered, failed, running, gone, remaining, details })
}
