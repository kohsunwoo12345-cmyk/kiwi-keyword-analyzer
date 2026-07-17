import { Env, json, ensureSchema, getSessionUser, resolveDB, ensureMcpToken } from '../_utils'

// GET  /api/account/mcp-token          → 본인 MCP 토큰(없으면 자동 발급) + 개인 연결 URL
// POST /api/account/mcp-token {regenerate:true} → 토큰 재발급(기존 연결은 끊김)
async function reply(request: Request, env: Env, regenerate: boolean) {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const me: any = await getSessionUser(request, db)
  if (!me) return json({ ok: false, error: '로그인이 필요합니다.' }, 401)
  const token = await ensureMcpToken(db, me.id, regenerate)
  const origin = new URL(request.url).origin
  return json({ ok: true, token, url: origin + '/api/mcp/' + token, base: origin + '/api/mcp' })
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => reply(request, env, false)

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const b: any = await request.clone().json().catch(() => ({}))
  return reply(request, env, !!b.regenerate)
}
