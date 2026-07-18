import { Env, json, ensureSchema, resolveDB, requireAdminUser } from '../_utils'
import { ensureAiUsage } from '../studio/_pricing'

// GET /api/admin/user-activity            → 등록 사용자 목록 + 활동 요약
// GET /api/admin/user-activity?userId=ID  → 해당 사용자의 통합 활동 타임라인(활동·거래·워크플로 공유·팀·생성)
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  await ensureAiUsage(db)
  const guard = await requireAdminUser(request, db)
  if (guard.error) return guard.error

  const url = new URL(request.url)
  const userId = url.searchParams.get('userId')
  const rows = async (sql: string, ...b: any[]) => (await db.prepare(sql).bind(...b).all()).results || []

  if (userId) {
    const u: any = await db.prepare('SELECT id, name, email, plan, video_plan, team_plan, team_seats, team_until, credits, points, provider, status, created_at, last_active FROM users WHERE id = ?').bind(userId).first()
    if (!u) return json({ ok: false, error: '사용자를 찾을 수 없습니다.' }, 404)

    const events: any[] = []
    const acts = await rows('SELECT type, detail, created_at FROM activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 500', userId)
    acts.forEach((a: any) => events.push({ cat: 'activity', kind: a.type, title: actTitle(a.type), detail: a.detail || '', at: a.created_at }))

    const txs = await rows('SELECT kind, amount, balance_after, memo, created_at FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 300', userId)
    txs.forEach((t: any) => events.push({ cat: 'tx', kind: t.kind, title: (t.amount >= 0 ? '지급/충전 ' : '차감 ') + (t.kind === 'point' ? '포인트' : '크레딧'), detail: (t.memo || '') + (t.balance_after != null ? ` · 잔액 ${Number(t.balance_after).toLocaleString('ko-KR')}` : ''), amount: Number(t.amount) || 0, unit: t.kind === 'point' ? '포인트' : '크레딧', at: t.created_at }))

    // 워크플로 공유 — 보낸/받은
    const shSent = await rows("SELECT s.name, s.node_count, s.received, s.created_at, u2.name AS toName, u2.email AS toEmail FROM team_shares s LEFT JOIN users u2 ON u2.id = s.to_user_id WHERE s.from_user_id = ? ORDER BY s.created_at DESC LIMIT 200", userId)
    shSent.forEach((s: any) => events.push({ cat: 'share', kind: 'sent', title: '워크플로 공유(보냄)', detail: `"${s.name}" · 노드 ${s.node_count}개 → ${s.toName || s.toEmail || '팀원'}${s.received ? ' · 저장됨' : ' · 미수신'}`, at: s.created_at }))
    const shRecv = await rows("SELECT s.name, s.node_count, s.received, s.created_at, s.from_name FROM team_shares s WHERE s.to_user_id = ? ORDER BY s.created_at DESC LIMIT 200", userId)
    shRecv.forEach((s: any) => events.push({ cat: 'share', kind: 'recv', title: '워크플로 공유(받음)', detail: `"${s.name}" · 노드 ${s.node_count}개 · ${s.from_name || '팀원'}에게서${s.received ? ' · 저장완료' : ' · 대기'}`, at: s.created_at }))

    // 팀 초대(보낸/받은) + 참여
    const invSent = await rows("SELECT i.status, i.created_at, t.name AS teamName, u2.name AS toName FROM team_invites i LEFT JOIN teams t ON t.id=i.team_id LEFT JOIN users u2 ON u2.id=i.to_user_id WHERE i.from_user_id = ? ORDER BY i.created_at DESC LIMIT 100", userId)
    invSent.forEach((i: any) => events.push({ cat: 'team', kind: 'invite', title: '팀 초대(보냄)', detail: `"${i.teamName || '팀'}" → ${i.toName || '회원'} · ${invStatus(i.status)}`, at: i.created_at }))
    const mems = await rows("SELECT m.role, m.joined_at, t.name AS teamName FROM team_members m LEFT JOIN teams t ON t.id=m.team_id WHERE m.user_id = ? ORDER BY m.joined_at DESC LIMIT 100", userId)
    mems.forEach((m: any) => events.push({ cat: 'team', kind: 'member', title: m.role === 'owner' ? '팀 생성/소유' : '팀 참여', detail: `"${m.teamName || '팀'}" · ${m.role === 'owner' ? '오너' : '멤버'}`, at: m.joined_at }))

    // AI 생성
    const gens = await rows("SELECT model, kind, credits, prompt, created_at FROM ai_usage WHERE user_id = ? ORDER BY created_at DESC LIMIT 300", userId)
    gens.forEach((g: any) => events.push({ cat: 'gen', kind: g.kind, title: `AI ${g.kind === 'image' ? '이미지' : '영상'} 생성`, detail: `${g.model || ''}${g.prompt ? ' · ' + String(g.prompt).slice(0, 60) : ''}`, amount: -(Number(g.credits) || 0), unit: '크레딧', at: g.created_at }))

    events.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))

    return json({
      ok: true,
      user: {
        id: u.id, name: u.name, email: u.email, plan: u.plan || '없음', videoPlan: u.video_plan || '없음',
        teamPlan: Number(u.team_plan) === 1 ? 1 : 0, teamSeats: Number(u.team_seats) || 0, teamUntil: u.team_until || '',
        credits: Math.round((Number(u.credits) || 0) * 100) / 100, points: Number(u.points) || 0,
        provider: u.provider || 'email', status: u.status || 'active', createdAt: u.created_at, lastActive: u.last_active,
      },
      events: events.slice(0, 800),
    })
  }

  // ── 사용자 목록 + 요약 ──
  const users = await rows('SELECT id, name, email, plan, video_plan, team_plan, credits, points, provider, status, created_at, last_active FROM users ORDER BY (last_active IS NULL), last_active DESC, created_at DESC LIMIT 1000')
  const mapCount = async (sql: string) => {
    const r = await rows(sql); const m: Record<string, number> = {}
    r.forEach((x: any) => { m[x.uid] = Number(x.c) || 0 }); return m
  }
  const actMap = await mapCount('SELECT user_id AS uid, COUNT(*) AS c FROM activity_log GROUP BY user_id')
  const genMap = await mapCount('SELECT user_id AS uid, COUNT(*) AS c FROM ai_usage GROUP BY user_id')
  const sentMap = await mapCount('SELECT from_user_id AS uid, COUNT(*) AS c FROM team_shares GROUP BY from_user_id')
  const recvMap = await mapCount('SELECT to_user_id AS uid, COUNT(*) AS c FROM team_shares GROUP BY to_user_id')

  const list = (users as any[]).map((u) => ({
    id: u.id, name: u.name, email: u.email,
    plan: u.plan || '없음', videoPlan: u.video_plan || '없음', teamPlan: Number(u.team_plan) === 1 ? 1 : 0,
    credits: Math.round((Number(u.credits) || 0) * 100) / 100, points: Number(u.points) || 0,
    provider: u.provider || 'email', status: u.status || 'active', createdAt: u.created_at, lastActive: u.last_active,
    activityCount: actMap[u.id] || 0, genCount: genMap[u.id] || 0, sharesSent: sentMap[u.id] || 0, sharesRecv: recvMap[u.id] || 0,
  }))
  return json({ ok: true, total: list.length, users: list })
}

function actTitle(type: string): string {
  const m: Record<string, string> = {
    login: '로그인', signup: '회원가입', referral: '추천', password: '비밀번호 변경', plan: '플랜',
    point: '포인트', credit: '크레딧', sms: '문자 발송', sender: '발신번호', friend: '친구 추가',
    consent: '동의', address: '주소 등록', delete: '계정 삭제', landing: '랜딩페이지', status: '상태 변경',
    notify: '알림', kakao: '카카오', purchase: '결제', page: '페이지',
  }
  return m[type] || type
}
function invStatus(s: string): string {
  return s === 'accepted' ? '수락됨' : s === 'declined' ? '거절됨' : '대기중'
}
