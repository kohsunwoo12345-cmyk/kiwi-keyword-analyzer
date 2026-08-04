// GET /api/v1/model-file/<파일명>?lease=<토큰> — 빌려준 가중치를 실제로 내려준다.
//
// 리스 토큰이 없거나 만료·취소됐으면 여기서 막힌다.
//
// ⚠ 다만 이 문이 "그 파일에 닿는 유일한 길" 은 아니다. 사실대로 적어 둔다.
//   같은 가중치가 /models-sr/rdn-medium-x4.onnx 로 그냥 열려 있다(정적 자원이라
//   인증도 출처 검사도 없다 — 실측으로 200 + 2.8MB 를 그대로 받는다).
//   스튜디오가 브라우저에서 그 주소로 받아 쓰기 때문인데, 주소를 아는 사람은 누구든
//   같은 파일을 받을 수 있다. 게다가 이 모델은 MIT 라 재배포 자체가 자유다.
//   그러니 리스는 "비밀을 지키는 자물쇠" 가 아니라 "공식 배포처·기간·집계" 를 파는 것에
//   가깝다. 정말로 파일을 가둘 생각이면 public/models-sr 를 없애고 스튜디오도
//   인증된 경로로 받게 바꿔야 한다 — 그건 제품 결정이라 여기서 임의로 하지 않는다.
import { resolveDB, json } from '../../_utils'
import { LENDABLE, resolveLease } from '../_lease'

export const onRequestGet: PagesFunction = async ({ params, request, env }) => {
  const raw = (params as any).path
  const parts: string[] = Array.isArray(raw) ? raw : [String(raw || '')]
  const want = parts.join('/')
  const url = new URL((request as Request).url)
  //  토큰은 쿼리로도, 헤더로도 받는다 — 브라우저 fetch 는 헤더가 편하고 <script>/curl 은 쿼리가 편하다
  const token = url.searchParams.get('lease') || String((request as Request).headers.get('X-Lease') || '').trim()
  if (!token) return json({ ok: false, error: '리스 토큰이 필요합니다. POST /api/v1/lease 로 발급받으세요.' }, 401)

  const db = resolveDB(env)
  if (!db) return json({ ok: false, error: 'DB 바인딩 없음' }, 500)
  const hit = await resolveLease(db, env, token)
  if (!hit) return json({ ok: false, error: '리스가 유효하지 않거나 기간이 지났습니다.' }, 403)

  const m = LENDABLE[hit.p.m]
  //  빌린 모델의 파일만 준다 — 토큰 하나로 다른 모델까지 받아가면 안 된다
  const file = m?.files.find((f) => f.name === want)
  if (!file) return json({ ok: false, error: '이 리스로 받을 수 있는 파일이 아닙니다.', allowed: m?.files.map((f) => f.name) || [] }, 404)

  //  파일은 우리 자산에서 그대로 읽는다(같은 배포 안이라 외부로 나가지 않는다)
  const origin = url.origin
  const upstream = await fetch(origin + '/' + file.path.replace(/^public\//, '')).catch(() => null)
  if (!upstream || !upstream.ok) return json({ ok: false, error: '모델 파일을 읽지 못했습니다.' }, 502)
  const buf = await upstream.arrayBuffer()

  //  몇 번 받아 갔는지 남긴다(정산·이상 탐지용). 실패해도 파일은 준다.
  try { await db.prepare('UPDATE model_leases SET calls = COALESCE(calls,0) + 1 WHERE id = ?').bind(hit.p.l).run() } catch { /* noop */ }

  return new Response(buf, {
    headers: {
      'content-type': 'application/octet-stream',
      'content-disposition': `attachment; filename="${file.name}"`,
      //  캐시는 하되 공개 캐시에는 올리지 않는다 — 토큰이 붙은 주소다
      'cache-control': 'private, max-age=3600',
      'x-lease-expires': String(hit.row.expires_at || ''),
      'x-model-license': m.license,
    },
  })
}
