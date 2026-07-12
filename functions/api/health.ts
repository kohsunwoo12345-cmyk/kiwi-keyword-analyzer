import { Env, json, ensureSchema, seedAdmin, ADMIN_EMAIL } from './_utils'

// 배포 상태 진단용: https://<도메인>/api/health
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const hasDB = !!env.DB
  let dbOk = false
  let userCount = -1
  let adminSeeded = false
  let error: string | undefined

  if (hasDB) {
    try {
      await ensureSchema(env.DB)
      await seedAdmin(env.DB, env)
      const row: any = await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first()
      userCount = row?.n ?? 0
      const admin = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(ADMIN_EMAIL).first()
      adminSeeded = !!admin
      dbOk = true
    } catch (e: any) {
      error = String(e?.message || e)
    }
  }

  return json({
    ok: true,
    functions: true,
    dbBinding: hasDB,
    dbOk,
    userCount,
    adminSeeded,
    adminEmail: ADMIN_EMAIL,
    hint: hasDB
      ? 'D1 바인딩 정상. 로그인 사용 가능.'
      : "Cloudflare Pages → Settings → Functions → Bindings 에서 D1을 변수명 'DB'로 연결하세요.",
    error,
  })
}
