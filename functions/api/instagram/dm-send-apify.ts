// Apify 기반 DM 발송 (SUPERPLACE 미구현 엔드포인트) — 설정 필요 스텁
const j = (obj: any, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

export const onRequestPost: PagesFunction = async () => j({ ok: false, success: false, error: '설정 필요' })
