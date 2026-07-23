import { resolveDB, ensureSchema } from '../api/_utils'

const THEMES: Record<string, { from: string; to: string; accent: string }> = {
  violet: { from: '#7c3aed', to: '#6366f1', accent: '#7c3aed' },
  blue: { from: '#2563eb', to: '#06b6d4', accent: '#2563eb' },
  rose: { from: '#e11d48', to: '#f97316', accent: '#e11d48' },
  emerald: { from: '#059669', to: '#10b981', accent: '#059669' },
  dark: { from: '#0f172a', to: '#334155', accent: '#0ea5e9' },
}
const FIELD_LABEL: Record<string, { label: string; type: string; ph: string }> = {
  name: { label: '이름', type: 'text', ph: '홍길동' },
  phone: { label: '연락처', type: 'tel', ph: '010-0000-0000' },
  email: { label: '이메일', type: 'email', ph: 'you@example.com' },
  company: { label: '회사/상호', type: 'text', ph: '회사명' },
  memo: { label: '문의 내용', type: 'text', ph: '남기실 말씀' },
}
const esc = (s: string) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

export const onRequestGet: PagesFunction<any> = async ({ params, env }) => {
  const slug = String((params as any).slug || '')
  const db = resolveDB(env)
  if (!db) return new Response('DB 미연결', { status: 500 })
  await ensureSchema(db)

  const page: any = await db.prepare('SELECT * FROM landing_pages WHERE slug = ? AND published = 1').bind(slug).first()
  if (!page) {
    return new Response(
      `<!doctype html><meta charset="utf-8"><title>페이지 없음</title><body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#0a0f1e;color:#e5e7eb"><div style="text-align:center"><h1>페이지를 찾을 수 없습니다</h1><p style="color:#94a3b8">비공개 상태이거나 삭제된 랜딩페이지입니다.</p></div><script src="/emoji-parser.js" defer></script></body>`,
      { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } },
    )
  }

  // 조회수 증가 (best-effort)
  await db.prepare('UPDATE landing_pages SET views = views + 1 WHERE id = ?').bind(page.id).run().catch(() => {})

  const theme = THEMES[page.theme] || THEMES.violet
  let fields: string[] = []
  try { fields = JSON.parse(page.fields || '[]') } catch { fields = ['name', 'phone'] }
  if (!fields.length) fields = ['name', 'phone']

  const inputs = fields
    .map((f) => {
      const m = FIELD_LABEL[f] || { label: f, type: 'text', ph: '' }
      return `<label>${esc(m.label)}<input name="${esc(f)}" type="${m.type}" placeholder="${esc(m.ph)}" ${f === 'name' ? 'required' : ''}></label>`
    })
    .join('')

  const html = `<!doctype html><html lang="ko"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(page.title)} · BYGENCY</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:'Pretendard',system-ui,-apple-system,sans-serif;background:#f8fafc;color:#0f172a}
.hero{background:linear-gradient(140deg,${theme.from},${theme.to});color:#fff;padding:64px 20px 96px;text-align:center;position:relative;overflow:hidden}
.hero .brand{font-size:13px;font-weight:800;letter-spacing:.15em;opacity:.85}
.hero h1{font-size:34px;line-height:1.2;margin:18px auto 12px;max-width:680px;font-weight:800}
.hero p{font-size:17px;line-height:1.6;max-width:560px;margin:0 auto;opacity:.92}
.card{max-width:440px;margin:-56px auto 40px;background:#fff;border-radius:20px;box-shadow:0 20px 50px rgba(2,6,23,.14);padding:28px 24px}
form{display:flex;flex-direction:column;gap:12px}
label{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600;color:#334155}
input{padding:12px 14px;border:1px solid #e2e8f0;border-radius:12px;font-size:15px;outline:none}
input:focus{border-color:${theme.accent}}
button{margin-top:6px;padding:14px;border:0;border-radius:12px;background:linear-gradient(140deg,${theme.from},${theme.to});color:#fff;font-size:16px;font-weight:700;cursor:pointer}
button:disabled{opacity:.6}
.ok{text-align:center;padding:28px 10px}.ok .big{font-size:44px}.ok h2{margin:10px 0 6px}
.foot{text-align:center;color:#94a3b8;font-size:12px;padding:24px}
.foot b{color:${theme.accent}}
</style></head><body>
<div class="hero">
  <div class="brand">BYGENCY</div>
  <h1>${esc(page.headline || page.title)}</h1>
  ${page.subtext ? `<p>${esc(page.subtext)}</p>` : ''}
</div>
<div class="card">
  <form id="f">
    ${inputs}
    <button type="submit" id="b">${esc(page.cta || '신청하기')}</button>
  </form>
</div>
<div class="foot">Powered by <b>BYGENCY</b> · (주)넥스트 바이전시</div>
<script>
var f=document.getElementById('f'),b=document.getElementById('b'),card=document.querySelector('.card');
f.addEventListener('submit',async function(e){e.preventDefault();b.disabled=true;b.textContent='전송 중…';
 var fd=new FormData(f),body={landing_slug:${JSON.stringify(slug)},source:'landing:'+${JSON.stringify(slug)}};
 fd.forEach(function(v,k){body[k]=v});
 try{var r=await fetch('/api/leads/collect',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});var d=await r.json();
   if(d.ok){card.innerHTML='<div class="ok"><div class="big">🎉</div><h2>신청이 완료되었습니다</h2><p style="color:#64748b">담당자가 곧 연락드리겠습니다. 감사합니다!</p></div>';}
   else{b.disabled=false;b.textContent=${JSON.stringify(page.cta || '신청하기')};alert(d.error||'전송 실패');}
 }catch(err){b.disabled=false;b.textContent=${JSON.stringify(page.cta || '신청하기')};alert('네트워크 오류');}
});
</script>
<script src="/emoji-parser.js" defer></script></body></html>`

  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
}
