import {
  Env,
  json,
  ensureSchema,
  seedAdmin,
  getSessionUser,
  publicUser,
  ADMIN_EMAIL,
  resolveDB,
  hashPassword,
  logActivity,
  applyBalance,
  addNotification,
  rewardReferralFirstPaid,
} from '../_utils'
import { sendSms } from '../_solapi'

async function requireAdmin(request: Request, db: D1Database) {
  const me: any = await getSessionUser(request, db)
  if (!me) return { error: json({ ok: false, error: '로그인이 필요합니다.' }, 401) }
  if (me.email !== ADMIN_EMAIL && me.role !== 'admin')
    return { error: json({ ok: false, error: '관리자 권한이 필요합니다.' }, 403) }
  return { me }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await seedAdmin(db, env)
  const guard = await requireAdmin(request, db)
  if (guard.error) return guard.error

  const { results } = await db
    .prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT 1000')
    .all()
  const users = (results || []).map(publicUser)

  const total = users.length
  const admins = users.filter((u: any) => u.role === 'admin').length
  const suspended = users.filter((u: any) => u.status === 'suspended').length
  const today = new Date().toISOString().slice(0, 10)
  const newToday = users.filter((u: any) => (u.createdAt || '').slice(0, 10) === today).length
  const byPlan = {
    Starter: users.filter((u: any) => u.plan === 'Starter').length,
    Pro: users.filter((u: any) => u.plan === 'Pro').length,
    Business: users.filter((u: any) => u.plan === 'Business').length,
  }

  return json({ ok: true, users, stats: { total, admins, suspended, newToday, byPlan } })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await seedAdmin(db, env)
  const guard = await requireAdmin(request, db)
  if (guard.error) return guard.error

  const body: any = await request.json().catch(() => ({}))
  const action = String(body.action || '')
  const id = String(body.id || '')
  if (!id) return json({ ok: false, error: '대상 id가 없습니다.' }, 400)

  if (action === 'suspend') {
    await db.prepare("UPDATE users SET status = 'suspended' WHERE id = ?").bind(id).run()
    await logActivity(db, id, 'status', '관리자에 의해 계정 정지')
  } else if (action === 'activate') {
    await db.prepare("UPDATE users SET status = 'active' WHERE id = ?").bind(id).run()
    await logActivity(db, id, 'status', '관리자에 의해 정지 해제')
  } else if (action === 'delete') {
    await db.batch([
      db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id),
      db.prepare('DELETE FROM transactions WHERE user_id = ?').bind(id),
      db.prepare('DELETE FROM activity_log WHERE user_id = ?').bind(id),
      db.prepare('DELETE FROM notifications WHERE user_id = ?').bind(id),
      db.prepare('DELETE FROM users WHERE id = ?').bind(id),
    ])
  } else if (action === 'plan') {
    const plan = ['없음', 'Plus', 'Pro', 'Max'].includes(body.plan) ? body.plan : '없음'
    const track = body.track === 'video' ? 'video' : 'marketer'
    const col = track === 'video' ? 'video_plan' : 'plan'
    const label = track === 'video' ? 'AI 영상' : '마케터'
    await db.prepare(`UPDATE users SET ${col} = ? WHERE id = ?`).bind(plan, id).run()
    await logActivity(db, id, 'plan', `${label} 플랜 변경 → ${plan}`)
    // 추천인 리워드: 피추천인이 유료 요금제에 처음 가입하면 추천인에게 결제액의 1% 크레딧 지급
    if (plan !== '없음') await rewardReferralFirstPaid(db, id, track, plan)
  } else if (action === 'password') {
    const pw = String(body.password || '')
    if (pw.length < 8) return json({ ok: false, error: '비밀번호는 8자 이상이어야 합니다.' }, 400)
    const ph = await hashPassword(pw)
    await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(ph, id).run()
    await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id).run() // 기존 세션 만료
    await logActivity(db, id, 'password', '관리자에 의해 비밀번호 변경')
  } else if (action === 'points' || action === 'credits') {
    // 크레딧은 소수(0.05 등) 지급/차감 허용, 포인트는 정수
    const raw = Number(body.amount || 0)
    const amount = action === 'credits' ? Math.round(raw * 100) / 100 : Math.round(raw)
    if (!amount) return json({ ok: false, error: '금액을 입력하세요.' }, 400)
    const kind = action === 'credits' ? 'credit' : 'point'
    const r = await applyBalance(db, id, kind, amount, String(body.memo || '관리자 지급'))
    if (!r.ok) return json(r, 400)
  } else if (action === 'markup') {
    // 회원별 AI 과금 배수 설정. 원가=1, 1배 미만 불가. 0(또는 미만) = 모델 기본값 사용
    const raw = Number(body.markup)
    let markup: number | null
    if (!Number.isFinite(raw) || raw <= 0) markup = null // 기본값으로 초기화
    else markup = Math.max(1, Math.round(raw * 100) / 100) // 최소 1배
    await db.prepare('UPDATE users SET credit_markup = ? WHERE id = ?').bind(markup, id).run()
    await logActivity(db, id, 'plan', markup ? `AI 과금 배수 ×${markup} 설정` : 'AI 과금 배수 기본값으로 초기화')
  } else if (action === 'notify') {
    const title = String(body.title || 'BYGENCY 안내')
    const bodyText = String(body.body || '')
    if (!bodyText) return json({ ok: false, error: '내용을 입력하세요.' }, 400)
    await addNotification(db, id, title, bodyText)
    await logActivity(db, id, 'notify', `알림 발송: ${title}`)
    // 문자(Solapi) 병행 발송: phone + Solapi 환경변수 있을 때
    let sms: any = { sent: false }
    if (body.sms) {
      const target: any = await db.prepare('SELECT phone FROM users WHERE id = ?').bind(id).first()
      const phone = String(body.phone || target?.phone || '').replace(/[^0-9]/g, '')
      sms = await sendSms(env, phone, `[BYGENCY] ${bodyText}`)
    }
    return json({ ok: true, sms })
  } else {
    return json({ ok: false, error: '알 수 없는 작업입니다.' }, 400)
  }
  return json({ ok: true })
}
