# 바이전시 (Bivience) — 올인원 마케팅 그로스 플랫폼

마케팅에 필요한 모든 것을 하나의 워크스페이스로 통합한 SaaS 플랫폼입니다. DB수집 랜딩페이지부터 콘텐츠 분석, 광고 최적화, CRM, AI 영상 제작까지 마케팅 퍼널의 전 과정을 커버합니다.

## 주요 기능

1. **DB 수집 랜딩페이지** — 폼으로 방문자를 고객 DB로 전환하고 실시간 관리 (브라우저 저장 + CSV 내보내기 실동작)
2. **유튜브 분석** — 채널·영상·키워드 성과 분석, 떡상 키워드 발굴, 경쟁 채널 벤치마킹
3. **블로그 분석** — 블로그 지수 진단, 키워드 상위노출 가능성 계산기, C-Rank 대응 리포트
4. **팀 협업 & AI 챗봇** — 칸반 보드 + AI 마케팅 어시스턴트 (실시간 대화)
5. **고객관리 CRM** — 세일즈 파이프라인, 세그먼트, 문자·알림톡 캠페인 발송
6. **실제 광고 분석** — 메타·구글·네이버 통합 대시보드, ROAS·CPA 추적, AI 예산 최적화
7. **AI 영상 제작** — 텍스트 프롬프트 → 광고·숏폼 영상 생성 (Higgsfield 스타일)

## 페이지 구조

| 경로 | 설명 |
| --- | --- |
| `/` | 랜딩(마케팅) 페이지 — 히어로 · 기능 · 요금제 · CTA |
| `/dashboard` | 대시보드 개요 (통합 지표·차트) |
| `/dashboard/leads` | ① DB 수집 랜딩페이지 |
| `/dashboard/youtube` | ② 유튜브 분석 |
| `/dashboard/blog` | ③ 블로그 분석 |
| `/dashboard/team` | ④ 팀 협업 & AI 챗봇 |
| `/dashboard/crm` | ⑤ 고객관리 CRM |
| `/dashboard/ads` | ⑥ 실제 광고 분석 |
| `/dashboard/video` | ⑦ AI 영상 제작 |

> 데모 데이터는 `lib/mock.ts`에 정의되어 있으며, 실제 서비스에서는 API 응답으로 대체됩니다.
> DB 수집·칸반·AI 챗봇 등 인터랙티브 기능은 브라우저 `localStorage`에 실제 저장되어 동작합니다.

## 로컬 실행

```bash
npm install
npm run dev
# http://localhost:3000
```

## 빌드

```bash
npm run build   # 정적 사이트가 out/ 에 생성됩니다 (output: 'export')
```

## 배포 (Cloudflare Pages)

| 항목 | 값 |
| --- | --- |
| Build command | `npm run build` |
| Build output directory | `out` |

## 기술 스택

Next.js 15 (App Router, 정적 export) · React 18 · TypeScript · Tailwind CSS · Recharts · lucide-react
