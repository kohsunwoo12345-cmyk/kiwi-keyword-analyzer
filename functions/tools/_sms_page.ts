// SUPERPLACE 문자 발송(SMS) 도구 이식 — BYGENCY 브랜딩. /sms/compose 페이지 원본 이식.
// 임베드 모드(embed=1) 시 상단 내비 숨김 + 로그인 리다이렉트 무력화(더미 유저).

export const smsPage = `    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>문자 작성 - SMS 발송</title>
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
        <style>
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
          * {
            font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          }
        
          /* embed mode: hide top nav when rendered inside dashboard iframe */
          .embed nav{display:none!important}
          .embed .pt-24{padding-top:1.5rem!important}
        </style>
    </head>
    <body class="bg-gray-50">
        <script>if(location.search.indexOf('embed=1')>-1)document.documentElement.classList.add('embed');<\/script>
        <script>try{var _u=JSON.parse(localStorage.getItem('user')||'null');if(!_u||!_u.id){localStorage.setItem('user',JSON.stringify({id:'bygency',name:'BYGENCY'}));}}catch(e){try{localStorage.setItem('user',JSON.stringify({id:'bygency',name:'BYGENCY'}));}catch(_){}}<\/script>
        <!-- Navigation -->
        <nav class="fixed w-full top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
            <div class="max-w-7xl mx-auto px-6">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center space-x-8">
                        <a href="/super1647" class="text-xl font-bold text-purple-600">SMS 발송 시스템</a>
                        <div class="flex space-x-4">
                            <a href="/sms/senders" class="text-gray-600 hover:text-purple-600 px-3 py-2">발신번호</a>
                            <a href="/sms/compose" class="text-purple-600 border-b-2 border-purple-600 px-3 py-2 font-medium">문자 작성</a>
                            <a href="/sms/logs" class="text-gray-600 hover:text-purple-600 px-3 py-2">발송 내역</a>
                            <a href="/sms/points" class="text-gray-600 hover:text-purple-600 px-3 py-2">포인트 관리</a>
                        </div>
                    </div>
                    <a href="/super1647" class="text-gray-600 hover:text-purple-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                        </svg>
                    </a>
                </div>
            </div>
        </nav>

        <div class="pt-24 pb-12 px-6">
            <div class="max-w-6xl mx-auto">
                <!-- Header -->
                <div class="mb-8">
                    <h1 class="text-3xl font-bold text-gray-900 mb-2">✉️ 문자 작성</h1>
                    <p class="text-gray-600">문자 메시지를 작성하고 발송합니다</p>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- 왼쪽: 문자 작성 -->
                    <div class="lg:col-span-2 space-y-6">
                        <!-- 발신번호 선택 -->
                        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <label class="block text-sm font-semibold text-gray-900 mb-3">발신번호</label>
                            <select id="senderId" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                                <option value="">발신번호를 선택하세요</option>
                            </select>
                        </div>

                        <!-- 문자 제목 -->
                        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div class="flex items-center justify-between mb-3">
                                <label class="block text-sm font-semibold text-gray-900" for="smsSubject">문자 제목 <span class="text-xs text-gray-400 font-normal">(LMS 장문일 때 표시됩니다)</span></label>
                                <span id="subjectByteCount" class="text-xs text-gray-400">0 / 40자</span>
                            </div>
                            <input type="text" id="smsSubject" maxlength="40"
                                placeholder="예: [BYGENCY학원] 공지사항"
                                oninput="updateSubjectCount()"
                                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm">
                            <p class="text-xs text-gray-400 mt-2">
                                💡 SMS(단문·90바이트 이내)는 제목 없이 발송됩니다. LMS(장문) 발송 시 제목이 문자 상단에 표시됩니다.
                            </p>
                        </div>

                        <!-- 템플릿 관리 -->
                        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-sm font-semibold text-gray-900">📁 템플릿 관리</h3>
                                <div class="flex gap-2">
                                    <button onclick="saveTemplate()" class="text-xs px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition">
                                        💾 저장
                                    </button>
                                </div>
                            </div>
                            
                            <!-- 템플릿 목록 -->
                            <div id="templateList" class="space-y-2 max-h-40 overflow-y-auto">
                                <p class="text-xs text-gray-400 text-center py-3">템플릿이 없습니다</p>
                            </div>
                        </div>

                        <!-- 문자 유형 선택 (광고 / 정보) -->
                        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <label class="block text-sm font-semibold text-gray-900 mb-3">📋 문자 유형</label>
                            <div class="grid grid-cols-2 gap-3">
                                <!-- 정보성 -->
                                <label id="typeInfoLabel" class="flex items-start gap-3 p-4 rounded-xl border-2 border-purple-500 bg-purple-50 cursor-pointer transition-all">
                                    <input type="radio" name="smsType" id="typeInfo" value="info" checked class="mt-0.5 accent-purple-600">
                                    <div>
                                        <div class="font-semibold text-sm text-purple-900">📢 정보성 문자</div>
                                        <div class="text-xs text-purple-700 mt-0.5">공지·알림 등 수신동의 없이 발송 가능한 문자</div>
                                    </div>
                                </label>
                                <!-- 광고성 -->
                                <label id="typeAdLabel" class="flex items-start gap-3 p-4 rounded-xl border-2 border-gray-200 bg-gray-50 cursor-pointer transition-all hover:border-orange-400">
                                    <input type="radio" name="smsType" id="typeAd" value="ad" class="mt-0.5 accent-orange-500">
                                    <div>
                                        <div class="font-semibold text-sm text-gray-900">📣 광고성 문자</div>
                                        <div class="text-xs text-gray-600 mt-0.5">할인·프로모션 등 마케팅 문자 (법적 필수 문구 자동 삽입)</div>
                                    </div>
                                </label>
                            </div>
                            <!-- 광고 안내 박스 (광고 선택 시만 표시) -->
                            <div id="adNoticeBox" class="hidden mt-3 flex items-start gap-2 px-4 py-3 bg-orange-50 border border-orange-200 rounded-lg">
                                <span class="text-orange-500 text-base leading-none mt-0.5">⚠️</span>
                                <p class="text-xs text-orange-800 leading-relaxed">
                                    광고성 문자는 메시지 <strong>맨 앞에 (광고)</strong>, <strong>맨 뒤에 무료수신거부 080-500-4233</strong>이 자동으로 붙습니다.<br>
                                    정보통신망법 제50조에 따른 법적 의무 사항입니다.
                                </p>
                            </div>
                        </div>

                        <!-- 메시지 작성 -->
                        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div class="flex items-center justify-between mb-3">
                                <label class="block text-sm font-semibold text-gray-900">메시지 내용</label>
                                <div class="flex items-center space-x-2">
                                    <span id="byteCount" class="text-sm font-medium text-gray-600">0</span>
                                    <span class="text-sm text-gray-400">/ 2000 바이트</span>
                                </div>
                            </div>
                            
                            <!-- 치환 변수 버튼들 -->
                            <div class="flex flex-wrap gap-2 mb-3">
                                <button onclick="insertVariable('#{이름}')" class="text-xs px-3 py-1.5 bg-yellow-50 hover:bg-yellow-100 border border-yellow-300 text-yellow-700 rounded-lg transition font-medium">
                                    <i class="fas fa-user-graduate mr-1"></i>#{이름} 학생이름
                                </button>
                                <button onclick="insertVariable('#{랜딩페이지URL}')" class="text-xs px-3 py-1.5 bg-green-50 hover:bg-green-100 border border-green-300 text-green-700 rounded-lg transition font-medium">
                                    <i class="fas fa-link mr-1"></i>#{랜딩페이지URL}
                                </button>
                                <button onclick="insertVariable('#{학부모연락처}')" class="text-xs px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-700 rounded-lg transition font-medium">
                                    <i class="fas fa-phone mr-1"></i>#{학부모연락처}
                                </button>
                            </div>

                            <!-- 광고 prefix 미리보기 (광고 선택 시 표시) -->
                            <div id="adPrefixPreview" class="hidden mb-0">
                                <div class="px-4 py-2 bg-orange-100 border border-orange-300 border-b-0 rounded-t-lg text-xs font-bold text-orange-800 tracking-wide select-none">
                                    (광고)
                                </div>
                            </div>
                            
                            <textarea id="message" rows="10" 
                                placeholder="메시지를 입력하세요&#10;&#10;치환 변수 사용 예시:&#10;안녕하세요 #{이름} 학부모님!&#10;꾸메땅학원입니다."
                                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 resize-none"></textarea>

                            <!-- 광고 suffix 미리보기 (광고 선택 시 표시) -->
                            <div id="adSuffixPreview" class="hidden mt-0">
                                <div class="px-4 py-2 bg-orange-100 border border-orange-300 border-t-0 rounded-b-lg text-xs font-bold text-orange-800 tracking-wide select-none">
                                    무료수신거부 080-500-4233
                                </div>
                            </div>

                            <div class="flex items-center justify-between mt-3">
                                <span id="messageType" class="text-sm font-medium px-3 py-1 bg-blue-100 text-blue-800 rounded-full">SMS (단문)</span>
                                <p class="text-xs text-gray-500">100자 초과 시 LMS(장문 90P)로 자동 전환 / 100자 이내 SMS 45P</p>
                            </div>
                        </div>

                        <!-- 예약 발송 -->
                        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <label class="flex items-center space-x-3 mb-4">
                                <input type="checkbox" id="reserveEnabled" class="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500">
                                <span class="text-sm font-semibold text-gray-900">예약 발송</span>
                            </label>
                            <input type="datetime-local" id="reserveTime" 
                                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:text-gray-400" 
                                disabled>
                        </div>
                    </div>

                    <!-- 오른쪽: 수신자 관리 -->
                    <div class="space-y-6">
                        <!-- 수신자 추가 -->
                        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 class="text-sm font-semibold text-gray-900 mb-4">수신자 추가</h3>
                            <!-- 탭 -->
                            <div class="flex rounded-lg overflow-hidden border border-gray-200 mb-4 text-xs font-semibold">
                                <button id="tabSingle" onclick="switchAddTab('single')" class="flex-1 py-2 bg-purple-600 text-white transition">직접 입력</button>
                                <button id="tabBulk" onclick="switchAddTab('bulk')" class="flex-1 py-2 bg-white text-gray-500 hover:bg-gray-50 transition">번호 일괄 붙여넣기</button>
                            </div>
                            <!-- 단건 입력 -->
                            <div id="panelSingle" class="space-y-3 mb-4">
                                <input type="text" id="receiverName" placeholder="이름 (선택)" 
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm">
                                <input type="text" id="receiverPhone" placeholder="010-1234-5678" 
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm">
                                <p class="text-xs text-gray-400">이름을 입력하지 않으면 번호가 이름으로 표시됩니다</p>
                            </div>
                            <!-- 일괄 붙여넣기 -->
                            <div id="panelBulk" class="hidden mb-4">
                                <textarea id="bulkPhoneText" rows="5"
                                    placeholder="010으로 시작하는 번호가 포함된 텍스트를 붙여넣으세요.&#10;&#10;예시:&#10;홍길동 010-1234-5678&#10;이순신 010-9876-5432&#10;김영희,01011112222&#10;카카오톡 프로필: 연락처 010.3333.4444"
                                    class="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm resize-none"></textarea>
                                <p class="text-xs text-gray-400 mt-1.5"><i class="fas fa-info-circle mr-1"></i>텍스트에서 <strong>010으로 시작하는 11자리 번호</strong>를 자동으로 추출합니다</p>
                            </div>
                            <button onclick="addReceiver()" 
                                class="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition font-medium text-sm">
                                + 수신자 추가
                            </button>
                        </div>

                        <!-- 학생 명단 엑셀 다운로드 + 업로드 -->
                        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 class="text-sm font-semibold text-gray-900 mb-3">📊 학생 명단</h3>
                            <!-- 발송 대상 선택 -->
                            <div class="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <p class="text-xs font-semibold text-gray-600 mb-2">발송 대상 선택</p>
                                <div class="flex gap-4">
                                    <label class="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="sendTarget" id="targetParent" value="parent" checked class="w-4 h-4 accent-purple-600">
                                        <span class="text-sm text-gray-700 font-medium">👨‍👩‍👧 학부모에게 발송</span>
                                    </label>
                                    <label class="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="sendTarget" id="targetStudent" value="student" class="w-4 h-4 accent-purple-600">
                                        <span class="text-sm text-gray-700 font-medium">🎓 학생에게 발송</span>
                                    </label>
                                </div>
                            </div>
                            <!-- 랜딩페이지 첨부 -->
                            <div class="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <label class="flex items-center gap-2 cursor-pointer mb-1">
                                    <input type="checkbox" id="attachLanding" onchange="toggleLandingAttach()" class="w-4 h-4 accent-blue-600 rounded">
                                    <span class="text-sm font-semibold text-blue-800">🔗 랜딩페이지 첨부</span>
                                </label>
                                <p class="text-xs text-blue-600 ml-6">각 학생 이름으로 생성된 최근 랜딩페이지 URL이 #{랜딩페이지URL} 변수로 자동 첨부됩니다</p>
                                <div id="landingAttachStatus" class="hidden ml-6 mt-1.5 text-xs text-blue-700 font-medium"></div>
                            </div>
                            <!-- 학생 DB에서 직접 추가 버튼 -->
                            <button onclick="openStudentPickerModal()" id="btnAddFromStudents"
                                class="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-50 hover:bg-purple-100 border border-purple-300 text-purple-700 text-sm font-semibold rounded-lg transition mb-2">
                                <i class="fas fa-users text-purple-600"></i>
                                학생 목록에서 추가
                            </button>
                            <!-- 다운로드 -->
                            <button onclick="downloadStudentSmsExcel()" id="btnSmsDownloadExcel"
                                class="w-full flex items-center justify-center gap-2 py-2.5 bg-green-50 hover:bg-green-100 border border-green-300 text-green-700 text-sm font-semibold rounded-lg transition mb-2">
                                <i class="fas fa-file-excel text-green-600"></i>
                                학생 명단 엑셀 다운로드
                            </button>
                            <!-- 업로드 -->
                            <div class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-purple-500 transition cursor-pointer" 
                                onclick="document.getElementById('excelFile').click()">
                                <svg class="w-8 h-8 text-gray-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                                </svg>
                                <p class="text-sm text-gray-600">수신자 엑셀 업로드</p>
                                <p class="text-xs text-gray-400 mt-1">업로드 후 전화번호 열을 선택하여 수신자 추가</p>
                            </div>
                            <input type="file" id="excelFile" accept=".xlsx,.xls,.csv" class="hidden" onchange="uploadExcel(event)">
                            <div id="smsUploadInfo" class="hidden mt-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                                <i class="fas fa-check-circle mr-1"></i><span id="smsUploadCount"></span>
                            </div>
                            <p class="text-xs text-gray-400 mt-2"><i class="fas fa-info-circle mr-1"></i>엑셀 업로드 후 어느 열의 번호를 수신자로 추가할지 선택할 수 있습니다</p>
                        </div>

                        <!-- 수신자 목록 -->
                        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-sm font-semibold text-gray-900">수신자 목록</h3>
                                <span id="receiverCount" class="text-sm font-medium text-purple-600">0명</span>
                            </div>
                            
                            <!-- 검색 입력 -->
                            <div class="mb-3">
                                <div class="relative">
                                    <input 
                                        type="text" 
                                        id="receiverSearch" 
                                        placeholder="이름 또는 전화번호로 검색..." 
                                        oninput="filterReceivers()"
                                        class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                                    >
                                    <svg class="w-5 h-5 absolute left-3 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                                    </svg>
                                </div>
                            </div>
                            
                            <div id="receiversContainer" class="space-y-2 max-h-64 overflow-y-auto">
                                <p class="text-sm text-gray-400 text-center py-4">수신자를 추가해주세요</p>
                            </div>
                            <button onclick="clearReceivers()" 
                                class="w-full mt-4 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm">
                                전체 삭제
                            </button>
                        </div>

                        <!-- 발송 비용 -->
                        <div class="bg-purple-50 rounded-lg p-6">
                            <div class="space-y-2">
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-600">수신자 수</span>
                                    <span id="costReceivers" class="font-medium">0명</span>
                                </div>
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-600">건당 요금</span>
                                    <span id="costPerMessage" class="font-medium">45P</span>
                                </div>
                                <div class="border-t border-purple-200 pt-2 mt-2">
                                    <div class="flex justify-between">
                                        <span class="font-semibold text-gray-900">총 비용</span>
                                        <span id="totalCost" class="font-bold text-purple-600 text-lg">0P</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 발송 버튼 -->
                        <button onclick="sendSMS()" 
                            class="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 rounded-lg hover:from-purple-700 hover:to-purple-800 transition font-semibold text-lg shadow-lg">
                            📤 문자 발송하기
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <script>
            let currentUserId = null;
            let receivers = [];
            let sendersList = [];
            let templates = [];

            // ══════════════════════════════════════════════════════════════
            // 광고 / 정보성 토글 처리
            // ══════════════════════════════════════════════════════════════
            function isAdMode() {
                return document.getElementById('typeAd').checked;
            }

            function updateAdUI() {
                const isAd = isAdMode();
                const adNotice  = document.getElementById('adNoticeBox');
                const adPrefix  = document.getElementById('adPrefixPreview');
                const adSuffix  = document.getElementById('adSuffixPreview');
                const infoLabel = document.getElementById('typeInfoLabel');
                const adLabel   = document.getElementById('typeAdLabel');
                const msgBox    = document.getElementById('message');

                if (isAd) {
                    adNotice.classList.remove('hidden');
                    adPrefix.classList.remove('hidden');
                    adSuffix.classList.remove('hidden');
                    adLabel.classList.add('border-orange-500','bg-orange-50');
                    adLabel.classList.remove('border-gray-200','bg-gray-50');
                    infoLabel.classList.remove('border-purple-500','bg-purple-50');
                    infoLabel.classList.add('border-gray-200','bg-gray-50');
                    // textarea의 border를 prefix/suffix 박스와 이어 붙이기
                    msgBox.classList.add('rounded-none');
                    msgBox.classList.remove('rounded-lg');
                } else {
                    adNotice.classList.add('hidden');
                    adPrefix.classList.add('hidden');
                    adSuffix.classList.add('hidden');
                    adLabel.classList.remove('border-orange-500','bg-orange-50');
                    adLabel.classList.add('border-gray-200','bg-gray-50');
                    infoLabel.classList.add('border-purple-500','bg-purple-50');
                    infoLabel.classList.remove('border-gray-200','bg-gray-50');
                    msgBox.classList.remove('rounded-none');
                    msgBox.classList.add('rounded-lg');
                }
                updateByteCount();
            }

            // 라디오 버튼 이벤트
            document.getElementById('typeInfo').addEventListener('change', updateAdUI);
            document.getElementById('typeAd').addEventListener('change', updateAdUI);

            // 사용자 인증
            async function checkAuth() {
                const user = localStorage.getItem('user');
                if (!user) {
                    alert('로그인이 필요합니다.');
                    window.location.href = '/login';
                    return null;
                }
                const userData = JSON.parse(user);
                currentUserId = userData.id;
                return userData;
            }

            // 발신번호 목록 로드
            async function loadSenders() {
                try {
                    const response = await fetch('/api/sms/senders?userId=' + currentUserId);
                    const data = await response.json();

                    const select = document.getElementById('senderId');
                    
                    if (data.success && data.senders.length > 0) {
                        sendersList = data.senders;
                        select.innerHTML = '<option value="">발신번호를 선택하세요</option>' + 
                            data.senders.map(s => '<option value="' + s.id + '">' + formatPhoneNumber(s.phone_number) + '</option>').join('');
                    } else {
                        select.innerHTML = '<option value="">등록된 발신번호가 없습니다 (관리자 승인 필요)</option>';
                        // BYGENCY 임베드: 발신번호 미등록이어도 도구 화면은 그대로 표시(리다이렉트 제거)
                    }
                } catch (err) {
                    console.error('Failed to load senders:', err);
                }
            }

            // 전화번호 포맷팅
            function formatPhoneNumber(phone) {
                phone = phone.replace(/[^0-9]/g, '');
                if (phone.length === 10) {
                    return phone.slice(0,3)+'-'+phone.slice(3,6)+'-'+phone.slice(6,10);
                } else if (phone.length === 11) {
                    return phone.slice(0,3)+'-'+phone.slice(3,7)+'-'+phone.slice(7,11);
                }
                return phone;
            }

            // 바이트 수 계산
            function calculateBytes(str) {
                return new Blob([str]).size;
            }

            // 메시지 입력 이벤트
            document.getElementById('message').addEventListener('input', (e) => {
                const message = e.target.value;
                const byteSize = calculateBytes(message);
                const charCount = message.length;
                
                document.getElementById('byteCount').textContent = byteSize;
                
                const messageTypeEl = document.getElementById('messageType');
                const costPerMessageEl = document.getElementById('costPerMessage');
                
                if (charCount > 100) {
                    messageTypeEl.textContent = 'LMS (장문 · ' + charCount + '자)';
                    messageTypeEl.className = 'text-sm font-medium px-3 py-1 bg-orange-100 text-orange-800 rounded-full';
                    costPerMessageEl.textContent = '90P';
                } else {
                    messageTypeEl.textContent = 'SMS (단문 · ' + charCount + '자)';
                    messageTypeEl.className = 'text-sm font-medium px-3 py-1 bg-blue-100 text-blue-800 rounded-full';
                    costPerMessageEl.textContent = '45P';
                }
                
                updateCost();
            });

            // 예약 발송 체크박스
            document.getElementById('reserveEnabled').addEventListener('change', (e) => {
                document.getElementById('reserveTime').disabled = !e.target.checked;
            });

            // ══════════════════════════════════════════════════════════════
            // 탭 전환 (단건 / 일괄)
            // ══════════════════════════════════════════════════════════════
            function switchAddTab(tab) {
                const isSingle = tab === 'single';
                document.getElementById('panelSingle').classList.toggle('hidden', !isSingle);
                document.getElementById('panelBulk').classList.toggle('hidden', isSingle);
                document.getElementById('tabSingle').className = 'flex-1 py-2 transition ' + (isSingle ? 'bg-purple-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50');
                document.getElementById('tabBulk').className = 'flex-1 py-2 transition ' + (!isSingle ? 'bg-purple-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50');
            }

            // 010으로 시작하는 11자리 번호 추출 (하이픈·점·공백·괄호 포함 형식 모두 처리)
            // * 빌드 시 \d 이스케이프 소실 방지: RegExp 생성자 + 문자 클래스 사용
            function extractPhoneNumbers(text) {
                if (!text) return [];
                // 1) 숫자 10자리(엑셀 숫자 셀 저장)이고 10으로 시작 -> 0 보충
                let s = String(text).trim();
                var reDigit10 = new RegExp('^[0-9]{10}$');
                if (reDigit10.test(s) && s.startsWith('10')) s = '0' + s;
                // 2) 모든 010-xxxx-xxxx 패턴 추출 (구분자: - . 공백 () 없음 모두)
                // [0-9] 사용으로 빌드 시 \d 이스케이프 소실 방지
                var rePhone = new RegExp('0[ ]*1[ ]*0[ ]*[-. ()]*[0-9]{3,4}[-. ()]*[0-9]{4}', 'g');
                var matched = s.match(rePhone) || [];
                // 숫자만 추출 후 11자리인 것만 유효
                var reNonDigit = new RegExp('[^0-9]', 'g');
                return [...new Set(matched.map(function(p){ return p.replace(reNonDigit, ''); }).filter(function(p){ return p.length === 11; }))];
            }

            // 수신자 추가
            function addReceiver() {
                const isBulk = !document.getElementById('panelBulk').classList.contains('hidden');

                if (isBulk) {
                    // -- 일괄 붙여넣기 모드 --
                    const raw = document.getElementById('bulkPhoneText').value;
                    const phones = extractPhoneNumbers(raw);
                    if (!phones.length) {
                        alert('010으로 시작하는 11자리 번호를 찾을 수 없습니다.');
                        return;
                    }
                    let added = 0, dup = 0;
                    phones.forEach(phone => {
                        if (receivers.some(r => r.phone === phone)) { dup++; return; }
                        receivers.push({ name: formatPhoneNumber(phone), phone });
                        added++;
                    });
                    document.getElementById('bulkPhoneText').value = '';
                    renderReceivers();
                    const msg = added + '명 추가됨' + (dup ? ' (중복 ' + dup + '명 제외)' : '');
                    document.getElementById('smsUploadCount').textContent = msg;
                    document.getElementById('smsUploadInfo').classList.remove('hidden');
                } else {
                    // -- 단건 입력 모드 --
                    const rawName = document.getElementById('receiverName').value.trim();
                    const rawPhone = document.getElementById('receiverPhone').value.trim();
                    const phone = rawPhone.replace(/[^0-9]/g, '');

                    if (!rawPhone) {
                        alert('전화번호를 입력해주세요.');
                        return;
                    }
                    if (!phone.startsWith('010') || phone.length !== 11) {
                        alert('010으로 시작하는 11자리 번호를 입력해주세요.');
                        return;
                    }
                    if (receivers.some(r => r.phone === phone)) {
                        alert('이미 추가된 번호입니다.');
                        return;
                    }

                    const name = rawName || formatPhoneNumber(phone);
                    receivers.push({ name, phone });
                    document.getElementById('receiverName').value = '';
                    document.getElementById('receiverPhone').value = '';
                    renderReceivers();
                }
            }

            // 수신자 목록 렌더링
            function renderReceivers(filteredList = null) {
                const container = document.getElementById('receiversContainer');
                const list = filteredList !== null ? filteredList : receivers;
                
                if (list.length === 0) {
                    if (filteredList !== null && receivers.length > 0) {
                        container.innerHTML = '<p class="text-sm text-gray-400 text-center py-4">검색 결과가 없습니다</p>';
                    } else {
                        container.innerHTML = '<p class="text-sm text-gray-400 text-center py-4">수신자를 추가해주세요</p>';
                    }
                } else {
                    container.innerHTML = list.map((r, i) => {
                        // 실제 인덱스 찾기 (검색 시)
                        const actualIndex = filteredList !== null ? receivers.indexOf(r) : i;
                        return '<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">' +
                            '<div>' +
                                '<div class="font-medium text-sm">' + r.name + '</div>' +
                                '<div class="text-xs text-gray-500">' + formatPhoneNumber(r.phone) + '</div>' +
                            '</div>' +
                            '<button onclick="removeReceiver(' + actualIndex + ')" class="text-red-600 hover:text-red-700">' +
                                '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                                    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>' +
                                '</svg>' +
                            '</button>' +
                        '</div>';
                    }).join('');
                }
                
                document.getElementById('receiverCount').textContent = receivers.length + '명';
                updateCost();
            }

            // 수신자 검색 필터링
            function filterReceivers() {
                const searchTerm = document.getElementById('receiverSearch').value.toLowerCase().trim();
                
                if (!searchTerm) {
                    renderReceivers();
                    return;
                }
                
                const filtered = receivers.filter(r => {
                    const name = r.name.toLowerCase();
                    const phone = r.phone;
                    return name.includes(searchTerm) || phone.includes(searchTerm);
                });
                
                renderReceivers(filtered);
            }

            // 수신자 제거
            function removeReceiver(index) {
                receivers.splice(index, 1);
                renderReceivers();
            }

            // 전체 삭제
            function clearReceivers() {
                if (receivers.length === 0) return;
                if (confirm('모든 수신자를 삭제하시겠습니까?')) {
                    receivers = [];
                    renderReceivers();
                }
            }

            // 업로드된 엑셀 수신자 rows (per-row 치환 데이터 포함)
            let uploadedSmsRows = []; // [{name, phone, landing, parentPhone}]

            // -- 엑셀 열 선택 모달 상태 --
            let _excelParsedData = null; // { headers, colLetters, rows, totalCols, dataStart, sheet }

            // 엑셀 업로드 -> 파싱 후 열 선택 모달 표시
            async function uploadExcel(event) {
                const file = event.target.files[0];
                if (!file) return;
                event.target.value = '';

                try {
                    const data = await file.arrayBuffer();
                    const workbook = XLSX.read(data);
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const range = XLSX.utils.decode_range(firstSheet['!ref'] || 'A1');

                    // 헤더 행 자동 감지
                    // 첫 행 전체를 스캔: 하나라도 010 번호가 있으면 데이터 행, 없으면 헤더 행
                    const startRow = range.s.r;
                    const totalColsTemp = range.e.c + 1;
                    let firstRowHasPhone = false;
                    for (let c = 0; c < totalColsTemp; c++) {
                        const cell = firstSheet[XLSX.utils.encode_cell({ r: startRow, c })];
                        if (!cell) continue;
                        // cell.w: 서식 적용 문자열 우선 (010-XXXX-XXXX 형태 포함)
                        const raw = (cell.w !== undefined && cell.w !== null) ? String(cell.w).trim() : String(cell.v).trim();
                        // 숫자형 셀 앞 0 보충 후 확인 (빌드 시 \d 소실 방지: 문자 클래스 사용)
                        var reD10 = new RegExp('^[0-9]{10}$');
                        var normalized = (reD10.test(raw) && raw.startsWith('10')) ? '0' + raw : raw;
                        var rePhoneHdr = new RegExp('010[-. ()]*[0-9]{3,4}[-. ()]*[0-9]{4}');
                        if (rePhoneHdr.test(normalized)) {
                            firstRowHasPhone = true;
                            break;
                        }
                    }
                    const isHeaderRow = !firstRowHasPhone;
                    const dataStart = isHeaderRow ? startRow + 1 : startRow;

                    const totalCols = range.e.c + 1;

                    // 열 헤더명 + 열 영문 레이블(A, B, C ...) 수집
                    const colLetters = [];
                    const headers = [];
                    for (let c = 0; c < totalCols; c++) {
                        colLetters.push(XLSX.utils.encode_col(c)); // 'A','B','C',...
                        if (isHeaderRow) {
                            const hCell = firstSheet[XLSX.utils.encode_cell({ r: startRow, c })];
                            headers.push(hCell ? String(hCell.v).trim() : colLetters[c]);
                        } else {
                            headers.push(colLetters[c]);
                        }
                    }

                    // 각 열별로 010 번호가 있는지 감지 + 샘플 데이터 수집
                    // 엑셀 숫자 셀 헬퍼: 숫자 타입 셀이 10자리이고 10으로 시작하면 앞에 0 보충
                    function readCellStr(cell) {
                        if (!cell) return '';
                        let raw;
                        // w: 서식 적용된 문자열(010-XXXX-XXXX 형태), v: 원시 숫자값
                        // 서식 문자열(w)이 있으면 우선 사용
                        if (cell.w !== undefined && cell.w !== null) {
                            raw = String(cell.w).trim();
                        } else {
                            raw = String(cell.v).trim();
                        }
                        // 순수 10자리 숫자이고 10으로 시작하면 0 보충 (엑셀 숫자 저장 때문)
                        // 빌드 시 \d 이스케이프 소실 방지: RegExp 생성자 사용
                        var reD10cell = new RegExp('^[0-9]{10}$');
                        if (reD10cell.test(raw) && raw.startsWith('10')) {
                            return '0' + raw;
                        }
                        return raw;
                    }

                    const colPhoneCount = new Array(totalCols).fill(0);
                    const colSamples = Array.from({ length: totalCols }, () => []);
                    const SAMPLE_MAX = 3;

                    for (let r = dataStart; r <= range.e.r; r++) {
                        for (let c = 0; c < totalCols; c++) {
                            const cell = firstSheet[XLSX.utils.encode_cell({ r, c })];
                            if (!cell) continue;
                            const phones = extractPhoneNumbers(readCellStr(cell));
                            if (phones.length > 0) {
                                colPhoneCount[c] += phones.length;
                                if (colSamples[c].length < SAMPLE_MAX) colSamples[c].push(formatPhoneNumber(phones[0]));
                            }
                        }
                    }

                    // 행 데이터 저장
                    const rows = [];
                    for (let r = dataStart; r <= range.e.r; r++) {
                        const row = [];
                        for (let c = 0; c < totalCols; c++) {
                            const cell = firstSheet[XLSX.utils.encode_cell({ r, c })];
                            row.push(readCellStr(cell));
                        }
                        rows.push(row);
                    }

                    _excelParsedData = { headers, colLetters, rows, totalCols, colPhoneCount, colSamples, fileName: file.name };

                    // 열 선택 모달 열기
                    openExcelColModal();

                } catch (err) {
                    console.error('Excel upload error:', err);
                    alert('엑셀 파일 업로드 중 오류가 발생했습니다.');
                }
            }

            // 열 선택 모달 열기
            function openExcelColModal() {
                if (!_excelParsedData) return;
                const { headers, colLetters, totalCols, colPhoneCount, colSamples, fileName } = _excelParsedData;

                // 파일명 표시
                document.getElementById('excelColModalFileName').textContent = fileName;

                const listEl = document.getElementById('excelColList');
                listEl.innerHTML = '';

                for (let c = 0; c < totalCols; c++) {
                    const phoneCount = colPhoneCount[c];
                    const samples = colSamples[c];
                    const hasPhone = phoneCount > 0;

                    const item = document.createElement('label');
                    item.className = 'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ' +
                        (hasPhone
                            ? 'border-purple-200 bg-purple-50 hover:bg-purple-100'
                            : 'border-gray-200 bg-gray-50 hover:bg-gray-100');

                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.value = String(c);
                    checkbox.className = 'mt-0.5 w-4 h-4 text-purple-600 rounded';
                    if (hasPhone) checkbox.checked = true; // 010 번호 있는 열은 기본 선택
                    checkbox.addEventListener('change', updateExcelColModalBtn);

                    const info = document.createElement('div');
                    info.className = 'flex-1 min-w-0';

                    const title = document.createElement('div');
                    title.className = 'flex items-center gap-2 flex-wrap';
                    const colBadge = document.createElement('span');
                    colBadge.className = 'text-xs font-bold text-white rounded px-1.5 py-0.5 ' + (hasPhone ? 'bg-purple-600' : 'bg-gray-400');
                    colBadge.textContent = colLetters[c] + '열';
                    const colName = document.createElement('span');
                    colName.className = 'text-sm font-semibold text-gray-800 truncate';
                    colName.textContent = headers[c] !== colLetters[c] ? headers[c] : '';
                    title.appendChild(colBadge);
                    if (colName.textContent) title.appendChild(colName);

                    if (hasPhone) {
                        const phoneBadge = document.createElement('span');
                        phoneBadge.className = 'text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-medium';
                        phoneBadge.innerHTML = '<i class="fas fa-mobile-alt mr-1"></i>' + phoneCount + '개 번호';
                        title.appendChild(phoneBadge);
                    }

                    const sub = document.createElement('div');
                    sub.className = 'text-xs text-gray-500 mt-1 truncate';
                    if (samples.length > 0) {
                        sub.textContent = '예시: ' + samples.join(', ') + (phoneCount > samples.length ? ' ...' : '');
                    } else {
                        sub.textContent = '전화번호 없음';
                        sub.className += ' italic';
                    }

                    info.appendChild(title);
                    info.appendChild(sub);
                    item.appendChild(checkbox);
                    item.appendChild(info);
                    listEl.appendChild(item);
                }

                updateExcelColModalBtn();
                document.getElementById('excelColModal').classList.remove('hidden');
            }

            function updateExcelColModalBtn() {
                const checked = document.querySelectorAll('#excelColList input[type=checkbox]:checked').length;
                const btn = document.getElementById('btnExcelColConfirm');
                btn.disabled = checked === 0;
                btn.textContent = checked > 0 ? checked + '개 열 번호를 수신자로 추가' : '열을 선택해 주세요';
            }

            function closeExcelColModal() {
                document.getElementById('excelColModal').classList.add('hidden');
                _excelParsedData = null;
            }

            // 선택된 열의 번호를 수신자로 추가
            function confirmExcelColSelection() {
                if (!_excelParsedData) return;
                const { rows, totalCols, headers, colLetters } = _excelParsedData;

                const checkedBoxes = document.querySelectorAll('#excelColList input[type=checkbox]:checked');
                const selectedCols = Array.from(checkedBoxes).map(cb => parseInt(cb.value));

                if (selectedCols.length === 0) { alert('열을 하나 이상 선택해 주세요.'); return; }

                let addedCount = 0;
                let duplicateCount = 0;
                let noPhoneCount = 0;
                const tempReceivers = [];
                const tempRows = [];

                // 이름 열 후보: 첫 번째 비선택 열(텍스트 주로 있는 열)을 이름으로 사용
                // 간단 휴리스틱: 전화번호 열이 아닌 0번 열을 이름 열로
                const nameColIdx = selectedCols.includes(0) ? -1 : 0;

                rows.forEach(row => {
                    const rowName = nameColIdx >= 0 && row[nameColIdx] ? row[nameColIdx] : '';

                    selectedCols.forEach((colIdx, si) => {
                        const cellVal = row[colIdx] || '';
                        const phones = extractPhoneNumbers(cellVal);
                        if (phones.length === 0) { noPhoneCount++; return; }

                        phones.forEach((phone, pi) => {
                            const existsInCurrent = receivers.some(r => r.phone === phone);
                            const existsInTemp = tempReceivers.some(r => r.phone === phone);
                            if (!existsInCurrent && !existsInTemp) {
                                const colLabel = headers[colIdx] !== colLetters[colIdx] ? headers[colIdx] : (colLetters[colIdx] + '열');
                                const displayName = rowName
                                    ? (si > 0 || pi > 0 ? rowName + '(' + colLabel + ')' : rowName)
                                    : formatPhoneNumber(phone);
                                tempReceivers.push({ name: displayName, phone });
                                tempRows.push({ name: displayName, phone, landing: '', parentPhone: phone });
                                addedCount++;
                            } else {
                                duplicateCount++;
                            }
                        });
                    });
                });

                receivers.push(...tempReceivers);
                uploadedSmsRows.push(...tempRows);

                closeExcelColModal();

                if (addedCount === 0) {
                    alert('선택한 열에서 010 번호를 찾을 수 없습니다.\\n다른 열을 선택해 보세요.');
                } else {
                    let infoMsg = addedCount + '명 수신자 추가됨';
                    if (duplicateCount > 0) infoMsg += ' / 중복 ' + duplicateCount + '개 제외';
                    document.getElementById('smsUploadCount').textContent = infoMsg;
                    document.getElementById('smsUploadInfo').classList.remove('hidden');
                }

                renderReceivers();
                updateCost();
            }

            // 학생 명단 엑셀 다운로드 (학생 이름 / 학생 ID / 학부모 연락처 / 랜딩페이지 URL)
            async function downloadStudentSmsExcel() {
                const btn = document.getElementById('btnSmsDownloadExcel');
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-1"></i>다운로드 중...';
                try {
                    const url = '/api/students/export-with-landing?userId=' + encodeURIComponent(currentUserId);
                    const res = await fetch(url);
                    if (!res.ok) { alert('다운로드 실패: ' + res.statusText); return; }
                    const blob = await res.blob();
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = 'students_' + new Date().toISOString().split('T')[0] + '.csv';
                    document.body.appendChild(a); a.click(); a.remove();
                } catch (e) {
                    alert('다운로드 오류: ' + e.message);
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-file-excel text-green-600"></i> 학생 명단 엑셀 다운로드';
                }
            }

            // 제목 글자수 카운터
            function updateSubjectCount() {
                const val = document.getElementById('smsSubject').value || '';
                document.getElementById('subjectByteCount').textContent = val.length + ' / 40자';
            }

            // 치환 변수 삽입 - insertVariable로 통합됨 (하위 호환 유지)
            function insertSmsVar(varType) {
                if (varType === '학생이름') insertVariable('#{이름}');
                else if (varType === '랜딩페이지URL') insertVariable('#{랜딩페이지URL}');
                else if (varType === '학부모연락처') insertVariable('#{학부모연락처}');
            }

            // 비용 계산 (광고 모드면 prefix/suffix 길이 포함)
            function updateCost() {
                let msg = document.getElementById('message').value;
                if (isAdMode()) {
                    msg = '(광고)\\n' + msg + '\\n\\n무료수신거부 080-500-4233';
                }
                const charCount = msg.length;
                const costPerMessage = charCount > 100 ? 90 : 45;
                const totalCost = costPerMessage * receivers.length;
                
                document.getElementById('costReceivers').textContent = receivers.length + '명';
                document.getElementById('costPerMessage').textContent = costPerMessage + 'P';
                document.getElementById('totalCost').textContent = totalCost + 'P';
            }

            // 광고 prefix/suffix를 붙여 최종 메시지를 반환
            function buildFinalMessage(rawMsg) {
                if (isAdMode()) {
                    return '(광고)\\n' + rawMsg + '\\n\\n무료수신거부 080-500-4233';
                }
                return rawMsg;
            }

            // SMS 발송 (엑셀 업로드 시 per-row 랜딩페이지 URL 치환 포함)
            async function sendSMS() {
                const senderId = document.getElementById('senderId').value;
                const messageTemplate = document.getElementById('message').value.trim();
                const reserveEnabled = document.getElementById('reserveEnabled').checked;
                const reserveTime = document.getElementById('reserveTime').value;

                if (!senderId) {
                    alert('발신번호를 선택해주세요.');
                    return;
                }

                if (!messageTemplate) {
                    alert('메시지를 입력해주세요.');
                    return;
                }

                if (receivers.length === 0) {
                    alert('수신자를 추가해주세요.');
                    return;
                }

                if (reserveEnabled && !reserveTime) {
                    alert('예약 발송 시간을 선택해주세요.');
                    return;
                }

                if (!confirm(receivers.length + '명에게 문자를 발송하시겠습니까?')) {
                    return;
                }

                try {
                    // 엑셀 업로드 수신자가 있으면 per-row 치환, 없으면 단일 메시지
                    let receiversToSend = receivers;
                    let messageToSend = messageTemplate;

                    if (uploadedSmsRows.length > 0) {
                        // per-row 메시지 치환: 각 행마다 #{이름} #{랜딩페이지URL} #{학부모연락처} 치환
                        receiversToSend = uploadedSmsRows.map(row => {
                            let msg = messageTemplate;
                            msg = msg.replace(/#\{이름\}/g, row.name || '')
                                     .replace(/#\{학생이름\}/g, row.name || '')
                                     .replace(/#\{랜딩페이지URL\}/g, row.landing || '')
                                     .replace(/#\{랜딩URL\}/g, row.landing || '')
                                     .replace(/#\{학부모연락처\}/g, row.parentPhone || row.phone || '');
                            // 광고 모드면 각 row 메시지에도 prefix/suffix 삽입
                            msg = buildFinalMessage(msg);
                            return { name: row.name, phone: row.phone, message: msg };
                        });
                        // 수신자 중 연락처가 있는 것만 필터
                        receiversToSend = receiversToSend.filter(r => r.phone && r.phone.length >= 9);
                        if (receiversToSend.length === 0) {
                            alert('발송할 수 있는 학부모 연락처가 없습니다.');
                            return;
                        }
                    } else {
                        // 단일 메시지 발송 시에도 광고 모드면 prefix/suffix 적용
                        messageToSend = buildFinalMessage(messageToSend);
                    }

                    const subjectVal = (document.getElementById('smsSubject').value || '').trim();
                    const payload = {
                        userId: currentUserId,
                        senderId: parseInt(senderId),
                        receivers: receiversToSend,
                        message: messageToSend,
                        subject: subjectVal || undefined
                    };

                    if (reserveEnabled && reserveTime) {
                        payload.reserveTime = reserveTime;
                    }

                    const response = await fetch('/api/sms/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    const data = await response.json();

                    if (data.success) {
                        const remainPts = data.remainingPoints || data.remainingBalance;
                        const remainStr = (typeof remainPts === 'number') ? remainPts + 'P' : String(remainPts || '-');
                        alert('✅ 문자 발송이 완료되었습니다!\\n\\n발송 건수: ' + data.sentCount + '건\\n차감 포인트: ' + data.totalCost + 'P\\n남은 포인트: ' + remainStr);
                        
                        // 초기화
                        document.getElementById('message').value = '';
                        document.getElementById('smsSubject').value = '';
                        updateSubjectCount();
                        receivers = [];
                        uploadedSmsRows = [];
                        renderReceivers();
                        document.getElementById('smsUploadInfo').classList.add('hidden');
                        
                        // 발송 내역으로 이동
                        if (confirm('발송 내역을 확인하시겠습니까?')) {
                            window.location.href = '/sms/logs';
                        }
                    } else {
                        alert('❌ ' + data.error);
                    }
                } catch (err) {
                    console.error('Send SMS error:', err);
                    alert('문자 발송 중 오류가 발생했습니다.');
                }
            }

            // 바이트 카운트 갱신 (광고 모드면 prefix/suffix 포함한 실제 전송 길이 표시)
            function updateByteCount() {
                const rawMsg = document.getElementById('message').value;
                const finalMsg = buildFinalMessage(rawMsg);
                const byteSize = new Blob([finalMsg]).size;
                const charCount = finalMsg.length;
                document.getElementById('byteCount').textContent = byteSize;
                const messageTypeEl = document.getElementById('messageType');
                const costPerMessageEl = document.getElementById('costPerMessage');
                if (charCount > 100) {
                    messageTypeEl.textContent = 'LMS (장문 · ' + charCount + '자)';
                    messageTypeEl.className = 'text-sm font-medium px-3 py-1 bg-orange-100 text-orange-800 rounded-full';
                    if (costPerMessageEl) costPerMessageEl.textContent = '90P';
                } else {
                    messageTypeEl.textContent = 'SMS (단문 · ' + charCount + '자)';
                    messageTypeEl.className = 'text-sm font-medium px-3 py-1 bg-blue-100 text-blue-800 rounded-full';
                    if (costPerMessageEl) costPerMessageEl.textContent = '45P';
                }
                updateCost();
            }

            // === 템플릿 & 폴더 관리 함수 ===
            
            // 치환 변수 삽입
            function insertVariable(variable) {
                const messageBox = document.getElementById('message');
                const start = messageBox.selectionStart;
                const end = messageBox.selectionEnd;
                const text = messageBox.value;
                messageBox.value = text.substring(0, start) + variable + text.substring(end);
                messageBox.focus();
                messageBox.setSelectionRange(start + variable.length, start + variable.length);
                updateByteCount();
            }

            // 템플릿 목록 로드
            async function loadTemplates() {
                try {
                    const url = '/api/sms/templates?userId=' + currentUserId;
                    const response = await fetch(url);
                    const data = await response.json();
                    
                    if (data.success) {
                        templates = data.templates;
                        renderTemplates();
                    }
                } catch (err) {
                    console.error('Failed to load templates:', err);
                }
            }

            // 템플릿 목록 렌더링
            function renderTemplates() {
                const container = document.getElementById('templateList');
                
                if (templates.length === 0) {
                    container.innerHTML = '<p class="text-xs text-gray-400 text-center py-3">템플릿이 없습니다</p>';
                    return;
                }
                
                container.innerHTML = templates.map(function(template) {
                    return '<div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition">' +
                        '<button onclick="loadTemplateMessage(' + template.id + ')" class="flex-1 text-left text-xs font-medium text-gray-700 truncate">' +
                            template.title +
                        '</button>' +
                        '<button onclick="deleteTemplate(' + template.id + ')" class="ml-2 text-red-500 hover:text-red-700">' +
                            '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                                '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>' +
                            '</svg>' +
                        '</button>' +
                    '</div>';
                }).join('');
            }

            // 템플릿 메시지 불러오기
            function loadTemplateMessage(templateId) {
                const template = templates.find(t => t.id === templateId);
                if (template) {
                    // 메시지 불러오기
                    document.getElementById('message').value = template.message;
                    updateByteCount();
                    
                    // 수신자 불러오기
                    if (template.receivers) {
                        try {
                            const savedReceivers = JSON.parse(template.receivers);
                            receivers = savedReceivers;
                            renderReceivers();
                            updateCost();
                            alert('✅ 템플릿 불러오기 완료!\\n메시지 + 수신자 ' + receivers.length + '명');
                        } catch (err) {
                            console.error('Failed to parse receivers:', err);
                        }
                    }
                }
            }

            // 템플릿 저장
            async function saveTemplate() {
                const message = document.getElementById('message').value.trim();
                if (!message) {
                    alert('메시지를 입력해주세요.');
                    return;
                }
                
                const title = prompt('템플릿 제목을 입력하세요:', message.substring(0, 20) + '...');
                if (!title) return;
                
                try {
                    const response = await fetch('/api/sms/templates', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: currentUserId,
                            title,
                            message,
                            receivers: JSON.stringify(receivers) // 수신자 정보도 저장
                        })
                    });
                    
                    const data = await response.json();
                    if (data.success) {
                        alert('✅ 템플릿이 저장되었습니다!\\n수신자: ' + receivers.length + '명');
                        await loadTemplates();
                    } else {
                        alert('❌ ' + data.error);
                    }
                } catch (err) {
                    console.error('Save template error:', err);
                    alert('템플릿 저장 중 오류가 발생했습니다.');
                }
            }

            // 템플릿 삭제
            async function deleteTemplate(templateId) {
                if (!confirm('이 템플릿을 삭제하시겠습니까?')) return;
                
                try {
                    const response = await fetch('/api/sms/templates/' + templateId + '?userId=' + currentUserId, {
                        method: 'DELETE'
                    });
                    
                    const data = await response.json();
                    if (data.success) {
                        alert('✅ 템플릿이 삭제되었습니다!');
                        await loadTemplates();
                    } else {
                        alert('❌ ' + data.error);
                    }
                } catch (err) {
                    console.error('Delete template error:', err);
                    alert('템플릿 삭제 중 오류가 발생했습니다.');
                }
            }

            // 페이지 로드
            (async () => {
                await checkAuth();
                if (currentUserId) {
                    await loadSenders();
                    await loadTemplates();
                }
            })();

            // ══════════════════════════════════════════════════════════════
            // 학생 목록 모달
            // ══════════════════════════════════════════════════════════════
            let allStudents = [];  // 전체 학생 목록 캐시
            let allClasses = [];   // 전체 반 목록 캐시
            let pickerSelected = new Set(); // 모달에서 선택된 학생 ID set

            async function openStudentPickerModal() {
                document.getElementById('studentPickerModal').classList.remove('hidden');
                document.getElementById('studentPickerList').innerHTML =
                    '<div class="text-center py-8 text-gray-400"><i class="fas fa-spinner fa-spin text-2xl"></i><p class="mt-2 text-sm">학생 목록 불러오는 중...</p></div>';
                pickerSelected = new Set();
                updatePickerAddBtn();
                // 반 필터 초기화
                const classFilter = document.getElementById('pickerClassFilter');
                if (classFilter) classFilter.value = '';
                // 현재 선택된 발송 대상 표시
                const sendToParent = document.getElementById('targetParent').checked;
                const attachLanding = document.getElementById('attachLanding').checked;
                const infoEl = document.getElementById('pickerTargetInfo');
                let infoText = sendToParent ? '👨‍👩‍👧 학부모 번호로 발송' : '🎓 학생 번호로 발송';
                if (attachLanding) infoText += ' · 🔗 랜딩페이지 URL 자동 첨부';
                infoEl.textContent = infoText;

                try {
                    const userStr = localStorage.getItem('user');
                    if (!userStr) { alert('로그인이 필요합니다.'); return; }
                    const user = JSON.parse(userStr);

                    // 학생 목록만 로드 (반 목록은 학생 데이터에서 추출)
                    const res = await fetch('/api/students?userId=' + user.id);
                    const data = await res.json();
                    if (!data.success) throw new Error(data.error || '조회 실패');
                    allStudents = data.students || [];

                    // 학생 데이터에서 반 목록 추출 (class_id + class_name 기반)
                    const classMap = {};
                    allStudents.forEach(s => {
                        if (s.class_id && s.class_name) {
                            const key = String(s.class_id);
                            if (!classMap[key]) {
                                classMap[key] = { id: s.class_id, name: s.class_name, count: 0 };
                            }
                            classMap[key].count++;
                        }
                    });
                    allClasses = Object.values(classMap).sort((a, b) => a.name.localeCompare(b.name, 'ko'));

                    // 드롭다운 채우기
                    const sel = document.getElementById('pickerClassFilter');
                    if (sel) {
                        sel.innerHTML = '<option value="">전체 반</option>';
                        allClasses.forEach(cls => {
                            const opt = document.createElement('option');
                            opt.value = String(cls.id);
                            opt.textContent = cls.name + ' (' + cls.count + '명)';
                            sel.appendChild(opt);
                        });
                        sel.disabled = allClasses.length === 0;
                        if (allClasses.length === 0) {
                            sel.title = '배정된 반이 없습니다';
                        }
                    }

                    renderStudentPickerList(allStudents);
                } catch (e) {
                    document.getElementById('studentPickerList').innerHTML =
                        '<div class="text-center py-8 text-red-400"><i class="fas fa-exclamation-circle text-2xl"></i><p class="mt-2 text-sm">학생 목록을 불러올 수 없습니다.<br>' + e.message + '</p></div>';
                }
            }

            function renderStudentPickerList(list) {
                const container = document.getElementById('studentPickerList');
                if (!list.length) {
                    container.innerHTML = '<p class="text-center py-8 text-gray-400 text-sm">등록된 학생이 없습니다.</p>';
                    return;
                }
                // 학생당 학부모/학생 번호 분리 표시
                container.innerHTML = list.map(s => {
                    const sid = String(s.id);
                    const studentPhone = s.phone ? s.phone.replace(/[^0-9]/g,'') : '';
                    const parentPhone  = s.parent_phone ? s.parent_phone.replace(/[^0-9]/g,'') : '';
                    const hasStudentPhone = studentPhone.startsWith('010') && studentPhone.length === 11;
                    const hasParentPhone  = parentPhone.startsWith('010') && parentPhone.length === 11;
                    const checked = pickerSelected.has(sid) ? 'checked' : '';
                    const phoneTags =
                        (hasParentPhone
                            ? '<span class="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">👨‍👩‍👧 학부모 ' + formatPhoneNumber(parentPhone) + '</span>'
                            : '<span class="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-400">학부모 연락처 없음</span>') +
                        ' ' +
                        (hasStudentPhone
                            ? '<span class="text-xs px-1.5 py-0.5 rounded bg-green-50 text-green-600 border border-green-200">🎓 학생 ' + formatPhoneNumber(studentPhone) + '</span>'
                            : '<span class="text-xs px-1.5 py-0.5 rounded bg-gray-50 text-gray-400">학생 연락처 없음</span>');
                    return '<label class="flex items-start gap-3 p-3 rounded-lg hover:bg-purple-50 cursor-pointer border border-gray-100 mb-1">' +
                        '<input type="checkbox" value="' + sid + '" data-name="' + (s.name||'') + '" data-studentphone="' + studentPhone + '" data-parentphone="' + parentPhone + '" ' + checked +
                        ' onchange="togglePickerStudent(this)" class="w-4 h-4 text-purple-600 rounded mt-0.5">' +
                        '<div class="flex-1 min-w-0">' +
                            '<div class="text-sm font-medium text-gray-800">' + (s.name || '(이름없음)') + (s.grade ? ' <span class="text-xs text-gray-400">' + s.grade + '</span>' : '') + '</div>' +
                            '<div class="flex flex-wrap gap-1 mt-1">' + phoneTags + '</div>' +
                        '</div>' +
                    '</label>';
                }).join('');
            }

            function filterStudentPicker() {
                const q = document.getElementById('studentPickerSearch').value.trim().toLowerCase();
                const classId = document.getElementById('pickerClassFilter') ? document.getElementById('pickerClassFilter').value : '';
                let filtered = allStudents;
                // 반 필터
                if (classId) {
                    filtered = filtered.filter(s => String(s.class_id) === classId);
                }
                // 이름/연락처 검색
                if (q) {
                    filtered = filtered.filter(s => (s.name||'').toLowerCase().includes(q) || (s.parent_phone||'').includes(q) || (s.phone||'').includes(q));
                }
                renderStudentPickerList(filtered);
            }

            function togglePickerStudent(cb) {
                if (cb.checked) pickerSelected.add(cb.value);
                else pickerSelected.delete(cb.value);
                updatePickerAddBtn();
            }

            function toggleSelectAllStudents(cb) {
                const checkboxes = document.querySelectorAll('#studentPickerList input[type=checkbox]');
                checkboxes.forEach(c => {
                    c.checked = cb.checked;
                    if (cb.checked) pickerSelected.add(c.value);
                    else pickerSelected.delete(c.value);
                });
                updatePickerAddBtn();
            }

            function updatePickerAddBtn() {
                const btn = document.getElementById('btnPickerAdd');
                const n = pickerSelected.size;
                btn.textContent = n > 0 ? '✅ ' + n + '명 수신자에 추가' : '선택 후 추가';
                btn.disabled = n === 0;
            }

            // 랜딩페이지 목록 캐시 (1회 조회 후 재사용)
            let _landingPageCache = null;

            // 랜딩페이지 첨부 토글
            function toggleLandingAttach() {
                const checked = document.getElementById('attachLanding').checked;
                const statusEl = document.getElementById('landingAttachStatus');
                if (checked) {
                    statusEl.classList.remove('hidden');
                    statusEl.textContent = '✅ 학생 추가 시 각 학생의 최근 랜딩페이지 URL이 #{랜딩페이지URL}에 자동 적용됩니다';
                    const msg = document.getElementById('message').value;
                    if (!msg.includes('#{랜딩페이지URL}')) {
                        statusEl.textContent += ' · 💡 메시지에 #{랜딩페이지URL} 변수를 추가하세요';
                    }
                    // 캐시 초기화 (새로 조회)
                    _landingPageCache = null;
                } else {
                    statusEl.classList.add('hidden');
                }
            }

            // 학생별 최근 랜딩페이지 URL 조회 (이름 포함 title 검색)
            async function fetchStudentLandingUrl(studentName) {
                try {
                    if (!_landingPageCache) {
                        const res = await fetch('/api/landing/my-pages', { credentials: 'include' });
                        if (!res.ok) return '';
                        const data = await res.json();
                        if (!data.success) return '';
                        _landingPageCache = data.pages || [];
                    }
                    const name = (studentName || '').trim();
                    if (!name) return '';
                    const matched = _landingPageCache.filter(p => (p.title || '').includes(name));
                    if (!matched.length) return '';
                    // created_at DESC 정렬 상태이므로 첫 번째가 최신
                    return 'https://wearesuperplace.com/landing/' + matched[0].slug;
                } catch (e) { return ''; }
            }

            async function confirmStudentPicker() {
                if (pickerSelected.size === 0) return;
                const checkboxes = Array.from(document.querySelectorAll('#studentPickerList input[type=checkbox]:checked'));
                const sendToParent = document.getElementById('targetParent').checked;
                const attachLanding = document.getElementById('attachLanding').checked;

                // 버튼 로딩
                const addBtn = document.getElementById('btnPickerAdd');
                addBtn.disabled = true;
                addBtn.textContent = attachLanding ? '랜딩페이지 조회 중...' : '추가 중...';

                let added = 0, skipped = 0;
                const tempReceivers = [];
                const tempRows = [];

                for (const cb of checkboxes) {
                    const name = cb.dataset.name || '';
                    const studentPhone = (cb.dataset.studentphone || '').replace(/[^0-9]/g, '');
                    const parentPhone  = (cb.dataset.parentphone  || '').replace(/[^0-9]/g, '');

                    // 발송 대상에 따라 번호 결정 (없으면 반대쪽 fallback)
                    let phone = '';
                    if (sendToParent) {
                        phone = (parentPhone.startsWith('010') && parentPhone.length === 11) ? parentPhone
                              : (studentPhone.startsWith('010') && studentPhone.length === 11) ? studentPhone : '';
                    } else {
                        phone = (studentPhone.startsWith('010') && studentPhone.length === 11) ? studentPhone
                              : (parentPhone.startsWith('010') && parentPhone.length === 11) ? parentPhone : '';
                    }

                    if (!phone) { skipped++; continue; }
                    if (receivers.some(r => r.phone === phone) || tempReceivers.some(r => r.phone === phone)) { skipped++; continue; }

                    // 랜딩페이지 URL 조회
                    let landingUrl = '';
                    if (attachLanding && name) {
                        landingUrl = await fetchStudentLandingUrl(name);
                    }

                    tempReceivers.push({ name, phone });
                    tempRows.push({
                        name,
                        phone,
                        landing: landingUrl,
                        parentPhone: (parentPhone.startsWith('010') && parentPhone.length === 11) ? parentPhone : phone
                    });
                    added++;
                }

                receivers.push(...tempReceivers);
                uploadedSmsRows.push(...tempRows);

                closeStudentPickerModal();
                renderReceivers();
                updateCost();

                if (added > 0) {
                    const targetLabel = sendToParent ? '학부모' : '학생';
                    let msg = added + '명(' + targetLabel + ') 수신자 추가됨' + (skipped > 0 ? ' (' + skipped + '명 연락처 없음/중복)' : '');
                    if (attachLanding) {
                        const withUrl = tempRows.filter(r => r.landing).length;
                        msg += ' · 랜딩페이지 URL ' + withUrl + '/' + added + '명 적용';
                    }
                    document.getElementById('smsUploadCount').textContent = msg;
                    document.getElementById('smsUploadInfo').classList.remove('hidden');
                } else {
                    alert('추가할 수신자가 없습니다. (연락처 없음 또는 이미 추가됨)');
                }
            }

            function closeStudentPickerModal() {
                document.getElementById('studentPickerModal').classList.add('hidden');
            }
        </script>

        <!-- ─── 엑셀 열 선택 모달 ─── -->
        <div id="excelColModal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick="if(event.target===this)closeExcelColModal()">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col" style="max-height:90vh;">
                <!-- 헤더 -->
                <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div>
                        <h2 class="text-base font-bold text-gray-900"><i class="fas fa-table text-purple-600 mr-2"></i>수신자로 추가할 열 선택</h2>
                        <p class="text-xs text-gray-400 mt-0.5" id="excelColModalFileName"></p>
                    </div>
                    <button onclick="closeExcelColModal()" class="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                </div>
                <!-- 안내 -->
                <div class="px-6 py-3 bg-purple-50 border-b border-purple-100">
                    <p class="text-xs text-purple-700"><i class="fas fa-info-circle mr-1"></i>010으로 시작하는 번호가 있는 열은 <span class="font-semibold">자동 선택</span>됩니다. 원하는 열을 선택 후 추가하세요.</p>
                </div>
                <!-- 열 목록 -->
                <div id="excelColList" class="flex-1 overflow-y-auto px-6 py-4 space-y-2"></div>
                <!-- 하단 버튼 -->
                <div class="px-6 py-4 border-t border-gray-100 flex gap-3">
                    <button onclick="closeExcelColModal()" class="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition">취소</button>
                    <button id="btnExcelColConfirm" onclick="confirmExcelColSelection()" disabled
                        class="flex-1 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                        열을 선택해 주세요
                    </button>
                </div>
            </div>
        </div>

        <!-- 학생 목록 선택 모달 -->
        <div id="studentPickerModal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col" style="max-height:90vh;">
                <!-- 헤더 -->
                <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 class="text-base font-bold text-gray-900"><i class="fas fa-users text-purple-600 mr-2"></i>학생 목록에서 수신자 추가</h2>
                    <button onclick="closeStudentPickerModal()" class="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                </div>
                <!-- 발송 대상 현황 -->
                <div id="pickerTargetInfo" class="px-6 py-2.5 bg-purple-50 border-b border-purple-100 text-xs text-purple-700 font-medium"></div>
                <!-- 반 선택 + 검색 + 전체선택 -->
                <div class="px-6 py-3 border-b border-gray-100 space-y-2">
                    <!-- 반 선택 드롭다운 -->
                    <div class="relative">
                        <select id="pickerClassFilter" onchange="filterStudentPicker()"
                            class="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-white appearance-none">
                            <option value="">전체 반</option>
                        </select>
                        <i class="fas fa-chalkboard-teacher absolute left-3 top-2.5 text-gray-400 text-xs pointer-events-none"></i>
                        <i class="fas fa-chevron-down absolute right-3 top-2.5 text-gray-400 text-xs pointer-events-none"></i>
                    </div>
                    <!-- 이름/연락처 검색 -->
                    <div class="relative">
                        <input id="studentPickerSearch" type="text" placeholder="이름 또는 연락처 검색..."
                            oninput="filterStudentPicker()"
                            class="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500">
                        <i class="fas fa-search absolute left-3 top-2.5 text-gray-400 text-xs"></i>
                    </div>
                    <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                        <input type="checkbox" onchange="toggleSelectAllStudents(this)" class="w-4 h-4 text-purple-600 rounded">
                        전체 선택
                    </label>
                </div>
                <!-- 학생 목록 -->
                <div id="studentPickerList" class="flex-1 overflow-y-auto px-6 py-3"></div>
                <!-- 하단 버튼 -->
                <div class="px-6 py-4 border-t border-gray-100 flex gap-3">
                    <button onclick="closeStudentPickerModal()" class="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition">취소</button>
                    <button id="btnPickerAdd" onclick="confirmStudentPicker()" disabled
                        class="flex-1 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                        선택 후 추가
                    </button>
                </div>
            </div>
        </div>
    </body>
    </html>
`
