// Ported VERBATIM from SUPERPLACE naverPlaceRankPage (BYGENCY 리브랜딩) — 네이버 플레이스 순위 추적 도구
// embed=1 쿼리 시 상단 nav 숨김 (대시보드 iframe 임베드용)

export const naverPlaceRankPage = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>네이버 플레이스 순위 추적 — BYGENCY</title>
  <link rel="preconnect" href="https://cdn.jsdelivr.net">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --p:#4f46e5;--p2:#4338ca;--p3:#6366f1;
      --acc:#7c3aed;
      --green:#10b981;--green2:#059669;
      --amber:#f59e0b;--red:#ef4444;--blue:#3b82f6;
      --bg:#f1f5f9;
      --surface:#ffffff;
      --surface2:#f8fafc;
      --border:#e2e8f0;--border2:#cbd5e1;
      --txt:#0f172a;--txt2:#334155;--txt3:#64748b;--txt4:#94a3b8;
      --r:14px;--r2:10px;--r3:8px;
      --sh:0 1px 2px rgba(0,0,0,.04),0 4px 16px rgba(0,0,0,.06);
      --sh2:0 2px 8px rgba(0,0,0,.06),0 8px 32px rgba(0,0,0,.08);
    }
    html{font-family:'Pretendard Variable',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;scroll-behavior:smooth;-webkit-font-smoothing:antialiased}
    body{background:var(--bg);color:var(--txt);min-height:100vh;font-size:15px}

    /* ── TOP NAV ── */
    .nav{
      position:sticky;top:0;z-index:200;
      background:rgba(255,255,255,.95);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
      border-bottom:1px solid var(--border);
      height:58px;padding:0 20px;
      display:flex;align-items:center;justify-content:space-between;
      gap:12px;
    }
    .nav-l{display:flex;align-items:center;gap:10px}
    .nav-back{
      display:inline-flex;align-items:center;gap:6px;
      padding:7px 13px;border-radius:var(--r3);
      background:var(--bg);border:1px solid var(--border);
      font-size:13px;font-weight:500;color:var(--txt3);
      cursor:pointer;transition:all .15s;text-decoration:none;
    }
    .nav-back:hover{background:#eef2ff;color:var(--p);border-color:#c7d2fe}
    .nav-back.hidden-in-iframe{display:none!important}
    .nav-divider.hidden-in-iframe{display:none!important}
    .nav-divider{width:1px;height:20px;background:var(--border)}
    .nav-title{font-size:14px;font-weight:700;color:var(--txt2)}
    .nav-r{display:flex;align-items:center;gap:8px}
    .live-badge{
      display:inline-flex;align-items:center;gap:5px;
      padding:5px 12px;border-radius:20px;
      background:linear-gradient(135deg,#ecfdf5,#d1fae5);
      border:1px solid #6ee7b7;
      font-size:11px;font-weight:700;color:#065f46;
      letter-spacing:.01em;
    }
    .live-dot{width:7px;height:7px;border-radius:50%;background:#10b981;box-shadow:0 0 0 2px rgba(16,185,129,.25);animation:pulse 2s infinite}
    @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.7;transform:scale(.85)}}

    /* ── HERO ── */
    .hero{
      background:linear-gradient(150deg,#1e1b4b 0%,#312e81 30%,#4338ca 60%,#7c3aed 100%);
      padding:48px 24px 44px;position:relative;overflow:hidden;
    }
    .hero::before{
      content:'';position:absolute;inset:0;
      background:
        radial-gradient(ellipse at 90% 10%,rgba(167,139,250,.2) 0%,transparent 55%),
        radial-gradient(ellipse at 10% 90%,rgba(99,102,241,.15) 0%,transparent 50%);
    }
    .hero::after{
      content:'';position:absolute;bottom:-1px;left:0;right:0;height:40px;
      background:linear-gradient(to bottom,transparent,var(--bg));
    }
    .hero-in{max-width:980px;margin:0 auto;position:relative;z-index:1}
    .hero-eyebrow{
      display:inline-flex;align-items:center;gap:7px;
      background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);
      color:#e0e7ff;font-size:12px;font-weight:600;
      padding:5px 14px;border-radius:20px;margin-bottom:18px;
      backdrop-filter:blur(8px);
    }
    .hero h1{
      font-size:clamp(26px,4.5vw,42px);font-weight:900;color:#fff;
      line-height:1.15;letter-spacing:-.02em;margin-bottom:14px;
    }
    .hero h1 span{
      background:linear-gradient(90deg,#a5f3fc,#c7d2fe);
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
    }
    .hero-desc{font-size:15px;color:#c7d2fe;line-height:1.75;max-width:500px;margin-bottom:32px}
    .hero-cards{display:flex;gap:12px;flex-wrap:wrap}
    .hero-card{
      background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);
      border-radius:12px;padding:14px 20px;
      backdrop-filter:blur(8px);min-width:100px;
    }
    .hero-card-v{font-size:22px;font-weight:900;color:#fff;line-height:1}
    .hero-card-l{font-size:11px;color:#a5b4fc;margin-top:4px;font-weight:500}

    /* ── STATUS BAR ── */
    .sbar{
      background:var(--surface);border-bottom:1px solid var(--border);
      padding:10px 24px;
    }
    .sbar-in{
      max-width:980px;margin:0 auto;
      display:flex;align-items:center;gap:10px;flex-wrap:wrap;
    }
    .sbar-ico{
      width:28px;height:28px;border-radius:7px;
      display:flex;align-items:center;justify-content:center;
      background:#ede9fe;
    }
    .sbar-label{font-size:13px;font-weight:500;color:var(--txt2)}
    .sbar-badge{
      display:inline-flex;align-items:center;gap:4px;
      font-size:12px;font-weight:700;
      padding:3px 10px;border-radius:20px;
    }
    .sb-ok{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0}
    .sb-run{background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe}
    .sb-wait{background:#fffbeb;color:#92400e;border:1px solid #fde68a}
    .sb-check{background:#f1f5f9;color:var(--txt3);border:1px solid var(--border)}
    .sbar-next{font-size:12px;color:var(--txt4);margin-left:auto}

    /* ── LAYOUT ── */
    .main{max-width:980px;margin:0 auto;padding:24px 20px 80px}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
    @media(max-width:640px){.grid2{grid-template-columns:1fr}}
    .stack{display:flex;flex-direction:column;gap:20px}

    /* ── CARD ── */
    .card{
      background:var(--surface);border:1px solid var(--border);
      border-radius:var(--r);box-shadow:var(--sh);
      overflow:hidden;transition:box-shadow .2s;
    }
    .card:hover{box-shadow:var(--sh2)}
    .card-head{
      padding:16px 20px;border-bottom:1px solid var(--border);
      display:flex;align-items:center;justify-content:space-between;gap:10px;
      background:linear-gradient(to bottom,var(--surface),var(--surface2));
    }
    .card-title{display:flex;align-items:center;gap:9px;font-size:14px;font-weight:700;color:var(--txt)}
    .c-ico{
      width:32px;height:32px;border-radius:9px;flex-shrink:0;
      display:flex;align-items:center;justify-content:center;
    }
    .card-body{padding:22px 20px}
    .card-body-0{padding:0}

    /* ── SECTION LABEL ── */
    .sec-label{
      display:flex;align-items:center;gap:7px;
      font-size:11px;font-weight:700;color:var(--txt4);
      text-transform:uppercase;letter-spacing:.07em;
      margin-bottom:16px;
    }
    .sec-label::after{content:'';flex:1;height:1px;background:var(--border)}

    /* ── FORM ── */
    .fgroup{display:flex;flex-direction:column;gap:6px;margin-bottom:16px}
    .flabel{
      display:flex;align-items:center;gap:6px;
      font-size:12px;font-weight:700;color:var(--txt2);
      text-transform:uppercase;letter-spacing:.04em;
    }
    .finput{
      width:100%;padding:11px 14px;
      border:1.5px solid var(--border);border-radius:var(--r2);
      font-size:14px;color:var(--txt);background:var(--surface);
      outline:none;transition:border .15s,box-shadow .15s;font-family:inherit;
    }
    .finput:focus{border-color:var(--p);box-shadow:0 0 0 3px rgba(79,70,229,.12)}
    .finput::placeholder{color:var(--txt4)}
    .fhint{font-size:11px;color:var(--txt4);line-height:1.5}
    .fhint b{color:var(--p)}
    .finput-row{display:flex;gap:8px;align-items:flex-start}
    .finput-row .finput{flex:1}

    /* ── BUTTONS ── */
    .btn-primary{
      width:100%;padding:13px 20px;margin-top:8px;
      background:linear-gradient(135deg,var(--p),var(--acc));
      color:#fff;font-size:15px;font-weight:700;
      border:none;border-radius:var(--r2);cursor:pointer;
      display:flex;align-items:center;justify-content:center;gap:8px;
      transition:all .2s;letter-spacing:.01em;
      box-shadow:0 4px 14px rgba(79,70,229,.25);
    }
    .btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(79,70,229,.35)}
    .btn-primary:active{transform:translateY(0)}
    .btn-primary:disabled{opacity:.55;cursor:not-allowed;transform:none!important;box-shadow:none!important}
    .btn{
      display:inline-flex;align-items:center;gap:5px;
      padding:7px 13px;border-radius:var(--r3);
      font-size:12px;font-weight:600;cursor:pointer;
      border:1px solid var(--border);background:var(--surface);color:var(--txt3);
      transition:all .15s;white-space:nowrap;
    }
    .btn:hover{border-color:var(--p);color:var(--p);background:#eef2ff}
    .btn-add{
      flex-shrink:0;padding:11px 16px;border-radius:var(--r2);
      background:var(--p);color:#fff;border:none;
      font-size:14px;font-weight:700;cursor:pointer;
      display:inline-flex;align-items:center;gap:6px;
      transition:background .15s;white-space:nowrap;
    }
    .btn-add:hover{background:var(--p2)}
    .btn-v{background:#eef2ff;border-color:#c7d2fe;color:var(--p)}
    .btn-v:hover{background:#e0e7ff}
    .btn-g{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}
    .btn-g:hover{background:#d1fae5}
    .btn-r{background:#fef2f2;border-color:#fecaca;color:#dc2626}
    .btn-r:hover{background:#fee2e2}
    .btn-share{background:#eef2ff;border-color:#c7d2fe;color:#4f46e5}
    .btn-share:hover{background:#e0e7ff}
    .btn-sm{padding:5px 9px;font-size:11px}

    /* ── LOADING ── */
    .spin{
      width:40px;height:40px;border-radius:50%;
      border:3px solid #e0e7ff;border-top-color:var(--p);
      animation:rot .75s linear infinite;margin:0 auto 14px;
    }
    .spin-sm{
      width:13px;height:13px;border-radius:50%;
      border:2px solid rgba(79,70,229,.3);border-top-color:var(--p);
      animation:rot .6s linear infinite;display:inline-block;vertical-align:middle;
    }
    @keyframes rot{to{transform:rotate(360deg)}}
    .loading-center{text-align:center;padding:48px 24px}
    .loading-title{font-size:14px;font-weight:600;color:var(--txt2);margin-bottom:5px}
    .loading-sub{font-size:12px;color:var(--txt4)}
    .loading-dots span{display:inline-block;animation:ld 1.4s infinite both}
    .loading-dots span:nth-child(2){animation-delay:.2s}
    .loading-dots span:nth-child(3){animation-delay:.4s}
    @keyframes ld{0%,80%,100%{opacity:.3;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}

    /* ── RESULT HERO ── */
    .res-top{
      display:flex;align-items:center;gap:20px;flex-wrap:wrap;
      padding:20px;border-radius:12px;margin-bottom:20px;
      background:linear-gradient(135deg,#f5f3ff 0%,#ede9fe 100%);
      border:1px solid #ddd6fe;
    }
    .rank-ring{
      flex-shrink:0;width:86px;height:86px;border-radius:50%;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-weight:900;position:relative;
    }
    .rank-ring::before{
      content:'';position:absolute;inset:-3px;border-radius:50%;
      background:inherit;opacity:.2;filter:blur(8px);z-index:0;
    }
    .rank-ring>*{position:relative;z-index:1}
    .rk-1{background:linear-gradient(135deg,#fbbf24,#f59e0b,#ef4444)}
    .rk-3{background:linear-gradient(135deg,#818cf8,#6366f1,#7c3aed)}
    .rk-10{background:linear-gradient(135deg,#34d399,#10b981,#0ea5e9)}
    .rk-n{background:linear-gradient(135deg,#4f46e5,#7c3aed)}
    .rk-x{background:linear-gradient(135deg,#94a3b8,#64748b)}
    .rk-num{font-size:28px;line-height:1;color:#fff}
    .rk-lbl{font-size:10px;color:rgba(255,255,255,.85);font-weight:600}
    .res-info{flex:1;min-width:180px}
    .res-kw-badge{
      display:inline-flex;align-items:center;gap:5px;
      background:#ede9fe;border:1px solid #c4b5fd;
      color:var(--p);font-size:12px;font-weight:700;
      padding:3px 11px;border-radius:20px;margin-bottom:9px;
    }
    .res-name{font-size:20px;font-weight:800;color:var(--txt);margin-bottom:8px;line-height:1.3}
    .res-meta{display:flex;gap:14px;flex-wrap:wrap;font-size:13px;color:var(--txt3)}
    .res-meta span{display:flex;align-items:center;gap:4px}
    .res-meta b{color:var(--txt2);font-weight:700}
    .res-pills{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}
    .pill{
      display:inline-flex;align-items:center;gap:4px;
      padding:4px 12px;border-radius:20px;
      font-size:12px;font-weight:700;border:1px solid transparent;
    }
    .pill-b{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}
    .pill-g{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}
    .pill-o{background:#fff7ed;border-color:#fed7aa;color:#c2410c}
    .pill-v{background:#f5f3ff;border-color:#ddd6fe;color:#6d28d9}

    /* ── CHART ── */
    .chart-wrap{
      background:var(--surface2);border-radius:var(--r2);
      border:1px solid var(--border);padding:16px;
    }
    .chart-label{font-size:12px;font-weight:700;color:var(--txt3);margin-bottom:12px;display:flex;align-items:center;gap:6px}
    .chart-box{position:relative;height:220px}

    /* ── TRACKING ITEMS ── */
    .ti-list{display:flex;flex-direction:column;gap:10px}
    .ti{
      display:flex;align-items:center;gap:13px;
      padding:14px 16px;border-radius:12px;
      border:1.5px solid var(--border);background:var(--surface);
      transition:all .15s;
    }
    .ti:hover{border-color:#c7d2fe;box-shadow:0 2px 12px rgba(79,70,229,.07)}
    .ti-rank{
      flex-shrink:0;width:54px;height:54px;border-radius:12px;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      border:2px solid transparent;font-weight:900;
    }
    .ti-rank .n{font-size:22px;line-height:1}
    .ti-rank .u{font-size:9px;font-weight:600;margin-top:1px}
    .tg-gold{background:#fffbeb;border-color:#fde68a;color:#b45309}
    .tg-green{background:#ecfdf5;border-color:#6ee7b7;color:#065f46}
    .tg-blue{background:#eff6ff;border-color:#bfdbfe;color:#1e40af}
    .tg-gray{background:var(--surface2);border-color:var(--border);color:var(--txt4)}
    .ti-body{flex:1;min-width:0}
    .ti-kw{font-size:14px;font-weight:700;color:var(--txt);line-height:1.3}
    .ti-place{font-size:12px;color:var(--txt4);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .ti-meta{display:flex;align-items:center;gap:6px;margin-top:6px;flex-wrap:wrap}
    .chip{
      display:inline-flex;align-items:center;gap:3px;
      padding:3px 9px;border-radius:20px;
      font-size:11px;font-weight:700;
    }
    .chip-ok{background:#ecfdf5;color:#065f46}
    .chip-wait{background:#fffbeb;color:#92400e}
    .chip-gray{background:var(--surface2);color:var(--txt4);border:1px solid var(--border)}
    .ti-time{font-size:11px;color:var(--txt4)}
    .ti-actions{flex-shrink:0;display:flex;gap:5px}

    /* ── EMPTY ── */
    .empty{text-align:center;padding:48px 20px}
    .empty-ico{
      width:60px;height:60px;border-radius:16px;
      background:linear-gradient(135deg,#f5f3ff,#ede9fe);
      border:1px solid #ddd6fe;
      display:flex;align-items:center;justify-content:center;
      margin:0 auto 16px;
    }
    .empty-t{font-size:15px;font-weight:700;color:var(--txt2);margin-bottom:5px}
    .empty-s{font-size:13px;color:var(--txt4);line-height:1.6}

    /* ── ALERT ── */
    .alert{
      display:flex;align-items:flex-start;gap:10px;
      padding:12px 14px;border-radius:var(--r2);
      font-size:13px;margin-bottom:16px;line-height:1.5;
    }
    .alert-w{background:#fffbeb;border:1px solid #fde68a;color:#92400e}
    .alert-i{background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af}

    /* ── DASHBOARD TABLE ── */
    .tbl-scroll{overflow-x:auto;border-radius:0 0 var(--r) var(--r)}
    .tbl{width:100%;border-collapse:collapse;font-size:13px}
    .tbl th{
      padding:9px 10px;text-align:center;
      font-weight:700;font-size:11px;color:var(--txt3);
      background:var(--surface2);border-bottom:2px solid var(--border);
      white-space:nowrap;letter-spacing:.02em;
    }
    .tbl th.tk{text-align:left;min-width:120px;padding-left:20px}
    .tbl td{padding:9px 10px;text-align:center;border-bottom:1px solid #f1f5f9;vertical-align:middle}
    .tbl td.tk{text-align:left;font-weight:600;color:var(--txt);padding-left:20px}
    .tbl tbody tr:hover{background:#faf5ff}
    .tbl tbody tr:last-child td{border-bottom:none}
    .rc{
      display:inline-flex;align-items:center;justify-content:center;
      width:32px;height:32px;border-radius:8px;
      font-weight:800;font-size:12px;
    }
    .rc-1{background:#fef3c7;color:#92400e}
    .rc-3{background:#d1fae5;color:#065f46}
    .rc-10{background:#dbeafe;color:#1e40af}
    .rc-x{background:#f1f5f9;color:var(--txt3)}
    .rc-n{background:#f8fafc;color:#cbd5e1}
    .tbl-best{font-weight:800}
    .tbl-avg{color:var(--txt3)}

    /* ── MONTH NAV ── */
    .mnav{display:flex;align-items:center;gap:6px}
    .mnav-btn{
      width:28px;height:28px;border-radius:7px;
      border:1px solid var(--border);background:var(--surface);
      cursor:pointer;display:flex;align-items:center;justify-content:center;
      font-size:14px;color:var(--txt3);transition:all .15s;
    }
    .mnav-btn:hover{border-color:var(--p);color:var(--p)}
    .mnav-label{
      font-size:13px;font-weight:800;color:var(--p);
      padding:4px 12px;background:#eef2ff;border-radius:8px;
    }

    /* ── TOAST ── */
    #toast-wrap{position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:340px;pointer-events:none}
    .toast{
      padding:12px 16px;border-radius:12px;
      font-size:13px;font-weight:600;line-height:1.5;
      display:flex;align-items:flex-start;gap:9px;
      box-shadow:0 8px 24px rgba(0,0,0,.12);
      opacity:0;transform:translateX(20px);transition:all .25s cubic-bezier(.34,1.56,.64,1);
      pointer-events:all;
    }
    .toast.show{opacity:1;transform:translateX(0)}
    .toast-s{background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46}
    .toast-e{background:#fef2f2;border:1px solid #fecaca;color:#991b1b}
    .toast-w{background:#fffbeb;border:1px solid #fde68a;color:#92400e}
    .toast-i{background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af}
    .toast-ico{flex-shrink:0;margin-top:1px}

    /* ── DIVIDER ── */
    .divider{height:1px;background:var(--border);margin:16px 0}

    /* ── RESPONSIVE ── */
    @media(max-width:640px){
      .hero{padding:32px 16px 40px}
      .main{padding:16px 14px 64px}
      .card-body{padding:16px}
      .res-top{gap:14px}
      .rank-ring{width:70px;height:70px}
      .rk-num{font-size:22px}
      .ti{flex-wrap:wrap}
      .ti-actions{width:100%;justify-content:flex-end}
      .nav{padding:0 14px}
      .sbar{padding:8px 16px}
    }
    /* ── MODAL HIDDEN ── */
    .hidden{display:none!important}
  .embed .nav{display:none!important}
  </style>
</head>
<body>
<script>if(location.search.indexOf('embed=1')>-1)document.documentElement.classList.add('embed');<\/script>

<!-- ═══════════════════════════════ NAV ═══════════════════════════════ -->
<nav class="nav">
  <div class="nav-l">
    <button class="nav-back" id="navBackBtn" onclick="goBack()">
      <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
      대시보드
    </button>
    <span class="nav-divider" id="navDivider"></span>
    <span class="nav-title">플레이스 순위 추적</span>
  </div>
  <div class="nav-r">
    <div class="live-badge">
      <span class="live-dot"></span>
      매일 KST 자동 업데이트
    </div>
  </div>
</nav>

<!-- ═══════════════════════════════ HERO ═══════════════════════════════ -->
<section class="hero">
  <div class="hero-in">
    <div class="hero-eyebrow">
      <svg width="11" height="11" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
      네이버 플레이스 순위 추적 도구
    </div>
    <h1>내 플레이스, 지금 <span>몇 위</span>인가요?</h1>
    <p class="hero-desc">
      키워드별 순위를 즉시 확인하고, 매일 KST 기준으로 자동 업데이트되는<br>
      순위 변동 추이를 한눈에 파악하세요.
    </p>

  </div>
</section>

<!-- ═══════════════════════════════ STATUS BAR ═══════════════════════════════ -->
<div class="sbar">
  <div class="sbar-in">
    <div class="sbar-ico">
      <svg width="14" height="14" fill="none" stroke="#7c3aed" stroke-width="2" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.08"/></svg>
    </div>
    <span class="sbar-label">자동 업데이트 상태</span>
    <span class="sbar-badge sb-check" id="upd-badge">
      <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      확인 중...
    </span>
    <span class="sbar-next">다음 자동 실행: 매일 KST 04:00</span>
  </div>
</div>

<!-- ═══════════════════════════════ MAIN ═══════════════════════════════ -->
<div class="main">
<div class="stack">

  <!-- ① 순위 즉시 확인 -->
  <div class="card">
    <div class="card-head">
      <div class="card-title">
        <div class="c-ico" style="background:#eef2ff">
          <svg width="16" height="16" fill="none" stroke="#4f46e5" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </div>
        순위 즉시 확인
      </div>
      <span style="font-size:11px;font-weight:600;color:var(--txt4);background:var(--surface2);padding:3px 9px;border-radius:20px;border:1px solid var(--border)">실시간 조회</span>
    </div>
    <div class="card-body">
      <form onsubmit="doCheck(event)">
        <div class="grid2">
          <div class="fgroup" style="margin-bottom:0">
            <label class="flabel">
              <svg width="11" height="11" fill="#4f46e5" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              플레이스 URL
            </label>
            <input class="finput" id="purl" type="text" required
              placeholder="https://map.naver.com/p/search/... 또는 https://m.place.naver.com/place/..."
              oninput="autoKw(this.value)" onpaste="setTimeout(()=>autoKw(this.value),60)">
            <div class="fhint">map.naver.com · m.place.naver.com · naver.me 등 <b>모든 네이버 플레이스 URL 인식</b> — 붙여넣기 시 키워드 자동 입력</div>
          </div>
          <div class="fgroup" style="margin-bottom:0">
            <label class="flabel">
              <svg width="11" height="11" fill="none" stroke="#10b981" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              검색 키워드
            </label>
            <input class="finput" id="kw" type="text" required placeholder="예: 강남 맛집, 신촌 카페">
            <div class="fhint">네이버에서 실제로 검색할 키워드</div>
          </div>
        </div>
        <button class="btn-primary" id="cbtn" type="submit">
          <svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          지금 순위 확인하기
        </button>
      </form>
    </div>
  </div>

  <!-- ② 로딩 -->
  <div class="card" id="ld" style="display:none">
    <div class="loading-center">
      <div class="spin"></div>
      <div class="loading-title">네이버 플레이스 순위 확인 중<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span></div>
      <div class="loading-sub">최대 20초 소요됩니다</div>
    </div>
  </div>

  <!-- ③ 결과 -->
  <div class="card" id="res" style="display:none">
    <div class="card-head">
      <div class="card-title">
        <div class="c-ico" style="background:#ecfdf5">
          <svg width="16" height="16" fill="none" stroke="#10b981" stroke-width="2" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </div>
        순위 결과
      </div>
      <button class="btn btn-g" id="btn-add-res" onclick="addFromResult()" style="display:none">
        <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
        자동 추적 등록
      </button>
    </div>
    <div class="card-body">
      <div class="alert alert-w" id="res-warn" style="display:none">
        <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;margin-top:1px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        검색 결과 100위 안에 노출되지 않습니다.
      </div>
      <div class="res-top">
        <div id="rring" class="rank-ring rk-x">
          <span class="rk-num" id="rnum">-</span>
          <span class="rk-lbl" id="rlbl">위</span>
        </div>
        <div class="res-info">
          <div id="ri-kw" class="res-kw-badge"></div>
          <div id="ri-name" class="res-name">-</div>
          <div class="res-meta">
            <span>
              <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              전체 <b id="ri-total">-</b>개
            </span>
            <span>
              <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span id="ri-time">-</span>
            </span>
          </div>
          <div class="res-pills" id="ri-pills"></div>
        </div>
      </div>
      <div class="chart-wrap">
        <div class="chart-label">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          순위 추이 — 최근 30일
        </div>
        <div class="chart-box"><canvas id="rkChart"></canvas></div>
      </div>
    </div>
  </div>

  <!-- ④ 자동 추적 키워드 -->
  <div class="card">
    <div class="card-head">
      <div class="card-title">
        <div class="c-ico" style="background:#eff6ff">
          <svg width="16" height="16" fill="none" stroke="#3b82f6" stroke-width="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
        자동 추적 키워드
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn" id="btnUpd" onclick="manualUpdate()">
          <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.08"/></svg>
          지금 업데이트
        </button>
        <button class="btn" onclick="exportCsv()">
          <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          CSV
        </button>
      </div>
    </div>
    <div class="card-body">
      <div class="alert alert-i">
        <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        등록한 키워드는 <b>매일 KST 04:00 이후</b> 자동으로 업데이트됩니다. 오늘 업데이트가 안 됐다면 <em>"지금 업데이트"</em> 버튼을 클릭하세요.
      </div>
      <div class="finput-row" style="margin-bottom:18px">
        <input class="finput" id="t-purl" placeholder="플레이스 URL (map.naver.com, m.place.naver.com 등)" style="flex:1.6">
        <input class="finput" id="t-kw" placeholder="키워드">
        <button class="btn-add" onclick="addTracking()">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          추가
        </button>
      </div>
      <div id="tlist"></div>
    </div>
  </div>

  <!-- ⑤ 순위 현황판 -->
  <div class="card">
    <div class="card-head">
      <div class="card-title">
        <div class="c-ico" style="background:#fff7ed">
          <svg width="16" height="16" fill="none" stroke="#f97316" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        </div>
        순위 현황판
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="mnav">
          <button class="mnav-btn" onclick="shiftMon(-1)">&#8249;</button>
          <span class="mnav-label" id="mlbl">-</span>
          <button class="mnav-btn" onclick="shiftMon(1)">&#8250;</button>
        </div>
        <button class="btn btn-sm" onclick="loadDash()">
          <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.08"/></svg>
        </button>
      </div>
    </div>
    <div id="dld" style="display:none">
      <div class="loading-center" style="padding:32px">
        <div class="spin" style="width:32px;height:32px;border-width:2.5px"></div>
      </div>
    </div>
    <div id="dem" class="empty" style="display:none">
      <div class="empty-ico">
        <svg width="28" height="28" fill="none" stroke="#a78bfa" stroke-width="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
      </div>
      <div class="empty-t">이 달의 순위 데이터가 없습니다</div>
      <div class="empty-s">추적 키워드를 등록하거나<br>업데이트를 기다려주세요</div>
    </div>
    <div id="dtw" style="display:none" class="tbl-scroll">
      <table class="tbl"><thead><tr id="dth"></tr></thead><tbody id="dtb"></tbody></table>
    </div>
  </div>

</div><!-- /stack -->
</div><!-- /main -->

<div id="toast-wrap"></div>

<script>
// ═══ STATE ═══
let cPlaceId=null,cPlaceUrl=null,cKw=null;
let tracking=[];
let rkChart=null;
let monOffset=0;

const U=(()=>{try{return JSON.parse(localStorage.getItem('adminUser')||localStorage.getItem('user')||'{}')}catch(e){return {}}})();

function H(json){
  const h={};
  if(json) h['Content-Type']='application/json';
  if(U&&U.id){
    try{
      const s={id:U.id,user_type:U.user_type||'user',role:U.role||'user'};
      h['X-User-Data-Base64']=(function(){var _wx3b=new TextEncoder().encode(JSON.stringify(s));var _wx3s="";_wx3b.forEach(function(c){_wx3s+=String.fromCharCode(c);});return btoa(_wx3s);})();
    }catch(e){h['X-User-Data-Base64']=(function(){var _wx4b=new TextEncoder().encode(JSON.stringify({id:U.id}));var _wx4s="";_wx4b.forEach(function(c){_wx4s+=String.fromCharCode(c);});return btoa(_wx4s);})()}
  }
  return h;
}

// ═══ NAV ═══
// iframe 내부(마케터 대시보드)에서 열렸을 때는 대시보드 버튼 숨김
(function(){
  var inIframe = false;
  try{ inIframe = window.self !== window.top; }catch(e){ inIframe = true; }
  if(inIframe){
    // nav 상단 대시보드 버튼 숨김
    document.getElementById('navBackBtn') && (document.getElementById('navBackBtn').style.display='none');
    document.getElementById('navDivider') && (document.getElementById('navDivider').style.display='none');
    // 사이드바 안에서 학원장 대시보드 버튼은 항상 표시
    document.getElementById('sbFooterDash') && (document.getElementById('sbFooterDash').style.display='block');
  } else {
    // 직접 접근 시 사이드바 푸터 표시
    document.getElementById('sbFooterDash') && (document.getElementById('sbFooterDash').style.display='block');
  }
})();
function goBack(){
  try{
    const u=JSON.parse(localStorage.getItem('adminUser')||localStorage.getItem('user')||'{}');
    location.href=(u.role==='admin')?'/admin/marketing':'/super1647';
  }catch(e){location.href='/super1647'}
}

// ═══ URL → 키워드 자동입력 ═══
// ── URL에서 PlaceID 추출 (모든 네이버 플레이스 URL 형식 지원) ──
function extractNaverPlaceId(url){
  if(!url) return null;
  var s=url.trim();
  try{
    // 0) 숫자만 입력한 경우 (place ID 직접 입력)
    if(new RegExp('^[0-9]{5,10}$').test(s)) return s;
    // 1) /place/숫자 패턴 — map.naver.com·m.place.naver.com 공용
    var m1=s.match(new RegExp('/place/([0-9]{5,})'));
    if(m1) return m1[1];
    // 2) place.naver.com/카테고리/숫자 패턴
    var m2=s.match(new RegExp('place[.]naver[.]com/(?:place|restaurant|cafe|beauty|hospital|pharmacy|accommodation|shopping|culture|activity)/([0-9]{5,})'));
    if(m2) return m2[1];
    // 3) naver.me 단축 URL
    var m3=s.match(new RegExp('naver[.]me/[A-Za-z0-9]*?/?([0-9]{7,})'));
    if(m3) return m3[1];
    // 4) URL 경로의 7~10자리 숫자 (timestamp 12자리 제외)
    var m4=s.match(new RegExp('/([0-9]{7,10})(?:[/?#]|$)'));
    if(m4) return m4[1];
    // 5) 마지막 fallback: URL 내 첫 번째 5~10자리 숫자
    var m5=s.match(new RegExp('(?:^|[^0-9])([0-9]{5,10})(?:[^0-9]|$)'));
    if(m5) return m5[1];
  }catch(e){}
  return null;
}
function autoKw(url){
  if(!url) return;
  try{
    // bk_query 파라미터에서 키워드 자동 추출
    const m=url.match(/[?&]bk_query=([^&]+)/);
    if(m){
      const f=document.getElementById('kw');
      if(f&&!f.value){
        f.value=decodeURIComponent(m[1].replace(/[+]/g,' ')).trim();
        f.style.borderColor='var(--green)';
        f.style.background='#f0fdf4';
        setTimeout(()=>{f.style.borderColor='';f.style.background=''},1600);
      }
    }
    // searchText 파라미터도 지원 (map.naver.com에서 사용)
    if(!document.getElementById('kw')?.value){
      const ms=url.match(/[?&]searchText=([^&]+)/);
      if(ms){
        const f=document.getElementById('kw');
        if(f&&!f.value){
          f.value=decodeURIComponent(ms[1].replace(/[+]/g,' ')).trim();
          f.style.borderColor='var(--green)';
          f.style.background='#f0fdf4';
          setTimeout(()=>{f.style.borderColor='';f.style.background=''},1600);
        }
      }
    }
  }catch(e){}
}

// ═══ CHECK RANK ═══
async function doCheck(ev){
  if(ev&&ev.preventDefault) ev.preventDefault();
  const pu=(document.getElementById('purl').value||'').trim();
  const kw=(document.getElementById('kw').value||'').trim();
  if(!pu){toast('플레이스 URL 또는 플레이스 ID를 입력해주세요.','e');return}
  const pid=extractNaverPlaceId(pu)||'';
  cPlaceId=pid;cPlaceUrl=pu;cKw=kw;
  document.getElementById('t-purl').value=pu;
  document.getElementById('t-kw').value=kw;
  document.getElementById('res').style.display='none';
  document.getElementById('ld').style.display='';
  document.getElementById('cbtn').disabled=true;
  try{
    const r=await fetch('/api/naver-place/rank',{
      method:'POST',headers:H(true),credentials:'include',
      body:JSON.stringify({placeId:cPlaceId,placeUrl:pu,keyword:kw,location:null})
    });
    const d=await r.json();
    if(d.success){showRes(d);loadTracking();loadHistChart()}
    else toast(d.error||'순위 확인 실패','e');
  }catch(e){toast('네트워크 오류가 발생했습니다.','e')}
  finally{
    document.getElementById('ld').style.display='none';
    document.getElementById('cbtn').disabled=false;
  }
}

// ═══ SHOW RESULT ═══
function showRes(d){
  const rank=d.rank,found=d.found!==false,total=d.totalCount||0,name=d.placeName||'플레이스';
  document.getElementById('res').style.display='';
  document.getElementById('res-warn').style.display=(!found||!rank)?'':'none';
  const ring=document.getElementById('rring'),rn=document.getElementById('rnum'),rl=document.getElementById('rlbl');
  ring.className='rank-ring ';
  if(!found||!rank){
    ring.classList.add('rk-x');rn.textContent='미노출';rl.style.display='none';
  }else{
    rl.style.display='';rn.textContent=rank;
    ring.classList.add(rank===1?'rk-1':rank<=3?'rk-3':rank<=10?'rk-10':'rk-n');
  }
  document.getElementById('ri-kw').innerHTML=
    '<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" style="flex-shrink:0"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> '+esc(d.keyword);
  document.getElementById('ri-name').textContent=name;
  document.getElementById('ri-total').textContent=total>0?total.toLocaleString():'집계중';
  document.getElementById('ri-time').textContent=new Date().toLocaleString('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Seoul'});
  const ps=[];
  if(found&&rank>0&&total>0) ps.push({c:'pill-g',t:'상위 '+((rank/total)*100).toFixed(1)+'%'});
  if(found&&rank>0&&rank<=10) ps.push({c:'pill-b',t:'🏆 상위 10위'});
  if(found&&rank>0&&rank<=3) ps.push({c:'pill-o',t:'🥇 TOP 3'});
  if(!found||!rank) ps.push({c:'pill-v',t:'노출 없음'});
  document.getElementById('ri-pills').innerHTML=ps.map(p=>'<span class="pill '+p.c+'">'+p.t+'</span>').join('');
  const already=tracking.some(t=>t.place_id===cPlaceId&&t.keyword===cKw);
  document.getElementById('btn-add-res').style.display=already?'none':'';
  document.getElementById('res').scrollIntoView({behavior:'smooth',block:'nearest'});
}

// ═══ CHART ═══
async function loadHistChart(){
  if(!cPlaceId||!cKw) return;
  try{
    const r=await fetch('/api/naver-place/rank-history?placeId='+encodeURIComponent(cPlaceId)+'&keyword='+encodeURIComponent(cKw)+'&days=30',{headers:H(false),credentials:'include'});
    const d=await r.json();
    if(d.success&&d.history&&d.history.length) drawChart(d.history);
  }catch(e){}
}
function drawChart(hist){
  const ctx=document.getElementById('rkChart');
  if(!ctx) return;
  const bd={};
  for(const r of hist){const dt=(r.date||r.created_at||'').slice(0,10);if(!bd[dt]||r.created_at>bd[dt].created_at) bd[dt]=r}
  const sorted=Object.values(bd).sort((a,b)=>a.date<b.date?-1:1);
  const labels=sorted.map(r=>{const d=new Date(r.date+'T12:00:00');return (d.getMonth()+1)+'/'+(d.getDate())});
  const ranks=sorted.map(r=>r.rank_number||null);
  if(rkChart) rkChart.destroy();
  rkChart=new Chart(ctx,{
    type:'line',
    data:{labels,datasets:[{
      label:'순위',data:ranks,
      borderColor:'#4f46e5',
      backgroundColor:(ctx2)=>{
        const g=ctx2.chart.ctx.createLinearGradient(0,0,0,ctx2.chart.height);
        g.addColorStop(0,'rgba(79,70,229,.15)');g.addColorStop(1,'rgba(79,70,229,0)');return g;
      },
      pointBackgroundColor:'#4f46e5',pointBorderColor:'#fff',pointBorderWidth:2,
      pointRadius:5,pointHoverRadius:7,
      tension:.4,fill:true,spanGaps:true
    }]},
    options:{
      responsive:true,maintainAspectRatio:false,
      scales:{
        y:{
          reverse:true,beginAtZero:false,
          grid:{color:'rgba(0,0,0,.04)',drawBorder:false},
          ticks:{color:'#94a3b8',font:{size:11}},
          title:{display:true,text:'순위',color:'#94a3b8',font:{size:11}},
          border:{display:false}
        },
        x:{
          grid:{display:false},
          ticks:{color:'#94a3b8',font:{size:11}},
          border:{display:false}
        }
      },
      plugins:{
        legend:{display:false},
        tooltip:{
          backgroundColor:'rgba(15,23,42,.9)',titleColor:'#e2e8f0',bodyColor:'#94a3b8',
          padding:10,borderColor:'rgba(255,255,255,.1)',borderWidth:1,
          callbacks:{label:c=>c.raw==null?'데이터 없음':c.raw+'위'}
        }
      },
      animation:{duration:600,easing:'easeInOutQuart'}
    }
  });
}

// ═══ ADD TRACKING ═══
async function addFromResult(){
  if(!cPlaceId||!cKw){toast('먼저 순위를 확인해주세요.','w');return}
  if(await _addT(cPlaceId,cPlaceUrl,cKw)) document.getElementById('btn-add-res').style.display='none';
}
async function addTracking(){
  const pu=document.getElementById('t-purl').value.trim();
  const kw=document.getElementById('t-kw').value.trim();
  if(!pu){toast('플레이스 URL을 입력해주세요.','w');return}
  if(!kw){toast('키워드를 입력해주세요.','w');return}
  const pid=extractNaverPlaceId(pu)||'';
  if(await _addT(pid,pu,kw)){document.getElementById('t-purl').value='';document.getElementById('t-kw').value='';}
}
async function _addT(pid,pu,kw){
  try{
    const r=await fetch('/api/naver-place/tracking',{method:'POST',headers:H(true),credentials:'include',body:JSON.stringify({placeId:pid,placeUrl:pu,keyword:kw})});
    const d=await r.json();
    if(d.success){toast('등록 완료! 매일 KST 자동 업데이트됩니다.','s');loadTracking();return true}
    toast(d.error||'등록 실패','e');return false;
  }catch(e){toast('네트워크 오류','e');return false}
}

// ═══ TRACKING LIST ═══
async function loadTracking(){
  try{const c=localStorage.getItem('tc');if(c){tracking=JSON.parse(c);renderTracking()}}catch(e){}
  try{
    const r=await fetch('/api/naver-place/tracking',{headers:H(false),credentials:'include'});
    const d=await r.json();
    if(d.success&&d.keywords){
      tracking=d.keywords;
      localStorage.setItem('tc',JSON.stringify(tracking));
      renderTracking();
      autoUpdateCheck();
    }
  }catch(e){}
}
function renderTracking(){
  const el=document.getElementById('tlist');
  if(!tracking||!tracking.length){
    el.innerHTML='<div class="empty"><div class="empty-ico"><svg width="28" height="28" fill="none" stroke="#a78bfa" stroke-width="1.5" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div><div class="empty-t">추적 키워드 없음</div><div class="empty-s">위에서 순위를 확인하고<br>키워드를 추가해보세요</div></div>';
    return;
  }
  el.innerHTML='<div class="ti-list">'+tracking.map(renderTI).join('')+'</div>';
}
function rkCls(r){if(!r)return 'tg-gray';if(r<=3)return 'tg-gold';if(r<=10)return 'tg-green';return 'tg-blue'}
function renderTI(it){
  const r=it.last_rank,total=it.last_total_count,chk=it.last_checked,nm=it.place_name||'';
  const today=kstToday();
  const isToday=chk&&chk.slice(0,10)===today;
  const sc=isToday
    ?'<span class="chip chip-ok"><svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>오늘 업데이트</span>'
    :'<span class="chip chip-wait"><svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>업데이트 대기</span>';
  const safeId=it.id;
  const safePid=esc(it.place_id);
  const safePu=encodeURIComponent(it.place_url||'');
  const safeKw=esc(it.keyword);
  return '<div class="ti" id="ti-'+safeId+'"'+
    ' data-id="'+safeId+'"'+
    ' data-pid="'+safePid+'"'+
    ' data-pu="'+safePu+'"'+
    ' data-kw="'+safeKw+'">'+
    '<div class="ti-rank '+rkCls(r)+'"><span class="n">'+(r||'-')+'</span><span class="u">위</span></div>'+
    '<div class="ti-body">'+
      '<div class="ti-kw">'+esc(it.keyword)+'</div>'+
      (nm?'<div class="ti-place">'+esc(nm)+'</div>':'')+
      '<div class="ti-meta">'+
        (total?'<span class="chip chip-gray">전체 '+total.toLocaleString()+'개</span>':'')+
        sc+
        (chk?'<span class="ti-time">'+fdt(chk)+'</span>':'')+
      '</div>'+
    '</div>'+
    '<div class="ti-actions">'+
      '<button class="btn btn-v" onclick="chkOneById('+safeId+')" title="지금 순위 확인">'+
        '<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>확인'+
      '</button>'+
      '<button class="btn" onclick="showChart('+safeId+')" title="순위 추이">'+
        '<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>'+
      '</button>'+
      '<button class="btn btn-share" onclick="openDetail('+safeId+')" title="상세/공유 페이지">'+
        '<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>공유'+
      '</button>'+
      '<button class="btn btn-r" onclick="delT('+safeId+')" title="삭제">'+
        '<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>'+
      '</button>'+
    '</div>'+
  '</div>';
}

// ═══ CHECK ONE ═══
function chkOneById(id){
  const el=document.getElementById('ti-'+id);
  if(!el) return;
  const pid=el.dataset.pid||'';
  const pu=el.dataset.pu||'';
  const kw=decodeURIComponent(el.dataset.kw||'');
  chkOne(id,pid,pu,kw);
}
async function chkOne(id,pid,pu,kw){
  const b=document.querySelector('#ti-'+id+' .btn-v');
  if(b){b.disabled=true;b.innerHTML='<span class="spin-sm"></span>확인중'}
  cPlaceId=pid;cPlaceUrl=decodeURIComponent(pu||'');cKw=kw;
  try{
    const r=await fetch('/api/naver-place/rank',{method:'POST',headers:H(true),credentials:'include',body:JSON.stringify({placeId:pid,placeUrl:decodeURIComponent(pu||''),keyword:kw,location:null})});
    const d=await r.json();
    if(d.success){showRes(d);loadTracking();loadHistChart();loadDash();document.getElementById('res').scrollIntoView({behavior:'smooth'})}
    else toast(d.error||'확인 실패','e');
  }catch(e){toast('네트워크 오류','e')}
  finally{
    if(b){b.disabled=false;b.innerHTML='<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>확인'}
  }
}

// ═══ CHART FOR TRACKING ═══
async function showChart(tid){
  try{
    const r=await fetch('/api/naver-place/tracking-history?trackingId='+tid+'&days=30',{headers:H(false),credentials:'include'});
    const d=await r.json();
    if(!d.success||!d.history||!d.history.length){toast('아직 순위 기록이 없습니다.','w');return}
    const t=d.summary&&d.summary.tracking;
    drawChart(d.history);
    document.getElementById('res').style.display='';
    document.getElementById('ri-kw').innerHTML='<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> '+(t?esc(t.keyword):'순위 추이');
    document.getElementById('ri-name').textContent=(t&&t.place_name)||'-';
    document.getElementById('rnum').textContent=(d.summary&&d.summary.latestRank)||'-';
    document.getElementById('rlbl').style.display='';
    document.getElementById('rring').className='rank-ring rk-n';
    document.getElementById('res').scrollIntoView({behavior:'smooth'});
  }catch(e){toast('로드 실패','e')}
}

// ═══ DETAIL / SHARE ═══
function openDetail(id){
  try{
    const mo = document.getElementById('share-modal');
    if(!mo){ console.warn('[share] share-modal not found'); return; }
    mo.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
    const g=function(i){ return document.getElementById(i); };
    if(g('sm-url'))      g('sm-url').value      = location.origin+'/r/'+id;
    if(g('sm-id'))       g('sm-id').value        = id;
    if(g('sm-title'))    g('sm-title').value      = '';
    if(g('sm-subtitle')) g('sm-subtitle').value   = '';
    if(g('sm-thumb'))    g('sm-thumb').value       = '';
    const prev=g('sm-thumb-preview');
    if(prev){ prev.src=''; prev.style.display='none'; }
    const empty=g('sm-thumb-empty');
    if(empty) empty.style.display='flex';
    const fi=g('sm-thumb-file');
    if(fi) fi.value='';
    const lbl=g('sm-file-label');
    if(lbl) lbl.textContent='파일 선택';
    fetch('/api/naver-place/tracking/'+id+'/share-settings',{headers:H(false),credentials:'include'})
      .then(function(r){ return r.json(); })
      .then(function(d){
        if(g('sm-title'))    g('sm-title').value    = d.share_title    || '';
        if(g('sm-subtitle')) g('sm-subtitle').value  = d.share_subtitle || '';
        if(d.share_thumbnail && g('sm-thumb')){
          g('sm-thumb').value = d.share_thumbnail;
          updateThumbPreview();
        }
      }).catch(function(){});
  }catch(e){ console.error('[openDetail]',e); }
}

// ═══ SHARE MODAL ═══
function closeShareModal(){
  const mo = document.getElementById('share-modal');
  if(mo) mo.style.display='none';
}
function updateThumbPreview(){
  const thumbEl = document.getElementById('sm-thumb');
  const url = thumbEl ? thumbEl.value.trim() : '';
  const prev  = document.getElementById('sm-thumb-preview');
  const empty = document.getElementById('sm-thumb-empty');
  if(url){
    if(prev){ prev.src=url; prev.style.display='block'; }
    if(empty) empty.style.display='none';
  } else {
    if(prev){ prev.src=''; prev.style.display='none'; }
    if(empty) empty.style.display='flex';
  }
}
// 파일 선택 → 업로드 → URL 세팅
async function handleThumbFileChange(input){
  const file = input.files && input.files[0];
  if(!file) return;
  const label = document.getElementById('sm-file-label');
  label.textContent = '업로드 중...';
  try{
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch('/api/upload/landing-image',{
      method:'POST', body:fd, credentials:'include'
    });
    const d = await r.json();
    if(d.success && d.url){
      document.getElementById('sm-thumb').value = d.url;
      updateThumbPreview();
      label.textContent = '✓ 업로드 완료';
      setTimeout(()=>{ label.textContent='파일 선택'; },2000);
    } else {
      toast(d.error||'업로드 실패','e');
      label.textContent = '파일 선택';
    }
  }catch(e){
    toast('업로드 오류: '+e,'e');
    label.textContent = '파일 선택';
  }
  input.value='';
}
async function saveShareSettings(){
  const id    = document.getElementById('sm-id').value;
  const title = document.getElementById('sm-title').value.trim();
  const sub   = document.getElementById('sm-subtitle').value.trim();
  const thumb = document.getElementById('sm-thumb').value.trim();
  const btn   = document.getElementById('sm-save-btn');
  btn.disabled=true; btn.textContent='저장 중...';
  try{
    const r = await fetch('/api/naver-place/tracking/'+id+'/share-settings',{
      method:'PUT', headers:{...H(true)}, credentials:'include',
      body:JSON.stringify({share_title:title, share_subtitle:sub, share_thumbnail:thumb})
    });
    const d = await r.json();
    if(d.success){ toast('공유 설정이 저장됐습니다.','s'); closeShareModal(); }
    else { toast(d.error||'저장 실패','e'); }
  }catch(e){ toast('네트워크 오류','e'); }
  finally{ btn.disabled=false; btn.textContent='저장하고 닫기'; }
}
async function copyShareLink(){
  const url = document.getElementById('sm-url').value;
  try{
    await navigator.clipboard.writeText(url);
  }catch(e){
    const ta=document.createElement('textarea');ta.value=url;
    document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);
  }
  const btn=document.getElementById('sm-copy-btn');
  btn.textContent='✓ 복사됨!'; btn.style.background='#10b981'; btn.style.color='#fff';
  setTimeout(()=>{ btn.textContent='링크 복사'; btn.style.background=''; btn.style.color=''; },2000);
}
async function openShareUrl(){
  const url = document.getElementById('sm-url').value;
  window.open(url,'_blank','noopener');
}

// ═══ DELETE ═══
async function delT(id){
  if(!confirm('이 키워드 추적을 중단할까요?')) return;
  try{
    const r=await fetch('/api/naver-place/tracking/'+id,{method:'DELETE',headers:H(false),credentials:'include'});
    const d=await r.json();
    if(d.success){toast('삭제되었습니다.','s');loadTracking();loadDash()}
    else toast(d.error||'삭제 실패','e');
  }catch(e){toast('네트워크 오류','e')}
}

// ═══ CSV ═══
function exportCsv(){
  if(!tracking||!tracking.length){toast('내보낼 데이터가 없습니다.','w');return}
  const BOM='\uFEFF';
  let csv=BOM+'키워드,업체명,최근순위,전체수,마지막확인\\n';
  tracking.forEach(t=>{csv+='"'+t.keyword+'","'+(t.place_name||'')+'",'+( t.last_rank||'')+','+(t.last_total_count||'')+',"'+fdt(t.last_checked)+'"\\n'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  a.download='place_rank_'+kstToday()+'.csv';a.click();
}

// ═══ MANUAL UPDATE ═══
async function manualUpdate(){
  const btn=document.getElementById('btnUpd');
  btn.disabled=true;
  btn.innerHTML='<span class="spin-sm"></span> 업데이트 중...';
  toast('모든 키워드를 백그라운드로 업데이트합니다. 약 30초 후 완료됩니다.','i');
  const token='superplace-cron-2024';
  for(let off=0;off<60;off+=20){
    fetch('/api/naver-place/update-all-tracking?offset='+off+'&limit=20',{
      method:'POST',headers:{...H(true),'X-Cron-Token':token}
    }).catch(()=>{});
    if(off<40) await new Promise(r=>setTimeout(r,2000));
  }
  setTimeout(()=>{
    loadTracking();loadDash();toast('업데이트 완료!','s');
    btn.disabled=false;
    btn.innerHTML='<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.08"/></svg> 지금 업데이트';
  },32000);
}

// ════════════════════════════════════════
//  자동 업데이트 핵심 로직
//  Cloudflare Pages = Cron Triggers 미지원
//  → 클라이언트 사이드 KST 기반 자동 트리거
//  1) localStorage로 당일 중복 실행 방지
//  2) tracking last_checked로 서버 완료 감지
//  3) KST 04:00 이후 자동 배치 업데이트 실행
// ════════════════════════════════════════
async function autoUpdateCheck(){
  try{
    const today=kstToday();
    const KEY='naver_au_'+today;

    // 1) 이미 오늘 실행했으면 패스
    if(localStorage.getItem(KEY)==='1'){
      setBadge('done',today);return;
    }

    // 2) 서버에서 이미 오늘 업데이트된 경우 감지
    if(tracking&&tracking.length){
      const dates=tracking.filter(t=>t.last_checked).map(t=>t.last_checked.slice(0,10));
      const maxDate=dates.length?[...dates].sort().reverse()[0]:null;
      if(maxDate===today){
        localStorage.setItem(KEY,'1');
        setBadge('done',today);return;
      }
    }

    // 3) KST 00:00 이후 언제든 자동 업데이트 실행 (04:00 제한 제거 - 매일 확실히 실행)
    const now=kstNow();
    const h=now.getHours();

    // 4) 자동 업데이트 실행
    localStorage.setItem(KEY,'1');
    setBadge('run',today);
    console.log('[AutoUpdate] KST '+today+' '+h+':'+String(now.getMinutes()).padStart(2,'0')+' — 자동 업데이트 트리거');

    const token='superplace-cron-2024';
    // 배치 순차 실행 (각 배치 사이 5초 대기)
    try{
      await fetch('/api/naver-place/update-all-tracking?offset=0&limit=20',{
        method:'POST',headers:{...H(true),'X-Cron-Token':token}
      });
    }catch(e){}
    await new Promise(r=>setTimeout(r,5000));
    try{
      await fetch('/api/naver-place/update-all-tracking?offset=20&limit=20',{
        method:'POST',headers:{...H(true),'X-Cron-Token':token}
      });
    }catch(e){}
    await new Promise(r=>setTimeout(r,5000));
    try{
      await fetch('/api/naver-place/update-all-tracking?offset=40&limit=20',{
        method:'POST',headers:{...H(true),'X-Cron-Token':token}
      });
    }catch(e){}
    setTimeout(()=>{loadTracking();loadDash();setBadge('done',today)},8000);
  }catch(e){console.warn('[AutoUpdate]',e)}
}

function setBadge(s,dt){
  const el=document.getElementById('upd-badge');
  if(!el) return;
  if(s==='done'){
    el.className='sbar-badge sb-ok';
    el.innerHTML='<svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> 오늘('+dt+') 업데이트 완료';
  }else if(s==='run'){
    el.className='sbar-badge sb-run';
    el.innerHTML='<span class="spin-sm"></span> 지금 업데이트 중...';
  }else{
    el.className='sbar-badge sb-wait';
    el.innerHTML='<svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> KST 04:00 이후 자동 실행';
  }
}

// ═══ DASHBOARD ═══
function shiftMon(d){
  monOffset+=d;
  const now=kstNow(),t=new Date(now.getFullYear(),now.getMonth()+monOffset,1);
  if(t>now){monOffset-=d;return}
  loadDash();
}
function getMonYM(){
  const now=kstNow(),t=new Date(now.getFullYear(),now.getMonth()+monOffset,1);
  return {y:t.getFullYear(),m:t.getMonth()+1};
}
async function loadDash(){
  const {y,m}=getMonYM();
  document.getElementById('mlbl').textContent=y+'년 '+m+'월';
  document.getElementById('dld').style.display='block';
  document.getElementById('dtw').style.display='none';
  document.getElementById('dem').style.display='none';
  try{
    const days=new Date(y,m,0).getDate();
    const fd=y+'-'+String(m).padStart(2,'0')+'-01';
    const td=y+'-'+String(m).padStart(2,'0')+'-'+String(days).padStart(2,'0');
    const r=await fetch('/api/naver-place/rank-history?days='+(days+5),{headers:H(false),credentials:'include'});
    const d=await r.json();
    document.getElementById('dld').style.display='none';
    if(!d.success||!d.history||!d.history.length){document.getElementById('dem').style.display='block';return}
    const filt=d.history.filter(r=>{const dt=(r.date||r.created_at||'').slice(0,10);return dt>=fd&&dt<=td});
    if(!filt.length){document.getElementById('dem').style.display='block';return}
    buildTable(filt);
  }catch(e){
    document.getElementById('dld').style.display='none';
    document.getElementById('dem').style.display='block';
  }
}
function buildTable(hist){
  const km={};
  for(const r of hist){
    const kw=r.keyword,dt=(r.date||r.created_at||'').slice(0,10);
    if(!km[kw]) km[kw]={};
    if(!km[kw][dt]||r.created_at>km[kw][dt].created_at) km[kw][dt]=r;
  }
  const kws=Object.keys(km);
  if(!kws.length){document.getElementById('dem').style.display='block';return}
  const dates=[...new Set(hist.map(r=>(r.date||r.created_at||'').slice(0,10)))].sort();
  const dn=['일','월','화','수','목','금','토'];
  document.getElementById('dth').innerHTML=
    '<th class="tk">키워드</th>'+
    dates.map(dt=>{
      const d=new Date(dt+'T12:00:00'),dw=dn[d.getDay()];
      const c=d.getDay()===0?'color:#ef4444':d.getDay()===6?'color:#3b82f6':'';
      return '<th style="'+c+'">'+dt.slice(5).replace('-','/')+'<br><span style="font-weight:500;font-size:10px;opacity:.7">'+dw+'</span></th>';
    }).join('')+
    '<th>최고</th><th>평균</th>';
  document.getElementById('dtb').innerHTML=kws.map(kw=>{
    const bd=km[kw];const ranks=[];
    const cells=dates.map(dt=>{
      const r=bd[dt];
      if(!r||!r.rank_number) return '<td><span class="rc rc-n">-</span></td>';
      ranks.push(r.rank_number);
      const c=r.rank_number<=3?'rc-1':r.rank_number<=10?'rc-3':r.rank_number<=30?'rc-10':'rc-x';
      return '<td><span class="rc '+c+'">'+r.rank_number+'</span></td>';
    }).join('');
    const best=ranks.length?Math.min(...ranks):null;
    const avg=ranks.length?(ranks.reduce((a,b)=>a+b,0)/ranks.length).toFixed(1):null;
    const bc=best&&best<=3?'#b45309':best&&best<=10?'#065f46':'#475569';
    return '<tr><td class="tk">'+esc(kw)+'</td>'+cells+
      '<td class="tbl-best" style="color:'+bc+'">'+(best?best+'위':'-')+'</td>'+
      '<td class="tbl-avg">'+(avg?avg+'위':'-')+'</td></tr>';
  }).join('');
  document.getElementById('dtw').style.display='block';
}

// ═══ UTILS ═══
function kstNow(){
  const now=new Date(),utc=now.getTime()+now.getTimezoneOffset()*60000;
  return new Date(utc+9*3600000);
}
function kstToday(){
  const k=kstNow();
  return k.getFullYear()+'-'+String(k.getMonth()+1).padStart(2,'0')+'-'+String(k.getDate()).padStart(2,'0');
}
function fdt(s){
  if(!s) return '-';
  let t=s.indexOf('T')>=0?s:s.replace(' ','T');
  if(t.slice(-1)!=='Z'&&t.indexOf('+')<0) t+='Z';
  const d=new Date(t);
  return isNaN(d)?'-':d.toLocaleString('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Seoul'});
}
function esc(s){
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function toast(msg,t='i'){
  let w=document.getElementById('toast-wrap');
  const el=document.createElement('div');
  const cfg={
    s:{cls:'toast-s',ico:'<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>'},
    e:{cls:'toast-e',ico:'<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'},
    w:{cls:'toast-w',ico:'<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>'},
    i:{cls:'toast-i',ico:'<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'}
  };
  const c=cfg[t]||cfg.i;
  el.className='toast '+c.cls;
  el.innerHTML='<span class="toast-ico">'+c.ico+'</span><span>'+msg+'</span>';
  w.appendChild(el);
  requestAnimationFrame(()=>{requestAnimationFrame(()=>el.classList.add('show'))});
  setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),300)},4500);
}

// ═══ INIT ═══
document.addEventListener('DOMContentLoaded',()=>{
  loadTracking();
  loadDash();
});
</script>

<!-- ══ 공유 설정 모달 ══ -->
<div id="share-modal" style="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;align-items:center;justify-content:center;padding:16px;display:none;" onclick="if(event.target===this)closeShareModal()">
  <div style="background:#fff;border-radius:20px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.22);">
    <!-- 헤더 -->
    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:18px 22px;display:flex;align-items:center;justify-content:space-between;border-radius:20px 20px 0 0;position:sticky;top:0;z-index:1;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;background:rgba(255,255,255,.2);border-radius:9px;display:flex;align-items:center;justify-content:center;">
          <svg width="15" height="15" fill="none" stroke="#fff" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        </div>
        <div>
          <div style="color:#fff;font-weight:800;font-size:15px;">공유 페이지 설정</div>
          <div style="color:rgba(255,255,255,.7);font-size:11px;margin-top:1px;">썸네일·제목·부제목 설정 후 링크를 공유하세요</div>
        </div>
      </div>
      <button onclick="closeShareModal()" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:18px;line-height:1;display:flex;align-items:center;justify-content:center;">×</button>
    </div>

    <!-- 바디 -->
    <div style="padding:22px;display:flex;flex-direction:column;gap:18px;">
      <input type="hidden" id="sm-id">

      <!-- ① 썸네일 -->
      <div>
        <label style="font-size:12px;font-weight:700;color:#374151;margin-bottom:8px;display:block;">📷 썸네일 이미지</label>
        <!-- 미리보기 -->
        <div id="sm-thumb-wrap" style="margin-bottom:10px;">
          <img id="sm-thumb-preview" src="" alt="썸네일 미리보기"
            style="display:none;width:100%;height:160px;object-fit:cover;border-radius:12px;border:1.5px solid #e5e7eb;background:#f9fafb;">
          <div id="sm-thumb-empty" style="width:100%;height:120px;border:2px dashed #d1d5db;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:#f9fafb;color:#9ca3af;font-size:12px;">
            <svg width="28" height="28" fill="none" stroke="#d1d5db" stroke-width="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            썸네일 없음
          </div>
        </div>
        <!-- 파일 선택 버튼 -->
        <div style="display:flex;gap:8px;margin-bottom:8px;">
          <label id="sm-file-label" for="sm-thumb-file"
            style="flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:10px;background:#eef2ff;border:1.5px solid #c7d2fe;border-radius:10px;font-size:13px;font-weight:600;color:#4f46e5;cursor:pointer;transition:all .15s;">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            파일 선택
          </label>
          <input id="sm-thumb-file" type="file" accept="image/*" style="display:none;" onchange="handleThumbFileChange(this)">
          <button onclick="document.getElementById('sm-thumb').value='';updateThumbPreview();" title="이미지 제거"
            style="padding:10px 14px;background:#fff5f5;border:1.5px solid #fecaca;border-radius:10px;cursor:pointer;color:#ef4444;font-size:12px;font-weight:600;transition:all .15s;">
            제거
          </button>
        </div>
        <!-- URL 직접 입력 -->
        <div style="position:relative;">
          <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#9ca3af;font-size:11px;font-weight:600;pointer-events:none;">URL</span>
          <input id="sm-thumb" type="url" placeholder="https://example.com/image.jpg"
            oninput="updateThumbPreview()"
            style="width:100%;padding:10px 14px 10px 40px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:12px;outline:none;transition:border .15s;box-sizing:border-box;color:#374151;"
            onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='#e5e7eb'">
        </div>
      </div>

      <!-- ② 제목 -->
      <div>
        <label style="font-size:12px;font-weight:700;color:#374151;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;">
          <span>📝 공유 제목</span>
          <span style="color:#9ca3af;font-weight:400;">비우면 업체명 자동 표시</span>
        </label>
        <input id="sm-title" type="text" maxlength="80" placeholder="예: 강남역 스터디카페 네이버 플레이스 순위"
          style="width:100%;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:13px;outline:none;transition:border .15s;box-sizing:border-box;"
          onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='#e5e7eb'">
      </div>

      <!-- ③ 부제목 -->
      <div>
        <label style="font-size:12px;font-weight:700;color:#374151;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;">
          <span>💬 공유 부제목</span>
          <span style="color:#9ca3af;font-weight:400;">SNS 미리보기 설명</span>
        </label>
        <input id="sm-subtitle" type="text" maxlength="160" placeholder="예: 매일 자동 업데이트 · BYGENCY 제공"
          style="width:100%;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:13px;outline:none;transition:border .15s;box-sizing:border-box;"
          onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='#e5e7eb'">
      </div>

      <!-- ④ 공유 링크 -->
      <div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;padding:14px;">
        <label style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:8px;display:block;text-transform:uppercase;letter-spacing:.04em;">🔗 공유 링크</label>
        <div style="display:flex;gap:8px;">
          <input id="sm-url" type="text" readonly
            style="flex:1;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:12px;background:#fff;color:#374151;outline:none;min-width:0;box-sizing:border-box;">
          <button id="sm-copy-btn" onclick="copyShareLink()"
            style="padding:9px 14px;background:#fff;border:1.5px solid #e2e8f0;border-radius:9px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;transition:all .15s;color:#374151;">
            복사
          </button>
          <button onclick="openShareUrl()" title="새 탭에서 미리보기"
            style="padding:9px 12px;background:#eef2ff;border:1.5px solid #c7d2fe;border-radius:9px;cursor:pointer;transition:all .15s;display:flex;align-items:center;">
            <svg width="13" height="13" fill="none" stroke="#4f46e5" stroke-width="2.5" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 푸터 -->
    <div style="padding:14px 22px 20px;display:flex;gap:10px;border-top:1px solid #f1f5f9;">
      <button onclick="closeShareModal()" style="flex:1;padding:12px;background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;color:#374151;transition:all .15s;">취소</button>
      <button id="sm-save-btn" onclick="saveShareSettings()" style="flex:2;padding:12px;background:linear-gradient(135deg,#4f46e5,#7c3aed);border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:opacity .15s;">저장하고 닫기</button>
    </div>
  </div>
</div>


</body>
</html>
`
