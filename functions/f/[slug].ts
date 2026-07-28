import { resolveDB, ensureSchema, getSessionUser } from '../api/_utils'
import { ensureFunnelSchema } from '../api/funnel/_schema'
import { buildShareHead, injectHead } from '../api/_htmlmeta'

// 공개 퍼널 랜딩페이지 렌더 (/f/{slug}) — 신청 폼은 /api/funnel/apply 로 제출 → 자동응답(문자/알림톡) 실행
const esc = (s: string) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
const FIELD: Record<string, { label: string; type: string; ph: string }> = {
  name: { label: '이름', type: 'text', ph: '홍길동' },
  phone: { label: '연락처', type: 'tel', ph: '010-0000-0000' },
  email: { label: '이메일', type: 'email', ph: 'you@example.com' },
}

export const onRequestGet: PagesFunction<any> = async ({ request, params, env }) => {
  const slug = String((params as any).slug || '')
  const db = resolveDB(env)
  if (!db) return new Response('DB 미연결', { status: 500 })
  await ensureSchema(db); await ensureFunnelSchema(db)

  let page: any = await db.prepare('SELECT * FROM funnel_landing_pages WHERE slug = ?').bind(slug).first().catch(() => null)
  // ⚠ 상태를 안 봐서 초안·중지된 페이지도 공개 주소로 그대로 열렸다.
  //   접수(/api/funnel/apply)는 이미 활성 페이지만 받으므로, 열리기는 하는데 신청은 안 되는
  //   깨진 상태이기도 했다. 주인(과 관리자)은 미리보기를 해야 하니 그 경우만 통과시킨다.
  //   status 가 비어 있는 과거 데이터는 활성으로 본다.
  if (page && !(page.status == null || page.status === '' || page.status === 'active')) {
    const me: any = await getSessionUser(request, db).catch(() => null)
    let owner = false
    if (me) {
      if (me.role === 'admin' || me.role === 'superadmin') owner = true
      else {
        const g: any = await db.prepare('SELECT 1 AS ok FROM funnel_groups WHERE id = ? AND user_id = ?')
          .bind(page.group_id, me.id).first().catch(() => null)
        owner = !!g
      }
    }
    if (!owner) page = null
  }
  if (!page) {
    return new Response(
      `<!doctype html><meta charset="utf-8"><title>페이지 없음</title><body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#0a0f1e;color:#e5e7eb"><div style="text-align:center"><h1>페이지를 찾을 수 없습니다</h1><p style="color:#94a3b8">삭제되었거나 잘못된 주소입니다.</p></div></body>`,
      { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } },
    )
  }

  // 조회수 증가 (분석용, best-effort)
  await db.prepare('UPDATE funnel_landing_pages SET views = COALESCE(views,0) + 1 WHERE id = ?').bind(page.id).run().catch(() => {})

  // ⚠ 퍼널 빌더는 통짜 HTML 편집기다. 회원이 만든 html_content 를 저장은 하는데
  //   여기서는 한 번도 쓰지 않고 늘 아래 기본 히어로+폼만 그렸다(76행이 빈 삼항이었다).
  //   페이지 디자인·헤더 스크립트·OG 가 전부 버려져, "저장 & 배포" 를 눌러도
  //   공개 주소에는 아무것도 반영되지 않았다. 저장된 HTML 이 있으면 그걸 그대로 서빙한다.
  //   (폼은 빌더의 "폼 삽입" 이 html_content 안에 넣어 두고, 그 폼은 /api/landing/form-submit 으로
  //    직접 제출한다 — 이 파일이 만드는 폼과 별개로 자립한다.)
  //   단, 생성 시 서버가 넣어 두는 기본 조각(<section><h1>제목</h1></section>)까지 그대로 내보내면
  //   폼도 스타일도 없는 맨몸 페이지가 된다. 회원이 실제로 편집한 흔적 —
  //   통짜 문서이거나 폼이 들어 있을 때 — 만 저장본을 쓴다.
  const saved = String(page.html_content || '')
  const looksBuilt = /<!doctype|<html[\s>]|<body[\s>]|<form[\s>]/i.test(saved)
  if (looksBuilt) {
    const origin = new URL(request.url).origin
    const out = injectHead(saved, buildShareHead(saved, {
      title: page.title,
      ogTitle: page.og_title,
      ogDescription: page.og_description,
      imageUrl: page.thumbnail_url,
      canonicalUrl: origin + '/f/' + slug,
      headerScript: page.page_header_scripts,
    }))
    return new Response(out, { headers: { 'content-type': 'text/html; charset=utf-8' } })
  }

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
<script>(function(){
 function vid(){try{var v=localStorage.getItem('bg_visitor');if(!v){v='vz_'+Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem('bg_visitor',v);}return v;}catch(e){return '';}}
 function dismissed(){try{return JSON.parse(sessionStorage.getItem('bg_notice_dismissed')||'[]');}catch(e){return [];}}
 function addDismiss(id){try{var a=dismissed();if(a.indexOf(id)<0){a.push(id);sessionStorage.setItem('bg_notice_dismissed',JSON.stringify(a));}}catch(e){}}
 var path=location.pathname,V=vid();
 try{fetch('/api/visit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({path:path,ref:document.referrer||'',visitor:V})});}catch(e){}
 function post(id,k,days){try{fetch('/api/public-notices',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({campaignId:id,visitor:V,kind:k,days:days,path:path})});}catch(e){}}
 function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
 function render(list){
  var wrap=document.getElementById('bgNW');
  if(!wrap){wrap=document.createElement('div');wrap.id='bgNW';wrap.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:99999;display:flex;flex-direction:column;align-items:center;gap:12px;padding:16px;pointer-events:none';document.body.appendChild(wrap);}
  var dis=dismissed();
  list.slice(0,3).forEach(function(n){
   if(document.getElementById('bgn_'+n.id)||dis.indexOf(n.id)>=0)return;
   var c=document.createElement('div');c.id='bgn_'+n.id;
   c.style.cssText='pointer-events:auto;width:100%;max-width:360px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 20px 50px -12px rgba(0,0,0,.35);transform:translateY(30px);opacity:0;transition:all .3s ease';
   var media='';
   if(n.videoUrl){media='<div style="position:relative;background:#000"><video data-v src="'+esc(n.videoUrl)+'" style="width:100%;height:auto;max-height:60vh;display:block" autoplay playsinline loop controls preload="auto"></video></div>';}
   else if(n.imageUrl){media='<img src="'+esc(n.imageUrl)+'" style="width:100%;max-height:176px;object-fit:cover;display:block">';}
   var cta=(n.ctaLabel&&n.ctaUrl)?'<button data-go style="margin-top:12px;width:100%;padding:10px;border:0;border-radius:12px;background:#2563eb;color:#fff;font-weight:700;font-size:14px;cursor:pointer">'+esc(n.ctaLabel)+'</button>':'';
   c.innerHTML='<div style="height:6px;width:100%;background:linear-gradient(90deg,#2563eb,#3b82f6,#38bdf8)"></div>'+media+'<div style="padding:16px"><div style="display:flex;justify-content:space-between;gap:12px"><b style="font-size:14px;color:#0f172a">'+esc(n.title)+'</b><span data-x style="cursor:pointer;color:#94a3b8;font-size:20px;line-height:1">\\u00d7</span></div><p style="margin:6px 0 0;font-size:13px;color:#475569;white-space:pre-wrap">'+esc(n.body)+'</p>'+cta+'<button data-sn style="margin-top:8px;width:100%;padding:6px;border:0;background:transparent;color:#94a3b8;font-size:12px;font-weight:600;cursor:pointer">3일 동안 보지 않기</button></div>';
   wrap.appendChild(c);
   requestAnimationFrame(function(){c.style.transform='none';c.style.opacity='1';});
   var vd=c.querySelector('[data-v]');
   if(vd){vd.muted=false;vd.volume=1;var pp=vd.play();if(pp&&pp.then){pp.catch(function(){
     // 소리 자동재생 차단 → 음소거로 즉시 재생하고, 방문자 첫 상호작용 때 자동으로 소리 켜기(별도 클릭 불필요)
     vd.muted=true;vd.play();
     var EV=['pointerdown','touchstart','keydown','wheel','mousemove','scroll','click'];
     function on(){vd.muted=false;vd.volume=1;vd.play();EV.forEach(function(e){window.removeEventListener(e,on,true);});}
     EV.forEach(function(e){window.addEventListener(e,on,true);});
   });}}
   function close(){addDismiss(n.id);c.style.transform='translateY(30px)';c.style.opacity='0';setTimeout(function(){c.remove();},320);}
   c.querySelector('[data-x]').onclick=function(){post(n.id,'read');close();};
   c.querySelector('[data-sn]').onclick=function(){post(n.id,'snooze',3);close();};
   var g=c.querySelector('[data-go]');if(g)g.onclick=function(){post(n.id,'convert');if(/^https?:\\/\\//i.test(n.ctaUrl))window.open(n.ctaUrl,'_blank','noopener');else location.href=n.ctaUrl;close();};
  });
 }
 fetch('/api/public-notices?path='+encodeURIComponent(path)+'&visitor='+encodeURIComponent(V),{cache:'no-store'}).then(function(r){return r.json();}).then(function(d){if(d&&d.ok&&d.notices&&d.notices.length)render(d.notices);}).catch(function(){});
})();</script>
<script src="/emoji-parser.js" defer></script>
</body></html>`
  // 기본 페이지에도 공유 미리보기는 붙여 준다.
  const withMeta = injectHead(html, buildShareHead(html, {
    title: page.title,
    ogTitle: page.og_title,
    ogDescription: page.og_description || page.description,
    imageUrl: page.thumbnail_url,
    canonicalUrl: new URL(request.url).origin + '/f/' + slug,
    headerScript: page.page_header_scripts,
  }))
  return new Response(withMeta, { headers: { 'content-type': 'text/html; charset=utf-8' } })
}
