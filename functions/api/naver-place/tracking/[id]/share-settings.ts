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

export const onRequestGet: PagesFunction = async (context) => {
  const c: any = makeC(context)
  try {
    const id = c.req.param('id')
    const authUser = tryGetUserFromHeaders(c)
    if (!authUser.ok) return authUser.response
    const user = authUser.user
    const db = c.env.DB

    // share 컬럼 migration (없으면 추가)
    try { await db.prepare(`ALTER TABLE naver_place_tracking ADD COLUMN share_title TEXT DEFAULT NULL`).run() } catch(_) {}
    try { await db.prepare(`ALTER TABLE naver_place_tracking ADD COLUMN share_subtitle TEXT DEFAULT NULL`).run() } catch(_) {}
    try { await db.prepare(`ALTER TABLE naver_place_tracking ADD COLUMN share_thumbnail TEXT DEFAULT NULL`).run() } catch(_) {}

    const row: any = await db.prepare(
      `SELECT share_title, share_subtitle, share_thumbnail FROM naver_place_tracking WHERE id = ? AND CAST(user_id AS INTEGER) = CAST(? AS INTEGER)`
    ).bind(id, user.id).first()

    if (!row) return c.json({ share_title: null, share_subtitle: null, share_thumbnail: null })
    return c.json({ share_title: row.share_title, share_subtitle: row.share_subtitle, share_thumbnail: row.share_thumbnail })
  } catch (e) {
    return c.json({ share_title: null, share_subtitle: null, share_thumbnail: null })
  }
}

export const onRequestPut: PagesFunction = async (context) => {
  const c: any = makeC(context)
  try {
    const id = c.req.param('id')
    const authUser = tryGetUserFromHeaders(c)
    if (!authUser.ok) return authUser.response
    const user = authUser.user
    const db = c.env.DB
    const body: any = await c.req.json()

    const shareTitle     = (body.share_title     || '').slice(0, 80)
    const shareSubtitle  = (body.share_subtitle  || '').slice(0, 160)
    const shareThumbnail = (body.share_thumbnail || '').slice(0, 500)

    // share 컬럼 migration
    try { await db.prepare(`ALTER TABLE naver_place_tracking ADD COLUMN share_title TEXT DEFAULT NULL`).run() } catch(_) {}
    try { await db.prepare(`ALTER TABLE naver_place_tracking ADD COLUMN share_subtitle TEXT DEFAULT NULL`).run() } catch(_) {}
    try { await db.prepare(`ALTER TABLE naver_place_tracking ADD COLUMN share_thumbnail TEXT DEFAULT NULL`).run() } catch(_) {}

    const result = await db.prepare(
      `UPDATE naver_place_tracking SET share_title = ?, share_subtitle = ?, share_thumbnail = ? WHERE id = ? AND CAST(user_id AS INTEGER) = CAST(? AS INTEGER)`
    ).bind(shareTitle || null, shareSubtitle || null, shareThumbnail || null, id, user.id).run()

    if (result.meta.changes === 0) return c.json({ success: false, error: '권한 없음 또는 없는 추적 ID' }, 403)
    return c.json({ success: true })
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500)
  }
}
