// 관리자: 알림 발송 내역 (자동 발송 / 수동 발송 / 캠페인 / 시스템)
//  GET /api/admin/notify-log?trigger=auto&kind=sms&q=&from=&to=&userId=&page=1
//  GET /api/admin/notify-log?format=csv|xlsx   → 다운로드
import { Env, json, ensureSchema, resolveDB, requireAdminUser, asText } from '../_utils'
import { ensureNotifySchema, TRIGGER_LABEL, NOTIFY_KIND_LABEL } from '../_notify'
import { buildXlsx, sheetToCsv, type Sheet } from './_xlsx'

const kst = (iso: any) => { try { return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) } catch { return String(iso || '') } }
const PAGE = 100

const COLS: [string, string][] = [
  ['created_at', '발송일시'], ['trigger', '구분'], ['kind', '채널'], ['owner', '회원'], ['owner_email', '회원이메일'],
  ['recipient', '수신'], ['recipient_name', '수신자명'], ['landing_title', '랜딩페이지'], ['landing_slug', 'slug'],
  ['subject', '제목'], ['content', '내용'], ['ok', '결과'], ['reason', '사유'], ['points', '차감P'],
]

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureNotifySchema(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const url = new URL(request.url)
  const trigger = asText(url.searchParams.get('trigger'), 16)
  const kind = asText(url.searchParams.get('kind'), 16)
  const q = asText(url.searchParams.get('q'), 60).trim()
  const userId = asText(url.searchParams.get('userId'), 64)
  const from = asText(url.searchParams.get('from'), 10)
  const to = asText(url.searchParams.get('to'), 10)
  const format = asText(url.searchParams.get('format'), 8)
  const page = Math.max(1, Math.min(500, Math.floor(Number(url.searchParams.get('page')) || 1)))

  const where: string[] = []
  const binds: any[] = []
  if (trigger && trigger !== 'all') { where.push('n.trigger = ?'); binds.push(trigger) }
  if (kind && kind !== 'all') { where.push('n.kind = ?'); binds.push(kind) }
  if (userId) { where.push('n.user_id = ?'); binds.push(userId) }
  // 날짜는 KST 기준으로 받아 UTC 로 바꿔 비교한다(하루가 밀리지 않게)
  if (/^\d{4}-\d{2}-\d{2}$/.test(from)) { where.push('n.created_at >= ?'); binds.push(new Date(`${from}T00:00:00+09:00`).toISOString()) }
  if (/^\d{4}-\d{2}-\d{2}$/.test(to)) { where.push('n.created_at <= ?'); binds.push(new Date(`${to}T23:59:59+09:00`).toISOString()) }
  if (q) {
    // 제목(캠페인 이름·메일 제목)과 slug 로도 찾을 수 있어야 한다 — 캠페인 이름으로 검색하면
    //  아무것도 안 나오던 문제가 있었다.
    where.push('(n.recipient LIKE ? OR n.recipient_name LIKE ? OR n.subject LIKE ? OR n.content LIKE ? OR n.landing_title LIKE ? OR n.landing_slug LIKE ? OR u.name LIKE ? OR u.email LIKE ?)')
    for (let i = 0; i < 8; i++) binds.push(`%${q}%`)
  }
  const wh = where.length ? 'WHERE ' + where.join(' AND ') : ''

  const base = `FROM notify_log n LEFT JOIN users u ON u.id = n.user_id ${wh}`

  // ── 다운로드 ──
  if (format === 'csv' || format === 'xlsx') {
    const rows = ((await db.prepare(
      `SELECT n.*, u.name AS owner, u.email AS owner_email ${base} ORDER BY n.created_at DESC LIMIT 100000`,
    ).bind(...binds).all()).results || []) as any[]
    const sheet: Sheet = {
      name: '알림발송내역',
      headers: COLS.map(([, h]) => h),
      rows: rows.map((r) => COLS.map(([k]) => {
        if (k === 'created_at') return kst(r.created_at)
        if (k === 'trigger') return (TRIGGER_LABEL as any)[r.trigger] || r.trigger || ''
        if (k === 'kind') return NOTIFY_KIND_LABEL[r.kind] || r.kind || ''
        if (k === 'ok') return r.ok ? '성공' : '실패'
        return r[k] ?? ''
      })),
    }
    const fname = `notify_log_${trigger || 'all'}_${new Date().toISOString().slice(0, 10)}`
    if (format === 'csv') {
      return new Response('﻿' + sheetToCsv(sheet), {
        headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${fname}.csv"` },
      })
    }
    return new Response(buildXlsx([sheet]), {
      headers: {
        'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'content-disposition': `attachment; filename="${fname}.xlsx"`,
      },
    })
  }

  const cnt: any = await db.prepare(`SELECT COUNT(*) AS n ${base}`).bind(...binds).first().catch(() => null)
  const total = Number(cnt?.n || 0)
  const rows = ((await db.prepare(
    `SELECT n.id, n.user_id, n.trigger, n.event, n.kind, n.recipient, n.recipient_name, n.subject, n.content,
            n.ok, n.reason, n.points, n.landing_slug, n.landing_title, n.ref_id, n.created_at,
            u.name AS owner, u.email AS owner_email
     ${base} ORDER BY n.created_at DESC LIMIT ? OFFSET ?`,
  ).bind(...binds, PAGE, (page - 1) * PAGE).all()).results || []) as any[]

  // 구분별 집계 — 필터와 무관하게 전체 기준(상단 타일)
  const agg = ((await db.prepare(
    `SELECT trigger, COUNT(*) AS n, SUM(CASE WHEN ok=1 THEN 1 ELSE 0 END) AS okn, SUM(points) AS pts
       FROM notify_log GROUP BY trigger`,
  ).all()).results || []) as any[]
  const counts: Record<string, { total: number; ok: number; points: number }> = {}
  for (const a of agg) counts[String(a.trigger || 'system')] = { total: Number(a.n || 0), ok: Number(a.okn || 0), points: Number(a.pts || 0) }

  return json({
    ok: true,
    rows: rows.map((r) => ({
      ...r,
      ok: !!r.ok,
      triggerLabel: (TRIGGER_LABEL as any)[r.trigger] || r.trigger || '',
      kindLabel: NOTIFY_KIND_LABEL[r.kind] || r.kind || '',
    })),
    total, page, pageSize: PAGE,
    counts,
    labels: { trigger: TRIGGER_LABEL, kind: NOTIFY_KIND_LABEL },
  })
}
