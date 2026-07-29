// GET/POST /api/admin/msg-rates — 문자·알림톡 발송 요금표 (전체 기본 + 회원별 단가)
//   GET  : 회원도 볼 수 있다(자기 발송 비용을 알아야 하므로).
//          회원에게는 "본인에게 청구되는 단가"만, 원가·배수·다른 회원 설정은 관리자에게만.
//          ?userId=<회원>  관리자 전용 — 그 회원의 실제 적용 단가와 개별 설정
//          ?list=1        관리자 전용 — 개별 단가가 걸린 회원 목록
//          ?q=<검색어>     관리자 전용 — 회원 검색(개별 단가 지정용)
//   POST : 관리자만.
//          { base, multiplier }                       전체 기본 요금표
//          { action:'member', userId, multiplier?, charge?, memo?, clear? }  회원 개별 단가
import { Env, json, ensureSchema, resolveDB, getSessionUser, requireAdminUser, asText, sameOriginOk, logAudit, clientIp } from '../_utils'
import {
  getMsgRates, setMsgRates, setMemberOverride, ensureMsgRateSchema,
  DEFAULT_BASE_KRW, DEFAULT_MULTIPLIER, KIND_LABEL, KINDS,
} from '../_msgcost'

const isAdminRole = (me: any) => !!me && (me.role === 'admin' || me.role === 'superadmin')

/** 개별 단가가 걸린 회원 목록 (효과 단가까지 계산해 내려준다) */
async function overrideList(db: D1Database) {
  await ensureMsgRateSchema(db)
  const rows =
    (
      await db
        .prepare(
          `SELECT o.user_id, o.multiplier, o.charge_json, o.memo, o.updated_at, o.updated_by,
                  u.name, u.email, u.plan, u.points
             FROM msg_rate_overrides o LEFT JOIN users u ON u.id = o.user_id
            ORDER BY o.updated_at DESC LIMIT 300`,
        )
        .all()
        .catch(() => ({ results: [] as any[] }))
    ).results || []
  const out: any[] = []
  for (const r of rows as any[]) {
    const eff = await getMsgRates(db, String(r.user_id))
    out.push({
      userId: String(r.user_id),
      name: r.name || '(삭제된 회원)',
      email: r.email || '',
      plan: r.plan || '',
      points: Number(r.points || 0),
      multiplier: r.multiplier == null ? null : Number(r.multiplier),
      charge: eff.charge,
      source: eff.source,
      fixed: eff.override?.charge || {},
      memo: String(r.memo || ''),
      updatedAt: String(r.updated_at || ''),
      updatedBy: String(r.updated_by || ''),
    })
  }
  return out
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)
  const isAdmin = isAdminRole(me)
  const url = new URL(request.url)

  // ── 회원: 자기에게 청구되는 단가만 ──
  if (!isAdmin) {
    const mine = await getMsgRates(db, me.id)
    return json({ ok: true, charge: mine.charge, labels: KIND_LABEL, custom: !!mine.override })
  }

  // ── 관리자 ──
  const wantUser = asText(url.searchParams.get('userId'), 64)
  const q = asText(url.searchParams.get('q'), 60).trim()
  const r = await getMsgRates(db, wantUser || null)

  let member: any = null
  if (wantUser) {
    const u: any = await db.prepare('SELECT id, name, email, plan, points FROM users WHERE id = ?').bind(wantUser).first().catch(() => null)
    member = u
      ? {
          userId: String(u.id), name: u.name || '', email: u.email || '', plan: u.plan || '', points: Number(u.points || 0),
          charge: r.charge, source: r.source, override: r.override,
        }
      : null
  }

  let found: any[] = []
  if (q) {
    const like = `%${q}%`
    found =
      (
        await db
          .prepare("SELECT id, name, email, plan, points FROM users WHERE name LIKE ? OR email LIKE ? ORDER BY created_at DESC LIMIT 20")
          .bind(like, like)
          .all()
          .catch(() => ({ results: [] as any[] }))
      ).results || []
  }

  return json({
    ok: true,
    charge: r.globalCharge,          // 관리자 화면의 "전체 기본"
    labels: KIND_LABEL,
    kinds: KINDS,
    base: r.base,
    multiplier: r.globalMultiplier,
    defaults: { base: DEFAULT_BASE_KRW, multiplier: DEFAULT_MULTIPLIER },
    overrides: url.searchParams.get('list') === '1' ? await overrideList(db) : undefined,
    member,
    found: q ? found.map((u: any) => ({ userId: String(u.id), name: u.name || '', email: u.email || '', plan: u.plan || '', points: Number(u.points || 0) })) : undefined,
  })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error
  if (!sameOriginOk(request)) return json({ ok: false, error: '잘못된 요청' }, 403)
  const admin = { id: guard.me.id, email: guard.me.email }
  const b: any = (await request.json().catch(() => null)) ?? {}

  // ── 회원 개별 단가 ──
  if (asText(b.action) === 'member') {
    const userId = asText(b.userId, 64)
    if (!userId) return json({ ok: false, error: '회원을 선택하세요.' }, 400)
    const u: any = await db.prepare('SELECT id, name, email FROM users WHERE id = ?').bind(userId).first().catch(() => null)
    if (!u) return json({ ok: false, error: '회원을 찾을 수 없습니다.' }, 404)

    const ov = await setMemberOverride(db, userId, { multiplier: b.multiplier, charge: b.charge, memo: b.memo, clear: !!b.clear }, admin.email || admin.id)
    const eff = await getMsgRates(db, userId)
    await logAudit(
      db, admin, 'msg_rate_member', userId,
      ov
        ? `발송 단가 개별 설정 (${u.email || u.name}) · ${ov.multiplier != null ? `배수 ${ov.multiplier}` : '배수 기본'}${Object.keys(ov.charge).length ? ` · 고정 ${JSON.stringify(ov.charge)}` : ''}`
        : `발송 단가 개별 설정 해제 (${u.email || u.name})`,
      'info', clientIp(request),
    ).catch(() => {})
    return json({ ok: true, override: ov, charge: eff.charge, source: eff.source, globalCharge: eff.globalCharge, labels: KIND_LABEL })
  }

  // ── 전체 기본 요금표 ──
  const r = await setMsgRates(db, { base: b.base, multiplier: b.multiplier })
  await logAudit(db, admin, 'msg_rate_global', '', `발송 요금표 변경 · 배수 ${r.multiplier} · ${JSON.stringify(r.charge)}`, 'info', clientIp(request)).catch(() => {})
  return json({ ok: true, base: r.base, multiplier: r.multiplier, charge: r.charge, labels: KIND_LABEL })
}
