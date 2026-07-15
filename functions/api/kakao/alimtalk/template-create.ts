import { Env, json, ensureSchema, getSessionUser, resolveDB, logActivity } from '../../_utils'
import { aligoTemplateAdd, aligoTemplateRequest } from '../../_aligo'

// POST /api/kakao/alimtalk/template-create { name, content, senderkey?, buttons?, request? }
//   → 알리고에 템플릿 등록(add) → 승인요청(request, 기본 true) → DB(kakao_templates) 저장
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const b: any = await request.json().catch(() => ({}))
  const name = String(b.name || '').trim()
  const content = String(b.content || '').trim()
  if (!name || !content) return json({ ok: false, error: '템플릿 이름과 내용을 입력하세요.' }, 400)

  // 발신프로필 키: 지정값 → 본인 채널 → 환경변수
  let senderKey = String(b.senderkey || b.senderKey || '').trim()
  if (!senderKey) {
    const ch: any = await db.prepare('SELECT channel_id FROM kakao_channels WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').bind(me.id).first().catch(() => null)
    if (ch?.channel_id) senderKey = String(ch.channel_id)
  }
  if (!senderKey) senderKey = String((env as any)?.ALIGO_SENDER_KEY || '')
  if (!senderKey) return json({ ok: false, error: '발신프로필 키가 없습니다. 먼저 카카오 채널을 등록하세요.' }, 400)

  // 1) 등록
  const add = await aligoTemplateAdd(env, { senderKey, name, content, buttons: b.buttons })
  if (!add.ok || !add.tplCode) return json({ ok: false, error: add.error || '템플릿 등록 실패', detail: add.data }, 400)

  // 2) 승인 요청 (기본 실행)
  let requested = false
  let reqErr = ''
  if (b.request !== false) {
    const rq = await aligoTemplateRequest(env, { senderKey, tplCode: add.tplCode })
    requested = rq.ok
    if (!rq.ok) reqErr = rq.error || ''
  }

  // 3) DB 저장 (상태는 알리고 목록조회로 실시간 반영됨)
  try {
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS kakao_templates (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, template_id TEXT, name TEXT, content TEXT, status TEXT, reject_reason TEXT, category_code TEXT, message_type TEXT, senderkey TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    ).run()
    try { await db.prepare('ALTER TABLE kakao_templates ADD COLUMN senderkey TEXT').run() } catch { /* */ }
    await db.prepare(
      `INSERT INTO kakao_templates (user_id, template_id, name, content, status, category_code, message_type, senderkey, created_at) VALUES (?, ?, ?, ?, ?, '', 'BA', ?, ?)`,
    ).bind(me.id, add.tplCode, name, content, requested ? '검수중' : '등록', senderKey, new Date().toISOString()).run()
  } catch { /* 저장 실패해도 등록은 완료됨 */ }

  await logActivity(db, me.id, 'kakao', `알림톡 템플릿 등록: ${name} (${add.tplCode})`).catch(() => {})
  return json({
    ok: true,
    templateId: add.tplCode,
    requested,
    note: requested
      ? '템플릿이 등록되고 승인 요청까지 완료됐어요. 카카오 심사(보통 영업일 기준 1~2일) 후 승인되면 바로 발송에 사용할 수 있습니다.'
      : `템플릿은 등록됐지만 승인 요청에 실패했어요${reqErr ? ' (' + reqErr + ')' : ''}. 목록에서 다시 승인 요청해 주세요.`,
  })
}
