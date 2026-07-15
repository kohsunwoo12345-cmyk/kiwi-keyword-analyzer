// SUPERPLACE 알림톡 발송 도구 이식 — BYGENCY 브랜딩. /kakao/alimtalk/send 페이지 원본 이식.
// 임베드 모드(embed=1) 시 상단 내비 숨김 + 로그인 리다이렉트 무력화(더미 유저).

export const alimtalkPage = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>알림톡 발송 - BYGENCY</title>
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="BYGENCY">
  <meta property="og:title" content="BYGENCY">
  <meta property="og:description" content="학원 전문 마케팅 학원 관리 프로그램">
  <meta property="og:image" content="https://wearesuperplace.com/superplace-logo.png">
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:title" content="BYGENCY">
  <meta property="twitter:description" content="학원 전문 마케팅 학원 관리 프로그램">
  <meta property="twitter:image" content="https://wearesuperplace.com/superplace-logo.png">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
    body { font-family: 'Pretendard', 'Noto Sans KR', sans-serif; }

    /* 폰 목업 */
    .phone-mockup { font-family: 'Noto Sans KR', sans-serif; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

    /* 강조 표기형 */
    .kakao-highlight-title { font-size: 18px; font-weight: 700; color: #111; line-height: 1.3; }
    .kakao-highlight-sub   { font-size: 12px; color: #666; margin-top: 2px; }

    /* 스텝 카드 */
    .step-card { background: #fff; border-radius: 16px; border: 1px solid #e5e7eb; box-shadow: 0 1px 6px rgba(0,0,0,.06); padding: 20px; }
    .step-num  { width: 26px; height: 26px; background: #fee500; color: #111; border-radius: 50%; font-size: 12px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

    /* 학생 목록 아이템 */
    .student-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; cursor: pointer; transition: background .15s; border: 1.5px solid transparent; }
    .student-item:hover { background: #fffbe6; }
    .student-item.selected { background: #fefce8; border-color: #fde047; }
    .student-item input[type=checkbox] { accent-color: #eab308; width: 16px; height: 16px; flex-shrink: 0; cursor: pointer; }

    /* 채널 정보 배지 */
    .channel-badge { display: inline-flex; align-items: center; gap: 6px; background: #fefce8; border: 1px solid #fde68a; border-radius: 8px; padding: 4px 10px; font-size: 12px; }

    /* 탭 */
    .mode-tab { flex: 1; padding: 8px; font-size: 13px; font-weight: 600; border-radius: 10px; transition: all .2s; cursor: pointer; border: none; }
    .mode-tab.active { background: #fee500; color: #111; }
    .mode-tab.inactive { background: #f3f4f6; color: #6b7280; }

    /* 버튼 */
    .btn-send { width: 100%; padding: 14px; background: linear-gradient(135deg,#fee500 0%,#f59e0b 100%); color: #111; font-weight: 800; font-size: 16px; border-radius: 14px; border: none; cursor: pointer; transition: all .2s; box-shadow: 0 4px 14px rgba(251,191,36,.45); }
    .btn-send:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(251,191,36,.55); }
    .btn-send:disabled { opacity: .6; cursor: not-allowed; transform: none; }

    /* focus */
    input:focus, select:focus, textarea:focus { outline: none; border-color: #fbbf24 !important; box-shadow: 0 0 0 3px rgba(251,191,36,.2); }

    /* 결과박스 */
    #resultBox { border-radius: 14px; padding: 16px; display: none; }
          /* embed mode: hide top nav when rendered inside dashboard iframe */
          .embed nav{display:none!important}
          .embed .pt-16{padding-top:1.5rem!important}
  </style>
  <style id="hub-iframe-style"></style>
  <script>if(window.self!==window.top){document.getElementById('hub-iframe-style').textContent='.hub-back-btn{display:none!important}';}</script>
</head>
<body class="bg-gray-50 min-h-screen">
<script>if(location.search.indexOf('embed=1')>-1)document.documentElement.classList.add('embed');</script>
<script>try{var _u=JSON.parse(localStorage.getItem('user')||'null');if(!_u||!_u.id){localStorage.setItem('user',JSON.stringify({id:'bygency',name:'BYGENCY'}));}}catch(e){try{localStorage.setItem('user',JSON.stringify({id:'bygency',name:'BYGENCY'}));}catch(_){}}</script>

<!-- NAV -->
<nav class="fixed w-full top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
  <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <a href="/super1647" class="text-gray-400 hover:text-gray-600 hub-back-btn transition">
        <i class="fas fa-arrow-left"></i>
      </a>
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 bg-yellow-400 rounded-xl flex items-center justify-center">
          <i class="fas fa-paper-plane text-gray-900 text-sm"></i>
        </div>
        <span class="font-bold text-gray-900 text-lg">알림톡 발송</span>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <a href="/kakao/alimtalk/templates"
        class="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition font-medium flex items-center gap-1.5">
        <i class="fas fa-file-alt text-xs"></i>템플릿 관리
      </a>
      <a href="/kakao/alimtalk/logs"
        class="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition font-medium flex items-center gap-1.5">
        <i class="fas fa-history text-xs"></i>발송 내역
      </a>
    </div>
  </div>
</nav>

<!-- MAIN -->
<div class="pt-16 pb-16 max-w-7xl mx-auto px-4">

  <!-- 히어로 배너 -->
  <div class="bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-300 rounded-2xl p-6 my-6 flex items-center justify-between">
    <div>
      <h1 class="text-xl font-extrabold text-gray-900 mb-0.5">
        <i class="fas fa-paper-plane mr-2"></i>카카오 알림톡 발송
      </h1>
      <p class="text-sm text-gray-800 opacity-75">승인된 템플릿으로 학생·학부모에게 알림톡을 발송합니다.</p>
    </div>
    <div class="hidden sm:flex items-center gap-3">
      <div class="bg-white/30 backdrop-blur rounded-xl px-4 py-2 text-center">
        <div class="text-xs text-gray-800 font-medium">오픈율</div>
        <div class="text-lg font-extrabold text-gray-900">98%</div>
      </div>
      <div class="bg-white/30 backdrop-blur rounded-xl px-4 py-2 text-center">
        <div class="text-xs text-gray-800 font-medium">도달률</div>
        <div class="text-lg font-extrabold text-gray-900">100%</div>
      </div>
    </div>
  </div>

  <!-- 3-column layout: 발송 설정 | 학생 선택 | 폰 미리보기 -->
  <div class="flex gap-5 items-start">

    <!-- ────────────────────────────────────────────
         좌측: 발송 설정
    ──────────────────────────────────────────── -->
    <div class="flex-1 min-w-0 space-y-4">

      <!-- STEP 1: 채널 선택 -->
      <div class="step-card">
        <h2 class="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm">
          <span class="step-num">1</span>채널 선택
        </h2>
        <div class="flex gap-2">
          <select id="channelSelect" onchange="onChannelSelect()"
            class="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white transition">
            <option value="">채널 로드 중...</option>
          </select>
          <a href="/kakao/alimtalk/channel"
            class="px-3 py-2.5 border border-yellow-300 text-yellow-700 hover:bg-yellow-50 rounded-xl text-sm font-bold transition whitespace-nowrap flex items-center gap-1">
            <i class="fas fa-plus text-xs"></i>추가
          </a>
        </div>
        <!-- 채널 정보 배지 -->
        <div id="channelInfoBar" class="hidden mt-2 flex items-center justify-between">
          <div class="channel-badge">
            <span class="w-5 h-5 bg-yellow-400 rounded-md flex items-center justify-center text-[9px] font-bold text-gray-800">K</span>
            <span class="font-bold text-yellow-800" id="channelInfoName">-</span>
            <span class="text-gray-400 font-mono text-[10px]" id="channelInfoId">-</span>
          </div>
          <span class="text-[10px] text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full font-bold">
            <i class="fas fa-circle text-[6px] mr-1"></i>연동됨
          </span>
        </div>
        <!-- 채널 없을 때 -->
        <div id="noChannelBanner" class="hidden mt-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-700 flex items-center justify-between">
          <span><i class="fas fa-info-circle mr-1"></i>등록된 채널이 없습니다.</span>
          <a href="/kakao/alimtalk/channel" class="font-bold underline">채널 등록 →</a>
        </div>
      </div>

      <!-- STEP 2: 템플릿 선택 -->
      <div class="step-card">
        <h2 class="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm">
          <span class="step-num">2</span>템플릿 선택
          <div id="tplLoadingMsg" class="hidden ml-auto text-xs text-gray-400 flex items-center gap-1">
            <i class="fas fa-circle-notch fa-spin"></i>로드 중...
          </div>
        </h2>
        <select id="tplSelect" onchange="onTplChange()"
          class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white transition">
          <option value="">채널을 먼저 선택하세요</option>
        </select>
        <!-- 템플릿 내용 미리보기 (축소) -->
        <div id="tplContentPreview" class="hidden mt-3">
          <div class="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-600 whitespace-pre-wrap leading-relaxed max-h-24 overflow-y-auto" id="tplContentText"></div>
        </div>
      </div>

      <!-- STEP 3: 변수 입력 -->
      <div id="varsSection" class="step-card hidden">
        <h2 class="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm">
          <span class="step-num">3</span>변수 값 (기본값)
          <span class="ml-auto text-[10px] text-gray-400">학생별 자동치환 시 재정의됩니다</span>
        </h2>
        <div id="varInputs" class="space-y-3"></div>
      </div>

      <!-- STEP 4: 발송 모드 -->
      <div class="step-card">
        <h2 class="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm">
          <span class="step-num" id="stepRecipientNum">4</span>수신자
        </h2>
        <!-- 모드 탭 -->
        <div class="flex gap-2 mb-4 bg-gray-100 rounded-xl p-1">
          <button onclick="setSendMode('student')" id="modeStudent" class="mode-tab active">
            <i class="fas fa-users mr-1"></i>학생 명단
          </button>
          <button onclick="setSendMode('single')" id="modeSingle" class="mode-tab inactive">
            <i class="fas fa-user mr-1"></i>단건 발송
          </button>
          <button onclick="setSendMode('bulk')" id="modeBulk" class="mode-tab inactive">
            <i class="fas fa-file-import mr-1"></i>엑셀 업로드
          </button>
        </div>

        <!-- 학생 명단 모드 -->
        <div id="studentMode">
          <!-- 학생 검색 -->
          <div class="relative mb-3">
            <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
            <input id="studentSearch" type="text" placeholder="학생 이름 검색..."
              oninput="filterStudents()"
              class="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-sm bg-white transition">
          </div>
          <!-- 전체 선택 / 선택 정보 -->
          <div class="flex items-center justify-between mb-2 px-1">
            <label class="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
              <input type="checkbox" id="selectAllChk" onchange="toggleSelectAll()" class="accent-yellow-400 w-4 h-4">
              <span>전체 선택</span>
            </label>
            <span id="selectedCount" class="text-xs font-bold text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full">0명 선택</span>
          </div>
          <!-- 학생 목록 -->
          <div id="studentListWrap" class="border border-gray-200 rounded-xl overflow-hidden">
            <div id="studentListLoading" class="text-center py-8 text-gray-400 text-sm">
              <i class="fas fa-circle-notch fa-spin mr-1"></i>학생 명단 로드 중...
            </div>
            <div id="studentList" class="max-h-[260px] overflow-y-auto divide-y divide-gray-50 hidden"></div>
            <div id="studentListEmpty" class="hidden text-center py-8 text-gray-400 text-sm">
              <i class="fas fa-user-slash mb-2 block text-xl"></i>
              검색 결과가 없습니다
            </div>
          </div>
          <!-- 선택된 학생 랜딩페이지 정보 -->
          <div id="landingInfo" class="hidden mt-3 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 text-xs">
            <div class="flex items-center gap-1.5 text-blue-700 font-bold mb-1">
              <i class="fas fa-link"></i>랜딩페이지 자동 첨부
            </div>
            <p class="text-blue-600">각 학생의 가장 최근 랜딩페이지를 자동으로 <code class="bg-blue-100 px-1 rounded">#{랜딩페이지URL}</code> 변수에 치환합니다.</p>
          </div>
        </div>

        <!-- 단건 발송 모드 -->
        <div id="singleMode" class="hidden space-y-3">
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">수신자 번호 <span class="text-red-500">*</span></label>
            <input id="singlePhone" type="tel" placeholder="010-0000-0000"
              class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white transition">
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">수신자 이름</label>
            <input id="singleName" type="text" placeholder="홍길동"
              class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white transition">
          </div>
        </div>

        <!-- 엑셀 업로드 모드 -->
        <div id="bulkMode" class="hidden space-y-3">
          <div class="border-2 border-dashed border-gray-200 hover:border-yellow-400 rounded-xl p-5 text-center cursor-pointer transition"
            onclick="document.getElementById('alimtalkExcelFile').click()">
            <i class="fas fa-file-excel text-green-500 text-2xl mb-2"></i>
            <p class="text-sm font-medium text-gray-700">엑셀 파일을 클릭하여 업로드</p>
            <p class="text-xs text-gray-400 mt-1">A열: 학생이름 &nbsp;|&nbsp; B열: 학생ID &nbsp;|&nbsp; C열: 학부모연락처 &nbsp;|&nbsp; D열: 랜딩페이지URL</p>
          </div>
          <input type="file" id="alimtalkExcelFile" accept=".xlsx,.xls,.csv" class="hidden" onchange="uploadAlimtalkExcel(event)">
          <!-- 업로드 안내: 학생 명단 엑셀 다운로드 -->
          <button onclick="downloadStudentExcel()" id="btnDownloadExcel"
            class="w-full flex items-center justify-center gap-2 py-2.5 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 text-sm font-semibold rounded-xl transition">
            <i class="fas fa-download text-green-600"></i>
            학생 명단 엑셀 서식 다운로드
          </button>
          <div id="alimtalkUploadInfo" class="hidden text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2 flex items-center gap-2">
            <i class="fas fa-check-circle text-green-500 text-base"></i>
            <span id="alimtalkUploadCount"></span>
          </div>
        </div>
      </div>

      <!-- 발송 버튼 -->
      <button onclick="sendAlimtalk()" id="sendBtn" class="btn-send">
        <i class="fas fa-paper-plane mr-2"></i>알림톡 발송
      </button>

      <!-- 결과 박스 -->
      <div id="resultBox"></div>
    </div>

    <!-- ────────────────────────────────────────────
         중앙: 학생 선택됐을 때 미리보기 정보 (≥1280px)
         (phone mockup 오른쪽에 붙음 — flex 순서로 우측에)
         실제로는 phone mockup 바로 왼쪽에 없고, 우측 phone mockup만 sticky
    ──────────────────────────────────────────── -->

    <!-- ────────────────────────────────────────────
         우측: 카카오톡 폰 목업 미리보기 (sticky)
    ──────────────────────────────────────────── -->
    <div class="hidden lg:block flex-shrink-0 sticky top-20" style="width:340px">
      <p class="text-[11px] font-bold text-gray-400 text-center mb-2 tracking-widest uppercase">실시간 미리보기</p>

      <!-- ====  Phone Mockup  ==== -->
      <div class="relative bg-black rounded-[42px] border-[7px] border-black shadow-2xl overflow-hidden flex flex-col phone-mockup"
           style="width:340px; height:720px">

        <!-- Notch -->
        <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[110px] h-[24px] bg-black rounded-b-[14px] z-50">
          <div class="absolute top-[7px] left-1/2 -translate-x-1/2 w-[9px] h-[9px] bg-[#1a1a1a] rounded-full"></div>
        </div>

        <!-- Screen -->
        <div class="flex-1 bg-[#b2c3d1] flex flex-col w-full h-full">

          <!-- Status Bar -->
          <div class="flex justify-between items-center px-5 pt-3 pb-1 text-[11px] font-semibold text-gray-800">
            <span>9:41</span>
            <div class="flex items-center space-x-1">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm8-6c-2.2-2.2-5.1-3.4-8-3.4s-5.8 1.2-8 3.4l1.4 1.4c1.8-1.8 4.2-2.8 6.6-2.8s4.8 1 6.6 2.8L20 15zM4 11l1.4 1.4C7.7 10 10.8 8.8 14 8.8s6.3 1.2 8.6 3.6L24 11c-2.7-2.7-6.3-4.2-10-4.2S6.7 8.3 4 11z"/></svg>
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M2 22h20V2L2 22zm18-2H6.8L20 6.8V20z"/></svg>
              <div class="flex items-center">
                <span class="mr-0.5 text-[10px]">100</span>
                <div class="w-5 h-3 border border-gray-800 rounded-[3px] p-[1px] relative">
                  <div class="bg-gray-800 h-full w-full rounded-[1px]"></div>
                  <div class="absolute -right-[2px] top-1/2 -translate-y-1/2 w-[2px] h-[4px] bg-gray-800 rounded-r-sm"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Chat Header -->
          <div class="flex items-center justify-between px-2 pt-1 pb-2 bg-[#b2c3d1]">
            <div class="flex items-center">
              <button class="p-2">
                <svg class="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
              </button>
              <div class="ml-1">
                <div class="flex items-center">
                  <span id="pm_channelName" class="font-bold text-sm text-gray-900">카카오채널</span>
                  <svg class="w-3 h-3 ml-1 text-gray-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                </div>
                <div class="text-[10px] text-gray-600">알림톡</div>
              </div>
            </div>
            <div class="flex items-center space-x-1">
              <button class="p-1.5">
                <svg class="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </button>
              <button class="p-1.5">
                <svg class="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
              </button>
            </div>
          </div>

          <!-- Action Pill -->
          <div class="mx-3 mb-2 bg-white rounded-full flex items-center justify-between py-1.5 px-3 shadow-sm border border-gray-100">
            <button class="flex-1 flex items-center justify-center text-[11px] text-gray-700 font-bold">
              <span class="relative flex items-center justify-center mr-1">
                <svg class="w-3.5 h-3.5 text-black" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 2.76 1.12 5.26 2.93 7.07L4 22l2.93-.93C8.74 21.88 10.36 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/></svg>
                <span class="absolute text-white text-[7px] font-bold">+</span>
              </span>
              채널 추가
            </button>
            <div class="w-[1px] h-3.5 bg-gray-200"></div>
            <button class="flex-1 flex items-center justify-center text-[11px] text-gray-600">
              <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
              알림톡 차단
            </button>
          </div>

          <!-- Chat Area -->
          <div class="flex-1 overflow-y-auto no-scrollbar px-2.5 flex flex-col">
            <div class="flex justify-center my-2 opacity-60">
              <div class="bg-[#9ba9b5] text-white text-[10px] px-3 py-0.5 rounded-full">오늘</div>
            </div>

            <!-- 메시지 행 -->
            <div class="flex items-start mt-1 w-full">
              <!-- 아바타 -->
              <div class="w-9 h-9 rounded-[13px] bg-yellow-400 flex items-center justify-center flex-shrink-0 shadow-sm text-xs font-bold text-gray-800">K</div>

              <!-- 버블 컨테이너 -->
              <div class="ml-2 flex flex-col relative" style="width:245px">
                <span id="pm_channelName2" class="text-[11px] text-gray-700 mb-0.5">카카오채널</span>

                <!-- 홈 아이콘 -->
                <div class="absolute -right-3 top-5 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md z-10">
                  <svg class="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                </div>

                <!-- 메시지 버블 -->
                <div class="bg-white rounded-[10px] shadow-sm relative w-full border border-gray-100">
                  <!-- kakao 배지 -->
                  <div class="absolute -right-2.5 -top-1.5 bg-[#3C1E1E] text-[#fee500] text-[7px] font-extrabold px-1.5 py-0.5 rounded-full z-10 tracking-wide">kakao</div>

                  <!-- 이미지형 헤더 -->
                  <div id="pm_imgHeader" class="hidden w-full h-[70px] bg-gradient-to-r from-yellow-400 to-amber-400 rounded-t-[10px] flex items-center justify-center">
                    <span class="text-xs text-gray-700 opacity-60 font-bold">이미지 영역</span>
                  </div>

                  <!-- 노란 알림톡 헤더 -->
                  <div id="pm_yellowHeader" class="bg-[#fee500] px-3 py-2 rounded-t-[10px]">
                    <span class="font-bold text-[13px] text-gray-900">알림톡 도착</span>
                  </div>

                  <!-- 강조 표기형 헤더 -->
                  <div id="pm_emphasizeHeader" class="hidden px-3 pt-2.5 pb-1.5 border-b border-gray-100">
                    <div id="pm_emphasizeTitle" class="font-bold text-[15px] text-gray-900 leading-tight"></div>
                    <div id="pm_emphasizeSub" class="text-[11px] text-gray-500 mt-0.5"></div>
                  </div>

                  <!-- 본문 -->
                  <div class="px-3 py-2.5">
                    <p id="pm_body" class="text-[12px] text-gray-800 leading-relaxed whitespace-pre-wrap">
                      템플릿을 선택하면 미리보기가 표시됩니다.
                    </p>
                  </div>

                  <!-- 부가정보 -->
                  <div id="pm_extra" class="hidden px-3 pb-2 border-t border-dashed border-gray-200">
                    <p id="pm_extraText" class="text-[10px] text-gray-500 leading-tight pt-2"></p>
                  </div>

                  <!-- 채널추가 안내 (광고) -->
                  <div id="pm_adNote" class="hidden px-3 pb-1.5">
                    <p class="text-[10px] text-gray-400 leading-tight">채널 추가하고 이 채널의 마케팅 메시지 등을 카카오톡으로 받기</p>
                  </div>

                  <!-- 버튼 영역 -->
                  <div id="pm_buttons" class="px-3 pb-3 space-y-1.5"></div>
                </div>

                <!-- 시간 -->
                <div class="absolute -bottom-4 -right-5 text-[9px] text-gray-500">방금</div>
              </div>
            </div>

            <div class="h-16"></div>
          </div><!-- /chat area -->

          <!-- Bottom Bar -->
          <div class="flex flex-col w-full">
            <div class="bg-[#424242] text-[#d1d1d1] text-[11px] text-center py-1.5 flex items-center justify-center gap-1">
              채널 메뉴
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg>
            </div>
            <div class="bg-white flex items-center px-3 py-1.5 border-t border-gray-200 h-[46px]">
              <button class="text-gray-400 mr-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
              </button>
              <div class="flex-1 bg-[#f5f5f5] h-[32px] rounded-full flex items-center px-3">
                <span class="text-[11px] text-gray-400">메시지 입력</span>
              </div>
            </div>
            <div class="bg-white flex justify-around items-center py-1.5 pb-2 border-t border-gray-100">
              <button class="p-1.5"><div class="w-3.5 h-3.5 border-l-2 border-r-2 border-gray-400 flex justify-center"><div class="w-0.5 h-full bg-gray-400"></div></div></button>
              <button class="p-1.5"><div class="w-3.5 h-3.5 border-[2px] border-gray-400 rounded-sm"></div></button>
              <button class="p-1.5"><svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg></button>
            </div>
          </div>

        </div><!-- /screen -->
      </div><!-- /phone mockup -->

      <!-- 미리보기 하단 -->
      <div class="mt-3 space-y-1 text-center">
        <p class="text-[10px] text-gray-400">변수·학생 선택 시 실시간 반영</p>
        <!-- 선택된 학생 미리보기 표시 -->
        <div id="previewStudentInfo" class="hidden">
          <div class="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 text-xs text-left">
            <div class="font-bold text-yellow-800 mb-1"><i class="fas fa-user-graduate mr-1"></i>미리보기 대상</div>
            <div class="text-gray-600" id="previewStudentName">-</div>
            <div class="text-gray-400 text-[10px] mt-0.5 truncate" id="previewStudentLanding"></div>
          </div>
        </div>
      </div>
    </div><!-- /우측 폰 목업 -->

  </div><!-- /3-column -->
</div><!-- /main -->
</body>
</html>` + '<script>' + `
(function(){
  /* ──── 상태 ──── */
  var templates         = [];
  var curTpl            = null;
  var sendMode          = 'student'; // 'student' | 'single' | 'bulk'
  var varValues         = {};        // 기본 변수값
  var userChannels      = [];
  var currentUser       = null;
  var allStudents       = [];        // [{id, name, grade, parent_phone}]
  var filteredStudents  = [];
  var selectedStudentIds = new Set();
  var studentLandingMap = {};        // studentId -> landingUrl
  var landingPages      = [];        // [{id, title, slug}]
  var uploadedRecipientRows = [];    // [{name, phone, landing}]
  var previewStudentIdx = 0;         // 미리보기용 선택된 학생 인덱스

  /* ──── 로그인 체크 ──── */
  try { currentUser = JSON.parse(localStorage.getItem('user') || 'null'); } catch(e) {}
  if (!currentUser || !currentUser.id) {
    /* embed: login redirect neutralized */ currentUser = currentUser || {id:'bygency',name:'BYGENCY'};
    return;
  }

  /* ──── 유틸 ──── */
  function esc(s) {
    return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function applyVars(content, vars) {
    return content.replace(/#{([^}]+)}/g, function(m, k) {
      return (vars[k] !== undefined && vars[k] !== '') ? vars[k] : m;
    });
  }
  function extractVars(content) {
    var matches = content.match(/#{([^}]+)}/g) || [];
    var vars = [];
    matches.forEach(function(m) {
      var v = m.slice(2, -1);
      if (vars.indexOf(v) < 0) vars.push(v);
    });
    return vars;
  }

  /* ──── 채널 목록 로드 ──── */
  async function loadUserChannels() {
    var sel = document.getElementById('channelSelect');
    try {
      var res = await fetch('/api/kakao/user/channels', {
        credentials: 'include',
        headers: { 'X-User-Id': String(currentUser.id) }
      });
      var d = await res.json();
      userChannels = (d.ok && d.channels) || [];
      if (!userChannels.length) {
        sel.innerHTML = '<option value="">등록된 채널 없음</option>';
        document.getElementById('noChannelBanner').classList.remove('hidden');
        return;
      }
      document.getElementById('noChannelBanner').classList.add('hidden');
      var lastId = localStorage.getItem('kakao_pfId') || '';
      sel.innerHTML = '<option value="">-- 채널 선택 --</option>' +
        userChannels.map(function(ch) {
          var label = ch.channelName || ch.searchId || ch.channelId;
          return '<option value="' + esc(ch.channelId) + '"' + (ch.channelId === lastId ? ' selected' : '') + '>' + esc(label) + '</option>';
        }).join('');
      var autoSel = userChannels.find(function(ch) { return ch.channelId === lastId; }) || userChannels[0];
      if (autoSel) { sel.value = autoSel.channelId; applyChannel(autoSel); await loadTemplatesForChannel(autoSel.channelId); }
    } catch(e) {
      sel.innerHTML = '<option value="">채널 로드 실패</option>';
    }
  }

  function applyChannel(ch) {
    if (!ch) return;
    var bar  = document.getElementById('channelInfoBar');
    var nEl  = document.getElementById('channelInfoName');
    var iEl  = document.getElementById('channelInfoId');
    if (nEl) nEl.textContent = ch.channelName || ch.searchId || '-';
    if (iEl) iEl.textContent = ch.channelId || '-';
    if (bar) bar.classList.remove('hidden');
    var cName = ch.channelName || ch.searchId || '카카오채널';
    localStorage.setItem('kakao_pfId', ch.channelId);
    localStorage.setItem('kakao_channelName', cName);
    document.getElementById('pm_channelName').textContent  = cName;
    document.getElementById('pm_channelName2').textContent = cName;
  }

  window.onChannelSelect = async function() {
    var cid = document.getElementById('channelSelect').value;
    if (!cid) return;
    var ch = userChannels.find(function(c) { return c.channelId === cid; });
    if (ch) { applyChannel(ch); await loadTemplatesForChannel(cid); }
  };

  /* ──── 템플릿 로드 ──── */
  async function loadTemplatesForChannel(channelId) {
    if (!channelId) return;
    var loadMsg = document.getElementById('tplLoadingMsg');
    var tplSel  = document.getElementById('tplSelect');
    loadMsg.classList.remove('hidden');
    tplSel.innerHTML = '<option value="">로드 중...</option>';
    try {
      var res = await fetch('/api/kakao/alimtalk/templates?channelId=' + encodeURIComponent(channelId),
        { headers: { 'X-User-Id': String(currentUser.id) } });
      var d = await res.json();
      templates = (d.ok && d.templates) || [];
      var approved = templates.filter(function(t) {
        var s = (t.status || '').toUpperCase();
        return s === 'APPROVED';
      });
      if (!approved.length) {
        tplSel.innerHTML = '<option value="">승인된 템플릿 없음</option>';
      } else {
        tplSel.innerHTML = '<option value="">-- 승인된 템플릿 선택 --</option>' +
          approved.map(function(t) {
            return '<option value="' + esc(t.templateId || t.code || t.templateCode) + '">' + esc(t.name) + '</option>';
          }).join('');
        var tplParam = new URLSearchParams(location.search).get('tplId') || new URLSearchParams(location.search).get('tpl');
        if (tplParam) { tplSel.value = tplParam; onTplChange(); }
      }
    } catch(e) {
      tplSel.innerHTML = '<option value="">템플릿 로드 실패</option>';
    } finally {
      loadMsg.classList.add('hidden');
    }
  }

  /* ──── 템플릿 변경 ──── */
  window.onTplChange = function() {
    var code = document.getElementById('tplSelect').value;
    curTpl = templates.find(function(t) {
      return (t.templateId || t.code || t.templateCode) === code;
    });
    if (!curTpl) {
      document.getElementById('tplContentPreview').classList.add('hidden');
      document.getElementById('varsSection').classList.add('hidden');
      updatePreview();
      return;
    }
    document.getElementById('tplContentText').textContent = curTpl.content || '';
    document.getElementById('tplContentPreview').classList.remove('hidden');
    var vars = extractVars(curTpl.content || '');
    varValues = {};
    if (vars.length > 0) {
      var html = '';
      vars.forEach(function(v) {
        varValues[v] = '';
        html += '<div>';
        html += '<label class="block text-xs font-semibold text-gray-600 mb-1">#{' + esc(v) + '}</label>';
        html += '<input type="text" placeholder="' + esc(v) + ' 기본값 입력 (학생별 자동 치환)"';
        html += ' data-varkey="' + esc(v) + '" oninput="(function(el){varValues[el.dataset.varkey]=el.value;updatePreview();})(this)"';
        html += ' class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white transition"></div>';
      });
      document.getElementById('varInputs').innerHTML = html;
      document.getElementById('varsSection').classList.remove('hidden');
    } else {
      document.getElementById('varsSection').classList.add('hidden');
    }
    updatePreview();
  };

  /* ──── 미리보기 업데이트 ──── */
  window.updatePreview = function(overrideVars) {
    var useVars = overrideVars || varValues;
    var content = curTpl ? applyVars(curTpl.content || '', useVars) : '';

    /* -- 본문 -- */
    var bodyEl = document.getElementById('pm_body');
    if (!curTpl) {
      bodyEl.textContent = '템플릿을 선택하면 미리보기가 표시됩니다.';
    } else {
      bodyEl.textContent = content;
    }

    /* -- 강조형 헤더 -- */
    var yellowHdr   = document.getElementById('pm_yellowHeader');
    var emphHdr     = document.getElementById('pm_emphasizeHeader');
    var imgHdr      = document.getElementById('pm_imgHeader');
    var emphTitle   = document.getElementById('pm_emphasizeTitle');
    var emphSub     = document.getElementById('pm_emphasizeSub');

    yellowHdr.classList.add('hidden');
    emphHdr.classList.add('hidden');
    imgHdr.classList.add('hidden');

    if (curTpl) {
      var et = (curTpl.emphasizeType || '').toUpperCase();
      if (et === 'TEXT' && curTpl.emphasizeTitle) {
        emphHdr.classList.remove('hidden');
        emphTitle.textContent = curTpl.emphasizeTitle;
        emphSub.textContent   = curTpl.emphasizeSubtitle || '';
      } else if (et === 'IMAGE') {
        imgHdr.classList.remove('hidden');
      } else {
        yellowHdr.classList.remove('hidden');
      }
    } else {
      yellowHdr.classList.remove('hidden');
    }

    /* -- 부가정보 -- */
    var extraEl   = document.getElementById('pm_extra');
    var extraText = document.getElementById('pm_extraText');
    if (curTpl && (curTpl.messageType === 'EX' || curTpl.messageType === 'MI') && curTpl.extra) {
      extraText.textContent = curTpl.extra;
      extraEl.classList.remove('hidden');
    } else {
      extraEl.classList.add('hidden');
    }

    /* -- 광고 안내 -- */
    var adNote = document.getElementById('pm_adNote');
    if (curTpl && (curTpl.messageType === 'AD' || curTpl.messageType === 'MI')) {
      adNote.classList.remove('hidden');
    } else {
      adNote.classList.add('hidden');
    }

    /* -- 버튼 -- */
    var btnWrap = document.getElementById('pm_buttons');
    var btns = (curTpl && curTpl.buttons) || [];
    if (btns.length) {
      var bHtml = '';
      btns.forEach(function(b) {
        var n = esc(b.buttonName || b.name || b.buttonType || '');
        if (b.buttonType === 'AC') {
          bHtml += '<button class="w-full bg-[#fee500] py-1.5 rounded-lg text-[11px] font-bold text-gray-900">' + n + '</button>';
        } else {
          bHtml += '<button class="w-full bg-gray-50 border border-gray-200 py-1.5 rounded-lg text-[11px] text-gray-700">' + n + '</button>';
        }
      });
      btnWrap.innerHTML = bHtml;
    } else {
      btnWrap.innerHTML = '';
    }
  };

  /* ──── 학생 명단 로드 ──── */
  async function loadStudents() {
    var listEl   = document.getElementById('studentList');
    var loadEl   = document.getElementById('studentListLoading');
    var emptyEl  = document.getElementById('studentListEmpty');
    loadEl.classList.remove('hidden');
    listEl.classList.add('hidden');
    emptyEl.classList.add('hidden');
    try {
      var res = await fetch('/api/students?userId=' + encodeURIComponent(currentUser.id), {
        credentials: 'include',
        headers: { 'X-User-Id': String(currentUser.id) }
      });
      var d = await res.json();
      allStudents = ((d.success || d.ok) && d.students) ? d.students : [];
      filteredStudents = allStudents.slice();
      /* ✅ FIX: 랜딩페이지 먼저 완전히 로드한 뒤 렌더링 — 레이스 컨디션 방지 */
      await loadLandingPages();
      renderStudentList();
    } catch(e) {
      loadEl.innerHTML = '<i class="fas fa-exclamation-triangle mr-1 text-red-400"></i>학생 명단 로드 실패';
    }
  }

  /* ──── 랜딩페이지 로드 ──── */
  async function loadLandingPages() {
    try {
      var res = await fetch('/api/landing-pages?userId=' + encodeURIComponent(currentUser.id), {
        credentials: 'include',
        headers: { 'X-User-Id': String(currentUser.id) }
      });
      var d = await res.json();
      landingPages = (d.success && d.pages) ? d.pages : [];
      /* ✅ FIX: 학생 이름이 title에 포함된 랜딩페이지 매칭 (최신순 우선 — API가 createdAt DESC) */
      studentLandingMap = {};
      allStudents.forEach(function(st) {
        var name = (st.name || '').trim();
        if (!name) return;
        /* 완전 일치(title === name) 우선, 없으면 포함 일치(title.includes(name)) */
        var matched = landingPages.find(function(lp) {
          return (lp.title || '').trim() === name;
        });
        if (!matched) {
          matched = landingPages.find(function(lp) {
            return (lp.title || '').includes(name);
          });
        }
        if (matched) {
          studentLandingMap[st.id] = 'https://wearesuperplace.com/landing/' + matched.slug;
        }
      });
      /* ✅ FIX: 랜딩페이지 로드 완료 후 이미 렌더된 목록도 갱신 */
      if (allStudents.length > 0) renderStudentList();
    } catch(e) { /* 랜딩페이지 없어도 발송 가능 */ }
  }

  /* ──── 학생 목록 렌더링 ──── */
  function renderStudentList() {
    var loadEl  = document.getElementById('studentListLoading');
    var listEl  = document.getElementById('studentList');
    var emptyEl = document.getElementById('studentListEmpty');
    loadEl.classList.add('hidden');

    if (!filteredStudents.length) {
      listEl.classList.add('hidden');
      emptyEl.classList.remove('hidden');
      return;
    }
    emptyEl.classList.add('hidden');
    listEl.classList.remove('hidden');

    var html = '';
    filteredStudents.forEach(function(st) {
      var isChecked  = selectedStudentIds.has(st.id);
      var landing    = studentLandingMap[st.id] || '';
      var gradeLabel = st.grade ? '<span class="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">' + esc(st.grade) + '</span>' : '';
      var landingBadge = landing
        ? '<i class="fas fa-link text-blue-400 text-[9px]" title="랜딩페이지 있음"></i>'
        : '<i class="fas fa-link text-gray-200 text-[9px]"></i>';
      html += '<div class="student-item' + (isChecked ? ' selected' : '') + '" onclick="toggleStudent(' + st.id + ')" data-student-id="' + st.id + '">';
      html += '<input type="checkbox" ' + (isChecked ? 'checked' : '') + ' onclick="event.stopPropagation();toggleStudent(' + st.id + ')">';
      html += '<div class="flex-1 min-w-0">';
      html += '<div class="flex items-center gap-1.5"><span class="text-sm font-semibold text-gray-800">' + esc(st.name) + '</span>' + gradeLabel + '</div>';
      html += '<div class="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">' + landingBadge;
      if (landing) {
        html += '<span class="truncate text-blue-400">랜딩페이지 연결됨</span>';
      } else {
        html += '<span class="text-gray-300">랜딩페이지 없음</span>';
      }
      html += '</div></div></div>';
    });
    listEl.innerHTML = html;
    updateSelectedCount();
  }

  /* ──── 학생 선택 토글 ──── */
  window.toggleStudent = function(id) {
    if (selectedStudentIds.has(id)) {
      selectedStudentIds.delete(id);
    } else {
      selectedStudentIds.add(id);
    }
    /* DOM 업데이트 */
    var item = document.querySelector('[data-student-id="' + id + '"]');
    if (item) {
      item.classList.toggle('selected', selectedStudentIds.has(id));
      var chk = item.querySelector('input[type=checkbox]');
      if (chk) chk.checked = selectedStudentIds.has(id);
    }
    updateSelectedCount();
    /* 첫 번째 선택된 학생으로 미리보기 갱신 */
    var ids = Array.from(selectedStudentIds);
    if (ids.length > 0) {
      updatePreviewForStudent(ids[0]);
    } else {
      document.getElementById('previewStudentInfo').classList.add('hidden');
      updatePreview();
    }
  };

  /* ──── 전체 선택 ──── */
  window.toggleSelectAll = function() {
    var chk = document.getElementById('selectAllChk');
    if (chk.checked) {
      filteredStudents.forEach(function(st) { selectedStudentIds.add(st.id); });
    } else {
      filteredStudents.forEach(function(st) { selectedStudentIds.delete(st.id); });
    }
    renderStudentList();
    var ids = Array.from(selectedStudentIds);
    if (ids.length > 0) updatePreviewForStudent(ids[0]);
    else { document.getElementById('previewStudentInfo').classList.add('hidden'); updatePreview(); }
  };

  /* ──── 학생 검색 필터 ──── */
  window.filterStudents = function() {
    var q = (document.getElementById('studentSearch').value || '').trim().toLowerCase();
    filteredStudents = q ? allStudents.filter(function(st) {
      return (st.name || '').toLowerCase().includes(q);
    }) : allStudents.slice();
    renderStudentList();
  };

  /* ──── 선택된 학생 수 업데이트 ──── */
  function updateSelectedCount() {
    var cnt = selectedStudentIds.size;
    document.getElementById('selectedCount').textContent = cnt + '명 선택';
    var allChk = document.getElementById('selectAllChk');
    allChk.checked = (filteredStudents.length > 0 && filteredStudents.every(function(st){ return selectedStudentIds.has(st.id); }));
    /* 랜딩 info 배지 */
    var infoEl = document.getElementById('landingInfo');
    if (cnt > 0) infoEl.classList.remove('hidden');
    else infoEl.classList.add('hidden');
  }

  /* ──── 학생별 미리보기 ──── */
  function updatePreviewForStudent(studentId) {
    var st = allStudents.find(function(s) { return s.id === studentId; });
    if (!st) return;
    var landing = studentLandingMap[studentId] || '';
    var overrideVars = Object.assign({}, varValues);
    /* ✅ FIX: 이름/URL 계열 변수 전체 커버 */
    function isNameVarP(k) {
      return k.includes('이름') || k.toLowerCase().includes('name');
    }
    function isUrlVarP(k) {
      var kl = k.toLowerCase();
      return k.includes('랜딩') || k.includes('링크') || k.includes('URL') ||
             kl.includes('url') || k.includes('페이지') || k.includes('리포트') ||
             k.includes('주소') || k.includes('홈페이지');
    }
    Object.keys(overrideVars).forEach(function(k) {
      if (isNameVarP(k)) overrideVars[k] = st.name;
      if (isUrlVarP(k) && landing) overrideVars[k] = landing;
    });
    if (overrideVars['이름'] !== undefined) overrideVars['이름'] = st.name;
    if (overrideVars['학생이름'] !== undefined) overrideVars['학생이름'] = st.name;
    if (overrideVars['학생명'] !== undefined) overrideVars['학생명'] = st.name;
    if (landing) {
      if (overrideVars['랜딩페이지URL'] !== undefined) overrideVars['랜딩페이지URL'] = landing;
      if (overrideVars['랜딩URL'] !== undefined) overrideVars['랜딩URL'] = landing;
      if (overrideVars['URL'] !== undefined) overrideVars['URL'] = landing;
      if (overrideVars['링크'] !== undefined) overrideVars['링크'] = landing;
      if (overrideVars['리포트URL'] !== undefined) overrideVars['리포트URL'] = landing;
      if (overrideVars['페이지URL'] !== undefined) overrideVars['페이지URL'] = landing;
      if (overrideVars['홈페이지'] !== undefined) overrideVars['홈페이지'] = landing;
    }
    updatePreview(overrideVars);
    /* 미리보기 정보 표시 */
    var infoEl = document.getElementById('previewStudentInfo');
    infoEl.classList.remove('hidden');
    document.getElementById('previewStudentName').textContent = st.name + (st.grade ? ' (' + st.grade + ')' : '');
    document.getElementById('previewStudentLanding').textContent = landing ? landing : '랜딩페이지 없음 (제목에 학생 이름 포함 필요)';
  }

  /* ──── 발송 모드 전환 ──── */
  window.setSendMode = function(mode) {
    sendMode = mode;
    ['student','single','bulk'].forEach(function(m) {
      var tab = document.getElementById('mode' + m.charAt(0).toUpperCase() + m.slice(1));
      if (tab) tab.className = 'mode-tab ' + (m === mode ? 'active' : 'inactive');
      var panel = document.getElementById(m + 'Mode');
      if (panel) panel.classList.toggle('hidden', m !== mode);
    });
  };

  /* ──── 엑셀 다운로드 ──── */
  window.downloadStudentExcel = async function() {
    var btn = document.getElementById('btnDownloadExcel');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-1"></i>다운로드 중...';
    try {
      var url = '/api/students/export-with-landing?userId=' + encodeURIComponent(currentUser.id);
      var res = await fetch(url, { credentials: 'include', headers: { 'X-User-Id': String(currentUser.id) } });
      if (!res.ok) { alert('다운로드 실패: ' + res.statusText); return; }
      var blob = await res.blob();
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'students_' + new Date().toISOString().split('T')[0] + '.csv';
      document.body.appendChild(a); a.click(); a.remove();
    } catch(e) { alert('다운로드 오류: ' + e.message); }
    finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-download text-green-600"></i> 학생 명단 엑셀 서식 다운로드';
    }
  };

  /* ──── 엑셀 업로드 ──── */
  window.uploadAlimtalkExcel = async function(event) {
    var file = event.target.files[0];
    if (!file) return;
    try {
      var data = await file.arrayBuffer();
      var workbook = XLSX.read(data);
      var sheet = workbook.Sheets[workbook.SheetNames[0]];
      var range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
      var rows = [];
      for (var r = range.s.r + 1; r <= range.e.r; r++) {
        var nameCell  = sheet[XLSX.utils.encode_cell({r:r,c:0})];
        var phoneCell = sheet[XLSX.utils.encode_cell({r:r,c:2})];
        var urlCell   = sheet[XLSX.utils.encode_cell({r:r,c:3})];
        var name    = nameCell  ? String(nameCell.v).trim() : '';
        var phone   = phoneCell ? String(phoneCell.v).replace(/[^0-9]/g,'') : '';
        var landing = urlCell   ? String(urlCell.v).trim() : '';
        if (name && phone && phone.length >= 9) rows.push({name:name, phone:phone, landing:landing});
      }
      if (!rows.length) { alert('엑셀에서 수신자 데이터를 찾을 수 없습니다.\\nA열: 학생 이름, C열: 학부모 연락처'); return; }
      uploadedRecipientRows = rows;
      var infoEl = document.getElementById('alimtalkUploadInfo');
      document.getElementById('alimtalkUploadCount').textContent = rows.length + '명 수신자 업로드됨 (랜딩페이지 포함)';
      infoEl.classList.remove('hidden');
    } catch(e) { alert('엑셀 파일 오류: ' + e.message); }
    event.target.value = '';
  };

  /* ──── 발송 ──── */
  window.sendAlimtalk = async function() {
    if (!curTpl) { alert('템플릿을 선택해주세요.'); return; }
    var pfId = document.getElementById('channelSelect').value || localStorage.getItem('kakao_pfId') || '';
    if (!pfId) { alert('채널을 선택해주세요.'); return; }

    var recipients = [];

    if (sendMode === 'student') {
      /* 선택된 학생 목록 */
      if (!selectedStudentIds.size) { alert('발송할 학생을 선택해주세요.'); return; }
      selectedStudentIds.forEach(function(id) {
        var st = allStudents.find(function(s) { return s.id === id; });
        if (!st) return;
        var phone   = (st.parent_phone || '').replace(/[^0-9]/g, '');
        if (!phone || phone.length < 9) return;
        var landing = studentLandingMap[id] || '';
        var rowVars = Object.assign({}, varValues);
        /* ✅ FIX: 변수 자동 치환 — 이름 계열 + URL/랜딩 계열 전체 커버 */
        function isNameVar(k) {
          return k.includes('이름') || k.toLowerCase().includes('name');
        }
        function isUrlVar(k) {
          var kl = k.toLowerCase();
          return k.includes('랜딩') || k.includes('링크') || k.includes('URL') ||
                 kl.includes('url') || k.includes('페이지') || k.includes('리포트') ||
                 k.includes('주소') || k.includes('홈페이지');
        }
        Object.keys(rowVars).forEach(function(k) {
          if (isNameVar(k)) rowVars[k] = st.name;
          if (isUrlVar(k) && landing) rowVars[k] = landing;
        });
        /* 명시적 변수명 보장 */
        if (rowVars['이름'] !== undefined) rowVars['이름'] = st.name;
        if (rowVars['학생이름'] !== undefined) rowVars['학생이름'] = st.name;
        if (rowVars['학생명'] !== undefined) rowVars['학생명'] = st.name;
        if (landing) {
          if (rowVars['랜딩페이지URL'] !== undefined) rowVars['랜딩페이지URL'] = landing;
          if (rowVars['랜딩URL'] !== undefined) rowVars['랜딩URL'] = landing;
          if (rowVars['URL'] !== undefined) rowVars['URL'] = landing;
          if (rowVars['링크'] !== undefined) rowVars['링크'] = landing;
          if (rowVars['리포트URL'] !== undefined) rowVars['리포트URL'] = landing;
          if (rowVars['페이지URL'] !== undefined) rowVars['페이지URL'] = landing;
          if (rowVars['홈페이지'] !== undefined) rowVars['홈페이지'] = landing;
        }
        recipients.push({ to: phone, name: st.name, variables: rowVars });
      });
      if (!recipients.length) { alert('선택된 학생 중 유효한 학부모 연락처가 없습니다.'); return; }

    } else if (sendMode === 'single') {
      var phone = document.getElementById('singlePhone').value.trim().replace(/-/g,'');
      var name  = document.getElementById('singleName').value.trim();
      if (!phone) { alert('수신자 번호를 입력해주세요.'); return; }
      recipients.push({ to: phone, name: name, variables: Object.assign({}, varValues) });

    } else {
      /* 엑셀 업로드 모드 */
      if (uploadedRecipientRows.length > 0) {
        uploadedRecipientRows.forEach(function(row) {
          var rowVars = Object.assign({}, varValues);
          var lnd = row.landing || '';
          /* ✅ FIX: 이름/URL 계열 변수 전체 커버 */
          function isNameVar2(k) {
            return k.includes('이름') || k.toLowerCase().includes('name');
          }
          function isUrlVar2(k) {
            var kl = k.toLowerCase();
            return k.includes('랜딩') || k.includes('링크') || k.includes('URL') ||
                   kl.includes('url') || k.includes('페이지') || k.includes('리포트') ||
                   k.includes('주소') || k.includes('홈페이지');
          }
          Object.keys(rowVars).forEach(function(k) {
            if (isNameVar2(k)) rowVars[k] = row.name;
            if (isUrlVar2(k) && lnd) rowVars[k] = lnd;
          });
          if (rowVars['이름'] !== undefined) rowVars['이름'] = row.name;
          if (rowVars['학생이름'] !== undefined) rowVars['학생이름'] = row.name;
          if (rowVars['학생명'] !== undefined) rowVars['학생명'] = row.name;
          if (lnd) {
            if (rowVars['랜딩페이지URL'] !== undefined) rowVars['랜딩페이지URL'] = lnd;
            if (rowVars['랜딩URL'] !== undefined) rowVars['랜딩URL'] = lnd;
            if (rowVars['URL'] !== undefined) rowVars['URL'] = lnd;
            if (rowVars['링크'] !== undefined) rowVars['링크'] = lnd;
            if (rowVars['리포트URL'] !== undefined) rowVars['리포트URL'] = lnd;
            if (rowVars['페이지URL'] !== undefined) rowVars['페이지URL'] = lnd;
            if (rowVars['홈페이지'] !== undefined) rowVars['홈페이지'] = lnd;
          }
          recipients.push({ to: row.phone, name: row.name, variables: rowVars });
        });
      }
      if (!recipients.length) { alert('수신자 목록을 입력해주세요.'); return; }
    }

    /* 발송 확인 */
    if (!confirm(recipients.length + '명에게 알림톡을 발송합니다.\\n계속하시겠습니까?')) return;

    var btn = document.getElementById('sendBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i>발송 중... (' + recipients.length + '명)';
    var resultBox = document.getElementById('resultBox');
    resultBox.style.display = 'none';

    try {
      var res = await fetch('/api/kakao/alimtalk/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': String(currentUser.id) },
        body: JSON.stringify({ pfId, templateCode: curTpl.templateId || curTpl.code || curTpl.templateCode, content: (curTpl.content || curTpl.templtContent || ''), recipients })
      });
      var d = await res.json();
      if (d.ok) {
        resultBox.style.cssText = 'display:block; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:14px; padding:16px;';
        resultBox.innerHTML = '<div class="flex items-start gap-3"><div class="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0"><i class="fas fa-check text-green-600"></i></div><div><p class="font-bold text-green-800 mb-0.5">발송 완료</p><p class="text-sm text-green-600">' + esc(String(d.successCount || recipients.length)) + '건 발송 성공</p></div></div>';
      } else {
        resultBox.style.cssText = 'display:block; background:#fef2f2; border:1px solid #fecaca; border-radius:14px; padding:16px;';
        resultBox.innerHTML = '<div class="flex items-start gap-3"><div class="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0"><i class="fas fa-exclamation text-red-600"></i></div><div><p class="font-bold text-red-800 mb-0.5">발송 실패</p><p class="text-sm text-red-600">' + esc(d.error || '알 수 없는 오류') + '</p></div></div>';
      }
    } catch(e) {
      resultBox.style.cssText = 'display:block; background:#fef2f2; border:1px solid #fecaca; border-radius:14px; padding:16px;';
      resultBox.innerHTML = '<p class="font-bold text-red-800">발송 오류: ' + esc(e.message) + '</p>';
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>알림톡 발송';
    }
  };

  /* ──── 초기화 ──── */
  loadUserChannels();
  loadStudents();
  setSendMode('student');
})();
` + '</script>' + `
</body>
</html>`
