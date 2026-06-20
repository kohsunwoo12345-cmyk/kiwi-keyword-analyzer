# 모토진단 — 오토바이 OBD-II 진단 도구

노트북과 ELM327 어댑터로 오토바이의 **고장코드 · 실시간 데이터 · 주행 로그**를 확인하는 웹 진단 도구입니다. 브라우저에서 바로 동작하며, 별도 설치가 필요 없습니다.

## 주요 기능

- **연결 (3가지)**: Web Serial(USB) · Web Bluetooth(BLE) · 데모 시뮬레이터
- **실시간 데이터**: 회전수 · 차속 · 냉각수온 · 스로틀 · 부하 · 전압 등 게이지 + 실시간 그래프
- **고장코드(DTC)**: 저장/대기 코드 읽기, 한글 설명, 코드 삭제
- **주행 로그**: 실시간 기록 → CSV 내보내기
- **주행거리**: 조회 시도 (표준 OBD-II 미지원 시 안내)

> 어댑터가 없어도 **‘데모 실행’** 버튼으로 모든 기능을 체험할 수 있습니다.

## 요구 사항

- 데스크톱 **크롬 / 엣지** (Web Serial · Web Bluetooth 지원 브라우저)
- **ELM327 OBD 어댑터** — USB형(권장) 또는 BLE형. 저가형 블루투스(Classic/SPP)는 브라우저에서 동작하지 않습니다.
- 차종에 맞는 진단 커넥터 (16핀 OBD-II 또는 제조사 전용 변환 케이블)

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

이 프로젝트는 정적 사이트로 빌드됩니다. Cloudflare Pages 프로젝트의 **Build configuration**을 다음과 같이 설정하세요.

| 항목 | 값 |
| --- | --- |
| Build command | `npm run build` |
| Build output directory | `out` |

출력 디렉터리는 `wrangler.toml`의 `pages_build_output_dir = "out"` 로도 지정되어 있습니다.

## 기술 스택

Next.js (App Router, 정적 export) · React · TypeScript · Tailwind CSS · Recharts · Web Serial / Web Bluetooth API
