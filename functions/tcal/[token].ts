// /tcal/<token> — 팀 집행 캘린더 공개(읽기전용) 공유 페이지. OG 메타 설정 포함.
import { verifyTcalShare } from '../api/_tcal'
import { resolveDB } from '../api/_utils'

function esc(s: any): string {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c]))
}
function page(html: string, status = 200) {
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
}
function errPage(msg: string) {
  return page(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>집행 캘린더</title>
  <style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Malgun Gothic',sans-serif;background:#0b1020;color:#e6edfb;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px;}h1{font-size:1.2rem;font-weight:800;margin:0 0 8px;}p{color:#9fb0d0;font-size:.95rem;}</style>
  </head><body><div><h1>캘린더를 열 수 없습니다</h1><p>${esc(msg)}</p></div></body></html>`, 404)
}

export const onRequestGet: PagesFunction<any> = async ({ params, env, request }) => {
  const raw = (params as any).token
  const token = Array.isArray(raw) ? raw.join('/') : String(raw || '')
  const v = await verifyTcalShare(env, token)
  if (!v) return errPage('유효하지 않거나 만료된 공유 링크입니다.')
  const db = resolveDB(env)
  if (!db) return errPage('데이터베이스에 연결할 수 없습니다.')

  const board: any = await db.prepare('SELECT b.name, t.name AS team_name FROM team_cal_boards b LEFT JOIN teams t ON t.id = b.team_id WHERE b.id = ?').bind(v.bid).first().catch(() => null)
  if (!board) return errPage('캘린더를 찾을 수 없습니다.')
  const cnt = Number((await db.prepare("SELECT COUNT(*) AS c FROM team_cal_events WHERE board_id = ? AND visibility = 'team'").bind(v.bid).first().catch(() => null) as any)?.c) || 0

  const origin = new URL(request.url).origin
  const name = board.name || '집행 캘린더'
  const team = board.team_name || ''
  const title = `${name}${team ? ' · ' + team : ''} | BYGENCY`
  const desc = `${team ? team + ' 팀의 ' : ''}마케팅 집행 캘린더 · 공유 일정 ${cnt}건. BYGENCY에서 함께 관리하세요.`
  const ogImg = `${origin}/opengraph-image.png`
  const shareUrl = `${origin}/tcal/${token}`

  const html = `<!doctype html><html lang="ko"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="BYGENCY">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(shareUrl)}">
<meta property="og:image" content="${esc(ogImg)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(ogImg)}">
<style>
:root{--bg:#0b1020;--card:#111a2e;--soft:#8fa4c6;--dim:#5f739a;--bd:#22304d;--txt:#e6edfb;}
*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Malgun Gothic',sans-serif;background:var(--bg);color:var(--txt);}
.wrap{max-width:920px;margin:0 auto;padding:22px 16px 60px;}
.head{display:flex;align-items:center;gap:12px;margin-bottom:6px;}
.badge{font-size:11px;font-weight:800;letter-spacing:.12em;color:#38bdf8;}
h1{font-size:1.5rem;font-weight:800;margin:2px 0 4px;}
.sub{color:var(--soft);font-size:.9rem;margin-bottom:18px;}
.bar{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
.bar button{background:var(--card);border:1px solid var(--bd);color:var(--txt);border-radius:10px;width:34px;height:34px;font-size:16px;cursor:pointer;}
.bar .mon{font-weight:800;min-width:130px;text-align:center;}
.legend{display:flex;flex-wrap:wrap;gap:8px;margin-left:auto;}
.lg{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--soft);}
.dot{width:9px;height:9px;border-radius:50%;display:inline-block;}
.cal{background:var(--card);border:1px solid var(--bd);border-radius:16px;overflow:hidden;}
.wd{display:grid;grid-template-columns:repeat(7,1fr);border-bottom:1px solid var(--bd);}
.wd div{padding:9px 0;text-align:center;font-size:12px;font-weight:700;color:var(--dim);}
.grid{display:grid;grid-template-columns:repeat(7,1fr);}
.cell{min-height:92px;border-right:1px solid var(--bd);border-bottom:1px solid var(--bd);padding:6px;}
.cell:nth-child(7n){border-right:none}
.dnum{font-size:12px;font-weight:700;color:var(--soft);margin-bottom:4px;}
.dnum.today{background:#0ea5e9;color:#fff;border-radius:50%;width:22px;height:22px;display:inline-grid;place-items:center;}
.ev{font-size:11px;line-height:1.3;padding:2px 6px;border-radius:6px;margin-bottom:3px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.foot{margin-top:14px;color:var(--dim);font-size:12px;text-align:center;}
.foot a{color:#38bdf8;text-decoration:none;}
.empty{color:var(--dim);text-align:center;padding:40px 0;}
</style>
</head><body>
<div class="wrap">
  <div class="head"><span class="badge">TEAM · 집행 캘린더</span></div>
  <h1 id="title">${esc(name)}</h1>
  <div class="sub" id="sub">${esc(team ? team + ' 팀' : '')} · 읽기 전용 공유</div>
  <div class="bar">
    <button id="prev" aria-label="이전 달">‹</button>
    <span class="mon" id="mon"></span>
    <button id="next" aria-label="다음 달">›</button>
    <div class="legend" id="legend"></div>
  </div>
  <div class="cal">
    <div class="wd"><div style="color:#f87171">일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div style="color:#38bdf8">토</div></div>
    <div class="grid" id="grid"></div>
  </div>
  <div class="foot">BYGENCY · <a href="${esc(origin)}">bygency.co</a></div>
</div>
<script>
var TOKEN=${JSON.stringify(token)};
var COLORS={violet:'#8b5cf6',sky:'#0ea5e9',emerald:'#10b981',amber:'#f59e0b',rose:'#f43f5e'};
var LABELS={violet:'기획',sky:'광고',emerald:'콘텐츠',amber:'마감',rose:'회의'};
var events=[];var cur=new Date();
function kstToday(){try{return new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Seoul'});}catch(e){return new Date().toISOString().slice(0,10);}}
function fetchData(){
  fetch('/api/tcal/'+TOKEN,{cache:'no-store'}).then(function(r){return r.json();}).then(function(d){
    if(!d.ok)return; events=d.events||[];
    if(d.name)document.getElementById('title').textContent=d.name;
    render();
  }).catch(function(){});
}
function render(){
  var y=cur.getFullYear(),m=cur.getMonth();
  document.getElementById('mon').textContent=y+'년 '+(m+1)+'월';
  var first=new Date(y,m,1).getDay();var days=new Date(y,m+1,0).getDate();
  var mk=y+'-'+String(m+1).padStart(2,'0');var today=kstToday();
  var cells=[];for(var i=0;i<first;i++)cells.push(null);for(var d=1;d<=days;d++)cells.push(d);
  while(cells.length%7!==0)cells.push(null);
  var byDay={};events.forEach(function(e){(byDay[e.d]=byDay[e.d]||[]).push(e);});
  var html='';cells.forEach(function(d){
    if(d==null){html+='<div class="cell"></div>';return;}
    var ds=mk+'-'+String(d).padStart(2,'0');
    var evs=byDay[ds]||[];var evh='';
    evs.forEach(function(e){var c=COLORS[e.color]||COLORS.sky;evh+='<div class="ev" style="background:'+c+'" title="'+(e.title||'').replace(/"/g,'&quot;')+(e.memo?' — '+String(e.memo).replace(/"/g,'&quot;'):'')+' · '+(e.owner_name||'')+'">'+esch(e.title)+'</div>';});
    html+='<div class="cell"><div><span class="dnum'+(ds===today?' today':'')+'">'+d+'</span></div>'+evh+'</div>';
  });
  document.getElementById('grid').innerHTML=html;
  var lg='';Object.keys(LABELS).forEach(function(k){lg+='<span class="lg"><span class="dot" style="background:'+COLORS[k]+'"></span>'+LABELS[k]+'</span>';});
  document.getElementById('legend').innerHTML=lg;
}
function esch(s){return String(s==null?'':s).replace(/[&<>]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;'}[c];});}
document.getElementById('prev').onclick=function(){cur=new Date(cur.getFullYear(),cur.getMonth()-1,1);render();};
document.getElementById('next').onclick=function(){cur=new Date(cur.getFullYear(),cur.getMonth()+1,1);render();};
render();fetchData();setInterval(fetchData,30000);
</script>
</body></html>`
  return page(html)
}
