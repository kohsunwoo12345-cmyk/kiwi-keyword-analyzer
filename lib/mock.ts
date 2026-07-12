// 데모용 목업 데이터 — 실제 서비스에서는 API 응답으로 대체됩니다.

export const trafficTrend = [
  { name: '월', 방문: 1240, 전환: 88 },
  { name: '화', 방문: 1980, 전환: 132 },
  { name: '수', 방문: 1650, 전환: 104 },
  { name: '목', 방문: 2380, 전환: 176 },
  { name: '금', 방문: 2890, 전환: 214 },
  { name: '토', 방문: 3420, 전환: 268 },
  { name: '일', 방문: 3110, 전환: 241 },
]

export const revenueTrend = [
  { name: '1월', 매출: 32 },
  { name: '2월', 매출: 41 },
  { name: '3월', 매출: 38 },
  { name: '4월', 매출: 55 },
  { name: '5월', 매출: 67 },
  { name: '6월', 매출: 84 },
  { name: '7월', 매출: 96 },
]

export const channelSplit = [
  { name: '네이버', value: 38, color: '#22c55e' },
  { name: '메타', value: 27, color: '#3b82f6' },
  { name: '구글', value: 21, color: '#f59e0b' },
  { name: '유튜브', value: 14, color: '#ef4444' },
]

// ---- YouTube ----
export const ytChannels = [
  { name: '마케팅탐구소', subs: '48.2만', views: '1,240만', videos: 312, growth: 12.4, trend: [40, 42, 45, 51, 58, 64, 72] },
  { name: '브랜드랩TV', subs: '23.7만', views: '680만', videos: 198, growth: 8.1, trend: [30, 31, 33, 35, 38, 40, 43] },
  { name: '숏폼공장', subs: '112만', views: '4,820만', videos: 890, growth: 24.7, trend: [50, 58, 66, 74, 85, 92, 100] },
]

export const ytVideos = [
  { title: '전환율 3배 올린 랜딩페이지 공식', views: 284000, ctr: 8.4, retention: 62, viral: 92 },
  { title: '요즘 뜨는 숏폼 훅 5가지', views: 512000, ctr: 11.2, retention: 71, viral: 96 },
  { title: '광고비 아끼는 타겟팅 전략', views: 148000, ctr: 6.7, retention: 55, viral: 74 },
  { title: 'AI로 영상 10배 빨리 만들기', views: 396000, ctr: 9.8, retention: 68, viral: 88 },
  { title: '네이버 블로그 상위노출 근황', views: 92000, ctr: 5.9, retention: 51, viral: 61 },
]

export const ytKeywords = [
  { kw: '숏폼 편집', vol: 74000, comp: '낮음', viral: 94 },
  { kw: '릴스 알고리즘', vol: 52000, comp: '보통', viral: 88 },
  { kw: 'AI 영상 제작', vol: 38000, comp: '낮음', viral: 91 },
  { kw: '유튜브 썸네일', vol: 121000, comp: '높음', viral: 67 },
  { kw: '브랜디드 콘텐츠', vol: 18000, comp: '낮음', viral: 79 },
]

// ---- Blog ----
export const blogPosts = [
  { title: '2026 마케팅 트렌드 총정리', rank: 2, kw: '마케팅 트렌드', vol: 33000, index: 'A+' },
  { title: '네이버 플레이스 상위노출 방법', rank: 1, kw: '플레이스 상위노출', vol: 21000, index: 'S' },
  { title: '스마트스토어 키워드 전략', rank: 5, kw: '스마트스토어 키워드', vol: 44000, index: 'A' },
  { title: '블로그 지수 올리는 법', rank: 3, kw: '블로그 지수', vol: 12000, index: 'A-' },
  { title: '체험단 마케팅 후기', rank: 8, kw: '체험단 마케팅', vol: 9800, index: 'B+' },
]

export const blogTrend = [
  { name: '1주', 유입: 820, 순위: 12 },
  { name: '2주', 유입: 1140, 순위: 8 },
  { name: '3주', 유입: 1620, 순위: 5 },
  { name: '4주', 유입: 2240, 순위: 3 },
]

// ---- Ads ----
export const adCampaigns = [
  { name: '여름 프로모션 (메타)', platform: '메타', spend: 3200000, roas: 4.2, cpa: 8400, ctr: 2.8, status: '운영중' },
  { name: '브랜드 검색 (구글)', platform: '구글', spend: 1800000, roas: 6.8, cpa: 5200, ctr: 4.1, status: '운영중' },
  { name: '신규가입 (네이버)', platform: '네이버', spend: 2400000, roas: 3.1, cpa: 11200, ctr: 1.9, status: '검토' },
  { name: '리타겟팅 (메타)', platform: '메타', spend: 960000, roas: 8.4, cpa: 3800, ctr: 5.6, status: '운영중' },
]

export const adTrend = [
  { name: '월', 광고비: 42, 매출: 168 },
  { name: '화', 광고비: 38, 매출: 152 },
  { name: '수', 광고비: 51, 매출: 224 },
  { name: '목', 광고비: 47, 매출: 198 },
  { name: '금', 광고비: 62, 매출: 310 },
  { name: '토', 광고비: 58, 매출: 289 },
  { name: '일', 광고비: 44, 매출: 211 },
]

// ---- CRM ----
export const crmStages = [
  { stage: '리드', count: 1240, color: '#7c3aed' },
  { stage: '상담', count: 486, color: '#6366f1' },
  { stage: '제안', count: 214, color: '#0ea5e9' },
  { stage: '계약', count: 98, color: '#22c55e' },
]

export const crmCustomers = [
  { name: '김서연', email: 'seoyeon@example.com', tag: 'VIP', stage: '계약', value: 2400000, last: '2일 전' },
  { name: '이준호', email: 'junho@example.com', tag: '신규', stage: '상담', value: 0, last: '오늘' },
  { name: '박민지', email: 'minji@example.com', tag: '재구매', stage: '제안', value: 890000, last: '1일 전' },
  { name: '최도윤', email: 'doyoon@example.com', tag: '휴면', stage: '리드', value: 0, last: '12일 전' },
  { name: '정하은', email: 'haeun@example.com', tag: 'VIP', stage: '계약', value: 3100000, last: '3일 전' },
]

// ---- AI Video ----
export const videoStyles = [
  { name: '시네마틱', desc: '영화 같은 색감과 카메라 워크', emoji: '🎬' },
  { name: '광고 CF', desc: '깔끔하고 임팩트 있는 제품 광고', emoji: '✨' },
  { name: '숏폼 다이내믹', desc: '빠른 컷과 훅으로 시선 집중', emoji: '⚡' },
  { name: '애니메이션', desc: '부드러운 모션 그래픽', emoji: '🎨' },
]

export const videoMotions = ['줌 인', '줌 아웃', '패닝', '오빗', '돌리 줌', '틸트', '고정', '핸드헬드']

export const videoGallery = [
  { title: '뷰티 브랜드 CF', style: '광고 CF', dur: '0:15', grad: 'from-pink-500 to-rose-500' },
  { title: '카페 홍보 숏폼', style: '숏폼 다이내믹', dur: '0:09', grad: 'from-amber-500 to-orange-500' },
  { title: '앱 소개 영상', style: '시네마틱', dur: '0:30', grad: 'from-violet-500 to-indigo-500' },
  { title: '패션 룩북', style: '시네마틱', dur: '0:20', grad: 'from-cyan-500 to-blue-500' },
  { title: '푸드 광고', style: '광고 CF', dur: '0:12', grad: 'from-red-500 to-amber-500' },
  { title: '이벤트 티저', style: '애니메이션', dur: '0:08', grad: 'from-emerald-500 to-teal-500' },
]
