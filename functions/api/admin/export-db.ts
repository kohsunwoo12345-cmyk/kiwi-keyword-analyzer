import { Env, ensureSchema, seedAdmin, resolveDB, requireAdminUser, logAudit, clientIp } from '../_utils'
import { buildXlsx, type Sheet } from './_xlsx'

// GET /api/admin/export-db  → 주요 DB 테이블을 한 엑셀(.xlsx) 파일로 내보내기 (관리자 전용)
const TABLES = [
  'users', 'transactions', 'ai_usage', 'referral_rewards',
  'plan_requests', 'credit_requests', 'branches', 'branch_settlements',
  'user_model_markups', 'activity_log',
]
// 민감/불필요 컬럼은 제외
const HIDE = new Set(['password_hash', 'password', 'salt'])

async function dump(db: D1Database, table: string): Promise<Sheet | null> {
  try {
    const rows = (await db.prepare(`SELECT * FROM ${table} LIMIT 100000`).all()).results as any[]
    if (!rows || !rows.length) return { name: table, headers: ['(빈 테이블)'], rows: [] }
    const headers = Object.keys(rows[0]).filter((h) => !HIDE.has(h))
    return {
      name: table,
      headers,
      rows: rows.map((r) => headers.map((h) => {
        const v = r[h]
        if (v == null) return ''
        return typeof v === 'number' ? v : String(v)
      })),
    }
  } catch {
    return null // 테이블 없음 → 건너뜀
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return new Response(JSON.stringify({ ok: false, error: 'DB 바인딩 없음' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  await ensureSchema(db)
  await seedAdmin(db, env)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const sheets: Sheet[] = []
  for (const t of TABLES) { const s = await dump(db, t); if (s) sheets.push(s) }
  const xlsx = buildXlsx(sheets)

  try { await logAudit(db, { id: guard.me.id, email: guard.me.email }, 'db_export', 'xlsx', sheets.map((s) => s.name).join(','), 'high', clientIp(request)) } catch { /* noop */ }

  const today = new Date().toISOString().slice(0, 10)
  return new Response(xlsx, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="bygency-db-${today}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  })
}
