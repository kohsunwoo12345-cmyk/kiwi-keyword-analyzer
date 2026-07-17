import { Env, ensureSchema, seedAdmin, resolveDB, requireAdminUser, logAudit, clientIp } from '../_utils'
import { buildXlsx, sheetToCsv, zipFiles, type Sheet } from './_xlsx'

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

// 회원 명단(마케팅·전체) 전용 컬럼 — 마케팅 활용에 필요한 항목만 정돈해서 내보냄
const MEMBER_COLS: [string, string][] = [
  ['name', '이름'], ['email', '이메일'], ['phone', '전화번호'], ['company', '회사'], ['country', '국가'],
  ['plan', '마케터플랜'], ['video_plan', '영상플랜'], ['provider', '가입경로'],
  ['marketing_consent', '수신동의'], ['tos_consent', '약관동의'], ['privacy_consent', '개인정보동의'], ['consent_at', '동의일시'],
  ['created_at', '가입일시'], ['last_active', '최근접속'], ['credits', '보유크레딧'],
  ['referral_code', '추천코드'], ['referred_by', '추천인'],
]
const YN = new Set(['marketing_consent', 'tos_consent', 'privacy_consent'])

async function memberSheet(db: D1Database, where: string, name: string): Promise<Sheet> {
  const rows = (await db.prepare(`SELECT * FROM users WHERE ${where} ORDER BY created_at DESC LIMIT 100000`).all()).results as any[] || []
  return {
    name,
    headers: MEMBER_COLS.map((c) => c[1]),
    rows: rows.map((r) => MEMBER_COLS.map(([k]) => {
      const v = r[k]
      if (YN.has(k)) return v ? 'Y' : 'N'
      if (v == null) return ''
      return typeof v === 'number' ? v : String(v)
    })),
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return new Response(JSON.stringify({ ok: false, error: 'DB 바인딩 없음' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  await ensureSchema(db)
  await seedAdmin(db, env)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const url = new URL(request.url)
  const scope = String(url.searchParams.get('scope') || 'full')
  const isCsv = String(url.searchParams.get('format') || 'xlsx') === 'csv'
  const today = new Date().toISOString().slice(0, 10)
  const admin = { id: guard.me.id, email: guard.me.email }
  const ip = clientIp(request)
  const enc = new TextEncoder()
  const file = (buf: Uint8Array, fname: string, ct: string) => new Response(buf, {
    headers: {
      'Content-Type': ct,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fname)}`,
      'Cache-Control': 'no-store',
    },
  })
  const XLSX_CT = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  const CSV_CT = 'text/csv; charset=utf-8'
  // 단일 시트 응답 (엑셀 or CSV)
  const single = (sheet: Sheet, base: string) => isCsv
    ? file(enc.encode(sheetToCsv(sheet)), `${base}-${today}.csv`, CSV_CT)
    : file(buildXlsx([sheet]), `${base}-${today}.xlsx`, XLSX_CT)

  // 수신동의(마케팅 동의) 회원만
  if (scope === 'marketing') {
    const sheet = await memberSheet(db, "role != 'admin' AND marketing_consent = 1", '수신동의회원')
    try { await logAudit(db, admin, 'db_export', 'members-marketing' + (isCsv ? '-csv' : ''), String(sheet.rows.length) + '명', 'high', ip) } catch { /* noop */ }
    return single(sheet, 'bygency-수신동의회원')
  }
  // 전체(일반) 회원 명단
  if (scope === 'members') {
    const sheet = await memberSheet(db, "role != 'admin'", '전체회원')
    try { await logAudit(db, admin, 'db_export', 'members-all' + (isCsv ? '-csv' : ''), String(sheet.rows.length) + '명', 'high', ip) } catch { /* noop */ }
    return single(sheet, 'bygency-전체회원')
  }

  // 기본: 주요 테이블 전체 — 엑셀은 다중 시트, CSV는 테이블별 CSV를 ZIP으로 묶어 제공
  const sheets: Sheet[] = []
  for (const t of TABLES) { const s = await dump(db, t); if (s) sheets.push(s) }
  try { await logAudit(db, admin, 'db_export', 'full-db' + (isCsv ? '-csv' : ''), sheets.map((s) => s.name).join(','), 'high', ip) } catch { /* noop */ }
  if (isCsv) {
    const zip = zipFiles(sheets.map((s) => ({ name: s.name + '.csv', data: enc.encode(sheetToCsv(s)) })))
    return file(zip, `bygency-db-${today}-csv.zip`, 'application/zip')
  }
  return file(buildXlsx(sheets), `bygency-db-${today}.xlsx`, XLSX_CT)
}
