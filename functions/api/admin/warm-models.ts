// GET  /api/admin/warm-models — 관리자: 모델 파일이 '우리 R2 에' 있는지 점검하고, 없는 것만 상류에서 받아 적재.
//  이 페이지가 곧 자체 호스팅 증빙이다. 모두 R2 에 있으면 브라우저는 물론 서버도 외부를 타지 않는다.
//  · 이미 R2 에 있는 파일은 다시 받지 않는다(점검 = 싸고 반복 실행 안전).
//  · 자체 호스팅 전용(strict) 모드를 켜면 R2 에 없는 파일을 외부에서 받지 않는다.
//    단 이 페이지로 채우는 동안에는 적재 창이 열려 정상적으로 받아온다.
// POST /api/admin/warm-models  (mode=strict|auto) — 자체 호스팅 모드 전환.
import { Env, ensureSchema, resolveDB, resolveBucket, requireAdminUser, getSetting, setSetting } from '../_utils'
import { modelKeyFromPath, SELFHOST_KEY, WARM_UNTIL_KEY, LAST_UPSTREAM_KEY } from '../../models/_key'
// 파일 목록은 한 곳(_files.ts)에서만 관리한다 — 적재와 상태 조회의 숫자가 어긋나지 않게.
import { MODEL_FILES as FILES, SR_REQUIRED, ESRGAN_PROBES as PROBES } from '../../models/_files'

function esc(s: any) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => (({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c])) }
const mb = (n: number) => (n ? (n / 1048576).toFixed(2) + ' MB' : '-')

// 자체 호스팅 모드 전환
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return new Response('DB 없음', { status: 500 })
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if ('error' in guard) return guard.error
  const form = await request.formData().catch(() => null)
  const mode = String(form?.get('mode') || '') === 'strict' ? 'strict' : 'auto'
  await setSetting(db, SELFHOST_KEY, mode)
  return Response.redirect(new URL(request.url).origin + '/api/admin/warm-models', 303)
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const db = resolveDB(env)
  if (!db) return new Response('DB 없음', { status: 500 })
  await ensureSchema(db)
  const guard = await requireAdminUser(request, db)
  if ('error' in guard) return guard.error

  const origin = new URL(request.url).origin
  const R2: any = resolveBucket(env)
  const mode = (await getSetting(db, SELFHOST_KEY)) === 'strict' ? 'strict' : 'auto'
  const lastUpstream = (await getSetting(db, LAST_UPSTREAM_KEY)) || ''

  // 1) R2 에 이미 있는지 먼저 확인 — 있는 파일은 다시 받지 않는다(점검은 싸게, 반복 실행 안전).
  const have = await Promise.all(FILES.map(async (p) => {
    if (!R2) return { path: p, inR2: false, bytes: 0 }
    try {
      const h = await R2.head(modelKeyFromPath(p))
      return { path: p, inR2: !!h, bytes: h ? h.size || 0 : 0 }
    } catch { return { path: p, inR2: false, bytes: 0 } }
  }))
  const missing = have.filter((x) => !x.inR2).map((x) => x.path)

  // 2) 빠진 것만 상류에서 받아 적재. strict 모드여도 이 순간에는 적재 창이 열린다.
  const filled: Record<string, { ok: boolean; status: number; bytes: number }> = {}
  if (missing.length) {
    if (mode === 'strict') await setSetting(db, WARM_UNTIL_KEY, String(Date.now() + 600000))
    const results = await Promise.allSettled(missing.map(async (p) => {
      const r = await fetch(origin + p, { headers: { 'x-warm': '1' } })
      // 본문을 끝까지 읽어야 프록시가 R2 적재를 마친다. 단 통째로 담지 않고 흘려보내며 크기만 센다
      //  — 수십 MB 짜리 가중치를 병렬로 arrayBuffer 하면 워커 메모리 한도에 걸린다.
      let bytes = 0
      if (r.body) {
        const reader = r.body.getReader()
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          bytes += value ? value.byteLength : 0
        }
      }
      return { path: p, status: r.status, ok: r.ok, bytes }
    }))
    results.forEach((x, i) => {
      const p = missing[i]
      filled[p] = x.status === 'fulfilled'
        ? { ok: x.value.ok, status: x.value.status, bytes: x.value.bytes }
        : { ok: false, status: 0, bytes: 0 }
    })
    if (mode === 'strict') await setSetting(db, WARM_UNTIL_KEY, '0')   // 창 즉시 닫기
  }

  // 3) Real-ESRGAN 후보: 존재 여부만 확인 (있으면 스튜디오가 자동으로 그 가중치를 쓴다)
  const probes = await Promise.all(PROBES.map(async (p) => {
    try {
      const r = await fetch(origin + p + '?probe=1', { headers: { 'x-warm': '1' } })
      const j: any = await r.json().catch(() => ({}))
      return { path: p, ok: !!j.ok, bytes: Number(j.bytes) || 0 }
    } catch { return { path: p, ok: false, bytes: 0 } }
  }))
  const esrOk = probes.filter((x) => x.ok).length

  const rows = have.map((h) => {
    const f = filled[h.path]
    const ok = h.inR2 || !!(f && f.ok)
    return {
      path: h.path, ok,
      bytes: h.bytes || (f ? f.bytes : 0),
      state: h.inR2 ? 'R2 보유' : f ? (f.ok ? '새로 적재' : '실패 ' + f.status) : '없음',
    }
  })
  const okCount = rows.filter((r) => r.ok).length
  const totalMB = +(rows.reduce((s, r) => s + (r.bytes || 0), 0) / 1048576).toFixed(1)
  const srOk = rows.filter((r) => SR_REQUIRED.indexOf(r.path) >= 0 && r.ok).length
  const srAll = SR_REQUIRED.length
  const selfHosted = okCount === FILES.length

  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>모델 자체 호스팅 점검</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Malgun Gothic',sans-serif;background:#0b1020;color:#e6edfb;margin:0;padding:28px;}h1{font-size:20px;margin:0 0 6px;}h2{font-size:15px;margin:20px 0 6px;}p{color:#9fb0d0;font-size:13px;margin:0 0 16px;}table{width:100%;border-collapse:collapse;font-size:13px;}td,th{text-align:left;padding:7px 10px;border-bottom:1px solid #22304d;}th{color:#8fa4c6;font-size:11px;}.ok{color:#5fe0a0;font-weight:700;}.no{color:#ff8a8a;font-weight:700;}.dim{color:#8fa4c6;font-weight:400;}
.sum{margin:14px 0;padding:12px 14px;background:#111a2e;border:1px solid #22304d;border-radius:12px;font-weight:700;}
.sum.good{border-color:#2b6b4c;background:#0e2018;}.sum.warn{border-color:#6b5a2b;background:#201c0e;}
a.btn,button.btn{display:inline-block;margin-top:14px;background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;text-decoration:none;padding:9px 16px;border-radius:10px;font-weight:700;font-size:13px;border:0;cursor:pointer;}
button.btn.alt{background:linear-gradient(135deg,#475569,#64748b);}</style>
</head><body>
<h1>모델 자체 호스팅 점검 · 캐시 채우기</h1>
<p>스튜디오가 쓰는 모델·런타임 파일이 <b>우리 R2</b> 에 있는지 확인하고, 없는 것만 상류에서 받아 적재합니다.
이미 있는 파일은 다시 받지 않습니다. 전부 적재되고 strict 를 켜면 브라우저도 서버도 외부를 타지 않습니다.</p>

<div class="sum ${selfHosted ? 'good' : 'warn'}">자체 호스팅 ${okCount} / ${FILES.length} · 총 ${totalMB} MB ${selfHosted ? '— 모든 파일이 우리 R2 에 있습니다' : '— 아직 채워지지 않은 파일이 있습니다 (아래 표)'}</div>
<div class="sum">업스케일 필수 파일 ${srOk} / ${srAll} · 엔진: ${esrOk > 0 ? 'Real-ESRGAN 사용 가능 (최상급)' : 'Swin2SR (Real-ESRGAN 가중치 없음 — 정상 동작)'}</div>
<div class="sum">
  현재 모드: <b>${mode === 'strict' ? '자체 호스팅 전용(strict) — R2 에 없으면 외부에서 받지 않음' : '자동(auto) — R2 에 없으면 외부 상류에서 받아 캐시'}</b><br>
  <span class="dim">마지막 외부 상류 사용: ${lastUpstream ? esc(lastUpstream) : '기록 없음'}</span>
  <form method="post" style="margin-top:10px">
    <input type="hidden" name="mode" value="${mode === 'strict' ? 'auto' : 'strict'}">
    <button class="btn ${mode === 'strict' ? 'alt' : ''}" type="submit">${mode === 'strict' ? '자동(auto) 으로 되돌리기' : '자체 호스팅 전용(strict) 켜기'}</button>
  </form>
</div>

<h2>Real-ESRGAN 가중치 존재 확인 (다운로드 아님)</h2>
<table><thead><tr><th>후보 repo</th><th>존재</th><th>크기</th></tr></thead><tbody>
${probes.map((x) => `<tr><td>${esc(x.path)}</td><td class="${x.ok ? 'ok' : 'no'}">${x.ok ? '있음' : '없음'}</td><td>${mb(x.bytes)}</td></tr>`).join('')}
</tbody></table>

<h2>파일별 적재 상태</h2>
<table><thead><tr><th>파일</th><th>상태</th><th>크기</th></tr></thead><tbody>
${rows.map((r) => `<tr><td>${esc(r.path)}</td><td class="${r.ok ? 'ok' : 'no'}">${esc(r.state)}</td><td>${mb(r.bytes)}</td></tr>`).join('')}
</tbody></table>
<a class="btn" href="${esc(origin)}/api/admin/warm-models">다시 실행 (빠진 것만 이어받기)</a>
</body></html>`
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } })
}
