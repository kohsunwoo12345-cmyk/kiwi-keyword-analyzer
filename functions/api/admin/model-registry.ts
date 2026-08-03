/* 관리자 — 모델 등록부 CRUD
   ⚠ 등록(POST)은 반드시 "그 모델이 실제로 있는가" 를 다시 확인한 뒤에만 쓴다.
     화면에서 이미 확인했더라도 서버가 한 번 더 본다 — 화면 값만 믿으면
     확인을 건너뛴 요청 하나로 "고를 수는 있는데 누르면 404" 인 모델이 회원에게 나간다.
     확인은 필수 항목을 비운 채 물어보는 방식이라 작업이 안 만들어진다 = 무과금.
   ⚠ 확인 방법이 없는 제공사는 등록을 거부한다. 사장님 지시가 "검증 완료 후 추가" 다. */
import { getSessionUser, resolveDB } from '../_utils'
import { listAll, upsert, setEnabled, remove, type ModelRow } from '../studio/_registry'

const json = (o: any, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } })

async function admin(request: Request, env: any) {
  const db = resolveDB(env)
  if (!db) return null
  const me = await getSessionUser(request, db)
  return me && me.role === 'admin' ? db : null
}

/** 같은 도메인의 진단 엔드포인트로 무과금 확인을 한 번 더 돌린다(관리자 쿠키를 그대로 넘긴다). */
async function verifyOnServer(request: Request, provider: string, id: string) {
  const url = new URL('/api/generate', request.url)
  url.searchParams.set('diag', 'model-verify')
  url.searchParams.set('provider', provider)
  url.searchParams.set('id', id)
  const r = await fetch(url.toString(), {
    headers: { cookie: request.headers.get('cookie') || '', 'user-agent': 'Mozilla/5.0' },
  })
  return await r.json().catch(() => ({ ok: false, error: '확인 응답을 읽지 못했습니다.' })) as any
}

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const db = await admin(request, env as any)
  if (!db) return json({ error: '관리자 전용입니다.' }, 403)
  return json({ ok: true, models: await listAll(db) })
}

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const db = await admin(request, env as any)
  if (!db) return json({ error: '관리자 전용입니다.' }, 403)
  const b: any = await request.json().catch(() => ({}))

  const name = String(b.name || '').trim()
  const provider = String(b.provider || '').trim()
  const modelId = String(b.modelId || '').trim()
  if (!name || !provider || !modelId) return json({ error: '표시명·제공사·모델 ID 는 필수입니다.' }, 400)

  const usd = Number(b.usd)
  if (!Number.isFinite(usd) || usd < 0)
    return json({ error: '단가(usd)를 넣어 주세요 — 없으면 회원에게 요금을 못 매깁니다.' }, 400)

  //  ⚠ 여기가 "검증 완료 후 추가" 를 실제로 지키는 자리다.
  const v = await verifyOnServer(request, provider, modelId)
  if (!v || !v.ok) {
    return json({
      error: '확인에 실패해 등록하지 않았습니다 — 회원이 고를 수 있는데 안 되는 모델은 만들지 않습니다.',
      확인결과: v || null,
    }, 400)
  }

  const row: ModelRow = {
    name, provider, modelId,
    cat: String(b.cat || (String(b.kind) === 'image' ? '이미지' : '영상')),
    kind: String(b.kind || 'video'),
    unit: String(b.unit || (String(b.kind) === 'image' ? 'img' : 'sec')),
    usd,
    opts: b.opts || {},
    enabled: b.enabled === false ? 0 : 1,
    verifiedAt: new Date().toISOString(),
    note: b.note ? String(b.note).slice(0, 300) : null,
  }
  await upsert(db, row)
  return json({ ok: true, saved: row, 확인결과: v })
}

export const onRequestPatch: PagesFunction = async ({ request, env }) => {
  const db = await admin(request, env as any)
  if (!db) return json({ error: '관리자 전용입니다.' }, 403)
  const b: any = await request.json().catch(() => ({}))
  const name = String(b.name || '').trim()
  if (!name) return json({ error: 'name 이 필요합니다.' }, 400)
  await setEnabled(db, name, b.enabled !== false)
  return json({ ok: true })
}

export const onRequestDelete: PagesFunction = async ({ request, env }) => {
  const db = await admin(request, env as any)
  if (!db) return json({ error: '관리자 전용입니다.' }, 403)
  const name = String(new URL(request.url).searchParams.get('name') || '').trim()
  if (!name) return json({ error: 'name 이 필요합니다.' }, 400)
  await remove(db, name)
  return json({ ok: true })
}
