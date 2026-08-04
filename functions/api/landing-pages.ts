import { json, getSessionUser, resolveDB } from './_utils'

// GET /api/landing-pages → 세션 사용자의 랜딩페이지 목록. SUPERPLACE Hono 라우트 이식.
export const onRequestGet: PagesFunction<any> = async ({ request, env }) => {
  /* ⚠ 예전에는 이 주소를 다른 제품 도메인으로 박아 두고 있었다(이식 잔재).
     회원이 여기서 복사한 링크를 문자·알림톡으로 뿌리면 자기 페이지가 아닌 곳으로 간다.
     지금 요청이 들어온 주소를 그대로 쓴다 — 어느 도메인에 배포해도 맞는다. */
  const origin = new URL(request.url).origin
  const db = resolveDB(env)
  if (!db) return json({ success: false, error: 'DB 바인딩 없음' }, 500)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ success: false, error: '로그인이 필요합니다.' }, 401)
  const userId = String(me.id)

  try {
    const results = await db
      .prepare(
        `SELECT id, title, slug, status, view_count, created_at
         FROM landing_pages WHERE user_id = ? ORDER BY created_at DESC`,
      )
      .bind(userId)
      .all()

    const pages = (results.results || []).map((p: any) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      url: `${origin}/landing/${p.slug}`,
      status: p.status,
      viewCount: p.view_count,
      createdAt: p.created_at,
    }))

    return json({ success: true, count: pages.length, pages })
  } catch (err) {
    return json({ success: false, error: `요청 처리 중 오류가 발생했습니다.` }, 500)
  }
}
