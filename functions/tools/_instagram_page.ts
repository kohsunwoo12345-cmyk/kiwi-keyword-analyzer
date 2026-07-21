// Instagram Pages - 인스타그램 분석 & DM 자동화 통합 SPA

export const instagramUnifiedPage = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
  <meta http-equiv="Pragma" content="no-cache">
  <meta http-equiv="Expires" content="0">
  <title>인스타그램 마케팅 - BYGENCY</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" media="print" onload="this.media=&#39;all&#39;"/>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>
  <style>
    :root {
      --ig1:#833ab4; --ig2:#e1306c; --ig3:#fd1d1d; --ig4:#fcb045;
      --grad: linear-gradient(135deg,#833ab4,#e1306c,#fd1d1d);
      --grad4: linear-gradient(135deg,#833ab4,#e1306c,#fd1d1d,#fcb045);
      --bg:#f4f6fb; --surface:#fff; --border:#e8edf4;
      --text1:#0f172a; --text2:#475569; --text3:#94a3b8;
      --green:#22c55e; --amber:#f59e0b; --red:#ef4444; --blue:#8b5cf6;
      --radius-sm:8px; --radius:14px; --radius-lg:20px;
      --shadow-sm:0 1px 3px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04);
      --shadow:0 4px 16px rgba(0,0,0,.08);
      --shadow-lg:0 12px 40px rgba(0,0,0,.14);
      --sb-width:260px;
      --topbar-h:64px;
    }
    *{box-sizing:border-box;margin:0;padding:0;}
    html{scroll-behavior:smooth;}
    body{font-family:'Pretendard',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--bg);color:var(--text1);min-height:100vh;-webkit-font-smoothing:antialiased;}

    /* ── LAYOUT ── */
    .wrap{display:flex;min-height:100vh;}
    .sidebar{
      width:var(--sb-width);height:100vh;background:var(--surface);
      border-right:1px solid var(--border);position:fixed;top:0;left:0;z-index:50;
      display:flex;flex-direction:column;overflow:hidden;
      transition:transform .28s cubic-bezier(.4,0,.2,1);
    }
    .main-area{margin-left:var(--sb-width);flex:1;display:flex;flex-direction:column;min-width:0;}

    /* ── SIDEBAR HEADER ── */
    .sb-header{
      padding:20px 18px 14px;
      background:var(--grad);
      flex-shrink:0;
    }
    .sb-logo{display:flex;align-items:center;gap:10px;}
    .sb-logo-icon{
      width:40px;height:40px;border-radius:12px;
      background:rgba(255,255,255,.18);
      border:1.5px solid rgba(255,255,255,.3);
      display:flex;align-items:center;justify-content:center;
      flex-shrink:0;
    }
    .sb-logo-text{font-size:16px;font-weight:900;color:#fff;line-height:1.2;letter-spacing:-.3px;}
    .sb-logo-sub{font-size:11px;color:rgba(255,255,255,.7);font-weight:500;margin-top:1px;}

    /* ── SIDEBAR NAV ── */
    .sb-nav{padding:10px 0;flex:1;overflow-y:auto;}
    .sb-nav::-webkit-scrollbar{width:4px;}
    .sb-nav::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:4px;}
    .sb-section{padding:18px 16px 4px;font-size:10px;font-weight:700;color:var(--text3);letter-spacing:1px;text-transform:uppercase;}
    .sb-item{
      display:flex;align-items:center;gap:10px;
      padding:9px 12px;margin:1px 8px;
      border-radius:var(--radius-sm);cursor:pointer;
      transition:all .15s;font-size:13.5px;font-weight:500;
      color:var(--text2);text-decoration:none;
      position:relative;
    }
    .sb-item:hover{background:#fdf2f8;color:var(--ig2);}
    .sb-item.active{
      background:linear-gradient(135deg,rgba(131,58,180,.1),rgba(225,48,108,.08));
      color:var(--ig2);font-weight:700;
    }
    .sb-item.active::before{
      content:'';position:absolute;left:-8px;top:50%;transform:translateY(-50%);
      width:3px;height:20px;background:var(--grad);border-radius:0 3px 3px 0;
    }
    .sb-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:#f1f5f9;transition:all .15s;}
    .sb-item:hover .sb-icon{background:#fce7f3;}
    .sb-item.active .sb-icon{background:linear-gradient(135deg,rgba(131,58,180,.15),rgba(225,48,108,.12));}
    .sb-icon svg{width:16px;height:16px;opacity:.7;transition:opacity .15s;}
    .sb-item:hover .sb-icon svg,.sb-item.active .sb-icon svg{opacity:1;}
    .sb-badge{
      margin-left:auto;background:var(--ig2);color:#fff;
      font-size:10px;font-weight:700;padding:2px 7px;
      border-radius:20px;min-width:18px;text-align:center;
    }
    .sb-badge-green{margin-left:auto;background:var(--green);color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;}
    .sb-footer{
      padding:14px 16px;border-top:1px solid var(--border);
      display:flex;align-items:center;gap:10px;
    }
    .sb-back-btn{
      display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text3);
      text-decoration:none;cursor:pointer;padding:8px 10px;border-radius:var(--radius-sm);
      transition:all .15s;width:100%;
    }
    .sb-back-btn:hover{background:#fdf2f8;color:var(--ig2);}

    /* ── TOPBAR ── */
    .topbar{
      height:var(--topbar-h);background:var(--surface);
      border-bottom:1px solid var(--border);
      padding:0 28px;display:flex;align-items:center;gap:14px;
      position:sticky;top:0;z-index:40;
      box-shadow:var(--shadow-sm);
    }
    .hamburger{display:none;background:none;border:none;cursor:pointer;padding:6px;color:var(--text2);border-radius:8px;}
    .hamburger:hover{background:#f1f5f9;}
    .topbar-icon{width:36px;height:36px;border-radius:10px;background:var(--grad);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
    .topbar-icon svg{width:18px;height:18px;}
    .topbar-title{font-size:17px;font-weight:800;color:var(--text1);letter-spacing:-.3px;}
    .topbar-sub{font-size:12px;color:var(--text3);margin-top:1px;}
    .topbar-right{margin-left:auto;display:flex;gap:10px;align-items:center;}
    .account-pill{
      display:none;align-items:center;gap:8px;
      background:linear-gradient(135deg,rgba(131,58,180,.08),rgba(225,48,108,.06));
      border:1px solid rgba(225,48,108,.2);
      padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600;color:var(--ig2);
    }

    /* ── CONTENT ── */
    .content{padding:28px;flex:1;max-width:1400px;}

    /* ── CARDS ── */
    .card{
      background:var(--surface);border-radius:var(--radius);
      padding:24px;box-shadow:var(--shadow-sm);
      border:1px solid var(--border);margin-bottom:20px;
    }
    .card:last-child{margin-bottom:0;}
    .card-sm{background:var(--surface);border-radius:var(--radius-sm);padding:16px;box-shadow:var(--shadow-sm);border:1px solid var(--border);}

    /* ── SECTION HEADER ── */
    .sh{display:flex;align-items:center;gap:10px;margin-bottom:20px;}
    .sh h2{font-size:16px;font-weight:800;color:var(--text1);letter-spacing:-.3px;}
    .sh-badge{
      font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;
      background:linear-gradient(135deg,rgba(131,58,180,.1),rgba(225,48,108,.08));
      color:var(--ig2);border:1px solid rgba(225,48,108,.15);
    }

    /* ── BUTTONS ── */
    .btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:none;border-radius:var(--radius-sm);font-weight:700;cursor:pointer;transition:all .18s;font-family:inherit;}
    .btn-primary{background:var(--grad);color:#fff;padding:10px 20px;font-size:14px;box-shadow:0 4px 14px rgba(225,48,108,.3);}
    .btn-primary:hover{opacity:.88;transform:translateY(-1px);box-shadow:0 6px 20px rgba(225,48,108,.4);}
    .btn-outline{background:var(--surface);color:var(--ig2);border:1.5px solid var(--ig2);padding:9px 18px;font-size:14px;}
    .btn-outline:hover{background:#fdf2f8;}
    .btn-sm{padding:6px 14px;font-size:13px;}
    .btn-xs{padding:5px 10px;font-size:12px;}
    .btn-ghost{background:none;border:1.5px solid var(--border);color:var(--text2);padding:7px 14px;font-size:13px;}
    .btn-ghost:hover{background:#f8fafc;border-color:#cbd5e1;}
    .btn-danger{background:#fef2f2;border:1px solid #fecaca;color:var(--red);padding:9px 18px;font-size:13px;font-weight:600;}
    .btn-danger:hover{background:#fee2e2;}

    /* ── STAT CARDS ── */
    .stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;}
    .stat-card{
      background:var(--surface);border-radius:var(--radius);padding:20px;
      border:1px solid var(--border);box-shadow:var(--shadow-sm);
      transition:all .2s;position:relative;overflow:hidden;
    }
    .stat-card::before{
      content:'';position:absolute;top:0;left:0;right:0;height:3px;
      background:var(--grad);border-radius:var(--radius) var(--radius) 0 0;
      opacity:0;transition:opacity .2s;
    }
    .stat-card:hover{transform:translateY(-2px);box-shadow:var(--shadow);}
    .stat-card:hover::before{opacity:1;}
    .stat-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:14px;}
    .stat-val{font-size:26px;font-weight:900;color:var(--text1);letter-spacing:-.5px;line-height:1;}
    .stat-label{font-size:12px;color:var(--text3);font-weight:500;margin-top:4px;}
    .stat-change{font-size:12px;font-weight:700;margin-top:6px;display:flex;align-items:center;gap:4px;}
    .up{color:var(--green);}
    .down{color:var(--red);}
    .neutral{color:var(--text3);}

    /* ── INPUTS ── */
    .input-field{
      width:100%;padding:11px 14px;border:1.5px solid var(--border);
      border-radius:var(--radius-sm);font-size:14px;outline:none;
      transition:all .2s;background:#f8fafc;font-family:inherit;color:var(--text1);
    }
    .input-field:focus{border-color:var(--ig1);background:#fff;box-shadow:0 0 0 3px rgba(131,58,180,.08);}
    .select-field{
      width:100%;padding:11px 14px;border:1.5px solid var(--border);
      border-radius:var(--radius-sm);font-size:14px;outline:none;
      background:#f8fafc;cursor:pointer;font-family:inherit;color:var(--text1);
    }
    .select-field:focus{border-color:var(--ig1);box-shadow:0 0 0 3px rgba(131,58,180,.08);}

    /* ── TAGS / BADGES ── */
    .tag{display:inline-flex;align-items:center;gap:5px;background:#fdf2f8;color:var(--ig2);border:1px solid rgba(225,48,108,.2);border-radius:20px;padding:4px 11px;font-size:12px;font-weight:600;}
    .tag-remove{cursor:pointer;color:var(--ig2);font-size:15px;line-height:1;opacity:.7;}
    .tag-remove:hover{opacity:1;}
    .status-badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;}
    .status-on{background:#dcfce7;color:#16a34a;}
    .status-off{background:#fee2e2;color:var(--red);}
    .status-pending{background:#fef9c3;color:#ca8a04;}

    /* ── TAB BUTTONS ── */
    .tab-bar{display:flex;gap:4px;background:#f1f5f9;padding:4px;border-radius:10px;}
    .tab-btn{padding:7px 16px;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;border:none;background:transparent;color:var(--text2);transition:all .18s;font-family:inherit;}
    .tab-btn.active{background:var(--surface);color:var(--ig2);box-shadow:var(--shadow-sm);}

    /* ── CHART ── */
    .chart-wrap{position:relative;height:260px;}

    /* ── PANELS ── */
    .panel{display:none;animation:panelIn .2s ease-out;}
    .panel.active{display:block;}
    @keyframes panelIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}

    /* ── TABLE ── */
    .data-table{width:100%;border-collapse:collapse;font-size:13px;}
    .data-table thead tr{background:#f8fafc;border-bottom:2px solid var(--border);}
    .data-table th{text-align:left;padding:12px 16px;font-weight:700;color:var(--text2);white-space:nowrap;}
    .data-table th.center{text-align:center;}
    .data-table td{padding:11px 16px;border-bottom:1px solid #f1f5f9;vertical-align:middle;}
    .data-table td.center{text-align:center;}
    .data-table tbody tr{transition:background .12s;cursor:pointer;}
    .data-table tbody tr:hover{background:#fdf9ff;}
    .data-table tbody tr:last-child td{border-bottom:none;}

    /* ── POST GRID ── */
    .post-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;}
    .post-card{
      background:var(--surface);border:1px solid var(--border);
      border-radius:var(--radius-sm);overflow:hidden;transition:all .2s;cursor:pointer;
    }
    .post-card:hover{border-color:var(--ig2);box-shadow:0 4px 16px rgba(225,48,108,.12);transform:translateY(-2px);}
    .post-thumb{width:100%;aspect-ratio:1;object-fit:cover;display:block;}
    .post-placeholder{width:100%;aspect-ratio:1;background:linear-gradient(135deg,#fdf2f8,#f3e8ff);display:flex;align-items:center;justify-content:center;}
    .post-meta{padding:8px 10px;}

    /* ── DM RULE CARD ── */
    .rule-card{
      background:var(--surface);border:1.5px solid var(--border);
      border-radius:var(--radius);padding:20px;transition:all .2s;
    }
    .rule-card:hover{border-color:rgba(225,48,108,.3);box-shadow:var(--shadow);}
    .rule-card.active-rule{border-color:rgba(225,48,108,.4);background:linear-gradient(135deg,rgba(253,242,248,.5),rgba(243,232,255,.3));}

    /* ── APIFY DM ── */
    .apify-session-card{background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1.5px solid rgba(34,197,94,.25);border-radius:var(--radius);padding:20px;margin-bottom:16px;}
    .apify-send-card{background:var(--surface);border:1.5px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:16px;}
    .apify-status-ok{display:inline-flex;align-items:center;gap:6px;background:#dcfce7;color:#16a34a;font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;}
    .apify-status-warn{display:inline-flex;align-items:center;gap:6px;background:#fef3c7;color:#d97706;font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;}
    .apify-textarea{width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px;font-family:inherit;resize:vertical;min-height:80px;outline:none;transition:border-color .15s;}
    .apify-textarea:focus{border-color:var(--ig2);}
    .apify-input{width:100%;padding:9px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px;font-family:inherit;outline:none;transition:border-color .15s;}
    .apify-input:focus{border-color:var(--ig2);}
    .apify-send-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 22px;background:var(--grad);color:#fff;border:none;border-radius:var(--radius-sm);font-size:14px;font-weight:700;cursor:pointer;transition:opacity .15s;}
    .apify-send-btn:hover{opacity:.88;}
    .apify-send-btn:disabled{opacity:.5;cursor:not-allowed;}

    /* ── INSIGHT METRIC ROW ── */
    .metric-row{display:flex;align-items:center;justify-content:space-between;padding:11px 0;border-bottom:1px solid #f8fafc;}
    .metric-row:last-child{border-bottom:none;}

    /* ── TOGGLE ── */
    .toggle-track{width:44px;height:24px;border-radius:12px;display:inline-block;position:relative;transition:background .2s;cursor:pointer;}
    .toggle-thumb{position:absolute;top:2px;width:20px;height:20px;background:#fff;border-radius:50%;transition:left .2s;box-shadow:0 1px 4px rgba(0,0,0,.2);}

    /* ── ANIMATIONS ── */
    @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.45;}}
    @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes slideUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:none;}}

    /* ── EMPTY STATE ── */
    .empty-state{text-align:center;padding:56px 20px;}
    .empty-icon{width:64px;height:64px;margin:0 auto 16px;background:linear-gradient(135deg,rgba(131,58,180,.1),rgba(225,48,108,.08));border-radius:18px;display:flex;align-items:center;justify-content:center;}
    .empty-title{font-size:17px;font-weight:800;color:var(--text1);margin-bottom:6px;}
    .empty-desc{font-size:14px;color:var(--text3);margin-bottom:22px;line-height:1.6;}

    /* ── GRADIENT BANNER ── */
    .ig-banner{background:var(--grad);border-radius:var(--radius-lg);padding:28px 32px;color:#fff;position:relative;overflow:hidden;}
    .ig-banner::after{content:'';position:absolute;right:-40px;top:-40px;width:200px;height:200px;background:rgba(255,255,255,.06);border-radius:50%;}

    /* ── HEATMAP ── */
    .heatmap-cell{height:26px;border-radius:4px;margin-bottom:3px;display:flex;align-items:center;justify-content:center;font-size:10px;transition:transform .15s;}
    .heatmap-cell:hover{transform:scale(1.06);}

    /* ── WEBHOOK LOG ── */
    .wh-log{display:flex;align-items:center;gap:12px;padding:11px 14px;background:#f8fafc;border-radius:var(--radius-sm);border:1px solid var(--border);margin-bottom:6px;}

    /* ── SCROLLBAR THIN ── */
    .thin-scroll::-webkit-scrollbar{height:4px;width:4px;}
    .thin-scroll::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:4px;}

    /* ── PUBLISH MODAL ── */
    @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}

    /* ── RESPONSIVE ── */
    @media(max-width:960px){
      .sidebar{transform:translateX(-100%);}
      .sidebar.open{transform:translateX(0);box-shadow:var(--shadow-lg);}
      .main-area{margin-left:0;}
      .hamburger{display:flex;align-items:center;justify-content:center;}
      .stat-grid{grid-template-columns:repeat(2,1fr);}
      .content{padding:16px;}
    }
    @media(max-width:600px){
      .stat-grid{grid-template-columns:1fr 1fr;}
      .post-grid{grid-template-columns:repeat(3,1fr);}
    }
    /* embed mode: hide internal sidebar when rendered inside dashboard iframe */
    .embed .sidebar{display:none!important;}
    .embed .main-area{margin-left:0!important;}
  </style>
</head>
<body>
<script>if(location.search.indexOf('embed=1')>-1)document.documentElement.classList.add('embed');<\/script>
<div class="wrap">

<!-- ===== SIDEBAR ===== -->
<aside class="sidebar" id="sidebar">
  <div class="sb-header">
    <div class="sb-logo">
      <div class="sb-logo-icon">
        <!-- Instagram SVG icon -->
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="2" width="20" height="20" rx="5.5" stroke="white" stroke-width="1.8"/>
          <circle cx="12" cy="12" r="4.5" stroke="white" stroke-width="1.8"/>
          <circle cx="17.5" cy="6.5" r="1.3" fill="white"/>
        </svg>
      </div>
      <div>
        <div class="sb-logo-text">Instagram</div>
        <div class="sb-logo-sub">마케팅 센터</div>
      </div>
    </div>
  </div>

  <nav class="sb-nav">
    <div class="sb-section">개요</div>
    <a class="sb-item active" id="nav-home" href="javascript:void(0)" onclick="showPanel('home')">
      <span class="sb-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
          <path d="M9 21V12h6v9"/>
        </svg>
      </span>
      대시보드
    </a>

    <div class="sb-section">콘텐츠</div>
    <a class="sb-item" id="nav-content" href="javascript:void(0)" onclick="showPanel('content')">
      <span class="sb-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      </span>
      콘텐츠 분석
    </a>
    <a class="sb-item" id="nav-schedule" href="javascript:void(0)" onclick="showPanel('schedule')">
      <span class="sb-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <path d="M16 2v4M8 2v4M3 10h18"/>
          <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
        </svg>
      </span>
      게시물 관리
    </a>

    <div class="sb-section">인사이트</div>
    <a class="sb-item" id="nav-insights" href="javascript:void(0)" onclick="showPanel('insights')">
      <span class="sb-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
          <polyline points="16 7 22 7 22 13"/>
        </svg>
      </span>
      인사이트 분석
    </a>
    <a class="sb-item" id="nav-audience" href="javascript:void(0)" onclick="showPanel('audience')">
      <span class="sb-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
          <path d="M16 3.13a4 4 0 010 7.75"/><path d="M21 21v-2a4 4 0 00-3-3.87"/>
        </svg>
      </span>
      팔로워 분석
    </a>

    <div class="sb-section">자동화</div>
    <a class="sb-item" id="nav-dm" href="javascript:void(0)" onclick="showPanel('dm')">
      <span class="sb-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
      </span>
      DM 자동화
      <span class="sb-badge" id="sb-active-rules">0</span>
    </a>
    <a class="sb-item" id="nav-dm-logs" href="javascript:void(0)" onclick="showPanel('dm-logs')">
      <span class="sb-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      </span>
      DM 발송 내역
    </a>
    <a class="sb-item" id="nav-webhook" href="javascript:void(0)" onclick="showPanel('webhook')">
      <span class="sb-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
        </svg>
      </span>
      웹훅 설정
      <span class="sb-badge-green" id="sb-webhook-status">ON</span>
    </a>

    <div class="sb-section">설정</div>
    <a class="sb-item" id="nav-account" href="javascript:void(0)" onclick="showPanel('account')">
      <span class="sb-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </span>
      계정 연결
    </a>
  </nav>

  <div class="sb-footer">
    <a class="sb-back-btn" href="javascript:void(0)" onclick="(function(){try{var u=JSON.parse(localStorage.getItem('user')||'{}');window.location.href=u.role==='admin'?'/admin/marketing':'/dashboard'}catch(e){window.location.href='/dashboard'}})()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
      대시보드로 돌아가기
    </a>
  </div>
</aside>

<!-- ===== MAIN ===== -->
<div class="main-area">

  <!-- Topbar -->
  <div class="topbar">
    <button class="hamburger" onclick="toggleSidebar()">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    </button>
    <div id="topbar-icon-wrap" class="topbar-icon">
      <svg id="topbar-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="white" stroke-width="2" stroke-linejoin="round"/>
        <path d="M9 21V12h6v9" stroke="white" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
    <div>
      <div class="topbar-title" id="topbar-title">대시보드</div>
      <div class="topbar-sub" id="topbar-sub">인스타그램 마케팅 현황</div>
    </div>
    <div class="topbar-right">
      <div id="ig-account-badge" class="account-pill">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="2" width="20" height="20" rx="5.5" stroke="#e1306c" stroke-width="2"/>
          <circle cx="12" cy="12" r="4.5" stroke="#e1306c" stroke-width="2"/>
          <circle cx="17.5" cy="6.5" r="1.3" fill="#e1306c"/>
        </svg>
        <span id="ig-account-name">@계정명</span>
      </div>
      <button onclick="showPanel('account')" class="btn btn-outline btn-sm">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
        계정 연결
      </button>
    </div>
  </div>

  <div class="content" id="main-content">

    <!-- ========== DASHBOARD PANEL ========== -->
    <div class="panel active" id="panel-home">

      <!-- Connect Banner -->
      <div id="connect-banner" class="ig-banner" style="margin-bottom:24px;">
        <div style="display:flex;align-items:center;gap:20px;position:relative;z-index:1;">
          <div style="width:60px;height:60px;background:rgba(255,255,255,.15);border:2px solid rgba(255,255,255,.3);border-radius:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="2" width="20" height="20" rx="5.5" stroke="white" stroke-width="2"/>
              <circle cx="12" cy="12" r="4.5" stroke="white" stroke-width="2"/>
              <circle cx="17.5" cy="6.5" r="1.3" fill="white"/>
            </svg>
          </div>
          <div style="flex:1;">
            <div style="font-size:18px;font-weight:800;margin-bottom:5px;">인스타그램 계정을 연결하세요</div>
            <div style="font-size:13px;opacity:.85;line-height:1.6;">Meta Business API를 통해 계정을 연결하면 콘텐츠 분석, 인사이트, DM 자동화를 모두 사용할 수 있습니다.</div>
          </div>
          <button onclick="showPanel('account')" style="background:rgba(255,255,255,.18);color:#fff;border:1.5px solid rgba(255,255,255,.4);border-radius:12px;padding:12px 24px;font-size:14px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:inherit;flex-shrink:0;transition:background .15s;" onmouseover="this.style.background='rgba(255,255,255,.28)'" onmouseout="this.style.background='rgba(255,255,255,.18)'">
            계정 연결하기
          </button>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background:linear-gradient(135deg,rgba(131,58,180,.12),rgba(131,58,180,.06));">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#833ab4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
              <path d="M16 3.13a4 4 0 010 7.75"/><path d="M21 21v-2a4 4 0 00-3-3.87"/>
            </svg>
          </div>
          <div class="stat-val" id="stat-followers">—</div>
          <div class="stat-label">팔로워</div>
          <div class="stat-change neutral" id="stat-followers-change">—</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:linear-gradient(135deg,rgba(225,48,108,.12),rgba(225,48,108,.06));">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e1306c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
          </div>
          <div class="stat-val" id="stat-likes">—</div>
          <div class="stat-label">평균 좋아요</div>
          <div class="stat-change neutral" id="stat-likes-change">—</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:linear-gradient(135deg,rgba(139,92,246,.12),rgba(139,92,246,.06));">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          </div>
          <div class="stat-val" id="stat-comments">—</div>
          <div class="stat-label">평균 댓글</div>
          <div class="stat-change neutral" id="stat-comments-change">—</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:linear-gradient(135deg,rgba(34,197,94,.12),rgba(34,197,94,.06));">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
            </svg>
          </div>
          <div class="stat-val" id="stat-er">—</div>
          <div class="stat-label">인게이지먼트율</div>
          <div class="stat-change neutral" id="stat-er-change">—</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-bottom:20px;">
        <!-- Chart -->
        <div class="card" style="margin-bottom:0;">
          <div class="sh">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e1306c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            <h2>최근 성과 추이</h2>
            <span class="sh-badge">7일</span>
          </div>
          <div class="chart-wrap">
            <canvas id="dashboardChart"></canvas>
          </div>
        </div>

        <!-- DM Automation Card -->
        <div class="card" style="margin-bottom:0;">
          <div class="sh">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#833ab4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.42 1.42M4.93 4.93l1.42 1.42M19.07 19.07l-1.42-1.42M4.93 19.07l1.42-1.42M12 2v2M12 20v2M2 12h2M20 12h2"/>
            </svg>
            <h2>DM 자동화</h2>
          </div>
          <div style="text-align:center;padding:8px 0 12px;">
            <div style="font-size:42px;font-weight:900;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1;" id="dm-sent-today">0</div>
            <div style="font-size:12px;color:var(--text3);margin-top:4px;">오늘 발송된 DM</div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border);border-radius:10px;overflow:hidden;margin-bottom:14px;">
            <div style="background:var(--surface);padding:12px;text-align:center;">
              <div style="font-size:18px;font-weight:800;color:#833ab4;" id="dm-active-count">0</div>
              <div style="font-size:11px;color:var(--text3);margin-top:2px;">활성 규칙</div>
            </div>
            <div style="background:var(--surface);padding:12px;text-align:center;">
              <div style="font-size:18px;font-weight:800;color:var(--green);" id="dm-total-sent">0</div>
              <div style="font-size:11px;color:var(--text3);margin-top:2px;">총 발송</div>
            </div>
            <div style="background:var(--surface);padding:12px;text-align:center;">
              <div style="font-size:18px;font-weight:800;color:var(--amber);" id="dm-pending-count">0</div>
              <div style="font-size:11px;color:var(--text3);margin-top:2px;">대기중</div>
            </div>
          </div>
          <button onclick="showPanel('dm')" class="btn btn-primary" style="width:100%;">
            DM 규칙 관리
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>

      <!-- Recent Posts -->
      <div class="card">
        <div class="sh">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e1306c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <h2>최근 게시물</h2>
          <span class="sh-badge">최신 6개</span>
          <button onclick="showPanel('content')" class="btn btn-ghost btn-sm" style="margin-left:auto;">전체 보기</button>
        </div>
        <div id="recent-posts-grid" class="post-grid">
          <div style="grid-column:1/-1;">
            <div class="empty-state">
              <div class="empty-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e1306c" stroke-width="1.8" stroke-linecap="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
              <div class="empty-title">게시물 없음</div>
              <div class="empty-desc">계정을 연결하면 게시물이 표시됩니다</div>
            </div>
          </div>
        </div>
      </div>
    </div><!-- /panel-home -->


    <!-- ========== CONTENT ANALYSIS PANEL ========== -->
    <div class="panel" id="panel-content">
      <div class="sh">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e1306c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
        <h2>콘텐츠 분석</h2>
        <span class="sh-badge">게시물 성과</span>
      </div>

      <!-- Filter Bar -->
      <div class="card" style="padding:16px 20px;">
        <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;">
          <div class="tab-bar">
            <button class="tab-btn active" onclick="setContentFilter('all',this)">전체</button>
            <button class="tab-btn" onclick="setContentFilter('image',this)">이미지</button>
            <button class="tab-btn" onclick="setContentFilter('video',this)">동영상</button>
            <button class="tab-btn" onclick="setContentFilter('reel',this)">릴스</button>
            <button class="tab-btn" onclick="setContentFilter('carousel',this)">카루셀</button>
          </div>
          <select class="select-field" id="content-period" onchange="loadContentAnalysis()" style="width:auto;min-width:140px;">
            <option value="7">최근 7일</option>
            <option value="30" selected>최근 30일</option>
            <option value="90">최근 3개월</option>
          </select>
          <button class="btn btn-primary btn-sm" onclick="loadContentAnalysis()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
            </svg>
            분석 새로고침
          </button>
        </div>
      </div>

      <!-- Charts Row -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
        <div class="card" style="margin-bottom:0;">
          <div class="sh" style="margin-bottom:14px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#833ab4" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <h2 style="font-size:14px;">콘텐츠 타입별 인게이지먼트</h2>
          </div>
          <div class="chart-wrap" style="height:200px;"><canvas id="contentTypeChart"></canvas></div>
        </div>
        <div class="card" style="margin-bottom:0;">
          <div class="sh" style="margin-bottom:14px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e1306c" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            <h2 style="font-size:14px;">요일별 게시 성과</h2>
          </div>
          <div class="chart-wrap" style="height:200px;"><canvas id="dayOfWeekChart"></canvas></div>
        </div>
      </div>

      <!-- Posts Table -->
      <div class="card">
        <div class="sh">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e1306c" stroke-width="2" stroke-linecap="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <h2>게시물 목록</h2>
          <span id="content-total-badge" class="sh-badge">로딩중...</span>
        </div>
        <div style="overflow-x:auto;" class="thin-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>게시물</th>
                <th class="center">타입</th>
                <th class="center">좋아요</th>
                <th class="center">댓글</th>
                <th class="center">도달수</th>
                <th class="center">인게이지먼트율</th>
                <th class="center">게시일</th>
              </tr>
            </thead>
            <tbody id="content-table-body">
              <tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text3);">계정을 연결하면 게시물 데이터가 표시됩니다</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div><!-- /panel-content -->


    <!-- ========== SCHEDULE PANEL ========== -->
    <div class="panel" id="panel-schedule">
      <div class="sh">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e1306c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
        </svg>
        <h2>게시물 관리</h2>
        <span class="sh-badge">캘린더</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 340px;gap:20px;">
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <button onclick="changeCalMonth(-1)" style="background:#f1f5f9;border:none;border-radius:8px;width:34px;height:34px;cursor:pointer;display:flex;align-items:center;justify-content:center;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span id="cal-title" style="font-size:15px;font-weight:800;color:var(--text1);min-width:100px;text-align:center;"></span>
              <button onclick="changeCalMonth(1)" style="background:#f1f5f9;border:none;border-radius:8px;width:34px;height:34px;cursor:pointer;display:flex;align-items:center;justify-content:center;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
            <button class="btn btn-primary btn-sm" onclick="openPostModal()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              게시물 예약
            </button>
          </div>
          <div id="calendar-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;"></div>
        </div>
        <div class="card">
          <div class="sh" style="margin-bottom:14px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e1306c" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            <h2 style="font-size:14px;">이번 달 예약 게시물</h2>
          </div>
          <div id="scheduled-list">
            <div class="empty-state" style="padding:32px 0;">
              <div class="empty-icon" style="width:48px;height:48px;margin:0 auto 12px;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e1306c" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              </div>
              <div style="font-size:13px;color:var(--text3);">예약된 게시물이 없습니다</div>
            </div>
          </div>
        </div>
      </div>
    </div><!-- /panel-schedule -->


    <!-- ========== INSIGHTS PANEL ========== -->
    <div class="panel" id="panel-insights">
      <div class="sh">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e1306c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
        </svg>
        <h2>인사이트 분석</h2>
        <span class="sh-badge">계정 성장</span>
        <div class="tab-bar" style="margin-left:auto;">
          <button class="tab-btn active" onclick="setInsightPeriod('7',this)">7일</button>
          <button class="tab-btn" onclick="setInsightPeriod('28',this)">28일</button>
          <button class="tab-btn" onclick="setInsightPeriod('90',this)">3개월</button>
        </div>
      </div>

      <!-- KPI Row -->
      <div class="stat-grid" style="margin-bottom:20px;">
        <div class="stat-card">
          <div class="stat-icon" style="background:linear-gradient(135deg,rgba(139,92,246,.12),rgba(139,92,246,.06));">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          <div class="stat-val" id="ins-reach">—</div>
          <div class="stat-label">도달</div>
          <div class="stat-change up" id="ins-reach-change">—</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:linear-gradient(135deg,rgba(245,158,11,.12),rgba(245,158,11,.06));">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round">
              <path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/>
              <line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
            </svg>
          </div>
          <div class="stat-val" id="ins-impressions">—</div>
          <div class="stat-label">인게이지먼트</div>
          <div class="stat-change up" id="ins-impressions-change">—</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:linear-gradient(135deg,rgba(139,92,246,.12),rgba(139,92,246,.06));">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
            </svg>
          </div>
          <div class="stat-val" id="ins-saves">—</div>
          <div class="stat-label">저장</div>
          <div class="stat-change neutral" id="ins-saves-change">—</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:linear-gradient(135deg,rgba(225,48,108,.12),rgba(225,48,108,.06));">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e1306c" stroke-width="2" stroke-linecap="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div class="stat-val" id="ins-profile-views">—</div>
          <div class="stat-label">팔로워 증감</div>
          <div class="stat-change neutral" id="ins-profile-change">—</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:3fr 1fr;gap:20px;margin-bottom:20px;">
        <div class="card" style="margin-bottom:0;">
          <div class="sh" style="margin-bottom:14px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e1306c" stroke-width="2" stroke-linecap="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/></svg>
            <h2 style="font-size:14px;">도달 &amp; 노출 추이</h2>
          </div>
          <div class="chart-wrap" style="height:220px;"><canvas id="insightReachChart"></canvas></div>
        </div>
        <div class="card" style="margin-bottom:0;">
          <div class="sh" style="margin-bottom:14px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#833ab4" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/></svg>
            <h2 style="font-size:14px;">유입 경로</h2>
          </div>
          <div class="chart-wrap" style="height:220px;"><canvas id="insightSourceChart"></canvas></div>
        </div>
      </div>

      <!-- Heatmap -->
      <div class="card">
        <div class="sh">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e1306c" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <h2>최적 게시 시간대</h2>
          <span class="sh-badge">팔로워 활성 시간 기반</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;" id="heatmap-grid"></div>
        <p style="font-size:11px;color:var(--text3);margin-top:10px;">색이 진할수록 팔로워 활동이 많은 시간입니다</p>
      </div>
    </div><!-- /panel-insights -->


    <!-- ========== AUDIENCE PANEL ========== -->
    <div class="panel" id="panel-audience">
      <div class="sh">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e1306c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
          <path d="M16 3.13a4 4 0 010 7.75"/><path d="M21 21v-2a4 4 0 00-3-3.87"/>
        </svg>
        <h2>팔로워 분석</h2>
        <span class="sh-badge">오디언스</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-bottom:20px;">
        <div class="card" style="margin-bottom:0;">
          <div class="sh" style="margin-bottom:14px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e1306c" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/></svg>
            <h2 style="font-size:14px;">성별 분포</h2>
          </div>
          <div class="chart-wrap" style="height:180px;"><canvas id="genderChart"></canvas></div>
        </div>
        <div class="card" style="margin-bottom:0;">
          <div class="sh" style="margin-bottom:14px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#833ab4" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="4" height="18"/><rect x="10" y="8" width="4" height="13"/><rect x="17" y="5" width="4" height="16"/></svg>
            <h2 style="font-size:14px;">연령대 분포</h2>
          </div>
          <div class="chart-wrap" style="height:180px;"><canvas id="ageChart"></canvas></div>
        </div>
        <div class="card" style="margin-bottom:0;">
          <div class="sh" style="margin-bottom:14px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 00-8 8c0 5.4 7.1 12.3 7.6 12.7a.6.6 0 00.8 0C12.9 22.3 20 15.4 20 10a8 8 0 00-8-8z"/></svg>
            <h2 style="font-size:14px;">상위 지역</h2>
          </div>
          <div id="location-list" style="padding:4px 0;">
            <div class="metric-row"><span style="font-size:13px;font-weight:600;">서울</span><span style="font-weight:800;color:var(--ig2);">38.2%</span></div>
            <div class="metric-row"><span style="font-size:13px;font-weight:600;">경기</span><span style="font-weight:800;color:var(--ig2);">21.5%</span></div>
            <div class="metric-row"><span style="font-size:13px;font-weight:600;">부산</span><span style="font-weight:800;color:var(--ig2);">9.3%</span></div>
            <div class="metric-row"><span style="font-size:13px;font-weight:600;">인천</span><span style="font-weight:800;color:var(--ig2);">7.1%</span></div>
            <div class="metric-row"><span style="font-size:13px;font-weight:600;">대구</span><span style="font-weight:800;color:var(--ig2);">5.8%</span></div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="sh">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e1306c" stroke-width="2" stroke-linecap="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          <h2>팔로워 증가 추이</h2>
          <span class="sh-badge">30일</span>
        </div>
        <div class="chart-wrap"><canvas id="followerGrowthChart"></canvas></div>
      </div>
    </div><!-- /panel-audience -->


    <!-- ========== DM AUTOMATION PANEL ========== -->
    <div class="panel" id="panel-dm">
      <div class="sh">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e1306c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
        <h2>DM 자동화</h2>
        <span class="sh-badge">키워드 트리거</span>
        <button class="btn btn-primary btn-sm" onclick="openDmRuleModal()" style="margin-left:auto;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          새 규칙 추가
        </button>
      </div>

      <!-- ① Apify 세션ID 설정 카드 -->
      <div class="apify-session-card" id="apify-session-card">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
          <div style="width:38px;height:38px;background:linear-gradient(135deg,#bbf7d0,#86efac);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:14px;font-weight:800;color:#15803d;">Apify DM 자동화 설정</div>
            <div style="font-size:12px;color:#16a34a;margin-top:1px;" id="apify-key-status">APIFY_API_KEY 확인 중...</div>
          </div>
          <span id="apify-session-status-badge"></span>
        </div>
        <div style="display:flex;gap:8px;align-items:flex-end;">
          <div style="flex:1;">
            <label style="font-size:12px;font-weight:700;color:#15803d;display:block;margin-bottom:4px;">Instagram 세션ID (sessionid 쿠키값)</label>
            <input class="apify-input" id="apify-session-input" type="password" placeholder="Instagram 세션ID를 입력하세요" style="background:#fff;">
          </div>
          <button onclick="saveApifySession()" class="btn btn-sm" style="background:#16a34a;color:#fff;border:none;padding:9px 16px;white-space:nowrap;flex-shrink:0;">저장</button>
        </div>
        <div style="font-size:11px;color:#15803d;margin-top:8px;line-height:1.6;">
          💡 세션ID 확인법: Instagram 로그인 후 브라우저 개발자도구 → Application → Cookies → <code style="background:#d1fae5;padding:1px 4px;border-radius:3px;">sessionid</code> 값 복사
        </div>
      </div>

      <!-- ② 직접 DM 발송 카드 -->
      <div class="apify-send-card">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
          <div style="width:34px;height:34px;background:linear-gradient(135deg,rgba(131,58,180,.12),rgba(225,48,108,.08));border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e1306c" stroke-width="2" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </div>
          <div style="font-size:14px;font-weight:800;color:var(--text1);">직접 DM 발송</div>
          <span style="font-size:11px;color:var(--text3);background:#f1f5f9;padding:2px 8px;border-radius:20px;">Apify 즉시 실행</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <div>
            <label style="font-size:12px;font-weight:700;color:var(--text2);display:block;margin-bottom:4px;">발송 대상 유저네임 <span style="color:var(--ig2);">*</span></label>
            <textarea class="apify-textarea" id="apify-target-usernames" placeholder="@username1&#10;@username2&#10;username3&#10;(줄바꿈으로 구분, 1회 최대 50명)" style="min-height:70px;"></textarea>
          </div>
          <div>
            <label style="font-size:12px;font-weight:700;color:var(--text2);display:block;margin-bottom:4px;">DM 메시지 <span style="color:var(--ig2);">*</span></label>
            <textarea class="apify-textarea" id="apify-dm-message" placeholder="발송할 DM 메시지를 입력하세요..."></textarea>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="flex:1;">
              <label style="font-size:12px;font-weight:700;color:var(--text2);display:block;margin-bottom:4px;">발송 간격 (초)</label>
              <input class="apify-input" id="apify-delay" type="number" value="60" min="30" style="width:100px;">
            </div>
            <div style="flex:1;font-size:12px;color:var(--text3);line-height:1.6;">
              ⚠️ 하루 최대 30~40명 권장<br>너무 빠른 발송 시 계정 제한 위험
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;margin-top:4px;">
            <button class="apify-send-btn" id="apify-send-btn" onclick="sendApifyDM()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              DM 발송 시작
            </button>
            <div id="apify-send-result" style="font-size:13px;color:var(--green);display:none;"></div>
          </div>
        </div>
      </div>

      <!-- ③ 키워드 자동화 안내 -->
      <div class="card" style="background:linear-gradient(135deg,#fdf2f8,#f3e8ff);border-color:rgba(225,48,108,.15);margin-bottom:16px;">
        <div style="display:flex;align-items:flex-start;gap:14px;">
          <div style="width:40px;height:40px;background:linear-gradient(135deg,rgba(131,58,180,.15),rgba(225,48,108,.1));border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#833ab4" stroke-width="2" stroke-linecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div>
            <div style="font-size:14px;font-weight:700;color:var(--text1);margin-bottom:4px;">키워드 자동 DM 작동 방식</div>
            <div style="font-size:13px;color:var(--text2);line-height:1.7;">
              댓글에 <strong>설정된 키워드</strong>가 포함되면 Apify를 통해 자동으로 DM을 발송합니다.<br>
              예: "링크 주세요" 댓글 → 미리 설정한 링크 포함 DM 자동 발송<br>
              <span style="color:#16a34a;font-weight:600;">✅ 세션ID 설정 완료 시 댓글 키워드 감지 → Apify 자동 실행됩니다.</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Rules List -->
      <div id="dm-rules-list" style="display:flex;flex-direction:column;gap:12px;"></div>

      <!-- Empty State -->
      <div id="dm-rules-empty" class="card" style="display:none;">
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#833ab4" stroke-width="1.8" stroke-linecap="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          </div>
          <div class="empty-title">DM 자동화 규칙 없음</div>
          <div class="empty-desc">댓글 키워드로 자동 DM을 발송하는 규칙을 추가해보세요</div>
          <button class="btn btn-primary" onclick="openDmRuleModal()">첫 번째 규칙 만들기</button>
        </div>
      </div>
    </div><!-- /panel-dm -->


    <!-- ========== DM LOGS PANEL ========== -->
    <div class="panel" id="panel-dm-logs">
      <div class="sh">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e1306c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        <h2>DM 발송 내역</h2>
        <span id="dm-log-total-badge" class="sh-badge">전체</span>
        <button class="btn btn-ghost btn-sm" onclick="loadDmLogs()" style="margin-left:auto;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
          </svg>
          새로고침
        </button>
      </div>
      <div class="card">
        <div style="overflow-x:auto;" class="thin-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>수신자</th>
                <th>트리거 키워드</th>
                <th>발송 메시지</th>
                <th class="center">상태</th>
                <th class="center">발송 시간</th>
              </tr>
            </thead>
            <tbody id="dm-logs-body">
              <tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text3);">발송 내역이 없습니다</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div><!-- /panel-dm-logs -->


    <!-- ========== WEBHOOK PANEL ========== -->
    <div class="panel" id="panel-webhook">
      <div class="sh">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e1306c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
        </svg>
        <h2>웹훅 설정</h2>
        <span class="sh-badge">Meta Webhook</span>
      </div>

      <div class="card">
        <!-- Active indicator -->
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:22px;padding-bottom:18px;border-bottom:1px solid var(--border);">
          <div style="width:10px;height:10px;background:var(--green);border-radius:50%;animation:pulse 2s infinite;box-shadow:0 0 0 3px rgba(34,197,94,.2);"></div>
          <span style="font-size:14px;font-weight:700;color:#16a34a;">웹훅 엔드포인트 활성</span>
          <span style="margin-left:auto;font-size:12px;color:var(--text3);">실시간 수신 중</span>
        </div>

        <!-- Webhook URL -->
        <div style="margin-bottom:14px;">
          <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;">웹훅 URL</div>
          <div style="display:flex;align-items:center;gap:8px;background:#f8fafc;border:1.5px solid var(--border);border-radius:10px;padding:12px 14px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
            <code id="webhook-url" style="flex:1;font-size:13px;color:var(--text1);font-family:'Menlo','Monaco','Consolas',monospace;word-break:break-all;"></code>
            <button onclick="copyWebhookUrl()" class="btn btn-outline btn-xs">복사</button>
          </div>
        </div>

        <!-- Verify Token -->
        <div style="margin-bottom:22px;">
          <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;">Verify Token</div>
          <div style="background:#f8fafc;border:1.5px solid var(--border);border-radius:10px;padding:12px 14px;">
            <code style="font-size:13px;color:var(--ig2);font-family:'Menlo','Monaco','Consolas',monospace;">VERIFY_TOKEN 환경변수로 설정됨</code>
          </div>
        </div>

        <!-- Setup Guide -->
        <div style="background:#fffbeb;border:1.5px solid #fde68a;border-radius:12px;padding:18px;margin-bottom:22px;">
          <div style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:#854d0e;margin-bottom:12px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#92400e" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Meta 앱 웹훅 설정 방법
          </div>
          <ol style="font-size:13px;color:#78350f;line-height:2.1;padding-left:20px;">
            <li>Meta for Developers → 앱 선택 → Webhooks 탭</li>
            <li>Instagram 구독 추가</li>
            <li>콜백 URL에 위 웹훅 URL 입력</li>
            <li>Verify Token에 환경변수에 설정한 값 입력</li>
            <li>구독 필드: <code style="background:#fff;padding:2px 6px;border-radius:4px;font-size:12px;">comments, messages</code> 선택</li>
          </ol>
        </div>

        <!-- Recent Logs -->
        <div class="sh" style="margin-bottom:14px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e1306c" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <h2 style="font-size:14px;">최근 웹훅 수신 내역</h2>
        </div>
        <div id="webhook-logs">
          <div style="text-align:center;padding:28px;color:var(--text3);font-size:13px;">수신된 웹훅이 없습니다</div>
        </div>
      </div>
    </div><!-- /panel-webhook -->


    <!-- ========== ACCOUNT PANEL ========== -->
    <div class="panel" id="panel-account">

      <!-- Loading -->
      <div id="account-loading" style="display:none;text-align:center;padding:80px 20px;">
        <div style="width:48px;height:48px;border:3px solid #f1f5f9;border-top-color:#833ab4;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 16px;"></div>
        <div style="font-size:14px;color:var(--text3);">계정 정보 불러오는 중...</div>
      </div>

      <!-- Disconnected -->
      <div id="account-disconnected">
        <div style="max-width:500px;margin:0 auto 24px;">
          <div class="card" style="text-align:center;padding:44px 40px;background:linear-gradient(180deg,#fff 0%,#fdf4ff 100%);">

            <!-- IG Logo -->
            <div style="width:84px;height:84px;margin:0 auto 24px;background:var(--grad4);border-radius:24px;display:flex;align-items:center;justify-content:center;box-shadow:0 12px 40px rgba(131,58,180,.35);">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="2" width="20" height="20" rx="5.5" stroke="white" stroke-width="1.8"/>
                <circle cx="12" cy="12" r="4.5" stroke="white" stroke-width="1.8"/>
                <circle cx="17.5" cy="6.5" r="1.3" fill="white"/>
              </svg>
            </div>

            <h2 style="font-size:22px;font-weight:800;color:var(--text1);margin:0 0 10px;">Instagram 계정 연결</h2>
            <p style="font-size:14px;color:var(--text2);line-height:1.7;margin:0 0 28px;">Instagram으로 로그인하면 콘텐츠 분석, 인사이트,<br>DM 자동화를 모두 사용할 수 있습니다.</p>

            <button id="oauth-login-btn" onclick="startOAuthLogin()"
              style="width:100%;padding:15px 24px;background:var(--grad4);border:none;border-radius:14px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:12px;box-shadow:0 6px 24px rgba(131,58,180,.4);transition:opacity .2s;font-family:inherit;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="2" width="20" height="20" rx="5.5" stroke="white" stroke-width="2"/>
                <circle cx="12" cy="12" r="4.5" stroke="white" stroke-width="2"/>
                <circle cx="17.5" cy="6.5" r="1.3" fill="white"/>
              </svg>
              Instagram으로 로그인
            </button>

            <div id="oauth-status-msg" style="margin-top:12px;font-size:13px;color:var(--text3);min-height:20px;"></div>

            <!-- Permissions -->
            <div style="margin-top:24px;padding:16px 20px;background:#f8fafc;border-radius:12px;text-align:left;">
              <div style="font-size:12px;font-weight:700;color:var(--text2);margin-bottom:10px;display:flex;align-items:center;gap:6px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                요청되는 권한
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;font-size:12px;color:var(--text2);">
                <div style="display:flex;align-items:center;gap:7px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  프로필 기본 정보
                </div>
                <div style="display:flex;align-items:center;gap:7px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  인사이트 조회
                </div>
                <div style="display:flex;align-items:center;gap:7px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  댓글 관리
                </div>
                <div style="display:flex;align-items:center;gap:7px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  DM 자동화
                </div>
                <div style="display:flex;align-items:center;gap:7px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  콘텐츠 게시
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Apify Session Connect Card -->
        <div style="max-width:500px;margin:0 auto 16px;">
          <div class="card" style="padding:24px 28px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1.5px solid rgba(34,197,94,.25);">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
              <div style="width:36px;height:36px;background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              </div>
              <div>
                <div style="font-size:14px;font-weight:800;color:#15803d;">세션 쿠키로 연결 (Apify)</div>
                <div style="font-size:11px;color:#16a34a;margin-top:1px;" id="acct-apify-key-status">APIFY_API_KEY 확인 중...</div>
              </div>
              <span id="acct-session-badge" style="margin-left:auto;"></span>
            </div>

            <div style="font-size:12px;color:#15803d;line-height:1.7;margin-bottom:14px;padding:10px 14px;background:rgba(255,255,255,.6);border-radius:8px;">
              Instagram에 로그인된 브라우저에서 <code style="background:#d1fae5;padding:1px 5px;border-radius:3px;font-size:11px;">sessionid</code> 쿠키값을 복사해 입력하세요.<br>
              이 값은 DM 자동 발송에 사용됩니다.
            </div>

            <div style="margin-bottom:12px;">
              <label style="font-size:12px;font-weight:700;color:#15803d;display:block;margin-bottom:6px;">Instagram sessionid 쿠키값</label>
              <div style="display:flex;gap:8px;">
                <input id="acct-session-input" type="password" placeholder="sessionid 값을 붙여넣으세요"
                  style="flex:1;padding:10px 14px;border:1.5px solid rgba(34,197,94,.35);border-radius:10px;font-size:13px;font-family:inherit;outline:none;background:#fff;transition:border-color .15s;"
                  onfocus="this.style.borderColor='#22c55e'" onblur="this.style.borderColor='rgba(34,197,94,.35)'">
                <button onclick="saveAccountApifySession()" id="acct-session-save-btn"
                  style="padding:10px 18px;background:linear-gradient(135deg,#22c55e,#16a34a);border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:inherit;flex-shrink:0;transition:opacity .15s;"
                  onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
                  저장
                </button>
              </div>
            </div>

            <div style="font-size:11px;color:#15803d;line-height:1.7;">
              <strong>sessionid 확인 방법:</strong><br>
              1. instagram.com 로그인 → F12 → Application 탭<br>
              2. Cookies → https://www.instagram.com → <code style="background:#d1fae5;padding:1px 4px;border-radius:3px;">sessionid</code> 값 복사
            </div>

            <div id="acct-session-msg" style="display:none;margin-top:10px;padding:8px 12px;border-radius:8px;font-size:12px;"></div>
          </div>
        </div>

        <!-- Advanced Config -->
        <div style="max-width:500px;margin:0 auto;">
          <details id="app-config-details" class="card" style="padding:16px 20px;">
            <summary style="font-size:13px;font-weight:700;color:var(--text2);cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between;">
              <span style="display:flex;align-items:center;gap:7px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.42 1.42M4.93 4.93l1.42 1.42M19.07 19.07l-1.42-1.42M4.93 19.07l1.42-1.42M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>
                앱 ID / 시크릿 직접 설정 (고급)
              </span>
              <span id="app-config-badge" style="padding:3px 10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:20px;font-size:11px;font-weight:700;color:#16a34a;display:none;">설정됨</span>
            </summary>
            <div style="margin-top:16px;">
              <div style="font-size:12px;color:var(--text2);margin-bottom:12px;line-height:1.7;">
                <a href="https://developers.facebook.com/apps/" target="_blank" style="color:#833ab4;font-weight:600;">developers.facebook.com/apps</a>
                에서 앱 ID와 시크릿을 확인하세요.<br>
                리다이렉트 URI: <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:11px;">https://wearesuperplace.com/api/instagram/oauth/callback</code>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
                <div>
                  <label style="font-size:11px;font-weight:700;color:var(--text2);display:block;margin-bottom:4px;">앱 ID (App ID)</label>
                  <input id="meta-app-id" type="text" placeholder="1368702468330609" class="input-field" style="font-size:13px;"
                    onfocus="this.style.borderColor='#833ab4'" onblur="this.style.borderColor=''">
                </div>
                <div>
                  <label style="font-size:11px;font-weight:700;color:var(--text2);display:block;margin-bottom:4px;">앱 시크릿</label>
                  <input id="meta-app-secret" type="password" placeholder="앱 시크릿 코드" class="input-field" style="font-size:13px;"
                    onfocus="this.style.borderColor='#833ab4'" onblur="this.style.borderColor=''">
                </div>
              </div>
              <div id="app-config-msg" style="display:none;padding:8px 12px;border-radius:8px;font-size:12px;margin-bottom:10px;"></div>
              <button onclick="saveAppConfig()" class="btn btn-primary btn-sm">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                저장 및 검증
              </button>
            </div>
          </details>
        </div>
      </div>

      <!-- Connected -->
      <div id="account-connected" style="display:none;">

        <!-- API Error Banner -->
        <div id="api-status-banner" style="display:none;background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1.5px solid #fde047;border-radius:16px;padding:20px 24px;margin-bottom:20px;">
          <div style="display:flex;align-items:flex-start;gap:14px;">
            <div style="width:42px;height:42px;background:#fef9c3;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#92400e" stroke-width="2" stroke-linecap="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div style="flex:1;">
              <div style="font-size:14px;font-weight:700;color:#92400e;margin-bottom:6px;">Instagram API 연결 오류</div>
              <div id="api-error-msg" style="font-size:13px;color:#854d0e;line-height:1.7;"></div>
              <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">
                <button onclick="disconnectAndReconnect()" class="btn btn-primary btn-sm">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                  연결 해제 후 재연결
                </button>
                <a href="https://developers.facebook.com/apps/" target="_blank" class="btn btn-ghost btn-sm" style="text-decoration:none;">Meta 개발자 콘솔</a>
              </div>
              <div style="margin-top:12px;padding:10px 14px;background:rgba(255,255,255,.7);border-radius:8px;font-size:12px;color:#78716c;line-height:1.6;">
                <strong>해결 방법:</strong> Meta 앱이 <strong>개발(Development) 모드</strong>이거나 앱 리뷰가 없으면 API가 차단됩니다.
              </div>
            </div>
          </div>
        </div>

        <!-- Profile Header -->
        <div class="ig-banner" style="margin-bottom:20px;">
          <div style="display:flex;align-items:center;gap:20px;position:relative;z-index:1;">
            <div id="ig-avatar-wrap" style="width:72px;height:72px;border-radius:50%;border:3px solid rgba(255,255,255,.5);flex-shrink:0;overflow:hidden;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;">
              <img id="ig-profile-pic" src="" alt="" style="width:100%;height:100%;object-fit:cover;display:none;" onerror="this.style.display='none';document.getElementById('ig-avatar-default').style.display='flex'">
              <div id="ig-avatar-default" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="1.8" stroke-linecap="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
            </div>
            <div style="flex:1;">
              <div id="ig-display-username" style="font-size:22px;font-weight:800;color:#fff;"></div>
              <div id="ig-display-id" style="font-size:12px;color:rgba(255,255,255,.7);margin-top:2px;"></div>
              <div style="display:flex;align-items:center;gap:6px;margin-top:8px;">
                <span style="width:8px;height:8px;background:#4ade80;border-radius:50%;display:inline-block;box-shadow:0 0 0 2px rgba(74,222,128,.3);"></span>
                <span style="font-size:13px;font-weight:600;color:rgba(255,255,255,.9);">연결됨</span>
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:11px;color:rgba(255,255,255,.65);margin-bottom:3px;">팔로워</div>
              <div id="ig-follower-count" style="font-size:28px;font-weight:800;color:#fff;">-</div>
            </div>
          </div>
        </div>

        <!-- Info Grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
          <div class="card">
            <div style="font-size:13px;font-weight:700;color:var(--text1);margin-bottom:12px;display:flex;align-items:center;gap:7px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#833ab4" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              연결 정보
            </div>
            <div style="font-size:12px;color:var(--text2);margin-bottom:8px;">
              토큰 만료: <span id="ig-token-expiry" style="font-weight:600;color:var(--text1);">-</span>
            </div>
            <button onclick="disconnectIgAccount()" class="btn btn-danger" style="width:100%;margin-top:4px;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18.36 6.64A9 9 0 015.64 19.36"/><path d="M9.9 4.24A9.12 9.12 0 0112 4a9 9 0 019 9 9.12 9.12 0 01-.24 2.1"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              연결 해제
            </button>
          </div>
          <div class="card">
            <div style="font-size:13px;font-weight:700;color:var(--text1);margin-bottom:12px;display:flex;align-items:center;gap:7px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e1306c" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
              웹훅 설정
            </div>
            <div style="font-size:11px;color:var(--text3);margin-bottom:5px;">Callback URL</div>
            <div style="background:#f1f5f9;padding:7px 10px;border-radius:7px;font-family:'Menlo','Monaco',monospace;font-size:10px;color:#334155;display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:10px;">
              <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">https://wearesuperplace.com/api/instagram/webhook</span>
              <button onclick="copyText('https://wearesuperplace.com/api/instagram/webhook')" style="background:#e2e8f0;border:none;padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer;flex-shrink:0;font-family:inherit;">복사</button>
            </div>
            <div style="display:flex;gap:5px;">
              <span style="padding:3px 9px;background:#dbeafe;border-radius:12px;font-size:10px;color:#6d28d9;font-weight:700;">comments</span>
              <span style="padding:3px 9px;background:#dbeafe;border-radius:12px;font-size:10px;color:#6d28d9;font-weight:700;">messages</span>
            </div>
          </div>
        </div>

        <!-- Apify Session Card (connected state) -->
        <div class="card" style="padding:20px 24px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1.5px solid rgba(34,197,94,.25);">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
            <div style="width:32px;height:32px;background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            </div>
            <div style="flex:1;">
              <div style="font-size:13px;font-weight:800;color:#15803d;">DM 자동화 세션 설정 (Apify)</div>
              <div style="font-size:11px;color:#16a34a;margin-top:1px;" id="acct-apify-key-status-c">APIFY_API_KEY 확인 중...</div>
            </div>
            <span id="acct-session-badge-c" style="margin-left:auto;"></span>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <input id="acct-session-input-c" type="password" placeholder="sessionid 쿠키값 입력"
              style="flex:1;padding:9px 13px;border:1.5px solid rgba(34,197,94,.35);border-radius:9px;font-size:13px;font-family:inherit;outline:none;background:#fff;transition:border-color .15s;"
              onfocus="this.style.borderColor='#22c55e'" onblur="this.style.borderColor='rgba(34,197,94,.35)'">
            <button onclick="saveAccountApifySession('c')" id="acct-session-save-btn-c"
              style="padding:9px 16px;background:linear-gradient(135deg,#22c55e,#16a34a);border:none;border-radius:9px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:inherit;flex-shrink:0;transition:opacity .15s;"
              onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
              저장
            </button>
          </div>
          <div id="acct-session-msg-c" style="display:none;margin-top:8px;padding:7px 11px;border-radius:7px;font-size:12px;"></div>
          <div style="margin-top:10px;font-size:11px;color:#16a34a;line-height:1.6;">
            💡 instagram.com → F12 → Application → Cookies → <code style="background:#d1fae5;padding:1px 4px;border-radius:3px;">sessionid</code> 값 복사
          </div>
        </div>

      </div><!-- /account-connected -->

    </div><!-- /panel-account -->

  </div><!-- /content -->
</div><!-- /main-area -->
</div><!-- /wrap -->

<!-- ===== DM RULE MODAL ===== -->
<div id="dm-rule-modal" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:100;align-items:center;justify-content:center;backdrop-filter:blur(2px);">
  <div style="background:#fff;border-radius:20px;width:560px;max-width:95vw;max-height:92vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,.22);animation:slideUp .2s ease-out;">
    <div style="padding:22px 24px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;position:sticky;top:0;background:#fff;z-index:1;border-radius:20px 20px 0 0;">
      <div style="width:36px;height:36px;background:var(--grad);border-radius:10px;display:flex;align-items:center;justify-content:center;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
      </div>
      <div style="font-size:16px;font-weight:800;color:var(--text1);">DM 자동화 규칙 설정</div>
      <button onclick="closeDmRuleModal()" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--text3);margin-left:auto;width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='none'">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div style="padding:24px;display:flex;flex-direction:column;gap:18px;">
      <input type="hidden" id="rule-edit-id">

      <div>
        <label style="font-size:12px;font-weight:700;color:var(--text2);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px;">규칙 이름</label>
        <input class="input-field" id="rule-name" placeholder="예: 링크 요청 자동 응답">
      </div>

      <div>
        <label style="font-size:12px;font-weight:700;color:var(--text2);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px;">
          트리거 키워드
          <span style="color:var(--text3);font-weight:400;text-transform:none;letter-spacing:0;font-size:11px;margin-left:6px;">쉼표 또는 Enter로 구분</span>
        </label>
        <input class="input-field" id="rule-keywords-input" placeholder="링크, url, 주소, 어디서" onkeydown="handleKeywordInput(event)">
        <div id="rule-keywords-tags" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;"></div>
        <div style="font-size:11px;color:var(--text3);margin-top:5px;">댓글에 이 단어가 포함되면 DM을 발송합니다</div>
      </div>

      <div>
        <label style="font-size:12px;font-weight:700;color:var(--text2);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px;">자동 DM 메시지</label>
        <textarea class="input-field" id="rule-message" rows="4" placeholder="안녕하세요! 문의해주셔서 감사합니다. 링크는 여기입니다: https://..." style="resize:vertical;"></textarea>
        <div style="font-size:11px;color:var(--text3);margin-top:5px;">댓글 작성자에게 자동으로 발송될 DM 내용입니다</div>
      </div>

      <div>
        <label style="font-size:12px;font-weight:700;color:var(--text2);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px;">
          적용 게시물
          <span style="color:var(--text3);font-weight:400;text-transform:none;letter-spacing:0;font-size:11px;margin-left:6px;">선택사항 — 비워두면 전체 게시물</span>
        </label>
        <input class="input-field" id="rule-post-url" placeholder="https://www.instagram.com/p/xxxxx/">
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:#f8fafc;border-radius:10px;border:1.5px solid var(--border);">
        <div>
          <div style="font-size:13px;font-weight:700;color:var(--text1);">규칙 활성화</div>
          <div style="font-size:12px;color:var(--text3);margin-top:2px;">활성화하면 댓글 감지 즉시 DM을 발송합니다</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span id="rule-active-label" style="font-size:13px;color:var(--green);font-weight:700;">활성</span>
          <input type="checkbox" id="rule-active" checked style="display:none;">
          <span id="rule-toggle" onclick="toggleRuleActive()" class="toggle-track" style="background:var(--green);cursor:pointer;">
            <span class="toggle-thumb" style="left:calc(100% - 22px);"></span>
          </span>
        </div>
      </div>

      <div>
        <label style="font-size:12px;font-weight:700;color:var(--text2);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px;">재발송 제한</label>
        <select class="select-field" id="rule-cooldown">
          <option value="0">제한 없음</option>
          <option value="1" selected>24시간 이내 재발송 안함</option>
          <option value="7">7일 이내 재발송 안함</option>
          <option value="30">30일 이내 재발송 안함</option>
        </select>
      </div>
    </div>
    <div style="padding:16px 24px;border-top:1px solid var(--border);display:flex;gap:10px;justify-content:flex-end;background:#f8fafc;border-radius:0 0 20px 20px;">
      <button onclick="closeDmRuleModal()" class="btn btn-ghost">취소</button>
      <button onclick="saveDmRule()" class="btn btn-primary">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        저장하기
      </button>
    </div>
  </div>
</div>

<!-- Mobile overlay -->
<div id="sidebar-overlay" onclick="closeSidebarMobile()" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,.4);z-index:49;backdrop-filter:blur(1px);"></div>

<!-- Toast -->
<div id="toast" style="position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#0f172a;color:#fff;padding:12px 22px;border-radius:30px;font-size:13px;font-weight:600;z-index:9999;display:none;animation:fadeIn .2s;box-shadow:0 8px 30px rgba(0,0,0,.3);white-space:nowrap;"></div>

<style>
  @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
  @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes slideUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:none;}}
  @media(max-width:960px){
    .stat-grid{grid-template-columns:repeat(2,1fr)!important;}
  }
  @media(max-width:700px){
    .post-grid{grid-template-columns:repeat(3,1fr)!important;}
    [style*="grid-template-columns:2fr 1fr"]{grid-template-columns:1fr!important;}
    [style*="grid-template-columns:3fr 1fr"]{grid-template-columns:1fr!important;}
    [style*="grid-template-columns:1fr 1fr 1fr"]{grid-template-columns:1fr!important;}
    [style*="grid-template-columns:1fr 340px"]{grid-template-columns:1fr!important;}
    [style*="grid-template-columns:1fr 1fr"]{grid-template-columns:1fr!important;}
  }
  .cal-day:not(.cal-today):hover { background: #fdf2f8; }
</style>

<script>
  // ===== 서버 주입 userId =====
  window.__userId = window.__userId || '0';

  // ===== STATE =====
  let currentPanel = 'home';
  let dmRules = [];
  let calYear = new Date().getFullYear();
  let calMonth = new Date().getMonth();
  let ruleKeywords = [];
  let charts = {};
  let igProfile = null;
  let mediaCache = [];

  // ===== HTML 출력 인코딩 (XSS 방지) =====
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

  function getIgStoredUserData() {
    const keys = ['user', 'adminUser', 'currentUser'];
    const stores = [window.localStorage, window.sessionStorage];
    for (const store of stores) {
      if (!store) continue;
      for (const key of keys) {
        const raw = store.getItem(key);
        if (raw) return raw;
      }
    }
    try {
      const id = getCurrentUserId();
      if (id && id !== '0') return JSON.stringify({ id: id });
    } catch (_) {}
    return '';
  }

  function encodeIgUserData(raw) {
    try { return (function(){var _wx2b=new TextEncoder().encode(raw);var _wx2s="";_wx2b.forEach(function(c){_wx2s+=String.fromCharCode(c);});return btoa(_wx2s);})(); }
    catch (_) { try { return btoa(raw); } catch (__) { return ''; } }
  }

  function mergeIgHeaders(headers) {
    const out = {};
    try {
      if (headers instanceof Headers) {
        headers.forEach(function(value, key) { out[key] = value; });
      } else if (Array.isArray(headers)) {
        headers.forEach(function(pair) { out[pair[0]] = pair[1]; });
      } else if (headers) {
        Object.keys(headers).forEach(function(key) { out[key] = headers[key]; });
      }
    } catch (_) {}
    if (!out.Accept && !out.accept) out.Accept = 'application/json';
    const rawUser = getIgStoredUserData();
    const encoded = rawUser ? encodeIgUserData(rawUser) : '';
    if (encoded && !out['X-User-Data-Base64']) out['X-User-Data-Base64'] = encoded;
    return out;
  }

  function igFetch(url, options) {
    const opts = Object.assign({}, options || {});
    opts.credentials = opts.credentials || 'include';
    opts.headers = mergeIgHeaders(opts.headers);
    return fetch(url, opts);
  }

  async function hasConnectedInstagramAccount(userId) {
    try {
      const r = await igFetch('/api/instagram/account?userId=' + userId);
      if (r.status === 401) return false;
      const d = await r.json();
      return !!(d && d.account && d.account.is_connected);
    } catch (_) {
      return true;
    }
  }

  function renderDisconnectedDashboard() {
    ['stat-followers','stat-likes','stat-comments','stat-er'].forEach(function(id) {
      const el = document.getElementById(id);
      if (el) el.textContent = '—';
    });
    ['stat-followers-change','stat-likes-change','stat-comments-change','stat-er-change'].forEach(function(id) {
      const el = document.getElementById(id);
      if (el) el.textContent = '계정 연결 필요';
    });
    renderRecentPosts([]);
    renderDashboardChart(['데이터 없음'], [0], [0]);
  }

  // ===== SVG ICONS for topbar =====
  const TOPBAR_ICONS = {
    home: '<path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="white" stroke-width="2" stroke-linejoin="round"/><path d="M9 21V12h6v9" stroke="white" stroke-width="2" stroke-linecap="round"/>',
    content: '<rect x="3" y="3" width="7" height="7" rx="1" stroke="white" stroke-width="2"/><rect x="14" y="3" width="7" height="7" rx="1" stroke="white" stroke-width="2"/><rect x="3" y="14" width="7" height="7" rx="1" stroke="white" stroke-width="2"/><rect x="14" y="14" width="7" height="7" rx="1" stroke="white" stroke-width="2"/>',
    schedule: '<rect x="3" y="4" width="18" height="18" rx="2" stroke="white" stroke-width="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="white" stroke-width="2" stroke-linecap="round"/>',
    insights: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="16 7 22 7 22 13" stroke="white" stroke-width="2" stroke-linecap="round"/>',
    audience: '<circle cx="9" cy="7" r="4" stroke="white" stroke-width="2"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" stroke="white" stroke-width="2" stroke-linecap="round"/><path d="M16 3.13a4 4 0 010 7.75" stroke="white" stroke-width="2" stroke-linecap="round"/><path d="M21 21v-2a4 4 0 00-3-3.87" stroke="white" stroke-width="2" stroke-linecap="round"/>',
    dm: '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="white" stroke-width="2" stroke-linejoin="round"/>',
    'dm-logs': '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="white" stroke-width="2"/><polyline points="14 2 14 8 20 8" stroke="white" stroke-width="2"/><line x1="16" y1="13" x2="8" y2="13" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="16" y1="17" x2="8" y2="17" stroke="white" stroke-width="2" stroke-linecap="round"/>',
    webhook: '<path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="white" stroke-width="2" stroke-linecap="round"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="white" stroke-width="2" stroke-linecap="round"/>',
    account: '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="white" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="7" r="4" stroke="white" stroke-width="2"/>'
  };

  const PANEL_TITLES = {
    home:      ['대시보드',       '인스타그램 마케팅 현황'],
    content:   ['콘텐츠 분석',   '게시물 성과 분석'],
    schedule:  ['게시물 관리',   '예약 캘린더'],
    insights:  ['인사이트 분석', '계정 성장 지표'],
    audience:  ['팔로워 분석',   '오디언스 인사이트'],
    dm:        ['DM 자동화',     '키워드 트리거 자동 DM'],
    'dm-logs': ['DM 발송 내역',  '자동 DM 이력'],
    webhook:   ['웹훅 설정',     'Meta Webhook 연동'],
    account:   ['계정 연결',     'Meta Business API']
  };

  // ===== PANEL SWITCH =====
  function showPanel(name) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.sb-item').forEach(i => i.classList.remove('active'));
    const panel = document.getElementById('panel-' + name);
    const nav   = document.getElementById('nav-' + name);
    if (panel) panel.classList.add('active');
    if (nav)   nav.classList.add('active');
    currentPanel = name;

    const t = PANEL_TITLES[name] || [name, ''];
    document.getElementById('topbar-title').textContent = t[0];
    document.getElementById('topbar-sub').textContent   = t[1];
    const iconSvg = document.getElementById('topbar-icon-svg');
    if (iconSvg && TOPBAR_ICONS[name]) {
      iconSvg.innerHTML = TOPBAR_ICONS[name];
    }

    if (name === 'home')     loadRealDashboard();
    if (name === 'content')  loadContentAnalysis();
    if (name === 'schedule') renderCalendar();
    if (name === 'insights') loadRealInsights();
    if (name === 'audience') loadRealAudience();
    if (name === 'dm')       { renderDmRules(); loadApifySession(); }
    if (name === 'dm-logs')  loadDmLogs();
    if (name === 'webhook')  initWebhook();
    if (name === 'account')  loadAccountStatus();

    closeSidebarMobile();
  }

  // ===== SIDEBAR MOBILE =====
  function toggleSidebar() {
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('sidebar-overlay');
    sb.classList.toggle('open');
    ov.style.display = sb.classList.contains('open') ? 'block' : 'none';
  }
  function closeSidebarMobile() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').style.display = 'none';
  }

  // ===== TOAST =====
  function showToast(msg, duration) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.style.display = 'block';
    setTimeout(() => { t.style.display = 'none'; }, duration || 2200);
  }

  // ===== DASHBOARD =====
  async function loadRealDashboard() {
    const userId = getCurrentUserId();
    const accountReady = await hasConnectedInstagramAccount(userId);
    if (!accountReady) { renderDisconnectedDashboard(); return; }
    ['stat-followers','stat-likes','stat-comments','stat-er'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '…';
    });
    try {
      const meRes = await igFetch('/api/instagram/me?userId=' + userId);
      const meData = await meRes.json();
      if (meData.success && meData.profile) {
        igProfile = meData.profile;
        const p = meData.profile;
        document.getElementById('stat-followers').textContent = (p.followers_count || 0).toLocaleString();
        document.getElementById('stat-followers-change').textContent = '팔로잉 ' + (p.following_count || 0).toLocaleString();
        document.getElementById('stat-followers-change').className = 'stat-change neutral';
      } else {
        document.getElementById('stat-followers').textContent = '—';
        document.getElementById('stat-followers-change').textContent = meData.error || '계정 연결 필요';
      }
    } catch(e) { document.getElementById('stat-followers').textContent = '오류'; }

    try {
      const mediaRes = await igFetch('/api/instagram/media?userId=' + userId + '&limit=20');
      const mediaData = await mediaRes.json();
      if (mediaData.success && mediaData.media && mediaData.media.length > 0) {
        mediaCache = mediaData.media;
        const posts = mediaData.media;
        const totalLikes    = posts.reduce((s, p) => s + (p.like_count || 0), 0);
        const totalComments = posts.reduce((s, p) => s + (p.comments_count || 0), 0);
        const avgLikes    = Math.round(totalLikes / posts.length);
        const avgComments = Math.round(totalComments / posts.length);
        const followers   = igProfile ? (igProfile.followers_count || 1) : 1;
        const avgEr       = ((avgLikes + avgComments) / followers * 100).toFixed(2);

        document.getElementById('stat-likes').textContent    = avgLikes.toLocaleString();
        document.getElementById('stat-likes-change').textContent  = '최근 ' + posts.length + '개 평균';
        document.getElementById('stat-comments').textContent = avgComments.toLocaleString();
        document.getElementById('stat-comments-change').textContent = '최근 ' + posts.length + '개 평균';
        document.getElementById('stat-er').textContent       = avgEr + '%';
        document.getElementById('stat-er-change').textContent = avgEr >= 3 ? '업종 평균 이상' : '업종 평균 미만';
        document.getElementById('stat-er-change').className  = 'stat-change ' + (avgEr >= 3 ? 'up' : 'down');

        renderRecentPosts(posts.slice(0, 6));
        const recent7  = posts.slice(0, 7).reverse();
        const labels   = recent7.map(p => { const d = new Date(p.timestamp); return (d.getMonth()+1) + '/' + d.getDate(); });
        renderDashboardChart(labels, recent7.map(p => p.like_count || 0), recent7.map(p => p.comments_count || 0));
      } else {
        ['stat-likes','stat-comments','stat-er'].forEach(id => { const el = document.getElementById(id); if(el) el.textContent = '—'; });
        renderDashboardChart(['데이터 없음'],[0],[0]);
      }
    } catch(e) {
      ['stat-likes','stat-comments','stat-er'].forEach(id => { const el = document.getElementById(id); if(el) el.textContent = '오류'; });
    }

    try {
      const logsRes  = await igFetch('/api/instagram/dm-logs?limit=100');
      const logsData = await logsRes.json();
      const logs     = logsData.logs || [];
      const today    = new Date().toDateString();
      document.getElementById('dm-sent-today').textContent = logs.filter(l => new Date(l.created_at).toDateString() === today).length;
      document.getElementById('dm-total-sent').textContent = logs.length;
    } catch(e) {}
  }

  function renderRecentPosts(posts) {
    var grid = document.getElementById('recent-posts-grid');
    if (!grid) return;
    if (posts.length === 0) {
      grid.innerHTML = '<div style="grid-column:1/-1;"><div class="empty-state"><div class="empty-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e1306c" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div><div class="empty-title">게시물 없음</div><div class="empty-desc">계정을 연결하면 게시물이 표시됩니다</div></div></div>';
      return;
    }
    // icon SVG helpers
    var iconVideo    = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
    var iconCarousel = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="7" width="16" height="14" rx="2"/><path d="M22 5v14"/></svg>';
    var iconImage    = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
    var heartIcon    = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>';
    var chatIcon     = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';

    grid.innerHTML = posts.map(function(p) {
      var typeIconHtml = p.media_type === 'VIDEO' ? iconVideo : p.media_type === 'CAROUSEL_ALBUM' ? iconCarousel : iconImage;
      var typeColor    = p.media_type === 'VIDEO' ? '#833ab4' : p.media_type === 'CAROUSEL_ALBUM' ? '#fd1d1d' : '#e1306c';
      var imgHtml = p.media_url
        ? '<img src="' + esc(p.media_url) + '" class="post-thumb" onerror="this.style.display=&quot;none&quot;;if(this.nextSibling)this.nextSibling.style.display=&quot;flex&quot;">'
        : '';
      var showPH   = p.media_url ? 'none' : 'flex';
      var plink    = encodeURIComponent(p.permalink || '#');
      var likes    = (p.like_count || 0).toLocaleString();
      var cmts     = (p.comments_count || 0).toLocaleString();
      var ds       = p.timestamp ? new Date(p.timestamp).toLocaleDateString('ko-KR', {month:'numeric',day:'numeric'}) : '';
      return '<div class="post-card" onclick="window.open(decodeURIComponent(this.dataset.url),this.dataset.target)" data-url="' + plink + '" data-target="_blank">' +
        imgHtml +
        '<div class="post-placeholder" style="display:' + showPH + ';background:linear-gradient(135deg,' + typeColor + '22,' + typeColor + '11);">' + typeIconHtml + '</div>' +
        '<div class="post-meta">' +
          '<div style="display:flex;gap:8px;font-size:11px;color:var(--text2);">' +
            '<span style="display:flex;align-items:center;gap:3px;">' + heartIcon + ' ' + likes + '</span>' +
            '<span style="display:flex;align-items:center;gap:3px;">' + chatIcon + ' ' + cmts + '</span>' +
          '</div>' +
          '<div style="font-size:10px;color:var(--text3);margin-top:3px;">' + ds + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderDashboardChart(labels, likesData, commentsData) {
    destroyChart('dashboardChart');
    const ctx = document.getElementById('dashboardChart').getContext('2d');
    charts.dashboardChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: '좋아요', data: likesData,    borderColor: '#e1306c', backgroundColor: 'rgba(225,48,108,.08)', tension: .42, fill: true, pointRadius: 4, pointHoverRadius: 6, pointBackgroundColor: '#e1306c' },
          { label: '댓글',   data: commentsData, borderColor: '#833ab4', backgroundColor: 'rgba(131,58,180,.08)', tension: .42, fill: true, pointRadius: 4, pointHoverRadius: 6, pointBackgroundColor: '#833ab4' }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { usePointStyle: true, padding: 16, font: { size: 12, family: 'Pretendard' } } } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } }, x: { grid: { display: false }, ticks: { font: { size: 11 } } } } }
    });
  }

  function destroyChart(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }

  // ===== INSIGHTS =====
  // ★ Meta 공식 User Insights 유효 메트릭 (v25.0)
  // reach, total_interactions, likes, comments, shares, saved, follows
  async function loadRealInsights() {
    const userId = getCurrentUserId();
    ['ins-reach','ins-impressions','ins-saves','ins-profile-views'].forEach(id => { const el = document.getElementById(id); if(el) el.textContent = '…'; });
    try {
      const res  = await igFetch('/api/instagram/insights?userId=' + userId + '&period=day');
      const data = await res.json();
      if (data.success && data.insights && data.insights.length > 0) {
        const insightMap = {};
        data.insights.forEach(ins => { insightMap[ins.name] = ins; });

        // ★ Meta 공식 메트릭명으로 매핑 (비공식 accounts_engaged, follows_and_unfollows 제거)
        const reach      = insightMap['reach'];             // 도달
        const totalInter = insightMap['total_interactions']; // 전체 인터랙션 (likes+comments+shares+saved)
        const saved      = insightMap['saved'];              // 저장수
        const follows    = insightMap['follows'];            // 팔로워 증가수 (공식 메트릭)

        // 값 추출 헬퍼: period=day → values[].value 합산
        function sumValues(metric) {
          if (!metric) return 0;
          return (metric.values||[]).reduce(function(s,v){ return s+(v.value||0); }, 0);
        }
        function fmtNum(n) { return n>=1000?(n/1000).toFixed(1)+'K':n.toLocaleString(); }

        var reachTotal   = sumValues(reach);
        var interTotal   = sumValues(totalInter);
        var savedTotal   = sumValues(saved);
        var followsTotal = sumValues(follows);

        // 도달
        if (reach) {
          document.getElementById('ins-reach').textContent = fmtNum(reachTotal);
          document.getElementById('ins-reach-change').textContent = '28일 합계';
          document.getElementById('ins-reach-change').className = 'stat-change ' + (reachTotal > 0 ? 'up' : 'neutral');
        }
        // 인게이지먼트 (total_interactions: likes+comments+shares+saved)
        if (totalInter) {
          document.getElementById('ins-impressions').textContent = fmtNum(interTotal);
          document.getElementById('ins-impressions-change').textContent = '28일 인게이지먼트';
          document.getElementById('ins-impressions-change').className = 'stat-change ' + (interTotal > 0 ? 'up' : 'neutral');
        }
        // 저장
        if (saved) {
          document.getElementById('ins-saves').textContent = fmtNum(savedTotal);
          document.getElementById('ins-saves-change').textContent = '28일 저장';
        }
        // 팔로워 증가 (공식 follows 메트릭)
        var followEl = document.getElementById('ins-profile-views');
        var followChEl = document.getElementById('ins-profile-change');
        if (followEl) {
          followEl.textContent = (followsTotal >= 0 ? '+' : '') + fmtNum(followsTotal);
          if (followChEl) {
            followChEl.textContent = '28일 팔로워 증감';
            followChEl.className = 'stat-change ' + (followsTotal > 0 ? 'up' : followsTotal < 0 ? 'down' : 'neutral');
          }
        }

        // 차트: reach + total_interactions 시계열
        if (reach) {
          const lbl   = (reach.values||[]).map(function(v) { const d=new Date(v.end_time||v.date||''); return (d.getMonth()+1) + '/' + d.getDate(); });
          const rData = (reach.values||[]).map(function(v){ return v.value||0; });
          const iData = totalInter
            ? (totalInter.values||[]).map(function(v){ return v.value||0; })
            : rData.map(function(){ return 0; });
          renderInsightCharts(lbl, rData, iData);
        } else { renderInsightChartsEmpty(); }
      } else { await loadInsightsFallback(userId); }
    } catch(e) { await loadInsightsFallback(userId); }
    renderHeatmap();
  }

  async function loadInsightsFallback(userId) {
    try {
      let posts = mediaCache;
      if (!posts || posts.length === 0) { const r=await igFetch('/api/instagram/media?userId='+userId+'&limit=20'); const d=await r.json(); posts=d.media||[]; mediaCache=posts; }
      if (posts.length > 0) {
        ['ins-reach','ins-impressions','ins-saves','ins-profile-views'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent='—'; });
        ['ins-reach-change','ins-impressions-change','ins-saves-change','ins-profile-change'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent='인사이트 권한 필요'; });
        const lbl  = posts.slice(0,7).reverse().map(p => { const d=new Date(p.timestamp); return (d.getMonth()+1)+'/'+(d.getDate()); });
        renderInsightCharts(lbl, posts.slice(0,7).reverse().map(p=>p.like_count||0), posts.slice(0,7).reverse().map(p=>(p.like_count||0)+(p.comments_count||0)));
      } else { renderInsightChartsEmpty(); }
    } catch(e) { renderInsightChartsEmpty(); }
  }

  function renderInsightCharts(labels, reachData, engagedData) {
    destroyChart('insightReachChart'); destroyChart('insightSourceChart');
    const ctx1 = document.getElementById('insightReachChart').getContext('2d');
    charts.insightReachChart = new Chart(ctx1, {
      type: 'line',
      data: { labels, datasets: [
        { label: '도달', data: reachData, borderColor: '#e1306c', backgroundColor: 'rgba(225,48,108,.07)', tension: .42, fill: true, pointRadius: 3, pointHoverRadius: 5 },
        { label: '인게이지먼트', data: engagedData, borderColor: '#833ab4', backgroundColor: 'rgba(131,58,180,.07)', tension: .42, fill: true, pointRadius: 3, pointHoverRadius: 5 }
      ]},
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'top', labels:{ usePointStyle:true, padding:14, font:{size:11} } } }, scales:{ y:{ beginAtZero:true, grid:{color:'#f1f5f9'}, ticks:{font:{size:10}} }, x:{ grid:{display:false}, ticks:{font:{size:10}} } } }
    });
    const ctx2 = document.getElementById('insightSourceChart').getContext('2d');
    charts.insightSourceChart = new Chart(ctx2, {
      type: 'doughnut',
      data: { labels:['피드','릴스','스토리','탐색','기타'], datasets:[{ data:[38,27,18,12,5], backgroundColor:['#e1306c','#833ab4','#fd1d1d','#fcb045','#94a3b8'], borderWidth:0 }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom', labels:{ usePointStyle:true, padding:12, font:{size:11} } } }, cutout:'65%' }
    });
  }

  function renderInsightChartsEmpty() {
    destroyChart('insightReachChart'); destroyChart('insightSourceChart');
    ['ins-reach','ins-impressions','ins-saves','ins-profile-views'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent='—'; });
    ['ins-reach-change','ins-impressions-change','ins-saves-change','ins-profile-change'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent='계정 연결 필요'; });
  }

  function setInsightPeriod(days, btn) {
    document.querySelectorAll('#panel-insights .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadRealInsights();
  }

  // ===== AUDIENCE =====
  async function loadRealAudience() {
    const userId = getCurrentUserId();
    try {
      const res = await igFetch('/api/instagram/audience?userId=' + userId);
      const data = await res.json();
      if (data.success && data.audience && data.audience.length > 0) { renderAudienceCharts(data.audience); }
      else { renderAudienceChartsFallback(); }
    } catch(e) { renderAudienceChartsFallback(); }
    renderFollowerGrowthChart();
  }

  // v25.0: 각 breakdown이 별도 항목으로 옴 (단일 dimension_key)
  // audience 배열: [ageItem, genderItem, countryItem] 각각 total_value.breakdowns[0]
  function renderAudienceCharts(audience) {
    const genderMap = {}, ageMap = {}, countryMap = {};
    audience.forEach(function(item) {
      if (!item.total_value) return;
      (item.total_value.breakdowns || []).forEach(function(bd) {
        if (!bd.dimension_keys || !bd.results) return;
        const key = bd.dimension_keys[0]; // v25.0: 단일 breakdown key
        bd.results.forEach(function(r) {
          const v   = r.value || 0;
          const dim = (r.dimension_values || [])[0]; // 단일 값
          if (!dim) return;
          if (key === 'gender')  { genderMap[dim]  = (genderMap[dim]||0)+v; }
          if (key === 'age')     { ageMap[dim]     = (ageMap[dim]||0)+v; }
          if (key === 'country') { countryMap[dim] = (countryMap[dim]||0)+v; }
        });
      });
    });

    // 성별 라벨 한국어화
    var genderLabelMap = { 'M':'남성', 'F':'여성', 'U':'기타', 'male':'남성', 'female':'여성' };
    var genderMapKo = {};
    Object.keys(genderMap).forEach(function(k){ var label = genderLabelMap[k] || k; genderMapKo[label] = (genderMapKo[label]||0) + genderMap[k]; });

    destroyChart('genderChart');
    if (Object.keys(genderMapKo).length > 0) {
      const gL = Object.keys(genderMapKo), gD = gL.map(k => genderMapKo[k]);
      charts.genderChart = new Chart(document.getElementById('genderChart').getContext('2d'), { type:'doughnut', data:{labels:gL, datasets:[{data:gD, backgroundColor:['#e1306c','#833ab4','#94a3b8'], borderWidth:0}]}, options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom', labels:{usePointStyle:true, padding:10, font:{size:11}}}}, cutout:'60%'} });
    } else { renderAudienceChartsFallback(); return; }

    destroyChart('ageChart');
    // 연령대 정렬 (13-17, 18-24, ...)
    const aK = Object.keys(ageMap).sort(), aD = aK.map(k => ageMap[k]);
    if (aK.length > 0) {
      charts.ageChart = new Chart(document.getElementById('ageChart').getContext('2d'), { type:'bar', data:{labels:aK, datasets:[{label:'팔로워', data:aD, backgroundColor:'rgba(225,48,108,.7)', borderRadius:5}]}, options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true, grid:{color:'#f1f5f9'}, ticks:{font:{size:10}}}, x:{grid:{display:false}, ticks:{font:{size:10}}}}} });
    }

    const locList = document.getElementById('location-list');
    if (locList && Object.keys(countryMap).length > 0) {
      const sorted = Object.entries(countryMap).sort((a,b) => b[1]-a[1]).slice(0,5);
      const total  = sorted.reduce((s,e) => s+e[1], 0);
      locList.innerHTML = sorted.map(([k,v]) => '<div class="metric-row"><span style="font-size:13px;font-weight:600;">'+esc(k)+'</span><span style="font-weight:800;color:var(--ig2);">'+(total>0?((v/total)*100).toFixed(1):'0')+'%</span></div>').join('');
    }
  }

  function renderAudienceChartsFallback() {
    destroyChart('genderChart'); destroyChart('ageChart');
    charts.genderChart = new Chart(document.getElementById('genderChart').getContext('2d'), { type:'doughnut', data:{labels:['여성','남성'], datasets:[{data:[62,38], backgroundColor:['#e1306c','#833ab4'], borderWidth:0}]}, options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom', labels:{usePointStyle:true, padding:10, font:{size:11}}}}, cutout:'60%'} });
    charts.ageChart = new Chart(document.getElementById('ageChart').getContext('2d'), { type:'bar', data:{labels:['13-17','18-24','25-34','35-44','45-54','55+'], datasets:[{label:'비율(%)', data:[8,32,38,14,6,2], backgroundColor:'rgba(225,48,108,.7)', borderRadius:5}]}, options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true, grid:{color:'#f1f5f9'}, ticks:{font:{size:10}}}, x:{grid:{display:false}, ticks:{font:{size:10}}}}} });
  }

  async function renderFollowerGrowthChart() {
    destroyChart('followerGrowthChart');
    const userId = getCurrentUserId();
    let followerCount = igProfile ? (igProfile.followers_count || 0) : 0;
    if (!followerCount) { try { const r=await igFetch('/api/instagram/me?userId='+userId); const d=await r.json(); if(d.success) followerCount=d.profile.followers_count||0; } catch(e) {} }
    const days = Array.from({length:30},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-(29-i)); return (d.getMonth()+1)+'/'+(d.getDate()); });
    const base = Math.max(followerCount-200, 0);
    const data = Array.from({length:30},(_,i) => Math.round(base+(followerCount-base)*(i/29)));
    charts.followerGrowthChart = new Chart(document.getElementById('followerGrowthChart').getContext('2d'), {
      type:'line', data:{ labels:days, datasets:[{label:'팔로워 수', data, borderColor:'#e1306c', backgroundColor:'rgba(225,48,108,.07)', tension:.42, fill:true, pointRadius:0, pointHoverRadius:5}] },
      options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:false, grid:{color:'#f1f5f9'}, ticks:{font:{size:10}}}, x:{grid:{display:false}, ticks:{maxTicksLimit:8, font:{size:10}}}} }
    });
  }

  function renderHeatmap() {
    const grid = document.getElementById('heatmap-grid');
    if (!grid) return;
    const days  = ['월','화','수','목','금','토','일'];
    const hours = [9,10,11,12,13,14,15,16,17,18,19,20,21];
    const data  = { '월':[20,35,30,50,45,40,38,55,60,80,75,65,45],'화':[25,38,32,52,48,42,40,58,65,85,78,68,48],'수':[22,36,31,51,46,41,39,56,62,82,76,66,46],'목':[28,40,35,55,50,45,42,60,68,88,82,70,50],'금':[30,42,38,58,53,48,45,62,70,90,85,72,52],'토':[45,60,55,70,68,65,62,75,80,95,92,85,70],'일':[40,55,50,65,62,60,58,70,75,90,88,80,65] };
    grid.innerHTML = '';
    days.forEach(day => {
      const col = document.createElement('div');
      col.style.cssText = 'text-align:center;';
      col.innerHTML = '<div style="font-size:11px;font-weight:700;color:var(--text2);padding:4px 0;">' + day + '</div>';
      hours.forEach((h, hi) => {
        const v = data[day][hi], alpha = v / 100;
        const div = document.createElement('div');
        div.className = 'heatmap-cell';
        div.title = day + ' ' + h + '시 (활성도 ' + v + '%)';
        div.style.background = 'rgba(225,48,108,' + alpha + ')';
        div.style.color = v > 60 ? '#fff' : 'var(--text3)';
        div.textContent = v > 55 ? h + '시' : '';
        col.appendChild(div);
      });
      grid.appendChild(col);
    });
  }

  // ===== CONTENT ANALYSIS =====
  let currentContentFilter = 'all';
  function setContentFilter(type, btn) {
    currentContentFilter = type;
    document.querySelectorAll('#panel-content .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadContentAnalysis();
  }

  async function loadContentAnalysis() {
    const userId = getCurrentUserId();
    document.getElementById('content-total-badge').textContent = '로딩중...';
    const body = document.getElementById('content-table-body');
    body.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text3);">데이터 불러오는 중...</td></tr>';
    try {
      let posts = mediaCache;
      if (!posts || posts.length === 0) { const r=await igFetch('/api/instagram/media?userId='+userId+'&limit=50'); const d=await r.json(); if(d.success){ posts=d.media||[]; mediaCache=posts; } }
      const typeMap   = {'IMAGE':'이미지','VIDEO':'동영상','CAROUSEL_ALBUM':'카루셀'};
      const filterMap = {'image':'IMAGE','video':'VIDEO','reel':'VIDEO','carousel':'CAROUSEL_ALBUM'};
      let filtered = posts;
      if (currentContentFilter !== 'all' && filterMap[currentContentFilter]) { filtered = posts.filter(p => p.media_type === filterMap[currentContentFilter]); }
      document.getElementById('content-total-badge').textContent = filtered.length + '개';
      if (filtered.length === 0) {
        body.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text3);">게시물이 없거나 계정 연결이 필요합니다</td></tr>';
      } else {
        const followers = igProfile ? (igProfile.followers_count || 1) : 1;
        body.innerHTML = filtered.map(p => {
          const typeLabel = typeMap[p.media_type] || p.media_type || '—';
          const er      = followers > 0 ? (((p.like_count||0)+(p.comments_count||0))/followers*100).toFixed(2) : '0.00';
          const erNum   = parseFloat(er);
          const caption = (p.caption||'').substring(0,50) + ((p.caption||'').length > 50 ? '…' : '');
          const date    = p.timestamp ? new Date(p.timestamp).toLocaleDateString('ko-KR') : '—';
          const typeColor = p.media_type === 'VIDEO' ? '#833ab4' : p.media_type === 'CAROUSEL_ALBUM' ? '#fd1d1d' : '#e1306c';
          const thumb   = p.media_url
            ? '<img src="' + esc(p.media_url) + '" style="width:40px;height:40px;object-fit:cover;border-radius:8px;flex-shrink:0;" onerror="this.style.display=&quot;none&quot;">'
            : '<div style="width:40px;height:40px;border-radius:8px;background:' + typeColor + '18;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="' + typeColor + '" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>';
          const erColor = erNum >= 3 ? 'var(--green)' : erNum >= 1 ? 'var(--amber)' : 'var(--red)';
          const _plink  = encodeURIComponent(p.permalink || '#');
          return '<tr onclick="window.open(decodeURIComponent(this.dataset.url),this.dataset.target)" data-url="' + _plink + '" data-target="_blank">' +
            '<td><div style="display:flex;align-items:center;gap:10px;">' + thumb + '<span style="font-size:13px;color:var(--text2);">' + (esc(caption)||'(캡션 없음)') + '</span></div></td>' +
            '<td class="center"><span class="tag" style="font-size:11px;">' + esc(typeLabel) + '</span></td>' +
            '<td class="center" style="font-weight:700;color:var(--ig2);">' + (p.like_count||0).toLocaleString() + '</td>' +
            '<td class="center" style="font-weight:700;color:#833ab4;">' + (p.comments_count||0).toLocaleString() + '</td>' +
            '<td class="center" style="color:var(--text3);">—</td>' +
            '<td class="center" style="font-weight:700;color:' + erColor + ';">' + er + '%</td>' +
            '<td class="center" style="font-size:12px;color:var(--text3);">' + date + '</td>' +
            '</tr>';
        }).join('');
      }
      // charts
      const typeCount = {'이미지':0,'동영상':0,'카루셀':0};
      posts.forEach(p => { const t = typeMap[p.media_type]; if(t && typeCount[t]!==undefined) typeCount[t]++; });
      destroyChart('contentTypeChart');
      charts.contentTypeChart = new Chart(document.getElementById('contentTypeChart').getContext('2d'), { type:'doughnut', data:{labels:Object.keys(typeCount), datasets:[{data:Object.values(typeCount), backgroundColor:['#e1306c','#833ab4','#fd1d1d'], borderWidth:0}]}, options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom', labels:{usePointStyle:true, padding:12, font:{size:11}}}}, cutout:'60%'} });
      const dayEng=['일','월','화','수','목','금','토'], daySum=[0,0,0,0,0,0,0], dayCnt=[0,0,0,0,0,0,0];
      posts.forEach(p => { if(!p.timestamp) return; const dow=new Date(p.timestamp).getDay(); daySum[dow]+=((p.like_count||0)+(p.comments_count||0)); dayCnt[dow]++; });
      const dayAvg = daySum.map((s,i) => dayCnt[i]>0?parseFloat((s/dayCnt[i]).toFixed(1)):0);
      destroyChart('dayOfWeekChart');
      charts.dayOfWeekChart = new Chart(document.getElementById('dayOfWeekChart').getContext('2d'), { type:'bar', data:{labels:dayEng, datasets:[{label:'평균 인게이지먼트', data:dayAvg, backgroundColor:'rgba(225,48,108,.7)', borderRadius:6}]}, options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true, grid:{color:'#f1f5f9'}, ticks:{font:{size:10}}}, x:{grid:{display:false}, ticks:{font:{size:10}}}}} });
    } catch(e) {
      body.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text3);">데이터를 불러올 수 없습니다: ' + esc(e.message) + '</td></tr>';
    }
  }

  // ===== CALENDAR =====
  function renderCalendar() {
    const months = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
    document.getElementById('cal-title').textContent = calYear + '년 ' + months[calMonth];
    const grid     = document.getElementById('calendar-grid');
    const days     = ['일','월','화','수','목','금','토'];
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInM  = new Date(calYear, calMonth + 1, 0).getDate();
    const today    = new Date();
    grid.innerHTML = days.map(d => '<div style="text-align:center;font-size:11px;font-weight:700;color:var(--text3);padding:8px 0;">' + d + '</div>').join('');
    for (let i = 0; i < firstDay; i++) grid.innerHTML += '<div></div>';
    for (let d = 1; d <= daysInM; d++) {
      const isToday = d===today.getDate() && calMonth===today.getMonth() && calYear===today.getFullYear();
      grid.innerHTML += '<div onclick="selectCalDay(' + d + ')" class="cal-day' + (isToday?' cal-today':'') + '" style="text-align:center;padding:8px 4px;font-size:13px;font-weight:' + (isToday?'800':'500') + ';border-radius:8px;cursor:pointer;transition:background .15s;' + (isToday?'background:var(--grad);color:#fff;':'color:var(--text1);') + '">' + d + '</div>';
    }
  }
  function changeCalMonth(delta) { calMonth += delta; if(calMonth>11){calMonth=0;calYear++;} if(calMonth<0){calMonth=11;calYear--;} renderCalendar(); }
  function selectCalDay(d) { console.log('날짜 선택:', d); }
  // ===== PUBLISH MODAL =====
  function openPostModal() {
    // 기존 모달 제거
    const old = document.getElementById('publish-modal-overlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'publish-modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
    overlay.innerHTML = \`
      <div id="publish-modal" style="background:#fff;border-radius:20px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.22);display:flex;flex-direction:column;">
        <!-- Header -->
        <div style="padding:22px 24px 16px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#833ab4,#e1306c);display:flex;align-items:center;justify-content:center;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </div>
            <div>
              <div style="font-size:16px;font-weight:800;color:#0f172a;">Instagram 게시물 발행</div>
              <div style="font-size:12px;color:#94a3b8;">instagram_business_content_publish</div>
            </div>
          </div>
          <button onclick="closePublishModal()" style="background:#f1f5f9;border:none;border-radius:8px;width:32px;height:32px;cursor:pointer;display:flex;align-items:center;justify-content:center;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <!-- Body -->
        <div style="padding:20px 24px;flex:1;">
          <!-- 미디어 타입 선택 -->
          <div style="margin-bottom:18px;">
            <label style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:8px;">미디어 타입</label>
            <div style="display:flex;gap:8px;" id="media-type-group">
              <button class="type-btn type-active" data-type="IMAGE" onclick="selectMediaType('IMAGE',this)" style="flex:1;padding:9px 0;border-radius:9px;border:2px solid #e1306c;background:#fdf2f8;color:#e1306c;font-size:13px;font-weight:700;cursor:pointer;">🖼️ 이미지</button>
              <button class="type-btn" data-type="REELS" onclick="selectMediaType('REELS',this)" style="flex:1;padding:9px 0;border-radius:9px;border:2px solid #e8edf4;background:#fff;color:#475569;font-size:13px;font-weight:700;cursor:pointer;">🎬 릴스</button>
              <button class="type-btn" data-type="CAROUSEL" onclick="selectMediaType('CAROUSEL',this)" style="flex:1;padding:9px 0;border-radius:9px;border:2px solid #e8edf4;background:#fff;color:#475569;font-size:13px;font-weight:700;cursor:pointer;">🗂️ 카루셀</button>
            </div>
          </div>

          <!-- IMAGE 입력 -->
          <div id="field-image" style="margin-bottom:16px;">
            <label style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px;">이미지 URL <span style="color:#e1306c;">*</span></label>
            <input id="pub-image-url" type="url" placeholder="https://example.com/image.jpg (공개 접근 가능한 URL)" style="width:100%;padding:10px 14px;border:2px solid #e8edf4;border-radius:10px;font-size:13px;outline:none;font-family:inherit;transition:border .15s;" onfocus="this.style.borderColor='#e1306c'" onblur="this.style.borderColor='#e8edf4'" oninput="updatePublishPreview()"/>
          </div>

          <!-- REELS/VIDEO 입력 -->
          <div id="field-video" style="margin-bottom:16px;display:none;">
            <label style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px;">동영상 URL <span style="color:#e1306c;">*</span></label>
            <input id="pub-video-url" type="url" placeholder="https://example.com/video.mp4 (공개 접근 가능한 URL)" style="width:100%;padding:10px 14px;border:2px solid #e8edf4;border-radius:10px;font-size:13px;outline:none;font-family:inherit;transition:border .15s;" onfocus="this.style.borderColor='#e1306c'" onblur="this.style.borderColor='#e8edf4'"/>
            <div style="margin-top:8px;">
              <label style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px;">커버 이미지 URL (선택)</label>
              <input id="pub-cover-url" type="url" placeholder="https://example.com/cover.jpg" style="width:100%;padding:10px 14px;border:2px solid #e8edf4;border-radius:10px;font-size:13px;outline:none;font-family:inherit;transition:border .15s;" onfocus="this.style.borderColor='#e1306c'" onblur="this.style.borderColor='#e8edf4'"/>
            </div>
          </div>

          <!-- CAROUSEL 입력 -->
          <div id="field-carousel" style="margin-bottom:16px;display:none;">
            <label style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px;">이미지 URL 목록 <span style="color:#e1306c;">*</span> <span style="font-weight:400;color:#94a3b8;">(2~10개, 줄바꿈으로 구분)</span></label>
            <textarea id="pub-carousel-urls" rows="5" placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg&#10;https://example.com/image3.jpg" style="width:100%;padding:10px 14px;border:2px solid #e8edf4;border-radius:10px;font-size:13px;outline:none;font-family:inherit;resize:vertical;transition:border .15s;line-height:1.6;" onfocus="this.style.borderColor='#e1306c'" onblur="this.style.borderColor='#e8edf4'"></textarea>
          </div>

          <!-- 이미지 미리보기 -->
          <div id="pub-preview-wrap" style="margin-bottom:16px;display:none;">
            <img id="pub-preview-img" src="" alt="미리보기" style="width:100%;max-height:240px;object-fit:cover;border-radius:12px;border:2px solid #e8edf4;"/>
          </div>

          <!-- 캡션 -->
          <div style="margin-bottom:16px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
              <label style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;">캡션</label>
              <span id="pub-caption-count" style="font-size:11px;color:#94a3b8;">0 / 2200</span>
            </div>
            <textarea id="pub-caption" rows="4" maxlength="2200" placeholder="게시물 캡션을 입력하세요. 해시태그도 추가할 수 있습니다. #마케팅 #슈퍼플레이스" style="width:100%;padding:10px 14px;border:2px solid #e8edf4;border-radius:10px;font-size:13px;outline:none;font-family:inherit;resize:vertical;line-height:1.6;transition:border .15s;" onfocus="this.style.borderColor='#e1306c'" onblur="this.style.borderColor='#e8edf4'" oninput="document.getElementById('pub-caption-count').textContent=this.value.length+' / 2200'"></textarea>
          </div>

          <!-- 에러 메시지 -->
          <div id="pub-error" style="display:none;padding:12px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;color:#dc2626;font-size:13px;margin-bottom:14px;"></div>

          <!-- 성공 메시지 -->
          <div id="pub-success" style="display:none;padding:12px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;color:#16a34a;font-size:13px;margin-bottom:14px;"></div>
        </div>

        <!-- Footer -->
        <div style="padding:16px 24px 20px;border-top:1px solid #f1f5f9;display:flex;gap:10px;flex-shrink:0;">
          <button onclick="closePublishModal()" style="flex:1;padding:12px;border-radius:10px;border:2px solid #e8edf4;background:#fff;color:#475569;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;">취소</button>
          <button id="pub-submit-btn" onclick="submitPublish()" style="flex:2;padding:12px;border-radius:10px;border:none;background:linear-gradient(135deg,#833ab4,#e1306c);color:#fff;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            Instagram에 발행하기
          </button>
        </div>
      </div>
    \`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closePublishModal(); });
  }

  function closePublishModal() {
    const el = document.getElementById('publish-modal-overlay');
    if (el) el.remove();
  }

  var _currentMediaType = 'IMAGE';
  function selectMediaType(type, btn) {
    _currentMediaType = type;
    // 버튼 스타일 토글
    document.querySelectorAll('#media-type-group .type-btn').forEach(function(b) {
      b.style.border = '2px solid #e8edf4';
      b.style.background = '#fff';
      b.style.color = '#475569';
    });
    btn.style.border = '2px solid #e1306c';
    btn.style.background = '#fdf2f8';
    btn.style.color = '#e1306c';
    // 필드 표시/숨김
    document.getElementById('field-image').style.display    = type === 'IMAGE'    ? 'block' : 'none';
    document.getElementById('field-video').style.display    = type === 'REELS'    ? 'block' : 'none';
    document.getElementById('field-carousel').style.display = type === 'CAROUSEL' ? 'block' : 'none';
    document.getElementById('pub-preview-wrap').style.display = 'none';
  }

  function updatePublishPreview() {
    const url = document.getElementById('pub-image-url').value.trim();
    const wrap = document.getElementById('pub-preview-wrap');
    const img  = document.getElementById('pub-preview-img');
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      img.src = url;
      wrap.style.display = 'block';
      img.onerror = function() { wrap.style.display = 'none'; };
    } else {
      wrap.style.display = 'none';
    }
  }

  async function submitPublish() {
    const btn     = document.getElementById('pub-submit-btn');
    const errEl   = document.getElementById('pub-error');
    const succEl  = document.getElementById('pub-success');
    errEl.style.display  = 'none';
    succEl.style.display = 'none';

    const caption = document.getElementById('pub-caption').value.trim();

    // 유효성 검사
    var payload = { mediaType: _currentMediaType, caption: caption };
    if (_currentMediaType === 'IMAGE') {
      const imageUrl = document.getElementById('pub-image-url').value.trim();
      if (!imageUrl) { errEl.textContent = '이미지 URL을 입력해주세요.'; errEl.style.display = 'block'; return; }
      payload.imageUrl = imageUrl;
    } else if (_currentMediaType === 'REELS') {
      const videoUrl = document.getElementById('pub-video-url').value.trim();
      if (!videoUrl) { errEl.textContent = '동영상 URL을 입력해주세요.'; errEl.style.display = 'block'; return; }
      payload.videoUrl = videoUrl;
      const coverUrl = document.getElementById('pub-cover-url').value.trim();
      if (coverUrl) payload.coverUrl = coverUrl;
    } else if (_currentMediaType === 'CAROUSEL') {
      const lines = document.getElementById('pub-carousel-urls').value.trim().split('\\n').map(function(l){return l.trim();}).filter(function(l){return l.length>0;});
      if (lines.length < 2) { errEl.textContent = '카루셀은 이미지 URL이 2개 이상 필요합니다.'; errEl.style.display = 'block'; return; }
      if (lines.length > 10) { errEl.textContent = '카루셀은 최대 10개까지 가능합니다.'; errEl.style.display = 'block'; return; }
      payload.children = lines;
    }

    // 발행 버튼 로딩 상태
    btn.disabled = true;
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="animation:spin 1s linear infinite;"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg> 발행 중...';

    try {
      const res  = await igFetch('/api/instagram/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        succEl.innerHTML = '✅ ' + esc(data.message || '게시물이 성공적으로 발행되었습니다!') + (data.mediaId ? ' (ID: ' + esc(data.mediaId) + ')' : '');
        succEl.style.display = 'block';
        btn.innerHTML = '✅ 발행 완료';
        btn.style.background = '#22c55e';
        // 3초 후 모달 닫고 콘텐츠 새로고침
        setTimeout(function() {
          closePublishModal();
          loadContentAnalysis();
          showToast('🎉 Instagram에 게시물이 발행되었습니다!');
        }, 2500);
      } else {
        errEl.textContent = data.error || '발행에 실패했습니다. 다시 시도해주세요.';
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Instagram에 발행하기';
      }
    } catch (e) {
      errEl.textContent = '네트워크 오류가 발생했습니다. 다시 시도해주세요.';
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Instagram에 발행하기';
    }
  }

  // ===== DM RULES =====
  async function loadDmRulesFromApi() {
    try { const r=await igFetch('/api/instagram/dm-rules'); if(r.ok){ const d=await r.json(); dmRules=d.rules||[]; } } catch(e) {}
    const saved = localStorage.getItem('ig_dm_rules');
    if (saved && dmRules.length === 0) dmRules = JSON.parse(saved);
  }

  function renderDmRules() {
    const list   = document.getElementById('dm-rules-list');
    const empty  = document.getElementById('dm-rules-empty');
    const active = dmRules.filter(r => r.active).length;
    document.getElementById('sb-active-rules').textContent = active;
    document.getElementById('dm-active-count').textContent  = active;
    if (dmRules.length === 0) { list.style.display='none'; empty.style.display='block'; return; }
    list.style.display='flex'; empty.style.display='none';

    // SVG icons for rule cards
    var keyIcon  = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6"/><path d="M15.5 7.5l3 3"/></svg>';
    var sendIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
    var calIcon  = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';

    list.innerHTML = dmRules.map(function(r, idx) {
      var activeClass  = r.active ? 'active-rule' : '';
      var badgeClass   = r.active ? 'status-on' : 'status-off';
      var badgeText    = r.active ? '활성' : '비활성';
      var toggleStyle  = r.active ? 'border-color:var(--red);color:var(--red);' : 'border-color:var(--green);color:var(--green);';
      var toggleText   = r.active ? '비활성화' : '활성화';
      var msgPreview   = r.message ? esc(r.message.substring(0,100)) + (r.message.length>100?'…':'') : '';
      var postUrlHtml  = r.postUrl ? '<div style="font-size:11px;color:var(--text3);margin-top:6px;display:flex;align-items:center;gap:4px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>' + esc(r.postUrl) + '</div>' : '';
      var kwHtml       = (r.keywords||[]).map(function(k){ return '<span class="tag" style="font-size:11px;">' + keyIcon + ' ' + esc(k) + '</span>'; }).join('');
      var cooldownText = r.cooldown > 0 ? r.cooldown + '일' : '없음';
      var createdText  = r.createdAt ? new Date(r.createdAt).toLocaleDateString('ko-KR') : '—';
      return '<div class="rule-card ' + activeClass + '">' +
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
              '<span style="font-size:15px;font-weight:800;color:var(--text1);">' + esc(r.name) + '</span>' +
              '<span class="status-badge ' + badgeClass + '">' + badgeText + '</span>' +
            '</div>' +
            '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">' + kwHtml + '</div>' +
            '<div style="font-size:13px;color:var(--text2);background:#f8fafc;padding:10px 14px;border-radius:8px;line-height:1.6;border:1px solid var(--border);">' + msgPreview + '</div>' +
            postUrlHtml +
          '</div>' +
          '<div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;">' +
            '<button onclick="editDmRule(' + idx + ')" class="btn btn-outline btn-xs">수정</button>' +
            '<button onclick="toggleRule(' + idx + ')" class="btn btn-xs" style="border:1.5px solid;border-radius:7px;background:var(--surface);' + toggleStyle + '">' + toggleText + '</button>' +
            '<button onclick="deleteRule(' + idx + ')" class="btn btn-ghost btn-xs">삭제</button>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:16px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border);font-size:12px;color:var(--text3);">' +
          '<span style="display:flex;align-items:center;gap:4px;">' + sendIcon + ' 발송: <strong style="color:var(--text1);">' + (r.sentCount||0) + '건</strong></span>' +
          '<span style="display:flex;align-items:center;gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> 재발송 제한: ' + cooldownText + '</span>' +
          '<span style="display:flex;align-items:center;gap:4px;">' + calIcon + ' 생성: ' + createdText + '</span>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function openDmRuleModal(editIdx) {
    document.getElementById('rule-edit-id').value       = editIdx !== undefined ? editIdx : '';
    document.getElementById('rule-name').value          = '';
    document.getElementById('rule-keywords-input').value = '';
    document.getElementById('rule-message').value       = '';
    document.getElementById('rule-post-url').value      = '';
    document.getElementById('rule-cooldown').value      = '1';
    ruleKeywords = [];
    renderKeywordTags();
    document.getElementById('rule-active').checked = true;
    updateToggleUI(true);
    if (editIdx !== undefined) {
      const r = dmRules[editIdx];
      document.getElementById('rule-name').value     = r.name;
      document.getElementById('rule-message').value  = r.message;
      document.getElementById('rule-post-url').value = r.postUrl || '';
      document.getElementById('rule-cooldown').value = r.cooldown || '1';
      ruleKeywords = [...(r.keywords || [])];
      renderKeywordTags();
      document.getElementById('rule-active').checked = r.active;
      updateToggleUI(r.active);
    }
    document.getElementById('dm-rule-modal').style.display = 'flex';
  }
  function editDmRule(idx) { openDmRuleModal(idx); }
  function closeDmRuleModal() { document.getElementById('dm-rule-modal').style.display = 'none'; }

  function handleKeywordInput(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = e.target.value.replace(/,/g,'').trim();
      if (val && !ruleKeywords.includes(val)) { ruleKeywords.push(val); renderKeywordTags(); }
      e.target.value = '';
    }
  }
  function renderKeywordTags() {
    document.getElementById('rule-keywords-tags').innerHTML = ruleKeywords.map(function(k,i){
      return '<span class="tag">' + esc(k) + ' <span class="tag-remove" onclick="removeKeyword(' + i + ')">×</span></span>';
    }).join('');
  }
  function removeKeyword(i) { ruleKeywords.splice(i,1); renderKeywordTags(); }

  function toggleRuleActive() { const cb=document.getElementById('rule-active'); cb.checked=!cb.checked; updateToggleUI(cb.checked); }
  function updateToggleUI(active) {
    const toggle = document.getElementById('rule-toggle');
    const label  = document.getElementById('rule-active-label');
    toggle.style.background = active ? 'var(--green)' : 'var(--text3)';
    toggle.querySelector('.toggle-thumb').style.left = active ? 'calc(100% - 22px)' : '2px';
    label.textContent = active ? '활성' : '비활성';
    label.style.color = active ? 'var(--green)' : 'var(--text3)';
  }

  async function saveDmRule() {
    const inp = document.getElementById('rule-keywords-input').value.trim();
    if (inp) { inp.split(',').forEach(k => { k=k.trim(); if(k&&!ruleKeywords.includes(k)) ruleKeywords.push(k); }); }
    const name    = document.getElementById('rule-name').value.trim();
    const message = document.getElementById('rule-message').value.trim();
    if (!name)                 { showToast('규칙 이름을 입력해주세요.'); return; }
    if (ruleKeywords.length===0){ showToast('키워드를 최소 1개 이상 입력해주세요.'); return; }
    if (!message)              { showToast('DM 메시지를 입력해주세요.'); return; }
    const rule = { name, keywords:ruleKeywords, message, postUrl:document.getElementById('rule-post-url').value.trim(), cooldown:parseInt(document.getElementById('rule-cooldown').value), active:document.getElementById('rule-active').checked, sentCount:0, createdAt:new Date().toISOString() };
    const editIdx = document.getElementById('rule-edit-id').value;
    if (editIdx !== '') { rule.sentCount=dmRules[editIdx].sentCount||0; rule.createdAt=dmRules[editIdx].createdAt; dmRules[editIdx]=rule; } else { dmRules.push(rule); }
    try { await igFetch('/api/instagram/dm-rules', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({rule, editIdx:editIdx!==''?parseInt(editIdx):null}) }); } catch(e) {}
    localStorage.setItem('ig_dm_rules', JSON.stringify(dmRules));
    closeDmRuleModal();
    renderDmRules();
    showToast('규칙이 저장되었습니다!');
  }

  function toggleRule(idx) { dmRules[idx].active=!dmRules[idx].active; localStorage.setItem('ig_dm_rules',JSON.stringify(dmRules)); renderDmRules(); }
  function deleteRule(idx) { if(!confirm('이 규칙을 삭제하시겠습니까?')) return; dmRules.splice(idx,1); localStorage.setItem('ig_dm_rules',JSON.stringify(dmRules)); renderDmRules(); showToast('규칙이 삭제되었습니다.'); }

  // ===== APIFY DM =====
  async function loadApifySession() {
    try {
      const r = await igFetch('/api/instagram/apify-session');
      const d = await r.json();
      if (d.ok) {
        var hasKey = d.hasApiKey;
        var hasSes = !!d.sessionId;
        var keyTxt = hasKey ? '✅ APIFY_API_KEY 설정됨' : '⚠️ APIFY_API_KEY 미설정 — Cloudflare 환경변수 확인 필요';
        var badgeHtml = hasSes
          ? '<span class="apify-status-ok">✓ 세션ID 저장됨</span>'
          : '<span class="apify-status-warn">세션ID 미설정</span>';

        // DM 패널 요소
        var inp = document.getElementById('apify-session-input');
        if (inp) { inp.value = hasSes ? '••••••••' : ''; inp.dataset.saved = hasSes ? '1' : ''; }
        var keyStatus = document.getElementById('apify-key-status');
        if (keyStatus) keyStatus.textContent = keyTxt;
        var badge = document.getElementById('apify-session-status-badge');
        if (badge) badge.innerHTML = badgeHtml;

        // 계정 패널 요소 (disconnected)
        var aKeyStatus = document.getElementById('acct-apify-key-status');
        if (aKeyStatus) aKeyStatus.textContent = keyTxt;
        var aBadge = document.getElementById('acct-session-badge');
        if (aBadge) aBadge.innerHTML = badgeHtml;
        var aInp = document.getElementById('acct-session-input');
        if (aInp) { aInp.value = hasSes ? '••••••••' : ''; aInp.dataset.saved = hasSes ? '1' : ''; }

        // 계정 패널 요소 (connected)
        var cKeyStatus = document.getElementById('acct-apify-key-status-c');
        if (cKeyStatus) cKeyStatus.textContent = keyTxt;
        var cBadge = document.getElementById('acct-session-badge-c');
        if (cBadge) cBadge.innerHTML = badgeHtml;
        var cInp = document.getElementById('acct-session-input-c');
        if (cInp) { cInp.value = hasSes ? '••••••••' : ''; cInp.dataset.saved = hasSes ? '1' : ''; }
      }
    } catch(e) {}
  }

  async function saveApifySession() {
    const inp = document.getElementById('apify-session-input');
    const val = inp ? inp.value.trim() : '';
    if (!val || val === '••••••••') { showToast('세션ID를 입력해주세요.'); return; }
    try {
      const r = await igFetch('/api/instagram/apify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: val })
      });
      const d = await r.json();
      if (d.ok) { showToast('✅ 세션ID가 저장되었습니다!'); loadApifySession(); }
      else showToast('저장 실패: ' + (d.error || '알 수 없는 오류'));
    } catch(e) { showToast('오류가 발생했습니다.'); }
  }

  // 계정 패널에서 세션ID 저장 (suffix: '' = disconnected, 'c' = connected)
  async function saveAccountApifySession(suffix) {
    var sfx = suffix || '';
    var inputId = sfx ? 'acct-session-input-' + sfx : 'acct-session-input';
    var msgId   = sfx ? 'acct-session-msg-' + sfx   : 'acct-session-msg';
    var btnId   = sfx ? 'acct-session-save-btn-' + sfx : 'acct-session-save-btn';
    var inp = document.getElementById(inputId);
    var msg = document.getElementById(msgId);
    var btn = document.getElementById(btnId);
    var val = inp ? inp.value.trim() : '';
    if (!val || val === '••••••••') {
      if (msg) { msg.textContent = '세션ID를 입력해주세요.'; msg.style.cssText = 'display:block;padding:7px 11px;border-radius:7px;font-size:12px;background:#fef3c7;border:1px solid #fde68a;color:#92400e;'; }
      return;
    }
    if (btn) { btn.disabled = true; btn.textContent = '저장 중...'; }
    try {
      const r = await igFetch('/api/instagram/apify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: val })
      });
      const d = await r.json();
      if (d.ok) {
        if (msg) { msg.textContent = '✅ 세션ID가 저장되었습니다! DM 자동화에 사용됩니다.'; msg.style.cssText = 'display:block;padding:7px 11px;border-radius:7px;font-size:12px;background:#dcfce7;border:1px solid #bbf7d0;color:#15803d;'; }
        showToast('✅ 세션ID가 저장되었습니다!');
        loadApifySession();
      } else {
        if (msg) { msg.textContent = '저장 실패: ' + (d.error || '알 수 없는 오류'); msg.style.cssText = 'display:block;padding:7px 11px;border-radius:7px;font-size:12px;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;'; }
      }
    } catch(e) {
      if (msg) { msg.textContent = '네트워크 오류가 발생했습니다.'; msg.style.cssText = 'display:block;padding:7px 11px;border-radius:7px;font-size:12px;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;'; }
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '저장'; }
    }
  }

  async function sendApifyDM() {
    const rawUsernames = (document.getElementById('apify-target-usernames') || {}).value || '';
    const message = ((document.getElementById('apify-dm-message') || {}).value || '').trim();
    const delay = parseInt((document.getElementById('apify-delay') || {}).value) || 60;
    const usernames = rawUsernames.replace(/,/g, '\\n').split('\\n').map(function(s) { return s.trim().replace(/^@/, ''); }).filter(Boolean);
    if (!usernames.length) { showToast('발송 대상 유저네임을 입력해주세요.'); return; }
    if (!message) { showToast('메시지를 입력해주세요.'); return; }
    const btn = document.getElementById('apify-send-btn');
    const resultEl = document.getElementById('apify-send-result');
    if (btn) { btn.disabled = true; btn.textContent = '발송 중...'; }
    if (resultEl) resultEl.style.display = 'none';
    try {
      const r = await igFetch('/api/instagram/dm-send-apify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames: usernames, message: message, delay: delay })
      });
      const d = await r.json();
      if (d.ok) {
        if (resultEl) { resultEl.textContent = '✅ ' + d.message; resultEl.style.color = 'var(--green)'; resultEl.style.display = 'block'; }
        showToast('✅ DM 발송이 시작되었습니다!');
        loadDmLogs();
      } else {
        if (resultEl) { resultEl.textContent = '❌ ' + (d.error || '발송 실패'); resultEl.style.color = 'var(--red)'; resultEl.style.display = 'block'; }
      }
    } catch(e) {
      if (resultEl) { resultEl.textContent = '❌ 오류: ' + (e.message || e); resultEl.style.color = 'var(--red)'; resultEl.style.display = 'block'; }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> DM 발송 시작';
      }
    }
  }

  // ===== DM LOGS =====
  async function loadDmLogs() {
    try {
      const r = await igFetch('/api/instagram/dm-logs?limit=50');
      const d = await r.json();
      const logs = d.logs || [];
      document.getElementById('dm-log-total-badge').textContent = '총 ' + logs.length + '건';
      const body = document.getElementById('dm-logs-body');
      if (logs.length === 0) { body.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text3);">발송 내역이 없습니다</td></tr>'; return; }
      body.innerHTML = logs.map(l => {
        const uname      = '@' + (l.recipient_username || l.recipient_id);
        const msg        = (l.message||'').substring(0,50) + ((l.message||'').length>50?'…':'');
        const statusClass = l.status==='sent'?'status-on':'status-off';
        const statusText  = l.status==='sent'?'발송됨':'실패';
        const dateStr     = new Date(l.created_at).toLocaleString('ko-KR');
        return '<tr><td style="font-weight:600;color:var(--text1);">' + esc(uname) + '</td><td><span class="tag" style="font-size:11px;">' + esc(l.trigger_keyword) + '</span></td><td style="font-size:13px;color:var(--text2);">' + esc(msg) + '</td><td class="center"><span class="status-badge ' + statusClass + '">' + statusText + '</span></td><td class="center" style="font-size:12px;color:var(--text3);">' + dateStr + '</td></tr>';
      }).join('');
    } catch(e) { document.getElementById('dm-logs-body').innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text3);">데이터를 불러올 수 없습니다</td></tr>'; }
  }

  // ===== WEBHOOK =====
  function initWebhook() { document.getElementById('webhook-url').textContent = window.location.origin + '/api/instagram/webhook'; loadWebhookLogs(); }
  function copyWebhookUrl() { copyText(window.location.origin + '/api/instagram/webhook'); }

  async function loadWebhookLogs() {
    try {
      const r = await igFetch('/api/instagram/webhook-logs?limit=10');
      const d = await r.json();
      const logs = d.logs || [];
      const container = document.getElementById('webhook-logs');
      if (logs.length === 0) { container.innerHTML = '<div style="text-align:center;padding:28px;color:var(--text3);font-size:13px;">수신된 웹훅이 없습니다</div>'; return; }
      container.innerHTML = logs.map(l => {
        var commentIcon = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#833ab4" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';
        var msgIcon     = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></svg>';
        var defIcon     = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e1306c" stroke-width="2" stroke-linecap="round"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/></svg>';
        const icon = l.event_type==='comment' ? commentIcon : l.event_type==='message' ? msgIcon : defIcon;
        const dateStr = new Date(l.created_at).toLocaleString('ko-KR');
        return '<div class="wh-log"><span>' + icon + '</span><div style="flex:1;"><div style="font-size:13px;font-weight:600;color:var(--text1);">' + esc(l.event_type||'webhook') + '</div><div style="font-size:11px;color:var(--text3);">' + dateStr + '</div></div><span class="status-badge status-on">수신됨</span></div>';
      }).join('');
    } catch(e) {}
  }

  // ===== ACCOUNT =====
  async function saveAppConfig() {
    const appId     = (document.getElementById('meta-app-id').value||'').trim();
    const appSecret = (document.getElementById('meta-app-secret').value||'').trim();
    const msgEl     = document.getElementById('app-config-msg');
    if (!appId)     { msgEl.style.display='block'; msgEl.style.cssText='display:block;padding:8px 12px;border-radius:8px;font-size:12px;margin-bottom:10px;background:#fef2f2;border:1px solid #fecaca;color:var(--red);'; msgEl.textContent='앱 ID를 입력해주세요.'; return; }
    if (!appSecret) { msgEl.style.display='block'; msgEl.style.cssText='display:block;padding:8px 12px;border-radius:8px;font-size:12px;margin-bottom:10px;background:#fef2f2;border:1px solid #fecaca;color:var(--red);'; msgEl.textContent='앱 시크릿을 입력해주세요.'; return; }
    msgEl.style.cssText='display:block;padding:8px 12px;border-radius:8px;font-size:12px;margin-bottom:10px;background:#f8fafc;border:1px solid var(--border);color:var(--text2);';
    msgEl.textContent='저장 중...';
    try {
      const r = await igFetch('/api/instagram/app-config', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({appId, appSecret}) });
      const d = await r.json();
      if (d.success) {
        msgEl.style.cssText='display:block;padding:8px 12px;border-radius:8px;font-size:12px;margin-bottom:10px;background:#f0fdf4;border:1px solid #bbf7d0;color:#16a34a;';
        msgEl.textContent = d.validationMsg || '앱 설정이 저장되었습니다.';
        const badge = document.getElementById('app-config-badge');
        if (badge) badge.style.display = 'inline-block';
        setTimeout(() => loadAccountStatus(), 500);
      } else {
        msgEl.style.cssText='display:block;padding:8px 12px;border-radius:8px;font-size:12px;margin-bottom:10px;background:#fef2f2;border:1px solid #fecaca;color:var(--red);';
        msgEl.textContent = '저장 실패: ' + (d.error || '오류');
      }
    } catch(e) {
      msgEl.style.cssText='display:block;padding:8px 12px;border-radius:8px;font-size:12px;margin-bottom:10px;background:#fef2f2;border:1px solid #fecaca;color:var(--red);';
      msgEl.textContent = '네트워크 오류: ' + e.message;
    }
  }

  async function loadAppConfigStatus() {
    try {
      const r = await igFetch('/api/instagram/app-config');
      const d = await r.json();
      const badge    = document.getElementById('app-config-badge');
      const loginBtn = document.getElementById('oauth-login-btn');
      if (d.hasAppId) {
        if (badge) badge.style.display = 'inline-block';
        const appIdInput = document.getElementById('meta-app-id');
        if (appIdInput && !appIdInput.value) appIdInput.placeholder = '설정됨: ' + (d.appIdPreview || '***');
        if (loginBtn) { loginBtn.style.opacity='1'; loginBtn.style.pointerEvents='auto'; }
      } else {
        if (badge) badge.style.display = 'none';
        if (loginBtn) { loginBtn.style.opacity='0.55'; loginBtn.style.pointerEvents='none'; loginBtn.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5.5" stroke="white" stroke-width="2"/><circle cx="12" cy="12" r="4.5" stroke="white" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.3" fill="white"/></svg>위에서 Meta 앱 ID를 먼저 입력하세요'; }
      }
    } catch(_) {}
  }

  function getCurrentUserId() {
    if (typeof window !== 'undefined' && (window).__userId && (window).__userId !== '0') return String((window).__userId);
    try { const s=localStorage.getItem('user')||sessionStorage.getItem('user'); if(s){ const u=JSON.parse(s); if(u&&u.id) return String(u.id); } } catch(_) {}
    try { const s2=sessionStorage.getItem('currentUser')||localStorage.getItem('currentUser'); if(s2){ const u2=JSON.parse(s2); if(u2&&u2.id) return String(u2.id); } } catch(_) {}
    return localStorage.getItem('userId') || sessionStorage.getItem('userId') || '0';
  }

  async function fetchCurrentUserId() {
    try { const r=await fetch('/api/user/me',{credentials:'include'}); if(r.ok){ const d=await r.json(); if(d&&d.id) return String(d.id); if(d&&d.user&&d.user.id) return String(d.user.id); } } catch(_) {}
    return getCurrentUserId();
  }

  function copyText(text) {
    navigator.clipboard.writeText(text).then(() => showToast('복사되었습니다!'), () => alert('복사: ' + text));
  }

  function startOAuthLogin() {
    const userId = getCurrentUserId();
    const btn    = document.getElementById('oauth-login-btn');
    const msg    = document.getElementById('oauth-status-msg');
    btn.style.opacity = '0.7'; btn.style.pointerEvents = 'none';
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="animation:spin 1s linear infinite;flex-shrink:0;"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg> 로그인 창 열기...';
    msg.style.display = 'none';
    const popupW = 600, popupH = 700;
    const left = Math.round((screen.width-popupW)/2), top = Math.round((screen.height-popupH)/2);
    const popup = window.open('/api/instagram/oauth/start?userId='+userId, 'instagram_oauth', 'width='+popupW+',height='+popupH+',left='+left+',top='+top+',scrollbars=yes,resizable=yes');
    const igLoginBtnInner = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5.5" stroke="white" stroke-width="2"/><circle cx="12" cy="12" r="4.5" stroke="white" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.3" fill="white"/></svg>Instagram으로 로그인';
    if (!popup || popup.closed) {
      btn.style.opacity='1'; btn.style.pointerEvents='auto'; btn.innerHTML=igLoginBtnInner;
      msg.style.display='block'; msg.style.color='var(--red)'; msg.textContent='팝업이 차단되었습니다. 브라우저에서 팝업을 허용해주세요.'; return;
    }
    function onMessage(e) {
      if (!e.data || e.data.type !== 'ig_oauth') return;
      window.removeEventListener('message', onMessage);
      btn.style.opacity='1'; btn.style.pointerEvents='auto'; btn.innerHTML=igLoginBtnInner;
      if (e.data.status==='success') { msg.style.display='block'; msg.style.color='#16a34a'; msg.textContent='연결 성공! 계정 정보 불러오는 중...'; setTimeout(() => loadAccountStatus(), 800); }
      else if (e.data.status==='cancel') { msg.style.display='block'; msg.style.color='#d97706'; msg.textContent='로그인을 취소했습니다.'; }
      else { msg.style.display='block'; msg.style.color='var(--red)'; msg.textContent='연결 실패: '+(e.data.error||'오류가 발생했습니다.'); }
    }
    window.addEventListener('message', onMessage);
    const timer = setInterval(() => { if(popup.closed){ clearInterval(timer); window.removeEventListener('message',onMessage); btn.style.opacity='1'; btn.style.pointerEvents='auto'; btn.innerHTML=igLoginBtnInner; } }, 500);
  }

  async function loadAccountStatus() {
    var loading      = document.getElementById('account-loading');
    var connected    = document.getElementById('account-connected');
    var disconnected = document.getElementById('account-disconnected');
    if(loading) loading.style.display='block';
    if(connected) connected.style.display='none';
    if(disconnected) disconnected.style.display='none';
    loadAppConfigStatus();
    loadApifySession();
    try {
      var userId = getCurrentUserId();
      var r = await igFetch('/api/instagram/account?userId='+userId);
      var d = await r.json();
      if(loading) loading.style.display='none';
      var account = d.account;
      if (account && account.is_connected) {
        if(connected) connected.style.display='block';
        var username    = account.ig_username || '';
        var displayName = username ? ('@'+username) : ('ID: '+(account.ig_business_id||'-'));
        var pic = document.getElementById('ig-profile-pic'), def = document.getElementById('ig-avatar-default');
        if (account.ig_profile_pic && pic) { pic.src=account.ig_profile_pic; pic.style.display='block'; if(def) def.style.display='none'; }
        else { if(pic) pic.style.display='none'; if(def) def.style.display='flex'; }
        var uEl=document.getElementById('ig-display-username'); if(uEl) uEl.textContent=displayName;
        var idEl=document.getElementById('ig-display-id'); if(idEl) idEl.textContent='ID: '+(account.ig_business_id||'-');
        var fcEl=document.getElementById('ig-follower-count'); if(fcEl) fcEl.textContent=account.follower_count?account.follower_count.toLocaleString():'-';
        var expEl=document.getElementById('ig-token-expiry'); if(expEl) expEl.textContent=account.token_expires_at?new Date(account.token_expires_at).toLocaleDateString('ko-KR'):'장기 토큰 (~60일)';
        var badgeEl=document.getElementById('ig-account-badge'), nameEl=document.getElementById('ig-account-name'), bannerEl=document.getElementById('connect-banner');
        if(nameEl) nameEl.textContent=displayName;
        if(badgeEl) badgeEl.style.display='flex';
        if(bannerEl) bannerEl.style.display='none';
        checkApiStatus(userId);
      } else {
        if(disconnected) disconnected.style.display='block';
      }
    } catch(e) { if(loading) loading.style.display='none'; if(disconnected) disconnected.style.display='block'; }
  }

  async function checkApiStatus(userId) {
    try {
      const r = await igFetch('/api/instagram/me?userId='+userId);
      const d = await r.json();
      const el = document.getElementById('api-status-banner');
      if (!el) return;
      if (d.success) {
        igProfile = d.profile;
        const p=d.profile, uEl=document.getElementById('ig-display-username'), fcEl=document.getElementById('ig-follower-count');
        if(uEl&&p.username) uEl.textContent='@'+p.username;
        if(fcEl) fcEl.textContent=(p.followers_count||0).toLocaleString();
        el.style.display='none';
      } else {
        el.style.display='block';
        const msgEl = document.getElementById('api-error-msg');
        if (msgEl) {
          const errCode=d.code||'', errMsg=d.error||'알 수 없는 오류';
          if (errCode===190||errMsg.includes('Cannot parse access token')||errMsg.includes('Invalid OAuth')) msgEl.innerHTML='저장된 토큰이 만료되었거나 유효하지 않습니다 (오류 코드: 190). 아래 버튼으로 계정을 재연결해 주세요.';
          else if (errMsg.includes('blocked')||errCode===200) msgEl.innerHTML='Instagram API 권한이 없습니다 (오류 코드: 200). Meta 앱이 <strong>개발 모드</strong>이거나 앱 리뷰가 완료되지 않았습니다.';
          else msgEl.innerHTML='API 오류: '+esc(errMsg)+(errCode?' [코드: '+esc(errCode)+']':'')+'. 계정을 재연결해 주세요.';
        }
      }
    } catch(e) {}
  }

  async function disconnectIgAccount() {
    if (!confirm('Instagram 계정 연결을 해제하시겠습니까?')) return;
    try {
      const userId = getCurrentUserId();
      await igFetch('/api/instagram/account?userId='+userId, {method:'DELETE'});
      showToast('연결이 해제되었습니다');
      const badgeEl=document.getElementById('ig-account-badge'), bannerEl=document.getElementById('connect-banner');
      if(badgeEl) badgeEl.style.display='none';
      if(bannerEl) bannerEl.style.display='block';
      await loadAccountStatus();
    } catch(e) { alert('오류: '+e.message); }
  }

  async function disconnectAndReconnect() {
    try {
      const userId = getCurrentUserId();
      await igFetch('/api/instagram/account?userId='+userId, {method:'DELETE'});
      showToast('연결 해제됨. 새 창에서 재연결합니다...');
      setTimeout(() => startOAuthLogin(), 800);
    } catch(e) { alert('오류: '+e.message); }
  }

  // ===== INIT =====
  (async function() {
    try { const uid=await fetchCurrentUserId(); if(uid&&uid!=='0') localStorage.setItem('userId',uid); } catch(_) {}
    const p = new URLSearchParams(location.search).get('tab') || 'home';
    await loadDmRulesFromApi();
    showPanel(p);
    loadAccountStatus();
    document.getElementById('dm-pending-count').textContent = '0';
  })();
<\/script>
</body>
</html>`;

