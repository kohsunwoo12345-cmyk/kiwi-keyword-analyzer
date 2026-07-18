import { Env, json, ensureSchema, seedAdmin, resolveDB, requireAdminUser, logAudit, clientIp } from '../_utils'
import { buildXlsx, sheetToCsv, type Sheet } from './_xlsx'

// 회원 DB 세그먼트 추출 — 국가/요금제/접속·결제 상태로 필터 → 미리보기(json) 또는 CSV/XLSX 다운로드
//
// GET /api/admin/db-export?segment=&country=&plan=&days=&format=json|csv|xlsx
//   segment: all | inactive(미접속) | paid_inactive(결제O·미접속) | active_unpaid(접속O·미결제)
//   country: 국가값(빈값=전체)
//   plan:    ''(전체) | none(미가입) | team | marketer:Plus|Pro|Max | video:Plus|Pro|Max
//   days:    미접속 기준 일수(기본 14)

const COLS: [string, string][] = [
  ['name', '이름'], ['email', '이메일'], ['phone', '전화번호'], ['company', '회사'], ['country', '국가'],
  ['plan', '마케터플랜'], ['video_plan', '영상플랜'], ['team_plan', '팀요금제'],
  ['credits', '보유크레딧'], ['points', '보유포인트'], ['provider', '가입경로'],
  ['marketing_consent', '수신동의'], ['created_at', '가입일시'], ['last_active', '최근접속'],
  ['referral_code', '추천코드'], ['referred_by', '추천인'],
]
const YN = new Set(['marketing_consent'])
const PAID = "((plan IS NOT NULL AND plan != '없음') OR (video_plan IS NOT NULL AND video_plan != '없음') OR team_plan = 1)"

function buildWhere(url: URL): { where: string; binds: any[]; label: string } {
  const conds = ["role != 'admin'"]
  const binds: any[] = []
  const labels: string[] = []
  const segment = String(url.searchParams.get('segment') || 'all')
  const days = Math.min(3650, Math.max(1, Number(url.searchParams.get('days') || 14)))
  const threshold = new Date(Date.now() - days * 86400000).toISOString()
  const inactive = '(last_active IS NULL OR last_active < ?)'
  const active = '(last_active IS NOT NULL AND last_active >= ?)'

  if (segment === 'inactive') { conds.push(inactive); binds.push(threshold); labels.push(`${days}일미접속`) }
  else if (segment === 'paid_inactive') { conds.push(PAID); conds.push(inactive); binds.push(threshold); labels.push('결제O미접속') }
  else if (segment === 'active_unpaid') { conds.push('NOT ' + PAID); conds.push(active); binds.push(threshold); labels.push('접속O미결제') }

  const country = String(url.searchParams.get('country') || '').trim()
  if (country) { conds.push('country = ?'); binds.push(country); labels.push(country) }

  const plan = String(url.searchParams.get('plan') || '').trim()
  if (plan === 'none') { conds.push('NOT ' + PAID); labels.push('미가입') }
  else if (plan === 'team') { conds.push('team_plan = 1'); labels.push('팀요금제') }
  else if (plan.includes(':')) {
    const [track, tier] = plan.split(':')
    const col = track === 'video' ? 'video_plan' : 'plan'
    if (['Plus', 'Pro', 'Max'].includes(tier)) { conds.push(`${col} = ?`); binds.push(tier); labels.push(`${track === 'video' ? '영상' : '마케터'}${tier}`) }
  }
  return { where: conds.join(' AND '), binds, label: labels.length ? labels.join('_') : (segment === 'all' ? '전체회원' : segment) }
}

function cell(k: string, v: any): string | number {
  if (k === 'team_plan') return Number(v) === 1 ? 'Y' : 'N'
  if (YN.has(k)) return v ? 'Y' : 'N'
  if (v == null) return ''
  return typeof v === 'number' ? v : String(v)
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await seedAdmin(db, env)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const url = new URL(request.url)
  const format = String(url.searchParams.get('format') || 'json')
  const { where, binds, label } = buildWhere(url)

  if (format === 'json') {
    // 미리보기(최대 500) + 총 건수 + 필터용 국가 목록
    const total: any = await db.prepare(`SELECT COUNT(*) c FROM users WHERE ${where}`).bind(...binds).first().catch(() => ({ c: 0 }))
    const rows = (await db.prepare(`SELECT * FROM users WHERE ${where} ORDER BY COALESCE(last_active, created_at) DESC LIMIT 500`).bind(...binds).all()).results as any[] || []
    const countries = (await db.prepare("SELECT country, COUNT(*) c FROM users WHERE role != 'admin' AND country IS NOT NULL AND country != '' GROUP BY country ORDER BY c DESC LIMIT 100").all()).results as any[] || []
    return json({
      ok: true,
      total: Number(total?.c) || 0,
      headers: COLS.map((c) => c[1]),
      rows: rows.map((r) => COLS.map(([k]) => cell(k, r[k]))),
      countries: countries.map((r) => ({ country: r.country, count: Number(r.c) || 0 })),
    })
  }

  // 파일 다운로드
  const rows = (await db.prepare(`SELECT * FROM users WHERE ${where} ORDER BY COALESCE(last_active, created_at) DESC LIMIT 100000`).bind(...binds).all()).results as any[] || []
  const sheet: Sheet = { name: '회원DB', headers: COLS.map((c) => c[1]), rows: rows.map((r) => COLS.map(([k]) => cell(k, r[k]))) }
  const today = new Date().toISOString().slice(0, 10)
  const base = `bygency-DB-${label}-${today}`
  try { await logAudit(db, { id: guard.me.id, email: guard.me.email }, 'db_export', `${label}-${format}`, `${rows.length}명`, 'high', clientIp(request)) } catch { /* noop */ }

  const enc = new TextEncoder()
  const headers = (fname: string, ct: string) => ({
    'Content-Type': ct,
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fname)}`,
    'Cache-Control': 'no-store',
  })
  if (format === 'csv') {
    return new Response('﻿' + sheetToCsv(sheet), { headers: headers(`${base}.csv`, 'text/csv; charset=utf-8') })
  }
  return new Response(buildXlsx([sheet]), { headers: headers(`${base}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') })
}
