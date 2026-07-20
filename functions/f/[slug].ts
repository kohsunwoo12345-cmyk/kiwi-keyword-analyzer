import { resolveDB, ensureSchema } from '../api/_utils'
import { ensureFunnelSchema } from '../api/funnel/_schema'

// 공개 퍼널 랜딩페이지 렌더 (/f/{slug}) — 신청 폼은 /api/funnel/apply 로 제출 → 자동응답(문자/알림톡) 실행
const esc = (s: string) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
const FIELD: Record<string, { label: string; type: string; ph: string }> = {
  name: { label: '이름', type: 'text', ph: '홍길동' },
  phone: { label: '연락처', type: 'tel', ph: '010-0000-0000' },
  email: { label: '이메일', type: 'email', ph: 'you@example.com' },
}

export const onRequestGet: PagesFunction<any> = async ({ params, env }) => {
  const slug = String((params as any).slug || '')
  const db = resolveDB(env)
  if (!db) return new Response('DB 미연결', { status: 500 })
  await ensureSchema(db); await ensureFunnelSchema(db)

  const page: any = await db.prepare('SELECT * FROM funnel_landing_pages WHERE slug = ?').bind(slug).first().catch(() => null)
  if (!page) {
    return new Response(
      `<!doctype html><meta charset="utf-8"><title>페이지 없음</title><body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#0a0f1e;color:#e5e7eb"><div style="text-align:center"><h1>페이지를 찾을 수 없습니다</h1><p style="color:#94a3b8">삭제되었거나 잘못된 주소입니다.</p></div></body>`,
      { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } },
    )
  }

  // 조회수 증가 (분석용, best-effort)
  await db.prepare('UPDATE funnel_landing_pages SET views = COALESCE(views,0) + 1 WHERE id = ?').bind(page.id).run().catch(() => {})

  let fields: any[] = []
  try { fields = JSON.parse(page.form_fields_json || '[]') } catch { fields = [] }
  const names: string[] = fields.length ? fields.map((f: any) => (typeof f === 'string' ? f : f.name)).filter(Boolean) : ['name', 'phone', 'email']
  const inputs = names.map((f) => {
    const m = FIELD[f] || { label: f, type: 'text', ph: '' }
    const req = f === 'name' || f === 'phone' ? 'required' : ''
    return `<label>${esc(m.label)}<input name="${esc(f)}" type="${m.type}" placeholder="${esc(m.ph)}" ${req}></label>`
  }).join('')

  const html = `<!doctype html><html lang="ko"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(page.title)} · BYGENCY</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:'Pretendard',system-ui,-apple-system,sans-serif;background:#f8fafc;color:#0f172a}
.hero{background:linear-gradient(140deg,#4f46e5,#06b6d4);color:#fff;padding:64px 20px 96px;text-align:center}
.hero .brand{font-size:13px;font-weight:800;letter-spacing:.15em;opacity:.85}
.hero h1{font-size:32px;line-height:1.25;margin:18px auto 12px;max-width:680px;font-weight:800}
.hero p{font-size:16px;line-height:1.6;max-width:560px;margin:0 auto;opacity:.92}
.card{max-width:440px;margin:-56px auto 40px;background:#fff;border-radius:20px;box-shadow:0 20px 50px rgba(2,6,23,.14);padding:28px 24px}
form{display:flex;flex-direction:column;gap:12px}
label{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600;color:#334155}
input{padding:12px 14px;border:1px solid #e2e8f0;border-radius:12px;font-size:15px;outline:none}
input:focus{border-color:#4f46e5}
button{margin-top:6px;padding:14px;border:0;border-radius:12px;background:linear-gradient(140deg,#4f46e5,#06b6d4);color:#fff;font-size:16px;font-weight:700;cursor:pointer}
button:disabled{opacity:.6}
.ok{text-align:center;padding:28px 10px}.ok .big{font-size:44px}
.foot{text-align:center;color:#94a3b8;font-size:12px;padding:24px}.foot b{color:#4f46e5}
</style></head><body>
<div class="hero"><div class="brand">BYGENCY</div><h1>${esc(page.title)}</h1>${page.description ? `<p>${esc(page.description)}</p>` : ''}</div>
<div class="card">
  ${page.html_content && /<(form|input|button|section|div)/i.test(page.html_content) ? '' : ''}
  <form id="f">${inputs}<button type="submit" id="b">신청하기</button></form>
</div>
<div class="foot">Powered by <b>BYGENCY</b> · (주)넥스트 바이전시</div>
<script>
var f=document.getElementById('f'),b=document.getElementById('b'),card=document.querySelector('.card');
f.addEventListener('submit',async function(e){e.preventDefault();b.disabled=true;b.textContent='전송 중…';
 var fd=new FormData(f),body={slug:${JSON.stringify(slug)}};fd.forEach(function(v,k){body[k]=v});
 try{var r=await fetch('/api/funnel/apply',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});var d=await r.json();
  if(d.success){card.innerHTML='<div class="ok"><div class="big">🎉</div><h2>신청이 완료되었습니다</h2><p style="color:#64748b">담당자가 곧 연락드리겠습니다. 감사합니다!</p></div>';}
  else{b.disabled=false;b.textContent='신청하기';alert(d.error||'전송 실패');}
 }catch(err){b.disabled=false;b.textContent='신청하기';alert('네트워크 오류');}
});
</script>
</body></html>`
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
}
