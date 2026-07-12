export const funnelBuilderPage = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>퍼널 빌더 PRO - BYGENCY</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css">
    
    <!-- GrapesJS -->
    <link rel="stylesheet" href="https://unpkg.com/grapesjs/dist/css/grapes.min.css">
    <script src="https://unpkg.com/grapesjs"></script>
    <script src="https://unpkg.com/grapesjs-preset-webpage"></script>
    
    <!-- Chart.js for Analytics -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    
    <style>
        * { font-family: 'Pretendard Variable', -apple-system, sans-serif; }
        .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); }
        .modal.active { display: flex; justify-content: center; align-items: center; }
        .modal-content { background: white; border-radius: 12px; max-width: 90%; max-height: 90%; overflow-y: auto; }
        .tab { display: none; }
        .tab.active { display: block; }
        .gjs-editor { height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; }
        .template-card { transition: all 0.3s; cursor: pointer; }
        .template-card:hover { transform: translateY(-4px); box-shadow: 0 10px 25px rgba(0,0,0,0.15); }
        .funnel-node { position: absolute; background: white; border: 2px solid #3b82f6; border-radius: 8px; padding: 16px; min-width: 200px; cursor: move; }
        .funnel-connector { position: absolute; border-left: 2px dashed #3b82f6; }
        .chart-container { position: relative; height: 300px; }
        .stats-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px; padding: 20px; }
        /* embed mode: 대시보드 iframe 내에서 자체 상단 네비 숨김 */
        .embed nav { display: none !important; }
    </style>
</head>
<body class="bg-gray-50">
    <script>if(location.search.indexOf('embed=1')>-1)document.documentElement.classList.add('embed');</script>
    <!-- 메인 네비게이션 -->
    <nav class="bg-white shadow-sm sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div class="flex items-center gap-6">
                <a href="/admin/marketing" class="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    BYGENCY
                </a>
                <div class="flex gap-2">
                    <button onclick="switchMainTab('groups')" class="main-tab px-4 py-2 rounded-lg text-sm font-medium active:bg-blue-100 active:text-blue-700" data-tab="groups">
                        <i class="fas fa-layer-group mr-2"></i>그룹 관리
                    </button>
                    <button onclick="switchMainTab('templates')" class="main-tab px-4 py-2 rounded-lg text-sm font-medium" data-tab="templates">
                        <i class="fas fa-palette mr-2"></i>템플릿 갤러리
                    </button>
                    <button onclick="switchMainTab('funnel-flow')" class="main-tab px-4 py-2 rounded-lg text-sm font-medium" data-tab="funnel-flow">
                        <i class="fas fa-project-diagram mr-2"></i>퍼널 플로우
                    </button>
                    <button onclick="switchMainTab('analytics')" class="main-tab px-4 py-2 rounded-lg text-sm font-medium" data-tab="analytics">
                        <i class="fas fa-chart-line mr-2"></i>분석 대시보드
                    </button>
                    <button onclick="switchMainTab('auto-response')" class="main-tab px-4 py-2 rounded-lg text-sm font-medium" data-tab="auto-response">
                        <i class="fas fa-paper-plane mr-2"></i>자동 응답
                    </button>
                </div>
            </div>
            <button onclick="goBackFromMarketing()" class="text-gray-600 hover:text-gray-900">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
    </nav>

    <!-- 그룹 관리 탭 -->
    <div id="tab-groups" class="main-tab-content active p-6">
        <div class="max-w-7xl mx-auto">
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-3xl font-bold text-gray-900">퍼널 그룹 관리</h1>
                <button onclick="openCreateGroupModal()" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                    <i class="fas fa-plus mr-2"></i>새 그룹 만들기
                </button>
            </div>
            
            <div id="groups-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <!-- 동적으로 로드 -->
            </div>
            
            <div id="empty-groups" class="text-center py-20" style="display: none;">
                <i class="fas fa-folder-open text-6xl text-gray-300 mb-4"></i>
                <p class="text-gray-500 text-lg mb-6">아직 생성된 그룹이 없습니다</p>
                <button onclick="openCreateGroupModal()" class="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                    첫 그룹 만들기
                </button>
            </div>
        </div>
    </div>

    <!-- 템플릿 갤러리 탭 -->
    <div id="tab-templates" class="main-tab-content p-6" style="display: none;">
        <div class="max-w-7xl mx-auto">
            <h1 class="text-3xl font-bold text-gray-900 mb-6">프리미엄 템플릿 갤러리</h1>
            
            <div class="mb-6 flex gap-4">
                <button onclick="filterTemplates('all')" class="template-filter px-4 py-2 rounded-lg bg-blue-600 text-white" data-category="all">전체</button>
                <button onclick="filterTemplates('landing')" class="template-filter px-4 py-2 rounded-lg bg-gray-200" data-category="landing">랜딩페이지</button>
                <button onclick="filterTemplates('webinar')" class="template-filter px-4 py-2 rounded-lg bg-gray-200" data-category="webinar">웨비나</button>
                <button onclick="filterTemplates('product')" class="template-filter px-4 py-2 rounded-lg bg-gray-200" data-category="product">제품 판매</button>
                <button onclick="filterTemplates('leadgen')" class="template-filter px-4 py-2 rounded-lg bg-gray-200" data-category="leadgen">리드 생성</button>
                <button onclick="filterTemplates('event')" class="template-filter px-4 py-2 rounded-lg bg-gray-200" data-category="event">이벤트</button>
            </div>
            
            <div id="templates-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <!-- 템플릿 카드들 -->
            </div>
        </div>
    </div>

    <!-- 퍼널 플로우 탭 -->
    <div id="tab-funnel-flow" class="main-tab-content p-6" style="display: none;">
        <div class="max-w-7xl mx-auto">
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-3xl font-bold text-gray-900">멀티스텝 퍼널 플로우 설계</h1>
                <div class="flex gap-3">
                    <button onclick="addFunnelStep()" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <i class="fas fa-plus mr-2"></i>단계 추가
                    </button>
                    <button onclick="saveFunnelFlow()" class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        <i class="fas fa-save mr-2"></i>저장
                    </button>
                </div>
            </div>
            
            <div class="bg-white rounded-lg shadow-lg p-6">
                <div id="funnel-canvas" class="relative bg-gray-50 rounded-lg" style="min-height: 600px; position: relative;">
                    <!-- 드래그 앤 드롭 퍼널 노드들 -->
                </div>
            </div>
            
            <div class="mt-6 bg-white rounded-lg shadow-lg p-6">
                <h2 class="text-xl font-bold mb-4">퍼널 통계</h2>
                <div class="grid grid-cols-4 gap-4">
                    <div class="text-center p-4 bg-blue-50 rounded-lg">
                        <p class="text-gray-600 text-sm">총 방문자</p>
                        <p class="text-3xl font-bold text-blue-600" id="funnel-visitors">0</p>
                    </div>
                    <div class="text-center p-4 bg-green-50 rounded-lg">
                        <p class="text-gray-600 text-sm">전환율</p>
                        <p class="text-3xl font-bold text-green-600" id="funnel-conversion">0%</p>
                    </div>
                    <div class="text-center p-4 bg-purple-50 rounded-lg">
                        <p class="text-gray-600 text-sm">이탈률</p>
                        <p class="text-3xl font-bold text-purple-600" id="funnel-dropout">0%</p>
                    </div>
                    <div class="text-center p-4 bg-orange-50 rounded-lg">
                        <p class="text-gray-600 text-sm">평균 체류시간</p>
                        <p class="text-3xl font-bold text-orange-600" id="funnel-time">0분</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 분석 대시보드 탭 -->
    <div id="tab-analytics" class="main-tab-content p-6" style="display: none;">
        <div class="max-w-7xl mx-auto">
            <h1 class="text-3xl font-bold text-gray-900 mb-6">실시간 분석 대시보드</h1>
            
            <!-- 주요 지표 카드 -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div class="stats-card">
                    <p class="text-sm opacity-80 mb-2">오늘 방문자</p>
                    <p class="text-4xl font-bold" id="stat-visitors-today">0</p>
                    <p class="text-xs opacity-70 mt-2">
                        <i class="fas fa-arrow-up mr-1"></i>전일 대비 <span id="stat-visitors-change">0%</span>
                    </p>
                </div>
                <div class="stats-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                    <p class="text-sm opacity-80 mb-2">전환율</p>
                    <p class="text-4xl font-bold" id="stat-conversion-rate">0%</p>
                    <p class="text-xs opacity-70 mt-2">
                        총 <span id="stat-conversions">0</span>건 전환
                    </p>
                </div>
                <div class="stats-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                    <p class="text-sm opacity-80 mb-2">활성 A/B 테스트</p>
                    <p class="text-4xl font-bold" id="stat-ab-tests">0</p>
                    <p class="text-xs opacity-70 mt-2">
                        진행 중인 실험
                    </p>
                </div>
                <div class="stats-card" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
                    <p class="text-sm opacity-80 mb-2">평균 체류시간</p>
                    <p class="text-4xl font-bold" id="stat-avg-time">0분</p>
                    <p class="text-xs opacity-70 mt-2">
                        페이지당 평균
                    </p>
                </div>
            </div>
            
            <!-- 차트 섹션 -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <h2 class="text-xl font-bold mb-4">실시간 트래픽</h2>
                    <div class="chart-container">
                        <canvas id="traffic-chart"></canvas>
                    </div>
                </div>
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <h2 class="text-xl font-bold mb-4">전환 퍼널</h2>
                    <div class="chart-container">
                        <canvas id="conversion-funnel-chart"></canvas>
                    </div>
                </div>
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <h2 class="text-xl font-bold mb-4">소스별 유입</h2>
                    <div class="chart-container">
                        <canvas id="source-chart"></canvas>
                    </div>
                </div>
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <h2 class="text-xl font-bold mb-4">디바이스 분포</h2>
                    <div class="chart-container">
                        <canvas id="device-chart"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- 히트맵 -->
            <div class="mt-6 bg-white rounded-lg shadow-lg p-6">
                <h2 class="text-xl font-bold mb-4">클릭 히트맵</h2>
                <div id="heatmap-container" class="bg-gray-100 rounded-lg p-4" style="min-height: 400px;">
                    <p class="text-center text-gray-500 py-20">페이지를 선택하여 히트맵을 확인하세요</p>
                </div>
            </div>
        </div>
    </div>

    <!-- 자동 응답 탭 -->
    <div id="tab-auto-response" class="main-tab-content p-6" style="display: none;">
        <div class="max-w-7xl mx-auto">
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-3xl font-bold text-gray-900">자동 응답 시스템</h1>
                <button onclick="openAutoResponseModal()" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <i class="fas fa-plus mr-2"></i>새 자동 응답 만들기
                </button>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-xl font-bold">이메일 자동 응답</h2>
                        <i class="fas fa-envelope text-3xl text-blue-600"></i>
                    </div>
                    <p class="text-gray-600 mb-4">신청자에게 자동으로 이메일을 발송합니다</p>
                    <div class="flex items-center justify-between">
                        <span class="text-sm text-gray-500">활성 자동 응답: <strong id="email-auto-count">0</strong>개</span>
                        <button onclick="manageEmailAutoResponse()" class="text-blue-600 hover:underline text-sm">관리 →</button>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-xl font-bold">SMS 자동 응답</h2>
                        <i class="fas fa-sms text-3xl text-green-600"></i>
                    </div>
                    <p class="text-gray-600 mb-4">신청자에게 자동으로 SMS를 발송합니다</p>
                    <div class="flex items-center justify-between">
                        <span class="text-sm text-gray-500">활성 자동 응답: <strong id="sms-auto-count">0</strong>개</span>
                        <button onclick="manageSmsAutoResponse()" class="text-green-600 hover:underline text-sm">관리 →</button>
                    </div>
                </div>
            </div>
            
            <div id="auto-responses-list" class="space-y-4">
                <!-- 자동 응답 목록 -->
            </div>
        </div>
    </div>

    <!-- 그룹 생성/수정 모달 -->
    <div id="group-modal" class="modal">
        <div class="modal-content p-8" style="max-width: 500px; width: 100%;">
            <h2 class="text-2xl font-bold mb-6" id="group-modal-title">새 그룹 만들기</h2>
            <form id="group-form" onsubmit="saveGroup(event)">
                <input type="hidden" id="group-id">
                
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">그룹 이름 *</label>
                    <input type="text" id="group-name" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
                
                <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">설명</label>
                    <textarea id="group-description" rows="3" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
                </div>
                
                <div class="flex gap-3">
                    <button type="button" onclick="closeModal('group-modal')" class="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
                    <button type="submit" class="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">저장</button>
                </div>
            </form>
        </div>
    </div>

    <!-- 랜딩페이지 에디터 모달 -->
    <div id="editor-modal" class="modal">
        <div class="modal-content p-8" style="max-width: 95%; width: 100%; max-height: 95vh;">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold">랜딩페이지 에디터</h2>
                <div class="flex gap-3">
                    <button onclick="testABVariant()" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                        <i class="fas fa-flask mr-2"></i>A/B 테스트 만들기
                    </button>
                    <button onclick="previewLandingPage()" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                        <i class="fas fa-eye mr-2"></i>미리보기
                    </button>
                    <button onclick="saveLandingPage()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        <i class="fas fa-save mr-2"></i>저장
                    </button>
                    <button onclick="closeModal('editor-modal')" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            
            <div class="mb-4">
                <input type="text" id="landing-page-title" placeholder="랜딩페이지 제목" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                <input type="hidden" id="landing-page-id">
                <input type="hidden" id="landing-page-group-id">
            </div>
            
            <div id="gjs-editor" class="gjs-editor"></div>
        </div>
    </div>

    <!-- 템플릿 미리보기 모달 -->
    <div id="template-preview-modal" class="modal">
        <div class="modal-content p-8" style="max-width: 90%; width: 100%;">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold" id="template-preview-title">템플릿 미리보기</h2>
                <button onclick="closeModal('template-preview-modal')" class="text-gray-600 hover:text-gray-900">
                    <i class="fas fa-times text-2xl"></i>
                </button>
            </div>
            
            <div id="template-preview-content" class="bg-gray-100 rounded-lg p-6" style="min-height: 500px;">
                <!-- 템플릿 미리보기 -->
            </div>
            
            <div class="mt-6 flex justify-end gap-3">
                <button onclick="closeModal('template-preview-modal')" class="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
                <button onclick="useTemplate()" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <i class="fas fa-check mr-2"></i>이 템플릿 사용하기
                </button>
            </div>
        </div>
    </div>

    <!-- A/B 테스트 모달 -->
    <div id="ab-test-modal" class="modal">
        <div class="modal-content p-8" style="max-width: 600px; width: 100%;">
            <h2 class="text-2xl font-bold mb-6">A/B 테스트 만들기</h2>
            
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">테스트 이름</label>
                <input type="text" id="ab-test-name" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
            </div>
            
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">트래픽 분배</label>
                <div class="flex gap-4 items-center">
                    <div class="flex-1">
                        <label class="text-xs text-gray-500">버전 A (원본)</label>
                        <input type="range" id="traffic-a" min="0" max="100" value="50" class="w-full" oninput="updateTrafficB()">
                        <p class="text-sm text-center font-medium"><span id="traffic-a-value">50</span>%</p>
                    </div>
                    <div class="flex-1">
                        <label class="text-xs text-gray-500">버전 B (변형)</label>
                        <input type="range" id="traffic-b" min="0" max="100" value="50" class="w-full" oninput="updateTrafficA()">
                        <p class="text-sm text-center font-medium"><span id="traffic-b-value">50</span>%</p>
                    </div>
                </div>
            </div>
            
            <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-2">변형 타입</label>
                <select id="variant-type" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                    <option value="headline">헤드라인 변경</option>
                    <option value="cta">CTA 버튼 변경</option>
                    <option value="color">색상 변경</option>
                    <option value="layout">레이아웃 변경</option>
                    <option value="copy">카피라이팅 변경</option>
                </select>
            </div>
            
            <div class="flex gap-3">
                <button onclick="closeModal('ab-test-modal')" class="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
                <button onclick="createABTest()" class="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                    <i class="fas fa-flask mr-2"></i>테스트 시작
                </button>
            </div>
        </div>
    </div>

    <!-- 자동 응답 설정 모달 -->
    <div id="auto-response-modal" class="modal">
        <div class="modal-content p-8" style="max-width: 700px; width: 100%;">
            <h2 class="text-2xl font-bold mb-6">자동 응답 설정</h2>
            
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">응답 타입</label>
                <div class="flex gap-4">
                    <label class="flex items-center">
                        <input type="radio" name="response-type" value="email" checked onchange="toggleResponseType()">
                        <span class="ml-2">이메일</span>
                    </label>
                    <label class="flex items-center">
                        <input type="radio" name="response-type" value="sms" onchange="toggleResponseType()">
                        <span class="ml-2">SMS</span>
                    </label>
                </div>
            </div>
            
            <div class="mb-4" id="email-fields">
                <label class="block text-sm font-medium text-gray-700 mb-2">이메일 제목</label>
                <input type="text" id="email-subject" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="환영합니다!">
                
                <label class="block text-sm font-medium text-gray-700 mb-2 mt-4">이메일 내용</label>
                <textarea id="email-content" rows="6" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="안녕하세요 {{name}}님,&#10;&#10;신청해주셔서 감사합니다."></textarea>
            </div>
            
            <div class="mb-4" id="sms-fields" style="display: none;">
                <label class="block text-sm font-medium text-gray-700 mb-2">SMS 내용 (최대 90자)</label>
                <textarea id="sms-content" rows="4" maxlength="90" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="[BYGENCY] {{name}}님 신청 감사합니다."></textarea>
                <p class="text-xs text-gray-500 mt-1">사용 가능한 변수: {{name}}, {{phone}}, {{email}}</p>
            </div>
            
            <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-2">발송 시점</label>
                <select id="send-timing" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                    <option value="immediate">즉시 발송</option>
                    <option value="5min">5분 후</option>
                    <option value="1hour">1시간 후</option>
                    <option value="1day">1일 후</option>
                </select>
            </div>
            
            <div class="flex gap-3">
                <button onclick="closeModal('auto-response-modal')" class="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
                <button onclick="saveAutoResponse()" class="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">저장</button>
            </div>
        </div>
    </div>

    <script>
    // 스마트 백 네비게이션: 관리자 → /admin/marketing, 학원장 → /super1647
    function goBackFromMarketing() {
        try {
            const user = JSON.parse(localStorage.getItem('adminUser') || localStorage.getItem('user') || '{}')
            if (user.role === 'admin') {
                window.location.href = '/admin/marketing'
            } else {
                window.location.href = '/super1647'
            }
        } catch(e) {
            window.location.href = '/super1647'
        }
    }

    let editor = null;
    let currentGroupId = null;
    let currentLandingPageId = null;
    let groups = [];
    let templates = [];
    let funnelSteps = [];
    let abTests = [];
    let autoResponses = [];
    
    // 메인 탭 전환
    function switchMainTab(tabName) {
        // 모든 탭 숨기기
        document.querySelectorAll('.main-tab-content').forEach(tab => {
            tab.style.display = 'none';
        });
        
        // 선택된 탭 표시
        document.getElementById('tab-' + tabName).style.display = 'block';
        
        // 버튼 스타일 업데이트
        document.querySelectorAll('.main-tab').forEach(btn => {
            btn.classList.remove('bg-blue-100', 'text-blue-700');
        });
        document.querySelector(\`[data-tab="\${tabName}"]\`).classList.add('bg-blue-100', 'text-blue-700');
        
        // 탭별 초기화
        if (tabName === 'analytics') initAnalyticsDashboard();
        if (tabName === 'templates') loadTemplates();
        if (tabName === 'funnel-flow') loadFunnelFlow();
        if (tabName === 'auto-response') loadAutoResponses();
    }
    
    // 그룹 관리
    function loadGroups() {
        fetch('/api/funnel/groups')
            .then(r => r.json())
            .then(data => {
                groups = data.groups || [];
                const container = document.getElementById('groups-list');
                const empty = document.getElementById('empty-groups');
                
                if (groups.length === 0) {
                    container.style.display = 'none';
                    empty.style.display = 'block';
                    return;
                }
                
                container.style.display = 'grid';
                empty.style.display = 'none';
                
                container.innerHTML = groups.map(group => \`
                    <div class="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition">
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <h3 class="text-xl font-bold text-gray-900">\${group.name}</h3>
                                <p class="text-gray-600 text-sm mt-1">\${group.description || ''}</p>
                            </div>
                            <div class="flex gap-2">
                                <button onclick="editGroup(\${group.id})" class="text-blue-600 hover:text-blue-800">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="deleteGroup(\${group.id})" class="text-red-600 hover:text-red-800">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="flex gap-4 mb-4">
                            <div class="flex-1 text-center py-2 bg-blue-50 rounded">
                                <p class="text-2xl font-bold text-blue-600">\${group.landing_pages_count || 0}</p>
                                <p class="text-xs text-gray-600">랜딩페이지</p>
                            </div>
                            <div class="flex-1 text-center py-2 bg-green-50 rounded">
                                <p class="text-2xl font-bold text-green-600">\${group.applicants_count || 0}</p>
                                <p class="text-xs text-gray-600">신청자</p>
                            </div>
                        </div>
                        
                        <button onclick="openLandingPageEditor(\${group.id})" class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                            <i class="fas fa-plus mr-2"></i>랜딩페이지 만들기
                        </button>
                    </div>
                \`).join('');
            });
    }
    
    function openCreateGroupModal() {
        document.getElementById('group-modal-title').textContent = '새 그룹 만들기';
        document.getElementById('group-form').reset();
        document.getElementById('group-id').value = '';
        openModal('group-modal');
    }
    
    function saveGroup(e) {
        e.preventDefault();
        const id = document.getElementById('group-id').value;
        const name = document.getElementById('group-name').value;
        const description = document.getElementById('group-description').value;
        
        const method = id ? 'PUT' : 'POST';
        const url = id ? \`/api/funnel/groups/\${id}\` : '/api/funnel/groups';
        
        fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description })
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                closeModal('group-modal');
                loadGroups();
                alert('그룹이 저장되었습니다.');
            } else {
                alert(data.error || '저장 실패');
            }
        });
    }
    
    function editGroup(id) {
        const group = groups.find(g => g.id === id);
        if (!group) return;
        
        document.getElementById('group-modal-title').textContent = '그룹 수정';
        document.getElementById('group-id').value = group.id;
        document.getElementById('group-name').value = group.name;
        document.getElementById('group-description').value = group.description || '';
        openModal('group-modal');
    }
    
    function deleteGroup(id) {
        if (!confirm('이 그룹을 삭제하시겠습니까?')) return;
        
        fetch(\`/api/funnel/groups/\${id}\`, { method: 'DELETE' })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    loadGroups();
                    alert('그룹이 삭제되었습니다.');
                }
            });
    }
    
    // 랜딩페이지 에디터
    function openLandingPageEditor(groupId, pageId = null) {
        currentGroupId = groupId;
        currentLandingPageId = pageId;
        
        document.getElementById('landing-page-group-id').value = groupId;
        document.getElementById('landing-page-id').value = pageId || '';
        
        openModal('editor-modal');
        
        if (!editor) {
            initGrapesJSEditor();
        }
        
        if (pageId) {
            // 기존 페이지 로드
            fetch(\`/api/funnel/landing-pages/\${pageId}\`)
                .then(r => r.json())
                .then(data => {
                    document.getElementById('landing-page-title').value = data.title;
                    if (data.html_content) {
                        editor.setComponents(data.html_content);
                    }
                    if (data.css_content) {
                        editor.setStyle(data.css_content);
                    }
                });
        } else {
            editor.setComponents('');
            editor.setStyle('');
        }
    }
    
    function initGrapesJSEditor() {
        editor = grapesjs.init({
            container: '#gjs-editor',
            fromElement: false,
            height: '600px',
            width: 'auto',
            storageManager: false,
            plugins: ['gjs-preset-webpage'],
            pluginsOpts: {
                'gjs-preset-webpage': {}
            },
            canvas: {
                styles: [
                    'https://cdn.tailwindcss.com'
                ]
            },
            blockManager: {
                appendTo: '#gjs-editor',
                blocks: [
                    {
                        id: 'section',
                        label: '<i class="fa fa-square"></i> Section',
                        content: '<section class="py-12 px-4"><h1>New Section</h1></section>',
                        category: 'Basic'
                    },
                    {
                        id: 'text',
                        label: '<i class="fa fa-text"></i> Text',
                        content: '<p class="text-lg">텍스트를 입력하세요</p>',
                        category: 'Basic'
                    },
                    {
                        id: 'image',
                        label: '<i class="fa fa-image"></i> Image',
                        content: '<img src="https://via.placeholder.com/800x400" class="w-full">',
                        category: 'Media'
                    },
                    {
                        id: 'video',
                        label: '<i class="fa fa-video"></i> YouTube',
                        content: '<iframe width="100%" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0" allowfullscreen></iframe>',
                        category: 'Media'
                    },
                    {
                        id: 'form',
                        label: '<i class="fa fa-form"></i> Form',
                        content: \`
                            <form class="max-w-lg mx-auto p-6 bg-white rounded-lg shadow-lg">
                                <input type="text" name="name" placeholder="이름" class="w-full mb-4 px-4 py-2 border rounded">
                                <input type="tel" name="phone" placeholder="연락처" class="w-full mb-4 px-4 py-2 border rounded">
                                <input type="email" name="email" placeholder="이메일" class="w-full mb-4 px-4 py-2 border rounded">
                                <button type="submit" class="w-full px-6 py-3 bg-blue-600 text-white rounded-lg">신청하기</button>
                            </form>
                        \`,
                        category: 'Forms'
                    },
                    {
                        id: 'button',
                        label: '<i class="fa fa-hand-pointer"></i> Button',
                        content: '<button class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">클릭하세요</button>',
                        category: 'Basic'
                    },
                    {
                        id: '2-columns',
                        label: '<i class="fa fa-columns"></i> 2 Columns',
                        content: '<div class="grid grid-cols-2 gap-4"><div class="p-4 bg-gray-100">Column 1</div><div class="p-4 bg-gray-100">Column 2</div></div>',
                        category: 'Layout'
                    },
                    {
                        id: '3-columns',
                        label: '<i class="fa fa-columns"></i> 3 Columns',
                        content: '<div class="grid grid-cols-3 gap-4"><div class="p-4 bg-gray-100">Column 1</div><div class="p-4 bg-gray-100">Column 2</div><div class="p-4 bg-gray-100">Column 3</div></div>',
                        category: 'Layout'
                    }
                ]
            }
        });
    }
    
    function saveLandingPage() {
        const title = document.getElementById('landing-page-title').value;
        const groupId = document.getElementById('landing-page-group-id').value;
        const pageId = document.getElementById('landing-page-id').value;
        
        if (!title) {
            alert('랜딩페이지 제목을 입력하세요.');
            return;
        }
        
        const html = editor.getHtml();
        const css = editor.getCss();
        
        const method = pageId ? 'PUT' : 'POST';
        const url = pageId ? \`/api/funnel/landing-pages/\${pageId}\` : '/api/funnel/landing-pages';
        
        fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                groupId: parseInt(groupId),
                title,
                html_content: html,
                css_content: css
            })
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                alert('랜딩페이지가 저장되었습니다!\\n\\n공개 URL: ' + data.url);
                closeModal('editor-modal');
                loadGroups();
            } else {
                alert(data.error || '저장 실패');
            }
        });
    }
    
    function previewLandingPage() {
        const html = editor.getHtml();
        const css = editor.getCss();
        const fullHtml = \`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <script src="https://cdn.tailwindcss.com"></script>
                <style>\${css}</style>
            </head>
            <body>\${html}</body>
            </html>
        \`;
        
        const blob = new Blob([fullHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    }
    
    // A/B 테스트
    function testABVariant() {
        openModal('ab-test-modal');
    }
    
    function updateTrafficB() {
        const valA = parseInt(document.getElementById('traffic-a').value);
        const valB = 100 - valA;
        document.getElementById('traffic-b').value = valB;
        document.getElementById('traffic-a-value').textContent = valA;
        document.getElementById('traffic-b-value').textContent = valB;
    }
    
    function updateTrafficA() {
        const valB = parseInt(document.getElementById('traffic-b').value);
        const valA = 100 - valB;
        document.getElementById('traffic-a').value = valA;
        document.getElementById('traffic-a-value').textContent = valA;
        document.getElementById('traffic-b-value').textContent = valB;
    }
    
    function createABTest() {
        const name = document.getElementById('ab-test-name').value;
        const trafficA = parseInt(document.getElementById('traffic-a').value);
        const trafficB = parseInt(document.getElementById('traffic-b').value);
        const variantType = document.getElementById('variant-type').value;
        
        if (!name) {
            alert('테스트 이름을 입력하세요.');
            return;
        }
        
        fetch('/api/funnel/ab-tests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                landing_page_id: currentLandingPageId,
                name,
                traffic_split_a: trafficA,
                traffic_split_b: trafficB,
                variant_type: variantType,
                variant_html: editor.getHtml()
            })
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                alert('A/B 테스트가 시작되었습니다!');
                closeModal('ab-test-modal');
            } else {
                alert(data.error || '테스트 생성 실패');
            }
        });
    }
    
    // 템플릿 갤러리
    function loadTemplates() {
        templates = [
            { id: 1, name: '미니멀 랜딩', category: 'landing', thumbnail: 'https://via.placeholder.com/400x300/667eea/ffffff?text=Minimal+Landing', html: '<div class="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600"><div class="text-center text-white"><h1 class="text-6xl font-bold mb-4">Welcome</h1><p class="text-2xl mb-8">Transform Your Business Today</p><button class="px-8 py-4 bg-white text-blue-600 rounded-lg text-xl font-bold hover:bg-gray-100">Get Started</button></div></div>' },
            { id: 2, name: '프로덕트 론칭', category: 'product', thumbnail: 'https://via.placeholder.com/400x300/f093fb/ffffff?text=Product+Launch', html: '<div class="container mx-auto py-20"><h1 class="text-5xl font-bold text-center mb-8">Revolutionary Product</h1><img src="https://via.placeholder.com/800x600" class="mx-auto mb-8"><div class="max-w-2xl mx-auto text-center"><p class="text-xl mb-6">Experience the future of innovation</p><button class="px-10 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full text-xl font-bold">Pre-Order Now</button></div></div>' },
            { id: 3, name: '웨비나 등록', category: 'webinar', thumbnail: 'https://via.placeholder.com/400x300/4facfe/ffffff?text=Webinar+Register', html: '<div class="bg-gray-50 min-h-screen py-20"><div class="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl p-12"><h1 class="text-4xl font-bold mb-4">무료 웨비나</h1><p class="text-xl text-gray-600 mb-8">마케팅 전문가와 함께하는 60분</p><form class="space-y-4"><input type="text" placeholder="이름" class="w-full px-4 py-3 border rounded-lg"><input type="email" placeholder="이메일" class="w-full px-4 py-3 border rounded-lg"><button class="w-full px-6 py-4 bg-blue-600 text-white rounded-lg text-lg font-bold">지금 등록하기</button></form></div></div>' },
            { id: 4, name: '리드 마그넷', category: 'leadgen', thumbnail: 'https://via.placeholder.com/400x300/fa709a/ffffff?text=Lead+Magnet', html: '<div class="container mx-auto py-20"><div class="grid grid-cols-2 gap-8"><div class="flex items-center"><div><h1 class="text-5xl font-bold mb-6">무료 E-book 다운로드</h1><p class="text-xl mb-8">마케팅 성공의 7가지 비밀</p><ul class="space-y-2 mb-8"><li>✓ 고객 획득 전략</li><li>✓ 전환율 최적화</li><li>✓ ROI 극대화</li></ul></div></div><div class="bg-white p-8 rounded-xl shadow-2xl"><h2 class="text-2xl font-bold mb-6">지금 무료로 받으세요</h2><form class="space-y-4"><input type="text" placeholder="이름" class="w-full px-4 py-3 border rounded-lg"><input type="email" placeholder="이메일" class="w-full px-4 py-3 border rounded-lg"><button class="w-full px-6 py-4 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-lg font-bold">다운로드</button></form></div></div></div>' },
            { id: 5, name: '이벤트 페이지', category: 'event', thumbnail: 'https://via.placeholder.com/400x300/43e97b/ffffff?text=Event+Page', html: '<div class="bg-gradient-to-b from-green-400 to-blue-500 min-h-screen py-20 text-white"><div class="container mx-auto text-center"><h1 class="text-6xl font-bold mb-4">연말 특별 이벤트</h1><p class="text-3xl mb-8">최대 70% 할인</p><div class="text-5xl font-bold mb-8">12월 31일까지</div><button class="px-12 py-5 bg-white text-green-600 rounded-full text-2xl font-bold hover:scale-105 transition">지금 참여하기</button></div></div>' },
            { id: 6, name: 'SaaS 랜딩', category: 'landing', thumbnail: 'https://via.placeholder.com/400x300/667eea/ffffff?text=SaaS+Landing', html: '<div class="min-h-screen bg-white"><nav class="py-6 px-8 border-b"><div class="flex justify-between items-center"><span class="text-2xl font-bold">BYGENCY</span><button class="px-6 py-2 bg-blue-600 text-white rounded-lg">무료 체험</button></div></nav><div class="container mx-auto py-20 text-center"><h1 class="text-6xl font-bold mb-6">마케팅을 더 쉽게</h1><p class="text-2xl text-gray-600 mb-12">강력한 퍼널 빌더로 고객을 사로잡으세요</p><div class="flex gap-4 justify-center"><button class="px-8 py-4 bg-blue-600 text-white rounded-lg text-xl">시작하기</button><button class="px-8 py-4 border-2 border-blue-600 text-blue-600 rounded-lg text-xl">더 알아보기</button></div></div></div>' },
            { id: 7, name: '가격 테이블', category: 'product', thumbnail: 'https://via.placeholder.com/400x300/f093fb/ffffff?text=Pricing+Table', html: '<div class="bg-gray-50 py-20"><div class="container mx-auto"><h1 class="text-5xl font-bold text-center mb-12">요금제</h1><div class="grid grid-cols-3 gap-8"><div class="bg-white p-8 rounded-xl shadow-lg"><h3 class="text-2xl font-bold mb-4">Basic</h3><p class="text-4xl font-bold mb-6">$29<span class="text-lg text-gray-600">/월</span></p><ul class="space-y-3 mb-8"><li>✓ 10 랜딩페이지</li><li>✓ 기본 분석</li><li>✓ 이메일 지원</li></ul><button class="w-full px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg">선택하기</button></div><div class="bg-blue-600 text-white p-8 rounded-xl shadow-2xl transform scale-105"><div class="bg-yellow-400 text-blue-900 px-4 py-1 rounded-full text-sm font-bold inline-block mb-4">인기</div><h3 class="text-2xl font-bold mb-4">Pro</h3><p class="text-4xl font-bold mb-6">$79<span class="text-lg">/월</span></p><ul class="space-y-3 mb-8"><li>✓ 무제한 랜딩페이지</li><li>✓ 고급 분석</li><li>✓ A/B 테스트</li><li>✓ 우선 지원</li></ul><button class="w-full px-6 py-3 bg-white text-blue-600 rounded-lg font-bold">선택하기</button></div><div class="bg-white p-8 rounded-xl shadow-lg"><h3 class="text-2xl font-bold mb-4">Enterprise</h3><p class="text-4xl font-bold mb-6">맞춤형</p><ul class="space-y-3 mb-8"><li>✓ 무제한 모든 기능</li><li>✓ 전담 매니저</li><li>✓ 커스텀 통합</li></ul><button class="w-full px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg">문의하기</button></div></div></div></div>' },
            { id: 8, name: '뉴스레터 구독', category: 'leadgen', thumbnail: 'https://via.placeholder.com/400x300/4facfe/ffffff?text=Newsletter', html: '<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500"><div class="bg-white p-12 rounded-2xl shadow-2xl max-w-2xl"><div class="text-center mb-8"><i class="fas fa-envelope text-6xl text-blue-600 mb-4"></i><h1 class="text-4xl font-bold mb-4">주간 뉴스레터</h1><p class="text-xl text-gray-600">매주 월요일, 최신 마케팅 인사이트를 받아보세요</p></div><form class="flex gap-4"><input type="email" placeholder="이메일 주소" class="flex-1 px-6 py-4 border-2 rounded-lg text-lg"><button class="px-8 py-4 bg-blue-600 text-white rounded-lg font-bold text-lg hover:bg-blue-700">구독하기</button></form><p class="text-sm text-gray-500 text-center mt-4">언제든지 구독 취소 가능합니다</p></div></div>' },
            { id: 9, name: '팀 소개', category: 'landing', thumbnail: 'https://via.placeholder.com/400x300/fa709a/ffffff?text=Team+Page', html: '<div class="container mx-auto py-20"><h1 class="text-5xl font-bold text-center mb-4">우리 팀을 소개합니다</h1><p class="text-xl text-gray-600 text-center mb-16">열정적인 전문가들이 함께합니다</p><div class="grid grid-cols-4 gap-8"><div class="text-center"><img src="https://via.placeholder.com/200x200" class="rounded-full mx-auto mb-4"><h3 class="text-xl font-bold">김철수</h3><p class="text-gray-600">CEO</p></div><div class="text-center"><img src="https://via.placeholder.com/200x200" class="rounded-full mx-auto mb-4"><h3 class="text-xl font-bold">박영희</h3><p class="text-gray-600">CTO</p></div><div class="text-center"><img src="https://via.placeholder.com/200x200" class="rounded-full mx-auto mb-4"><h3 class="text-xl font-bold">이민준</h3><p class="text-gray-600">CMO</p></div><div class="text-center"><img src="https://via.placeholder.com/200x200" class="rounded-full mx-auto mb-4"><h3 class="text-xl font-bold">정서연</h3><p class="text-gray-600">Designer</p></div></div></div>' },
            { id: 10, name: 'FAQ 페이지', category: 'landing', thumbnail: 'https://via.placeholder.com/400x300/43e97b/ffffff?text=FAQ+Page', html: '<div class="container mx-auto py-20"><h1 class="text-5xl font-bold text-center mb-16">자주 묻는 질문</h1><div class="max-w-3xl mx-auto space-y-4"><details class="bg-white p-6 rounded-lg shadow"><summary class="text-xl font-bold cursor-pointer">무료 체험 기간은 얼마나 되나요?</summary><p class="mt-4 text-gray-600">14일간 무료로 모든 기능을 사용하실 수 있습니다.</p></details><details class="bg-white p-6 rounded-lg shadow"><summary class="text-xl font-bold cursor-pointer">결제는 어떻게 하나요?</summary><p class="mt-4 text-gray-600">신용카드 또는 계좌이체로 결제 가능합니다.</p></details><details class="bg-white p-6 rounded-lg shadow"><summary class="text-xl font-bold cursor-pointer">환불 정책은 어떻게 되나요?</summary><p class="mt-4 text-gray-600">30일 이내 100% 환불 가능합니다.</p></details></div></div>' }
        ];
        
        filterTemplates('all');
    }
    
    function filterTemplates(category) {
        const filtered = category === 'all' ? templates : templates.filter(t => t.category === category);
        
        document.querySelectorAll('.template-filter').forEach(btn => {
            btn.classList.remove('bg-blue-600', 'text-white');
            btn.classList.add('bg-gray-200');
        });
        document.querySelector(\`[data-category="\${category}"]\`).classList.add('bg-blue-600', 'text-white');
        document.querySelector(\`[data-category="\${category}"]\`).classList.remove('bg-gray-200');
        
        const grid = document.getElementById('templates-grid');
        grid.innerHTML = filtered.map(t => \`
            <div class="template-card bg-white rounded-lg shadow-lg overflow-hidden" onclick="previewTemplate(\${t.id})">
                <img src="\${t.thumbnail}" class="w-full h-48 object-cover">
                <div class="p-4">
                    <h3 class="text-lg font-bold">\${t.name}</h3>
                    <p class="text-sm text-gray-600">\${getCategoryName(t.category)}</p>
                </div>
            </div>
        \`).join('');
    }
    
    function getCategoryName(cat) {
        const names = {
            landing: '랜딩페이지',
            webinar: '웨비나',
            product: '제품 판매',
            leadgen: '리드 생성',
            event: '이벤트'
        };
        return names[cat] || cat;
    }
    
    function previewTemplate(id) {
        const template = templates.find(t => t.id === id);
        if (!template) return;
        
        document.getElementById('template-preview-title').textContent = template.name;
        document.getElementById('template-preview-content').innerHTML = \`
            <iframe srcdoc="\${template.html.replace(/"/g, '&quot;')}" class="w-full h-96 border-0 rounded-lg"></iframe>
        \`;
        
        openModal('template-preview-modal');
        window.selectedTemplate = template;
    }
    
    function useTemplate() {
        if (!window.selectedTemplate) return;
        
        if (!currentGroupId) {
            alert('먼저 그룹을 선택하세요.');
            return;
        }
        
        closeModal('template-preview-modal');
        openLandingPageEditor(currentGroupId);
        
        setTimeout(() => {
            if (editor) {
                editor.setComponents(window.selectedTemplate.html);
                document.getElementById('landing-page-title').value = window.selectedTemplate.name;
            }
        }, 500);
    }
    
    // 퍼널 플로우
    function loadFunnelFlow() {
        // 초기 퍼널 스텝 로드
        if (funnelSteps.length === 0) {
            funnelSteps = [
                { id: 1, name: '랜딩페이지', x: 100, y: 100, visitors: 1000, conversions: 300 },
                { id: 2, name: '제품 소개', x: 400, y: 100, visitors: 300, conversions: 150 },
                { id: 3, name: '신청 완료', x: 700, y: 100, visitors: 150, conversions: 150 }
            ];
        }
        renderFunnelFlow();
    }
    
    function renderFunnelFlow() {
        const canvas = document.getElementById('funnel-canvas');
        canvas.innerHTML = '';
        
        // 커넥터 그리기
        for (let i = 0; i < funnelSteps.length - 1; i++) {
            const step1 = funnelSteps[i];
            const step2 = funnelSteps[i + 1];
            const connector = document.createElement('div');
            connector.className = 'funnel-connector';
            connector.style.left = (step1.x + 100) + 'px';
            connector.style.top = (step1.y + 40) + 'px';
            connector.style.width = (step2.x - step1.x - 100) + 'px';
            connector.style.borderTop = '2px dashed #3b82f6';
            connector.style.transform = 'translateY(-50%)';
            canvas.appendChild(connector);
        }
        
        // 노드 그리기
        funnelSteps.forEach((step, index) => {
            const node = document.createElement('div');
            node.className = 'funnel-node';
            node.style.left = step.x + 'px';
            node.style.top = step.y + 'px';
            node.innerHTML = \`
                <div class="flex justify-between items-center mb-2">
                    <h3 class="font-bold">\${step.name}</h3>
                    <button onclick="removeFunnelStep(\${step.id})" class="text-red-600 hover:text-red-800">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="text-sm text-gray-600">
                    <p>방문: \${step.visitors}</p>
                    <p>전환: \${step.conversions}</p>
                    <p class="font-bold text-blue-600">\${((step.conversions / step.visitors) * 100).toFixed(1)}%</p>
                </div>
            \`;
            
            // 드래그 기능
            node.onmousedown = (e) => {
                const startX = e.clientX - step.x;
                const startY = e.clientY - step.y;
                
                const onMouseMove = (e2) => {
                    step.x = e2.clientX - startX;
                    step.y = e2.clientY - startY;
                    renderFunnelFlow();
                };
                
                const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                };
                
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            };
            
            canvas.appendChild(node);
        });
        
        // 통계 업데이트
        const totalVisitors = funnelSteps[0]?.visitors || 0;
        const totalConversions = funnelSteps[funnelSteps.length - 1]?.conversions || 0;
        const conversionRate = totalVisitors > 0 ? ((totalConversions / totalVisitors) * 100).toFixed(1) : 0;
        const dropoutRate = totalVisitors > 0 ? (100 - conversionRate).toFixed(1) : 0;
        
        document.getElementById('funnel-visitors').textContent = totalVisitors;
        document.getElementById('funnel-conversion').textContent = conversionRate + '%';
        document.getElementById('funnel-dropout').textContent = dropoutRate + '%';
        document.getElementById('funnel-time').textContent = '3.5';
    }
    
    function addFunnelStep() {
        const newId = Math.max(...funnelSteps.map(s => s.id), 0) + 1;
        const newStep = {
            id: newId,
            name: '새 단계',
            x: 100 + (funnelSteps.length * 150),
            y: 100 + (funnelSteps.length * 50),
            visitors: 100,
            conversions: 50
        };
        funnelSteps.push(newStep);
        renderFunnelFlow();
    }
    
    function removeFunnelStep(id) {
        funnelSteps = funnelSteps.filter(s => s.id !== id);
        renderFunnelFlow();
    }
    
    function saveFunnelFlow() {
        fetch('/api/funnel/flow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ steps: funnelSteps })
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                alert('퍼널 플로우가 저장되었습니다.');
            }
        });
    }
    
    // 분석 대시보드
    function initAnalyticsDashboard() {
        // 실시간 트래픽 차트
        const trafficCtx = document.getElementById('traffic-chart');
        if (trafficCtx) {
            new Chart(trafficCtx, {
                type: 'line',
                data: {
                    labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
                    datasets: [{
                        label: '방문자',
                        data: [120, 190, 300, 500, 420, 380, 250],
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }
        
        // 전환 퍼널 차트
        const funnelCtx = document.getElementById('conversion-funnel-chart');
        if (funnelCtx) {
            new Chart(funnelCtx, {
                type: 'bar',
                data: {
                    labels: ['방문', '페이지뷰', '폼 시작', '폼 완료', '전환'],
                    datasets: [{
                        label: '사용자',
                        data: [1000, 800, 500, 300, 150],
                        backgroundColor: [
                            '#3b82f6',
                            '#6366f1',
                            '#8b5cf6',
                            '#a855f7',
                            '#d946ef'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }
        
        // 소스별 유입 차트
        const sourceCtx = document.getElementById('source-chart');
        if (sourceCtx) {
            new Chart(sourceCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Direct', 'Google', 'Facebook', 'Instagram', 'Email'],
                    datasets: [{
                        data: [30, 25, 20, 15, 10],
                        backgroundColor: [
                            '#3b82f6',
                            '#10b981',
                            '#f59e0b',
                            '#ef4444',
                            '#8b5cf6'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
        
        // 디바이스 분포 차트
        const deviceCtx = document.getElementById('device-chart');
        if (deviceCtx) {
            new Chart(deviceCtx, {
                type: 'pie',
                data: {
                    labels: ['Mobile', 'Desktop', 'Tablet'],
                    datasets: [{
                        data: [60, 30, 10],
                        backgroundColor: [
                            '#3b82f6',
                            '#10b981',
                            '#f59e0b'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
        
        // 통계 데이터 업데이트
        document.getElementById('stat-visitors-today').textContent = '1,234';
        document.getElementById('stat-visitors-change').textContent = '+12.5%';
        document.getElementById('stat-conversion-rate').textContent = '15.2%';
        document.getElementById('stat-conversions').textContent = '187';
        document.getElementById('stat-ab-tests').textContent = abTests.length;
        document.getElementById('stat-avg-time').textContent = '3.5';
    }
    
    // 자동 응답
    function loadAutoResponses() {
        fetch('/api/funnel/auto-responses')
            .then(r => r.json())
            .then(data => {
                autoResponses = data.responses || [];
                
                const emailCount = autoResponses.filter(r => r.type === 'email').length;
                const smsCount = autoResponses.filter(r => r.type === 'sms').length;
                
                document.getElementById('email-auto-count').textContent = emailCount;
                document.getElementById('sms-auto-count').textContent = smsCount;
                
                const list = document.getElementById('auto-responses-list');
                list.innerHTML = autoResponses.map(r => \`
                    <div class="bg-white rounded-lg shadow-lg p-6">
                        <div class="flex justify-between items-start">
                            <div>
                                <h3 class="text-xl font-bold mb-2">\${r.name || '자동 응답'}</h3>
                                <p class="text-gray-600">\${r.type === 'email' ? '이메일' : 'SMS'} - \${r.trigger}</p>
                            </div>
                            <div class="flex gap-2">
                                <button onclick="editAutoResponse(\${r.id})" class="text-blue-600 hover:text-blue-800">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="deleteAutoResponse(\${r.id})" class="text-red-600 hover:text-red-800">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                \`).join('');
            });
    }
    
    function openAutoResponseModal() {
        document.getElementById('auto-response-modal').querySelector('form')?.reset();
        openModal('auto-response-modal');
    }
    
    function toggleResponseType() {
        const type = document.querySelector('input[name="response-type"]:checked').value;
        document.getElementById('email-fields').style.display = type === 'email' ? 'block' : 'none';
        document.getElementById('sms-fields').style.display = type === 'sms' ? 'block' : 'none';
    }
    
    function saveAutoResponse() {
        const type = document.querySelector('input[name="response-type"]:checked').value;
        const subject = type === 'email' ? document.getElementById('email-subject').value : '';
        const content = type === 'email' ? 
            document.getElementById('email-content').value : 
            document.getElementById('sms-content').value;
        const timing = document.getElementById('send-timing').value;
        
        fetch('/api/funnel/auto-responses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type,
                subject,
                content,
                timing,
                trigger: 'form_submit'
            })
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                alert('자동 응답이 설정되었습니다.');
                closeModal('auto-response-modal');
                loadAutoResponses();
            } else {
                alert(data.error || '저장 실패');
            }
        });
    }
    
    function manageEmailAutoResponse() {
        switchMainTab('auto-response');
        setTimeout(() => {
            document.querySelector('input[name="response-type"][value="email"]').checked = true;
            toggleResponseType();
        }, 100);
    }
    
    function manageSmsAutoResponse() {
        switchMainTab('auto-response');
        setTimeout(() => {
            document.querySelector('input[name="response-type"][value="sms"]').checked = true;
            toggleResponseType();
        }, 100);
    }
    
    // 모달 관리
    function openModal(id) {
        document.getElementById(id).classList.add('active');
    }
    
    function closeModal(id) {
        document.getElementById(id).classList.remove('active');
    }
    
    // 초기화
    document.addEventListener('DOMContentLoaded', () => {
        loadGroups();
        
        // 첫 번째 탭 활성화
        switchMainTab('groups');
    });
    </script>
</body>
</html>

`;
