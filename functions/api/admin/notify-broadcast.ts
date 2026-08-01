import { Env, json, ensureSchema, resolveDB, requireAdminUser, addNotification, logAudit, clientIp } from '../_utils'
import { sendSmsMass } from '../_aligo'

// POST /api/admin/notify-broadcast { target:'user'|'plan'|'all'|'multi', userId?, plan?, userIds?, title, body, sms? }
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error
  const admin = { id: guard.me.id, email: guard.me.email }

  const b: any = await (request.json().catch(() => null)) ?? {}
  const target = String(b.target || '')
  const title = String(b.title || '').trim()
  const body = String(b.body || '').trim()
  const withSms = !!b.sms
  if (!title || !body) return json({ ok: false, error: '제목과 내용을 입력하세요.' }, 400)

  // 대상 회원 선정
  let recipients: any[] = []
  if (target === 'user') {
    const u: any = await db.prepare('SELECT id, phone FROM users WHERE id = ?').bind(String(b.userId || '')).first()
    if (u) recipients = [u]
  } else if (target === 'multi') {
    const ids: string[] = Array.isArray(b.userIds) ? b.userIds.map(String) : []
    if (ids.length) {
      const q = ids.map(() => '?').join(',')
      recipients = (await db.prepare(`SELECT id, phone FROM users WHERE id IN (${q})`).bind(...ids).all()).results || []
    }
  } else if (target === 'plan') {
    const plan = String(b.plan || '')
    recipients = (await db.prepare('SELECT id, phone FROM users WHERE plan = ?').bind(plan).all()).results || []
  } else if (target === 'all') {
    recipients = (await db.prepare('SELECT id, phone FROM users').all()).results || []
  } else {
    return json({ ok: false, error: '발송 대상을 선택하세요.' }, 400)
  }

  if (recipients.length === 0) return json({ ok: false, error: '대상 회원이 없습니다.' }, 400)
  if (recipients.length > 5000) return json({ ok: false, error: '한 번에 최대 5,000명까지 발송할 수 있습니다.' }, 400)

  let sent = 0
  let smsSent = 0
  for (const r of recipients) {
    await addNotification(db, r.id, title, body).catch(() => {})
    sent++
  }
  /* 문자는 한 명씩 부르지 않고 묶어 보낸다 — Cloudflare 는 바깥으로 나가는 요청을 하나하나
     세고 요청당 한도가 있어서, 대상이 서른 몇 명만 넘어도 함수가 통째로 끊겼다. */
  if (withSms) {
    const items = recipients
      .filter((r: any) => String(r.phone || '').replace(/[^0-9]/g, '').length >= 10)
      .map((r: any) => ({ to: String(r.phone), message: `[BYGENCY] ${title}\n${body}` }))
    if (items.length) {
      const mr = await sendSmsMass(env, items).catch(() => ({ successCnt: 0 } as any))
      smsSent = Math.max(0, Math.min(items.length, Number(mr.successCnt) || 0))
    }
  }

  await logAudit(db, admin, 'notify_broadcast', `${target}:${sent}명`, title, 'info', clientIp(request))
  return json({ ok: true, sent, smsSent, target })
}
