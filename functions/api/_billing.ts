// 결제·정산 인프라 — 결제 원장(payments) + 세금계산서 + 현금영수증 + 환불 + 정기결제(구독).
// 현재는 계좌이체·관리자 승인 시점에 payments 를 적재하고, PG 연동 후 결제 웹훅이 같은 원장을 쓴다.

export async function ensureBilling(db: D1Database) {
  await db.batch([
    // 결제 원장 (모든 실입금의 단일 소스). PG 연동 시 웹훅이 여기에 기록.
    db.prepare(`CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT,
      email TEXT,
      source TEXT,            -- plan | credit | team | credit_order | manual
      ref_id TEXT,            -- 원천 레코드 id (중복 적재 방지 키)
      description TEXT,
      amount INTEGER DEFAULT 0,         -- 총액(VAT 포함)
      supply_amount INTEGER DEFAULT 0,  -- 공급가액
      vat INTEGER DEFAULT 0,            -- 부가세(10%)
      method TEXT DEFAULT 'bank',       -- bank | card | pg
      status TEXT DEFAULT 'paid',       -- paid | refunded | partial_refund
      refunded_amount INTEGER DEFAULT 0,
      pg_key TEXT,
      created_at TEXT NOT NULL,
      paid_at TEXT
    )`),
    db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_pay_ref ON payments(source, ref_id)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_pay_created ON payments(created_at)`),
    // 세금계산서
    db.prepare(`CREATE TABLE IF NOT EXISTS tax_invoices (
      id TEXT PRIMARY KEY,
      payment_id TEXT,
      user_id TEXT,
      biz_number TEXT,        -- 사업자등록번호
      company TEXT,
      ceo TEXT,
      address TEXT,
      email TEXT,
      amount INTEGER DEFAULT 0,
      supply_amount INTEGER DEFAULT 0,
      vat INTEGER DEFAULT 0,
      status TEXT DEFAULT 'requested',  -- requested | issued | cancelled
      nts_key TEXT,           -- 국세청 승인번호(발행 후)
      memo TEXT,
      requested_at TEXT,
      issued_at TEXT
    )`),
    // 현금영수증
    db.prepare(`CREATE TABLE IF NOT EXISTS cash_receipts (
      id TEXT PRIMARY KEY,
      payment_id TEXT,
      user_id TEXT,
      purpose TEXT DEFAULT 'income',    -- income(소득공제) | expense(지출증빙)
      identifier TEXT,                  -- 휴대폰번호 또는 사업자번호
      amount INTEGER DEFAULT 0,
      supply_amount INTEGER DEFAULT 0,
      vat INTEGER DEFAULT 0,
      status TEXT DEFAULT 'requested',  -- requested | issued | cancelled
      approval_no TEXT,
      requested_at TEXT,
      issued_at TEXT
    )`),
    // 환불
    db.prepare(`CREATE TABLE IF NOT EXISTS refunds (
      id TEXT PRIMARY KEY,
      payment_id TEXT,
      user_id TEXT,
      amount INTEGER DEFAULT 0,
      reason TEXT,
      status TEXT DEFAULT 'requested',  -- requested | approved | rejected | done
      admin_email TEXT,
      requested_at TEXT,
      decided_at TEXT
    )`),
    // 정기결제(구독) — PG 빌링키 연동 후 자동 청구. 지금은 원장/스케줄 관리.
    db.prepare(`CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      track TEXT,
      plan TEXT,
      months INTEGER DEFAULT 1,
      amount INTEGER DEFAULT 0,          -- 1주기 결제액
      status TEXT DEFAULT 'active',      -- active | paused | cancelled
      pg_billing_key TEXT,
      started_at TEXT,
      next_billing_at TEXT,
      cancelled_at TEXT
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_sub_next ON subscriptions(status, next_billing_at)`),
  ])
}

/** 부가세 10% 분해 (총액 → 공급가액/부가세) */
export function vatSplit(amount: number): { supply: number; vat: number } {
  const a = Math.max(0, Math.round(Number(amount) || 0))
  const supply = Math.round(a / 1.1)
  return { supply, vat: a - supply }
}

/**
 * 결제 원장 적재 (중복 방지 — 같은 source+ref_id 는 1건). 계좌이체 승인·PG 웹훅 공통 진입점.
 */
export async function recordPayment(
  db: D1Database,
  p: { userId: string; name?: string; email?: string; source: string; refId: string; description?: string; amount: number; method?: string; pgKey?: string; paidAt?: string },
): Promise<void> {
  try {
    await ensureBilling(db)
    const amount = Math.max(0, Math.round(Number(p.amount) || 0))
    if (amount <= 0) return
    const { supply, vat } = vatSplit(amount)
    const now = new Date().toISOString()
    await db.prepare(
      `INSERT OR IGNORE INTO payments (id, user_id, name, email, source, ref_id, description, amount, supply_amount, vat, method, status, refunded_amount, pg_key, created_at, paid_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', 0, ?, ?, ?)`,
    ).bind('pay_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16), p.userId || '', p.name || '', p.email || '',
      p.source, p.refId, (p.description || '').slice(0, 200), amount, supply, vat, p.method || 'bank', p.pgKey || null, now, p.paidAt || now).run()
  } catch { /* 원장 적재 실패는 승인 자체를 막지 않음 */ }
}
