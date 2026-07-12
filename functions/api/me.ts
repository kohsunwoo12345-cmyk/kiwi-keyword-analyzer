import { Env, json, ensureSchema, getSessionUser, publicUser } from './_utils'

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = env.DB
  if (!db) return json({ ok: false, user: null })
  await ensureSchema(db)
  const row = await getSessionUser(request, db)
  return json({ ok: true, user: publicUser(row) })
}
