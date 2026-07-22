// YouTube Pages - 유튜브 분석 & 키워드 검색 통합 SPA

export const youtubeUnifiedPage = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>유튜브 마케팅 - BYGENCY</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" media="print" onload="this.media=&#39;all&#39;"/>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Pretendard',-apple-system,sans-serif;background:#f0f4f8;color:#1e293b;min-height:100vh;}
    .wrap{display:flex;min-height:100vh;}
    .sidebar{width:248px;height:100vh;background:#fff;border-right:1px solid #e2e8f0;position:fixed;top:0;left:0;z-index:50;display:flex;flex-direction:column;overflow:hidden;}
    .main-area{margin-left:248px;flex:1;display:flex;flex-direction:column;}
    .sb-header{padding:20px 18px 16px;border-bottom:1px solid #f1f5f9;}
    .sb-logo{display:flex;align-items:center;gap:10px;}
    .sb-logo-icon{width:38px;height:38px;background:linear-gradient(135deg,#ff0000,#cc0000);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;}
    .sb-logo-text{font-size:16px;font-weight:900;color:#1e293b;line-height:1.2;}
    .sb-logo-sub{font-size:11px;color:#94a3b8;font-weight:400;}
    .sb-nav{padding:12px 0;flex:1;overflow-y:auto;}
    .sb-group{padding:6px 14px 4px;font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:.8px;text-transform:uppercase;}
    .sb-item{display:flex;align-items:center;gap:10px;padding:10px 16px;margin:2px 8px;border-radius:10px;cursor:pointer;transition:all .18s;font-size:14px;font-weight:500;color:#64748b;text-decoration:none;}
    .sb-item:hover{background:#fff5f5;color:#ff0000;}
    .sb-item.active{background:linear-gradient(135deg,#fff5f5,#fee2e2);color:#ff0000;font-weight:700;}
    .sb-icon{font-size:17px;width:22px;text-align:center;flex-shrink:0;}
    .sb-badge{margin-left:auto;background:#ff0000;color:#fff;font-size:9px;font-weight:700;padding:2px 6px;border-radius:20px;}
    .sb-badge-green{margin-left:auto;background:#22c55e;color:#fff;font-size:9px;font-weight:700;padding:2px 6px;border-radius:20px;}
    .sb-footer{padding:16px;border-top:1px solid #f1f5f9;}
    .topbar{background:#fff;border-bottom:1px solid #e2e8f0;padding:14px 24px;display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:40;}
    .topbar-title{font-size:18px;font-weight:800;color:#1e293b;white-space:nowrap;}
    .topbar-sub{font-size:13px;color:#94a3b8;margin-left:4px;}
    .hamburger{display:none;background:none;border:none;cursor:pointer;padding:6px;color:#64748b;}
    .content{padding:24px;flex:1;}
    .card{background:#fff;border-radius:16px;padding:24px;box-shadow:0 1px 4px rgba(0,0,0,.06);border:1px solid #f1f5f9;margin-bottom:20px;}
    .card-sm{background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,.06);border:1px solid #f1f5f9;transition:box-shadow .2s;}
    .card-sm:hover{box-shadow:0 4px 16px rgba(255,0,0,.12);}
    .section-header{display:flex;align-items:center;gap:10px;margin-bottom:20px;}
    .section-header h2{font-size:20px;font-weight:800;color:#1e293b;}
    .section-badge{font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;background:#fff5f5;color:#ff0000;}
    .yt-btn{background:linear-gradient(135deg,#ff0000,#cc0000);color:#fff;border:none;border-radius:10px;padding:10px 20px;font-size:14px;font-weight:700;cursor:pointer;transition:all .2s;}
    .yt-btn:hover{opacity:.88;transform:translateY(-1px);}
    .yt-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;}
    .yt-btn-outline{background:#fff;color:#ff0000;border:1.5px solid #ff0000;border-radius:10px;padding:10px 20px;font-size:14px;font-weight:700;cursor:pointer;transition:all .2s;}
    .yt-btn-outline:hover{background:#fff5f5;}
    .stat-box{background:#fff;border-radius:12px;padding:16px 20px;border:1px solid #f1f5f9;box-shadow:0 1px 3px rgba(0,0,0,.05);}
    .stat-val{font-size:28px;font-weight:900;color:#1e293b;}
    .stat-label{font-size:12px;color:#94a3b8;font-weight:500;margin-top:2px;}
    .stat-change{font-size:12px;font-weight:700;margin-top:4px;}
    .panel{display:none;}
    .panel.active{display:block;}
    .input-base{width:100%;border:1.5px solid #e2e8f0;border-radius:10px;padding:10px 14px;font-size:14px;outline:none;transition:border .2s;font-family:inherit;}
    .input-base:focus{border-color:#ff0000;}
    .table-wrap{overflow-x:auto;}
    table{width:100%;border-collapse:collapse;font-size:14px;}
    th{padding:10px 14px;background:#f8fafc;color:#64748b;font-weight:700;text-align:left;border-bottom:2px solid #e2e8f0;}
    td{padding:10px 14px;border-bottom:1px solid #f1f5f9;color:#1e293b;vertical-align:middle;}
    tr:hover td{background:#fffbfb;}
    .badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;}
    .badge-red{background:#fff5f5;color:#ff0000;}
    .badge-blue{background:#eff6ff;color:#8b5cf6;}
    .badge-green{background:#f0fdf4;color:#16a34a;}
    .badge-yellow{background:#fefce8;color:#ca8a04;}
    .badge-gray{background:#f8fafc;color:#64748b;}
    .channel-card{background:#fff;border-radius:14px;padding:18px;border:1px solid #f1f5f9;box-shadow:0 1px 4px rgba(0,0,0,.06);transition:all .2s;cursor:pointer;}
    .channel-card:hover{box-shadow:0 4px 16px rgba(255,0,0,.1);border-color:#fca5a5;}
    .channel-thumb{width:56px;height:56px;border-radius:50%;object-fit:cover;border:2px solid #f1f5f9;}
    .channel-thumb-placeholder{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#ff0000,#cc0000);display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:900;flex-shrink:0;}
    .loading-spinner{display:inline-block;width:20px;height:20px;border:2px solid #fee2e2;border-top-color:#ff0000;border-radius:50%;animation:spin .7s linear infinite;}
    @keyframes spin{to{transform:rotate(360deg)}}
    .keyword-tag{display:inline-flex;align-items:center;gap:6px;background:#fff5f5;color:#ff0000;border:1px solid #fca5a5;border-radius:20px;padding:5px 12px;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;}
    .keyword-tag:hover{background:#ff0000;color:#fff;}
    .search-bar-wrap{display:flex;gap:10px;align-items:center;}
    .search-bar-wrap .input-base{flex:1;}
    .trend-bar{height:8px;background:#fee2e2;border-radius:4px;overflow:hidden;}
    .trend-bar-fill{height:100%;background:linear-gradient(90deg,#ff0000,#ff6b6b);border-radius:4px;transition:width .6s;}
    .video-thumb{width:80px;height:50px;object-fit:cover;border-radius:6px;}
    .video-thumb-placeholder{width:80px;height:50px;background:#f1f5f9;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:18px;}
    .summary-box{display:none;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin-top:10px;font-size:13px;color:#334155;line-height:1.7;}
    .summary-box.open{display:block;}
    .summary-btn{background:none;border:1px solid #e2e8f0;border-radius:8px;padding:4px 10px;font-size:12px;color:#64748b;cursor:pointer;display:inline-flex;align-items:center;gap:4px;transition:all .15s;}
    .summary-btn:hover{background:#f8fafc;border-color:#ff0000;color:#ff0000;}
    .kw-hover-btn:hover{background:#ff0000!important;color:#fff!important;}
    .detail-tag{display:inline-block;background:#f1f5f9;color:#475569;border-radius:6px;padding:2px 8px;font-size:11px;margin:2px;}
    @media(max-width:768px){
      .sidebar{transform:translateX(-100%);}
      .sidebar.open{transform:translateX(0);}
      .main-area{margin-left:0;}
      .hamburger{display:flex;}
    }
    /* embed mode: 상단바는 유지하되 햄버거만 숨김 */
    .embed .hamburger{display:none!important;} .embed .main-area{margin-left:0!important;width:100%!important;}
    /* ===== 좌측 사이드바 → 상단 네비게이션 바 (BYGENCY 톤) ===== */
    .wrap{flex-direction:column!important;}
    .sidebar{position:sticky!important;top:0!important;left:0!important;width:100%!important;height:auto!important;flex-direction:row!important;align-items:center!important;border-right:none!important;border-bottom:1px solid #e2e8f0!important;overflow:visible!important;padding:8px 16px!important;gap:10px!important;box-shadow:0 1px 3px rgba(0,0,0,.04);z-index:50;}
    .embed .sidebar{display:flex!important;}
    .sb-header{padding:0 10px 0 0!important;border-bottom:none!important;flex:0 0 auto!important;border-right:1px solid #f1f5f9;}
    .sb-logo-sub{display:none!important;}
    .sb-nav{padding:0!important;flex:1 1 auto!important;min-width:0!important;display:flex!important;flex-direction:row!important;align-items:center!important;gap:2px!important;overflow-x:auto!important;overflow-y:hidden!important;}
    .sb-nav::-webkit-scrollbar{display:none;} .sb-nav{scrollbar-width:none;}
    .sb-group{display:none!important;}
    .sb-item{flex:0 0 auto!important;white-space:nowrap!important;padding:8px 12px!important;margin:0!important;font-size:13.5px!important;}
    .sb-badge,.sb-badge-green{margin-left:6px!important;}
    .sb-footer{padding:0!important;border-top:none!important;flex:0 0 auto!important;margin-left:auto!important;}
    .sb-footer > div:last-child{display:none!important;}
    .sb-footer a{margin:0!important;padding:8px 12px!important;white-space:nowrap;}
    .main-area{margin-left:0!important;}
    .hamburger{display:none!important;}
    @media(max-width:900px){ .sb-header .sb-logo-text{display:none;} }
  </style>
</head>
<body>
<script>if(location.search.indexOf('embed=1')>-1)document.documentElement.classList.add('embed');<\/script>
<div class="wrap">
  <aside class="sidebar" id="sidebar">
    <div class="sb-header">
      <div class="sb-logo">
        <div class="sb-logo-icon">▶️</div>
        <div>
          <div class="sb-logo-text">YouTube</div>
          <div class="sb-logo-sub">마케팅 분석 도구</div>
        </div>
      </div>
    </div>
    <nav class="sb-nav">
      <div class="sb-group">OVERVIEW</div>
      <a class="sb-item active" id="nav-home" onclick="showPanel('home')">
        <span class="sb-icon">🏠</span> 대시보드
      </a>
      <div class="sb-group">채널 분석</div>
      <a class="sb-item" id="nav-channel-search" onclick="showPanel('channel-search')">
        <span class="sb-icon">🔍</span> 채널 검색
      </a>
      <a class="sb-item" id="nav-channel-detail" onclick="showPanel('channel-detail')">
        <span class="sb-icon">📊</span> 채널 상세 분석
      </a>
      <a class="sb-item" id="nav-video-analysis" onclick="showPanel('video-analysis')">
        <span class="sb-icon">🎬</span> 영상 분석
      </a>
      <div class="sb-group">키워드</div>
      <a class="sb-item" id="nav-keyword-search" onclick="showPanel('keyword-search')">
        <span class="sb-icon">🔑</span> 키워드 검색량
        <span class="sb-badge">HOT</span>
      </a>
      <a class="sb-item" id="nav-keyword-insight" onclick="showPanel('keyword-insight')">
        <span class="sb-icon">💡</span> 키워드 인사이트
      </a>
      <div class="sb-group">트렌드</div>
      <a class="sb-item" id="nav-trending" onclick="showPanel('trending')">
        <span class="sb-icon">📈</span> 인기 동영상
      </a>
      <a class="sb-item" id="nav-competitor" onclick="showPanel('competitor')">
        <span class="sb-icon">⚔️</span> 경쟁 채널 비교
      </a>
      <div class="sb-group">영상 분석</div>
      <a class="sb-item" id="nav-video-detail" onclick="showPanel('video-detail')">
        <span class="sb-icon">🔬</span> 영상 상세분석
        <span class="sb-badge-green">NEW</span>
      </a>
    </nav>
    <div class="sb-footer">
      <a href="/dashboard_USE17237_612" style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:#fff5f5;border-radius:10px;text-decoration:none;color:#cc0000;font-size:13px;font-weight:700;margin-bottom:10px;border:1.5px solid #fecdd3;">
        <i class="fas fa-arrow-left" style="font-size:12px;"></i> 마케팅 센터
      </a>
      <div style="font-size:11px;color:#94a3b8;text-align:center;">YouTube Data API v3 연동</div>
    </div>
  </aside>

  <div class="main-area">
    <div class="topbar">
      <button class="hamburger" onclick="document.getElementById('sidebar').classList.toggle('open')">
        <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
      <span class="topbar-title" id="topbar-title">📺 유튜브 마케팅 분석</span>
      <span class="topbar-sub" id="topbar-sub">YouTube Data API v3</span>
      <div style="margin-left:auto;display:flex;gap:8px;align-items:center;">
        <span id="api-status-badge" class="badge badge-gray">API 상태 확인 중...</span>
      </div>
    </div>

    <div class="content">
      <!-- 홈 대시보드 -->
      <div class="panel active" id="panel-home">
        <div class="section-header">
          <h2>📺 유튜브 마케팅 대시보드</h2>
          <span class="section-badge">YouTube Analytics</span>
        </div>

        <!-- 빠른 검색 -->
        <div class="card" style="background:linear-gradient(135deg,#ff0000,#cc0000);color:#fff;border:none;">
          <div style="font-size:22px;font-weight:900;margin-bottom:8px;">🔍 유튜브 키워드 빠른 검색</div>
          <div style="font-size:14px;opacity:.85;margin-bottom:18px;">채널 검색 또는 키워드 분석을 시작하세요</div>
          <div style="display:flex;gap:10px;">
            <input id="home-search-input" type="text" placeholder="채널명 또는 키워드 입력..." 
              style="flex:1;border:none;border-radius:10px;padding:12px 16px;font-size:15px;outline:none;font-family:inherit;"
              onkeydown="if(event.key==='Enter')homeSearch()">
            <button onclick="homeSearch()" style="background:rgba(255,255,255,.25);color:#fff;border:2px solid rgba(255,255,255,.5);border-radius:10px;padding:12px 24px;font-size:14px;font-weight:700;cursor:pointer;white-space:nowrap;">검색하기</button>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
            <span style="font-size:12px;opacity:.7;">인기 검색:</span>
            <span onclick="quickSearch('먹방')" style="background:rgba(255,255,255,.2);color:#fff;padding:3px 10px;border-radius:12px;font-size:12px;cursor:pointer;">먹방</span>
            <span onclick="quickSearch('게임')" style="background:rgba(255,255,255,.2);color:#fff;padding:3px 10px;border-radius:12px;font-size:12px;cursor:pointer;">게임</span>
            <span onclick="quickSearch('브이로그')" style="background:rgba(255,255,255,.2);color:#fff;padding:3px 10px;border-radius:12px;font-size:12px;cursor:pointer;">브이로그</span>
            <span onclick="quickSearch('IT리뷰')" style="background:rgba(255,255,255,.2);color:#fff;padding:3px 10px;border-radius:12px;font-size:12px;cursor:pointer;">IT리뷰</span>
            <span onclick="quickSearch('요리')" style="background:rgba(255,255,255,.2);color:#fff;padding:3px 10px;border-radius:12px;font-size:12px;cursor:pointer;">요리</span>
          </div>
        </div>

        <!-- 메뉴 카드 -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:20px;">
          <div class="card-sm" style="cursor:pointer;" onclick="showPanel('channel-search')">
            <div style="font-size:28px;margin-bottom:8px;">🔍</div>
            <div style="font-weight:800;font-size:15px;margin-bottom:4px;">채널 검색</div>
            <div style="font-size:12px;color:#94a3b8;">키워드로 채널 검색 및 구독자·조회수 분석</div>
          </div>
          <div class="card-sm" style="cursor:pointer;" onclick="showPanel('keyword-search')">
            <div style="font-size:28px;margin-bottom:8px;">🔑</div>
            <div style="font-weight:800;font-size:15px;margin-bottom:4px;">키워드 검색량</div>
            <div style="font-size:12px;color:#94a3b8;">연관 키워드 및 검색 트렌드 분석</div>
          </div>
          <div class="card-sm" style="cursor:pointer;" onclick="showPanel('trending')">
            <div style="font-size:28px;margin-bottom:8px;">📈</div>
            <div style="font-weight:800;font-size:15px;margin-bottom:4px;">인기 동영상</div>
            <div style="font-size:12px;color:#94a3b8;">지금 뜨는 인기 영상 트렌드 파악</div>
          </div>
          <div class="card-sm" style="cursor:pointer;" onclick="showPanel('competitor')">
            <div style="font-size:28px;margin-bottom:8px;">⚔️</div>
            <div style="font-weight:800;font-size:15px;margin-bottom:4px;">경쟁 채널 비교</div>
            <div style="font-size:12px;color:#94a3b8;">여러 채널을 한눈에 비교 분석</div>
          </div>
        </div>

        <!-- API 상태 -->
        <div class="card">
          <div class="section-header">
            <h2>⚙️ API 연결 상태</h2>
          </div>
          <div id="home-api-status">
            <div style="display:flex;align-items:center;gap:10px;padding:12px;background:#f8fafc;border-radius:10px;">
              <div class="loading-spinner"></div>
              <span style="color:#64748b;font-size:14px;">YouTube Data API v3 연결 확인 중...</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 채널 검색 패널 -->
      <div class="panel" id="panel-channel-search">
        <div class="section-header">
          <h2>🔍 채널 검색</h2>
          <span class="section-badge">Channel Search</span>
        </div>
        <div class="card">
          <div style="margin-bottom:16px;">
            <div class="search-bar-wrap">
              <input id="channel-search-input" type="text" class="input-base" placeholder="채널명, 키워드 입력 (예: 먹방, 테크리뷰...)"
                onkeydown="if(event.key==='Enter')searchChannels()">
              <select id="channel-order" style="border:1.5px solid #e2e8f0;border-radius:10px;padding:10px 14px;font-size:14px;outline:none;background:#fff;font-family:inherit;">
                <option value="relevance">관련성순</option>
                <option value="viewCount">조회수순</option>
                <option value="rating">평점순</option>
                <option value="date">최신순</option>
              </select>
              <button class="yt-btn" onclick="searchChannels()">검색</button>
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
            <span style="font-size:12px;color:#94a3b8;">추천 키워드:</span>
            <span class="keyword-tag" onclick="setChannelSearch('먹방')">먹방</span>
            <span class="keyword-tag" onclick="setChannelSearch('게임유튜버')">게임유튜버</span>
            <span class="keyword-tag" onclick="setChannelSearch('뷰티')">뷰티</span>
            <span class="keyword-tag" onclick="setChannelSearch('IT리뷰')">IT리뷰</span>
            <span class="keyword-tag" onclick="setChannelSearch('요리레시피')">요리레시피</span>
            <span class="keyword-tag" onclick="setChannelSearch('운동')">운동</span>
          </div>
        </div>
        <div id="channel-search-results">
          <div style="text-align:center;padding:60px 20px;color:#94a3b8;">
            <div style="font-size:40px;margin-bottom:12px;">🔍</div>
            <div style="font-size:15px;">키워드를 입력하고 채널을 검색하세요</div>
          </div>
        </div>
      </div>

      <!-- 채널 상세 분석 -->
      <div class="panel" id="panel-channel-detail">
        <div class="section-header">
          <h2>📊 채널 상세 분석</h2>
          <span class="section-badge">Channel Analytics</span>
        </div>
        <div class="card">
          <div class="search-bar-wrap">
            <input id="channel-url-input" type="text" class="input-base" placeholder="채널 ID 또는 채널명 입력 (예: @channelname)"
              onkeydown="if(event.key==='Enter')analyzeChannel()">
            <button class="yt-btn" onclick="analyzeChannel()">분석하기</button>
          </div>
        </div>
        <div id="channel-detail-result">
          <div style="text-align:center;padding:60px 20px;color:#94a3b8;">
            <div style="font-size:40px;margin-bottom:12px;">📊</div>
            <div style="font-size:15px;">채널 ID 또는 채널명을 입력하면 상세 분석이 표시됩니다</div>
          </div>
        </div>
      </div>

      <!-- 영상 분석 -->
      <div class="panel" id="panel-video-analysis">
        <div class="section-header">
          <h2>🎬 영상 분석</h2>
          <span class="section-badge">Video Analytics</span>
        </div>
        <div class="card">
          <div class="search-bar-wrap">
            <input id="video-search-input" type="text" class="input-base" placeholder="키워드로 영상 검색 (예: 먹방, 게임, 리뷰...)"
              onkeydown="if(event.key==='Enter')searchVideos()">
            <select id="video-order" style="border:1.5px solid #e2e8f0;border-radius:10px;padding:10px 14px;font-size:14px;outline:none;background:#fff;font-family:inherit;">
              <option value="relevance">관련성순</option>
              <option value="viewCount">조회수순</option>
              <option value="rating">좋아요순</option>
              <option value="date">최신순</option>
            </select>
            <button class="yt-btn" onclick="searchVideos()">검색</button>
          </div>
        </div>
        <div id="video-search-results">
          <div style="text-align:center;padding:60px 20px;color:#94a3b8;">
            <div style="font-size:40px;margin-bottom:12px;">🎬</div>
            <div style="font-size:15px;">키워드를 입력하고 영상을 검색하세요 (최대 40개)</div>
          </div>
        </div>
      </div>

      <!-- 영상 상세분석 -->
      <div class="panel" id="panel-video-detail">
        <div class="section-header">
          <h2>🔬 영상 상세분석</h2>
          <span class="section-badge">Video Deep Analysis</span>
        </div>
        <div class="card">
          <div style="margin-bottom:10px;font-size:14px;color:#64748b;">YouTube 영상 URL 또는 영상 ID를 입력하면 인사이트, 자막, 대본 정보를 모두 분석합니다.</div>
          <div class="search-bar-wrap">
            <input id="video-detail-input" type="text" class="input-base" placeholder="https://www.youtube.com/watch?v=... 또는 영상 ID"
              onkeydown="if(event.key==='Enter')analyzeVideoDetail()">
            <button class="yt-btn" onclick="analyzeVideoDetail()">상세 분석</button>
          </div>
        </div>
        <div id="video-detail-result">
          <div style="text-align:center;padding:60px 20px;color:#94a3b8;">
            <div style="font-size:40px;margin-bottom:12px;">🔬</div>
            <div style="font-size:15px;">영상 URL을 입력하면 전체 인사이트와 대본을 분석합니다</div>
          </div>
        </div>
      </div>

      <!-- 키워드 검색량 -->
      <div class="panel" id="panel-keyword-search">
        <div class="section-header">
          <h2>🔑 키워드 검색량 분석</h2>
          <span class="section-badge">Keyword Volume</span>
        </div>
        <div class="card">
          <div class="search-bar-wrap">
            <input id="keyword-input" type="text" class="input-base" placeholder="분석할 키워드 입력 (예: 먹방, 게임, 뷰티...)"
              onkeydown="if(event.key==='Enter')analyzeKeyword()">
            <button class="yt-btn" onclick="analyzeKeyword()">분석하기</button>
          </div>
          <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
            <span style="font-size:12px;color:#94a3b8;">인기 키워드:</span>
            <span class="keyword-tag" onclick="setKeyword('먹방')">먹방</span>
            <span class="keyword-tag" onclick="setKeyword('게임')">게임</span>
            <span class="keyword-tag" onclick="setKeyword('브이로그')">브이로그</span>
            <span class="keyword-tag" onclick="setKeyword('뷰티')">뷰티</span>
            <span class="keyword-tag" onclick="setKeyword('IT리뷰')">IT리뷰</span>
            <span class="keyword-tag" onclick="setKeyword('요리')">요리</span>
            <span class="keyword-tag" onclick="setKeyword('운동')">운동</span>
            <span class="keyword-tag" onclick="setKeyword('여행')">여행</span>
          </div>
        </div>

        <div id="keyword-result">
          <div style="text-align:center;padding:60px 20px;color:#94a3b8;">
            <div style="font-size:40px;margin-bottom:12px;">🔑</div>
            <div style="font-size:15px;">키워드를 입력하면 연관 키워드와 검색 트렌드가 표시됩니다</div>
            <div style="font-size:13px;margin-top:8px;color:#cbd5e1;">YouTube Search Suggestion API 기반 실시간 데이터</div>
          </div>
        </div>
      </div>

      <!-- 키워드 인사이트 -->
      <div class="panel" id="panel-keyword-insight">
        <div class="section-header">
          <h2>💡 키워드 인사이트</h2>
          <span class="section-badge">Keyword Insight</span>
        </div>
        <div class="card">
          <div class="search-bar-wrap">
            <input id="insight-keyword-input" type="text" class="input-base" placeholder="인사이트 분석할 키워드 입력..."
              onkeydown="if(event.key==='Enter')analyzeKeywordInsight()">
            <button class="yt-btn" onclick="analyzeKeywordInsight()">인사이트 분석</button>
          </div>
        </div>
        <div id="keyword-insight-result">
          <div style="text-align:center;padding:60px 20px;color:#94a3b8;">
            <div style="font-size:40px;margin-bottom:12px;">💡</div>
            <div style="font-size:15px;">키워드를 입력하면 채널 경쟁도, 조회수 평균 등 인사이트가 표시됩니다</div>
          </div>
        </div>
      </div>

      <!-- 인기 동영상 트렌드 -->
      <div class="panel" id="panel-trending">
        <div class="section-header">
          <h2>📈 인기 동영상 트렌드</h2>
          <span class="section-badge">Trending</span>
        </div>
        <div class="card">
          <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
            <select id="trending-category" style="border:1.5px solid #e2e8f0;border-radius:10px;padding:10px 14px;font-size:14px;outline:none;background:#fff;font-family:inherit;">
              <option value="0">전체</option>
              <option value="1">영화 & 애니메이션</option>
              <option value="2">자동차 & 교통</option>
              <option value="10">음악</option>
              <option value="15">애완동물 & 동물</option>
              <option value="17">스포츠</option>
              <option value="20">게임</option>
              <option value="22">블로그 & 브이로그</option>
              <option value="23">코미디</option>
              <option value="24">엔터테인먼트</option>
              <option value="25">뉴스 & 정치</option>
              <option value="26">방법 & DIY</option>
              <option value="27">교육</option>
              <option value="28">과학 & 기술</option>
            </select>
            <button class="yt-btn" onclick="loadTrending()">트렌드 불러오기</button>
          </div>
        </div>
        <div id="trending-results">
          <div style="text-align:center;padding:60px 20px;color:#94a3b8;">
            <div style="font-size:40px;margin-bottom:12px;">📈</div>
            <div style="font-size:15px;">카테고리를 선택하고 인기 동영상을 확인하세요</div>
          </div>
        </div>
      </div>

      <!-- 경쟁 채널 비교 -->
      <div class="panel" id="panel-competitor">
        <div class="section-header">
          <h2>⚔️ 경쟁 채널 비교</h2>
          <span class="section-badge">Competitor Analysis</span>
        </div>
        <div class="card">
          <div style="margin-bottom:12px;font-size:14px;color:#64748b;font-weight:600;">채널 ID 또는 채널명을 입력하여 비교하세요 (최대 3개)</div>
          <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:14px;">
            <div style="display:flex;gap:8px;">
              <input id="comp-ch1" type="text" class="input-base" placeholder="채널 1 (예: @channelname1)">
            </div>
            <div style="display:flex;gap:8px;">
              <input id="comp-ch2" type="text" class="input-base" placeholder="채널 2 (예: @channelname2)">
            </div>
            <div style="display:flex;gap:8px;">
              <input id="comp-ch3" type="text" class="input-base" placeholder="채널 3 (선택사항)">
            </div>
          </div>
          <button class="yt-btn" onclick="compareChannels()">채널 비교 분석</button>
        </div>
        <div id="competitor-results">
          <div style="text-align:center;padding:60px 20px;color:#94a3b8;">
            <div style="font-size:40px;margin-bottom:12px;">⚔️</div>
            <div style="font-size:15px;">채널 ID를 입력하여 경쟁 분석을 시작하세요</div>
          </div>
        </div>
      </div>

    </div><!-- /content -->
  </div><!-- /main-area -->
</div><!-- /wrap -->

<div id="sidebar-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:49;"></div>

<!-- 로딩 오버레이 -->
<div id="global-loading" style="display:none;position:fixed;inset:0;background:rgba(255,255,255,.7);z-index:200;align-items:center;justify-content:center;flex-direction:column;gap:12px;">
  <div style="width:40px;height:40px;border:4px solid #fee2e2;border-top-color:#ff0000;border-radius:50%;animation:spin .8s linear infinite;"></div>
  <div style="font-size:14px;font-weight:600;color:#64748b;">분석 중...</div>
</div>

<script>
// ===== 전역 상태 =====
var currentPanel = 'home';
var API_BASE = '/api/youtube';

// ===== 패널 전환 =====
function showPanel(name) {
  document.querySelectorAll('.panel').forEach(function(p){p.classList.remove('active');});
  document.querySelectorAll('.sb-item').forEach(function(i){i.classList.remove('active');});
  var panel = document.getElementById('panel-' + name);
  if(panel) panel.classList.add('active');
  var nav = document.getElementById('nav-' + name);
  if(nav) nav.classList.add('active');
  currentPanel = name;
  var titles = {
    'home': ['📺 유튜브 마케팅 분석', 'YouTube Data API v3'],
    'channel-search': ['🔍 채널 검색', '키워드로 채널 찾기'],
    'channel-detail': ['📊 채널 상세 분석', '구독자·조회수·인사이트'],
    'video-analysis': ['🎬 영상 분석', '영상 조회수·좋아요 분석'],
    'keyword-search': ['🔑 키워드 검색량', 'Search Suggestion API'],
    'keyword-insight': ['💡 키워드 인사이트', '경쟁도·트렌드 분석'],
    'trending': ['📈 인기 동영상', '실시간 트렌드'],
    'competitor': ['⚔️ 경쟁 채널 비교', '채널 간 비교 분석'],
    'video-detail': ['🔬 영상 상세분석', 'URL 입력 → 인사이트+대본 100%']
  };
  var t = titles[name] || ['📺 유튜브 마케팅', ''];
  document.getElementById('topbar-title').textContent = t[0];
  document.getElementById('topbar-sub').textContent = t[1];
  // 모바일 사이드바 닫기
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').style.display = 'none';
}

// ===== 유틸리티 =====
function fmt(n) {
  if(!n) return '0';
  n = parseInt(n);
  if(n >= 100000000) return (n/100000000).toFixed(1) + '억';
  if(n >= 10000) return (n/10000).toFixed(1) + '만';
  if(n >= 1000) return (n/1000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function showLoading(el, msg) {
  if(el) el.innerHTML = '<div style="text-align:center;padding:40px;"><div class="loading-spinner" style="width:32px;height:32px;border-width:3px;margin:0 auto 12px;"></div><div style="font-size:14px;color:#94a3b8;">' + (msg||'데이터 불러오는 중...') + '</div></div>';
}

function showError(el, msg) {
  if(el) el.innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444;"><div style="font-size:32px;margin-bottom:8px;">⚠️</div><div style="font-size:14px;">' + msg + '</div></div>';
}

// ===== 홈 검색 =====
function homeSearch() {
  var q = document.getElementById('home-search-input').value.trim();
  if(!q) return;
  document.getElementById('channel-search-input').value = q;
  showPanel('channel-search');
  searchChannels();
}

function quickSearch(kw) {
  document.getElementById('home-search-input').value = kw;
  homeSearch();
}

// ===== API 상태 확인 =====
async function checkApiStatus() {
  try {
    var resp = await fetch(API_BASE + '/status');
    var data = await resp.json();
    var badge = document.getElementById('api-status-badge');
    var homeStatus = document.getElementById('home-api-status');
    if(data.ok) {
      badge.className = 'badge badge-green';
      badge.textContent = '✅ API 연결됨';
      if(homeStatus) homeStatus.innerHTML = '';
    } else {
      badge.className = 'badge badge-red';
      badge.textContent = '❌ API 오류';
      if(homeStatus) homeStatus.innerHTML = '<div style="display:flex;align-items:center;gap:10px;padding:14px;background:#fff5f5;border-radius:10px;border:1px solid #fca5a5;"><span style="font-size:20px;">❌</span><div><div style="font-weight:700;color:#dc2626;">API 연결 오류</div><div style="font-size:12px;color:#64748b;margin-top:2px;">' + (data.error||'API 키를 확인해주세요') + '</div></div></div>';
    }
  } catch(e) {
    var badge = document.getElementById('api-status-badge');
    badge.className = 'badge badge-red';
    badge.textContent = '❌ 연결 실패';
  }
}

// ===== 채널 검색 =====
function setChannelSearch(kw) {
  document.getElementById('channel-search-input').value = kw;
  searchChannels();
}

async function searchChannels() {
  var q = document.getElementById('channel-search-input').value.trim();
  if(!q) { alert('검색어를 입력해주세요'); return; }
  var order = document.getElementById('channel-order').value;
  var el = document.getElementById('channel-search-results');
  showLoading(el, '채널 검색 중...');
  try {
    var resp = await fetch(API_BASE + '/search-channels?q=' + encodeURIComponent(q) + '&order=' + order);
    var data = await resp.json();
    if(!data.ok || !data.channels || data.channels.length === 0) {
      showError(el, data.error || '검색 결과가 없습니다');
      return;
    }
    renderChannelResults(el, data.channels, q);
  } catch(e) {
    showError(el, '채널 검색 중 오류: ' + e.message);
  }
}

function renderChannelResults(el, channels, query) {
  var html = '<div style="margin-bottom:14px;font-size:14px;color:#64748b;">🔍 <b>' + escHtml(query) + '</b> 검색 결과 · ' + channels.length + '개 채널</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;">';
  channels.forEach(function(ch) {
    html += '<div class="channel-card" onclick="loadChannelDetail(' + JSON.stringify(ch.id) + ')">';
    html += '<div style="display:flex;gap:14px;align-items:flex-start;">';
    if(ch.thumbnail) {
      html += '<img src="' + escHtml(ch.thumbnail) + '" class="channel-thumb" onerror="this.remove()">';
      html += '<div class="channel-thumb-placeholder" style="display:none;">' + (ch.title||'?')[0] + '</div>';
    } else {
      html += '<div class="channel-thumb-placeholder">' + (ch.title||'?')[0] + '</div>';
    }
    html += '<div style="flex:1;min-width:0;">';
    html += '<div style="font-weight:800;font-size:15px;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' + escHtml(ch.title) + '">' + escHtml(ch.title) + '</div>';
    html += '<div style="font-size:12px;color:#64748b;margin-bottom:8px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">' + escHtml(ch.description||'설명 없음') + '</div>';
    html += '<div style="display:flex;gap:12px;flex-wrap:wrap;">';
    html += '<span style="font-size:12px;"><span style="color:#94a3b8;">구독자</span> <b style="color:#ff0000;">' + fmt(ch.subscriberCount) + '</b></span>';
    html += '<span style="font-size:12px;"><span style="color:#94a3b8;">조회수</span> <b>' + fmt(ch.viewCount) + '</b></span>';
    html += '<span style="font-size:12px;"><span style="color:#94a3b8;">영상수</span> <b>' + fmt(ch.videoCount) + '</b></span>';
    html += '</div>';
    html += '</div></div>';
    html += '<div style="margin-top:10px;display:flex;gap:8px;">';
    html += '<button onclick="event.stopPropagation();loadChannelDetail(' + JSON.stringify(ch.id) + ')" class="yt-btn" style="padding:6px 14px;font-size:12px;flex:1;">상세 분석</button>';
    html += '<a href="https://youtube.com/channel/' + escHtml(ch.id) + '" target="_blank" class="yt-btn-outline" style="padding:6px 14px;font-size:12px;text-decoration:none;display:inline-flex;align-items:center;">유튜브 ↗</a>';
    html += '</div>';
    html += '</div>';
  });
  html += '</div>';
  el.innerHTML = html;
}

// ===== 채널 상세 분석 =====
async function loadChannelDetail(channelId) {
  showPanel('channel-detail');
  document.getElementById('channel-url-input').value = channelId;
  await analyzeChannel(channelId);
}

async function analyzeChannel(preId) {
  var q = preId || document.getElementById('channel-url-input').value.trim();
  if(!q) { alert('채널 ID를 입력해주세요'); return; }
  var el = document.getElementById('channel-detail-result');
  showLoading(el, '채널 분석 중...');
  try {
    var resp = await fetch(API_BASE + '/channel-detail?id=' + encodeURIComponent(q));
    var data = await resp.json();
    if(!data.ok || !data.channel) {
      showError(el, data.error || '채널 정보를 가져올 수 없습니다');
      return;
    }
    renderChannelDetail(el, data.channel, data.recentVideos||[]);
  } catch(e) {
    showError(el, '채널 분석 오류: ' + e.message);
  }
}

function renderChannelDetail(el, ch, videos) {
  var engRate = ch.videoCount > 0 ? ((ch.viewCount / ch.videoCount) / Math.max(ch.subscriberCount,1) * 100).toFixed(2) : '0';
  var avgViews = ch.videoCount > 0 ? Math.round(ch.viewCount / ch.videoCount) : 0;
  var html = '';
  // 채널 헤더
  html += '<div class="card">';
  html += '<div style="display:flex;gap:18px;align-items:flex-start;flex-wrap:wrap;">';
  if(ch.thumbnail) html += '<img src="' + escHtml(ch.thumbnail) + '" style="width:80px;height:80px;border-radius:50%;border:3px solid #fee2e2;" onerror="this.remove()">';
  html += '<div style="flex:1;min-width:0;">';
  html += '<div style="font-size:22px;font-weight:900;margin-bottom:4px;">' + escHtml(ch.title) + '</div>';
  html += '<div style="font-size:14px;color:#64748b;margin-bottom:8px;">' + escHtml(ch.description||'') + '</div>';
  html += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
  if(ch.country) html += '<span class="badge badge-blue">🌏 ' + escHtml(ch.country) + '</span>';
  if(ch.publishedAt) html += '<span class="badge badge-gray">📅 ' + escHtml(ch.publishedAt.substring(0,10)) + ' 개설</span>';
  html += '</div></div>';
  html += '<a href="https://youtube.com/channel/' + escHtml(ch.id) + '" target="_blank" class="yt-btn" style="white-space:nowrap;">유튜브에서 보기 ↗</a>';
  html += '</div></div>';

  // 통계 그리드
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin-bottom:20px;">';
  var stats = [
    {label:'구독자 수', val:fmt(ch.subscriberCount), icon:'👥', color:'#ff0000'},
    {label:'총 조회수', val:fmt(ch.viewCount), icon:'👁️', color:'#8b5cf6'},
    {label:'업로드 영상', val:fmt(ch.videoCount), icon:'🎬', color:'#8b5cf6'},
    {label:'평균 조회수', val:fmt(avgViews), icon:'📊', color:'#f59e0b'},
    {label:'영상당 평균 참여율', val:engRate + '%', icon:'💬', color:'#10b981'},
  ];
  stats.forEach(function(s) {
    html += '<div class="stat-box"><div style="font-size:22px;margin-bottom:4px;">' + s.icon + '</div>';
    html += '<div class="stat-val" style="color:' + s.color + ';font-size:22px;">' + s.val + '</div>';
    html += '<div class="stat-label">' + s.label + '</div></div>';
  });
  html += '</div>';

  // 최근 영상 (최대 40개 + 요약 버튼)
  if(videos && videos.length > 0) {
    html += '<div class="card">';
    html += '<div class="section-header"><h2>🎬 최근 업로드 영상 (' + videos.length + '개)</h2></div>';
    html += '<div class="table-wrap"><table>';
    html += '<tr><th>썸네일</th><th>제목</th><th>조회수</th><th>좋아요</th><th>댓글</th><th>업로드일</th><th>요약/분석</th></tr>';
    videos.forEach(function(v) {
      var sid = 'sum-ch-' + escHtml(v.id);
      html += '<tr>';
      if(v.thumbnail) {
        html += '<td><a href="https://youtube.com/watch?v=' + escHtml(v.id) + '" target="_blank"><img src="' + escHtml(v.thumbnail) + '" class="video-thumb" onerror="this.remove()"></a></td>';
      } else {
        html += '<td><div class="video-thumb-placeholder">▶️</div></td>';
      }
      html += '<td style="max-width:240px;"><a href="https://youtube.com/watch?v=' + escHtml(v.id) + '" target="_blank" style="color:#1e293b;font-weight:600;text-decoration:none;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">' + escHtml(v.title) + '</a>';
      html += '<div id="' + sid + '" class="summary-box"></div></td>';
      html += '<td><b>' + fmt(v.viewCount) + '</b></td>';
      html += '<td>' + fmt(v.likeCount) + '</td>';
      html += '<td>' + fmt(v.commentCount) + '</td>';
      html += '<td style="font-size:12px;color:#94a3b8;">' + (v.publishedAt||'').substring(0,10) + '</td>';
      html += '<td style="white-space:nowrap;"><button class="summary-btn" data-vid="' + escHtml(v.id) + '" data-sid="' + sid + '">▶ 요약</button> <button class="yt-btn detail-btn" style="padding:4px 10px;font-size:11px;" data-vid="' + escHtml(v.id) + '">🔍 상세</button></td>';
      html += '</tr>';
    });
    html += '</table></div></div>';
  }
  el.innerHTML = html;
}

// ===== 영상 검색 =====
async function searchVideos() {
  var q = document.getElementById('video-search-input').value.trim();
  if(!q) { alert('검색어를 입력해주세요'); return; }
  var order = document.getElementById('video-order').value;
  var el = document.getElementById('video-search-results');
  showLoading(el, '영상 검색 중...');
  try {
    var resp = await fetch(API_BASE + '/search-videos?q=' + encodeURIComponent(q) + '&order=' + order);
    var data = await resp.json();
    if(!data.ok || !data.videos || data.videos.length === 0) {
      showError(el, data.error || '검색 결과가 없습니다');
      return;
    }
    renderVideoResults(el, data.videos, q);
  } catch(e) {
    showError(el, '영상 검색 오류: ' + e.message);
  }
}

function renderVideoResults(el, videos, query) {
  var html = '<div style="margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">';
  html += '<span style="font-size:14px;color:#64748b;">🎬 <b>' + escHtml(query) + '</b> 영상 검색 결과 · ' + videos.length + '개</span>';
  html += '<button class="yt-btn" style="padding:7px 16px;font-size:12px;background:linear-gradient(135deg,#10b981,#059669);" onclick="downloadVideoExcel()">📥 엑셀 다운로드</button>';
  html += '</div>';
  html += '<div class="table-wrap"><table id="video-results-table">';
  html += '<tr><th>썸네일</th><th>제목 / 채널 / 설명</th><th>태그</th><th>조회수</th><th>좋아요</th><th>댓글</th><th>업로드일</th><th>요약/분석</th></tr>';
  videos.forEach(function(v) {
    var sid = 'sum-v-' + escHtml(v.id);
    var descId = 'desc-v-' + escHtml(v.id);
    html += '<tr data-id="' + escHtml(v.id) + '" data-title="' + escHtml(v.title) + '" data-channel="' + escHtml(v.channelTitle||'') + '" data-views="' + escHtml(v.viewCount) + '" data-likes="' + escHtml(v.likeCount) + '" data-comments="' + escHtml(v.commentCount) + '" data-date="' + escHtml((v.publishedAt||'').substring(0,10)) + '">';
    if(v.thumbnail) {
      html += '<td><a href="https://youtube.com/watch?v=' + escHtml(v.id) + '" target="_blank"><img src="' + escHtml(v.thumbnail) + '" class="video-thumb" onerror="this.remove()"></a></td>';
    } else {
      html += '<td><div class="video-thumb-placeholder">▶️</div></td>';
    }
    // 제목 + 채널 + 설명 펼치기
    var descShort = (v.description||'').substring(0, 120);
    var descFull = v.description || '';
    html += '<td style="max-width:280px;">';
    html += '<div style="font-weight:700;margin-bottom:4px;">' + escHtml(v.title) + '</div>';
    html += '<div style="font-size:11px;color:#94a3b8;margin-bottom:4px;">' + escHtml(v.channelTitle||'') + '</div>';
    if(descFull) {
      html += '<div id="' + descId + '" style="font-size:11px;color:#64748b;line-height:1.5;background:#f8fafc;border-radius:6px;padding:6px 8px;margin-bottom:4px;max-height:60px;overflow:hidden;transition:max-height .3s;">' + escHtml(descShort) + (descFull.length > 120 ? '…' : '') + '</div>';
      if(descFull.length > 120) {
        html += '<button class="desc-toggle-btn" data-desc-id="' + descId + '" data-full="' + escHtml(descFull).replace(/"/g,'&quot;') + '" data-short="' + escHtml(descShort).replace(/"/g,'&quot;') + '…" style="font-size:10px;color:#6366f1;background:none;border:none;cursor:pointer;padding:0;margin-bottom:4px;">▼ 설명 더보기</button>';
      }
    }
    html += '<div id="' + sid + '" class="summary-box"></div></td>';
    // 태그 컬럼
    html += '<td style="max-width:160px;vertical-align:top;padding-top:8px;">';
    if(v.tags && v.tags.length > 0) {
      html += '<div style="display:flex;flex-wrap:wrap;gap:3px;">';
      v.tags.slice(0, 8).forEach(function(t) {
        html += '<span style="font-size:10px;background:#eff6ff;color:#7c3aed;border:1px solid #bfdbfe;border-radius:8px;padding:2px 6px;">#' + escHtml(t) + '</span>';
      });
      if(v.tags.length > 8) html += '<span style="font-size:10px;color:#94a3b8;">+' + (v.tags.length - 8) + '개</span>';
      html += '</div>';
    } else {
      html += '<span style="font-size:10px;color:#cbd5e1;">태그 없음</span>';
    }
    html += '</td>';
    html += '<td><b>' + fmt(v.viewCount) + '</b></td>';
    html += '<td>' + fmt(v.likeCount) + '</td>';
    html += '<td>' + fmt(v.commentCount) + '</td>';
    html += '<td style="font-size:12px;color:#94a3b8;">' + (v.publishedAt||'').substring(0,10) + '</td>';
    html += '<td style="white-space:nowrap;"><button class="summary-btn" data-vid="' + escHtml(v.id) + '" data-sid="' + sid + '">▶ 요약</button> <button class="yt-btn detail-btn" style="padding:4px 10px;font-size:11px;" data-vid="' + escHtml(v.id) + '">🔍 상세</button></td>';
    html += '</tr>';
  });
  html += '</table></div>';
  el.innerHTML = html;
}

// ===== 키워드 검색량 분석 =====
function setKeyword(kw) {
  document.getElementById('keyword-input').value = kw;
  analyzeKeyword();
}

async function analyzeKeyword() {
  var q = document.getElementById('keyword-input').value.trim();
  if(!q) { alert('키워드를 입력해주세요'); return; }
  var el = document.getElementById('keyword-result');
  showLoading(el, '키워드 분석 중 (Suggestion API 호출)...');
  try {
    var resp = await fetch(API_BASE + '/keyword-suggestions?q=' + encodeURIComponent(q));
    var data = await resp.json();
    if(!data.ok) {
      showError(el, data.error || '키워드 분석 실패');
      return;
    }
    renderKeywordResult(el, q, data);
  } catch(e) {
    showError(el, '키워드 분석 오류: ' + e.message);
  }
}

function renderKeywordResult(el, mainKw, data) {
  var suggestions = data.suggestions || [];
  var videoData = data.videoData || [];
  var relatedSearches = data.relatedSearches || [];

  var html = '';
  // 메인 키워드 카드
  html += '<div class="card">';
  html += '<div style="font-size:18px;font-weight:900;margin-bottom:16px;">🔑 <span style="color:#ff0000;">' + escHtml(mainKw) + '</span> 키워드 분석';
  html += '<span style="font-size:11px;background:#fff5f5;color:#ff0000;padding:3px 10px;border-radius:10px;margin-left:10px;font-weight:600;">YouTube Search Suggestion</span>';
  html += '</div>';

  // 연관 검색어 (Suggestion API)
  if(suggestions.length > 0) {
    html += '<div style="margin-bottom:20px;">';
    html += '<div style="font-size:14px;font-weight:700;color:#64748b;margin-bottom:10px;">🔗 연관 검색어 (' + suggestions.length + '개) - 실시간 자동완성 기반</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:8px;">';
    suggestions.forEach(function(s, i) {
      var score = Math.max(20, 100 - i * 7);
      html += '<div onclick="setKeyword(' + JSON.stringify(s) + ')" class="kw-hover-btn" style="background:#fff;border:1.5px solid #fca5a5;border-radius:20px;padding:7px 14px;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:6px;"><span style="font-size:13px;font-weight:600;">' + escHtml(s) + '</span><span style="font-size:10px;color:#94a3b8;background:#f1f5f9;padding:1px 6px;border-radius:8px;">' + score + '</span></div>';
    });
    html += '</div></div>';
  }

  // 트렌드 바
  if(suggestions.length > 0) {
    html += '<div style="margin-bottom:20px;">';
    html += '<div style="font-size:14px;font-weight:700;color:#64748b;margin-bottom:10px;">📊 연관 키워드 상대 검색량 지수</div>';
    var top10 = suggestions.slice(0, 10);
    top10.forEach(function(s, i) {
      var w = Math.max(10, 100 - i * 9);
      html += '<div style="margin-bottom:8px;">';
      html += '<div style="display:flex;justify-content:space-between;margin-bottom:3px;">';
      html += '<span style="font-size:13px;font-weight:600;">' + escHtml(s) + '</span>';
      html += '<span style="font-size:12px;color:#94a3b8;">' + w + '</span>';
      html += '</div>';
      html += '<div class="trend-bar"><div class="trend-bar-fill" style="width:' + w + '%;"></div></div>';
      html += '</div>';
    });
    html += '</div>';
  }
  html += '</div>';

  // 관련 영상 데이터
  if(videoData.length > 0) {
    html += '<div class="card">';
    html += '<div style="font-size:16px;font-weight:800;margin-bottom:16px;">🎬 <b>' + escHtml(mainKw) + '</b> 관련 상위 영상 통계</div>';
    var totalViews = videoData.reduce(function(a,v){return a+(parseInt(v.viewCount)||0);}, 0);
    var totalLikes = videoData.reduce(function(a,v){return a+(parseInt(v.likeCount)||0);}, 0);
    var avgViews = videoData.length ? Math.round(totalViews / videoData.length) : 0;
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:16px;">';
    html += '<div class="stat-box"><div style="font-size:18px;">👁️</div><div class="stat-val" style="font-size:20px;color:#ff0000;">' + fmt(avgViews) + '</div><div class="stat-label">평균 조회수</div></div>';
    html += '<div class="stat-box"><div style="font-size:18px;">👍</div><div class="stat-val" style="font-size:20px;color:#8b5cf6;">' + fmt(Math.round(totalLikes/videoData.length)) + '</div><div class="stat-label">평균 좋아요</div></div>';
    html += '<div class="stat-box"><div style="font-size:18px;">🎬</div><div class="stat-val" style="font-size:20px;color:#8b5cf6;">' + videoData.length + '</div><div class="stat-label">분석 영상 수</div></div>';
    html += '</div>';

    html += '<div class="table-wrap"><table>';
    html += '<tr><th>썸네일</th><th>제목</th><th>채널</th><th>조회수</th><th>좋아요</th><th>댓글</th><th>업로드일</th></tr>';
    videoData.forEach(function(v) {
      html += '<tr>';
      if(v.thumbnail) {
        html += '<td><a href="https://youtube.com/watch?v=' + escHtml(v.id) + '" target="_blank"><img src="' + escHtml(v.thumbnail) + '" class="video-thumb"></a></td>';
      } else {
        html += '<td><div class="video-thumb-placeholder">▶️</div></td>';
      }
      html += '<td style="max-width:200px;"><div style="font-weight:600;font-size:13px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">' + escHtml(v.title) + '</div></td>';
      html += '<td style="font-size:12px;color:#64748b;">' + escHtml(v.channelTitle||'') + '</td>';
      html += '<td><b style="color:#ff0000;">' + fmt(v.viewCount) + '</b></td>';
      html += '<td>' + fmt(v.likeCount) + '</td>';
      html += '<td>' + fmt(v.commentCount) + '</td>';
      html += '<td style="font-size:11px;color:#94a3b8;">' + (v.publishedAt||'').substring(0,10) + '</td>';
      html += '</tr>';
    });
    html += '</table></div></div>';
  }

  el.innerHTML = html;
}

// ===== 키워드 인사이트 =====
async function analyzeKeywordInsight() {
  var q = document.getElementById('insight-keyword-input').value.trim();
  if(!q) { alert('키워드를 입력해주세요'); return; }
  var el = document.getElementById('keyword-insight-result');
  showLoading(el, '인사이트 분석 중...');
  try {
    var [chanResp, vidResp] = await Promise.all([
      fetch(API_BASE + '/search-channels?q=' + encodeURIComponent(q) + '&order=relevance'),
      fetch(API_BASE + '/search-videos?q=' + encodeURIComponent(q) + '&order=viewCount')
    ]);
    var chanData = await chanResp.json();
    var vidData = await vidResp.json();
    renderKeywordInsight(el, q, chanData.channels||[], vidData.videos||[]);
  } catch(e) {
    showError(el, '인사이트 분석 오류: ' + e.message);
  }
}

function renderKeywordInsight(el, kw, channels, videos) {
  var totalSubs = channels.reduce(function(a,c){return a+(parseInt(c.subscriberCount)||0);}, 0);
  var avgSubs = channels.length ? Math.round(totalSubs / channels.length) : 0;
  var totalViews = videos.reduce(function(a,v){return a+(parseInt(v.viewCount)||0);}, 0);
  var avgViews = videos.length ? Math.round(totalViews / videos.length) : 0;
  var totalLikes = videos.reduce(function(a,v){return a+(parseInt(v.likeCount)||0);}, 0);
  var avgLikes = videos.length ? Math.round(totalLikes / videos.length) : 0;
  // 경쟁도 계산 (단순화: 채널 수 + 평균 구독자 기반)
  var compScore = Math.min(100, Math.round((channels.length * 5) + (avgSubs / 100000 * 10)));
  var compLabel = compScore >= 70 ? '🔴 높음' : compScore >= 40 ? '🟡 보통' : '🟢 낮음';

  var html = '<div class="card">';
  html += '<div style="font-size:18px;font-weight:900;margin-bottom:20px;">💡 <span style="color:#ff0000;">' + escHtml(kw) + '</span> 키워드 인사이트</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:20px;">';
  var stats = [
    {label:'관련 채널 수', val:channels.length + '개', icon:'📺', color:'#ff0000'},
    {label:'채널 평균 구독자', val:fmt(avgSubs), icon:'👥', color:'#8b5cf6'},
    {label:'영상 평균 조회수', val:fmt(avgViews), icon:'👁️', color:'#8b5cf6'},
    {label:'영상 평균 좋아요', val:fmt(avgLikes), icon:'👍', color:'#f59e0b'},
    {label:'경쟁도', val:compLabel, icon:'⚔️', color:'#10b981'},
    {label:'경쟁 점수', val:compScore + '/100', icon:'📊', color:'#64748b'},
  ];
  stats.forEach(function(s) {
    html += '<div class="stat-box"><div style="font-size:20px;">' + s.icon + '</div>';
    html += '<div style="font-size:20px;font-weight:900;color:' + s.color + ';margin:4px 0;">' + s.val + '</div>';
    html += '<div style="font-size:11px;color:#94a3b8;">' + s.label + '</div></div>';
  });
  html += '</div>';

  // 인사이트 텍스트
  html += '<div style="background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:16px;">';
  html += '<div style="font-size:14px;font-weight:700;margin-bottom:10px;">🎯 인사이트 요약</div>';
  var insights = [];
  if(avgSubs > 1000000) insights.push('• 이 키워드는 대형 채널들이 주도하는 경쟁이 치열한 분야입니다.');
  else if(avgSubs > 100000) insights.push('• 중형 채널들이 활발히 활동 중이며 성장 가능성이 있습니다.');
  else insights.push('• 비교적 소규모 채널들이 많아 신규 진입 기회가 있습니다.');
  if(avgViews > 1000000) insights.push('• 조회수가 매우 높아 광고 수익화에 유리한 키워드입니다.');
  else if(avgViews > 100000) insights.push('• 준수한 조회수를 보이며 콘텐츠 제작 가치가 높습니다.');
  if(compScore >= 70) insights.push('• 경쟁이 높으므로 차별화된 콘텐츠 전략이 필요합니다.');
  else if(compScore < 40) insights.push('• 경쟁이 낮아 틈새시장 공략에 적합한 키워드입니다.');
  insights.forEach(function(i) {
    html += '<div style="font-size:13px;color:#475569;margin-bottom:6px;">' + i + '</div>';
  });
  html += '</div>';

  // 상위 채널
  if(channels.length > 0) {
    html += '<div style="margin-bottom:16px;">';
    html += '<div style="font-size:14px;font-weight:700;margin-bottom:10px;">🏆 관련 상위 채널</div>';
    html += '<div style="display:flex;flex-direction:column;gap:8px;">';
    channels.slice(0,5).forEach(function(ch, i) {
      html += '<div style="display:flex;align-items:center;gap:12px;padding:10px;background:#f8fafc;border-radius:10px;">';
      html += '<div style="font-size:16px;font-weight:900;color:#cbd5e1;width:24px;text-align:center;">' + (i+1) + '</div>';
      if(ch.thumbnail) html += '<img src="' + escHtml(ch.thumbnail) + '" style="width:36px;height:36px;border-radius:50%;" onerror="this.remove()">';
      html += '<div style="flex:1;">';
      html += '<div style="font-weight:700;font-size:13px;">' + escHtml(ch.title) + '</div>';
      html += '<div style="font-size:11px;color:#94a3b8;">구독자 ' + fmt(ch.subscriberCount) + ' · 조회수 ' + fmt(ch.viewCount) + '</div>';
      html += '</div>';
      html += '<button onclick="loadChannelDetail(' + JSON.stringify(ch.id) + ')" class="yt-btn" style="padding:5px 12px;font-size:11px;">분석</button>';
      html += '</div>';
    });
    html += '</div></div>';
  }
  html += '</div>';
  el.innerHTML = html;
}

// ===== 인기 동영상 트렌드 =====
async function loadTrending() {
  var category = document.getElementById('trending-category').value;
  var el = document.getElementById('trending-results');
  showLoading(el, '인기 동영상 불러오는 중...');
  try {
    var resp = await fetch(API_BASE + '/trending?categoryId=' + category);
    var data = await resp.json();
    if(!data.ok || !data.videos || data.videos.length === 0) {
      showError(el, data.error || '인기 동영상을 가져올 수 없습니다');
      return;
    }
    renderTrending(el, data.videos);
  } catch(e) {
    showError(el, '트렌드 불러오기 오류: ' + e.message);
  }
}

function renderTrending(el, videos) {
  var html = '<div style="margin-bottom:14px;font-size:14px;color:#64748b;">📈 인기 동영상 · ' + videos.length + '개</div>';
  html += '<div class="table-wrap"><table>';
  html += '<tr><th>#</th><th>썸네일</th><th>제목 / 채널</th><th>조회수</th><th>좋아요</th><th>댓글</th><th>업로드일</th><th>요약/분석</th></tr>';
  videos.forEach(function(v, i) {
    var sid = 'sum-tr-' + escHtml(v.id);
    html += '<tr>';
    html += '<td><b style="color:#ff0000;">' + (i+1) + '</b></td>';
    if(v.thumbnail) {
      html += '<td><a href="https://youtube.com/watch?v=' + escHtml(v.id) + '" target="_blank"><img src="' + escHtml(v.thumbnail) + '" class="video-thumb"></a></td>';
    } else {
      html += '<td><div class="video-thumb-placeholder">▶️</div></td>';
    }
    html += '<td style="max-width:240px;"><div style="font-weight:700;font-size:13px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">' + escHtml(v.title) + '</div><div style="font-size:11px;color:#94a3b8;margin-top:2px;">' + escHtml(v.channelTitle||'') + '</div>';
    html += '<div id="' + sid + '" class="summary-box"></div></td>';
    html += '<td><b style="color:#ff0000;">' + fmt(v.viewCount) + '</b></td>';
    html += '<td>' + fmt(v.likeCount) + '</td>';
    html += '<td>' + fmt(v.commentCount) + '</td>';
    html += '<td style="font-size:11px;color:#94a3b8;">' + (v.publishedAt||'').substring(0,10) + '</td>';
    html += '<td style="white-space:nowrap;"><button class="summary-btn" data-vid="' + escHtml(v.id) + '" data-sid="' + sid + '">▶ 요약</button> <button class="yt-btn detail-btn" style="padding:4px 10px;font-size:11px;" data-vid="' + escHtml(v.id) + '">🔍 상세</button></td>';
    html += '</tr>';
  });
  html += '</table></div>';
  el.innerHTML = html;
}

// ===== 경쟁 채널 비교 =====
async function compareChannels() {
  var ids = [
    document.getElementById('comp-ch1').value.trim(),
    document.getElementById('comp-ch2').value.trim(),
    document.getElementById('comp-ch3').value.trim(),
  ].filter(Boolean);
  if(ids.length < 2) { alert('최소 2개 채널을 입력해주세요'); return; }
  var el = document.getElementById('competitor-results');
  showLoading(el, '채널 비교 분석 중...');
  try {
    var results = await Promise.all(ids.map(function(id) {
      return fetch(API_BASE + '/channel-detail?id=' + encodeURIComponent(id)).then(function(r){return r.json();});
    }));
    var channels = results.filter(function(r){return r.ok && r.channel;}).map(function(r){return r.channel;});
    if(channels.length < 2) {
      showError(el, '유효한 채널 정보를 가져올 수 없습니다. 채널 ID를 확인해주세요.');
      return;
    }
    renderCompetitor(el, channels);
  } catch(e) {
    showError(el, '비교 분석 오류: ' + e.message);
  }
}

function renderCompetitor(el, channels) {
  var colors = ['#ff0000', '#8b5cf6', '#10b981'];
  var maxSubs = Math.max.apply(null, channels.map(function(c){return parseInt(c.subscriberCount)||0;}));
  var maxViews = Math.max.apply(null, channels.map(function(c){return parseInt(c.viewCount)||0;}));
  var maxVideos = Math.max.apply(null, channels.map(function(c){return parseInt(c.videoCount)||0;}));

  var html = '<div class="card">';
  html += '<div style="font-size:18px;font-weight:900;margin-bottom:20px;">⚔️ 채널 비교 분석</div>';

  // 채널 카드
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:24px;">';
  channels.forEach(function(ch, i) {
    var subsRatio = maxSubs > 0 ? (parseInt(ch.subscriberCount)||0) / maxSubs * 100 : 0;
    html += '<div style="border:2px solid ' + colors[i] + ';border-radius:14px;padding:16px;">';
    html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">';
    if(ch.thumbnail) html += '<img src="' + escHtml(ch.thumbnail) + '" style="width:44px;height:44px;border-radius:50%;">';
    html += '<div><div style="font-weight:800;font-size:14px;">' + escHtml(ch.title) + '</div>';
    html += '<div style="font-size:11px;color:#94a3b8;">' + (ch.country||'') + '</div></div></div>';
    html += '<div style="display:flex;flex-direction:column;gap:8px;">';
    html += '<div><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;"><span>구독자</span><b style="color:' + colors[i] + ';">' + fmt(ch.subscriberCount) + '</b></div>';
    html += '<div style="height:6px;background:#f1f5f9;border-radius:3px;"><div style="height:100%;background:' + colors[i] + ';border-radius:3px;width:' + subsRatio.toFixed(1) + '%;"></div></div></div>';
    var viewsRatio = maxViews > 0 ? (parseInt(ch.viewCount)||0) / maxViews * 100 : 0;
    html += '<div><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;"><span>총 조회수</span><b>' + fmt(ch.viewCount) + '</b></div>';
    html += '<div style="height:6px;background:#f1f5f9;border-radius:3px;"><div style="height:100%;background:' + colors[i] + ';border-radius:3px;opacity:.6;width:' + viewsRatio.toFixed(1) + '%;"></div></div></div>';
    var videosRatio = maxVideos > 0 ? (parseInt(ch.videoCount)||0) / maxVideos * 100 : 0;
    html += '<div><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;"><span>영상 수</span><b>' + fmt(ch.videoCount) + '</b></div>';
    html += '<div style="height:6px;background:#f1f5f9;border-radius:3px;"><div style="height:100%;background:' + colors[i] + ';border-radius:3px;opacity:.4;width:' + videosRatio.toFixed(1) + '%;"></div></div></div>';
    html += '</div></div>';
  });
  html += '</div>';

  // 순위 표
  html += '<div style="font-size:14px;font-weight:700;margin-bottom:12px;">📊 채널 비교 순위</div>';
  html += '<div class="table-wrap"><table>';
  html += '<tr><th>채널</th><th>구독자</th><th>총 조회수</th><th>영상 수</th><th>평균 조회수/영상</th></tr>';
  var sorted = channels.slice().sort(function(a,b){return (parseInt(b.subscriberCount)||0)-(parseInt(a.subscriberCount)||0);});
  sorted.forEach(function(ch, i) {
    var avgPer = ch.videoCount > 0 ? Math.round((parseInt(ch.viewCount)||0) / (parseInt(ch.videoCount)||1)) : 0;
    html += '<tr>';
    html += '<td><div style="display:flex;align-items:center;gap:8px;">';
    if(ch.thumbnail) html += '<img src="' + escHtml(ch.thumbnail) + '" style="width:28px;height:28px;border-radius:50%;">';
    html += '<span style="font-weight:700;">' + escHtml(ch.title) + '</span></div></td>';
    html += '<td><b style="color:#ff0000;">' + fmt(ch.subscriberCount) + '</b>' + (i===0?'<span style="margin-left:4px;font-size:10px;">🏆</span>':'') + '</td>';
    html += '<td>' + fmt(ch.viewCount) + '</td>';
    html += '<td>' + fmt(ch.videoCount) + '</td>';
    html += '<td>' + fmt(avgPer) + '</td>';
    html += '</tr>';
  });
  html += '</table></div></div>';
  el.innerHTML = html;
}

// ===== XSS 방지 =====
function escHtml(s) {
  if(s === null || s === undefined) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===== 요약 토글 =====
var summaryCache = {};
async function toggleSummary(videoId, boxId, btnEl) {
  var box = document.getElementById(boxId);
  var btn = btnEl || null;
  if(!box) return;
  if(box.classList.contains('open')) {
    box.classList.remove('open');
    box.innerHTML = '';
    if(btn) btn.textContent = '▶ 요약';
    return;
  }
  // 캐시된 내용 있으면 바로 표시
  if(summaryCache[videoId]) {
    box.innerHTML = summaryCache[videoId];
    box.classList.add('open');
    if(btn) btn.textContent = '▼ 닫기';
    return;
  }
  if(btn) btn.textContent = '⏳...';
  if(btn) btn.disabled = true;
  box.innerHTML = '<div style="color:#94a3b8;font-size:12px;padding:8px 0;">요약 불러오는 중...</div>';
  box.classList.add('open');
  try {
    var resp = await fetch(API_BASE + '/video-summary?id=' + encodeURIComponent(videoId));
    var data = await resp.json();
    var content = '';
    if(data.ok) {
      content += '<div style="font-weight:700;color:#334155;margin-bottom:6px;font-size:13px;">📝 내용 요약</div>';
      content += '<div style="color:#475569;line-height:1.7;font-size:13px;">' + escHtml(data.summary) + '</div>';
      if(data.tags && data.tags.length > 0) {
        content += '<div style="margin-top:8px;">';
        data.tags.slice(0,8).forEach(function(t) {
          content += '<span class="detail-tag">#' + escHtml(t) + '</span>';
        });
        content += '</div>';
      }
      content += '<div style="margin-top:8px;"><a href="https://youtube.com/watch?v=' + escHtml(videoId) + '" target="_blank" style="font-size:12px;color:#ff0000;font-weight:600;">▶ 유튜브에서 보기 ↗</a></div>';
    } else {
      content = '<div style="color:#ef4444;font-size:12px;">요약 불러오기 실패: ' + escHtml(data.error||'') + '</div>';
    }
    summaryCache[videoId] = content;
    box.innerHTML = content;
    if(btn) { btn.textContent = '▼ 닫기'; btn.disabled = false; }
  } catch(e) {
    box.innerHTML = '<div style="color:#ef4444;font-size:12px;">요약 오류</div>';
    if(btn) { btn.textContent = '▶ 요약'; btn.disabled = false; }
  }
}

// ===== 영상 상세분석 패널 열기 =====
function openVideoDetail(videoId) {
  document.getElementById('video-detail-input').value = 'https://www.youtube.com/watch?v=' + videoId;
  showPanel('video-detail');
  analyzeVideoDetail();
}

async function analyzeVideoDetail() {
  var url = document.getElementById('video-detail-input').value.trim();
  if(!url) { alert('영상 URL 또는 ID를 입력해주세요'); return; }
  var el = document.getElementById('video-detail-result');
  showLoading(el, '영상 상세 분석 중... (인사이트, 자막, 댓글 수집)');
  try {
    var resp = await fetch(API_BASE + '/video-detail?url=' + encodeURIComponent(url));
    var data = await resp.json();
    if(!data.ok) { showError(el, data.error || '영상 분석 실패'); return; }
    renderVideoDetail(el, data);
  } catch(e) {
    showError(el, '영상 분석 오류: ' + e.message);
  }
}

function renderVideoDetail(el, d) {
  var NL = String.fromCharCode(10);
  var html = '';
  // 헤더
  html += '<div class="card">';
  html += '<div style="display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap;">';
  if(d.thumbnail) {
    html += '<img src="' + escHtml(d.thumbnail) + '" style="width:280px;border-radius:12px;flex-shrink:0;" onerror="this.remove()">';
  }
  html += '<div style="flex:1;min-width:0;">';
  html += '<div style="font-size:20px;font-weight:900;margin-bottom:10px;line-height:1.4;">' + escHtml(d.title) + '</div>';
  html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">';
  html += '<span class="badge badge-red">▶ ' + escHtml(d.channelTitle) + '</span>';
  if(d.duration) html += '<span class="badge badge-blue">⏱ ' + escHtml(d.duration) + '</span>';
  if(d.publishedAt) html += '<span class="badge badge-gray">📅 ' + escHtml(d.publishedAt.substring(0,10)) + '</span>';
  if(d.definition) html += '<span class="badge badge-green">' + d.definition.toUpperCase() + '</span>';
  html += '</div>';
  // 핵심 통계
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin-bottom:14px;">';
  html += '<div class="stat-box"><div style="font-size:18px;">👁️</div><div class="stat-val" style="font-size:20px;color:#ff0000;">' + fmt(d.stats.viewCount) + '</div><div class="stat-label">조회수</div></div>';
  html += '<div class="stat-box"><div style="font-size:18px;">👍</div><div class="stat-val" style="font-size:20px;color:#8b5cf6;">' + fmt(d.stats.likeCount) + '</div><div class="stat-label">좋아요</div></div>';
  html += '<div class="stat-box"><div style="font-size:18px;">💬</div><div class="stat-val" style="font-size:20px;color:#8b5cf6;">' + fmt(d.stats.commentCount) + '</div><div class="stat-label">댓글 수</div></div>';
  html += '<div class="stat-box"><div style="font-size:18px;">📊</div><div class="stat-val" style="font-size:20px;color:#f59e0b;">' + d.stats.engagementRate + '%</div><div class="stat-label">참여율</div></div>';
  html += '</div>';
  html += '<a href="https://www.youtube.com/watch?v=' + escHtml(d.videoId) + '" target="_blank" class="yt-btn" style="display:inline-block;">▶ 유튜브에서 보기 ↗</a>';
  html += '</div></div>';

  // 채널 정보
  if(d.channelInfo && d.channelInfo.title) {
    html += '<div class="card">';
    html += '<div style="font-size:15px;font-weight:800;margin-bottom:12px;">📡 채널 정보</div>';
    html += '<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;">';
    if(d.channelInfo.thumbnail) html += '<img src="' + escHtml(d.channelInfo.thumbnail) + '" style="width:48px;height:48px;border-radius:50%;" onerror="this.remove()">';
    html += '<div>';
    html += '<div style="font-weight:700;font-size:15px;">' + escHtml(d.channelInfo.title) + '</div>';
    html += '<div style="font-size:13px;color:#64748b;">구독자 ' + fmt(d.channelInfo.subscriberCount) + ' · 총 영상 ' + fmt(d.channelInfo.videoCount) + ' · 총 조회수 ' + fmt(d.channelInfo.viewCount) + '</div>';
    html += '</div></div></div>';
  }

  // 영상 설명 (전체)
  if(d.description) {
    html += '<div class="card">';
    html += '<div style="font-size:15px;font-weight:800;margin-bottom:12px;">📄 영상 설명 (전체)</div>';
    var descLines = escHtml(d.description).split(NL).join('<br>');
    html += '<div style="font-size:13px;color:#334155;line-height:1.8;background:#f8fafc;border-radius:10px;padding:16px;max-height:400px;overflow-y:auto;">' + descLines + '</div>';
    if(d.timestamps && d.timestamps.length > 0) {
      html += '<div style="margin-top:14px;">';
      html += '<div style="font-weight:700;font-size:13px;color:#64748b;margin-bottom:8px;">⏱ 타임스탬프</div>';
      d.timestamps.forEach(function(ts) {
        html += '<div style="font-size:13px;color:#334155;padding:3px 0;">' + escHtml(ts) + '</div>';
      });
      html += '</div>';
    }
    html += '</div>';
  }

  // 태그
  if(d.tags && d.tags.length > 0) {
    html += '<div class="card">';
    html += '<div style="font-size:15px;font-weight:800;margin-bottom:12px;">🏷 태그 (' + d.tags.length + '개)</div>';
    html += '<div>';
    d.tags.forEach(function(t) {
      html += '<span class="detail-tag">#' + escHtml(t) + '</span>';
    });
    html += '</div></div>';
  }

  // 자막/대본 정보 (전체 표시 + 복사 버튼)
  html += '<div class="card">';
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">';
  html += '<div style="font-size:15px;font-weight:800;">📝 자막 / 대본 정보</div>';
  html += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
  if(d.captionFull && d.captionFull.length > 0) {
    html += '<button onclick="copyScriptText()" style="padding:6px 14px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;">📋 대본 전체 복사</button>';
    html += '<button onclick="downloadScript()" style="padding:6px 14px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;">💾 TXT 저장</button>';
  } else if(d.description) {
    html += '<button onclick="copyScriptText()" style="padding:6px 14px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;">📋 설명 전체 복사</button>';
  }
  html += '</div></div>';
  html += '<div style="padding:10px;background:#f8fafc;border-radius:8px;font-size:13px;color:#475569;margin-bottom:12px;">' + escHtml(d.captionNote || '') + '</div>';
  if(d.captionFull && d.captionFull.length > 0) {
    html += '<div id="script-full-text" style="display:none;">' + escHtml(d.captionFull) + '</div>';
    var NL2 = String.fromCharCode(10);
    var scriptLines = escHtml(d.captionFull).split(NL2).join('<br>');
    html += '<div style="font-weight:700;font-size:13px;color:#10b981;margin-bottom:8px;">✅ 전체 대본 (' + Math.ceil(d.captionFull.length / 250) + '분 분량 추정)</div>';
    html += '<div id="script-display" style="font-size:13px;color:#1e293b;line-height:2;background:#f0fdf4;border-radius:10px;padding:16px;overflow-y:auto;border:1px solid #86efac;white-space:pre-wrap;word-break:break-word;">' + scriptLines + '</div>';
  } else if(d.captions && d.captions.length > 0) {
    html += '<div style="font-weight:700;font-size:13px;color:#64748b;margin-bottom:8px;">사용 가능한 자막 트랙</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">';
    d.captions.forEach(function(cap) {
      var kind = cap.trackKind === 'asr' ? '자동생성' : (cap.trackKind === 'standard' ? '수동' : cap.trackKind);
      html += '<span class="badge badge-blue">🔤 ' + escHtml(cap.language) + ' (' + kind + ')</span>';
    });
    html += '</div>';
    html += '<div style="margin-top:8px;padding:12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:13px;color:#92400e;">';
    html += '💡 <b>자막 전체 텍스트:</b> YouTube Data API v3는 OAuth 인증 없이는 자막 전체 텍스트를 반환하지 않습니다. ';
    html += '<a href="https://www.youtube.com/watch?v=' + escHtml(d.videoId) + '" target="_blank" style="color:#b45309;font-weight:700;">YouTube에서 직접 확인</a>하세요.';
    html += '</div>';
    if(d.description) {
      html += '<div id="script-full-text" style="display:none;">' + escHtml(d.description) + '</div>';
      var NL3 = String.fromCharCode(10);
      html += '<div style="font-weight:700;font-size:13px;color:#64748b;margin:12px 0 6px;">📄 영상 설명 (대본 대용)</div>';
      html += '<div style="font-size:13px;color:#334155;line-height:1.8;background:#f8fafc;border-radius:10px;padding:14px;white-space:pre-wrap;word-break:break-word;">' + escHtml(d.description).split(NL3).join('<br>') + '</div>';
    }
  } else {
    html += '<div style="padding:12px;background:#fff1f2;border-radius:8px;font-size:13px;color:#be123c;">❌ 이 영상에는 공개 자막 트랙이 없습니다.</div>';
    if(d.description) {
      html += '<div id="script-full-text" style="display:none;">' + escHtml(d.description) + '</div>';
      var NL4 = String.fromCharCode(10);
      html += '<div style="font-weight:700;font-size:13px;color:#64748b;margin:12px 0 6px;">📄 영상 설명 (전체)</div>';
      html += '<div style="font-size:13px;color:#334155;line-height:1.8;background:#f8fafc;border-radius:10px;padding:14px;white-space:pre-wrap;word-break:break-word;">' + escHtml(d.description).split(NL4).join('<br>') + '</div>';
    }
  }
  html += '</div>';

  // 상위 댓글
  if(d.topComments && d.topComments.length > 0) {
    html += '<div class="card">';
    html += '<div style="font-size:15px;font-weight:800;margin-bottom:12px;">💬 인기 댓글 TOP ' + d.topComments.length + '</div>';
    d.topComments.forEach(function(c, i) {
      html += '<div style="padding:12px;background:#f8fafc;border-radius:10px;margin-bottom:8px;">';
      html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">';
      html += '<span style="font-weight:700;font-size:13px;color:#1e293b;">' + escHtml(c.author||'익명') + '</span>';
      if(c.likeCount > 0) html += '<span class="badge badge-red">👍 ' + c.likeCount + '</span>';
      html += '</div>';
      html += '<div style="font-size:13px;color:#334155;line-height:1.6;">' + escHtml(c.text||'').split(NL).join('<br>') + '</div>';
      html += '</div>';
    });
    html += '</div>';
  }

  el.innerHTML = html;
}

// ===== 대본 복사/다운로드 =====
function copyScriptText() {
  var el = document.getElementById('script-full-text');
  if(!el) { alert('대본 내용이 없습니다'); return; }
  var text = el.textContent || el.innerText || '';
  if(navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function() {
      alert('✅ 대본이 클립보드에 복사되었습니다!');
    }).catch(function() {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}
function fallbackCopy(text) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed'; ta.style.top = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); alert('✅ 대본이 클립보드에 복사되었습니다!'); }
  catch(e) { alert('복사 실패: 직접 선택 후 복사해주세요'); }
  document.body.removeChild(ta);
}
function downloadScript() {
  var el = document.getElementById('script-full-text');
  if(!el) { alert('대본 내용이 없습니다'); return; }
  var text = el.textContent || el.innerText || '';
  var blob = new Blob(['\ufeff' + text], {type:'text/plain;charset=utf-8'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = 'youtube_script_' + new Date().toISOString().slice(0,10) + '.txt';
  a.click(); URL.revokeObjectURL(url);
}

// ===== 엑셀 다운로드 =====
function downloadVideoExcel() {
  var table = document.getElementById('video-results-table');
  if(!table) { alert('검색 결과가 없습니다'); return; }
  var rows = table.querySelectorAll('tr[data-id]');
  if(rows.length === 0) { alert('다운로드할 데이터가 없습니다'); return; }

  var CRLF = String.fromCharCode(13) + String.fromCharCode(10);
  var BOM = String.fromCharCode(0xFEFF);
  var csv = BOM + '제목,채널,조회수,좋아요,댓글,업로드일,URL' + CRLF;
  rows.forEach(function(row) {
    var id = row.getAttribute('data-id') || '';
    var title = (row.getAttribute('data-title') || '').replace(/"/g, '""');
    var channel = (row.getAttribute('data-channel') || '').replace(/"/g, '""');
    var views = row.getAttribute('data-views') || '0';
    var likes = row.getAttribute('data-likes') || '0';
    var comments = row.getAttribute('data-comments') || '0';
    var date = row.getAttribute('data-date') || '';
    var ytUrl = 'https://youtube.com/watch?v=' + id;
    csv += '"' + title + '","' + channel + '",' + views + ',' + likes + ',' + comments + ',' + date + ',' + ytUrl + CRLF;
  });

  var blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'youtube_videos_' + new Date().toISOString().slice(0,10) + '.csv';
  link.click();
}

// ===== 초기화 =====
(function(){
  var p = new URLSearchParams(location.search).get('tab') || 'home';
  if(p) showPanel(p);
  checkApiStatus();
  // 인기 트렌드 자동 로드
  setTimeout(function(){
    if(currentPanel === 'trending') loadTrending();
  }, 500);
  // 사이드바 오버레이 클릭 닫기
  var ov = document.getElementById('sidebar-overlay');
  if(ov) {
    ov.addEventListener('click', function(){
      document.getElementById('sidebar').classList.remove('open');
      ov.style.display = 'none';
    });
  }
  // 요약/상세 버튼 이벤트 위임
  document.addEventListener('click', function(e) {
    var target = e.target;
    if(!target) return;
    // 설명 더보기 버튼
    if(target.classList && target.classList.contains('desc-toggle-btn')) {
      var descId = target.getAttribute('data-desc-id');
      var fullText = target.getAttribute('data-full');
      var shortText = target.getAttribute('data-short');
      var descEl = descId ? document.getElementById(descId) : null;
      if(descEl && fullText) {
        if(descEl.style.maxHeight === 'none' || descEl.style.maxHeight === '') {
          // 이미 열려있으면 닫기
          descEl.style.maxHeight = '60px';
          descEl.innerHTML = shortText || '';
          target.textContent = '▼ 설명 더보기';
        } else {
          // 열기
          descEl.style.maxHeight = 'none';
          descEl.innerHTML = fullText.split(String.fromCharCode(10)).join('<br>');
          target.textContent = '▲ 설명 접기';
        }
      }
    }
    // 요약 버튼
    if(target.classList && target.classList.contains('summary-btn')) {
      var vid = target.getAttribute('data-vid');
      var sid = target.getAttribute('data-sid');
      if(vid && sid) toggleSummary(vid, sid, target);
    }
    // 상세 버튼
    if(target.classList && target.classList.contains('detail-btn')) {
      var vid2 = target.getAttribute('data-vid');
      if(vid2) openVideoDetail(vid2);
    }
  });
})();
<\/script>
</body>
</html>`;

export default {
  youtubeUnifiedPage
};
