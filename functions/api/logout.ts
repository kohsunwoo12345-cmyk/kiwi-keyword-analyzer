import { Env, json, clearCookie, parseCookies, SESSION_COOKIE } from './_utils'

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = env.DB
  const token = parseCookies(request)[SESSION_COOKIE]
  if (db && token) {
    await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run().catch(() => {})
  }
  return json({ ok: true }, 200, { 'Set-Cookie': clearCookie() })
}
