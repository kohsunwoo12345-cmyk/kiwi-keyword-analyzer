// 퍼널 리소스 소유권 확인 (_ 프리픽스 = 라우팅 제외, import 전용)
//
// 왜 필요한가:
//  퍼널 그룹·랜딩페이지·신청자 엔드포인트는 다른 제품에서 이식되면서 소유자 조건이 빠졌다.
//  그 결과 id 만 알면(연속된 정수다) 남의 그룹을 지우고, 남의 랜딩페이지를 고치고,
//  남의 신청자(이름·전화번호) 를 지울 수 있었다. 아래 함수로 모든 경로에서 주인을 확인한다.
//
// 소유 관계: funnel_applicants.landing_page_id → funnel_landing_pages.group_id → funnel_groups.user_id

export function isAdminUser(me: any): boolean {
  return !!me && (me.role === 'admin' || me.role === 'superadmin')
}

/** 그룹의 주인인가 (관리자는 전부 허용) */
export async function ownsGroup(db: D1Database, me: any, groupId: any): Promise<boolean> {
  if (!me || groupId == null || groupId === '') return false
  if (isAdminUser(me)) return true
  const r: any = await db.prepare('SELECT 1 AS ok FROM funnel_groups WHERE id = ? AND user_id = ?')
    .bind(groupId, me.id).first().catch(() => null)
  return !!r
}

/** 퍼널(최상위)의 주인인가 */
export async function ownsFunnel(db: D1Database, me: any, funnelId: any): Promise<boolean> {
  if (!me || funnelId == null || funnelId === '') return false
  if (isAdminUser(me)) return true
  const r: any = await db.prepare('SELECT 1 AS ok FROM funnels WHERE id = ? AND user_id = ?')
    .bind(funnelId, me.id).first().catch(() => null)
  return !!r
}

/** 랜딩페이지의 주인인가 (그룹을 거쳐 확인) */
export async function ownsPage(db: D1Database, me: any, pageId: any): Promise<boolean> {
  if (!me || pageId == null || pageId === '') return false
  if (isAdminUser(me)) return true
  const r: any = await db.prepare(
    `SELECT 1 AS ok FROM funnel_landing_pages p JOIN funnel_groups g ON g.id = p.group_id
      WHERE p.id = ? AND g.user_id = ?`,
  ).bind(pageId, me.id).first().catch(() => null)
  return !!r
}

/** 신청자 id 들이 "전부" 내 것인가 — 하나라도 남의 것이면 통째로 거절한다.
 *  일부만 처리하면 어디까지 지워졌는지 알 수 없어 더 나쁘다. */
export async function ownsApplicants(db: D1Database, me: any, ids: any[]): Promise<boolean> {
  if (!me || !Array.isArray(ids) || ids.length === 0) return false
  if (isAdminUser(me)) return true
  const ph = ids.map(() => '?').join(',')
  const r: any = await db.prepare(
    `SELECT COUNT(*) AS n FROM funnel_applicants a
       JOIN funnel_landing_pages p ON p.id = a.landing_page_id
       JOIN funnel_groups g ON g.id = p.group_id
      WHERE a.id IN (${ph}) AND g.user_id = ?`,
  ).bind(...ids, me.id).first().catch(() => null)
  return Number(r?.n || 0) === ids.length
}

export function forbidden(msg = '권한이 없습니다.') {
  return new Response(JSON.stringify({ success: false, error: msg }), {
    status: 403, headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}
