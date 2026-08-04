/* 관리자 — 생성이 안 된 것들과 그 사유.
   두 곳을 합쳐서 보여 준다. 하나만 보면 절반을 놓친다.
     ㉠ gen_failures — 우리가 직접 적어 둔 실패(제출 거절·진행 중 실패·보관 실패)
     ㉡ ai_usage 중 결과 주소가 빈 줄 — 화면에 "미리보기 없음(아카이브 안 됨)" 으로 뜨던 것.
        요금은 나갔는데 결과물이 안 붙은 줄이라, 사장님이 가장 먼저 보고 싶어 하는 것이다.
        ㉠ 에 같은 줄이 이미 있으면 사유가 있는 ㉠ 쪽을 쓴다(두 번 안 보여 준다). */
import { Env, json, ensureSchema, resolveDB, requireAdminUser } from '../_utils'
import { ensureAiUsage } from '../studio/_pricing'
import { ensureGenFailures } from '../studio/_genfail'

const STAGE_LABEL: Record<string, string> = {
  submit: '제출 거절 — 제공사가 요청 자체를 안 받았습니다',
  run: '만드는 중 실패 — 접수는 됐는데 제공사가 실패로 끝냈습니다',
  archive: '보관 실패 — 영상은 나왔는데 우리 저장소로 못 옮겼습니다',
  missing: '결과물 없음 — 요금은 나갔는데 결과 주소가 안 붙었습니다',
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  /*  ⚠ 관리자 확인이 먼저다. 표 만들기를 앞에 두면 로그인도 안 한 요청이 우리 DDL 을
      돌리게 되고, 그 과정이 삐끗하면 401 이어야 할 응답이 500 으로 나간다
      (검사가 실제로 그걸 잡았다 — 비로그인 요청에 500). */
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error
  await ensureSchema(db)
  await ensureAiUsage(db)
  await ensureGenFailures(db)

  const url = new URL(request.url)
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') || 60)))
  const offset = Math.max(0, Number(url.searchParams.get('offset') || 0))
  const q = String(url.searchParams.get('q') || '').trim()
  const days = Math.min(3650, Math.max(1, Number(url.searchParams.get('days') || 3650)))
  const since = new Date(Date.now() - days * 86400000).toISOString()

  //  ㉠ 적어 둔 실패
  /*  사유가 없는 줄은 화면에 빈 상자만 그린다 — 보여 줄 이유가 없다.
      기록하는 쪽(recordGenFailure)이 이미 사유 없는 건 안 넣지만, 밖에서 들어온 줄
      (옛 자료·검사 흔적)이 섞이면 그대로 나간다. 읽는 쪽에서도 한 번 거른다. */
  const w: string[] = ['created_at > ?', "COALESCE(reason,'') != ''"]
  const b: any[] = [since]
  if (q) { w.push('(email LIKE ? OR name LIKE ? OR model LIKE ? OR reason LIKE ? OR prompt LIKE ?)'); const l = `%${q}%`; b.push(l, l, l, l, l) }
  const logged: any = await db.prepare(
    `SELECT id, created_at, user_id, email, name, provider, model, kind, stage, reason,
            task_key, usage_id, refunded, prompt
       FROM gen_failures WHERE ${w.join(' AND ')}
      ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(...b, limit, offset).all().catch(() => ({ results: [] }))

  //  ㉡ 결과물이 안 붙은 정산 줄 (금액이 실제로 나간 것만 — 보관 전용 0원 줄은 실패가 아니다)
  const wm: string[] = ["a.created_at > ?", "COALESCE(a.result_url,'') = ''", '(a.credits > 0 OR a.cost_krw > 0)']
  const bm: any[] = [since]
  if (q) { wm.push('(a.email LIKE ? OR a.name LIKE ? OR a.model LIKE ? OR a.prompt LIKE ?)'); const l = `%${q}%`; bm.push(l, l, l, l) }
  const missing: any = await db.prepare(
    `SELECT a.id AS id, a.created_at AS created_at, a.user_id AS user_id, a.email AS email, a.name AS name,
            a.provider AS provider, a.model AS model, a.kind AS kind, a.prompt AS prompt,
            a.credits AS credits, a.revenue_krw AS revenue_krw,
            COALESCE(g.task_key,'') AS task_key, COALESCE(g.status,'') AS charge_status
       FROM ai_usage a LEFT JOIN gen_charges g ON g.usage_id = a.id
      WHERE ${wm.join(' AND ')}
      ORDER BY a.created_at DESC LIMIT ? OFFSET ?`).bind(...bm, limit, offset).all().catch(() => ({ results: [] }))

  const seen = new Set<string>()
  const items: any[] = []
  for (const r of (logged.results || []) as any[]) {
    const stage = String(r.stage || '')
    if (r.usage_id) seen.add(String(r.usage_id))
    items.push({
      id: String(r.id), source: 'logged',
      createdAt: r.created_at, userId: r.user_id || '', email: r.email || '', name: r.name || '',
      provider: r.provider || '', model: r.model || '', kind: r.kind || '',
      stage, stageLabel: STAGE_LABEL[stage] || stage,
      reason: String(r.reason || ''),
      taskKey: String(r.task_key || ''), usageId: String(r.usage_id || ''),
      refunded: Number(r.refunded) || 0,
      prompt: String(r.prompt || ''),
      //  보관 실패는 영상이 아직 제공사에 살아 있을 수 있다 = [결과물 되찾기]로 살릴 여지가 있다
      recoverable: stage === 'archive' || (stage === 'run' && !!r.task_key),
    })
  }
  for (const r of (missing.results || []) as any[]) {
    if (seen.has(String(r.id))) continue                 // 사유가 있는 ㉠ 쪽이 이미 보여 준다
    items.push({
      id: String(r.id), source: 'missing',
      createdAt: r.created_at, userId: r.user_id || '', email: r.email || '', name: r.name || '',
      provider: r.provider || '', model: r.model || '', kind: r.kind || '',
      stage: 'missing', stageLabel: STAGE_LABEL.missing,
      reason: String(r.charge_status) === 'refunded'
        ? '생성이 실패해 크레딧을 돌려줬습니다. (사유가 기록되기 전에 만들어진 건입니다)'
        : '결과 주소가 비어 있습니다. 제공사에는 아직 남아 있을 수 있으니 [결과물 되찾기]로 받아 올 수 있습니다.',
      taskKey: String(r.task_key || ''), usageId: String(r.id),
      refunded: 0,
      prompt: String(r.prompt || ''),
      credits: Number(r.credits) || 0,
      revenueKrw: Number(r.revenue_krw) || 0,
      chargeStatus: String(r.charge_status || ''),
      recoverable: !!r.task_key && String(r.charge_status) !== 'refunded',
    })
  }
  items.sort((a, b2) => String(b2.createdAt).localeCompare(String(a.createdAt)))

  //  총계는 두 곳을 각각 센다 — 화면 위 뱃지가 "몇 건이 실패인지" 를 말해야 한다
  const c1: any = await db.prepare(`SELECT COUNT(*) AS c FROM gen_failures WHERE ${w.join(' AND ')}`)
    .bind(...b).first().catch(() => ({ c: 0 }))
  const c2: any = await db.prepare(
    `SELECT COUNT(*) AS c FROM ai_usage a LEFT JOIN gen_charges g ON g.usage_id = a.id WHERE ${wm.join(' AND ')}`)
    .bind(...bm).first().catch(() => ({ c: 0 }))

  return json({ ok: true, total: (Number(c1?.c) || 0) + (Number(c2?.c) || 0), limit, offset, items })
}
