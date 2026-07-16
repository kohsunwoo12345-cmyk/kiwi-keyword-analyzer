import { Env, json, ensureSchema, seedAdmin, resolveDB, requireAdminUser, CREDIT_KRW } from '../_utils'

const r2 = (n: number) => Math.round(n) // 원 단위 반올림

// GET /api/admin/settlement            → 지사/결제/정산 집계
// GET /api/admin/settlement?users=검색  → 계정 검색(지사 대표 지정용)
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await seedAdmin(db, env)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const url = new URL(request.url)

  // ── 계정 검색 모드 (지사 대표 계정 선택) ──
  const uq = url.searchParams.get('users')
  if (uq !== null) {
    const q = String(uq).trim().toLowerCase()
    const rows = (await db
      .prepare(
        `SELECT id, name, email, referral_code, plan, video_plan FROM users
         WHERE (? = '' OR lower(name) LIKE ? OR lower(email) LIKE ? OR lower(referral_code) LIKE ?)
         ORDER BY created_at DESC LIMIT 20`,
      )
      .bind(q, `%${q}%`, `%${q}%`, `%${q}%`)
      .all()).results || []
    return json({
      ok: true,
      users: (rows as any[]).map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        referralCode: u.referral_code || '',
        plan: u.plan || '없음',
        videoPlan: u.video_plan || '없음',
      })),
    })
  }

  const branches = (await db.prepare('SELECT * FROM branches ORDER BY created_at ASC').all()).results || []
  // 지사 대표 계정 → 지사 매핑 (한 계정은 한 지사에만)
  const branchByOwner = new Map<string, any>()
  for (const b of branches as any[]) if (b.owner_id) branchByOwner.set(b.owner_id, b)

  const rewards = (await db.prepare('SELECT * FROM referral_rewards ORDER BY created_at DESC').all()).results || []
  const users = (await db.prepare('SELECT id, name, email, referral_code FROM users').all()).results || []
  const uById = new Map<string, any>((users as any[]).map((u) => [u.id, u]))

  // 결제(정산 대상): 각 추천 결제 → 추천인이 대표로 있는 지사에 귀속. 본인 결제(referrer==friend)는 제외.
  const payments = (rewards as any[])
    .filter((rw) => rw.referrer_id && rw.friend_id && rw.referrer_id !== rw.friend_id)
    .map((rw) => {
      const referrer = uById.get(rw.referrer_id)
      const friend = uById.get(rw.friend_id)
      const branch = branchByOwner.get(rw.referrer_id) // 이 추천인을 대표로 둔 지사
      const gross = Number(rw.price_krw) || 0
      const rewardKrw = r2((Number(rw.reward_credits) || 0) * CREDIT_KRW)
      const costRate = branch ? Number(branch.cost_rate) || 0 : 0
      const percent = branch ? Number(branch.percent) || 0 : 0
      const netProfit = Math.max(0, r2(gross * (1 - costRate / 100)) - rewardKrw)
      const owed = branch ? r2((netProfit * percent) / 100) : 0
      return {
        id: rw.id,
        friendName: friend?.name || '(탈퇴)',
        friendEmail: friend?.email || '',
        referrerId: rw.referrer_id,
        referrerName: referrer?.name || '(탈퇴/미상)',
        referrerCode: referrer?.referral_code || '',
        branchId: branch?.id || '',
        branchName: branch?.name || '',
        track: rw.track === 'video' ? 'video' : 'marketer',
        plan: rw.plan,
        priceKrw: gross,
        rewardCredits: Number(rw.reward_credits) || 0,
        rewardKrw,
        netProfitKrw: netProfit,
        owedKrw: owed,
        createdAt: rw.created_at,
      }
    })

  const settlements = (await db.prepare('SELECT * FROM branch_settlements ORDER BY created_at DESC').all()).results || []
  const settledByBranch = new Map<string, number>()
  for (const s of settlements as any[]) settledByBranch.set(s.branch_id, (settledByBranch.get(s.branch_id) || 0) + (Number(s.amount_krw) || 0))

  const branchOut = (branches as any[]).map((b) => {
    const rows = payments.filter((p) => p.branchId === b.id)
    const owed = rows.reduce((a, p) => a + p.owedKrw, 0)
    const settled = settledByBranch.get(b.id) || 0
    const owner = b.owner_id ? uById.get(b.owner_id) : null
    return {
      id: b.id,
      name: b.name,
      ownerId: b.owner_id || '',
      ownerName: owner?.name || (b.owner_id ? '(탈퇴/미상)' : ''),
      ownerEmail: owner?.email || '',
      ownerCode: owner?.referral_code || '',
      percent: Number(b.percent) || 0,
      costRate: Number(b.cost_rate) || 0,
      memo: b.memo || '',
      createdAt: b.created_at,
      refPaidCount: rows.length,
      grossKrw: rows.reduce((a, p) => a + p.priceKrw, 0),
      rewardKrw: rows.reduce((a, p) => a + p.rewardKrw, 0),
      netProfitKrw: rows.reduce((a, p) => a + p.netProfitKrw, 0),
      owedKrw: owed,
      settledKrw: settled,
      outstandingKrw: Math.max(0, owed - settled),
    }
  })

  const settlementsOut = (settlements as any[]).map((s) => {
    const b = (branches as any[]).find((x) => x.id === s.branch_id)
    return { id: s.id, branchId: s.branch_id, branchName: b?.name || '(삭제된 지사)', amountKrw: Number(s.amount_krw) || 0, note: s.note || '', createdAt: s.created_at }
  })

  const totals = {
    paymentsCount: payments.length,
    grossKrw: payments.reduce((a, p) => a + p.priceKrw, 0),
    rewardKrw: payments.reduce((a, p) => a + p.rewardKrw, 0),
    netProfitKrw: payments.reduce((a, p) => a + p.netProfitKrw, 0),
    owedKrw: branchOut.reduce((a, b) => a + b.owedKrw, 0),
    settledKrw: branchOut.reduce((a, b) => a + b.settledKrw, 0),
    outstandingKrw: branchOut.reduce((a, b) => a + b.outstandingKrw, 0),
  }

  return json({ ok: true, branches: branchOut, payments, settlements: settlementsOut, totals })
}

// POST /api/admin/settlement — 지사 CRUD / 대표 계정 지정 / 정산 지급 기록
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const b: any = await request.json().catch(() => ({}))
  const action = String(b.action || '')
  const now = new Date().toISOString()
  const clampPct = (v: any) => Math.max(0, Math.min(100, Number(v) || 0))

  // 대표 계정은 한 지사에만 — 다른 지사에서 같은 계정을 쓰고 있으면 해제
  async function claimOwner(ownerId: string, exceptBranchId: string) {
    if (!ownerId) return
    await db.prepare('UPDATE branches SET owner_id = NULL WHERE owner_id = ? AND id != ?').bind(ownerId, exceptBranchId).run()
  }

  if (action === 'create_branch') {
    const name = String(b.name || '').trim().slice(0, 80)
    if (!name) return json({ ok: false, error: '지사 이름을 입력하세요.' }, 400)
    const ownerId = String(b.ownerId || '').trim() || null
    const id = 'br_' + crypto.randomUUID().slice(0, 14)
    await db
      .prepare('INSERT INTO branches (id, name, owner_id, percent, cost_rate, memo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, name, ownerId, clampPct(b.percent), clampPct(b.costRate), String(b.memo || '').slice(0, 300), now)
      .run()
    if (ownerId) await claimOwner(ownerId, id)
    return json({ ok: true })
  }

  if (action === 'update_branch') {
    const id = String(b.id || '')
    const cur: any = await db.prepare('SELECT * FROM branches WHERE id = ?').bind(id).first()
    if (!cur) return json({ ok: false, error: '지사를 찾을 수 없습니다.' }, 404)
    const name = b.name != null ? String(b.name).trim().slice(0, 80) || cur.name : cur.name
    const percent = b.percent != null ? clampPct(b.percent) : Number(cur.percent) || 0
    const costRate = b.costRate != null ? clampPct(b.costRate) : Number(cur.cost_rate) || 0
    const memo = b.memo != null ? String(b.memo).slice(0, 300) : cur.memo || ''
    await db.prepare('UPDATE branches SET name = ?, percent = ?, cost_rate = ?, memo = ? WHERE id = ?').bind(name, percent, costRate, memo, id).run()
    return json({ ok: true })
  }

  if (action === 'set_owner') {
    const id = String(b.id || '')
    const ownerId = String(b.ownerId || '').trim()
    const exists = await db.prepare('SELECT id FROM branches WHERE id = ?').bind(id).first()
    if (!exists) return json({ ok: false, error: '지사를 찾을 수 없습니다.' }, 404)
    if (ownerId) {
      const u = await db.prepare('SELECT id FROM users WHERE id = ?').bind(ownerId).first()
      if (!u) return json({ ok: false, error: '계정을 찾을 수 없습니다.' }, 404)
      await db.prepare('UPDATE branches SET owner_id = ? WHERE id = ?').bind(ownerId, id).run()
      await claimOwner(ownerId, id)
    } else {
      await db.prepare('UPDATE branches SET owner_id = NULL WHERE id = ?').bind(id).run()
    }
    return json({ ok: true })
  }

  if (action === 'delete_branch') {
    const id = String(b.id || '')
    await db.prepare('DELETE FROM branches WHERE id = ?').bind(id).run()
    return json({ ok: true })
  }

  if (action === 'settle') {
    const branchId = String(b.branchId || '')
    const amount = Math.round(Number(b.amount) || 0)
    if (!branchId) return json({ ok: false, error: '지사를 선택하세요.' }, 400)
    if (amount <= 0) return json({ ok: false, error: '정산 금액을 입력하세요.' }, 400)
    const exists = await db.prepare('SELECT id FROM branches WHERE id = ?').bind(branchId).first()
    if (!exists) return json({ ok: false, error: '지사를 찾을 수 없습니다.' }, 404)
    await db
      .prepare('INSERT INTO branch_settlements (id, branch_id, amount_krw, note, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind('bs_' + crypto.randomUUID().slice(0, 14), branchId, amount, String(b.note || '').slice(0, 300), now)
      .run()
    return json({ ok: true })
  }

  if (action === 'delete_settlement') {
    await db.prepare('DELETE FROM branch_settlements WHERE id = ?').bind(String(b.id || '')).run()
    return json({ ok: true })
  }

  return json({ ok: false, error: '알 수 없는 작업입니다.' }, 400)
}
