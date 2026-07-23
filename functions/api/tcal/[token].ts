// GET /api/tcal/:token  — 공개(읽기전용) 팀 캘린더 데이터. 팀 공유(team) 일정만 노출.
import { resolveDB } from '../../api/_utils'
import { verifyTcalShare } from '../../api/_tcal'

const cjson = (obj: any, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*' } })

export const onRequestGet: PagesFunction = async ({ params, env }) => {
  const raw = (params as any).token
  const token = Array.isArray(raw) ? raw.join('/') : String(raw || '')
  const v = await verifyTcalShare(env, token)
  if (!v) return cjson({ ok: false, error: '유효하지 않은 링크입니다.' }, 404)
  const db: any = resolveDB(env)
  if (!db) return cjson({ ok: false, error: 'DB 없음' }, 500)

  const board: any = await db.prepare('SELECT b.id, b.name, b.team_id, t.name AS team_name FROM team_cal_boards b LEFT JOIN teams t ON t.id = b.team_id WHERE b.id = ?').bind(v.bid).first().catch(() => null)
  if (!board) return cjson({ ok: false, error: '캘린더를 찾을 수 없습니다.' }, 404)

  const rows = (await db.prepare(
    `SELECT id, owner_name, d, title, color, memo FROM team_cal_events
      WHERE board_id = ? AND visibility = 'team' ORDER BY d ASC, created_at ASC LIMIT 1000`,
  ).bind(v.bid).all().catch(() => ({ results: [] }))).results || []

  return cjson({ ok: true, name: board.name || '집행 캘린더', team: board.team_name || '', events: rows })
}
