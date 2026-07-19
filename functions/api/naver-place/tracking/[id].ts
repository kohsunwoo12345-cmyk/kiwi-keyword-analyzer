// Ported from SUPERPLACE (BYGENCY) — Hono 핸들러를 Cloudflare Pages Functions로 변환.
// Hono 컨텍스트(c) 호환 shim. 인증은 실제 세션(getSessionUser)으로 복원되어 계정별로 격리된다.
import { getSessionUser, resolveDB } from '../../_utils'
function makeC(context: any): any {
  const { request, env, params } = context
  return {
    env,
    executionCtx: context,
    req: {
      url: request.url,
      json: () => request.json(),
      formData: () => request.formData(),
      query: (k: string) => new URL(request.url).searchParams.get(k),
      param: (k: string) => (params ? params[k] : undefined),
      header: (k: string) => request.headers.get(k),
    },
    json: (o: any, status = 200) =>
      new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } }),
    html: (h: any, status = 200) =>
      new Response(h, { status, headers: { 'content-type': 'text/html; charset=utf-8' } }),
    text: (t: any, status = 200) =>
      new Response(t, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } }),
  }
}
const kvRateLimit = async (..._a: any[]): Promise<boolean> => true
async function triggerDailyRankUpdateIfNeeded(_env?: any, _ctx?: any): Promise<void> {}
const puppeteer: any = (globalThis as any).puppeteer

export const onRequestDelete: PagesFunction = async (context) => {
  const c: any = makeC(context)
  try {
    const id = c.req.param('id')
    const db = resolveDB(c.env) || c.env.DB || c.env.marketing
    if (!db) return c.json({ success: false, error: 'DB 바인딩 없음' }, 500)

    // 실제 세션 인증 — 본인 소유 추적만 삭제 가능
    const me: any = await getSessionUser(context.request, db)
    if (!me) return c.json({ success: false, error: '로그인이 필요합니다.', needLogin: true }, 401)

    const result = await db.prepare(`
      UPDATE naver_place_tracking SET status = 'deleted' WHERE id = ? AND user_id = ?
    `).bind(id, me.id).run()

    if (result.meta.changes === 0) return c.json({ success: false, error: '권한 없음 또는 없는 추적 ID' }, 403)

    return c.json({
      success: true,
      message: '키워드 추적이 삭제되었습니다.'
    })
  } catch (error) {
    console.error('Error deleting tracking keyword:', error)
    return c.json({ success: false, error: '키워드 삭제 실패' }, 500)
  }
}
