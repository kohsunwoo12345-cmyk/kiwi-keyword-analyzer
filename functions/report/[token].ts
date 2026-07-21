// SUPERPLACE 이식: GET /report/:token — 공개 유입 경로 공유 리포트 페이지(로그인 불필요)
import { Env, resolveDB, ensureSchema } from '../api/_utils'
import { ensureLandingSchema } from '../api/landing/_lschema'

const esc = (s: any) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const token = String((params as any).token || '')
  const db = resolveDB(env)
  const notFound = (msg: string) => new Response(
    '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>리포트를 찾을 수 없습니다</title><style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f8fafc;color:#1e293b;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center}.box{max-width:400px;padding:32px}h1{font-size:22px;margin-bottom:8px}p{color:#94a3b8;font-size:14px}</style></head><body><div class="box"><h1>🔍 리포트를 찾을 수 없습니다</h1><p>' + esc(msg) + '</p></div></body></html>',
    { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } }
  )
  if (!db) return notFound('데이터베이스를 사용할 수 없습니다.')
  await ensureSchema(db); await ensureLandingSchema(db)
  const share: any = await db.prepare(`SELECT * FROM landing_traffic_shares WHERE token = ?`).bind(token).first().catch(() => null)
  if (!share) return notFound('유효하지 않거나 만료된 공유 링크입니다.')

  const url = new URL(request.url)
  const ogTitle = esc(share.og_title || share.title || '유입 경로 리포트')
  const ogDesc = esc(share.og_description || share.subtitle || '랜딩페이지 유입 경로 분석 리포트입니다.')
  const ogImg = esc(share.thumbnail_url || '')
  const pageUrl = esc(url.origin + '/report/' + token)
  const tokenSafe = esc(token)

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${ogTitle}</title>
  <meta property="og:title" content="${ogTitle}">
  <meta property="og:description" content="${ogDesc}">
  ${ogImg ? `<meta property="og:image" content="${ogImg}">` : ''}
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${ogTitle}">
  <meta name="twitter:description" content="${ogDesc}">
  ${ogImg ? `<meta name="twitter:image" content="${ogImg}">` : ''}
  <link rel="stylesheet" href="/vendor/fontawesome/css/all.min.css">
  <script src="/vendor/js/chart.umd.min.js"></script>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Pretendard',sans-serif}
    body{background:#f8fafc;min-height:100vh;color:#1e293b}
    .hero{background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);color:#fff;padding:36px 24px 32px}
    .hero-inner{max-width:900px;margin:0 auto}
    .hero-thumb{width:72px;height:72px;border-radius:14px;object-fit:cover;border:2px solid rgba(255,255,255,.3);margin-bottom:16px;display:block}
    .hero h1{font-size:26px;font-weight:800;margin-bottom:6px;line-height:1.3}
    .hero p{font-size:14px;opacity:.85;margin-bottom:20px}
    .hero-meta{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
    .hero-badge{background:rgba(255,255,255,.18);border-radius:20px;padding:4px 14px;font-size:12px;font-weight:600}
    .date-filter{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:16px}
    .date-filter input{padding:6px 12px;border-radius:8px;border:none;font-size:13px;color:#1e293b;outline:none}
    .date-filter button{padding:6px 16px;background:rgba(255,255,255,.25);color:#fff;border:1px solid rgba(255,255,255,.4);border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}
    .date-filter button:hover{background:rgba(255,255,255,.35)}
    .content{max-width:900px;margin:0 auto;padding:24px 16px}
    .grid2{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-bottom:20px}
    @media(min-width:600px){.grid2{grid-template-columns:repeat(4,1fr)}}
    .stat-card{background:#fff;border-radius:14px;padding:18px;box-shadow:0 1px 4px rgba(0,0,0,.06);text-align:center}
    .stat-val{font-size:28px;font-weight:800;color:#6366f1}
    .stat-lbl{font-size:12px;color:#94a3b8;margin-top:4px}
    .card{background:#fff;border-radius:16px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,.06);margin-bottom:16px}
    .card-title{font-size:15px;font-weight:700;margin-bottom:16px;display:flex;align-items:center;gap:8px;color:#1e293b}
    .ch-row{display:flex;align-items:center;gap:10px;margin-bottom:10px}
    .ch-icon{font-size:18px;width:28px;text-align:center;flex-shrink:0}
    .ch-info{flex:1;min-width:0}
    .ch-top{display:flex;justify-content:space-between;margin-bottom:4px}
    .ch-name{font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .ch-cnt{font-size:13px;font-weight:700;flex-shrink:0;margin-left:8px}
    .ch-pct{font-size:11px;color:#94a3b8;margin-left:3px}
    .bar-bg{background:#f1f5f9;border-radius:99px;height:6px}
    .bar-fill{height:6px;border-radius:99px;transition:width .5s}
    .badge{display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;color:#fff}
    .empty{text-align:center;padding:24px;color:#94a3b8;font-size:13px}
    .chart-wrap{position:relative;height:200px}
    .donut-wrap{display:flex;align-items:center;gap:20px}
    .donut-canvas{position:relative;width:140px;height:140px;flex-shrink:0}
    .legend{display:flex;flex-direction:column;gap:6px;flex:1;min-width:0}
    .legend-item{display:flex;align-items:center;gap:6px;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .legend-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
    .watermark{text-align:center;padding:24px;font-size:12px;color:#cbd5e1}
    .watermark a{color:#6366f1;text-decoration:none}
    .updated{font-size:11px;color:rgba(255,255,255,.6);margin-top:12px}
    #toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:8px 20px;border-radius:50px;font-size:13px;z-index:9999;opacity:0;transition:opacity .3s;pointer-events:none}
    #toast.show{opacity:1}
  </style>
</head>
<body>
<div id="toast"></div>

<!-- 히어로 헤더 -->
<div class="hero">
  <div class="hero-inner">
    <div id="heroThumbWrap"></div>
    <h1 id="heroTitle">유입 경로 리포트</h1>
    <p id="heroSubtitle"></p>
    <div class="hero-meta">
      <span class="hero-badge" id="heroSlug"></span>
      <span class="hero-badge" id="heroUpdated"></span>
    </div>
    <div class="date-filter">
      <label style="font-size:12px;opacity:.8">기간</label>
      <input type="date" id="filterFrom">
      <span style="opacity:.7;font-size:12px">~</span>
      <input type="date" id="filterTo">
      <button onclick="loadReport()"><i class="fas fa-sync-alt"></i> 조회</button>
    </div>
    <div class="updated" id="updatedAt"></div>
  </div>
</div>

<!-- 본문 -->
<div class="content">
  <!-- 요약 통계 -->
  <div class="grid2">
    <div class="stat-card"><div class="stat-val" id="statTotal">-</div><div class="stat-lbl">총 방문</div></div>
    <div class="stat-card"><div class="stat-val" id="statChannels">-</div><div class="stat-lbl">유입 채널 수</div></div>
    <div class="stat-card"><div class="stat-val" id="statCampaigns">-</div><div class="stat-lbl">캠페인 수</div></div>
    <div class="stat-card"><div class="stat-val" id="statDirect">-</div><div class="stat-lbl">직접 방문 비율</div></div>
  </div>

  <!-- 유입 채널 + 도넛 -->
  <div class="card">
    <div class="card-title"><i class="fas fa-bullseye" style="color:#6366f1"></i>유입 채널 분석</div>
    <div class="donut-wrap">
      <div class="donut-canvas"><canvas id="donutChart"></canvas></div>
      <div id="donutLegend" class="legend"></div>
    </div>
    <div style="margin-top:20px" id="channelList"><div class="empty"><i class="fas fa-spinner fa-spin"></i> 로딩 중...</div></div>
  </div>

  <!-- 트렌드 -->
  <div class="card">
    <div class="card-title"><i class="fas fa-chart-line" style="color:#6366f1"></i>최근 30일 방문 트렌드</div>
    <div class="chart-wrap"><canvas id="trendChart"></canvas></div>
  </div>

  <!-- 캠페인 -->
  <div class="card">
    <div class="card-title"><i class="fas fa-tag" style="color:#f59e0b"></i>캠페인별 방문</div>
    <div id="campaignList"><div class="empty">로딩 중...</div></div>
  </div>

  <!-- 도시 -->
  <div class="card">
    <div class="card-title"><i class="fas fa-map-marker-alt" style="color:#10b981"></i>도시별 방문</div>
    <div id="cityList"><div class="empty">로딩 중...</div></div>
  </div>

  <div class="watermark">
    Powered by <a href="https://wearesuperplace.com" target="_blank">슈퍼플레이스</a> · 데이터는 매일 실시간 업데이트됩니다
  </div>
</div>

<script>
var TOKEN='${tokenSafe}';
var COLORS=['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f97316','#06b6d4'];
var ICONS={'네이버 검색광고':'🔍','네이버 블로그':'📝','네이버 카페':'☕','네이버 밴드':'🎵','네이버':'🟢','카카오톡':'💬','카카오 알림톡':'🔔','카카오 모먼트':'📢','카카오':'💛','카카오 문자':'📱','SMS 문자':'📱','MMS 문자':'📱','인스타그램':'📸','페이스북':'👥','유튜브':'▶️','구글':'🔎','직접 방문':'🏠','기타 외부 링크':'🔗'};
var donutChart=null,trendChart=null;

function toast(msg){var el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');setTimeout(function(){el.classList.remove('show');},2500);}
function fmt(n){return Number(n||0).toLocaleString('ko-KR');}
function pct(n,t){if(!t)return '0%';return (n/t*100).toFixed(1)+'%';}

function loadReport(){
  var from=document.getElementById('filterFrom').value;
  var to=document.getElementById('filterTo').value;
  var url='/api/landing/traffic-report/'+TOKEN+'?_t='+Date.now();
  if(from)url+='&from='+from;
  if(to)url+='&to='+to;
  fetch(url).then(function(r){return r.json();}).then(function(d){
    if(!d.ok){document.getElementById('channelList').innerHTML='<div class="empty">'+( d.error||'오류')+'</div>';return;}
    // 헤더 정보
    var s=d.share||{};
    document.getElementById('heroTitle').textContent=s.title||'유입 경로 리포트';
    document.getElementById('heroSubtitle').textContent=s.subtitle||'';
    document.getElementById('heroSlug').textContent='📄 '+s.slug;
    document.getElementById('updatedAt').textContent='마지막 업데이트: '+new Date().toLocaleString('ko-KR');
    if(s.thumbnail_url){
      var _img=document.createElement('img');
      _img.src=s.thumbnail_url;
      _img.className='hero-thumb';
      _img.onerror=function(){this.style.display='none';};
      document.getElementById('heroThumbWrap').innerHTML='';
      document.getElementById('heroThumbWrap').appendChild(_img);
    }
    // 통계
    var total=d.total||0;
    document.getElementById('statTotal').textContent=fmt(total);
    document.getElementById('statChannels').textContent=fmt((d.channels||[]).length);
    document.getElementById('statCampaigns').textContent=fmt((d.campaigns||[]).filter(function(c){return c.campaign!=='(없음)';}).length);
    var dir=(d.channels||[]).find(function(c){return c.channel==='직접 방문';});
    document.getElementById('statDirect').textContent=dir?pct(dir.cnt,total):'0%';
    renderChannels(d.channels||[],total);
    renderDonut(d.channels||[]);
    renderTrend(d.trend||[]);
    renderCampaigns(d.campaigns||[],total);
    renderCities(d.cities||[],total);
    document.getElementById('heroUpdated').textContent='📅 조회 기간: '+(document.getElementById('filterFrom').value||'전체')+' ~ '+(document.getElementById('filterTo').value||'오늘');
  }).catch(function(e){toast('오류: '+e.message);});
}

function renderChannels(channels,total){
  var el=document.getElementById('channelList');
  if(!channels.length){el.innerHTML='<div class="empty">방문 데이터 없음</div>';return;}
  var max=channels[0]?channels[0].cnt:1;
  el.innerHTML=channels.map(function(ch,i){
    var color=COLORS[i%COLORS.length];
    var icon=ICONS[ch.channel]||'📌';
    var barW=Math.round(ch.cnt/max*100);
    return '<div class="ch-row"><span class="ch-icon">'+icon+'</span><div class="ch-info"><div class="ch-top"><span class="ch-name">'+ch.channel+'</span><span class="ch-cnt">'+fmt(ch.cnt)+'회<span class="ch-pct">('+pct(ch.cnt,total)+')</span></span></div><div class="bar-bg"><div class="bar-fill" style="width:'+barW+'%;background:'+color+'"></div></div></div></div>';
  }).join('');
}

function renderDonut(channels){
  if(donutChart){donutChart.destroy();donutChart=null;}
  if(!channels.length)return;
  var top8=channels.slice(0,8);
  var other=channels.slice(8).reduce(function(s,c){return s+c.cnt;},0);
  var labels=top8.map(function(c){return c.channel;});
  var data=top8.map(function(c){return c.cnt;});
  if(other>0){labels.push('기타');data.push(other);}
  var colors=labels.map(function(_,i){return COLORS[i%COLORS.length];});
  donutChart=new Chart(document.getElementById('donutChart'),{
    type:'doughnut',
    data:{labels:labels,datasets:[{data:data,backgroundColor:colors,borderWidth:2,borderColor:'#fff'}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return ' '+ctx.label+': '+fmt(ctx.raw)+'회';}}}},cutout:'60%'}
  });
  document.getElementById('donutLegend').innerHTML=labels.map(function(l,i){
    return '<div class="legend-item"><span class="legend-dot" style="background:'+colors[i]+'"></span>'+l+'</div>';
  }).join('');
}

function renderTrend(trend){
  if(trendChart){trendChart.destroy();trendChart=null;}
  if(!trend.length)return;
  trendChart=new Chart(document.getElementById('trendChart'),{
    type:'line',
    data:{labels:trend.map(function(t){return t.day;}),datasets:[{label:'방문 수',data:trend.map(function(t){return t.views;}),borderColor:'#6366f1',backgroundColor:'rgba(99,102,241,.1)',borderWidth:2,pointRadius:3,fill:true,tension:0.4}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{font:{size:11},maxTicksLimit:12}},y:{beginAtZero:true,ticks:{font:{size:11}}}}}
  });
}

function renderCampaigns(campaigns,total){
  var el=document.getElementById('campaignList');
  var real=campaigns.filter(function(c){return c.campaign!=='(없음)';});
  if(!real.length){el.innerHTML='<div class="empty">캠페인 데이터 없음</div>';return;}
  var max=real[0]?real[0].cnt:1;
  el.innerHTML=real.map(function(c,i){
    var color=COLORS[(i+2)%COLORS.length];
    return '<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:70%">'+c.campaign+'</span><span style="font-size:13px;font-weight:700">'+fmt(c.cnt)+'회</span></div><div class="bar-bg"><div class="bar-fill" style="height:5px;width:'+Math.round(c.cnt/max*100)+'%;background:'+color+'"></div></div></div>';
  }).join('');
}

function renderCities(cities,total){
  var el=document.getElementById('cityList');
  if(!cities.length){el.innerHTML='<div class="empty">도시 데이터 없음</div>';return;}
  var max=cities[0]?cities[0].cnt:1;
  el.innerHTML=cities.map(function(c,i){
    var color=COLORS[(i+4)%COLORS.length];
    var flag=c.country==='KR'?'🇰🇷 ':c.country==='US'?'🇺🇸 ':c.country==='JP'?'🇯🇵 ':c.country?'🌐 ':'';
    var barW=Math.round(c.cnt/max*100);
    return '<div class="ch-row"><div class="ch-info"><div class="ch-top"><span class="ch-name">'+flag+c.city+'</span><span class="ch-cnt">'+fmt(c.cnt)+'회<span class="ch-pct">('+pct(c.cnt,total)+')</span></span></div><div class="bar-bg"><div class="bar-fill" style="width:'+barW+'%;background:'+color+'"></div></div></div></div>';
  }).join('');
}

window.addEventListener('DOMContentLoaded',function(){
  var today=new Date();
  var from=new Date(today);from.setDate(from.getDate()-30);
  document.getElementById('filterTo').value=today.toISOString().split('T')[0];
  document.getElementById('filterFrom').value=from.toISOString().split('T')[0];
  loadReport();
});
</script>
<\/body>
<\/html>`
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } })
}
