import { Env, json, ensureSchema, seedAdmin, resolveDB, requireAdminUser, CREDIT_KRW } from '../_utils'

const r2 = (n: number) => Math.round(n) // 원 단위 반올림

// GET /api/admin/settlement → 지사/추천인/결제/정산 내역 + 정산 계산
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await seedAdmin(db, env)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const branches = (await db.prepare('SELECT * FROM branches ORDER BY created_at ASC').all()).results || []
  const branchById = new Map<string, any>((branches as any[]).map((b) => [b.id, b]))

  // 추천으로 결제된 이벤트(피추천인 첫 유료 가입) — 결제액/추천 리워드 기록
  const rewards = (await db.prepare('SELECT * FROM referral_rewards ORDER BY created_at DESC').all()).results || []

  const users = (await db.prepare('SELECT id, name, email, branch_id FROM users').all()).results || []
  const uById = new Map<string, any>((users as any[]).map((u) => [u.id, u]))

  // 결제(정산 대상) 상세
  const payments = (rewards as any[]).map((rw) => {
    const referrer = uById.get(rw.referrer_id)
    const friend = uById.get(rw.friend_id)
    const branchId = referrer?.branch_id || ''
    const branch = branchById.get(branchId)
    const gross = Number(rw.price_krw) || 0
    const rewardKrw = r2((Number(rw.reward_credits) || 0) * CREDIT_KRW)
    const costRate = branch ? Number(branch.cost_rate) || 0 : 0
    const percent = branch ? Number(branch.percent) || 0 : 0
    // 순수익 = 결제액 × (1 - 원가율) - 추천 리워드 지급액
    const netProfit = Math.max(0, r2(gross * (1 - costRate / 100)) - rewardKrw)
    const owed = branch ? r2((netProfit * percent) / 100) : 0
    return {
      id: rw.id,
      friendName: friend?.name || '(탈퇴)',
      friendEmail: friend?.email || '',
      referrerId: rw.referrer_id,
      referrerName: referrer?.name || '(탈퇴/미상)',
      branchId,
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

  // 정산 완료 지급 기록
  const settlements = (await db.prepare('SELECT * FROM branch_settlements ORDER BY created_at DESC').all()).results || []
  const settledByBranch = new Map<string, number>()
  for (const s of settlements as any[]) settledByBranch.set(s.branch_id, (settledByBranch.get(s.branch_id) || 0) + (Number(s.amount_krw) || 0))

  // 지사별 집계
  const branchOut = (branches as any[]).map((b) => {
    const rows = payments.filter((p) => p.branchId === b.id)
    const owed = rows.reduce((a, p) => a + p.owedKrw, 0)
    const settled = settledByBranch.get(b.id) || 0
    return {
      id: b.id,
      name: b.name,
      percent: Number(b.percent) || 0,
      costRate: Number(b.cost_rate) || 0,
      memo: b.memo || '',
      createdAt: b.created_at,
      refPaidCount: rows.length,
      referrerCount: new Set(rows.map((p) => p.referrerId)).size,
      grossKrw: rows.reduce((a, p) => a + p.priceKrw, 0),
      rewardKrw: rows.reduce((a, p) => a + p.rewardKrw, 0),
      netProfitKrw: rows.reduce((a, p) => a + p.netProfitKrw, 0),
      owedKrw: owed,
      settledKrw: settled,
      outstandingKrw: Math.max(0, owed - settled),
    }
  })

  // 추천인별 집계(지사 배정용)
  const refAgg = new Map<string, any>()
  for (const p of payments) {
    const a = refAgg.get(p.referrerId) || { id: p.referrerId, name: p.referrerName, refPaidCount: 0, grossKrw: 0, rewardKrw: 0, netProfitKrw: 0, owedKrw: 0 }
    a.refPaidCount++
    a.grossKrw += p.priceKrw
    a.rewardKrw += p.rewardKrw
    a.netProfitKrw += p.netProfitKrw
    a.owedKrw += p.owedKrw
    refAgg.set(p.referrerId, a)
  }
  const referrers = [...refAgg.values()].map((a) => {
    const u = uById.get(a.id)
    const branch = branchById.get(u?.branch_id || '')
    return { ...a, email: u?.email || '', branchId: u?.branch_id || '', branchName: branch?.name || '' }
  }).sort((x, y) => y.netProfitKrw - x.netProfitKrw)

  const settlementsOut = (settlements as any[]).map((s) => ({
    id: s.id,
    branchId: s.branch_id,
    branchName: branchById.get(s.branch_id)?.name || '(삭제된 지사)',
    amountKrw: Number(s.amount_krw) || 0,
    note: s.note || '',
    createdAt: s.created_at,
  }))

  const totals = {
    paymentsCount: payments.length,
    grossKrw: payments.reduce((a, p) => a + p.priceKrw, 0),
    rewardKrw: payments.reduce((a, p) => a + p.rewardKrw, 0),
    netProfitKrw: payments.reduce((a, p) => a + p.netProfitKrw, 0),
    owedKrw: branchOut.reduce((a, b) => a + b.owedKrw, 0),
    settledKrw: branchOut.reduce((a, b) => a + b.settledKrw, 0),
    outstandingKrw: branchOut.reduce((a, b) => a + b.outstandingKrw, 0),
  }

  return json({ ok: true, branches: branchOut, referrers, payments, settlements: settlementsOut, totals })
}

// POST /api/admin/settlement — 지사 CRUD / 추천인 배정 / 정산 지급 기록
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

  if (action === 'create_branch') {
    const name = String(b.name || '').trim().slice(0, 80)
    if (!name) return json({ ok: false, error: '지사 이름을 입력하세요.' }, 400)
    await db
      .prepare('INSERT INTO branches (id, name, percent, cost_rate, memo, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind('br_' + crypto.randomUUID().slice(0, 14), name, clampPct(b.percent), clampPct(b.costRate), String(b.memo || '').slice(0, 300), now)
      .run()
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

  if (action === 'delete_branch') {
    const id = String(b.id || '')
    await db.prepare('UPDATE users SET branch_id = NULL WHERE branch_id = ?').bind(id).run()
    await db.prepare('DELETE FROM branches WHERE id = ?').bind(id).run()
    return json({ ok: true })
  }

  if (action === 'assign') {
    const referrerId = String(b.referrerId || '')
    const branchId = String(b.branchId || '')
    if (!referrerId) return json({ ok: false, error: '추천인을 지정하세요.' }, 400)
    if (branchId) {
      const exists = await db.prepare('SELECT id FROM branches WHERE id = ?').bind(branchId).first()
      if (!exists) return json({ ok: false, error: '지사를 찾을 수 없습니다.' }, 404)
      await db.prepare('UPDATE users SET branch_id = ? WHERE id = ?').bind(branchId, referrerId).run()
    } else {
      await db.prepare('UPDATE users SET branch_id = NULL WHERE id = ?').bind(referrerId).run()
    }
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
    const id = String(b.id || '')
    await db.prepare('DELETE FROM branch_settlements WHERE id = ?').bind(id).run()
    return json({ ok: true })
  }

  return json({ ok: false, error: '알 수 없는 작업입니다.' }, 400)
}
