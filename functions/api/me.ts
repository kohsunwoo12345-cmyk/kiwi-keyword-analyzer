import { Env, json, ensureSchema, seedAdmin, getSessionUser, publicUser, resolveDB } from './_utils'

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, user: null })
  await ensureSchema(db)
  await seedAdmin(db, env)
  const row = await getSessionUser(request, db)
  return json({ ok: true, user: publicUser(row) })
}
