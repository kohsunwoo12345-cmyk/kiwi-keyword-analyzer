// GET /api/admin/selfhost-status — 관리자 테스트 페이지용 자체 호스팅 현황(JSON).
//  모델 파일이 우리 R2 에 몇 개나 있는지, 현재 모드가 무엇인지, 마지막으로 외부를 탄 게 언제인지.
//  적재(다운로드)는 하지 않는다 — 순수 조회라 몇 번을 눌러도 안전하다.
import { Env, json, ensureSchema, resolveDB, resolveBucket, requireAdminUser, getSetting } from '../_utils'
import { modelKeyFromPath, SELFHOST_KEY, LAST_UPSTREAM_KEY } from '../../models/_key'
import { MODEL_FILES, SR_REQUIRED } from '../../models/_files'

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if ('error' in guard) return guard.error

  const R2: any = resolveBucket(env)
  const mode = (await getSetting(db, SELFHOST_KEY)) === 'strict' ? 'strict' : 'auto'
  const lastUpstream = (await getSetting(db, LAST_UPSTREAM_KEY)) || ''

  const files = await Promise.all(MODEL_FILES.map(async (p) => {
    if (!R2) return { path: p, inR2: false, bytes: 0 }
    try {
      const h = await R2.head(modelKeyFromPath(p))
      return { path: p, inR2: !!h, bytes: h ? h.size || 0 : 0 }
    } catch { return { path: p, inR2: false, bytes: 0 } }
  }))

  const have = files.filter((f) => f.inR2)
  const srHave = files.filter((f) => f.inR2 && SR_REQUIRED.indexOf(f.path) >= 0)
  return json({
    ok: true,
    hasBucket: !!R2,
    mode,
    lastUpstream,
    total: files.length,
    ready: have.length,
    srTotal: SR_REQUIRED.length,
    srReady: srHave.length,
    bytes: have.reduce((s, f) => s + (f.bytes || 0), 0),
    missing: files.filter((f) => !f.inR2).map((f) => f.path),
  })
}
