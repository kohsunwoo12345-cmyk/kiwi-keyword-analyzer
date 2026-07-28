# BYGENCY 크론 워커

정해진 시각에 BYGENCY 의 배치 작업을 돌리는 아주 작은 Cloudflare Worker.

Cloudflare **Pages** Functions 에는 스케줄러가 없다. **Workers** 에는 Cron Triggers 가 있고
무료 플랜에서도 쓸 수 있다. 그래서 "시계" 역할만 이 워커가 맡고, 실제 일은 기존 Pages
엔드포인트를 HTTP 로 호출해서 시킨다. 생성 로직·크레딧 차감·브랜드 킷은 전부 Pages 안에
그대로 있고 이 워커는 두드리기만 한다 — 로직이 두 군데로 갈라지지 않게.

| 크론 | UTC | 한국시각 | 하는 일 |
|---|---|---|---|
| `*/15 * * * *` | 15분마다 | 15분마다 | `/api/cron/video-schedules` — 때가 된 예약 영상 생성 |
| `5 0 * * *` | 00:05 | 09:05 | `/api/naver-place/update-all-tracking` — 플레이스 순위 추적(20건씩 전량) |

## 비용

- Workers 무료 플랜: **하루 10만 요청**. 15분마다 = 하루 96회 + 네이버 1회 → 한도의 0.1%.
- Cron Triggers 자체는 **무료 플랜 포함**(워커당 최대 5개까지 등록 가능).
- 실제로 영상이 생성되면 그건 BYGENCY 크레딧 / 모델 API 비용이다. 워커 값은 아니다.

## 시간대에 대하여

위 cron 표현식은 Cloudflare 규격상 **항상 UTC** 다. 하지만 예약 영상의 실제 실행 시각은
이 표가 정하지 않는다. 회원이 스튜디오에서 고른 **그 나라 현지 시각**(IANA 표준시간대,
서머타임 포함)으로 서버가 계산해 두고, 이 워커는 자주 두드려서 "지금 때가 된 예약"을
서버가 집어가게 할 뿐이다.

15분 간격인 이유: 인도(UTC+5:30)·네팔(UTC+5:45)처럼 30·45분 오프셋 지역도 정시에
맞추기 위해서다.

## 설치 (한 번만)

### 1. 토큰 만들기

```bash
openssl rand -hex 32
```

나온 문자열을 아래 두 곳에 **똑같이** 넣는다. 이게 다르면 전부 401 로 튕긴다.

### 2. Pages 쪽에 등록

Cloudflare 대시보드 → Workers & Pages → 해당 Pages 프로젝트 →
**Settings → Variables and Secrets** →
`CRON_TOKEN` 을 **Secret** 으로 추가 (Production 환경) → **재배포**

> 환경변수는 새로 배포해야 반영된다. 넣기만 하고 재배포를 안 하면 계속 401 이 난다.

### 3. 워커 배포 — 방법 A: Cloudflare 에 GitHub 저장소 연결 (권장)

Pages 처럼 Workers 도 저장소를 연결해 두면 푸시할 때마다 Cloudflare 가 알아서
빌드·배포한다(Workers Builds). API 토큰도, GitHub Secrets 도, 터미널도 필요 없다.

1. **Workers & Pages → Create → Workers → Import a repository**
   (처음이면 GitHub 앱 설치·권한 승인 화면이 뜬다)
2. 이 저장소를 고르고 아래처럼 설정한다 — **루트 디렉터리 지정이 핵심이다.**
   저장소 최상단에는 Next.js 사이트가 있어서, 그대로 두면 엉뚱한 걸 빌드한다.

   | 항목 | 값 |
   |---|---|
   | Root directory | `workers/cron` |
   | Build command | `npm install` |
   | Deploy command | `npx wrangler deploy` |

3. 배포되면 **Settings → Variables and Secrets** 에서
   `CRON_TOKEN` 을 **Secret** 으로 추가하고 다시 **Deploy**
   (`SITE_URL` 과 Cron Trigger 는 `wrangler.toml` 에 있으므로 따로 넣지 않아도 된다)
4. `https://bygency-cron.<계정서브도메인>.workers.dev/health` 로 확인

이후 `workers/cron/` 아래를 고쳐 main 에 푸시하면 자동으로 재배포된다.

> 빌드 시간은 무료 플랜에도 월 한도가 포함되어 있다. 이 워커는 `npm install` 한 번에
> 수십 초라 사실상 신경 쓸 일이 없다. 정확한 한도는 대시보드의 Builds 화면에 표시된다.

### 3. 워커 배포 — 방법 B: GitHub Actions

Cloudflare 에 저장소를 연결할 수 없을 때(권한 문제 등) 쓰는 우회로.
로컬에 wrangler 를 깔거나 브라우저로 로그인할 필요가 없다.
⚠ 방법 A 와 동시에 쓰면 푸시 한 번에 두 번 배포된다. 하나만 골라 쓴다.

GitHub → Settings → Secrets and variables → **Actions** 에 등록:

| 종류 | 이름 | 값 |
|---|---|---|
| Secret | `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → Create Token → 템플릿 **Edit Cloudflare Workers** |
| Secret | `CRON_TOKEN` | 1번에서 만든 값 (Pages 에 넣은 것과 동일) |
| Secret | `CLOUDFLARE_ACCOUNT_ID` | (선택) 토큰이 여러 계정에 접근 가능할 때만 |
| Variable | `SITE_URL` | (선택) 기본값 `https://bygency.co` |

그다음 **Actions 탭 → "deploy cron worker" → Run workflow**.
워크플로가 배포 → 워커에 `CRON_TOKEN` 심기 → `/health` 확인 → Pages 토큰 일치까지
전부 검사하고, 어긋나면 어디가 문제인지 에러로 알려준다.
이후 `workers/cron/` 아래가 바뀌어 main 에 푸시되면 자동으로 재배포된다.

### 3. 워커 배포 — 방법 C: 대시보드 편집기에 복붙 (터미널·GitHub 없이)

`src/index.js` 를 일부러 TypeScript 가 아니라 평범한 JS 로 둔 이유가 이것이다.
Cloudflare 대시보드 편집기에 **그대로 복붙**하면 된다.

1. **Workers & Pages → Create → Workers → Start with Hello World!**
   이름을 `bygency-cron` 으로 하고 **Deploy**
2. **Edit code**(또는 Quick edit) → 편집기 내용을 전부 지우고
   이 저장소의 `workers/cron/src/index.js` 를 통째로 붙여넣기 → **Deploy**
3. **Settings → Variables and Secrets**
   | 종류 | 이름 | 값 |
   |---|---|---|
   | Text | `SITE_URL` | `https://bygency.co` |
   | Secret | `CRON_TOKEN` | 1번에서 만든 값 |
4. **Settings → Trigger Events → Cron Triggers → Add**
   두 개를 등록한다(둘 다 UTC 기준):
   - `*/15 * * * *` — 예약 영상 생성
   - `5 0 * * *` — 네이버 추적 (한국 09:05)
5. 배포된 주소로 확인: `https://bygency-cron.<계정서브도메인>.workers.dev/health`
   → `{"ok":true,...,"tokenSet":true}` 가 나오면 끝

> 이 방법으로 만들면 이후 저장소의 `src/index.js` 를 고쳐도 자동 반영되지 않는다.
> 고칠 일이 생기면 편집기에 다시 붙여넣거나, 방법 A(저장소 연결)로 전환하면 된다.

### 3. 워커 배포 — 방법 D: 로컬에서 직접

```bash
cd workers/cron
npx wrangler login          # 최초 1회
npx wrangler secret put CRON_TOKEN     # 위에서 만든 값 붙여넣기
npx wrangler deploy
```

`wrangler.toml` 의 `SITE_URL` 이 실제 도메인인지 확인한다(기본 `https://bygency.co`).
도메인이 다르면 그 값을 고치고 다시 `deploy`.

### 4. 확인

```bash
# 워커가 살아 있고 토큰이 들어갔는지
curl https://bygency-cron.<계정서브도메인>.workers.dev/health
# → {"ok":true,"worker":"bygency-cron","site":"https://bygency.co","tokenSet":true}

# 손으로 한 번 돌려보기
curl -X POST -H "X-Cron-Token: <토큰>" \
  "https://bygency-cron.<계정서브도메인>.workers.dev/run?job=video"
```

`tokenSet:false` 면 3번의 `secret put` 이 안 된 것이고,
`/run` 이 401 이면 헤더 토큰이 틀린 것, 응답 안 `steps[].body` 가 401 이면
**Pages 쪽** 토큰이 다르거나 재배포를 안 한 것이다.

크론이 실제로 도는지는 대시보드 → Workers & Pages → `bygency-cron` →
**Logs**(또는 Cron Events 탭)에서 확인한다. `[cron] */15 * * * * 완료 — N단계` 로그가 남는다.

## 손으로 돌리기

| 경로 | 하는 일 |
|---|---|
| `GET /health` | 살아 있는지·토큰 설정됐는지 |
| `POST /run?job=video` | 예약 영상 생성 즉시 처리 |
| `POST /run?job=naver` | 네이버 추적 즉시 전량 갱신 |

둘 다 `X-Cron-Token` 헤더가 필요하다.

## 로컬에서 시험

```bash
# 터미널 1 — Pages
npx wrangler pages dev out --d1=DB --port 8788 --binding CRON_TOKEN=testcron

# 터미널 2 — 이 워커
cd workers/cron
npx wrangler dev --port 8790 --test-scheduled \
  --var SITE_URL:http://127.0.0.1:8788 --var CRON_TOKEN:testcron

# 크론이 발화한 것처럼 실행
curl "http://127.0.0.1:8790/__scheduled?cron=*/15+*+*+*+*"
curl "http://127.0.0.1:8790/__scheduled?cron=5+0+*+*+*"
```

## 예비 경로

`.github/workflows/cron.yml` 에 똑같은 일을 하는 GitHub Actions 워크플로가 남아 있다.
**자동 스케줄은 꺼져 있고**(둘 다 켜면 같은 예약을 두 번 집어갈 수 있다) 수동 실행
전용이다. 워커가 죽었을 때 Actions 탭 → cron → Run workflow 로 한 번 돌리면 된다.

## 한계

- 무료 플랜은 요청 하나당 하위 요청 50개가 상한이라, 네이버 배치는 한 번 실행에
  최대 40배치(800건)까지만 돈다. 넘으면 로그에 경고를 남기고 다음 날로 넘긴다.
- 예약 영상은 Pages 쪽에서 한 번에 5건씩만 처리한다(과금 폭주 방지). 워커가 최대
  5회까지 이어서 두드리므로 한 번 실행에 최대 25건. 그 이상 밀리면 15분 뒤에 마저 돈다.
