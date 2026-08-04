// Ported from SUPERPLACE: GET/POST /api/funnel/groups (Hono → CF Pages Functions)
import { resolveDB, getSessionUser, asText } from '../_utils'
import { ensureFunnelSchema } from './_schema'

const j = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

// 퍼널 그룹 목록
export const onRequestGet: PagesFunction = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    /*  못 불러온 것을 "없음" 으로 보여 주면 안 된다 — 화면이 빈 목록을 진짜 값으로 캐시한다. */
    if (!db) return j({ success: false, error: '그룹 목록을 불러오지 못했습니다.', groups: [] }, 503)
    await ensureFunnelSchema(db)
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, error: '로그인이 필요합니다.', needLogin: true }, 401)
    /* ⚠ 예전에는 이 조회를 try 로 감싸고 실패하면 console.warn 만 남긴 뒤
       그대로 success: true · groups: [] 를 돌려줬다. 회원 화면에는 "그룹이 없습니다" 가 뜬다 —
       만들어 둔 그룹이 사라진 것처럼 보이고, 오류가 아니라서 아무도 고장을 모른다.
       못 불러왔으면 못 불러왔다고 말한다. */
    const result = await db.prepare(`
      SELECT id, name, description, color, created_at, updated_at
      FROM funnel_groups
      WHERE (funnel_id IS NULL OR funnel_id = 0) AND user_id = ?
      ORDER BY created_at DESC
    `).bind(me.id).all()
    const groups = ((result.results as any[]) || [])

    /* 개수는 한 번에 센다. 예전에는 그룹마다 두 번씩 물어봐서(랜딩 수·신청자 수)
       그룹 30개면 질의가 61번이었다 — Cloudflare 는 요청 하나가 쓸 수 있는 서브리퀘스트
       수를 세고, 넘으면 그 요청이 통째로 죽는다. 많이 만든 회원일수록 목록이 안 열린다. */
    const counts = await db.prepare(`
      SELECT g.id AS gid,
             COUNT(DISTINCT p.id) AS lp,
             COUNT(a.id)          AS ap
        FROM funnel_groups g
        LEFT JOIN funnel_landing_pages p ON p.group_id = g.id
        LEFT JOIN funnel_applicants   a ON a.landing_page_id = p.id
       WHERE (g.funnel_id IS NULL OR g.funnel_id = 0) AND g.user_id = ?
       GROUP BY g.id
    `).bind(me.id).all().catch(() => ({ results: [] as any[] }))
    const byId = new Map<any, any>()
    for (const r of ((counts as any).results || []) as any[]) byId.set(String(r.gid), r)
    for (const g of groups) {
      const c = byId.get(String(g.id))
      g.landing_page_count = Number(c?.lp || 0)
      g.applicant_count = Number(c?.ap || 0)
    }

    return j({ success: true, groups: groups })
  } catch (error) {
    console.error('Error fetching groups:', error)
    return j({ success: false, error: '그룹 목록을 불러오지 못했습니다.', groups: [] }, 500)
  }
}

// 퍼널 그룹 생성
export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const db = resolveDB(env)
    if (!db) return j({ success: false, error: 'DB 바인딩 없음' }, 500)
    await ensureFunnelSchema(db)
    const me: any = await getSessionUser(request, db)
    if (!me) return j({ success: false, error: '로그인이 필요합니다.', needLogin: true }, 401)
    const _b = (((await request.json().catch(() => null)) as any) || {})
    // 길이 제한 — 없으면 20만 자짜리 그룹 이름도 그대로 저장된다
    const name = asText(_b.name, 80)
    const description = String(_b.description || '').slice(0, 500)
    const color = String(_b.color || '').slice(0, 20)
    const userId = me.id

    if (!name) {
      return j({ success: false, error: '그룹 이름을 입력해주세요.' }, 400)
    }

    const now = new Date().toISOString()
    const result = await db.prepare(`
      INSERT INTO funnel_groups (user_id, name, description, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(userId, name, description || '', color || '#6366f1', now, now).run()

    return j({
      success: true,
      message: '퍼널 그룹이 생성되었습니다.',
      id: result.meta.last_row_id,
    })
  } catch (error) {
    console.error('Error creating group:', error)
    return j({ success: false, error: '그룹 생성 실패' }, 500)
  }
}
