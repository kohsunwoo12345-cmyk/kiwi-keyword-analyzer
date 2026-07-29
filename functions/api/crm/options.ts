// GET /api/crm/options — 집행 등록 화면이 한 번에 필요로 하는 선택지 묶음
//   내 랜딩페이지 · 내 타깃 그룹(+인원) · 승인 발신번호 · 카카오 채널/템플릿 · 요금표 · 포인트 잔액
// 화면이 5~6번 따로 부르지 않도록 한 번에 준다.
import { Env, json, ensureSchema, getSessionUser, resolveDB } from '../_utils'
import { ensureCrmSchema } from './_schema'
import { ensureLandingSchema } from '../landing/_lschema'
import { getMsgRates, KIND_LABEL } from '../_msgcost'

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db); await ensureCrmSchema(db); await ensureLandingSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)

  const all = async (sql: string, ...b: any[]) =>
    ((await db.prepare(sql).bind(...b).all().catch(() => ({ results: [] }))).results as any[]) || []

  const [landings, groups, senders, channels, templates] = await Promise.all([
    all('SELECT slug, title, status, view_count FROM landing_pages WHERE user_id = ? ORDER BY created_at DESC LIMIT 200', me.id),
    all(
      `SELECT g.id, g.name, (SELECT COUNT(*) FROM contact_group_members m WHERE m.group_id = g.id) AS count
         FROM contact_groups g WHERE g.user_id = ? ORDER BY g.created_at DESC LIMIT 200`, me.id),
    all("SELECT id, phone, label FROM sender_numbers WHERE user_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 50", me.id),
    all('SELECT channel_id, channel_name, phone_number FROM kakao_channels WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', me.id),
    all("SELECT template_id, name, status, senderkey FROM kakao_templates WHERE user_id = ? ORDER BY created_at DESC LIMIT 100", me.id),
  ])

  const rates = await getMsgRates(db, me.id)   // 회원 개별 단가가 있으면 그 값으로 보여준다
  const fresh: any = await db.prepare('SELECT points, credits FROM users WHERE id = ?').bind(me.id).first().catch(() => null)

  return json({
    ok: true,
    landings, groups, senders, channels, templates,
    rates: rates.charge,
    rateLabels: KIND_LABEL,
    points: Number(fresh?.points || 0),
    credits: Number(fresh?.credits || 0),
    isAdmin: me.role === 'admin' || me.role === 'superadmin',
  })
}
