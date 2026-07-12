import { Env, json, ensureSchema, seedAdmin, resolveDB, resolveBucket, bindingKeys, ADMIN_EMAIL } from './_utils'

// 배포/바인딩 진단용: https://<도메인>/api/health
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const db = resolveDB(env)
  const bucket = resolveBucket(env)
  let dbOk = false
  let userCount = -1
  let adminSeeded = false
  let error: string | undefined

  if (db) {
    try {
      await ensureSchema(db)
      await seedAdmin(db, env)
      const row: any = await db.prepare('SELECT COUNT(*) AS n FROM users').first()
      userCount = row?.n ?? 0
      const admin = await db.prepare('SELECT id FROM users WHERE email = ?').bind(ADMIN_EMAIL).first()
      adminSeeded = !!admin
      dbOk = true
    } catch (e: any) {
      error = String(e?.message || e)
    }
  }

  return json({
    ok: true,
    functions: true,
    dbBinding: !!db,
    dbOk,
    r2Binding: !!bucket,
    userCount,
    adminSeeded,
    adminEmail: ADMIN_EMAIL,
    detectedBindings: bindingKeys(env), // 실제로 잡힌 바인딩 변수명 목록
    hint: db
      ? 'D1 정상 감지. 로그인 사용 가능.'
      : "D1 바인딩이 감지되지 않았습니다. 이 도메인을 서비스하는 Pages 프로젝트의 Production 환경에 D1 바인딩을 추가하고 재배포하세요. detectedBindings 배열에 D1 변수명이 보이면 코드가 자동으로 잡습니다.",
    error,
  })
}
