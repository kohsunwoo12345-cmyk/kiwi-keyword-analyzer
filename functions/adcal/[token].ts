import { verifyAdcalShare } from '../api/_adcal'
import { resolveDB } from '../api/_utils'

// /adcal/<token> — 광고주 공유용 읽기전용 광고 집행 캘린더 (공개, 인증 불필요)
function esc(s: any): string {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c]))
}
function page(html: string, status = 200) {
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
}
function errPage(msg: string) {
  return page(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>캘린더</title>
  <style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Malgun Gothic',sans-serif;background:#0b1020;color:#e6edfb;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px;}h1{font-size:1.2rem;font-weight:800;margin:0 0 8px;}p{color:#9fb0d0;font-size:.95rem;}</style>
  </head><body><div><h1>캘린더를 열 수 없습니다</h1><p>${esc(msg)}</p></div></body></html>`, 404)
}

export const onRequestGet: PagesFunction<any> = async ({ params, env, request }) => {
  const token = Array.isArray(params.token) ? params.token[0] : (params.token as string)
  const v = await verifyAdcalShare(env, token)
  if (!v) return errPage('유효하지 않거나 만료된 공유 링크입니다.')
  const db = resolveDB(env)
  if (!db) return errPage('데이터베이스에 연결할 수 없습니다.')

  const aid = String(v.aid)
  const isGeneral = aid === '_general'
  const isCal = aid.indexOf('_cal_') === 0
  let adv: any = null, events: any[] = [], calName = ''
  try {
    if (isCal) {
      const cal: any = await db.prepare('SELECT name FROM ad_calendars WHERE id=?').bind(aid.slice(5)).first().catch(() => null)
      calName = (cal && cal.name) || '전개 캘린더'
    } else if (!isGeneral) {
      adv = await db.prepare('SELECT company_name,industry,product,status FROM advertisers WHERE id=?').bind(aid).first()
    }
    const { results } = await db.prepare(
      'SELECT title,type,color,start_date,end_date,memo,result,ad_result,cost_result,link FROM ad_campaigns WHERE advertiser_id=? ORDER BY start_date ASC',
    ).bind(aid).all()
    events = (results as any[]) || []
  } catch {
    return errPage('데이터를 불러오지 못했습니다.')
  }

  const company = (adv && adv.company_name) || (isCal ? calName : (isGeneral ? '마케팅 전개' : '광고주'))
  const heading = isCal ? calName : (isGeneral ? '마케팅 전개 캘린더' : company + ' · 광고 집행 캘린더')
  const origin = new URL(request.url).origin
  const data = JSON.stringify(events.map((e) => ({
    title: e.title || '', type: e.type || 'run', color: e.color || '',
    start: (e.start_date || '').slice(0, 10), end: (e.end_date || e.start_date || '').slice(0, 10),
    memo: e.memo || '', result: e.result || '', ad_result: e.ad_result || '', cost_result: e.cost_result || '', link: e.link || '',
  }))).replace(/</g, '\\u003c')

  return page(renderHtml(heading, adv, data, esc(token)))
}

function renderHtml(heading: string, adv: any, dataJson: string, tokenEsc: string) {
  const ogTitle = esc(heading)
  const ogDesc = '바이전시(BYGENCY)가 제공하는 광고 집행 일정·성과 공유 캘린더입니다.'
  return `<!doctype html><html lang="ko"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${ogTitle}</title>
<meta name="robots" content="noindex,nofollow">
<meta name="description" content="${ogDesc}">
<meta property="og:type" content="website">
<meta property="og:title" content="${ogTitle}">
<meta property="og:description" content="${ogDesc}">
<meta property="og:site_name" content="BYGENCY">
<style>
:root{--bg:#080d1a;--panel:rgba(255,255,255,.045);--line:rgba(255,255,255,.09);--tx:#eaf0fc;--mut:#93a3c4;--acc:#6366f1;}
*{box-sizing:border-box;}
body{margin:0;font-family:'Pretendard',-apple-system,BlinkMacSystemFont,'Segoe UI','Malgun Gothic',sans-serif;color:var(--tx);min-height:100vh;
  background:radial-gradient(1100px 620px at 12% -8%,rgba(99,102,241,.20),transparent 60%),radial-gradient(1000px 600px at 96% 108%,rgba(56,189,248,.14),transparent 58%),linear-gradient(180deg,#080d1a,#070b16);}
.wrap{max-width:1000px;margin:0 auto;padding:22px 16px 70px;}
.top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px;}
.brand{display:flex;align-items:center;gap:9px;font-weight:900;font-size:.92rem;color:#c7d2fe;letter-spacing:.02em;}
.brand .dot{width:9px;height:9px;border-radius:50%;background:#818cf8;box-shadow:0 0 0 4px rgba(129,140,248,.16);}
.badges{display:flex;align-items:center;gap:8px;}
.pill{font-size:.72rem;color:var(--mut);background:rgba(255,255,255,.05);border:1px solid var(--line);padding:5px 11px;border-radius:999px;}
.live{display:inline-flex;align-items:center;gap:6px;font-size:.72rem;font-weight:700;color:#6ee7b7;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.3);padding:5px 11px;border-radius:999px;}
.live i{width:7px;height:7px;border-radius:50%;background:#34d399;box-shadow:0 0 0 0 rgba(52,211,153,.6);animation:lp 1.8s infinite;}
@keyframes lp{0%,100%{box-shadow:0 0 0 0 rgba(52,211,153,.5)}50%{box-shadow:0 0 0 6px rgba(52,211,153,0)}}
.hero{background:linear-gradient(135deg,rgba(99,102,241,.14),rgba(56,189,248,.06));border:1px solid var(--line);border-radius:22px;padding:26px 26px 24px;margin:8px 0 22px;position:relative;overflow:hidden;}
.hero::before{content:'';position:absolute;right:-40px;top:-40px;width:200px;height:200px;border-radius:50%;background:rgba(129,140,248,.14);}
.hero h1{font-size:clamp(1.4rem,3.8vw,2.1rem);font-weight:900;margin:0 0 8px;letter-spacing:-.02em;position:relative;}
.hero .sub{color:#c3cfe6;font-size:.95rem;position:relative;}
.hero .sub b{color:#a5b4fc;}
.legend{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 14px;}
.lg{display:inline-flex;align-items:center;gap:6px;font-size:.76rem;font-weight:700;color:#cdd7ef;background:rgba(255,255,255,.04);border:1px solid var(--line);padding:5px 11px;border-radius:999px;}
.lg i{width:10px;height:10px;border-radius:3px;display:inline-block;}
.calbar{display:flex;align-items:center;justify-content:space-between;margin:0 0 12px;}
.calbar .mtitle{font-size:1.1rem;font-weight:800;}
.navbtn{background:var(--panel);border:1px solid var(--line);color:var(--tx);width:38px;height:38px;border-radius:11px;cursor:pointer;font-size:1.05rem;display:inline-flex;align-items:center;justify-content:center;transition:.15s;}
.navbtn:hover{background:rgba(129,140,248,.14);border-color:rgba(129,140,248,.5);}
.today-btn{background:var(--panel);border:1px solid var(--line);color:#c7d2fe;font-size:.8rem;font-weight:700;padding:0 15px;height:38px;border-radius:11px;cursor:pointer;}
.cal{background:rgba(13,19,36,.72);backdrop-filter:blur(8px);border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 30px 70px rgba(3,7,20,.5);}
.dow{display:grid;grid-template-columns:repeat(7,1fr);background:rgba(255,255,255,.03);border-bottom:1px solid var(--line);}
.dow div{padding:11px 0;text-align:center;font-size:.74rem;font-weight:800;color:var(--mut);}
.dow div:first-child{color:#f87171;}.dow div:last-child{color:#60a5fa;}
.grid{display:grid;grid-template-columns:repeat(7,1fr);}
.cell{min-height:100px;border-right:1px solid var(--line);border-bottom:1px solid var(--line);padding:7px 7px 9px;position:relative;cursor:pointer;transition:background .12s;}
.cell:hover{background:rgba(129,140,248,.06);}
.cell:nth-child(7n){border-right:none;}
.cell.out{background:rgba(255,255,255,.012);}
.cell .dnum{font-size:.78rem;font-weight:800;color:#aab6d4;}
.cell.out .dnum{color:#54607e;}
.cell.today .dnum{background:var(--acc);color:#fff;border-radius:7px;padding:1px 7px;}
.ev{margin-top:4px;font-size:.7rem;font-weight:700;color:#fff;padding:3px 8px;border-radius:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:0 2px 6px rgba(0,0,0,.25);}
.more{font-size:.66rem;color:var(--mut);margin-top:3px;}
.listwrap{margin-top:28px;}
.listwrap h2{font-size:1.05rem;font-weight:800;margin:0 0 14px;}
.erow{display:flex;gap:13px;align-items:flex-start;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:15px 16px;margin-bottom:10px;}
.erow .bar{width:5px;align-self:stretch;border-radius:3px;flex:0 0 auto;min-height:38px;}
.erow .eb{flex:1;min-width:0;}
.erow .etop{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.etag{font-size:.66rem;font-weight:800;color:#fff;padding:2px 9px;border-radius:6px;}
.erow .enm{font-weight:800;font-size:.98rem;}
.erow .edate{font-size:.78rem;color:var(--mut);}
.erow .emm{font-size:.86rem;color:#b9c6e4;margin-top:6px;line-height:1.6;white-space:pre-wrap;}
.metricbox{display:flex;flex-wrap:wrap;gap:8px;margin-top:9px;}
.metric{flex:1;min-width:150px;border-radius:10px;padding:9px 12px;line-height:1.55;white-space:pre-wrap;font-size:.83rem;}
.m-ad{background:rgba(37,99,235,.12);border:1px solid rgba(59,130,246,.32);color:#bfdbfe;}
.m-cost{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.32);color:#a7f3d0;}
.m-res{background:rgba(217,119,6,.12);border:1px solid rgba(217,119,6,.34);color:#fcd9a6;}
.metric b{display:block;font-size:.72rem;font-weight:800;opacity:.9;margin-bottom:2px;letter-spacing:.02em;}
.ev-link{display:inline-flex;align-items:center;gap:5px;margin-top:9px;font-size:.8rem;font-weight:800;color:#fbcfe8;background:rgba(219,39,119,.14);border:1px solid rgba(219,39,119,.4);padding:6px 12px;border-radius:9px;text-decoration:none;}
.ev-link:hover{background:rgba(219,39,119,.24);}
.empty{text-align:center;color:var(--mut);padding:44px 0;}
.foot{text-align:center;color:#5b6b8c;font-size:.74rem;margin-top:30px;line-height:1.7;}
.mask{display:none;position:fixed;inset:0;background:rgba(2,6,16,.7);z-index:50;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(3px);}
.mask.on{display:flex;}
.dlg{background:#111a30;border:1px solid var(--line);border-radius:18px;max-width:520px;width:100%;max-height:86vh;overflow-y:auto;padding:24px;box-shadow:0 34px 90px rgba(0,0,0,.55);}
.dlg .dh{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px;}
.dlg .dh b{font-size:1.1rem;font-weight:900;}
.dlg .x{background:rgba(255,255,255,.06);border:none;color:#cbd5e1;width:34px;height:34px;border-radius:10px;cursor:pointer;font-size:1.1rem;}
.dlg .dempty{color:var(--mut);text-align:center;padding:26px 0;}
@media(max-width:640px){.cell{min-height:74px;}.ev{font-size:.62rem;padding:2px 5px;}.metric{min-width:100%;}}
</style></head>
<body>
<div class="wrap">
  <div class="top">
    <div class="brand"><span class="dot"></span>BYGENCY</div>
    <div class="badges"><span class="live" id="liveBadge"><i></i>실시간 연동</span><span class="pill">읽기 전용</span></div>
  </div>
  <div class="hero">
    <h1>${esc(heading)}</h1>
    <div class="sub">${adv && adv.industry ? esc(adv.industry) + ' · ' : ''}${adv && adv.product ? '<b>' + esc(adv.product) + '</b>' : '광고 집행 일정 · 무료 강의 · 성과를 한눈에 확인하세요.'}</div>
    <div class="legend">
      <span class="lg"><i style="background:#7c3aed"></i>기획</span>
      <span class="lg"><i style="background:#2563eb"></i>제작</span>
      <span class="lg"><i style="background:#16a34a"></i>집행</span>
      <span class="lg"><i style="background:#d97706"></i>성과</span>
      <span class="lg"><i style="background:#db2777"></i>무료 강의</span>
      <span class="lg"><i style="background:#475569"></i>기타</span>
    </div>
  </div>

  <div class="calbar">
    <div class="mtitle" id="mtitle"></div>
    <div style="display:flex;gap:8px;">
      <button class="today-btn" onclick="goToday()">오늘</button>
      <button class="navbtn" onclick="move(-1)">‹</button>
      <button class="navbtn" onclick="move(1)">›</button>
    </div>
  </div>
  <div class="cal"><div class="dow"><div>일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div>토</div></div>
    <div class="grid" id="grid"></div>
  </div>

  <div class="listwrap">
    <h2>전체 일정 · 성과 기록</h2>
    <div id="list"></div>
  </div>
  <div class="foot">본 캘린더는 바이전시(BYGENCY)가 제공하는 공유 전용 페이지입니다.<br>일정·성과는 실시간으로 자동 반영됩니다.</div>
</div>

<div class="mask" id="mask" onclick="if(event.target===this)closeDlg()"><div class="dlg" id="dlg"></div></div>

<script>
var TOKEN = "${tokenEsc}";
var EVENTS = ${dataJson};
var TYPE = { plan:['기획','#7c3aed'], production:['제작','#2563eb'], run:['집행','#16a34a'], result:['성과','#d97706'], lecture:['무료 강의','#db2777'], etc:['기타','#475569'] };
function kstYmd(){ try{ return new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Seoul'}); }catch(_){ return ymd(new Date()); } }
function kstCur(){ var p=kstYmd().split('-'); return new Date(+p[0], +p[1]-1, 1); }
var cur = kstCur();
function colorOf(e){ return e.color || (TYPE[e.type]||TYPE.etc)[1]; }
function labelOf(e){ return (TYPE[e.type]||TYPE.etc)[0]; }
function ymd(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function inRange(day, e){ var s=e.start, en=e.end||e.start; return day>=s && day<=en; }
function esc(s){var d=document.createElement('div');d.textContent=s==null?'':s;return d.innerHTML;}
function safeUrl(u){ u=String(u||'').trim(); return /^https?:\\/\\//i.test(u) ? u : ''; }
function move(n){ cur.setMonth(cur.getMonth()+n); render(); }
function goToday(){ cur=kstCur(); render(); }
function linkHtml(e){ var u=safeUrl(e.link); return u ? '<a href="'+esc(u)+'" target="_blank" rel="noopener" class="ev-link">🔗 '+(e.type==='lecture'?'강의 신청·안내':'링크 열기')+'</a>' : ''; }
function metricsHtml(e){
  var h='';
  if(e.ad_result||e.cost_result||e.result){ h+='<div class="metricbox">';
    if(e.ad_result)   h+='<div class="metric m-ad"><b>📈 광고 성과</b>'+esc(e.ad_result)+'</div>';
    if(e.cost_result) h+='<div class="metric m-cost"><b>💰 금액 대비 성과</b>'+esc(e.cost_result)+'</div>';
    if(e.result)      h+='<div class="metric m-res"><b>🏆 성과</b>'+esc(e.result)+'</div>';
    h+='</div>'; }
  h+=linkHtml(e);
  return h;
}
function render(){
  var y=cur.getFullYear(), m=cur.getMonth();
  document.getElementById('mtitle').textContent = y+'년 '+(m+1)+'월';
  var first=new Date(y,m,1), start=new Date(first); start.setDate(1-first.getDay());
  var todayStr=kstYmd(), html='';
  for(var i=0;i<42;i++){
    var d=new Date(start); d.setDate(start.getDate()+i);
    var ds=ymd(d), out=(d.getMonth()!==m);
    var evs=EVENTS.filter(function(e){return inRange(ds,e);});
    html+='<div class="cell'+(out?' out':'')+(ds===todayStr?' today':'')+'" onclick="openDay(\\''+ds+'\\')">';
    html+='<div class="dnum">'+d.getDate()+'</div>';
    evs.slice(0,3).forEach(function(e){
      html+='<div class="ev" style="background:'+colorOf(e)+'">'+esc(e.title||labelOf(e))+'</div>'; });
    if(evs.length>3) html+='<div class="more">+'+(evs.length-3)+' 더보기</div>';
    html+='</div>';
  }
  document.getElementById('grid').innerHTML=html;
  renderList();
}
function renderList(){
  if(!EVENTS.length){ document.getElementById('list').innerHTML='<div class="empty">등록된 일정이 없습니다.</div>'; return; }
  var sorted=EVENTS.slice().sort(function(a,b){return (a.start||'').localeCompare(b.start||'');});
  document.getElementById('list').innerHTML = sorted.map(function(e){
    var c=colorOf(e), dr=e.start+(e.end&&e.end!==e.start?(' ~ '+e.end):'');
    return '<div class="erow"><div class="bar" style="background:'+c+'"></div><div class="eb">'
      +'<div class="etop"><span class="etag" style="background:'+c+'">'+esc(labelOf(e))+'</span>'
      +'<span class="enm">'+esc(e.title||labelOf(e))+'</span><span class="edate">'+esc(dr)+'</span></div>'
      +(e.memo?'<div class="emm">'+esc(e.memo)+'</div>':'')+metricsHtml(e)+'</div></div>';
  }).join('');
}
function openDay(ds){
  var evs=EVENTS.filter(function(e){return inRange(ds,e);});
  var parts=ds.split('-');
  var head='<div class="dh"><b>'+parts[0]+'.'+parts[1]+'.'+parts[2]+' 일정</b><button class="x" onclick="closeDlg()">×</button></div>';
  var bodyHtml;
  if(!evs.length){ bodyHtml='<div class="dempty">이 날짜에는 등록된 일정이 없습니다.</div>'; }
  else { bodyHtml=evs.map(function(e){ var c=colorOf(e), dr=e.start+(e.end&&e.end!==e.start?(' ~ '+e.end):'');
    return '<div class="erow" style="margin-bottom:12px;"><div class="bar" style="background:'+c+'"></div><div class="eb">'
      +'<div class="etop"><span class="etag" style="background:'+c+'">'+esc(labelOf(e))+'</span>'
      +'<span class="enm">'+esc(e.title||labelOf(e))+'</span><span class="edate">'+esc(dr)+'</span></div>'
      +(e.memo?'<div class="emm">'+esc(e.memo)+'</div>':'')+metricsHtml(e)+'</div></div>'; }).join(''); }
  document.getElementById('dlg').innerHTML=head+bodyHtml;
  document.getElementById('mask').classList.add('on');
}
function closeDlg(){ document.getElementById('mask').classList.remove('on'); }
function poll(){
  fetch('/api/adcal/'+TOKEN, {cache:'no-store'}).then(function(r){return r.json();}).then(function(d){
    if(d&&d.ok&&Array.isArray(d.events)){
      var next=JSON.stringify(d.events);
      if(next!==JSON.stringify(EVENTS)){ EVENTS=d.events; render();
        var lb=document.getElementById('liveBadge'); if(lb){ lb.style.transition='none'; lb.style.opacity='.35'; setTimeout(function(){lb.style.transition='opacity .6s';lb.style.opacity='1';},60); }
      }
    }
  }).catch(function(){});
}
render();
setInterval(poll, 20000);
document.addEventListener('visibilitychange',function(){ if(!document.hidden) poll(); });
</script>
<script src="/emoji-parser.js" defer></script>
</body></html>`
}
