// Ported from SUPERPLACE (BYGENCY) — Hono 핸들러를 Cloudflare Pages Functions로 변환.
// Hono 컨텍스트(c) 호환 shim + 인증 무력화(툴 공개 동작, youtube 이식과 동일 패턴).
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
// 인증 shim — BYGENCY 대시보드 내 임베드 공개 도구이므로 통과시킴
const tryGetUserFromHeaders = (_c: any): { ok: true; user: any; userId: number } => ({ ok: true, user: { id: 0 }, userId: 0 })
const tryGetUserFromSession = async (_c: any): Promise<{ ok: true; user: any; userId: number }> => ({ ok: true, user: { id: 0 }, userId: 0 })
const getSessionUser = async (_c: any): Promise<any> => null
const kvRateLimit = async (..._a: any[]): Promise<boolean> => true
async function triggerDailyRankUpdateIfNeeded(_env?: any, _ctx?: any): Promise<void> {}
const puppeteer: any = (globalThis as any).puppeteer

export const onRequestDelete: PagesFunction = async (context) => {
  const c: any = makeC(context)
  try {
    const id = c.req.param('id')
    const authUser = tryGetUserFromHeaders(c)
    if (!authUser.ok) return authUser.response
    const user = authUser.user
    
    await c.env.DB.prepare(`
      UPDATE naver_place_tracking SET status = 'deleted' WHERE id = ? AND CAST(user_id AS INTEGER) = CAST(? AS INTEGER)
    `).bind(id, user.id).run()
    
    return c.json({
      success: true,
      message: '키워드 추적이 삭제되었습니다.'
    })
  } catch (error) {
    console.error('Error deleting tracking keyword:', error)
    return c.json({ success: false, error: '키워드 삭제 실패' }, 500)
  }
}
