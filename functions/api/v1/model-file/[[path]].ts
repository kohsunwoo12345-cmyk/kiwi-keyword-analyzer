// GET /api/v1/model-file/<파일명>?lease=<토큰> — 빌려준 가중치를 실제로 내려준다.
//
// 리스 토큰이 없거나 만료·취소됐으면 여기서 막힌다. 이 문이 대여의 전부다 —
// 파일이 다른 경로로도 열려 있으면 빌려주는 의미가 없다.
// (public/models-sr 는 스튜디오가 브라우저에서 쓰는 자리라 같은 출처에서는 열려 있다.
//  그건 우리 회원이 우리 서비스 안에서 쓰는 경우고, 대여는 밖으로 나가는 경우다.)
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
