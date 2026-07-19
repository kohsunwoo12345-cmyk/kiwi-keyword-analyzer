# OpenAI(GPT Image) 국가 차단 우회 — 릴레이 설정

## 증상
GPT Image 생성 시 / 자가진단에서:
```
HTTP 403 · unsupported_country_region_territory
"Country, region, or territory not supported"
```

## 원인
BYGENCY는 Cloudflare Pages에서 실행되고, Cloudflare의 **바깥으로 나가는 IP(egress)** 가
OpenAI가 지원하지 않는 지역으로 잡히는 경우가 많습니다. OpenAI는 요청 IP의 국가를 보고
차단하므로, **지원 국가의 고정 IP를 경유**시키면 해결됩니다. (한국은 지원 국가입니다.)

```
Cloudflare Functions  →  Vultr 고정 IP(141.164.36.76)  →  api.openai.com
```

이미 SMS용으로 쓰는 **Vultr 릴레이(141.164.36.76)** 에 OpenAI 패스스루를 추가해 두었으니,
그 서버 코드만 최신으로 올리고 환경변수 하나만 설정하면 됩니다.

## 설정 (2단계)

### 1) Vultr 릴레이 서버 코드 업데이트 + 재시작
`deploy/aligo-proxy/server.js` 가 이제 `/v1/*` 요청을 `api.openai.com` 으로 전달합니다.
Vultr 서버에 이 파일을 올리고 재시작하세요. (Aligo SMS 기능은 그대로 동작합니다.)

```bash
# Vultr 서버(141.164.36.76)에서
#  - 최신 server.js 를 배치한 뒤
pm2 restart bygency-aligo-relay      # 또는 사용 중인 방식으로 재시작
#  (없으면)  PORT=8080 node server.js
```

동작 확인 (서버에서 또는 외부에서):
```bash
curl -s http://141.164.36.76:8080/v1/models -H "Authorization: Bearer $OPENAI_KEY" | head -c 200
# → 모델 목록 JSON 이 나오면 릴레이 정상 (unsupported_country 가 사라짐)
```

### 2) Cloudflare Pages 환경변수 추가
Cloudflare Pages → 프로젝트 → Settings → Environment variables (Production)에
아래를 추가하고 **재배포**:

```
OPENAI_RELAY_URL = http://141.164.36.76:8080
```

(앱은 `OPENAI_RELAY_URL` + `/v1/images/generations` 형태로 호출합니다. 끝에 `/` 나 `/v1` 를 붙이지 마세요.)

## 확인
- 관리자 → AI API 남은 한도 → **생성 자가진단** → GPT Image 가 초록 "릴레이 경유 정상" 으로 바뀝니다.
- 스튜디오에서 GPT Image 생성이 실제로 됩니다.

## 보안 주의 (권장)
- 현재 릴레이는 **HTTP(평문)** 입니다. OpenAI 키가 Cloudflare→Vultr 구간에서 평문 전송됩니다.
  가능하면 Vultr 앞에 도메인+TLS(예: Caddy/Nginx 리버스 프록시, Let's Encrypt)를 붙여
  `OPENAI_RELAY_URL = https://relay.yourdomain.com` 로 바꾸는 것을 권장합니다.
- `/v1/*` 릴레이는 대상 호스트를 `api.openai.com` 으로 고정해 오픈 프록시가 되지 않습니다
  (유효한 OpenAI 키 없이는 아무 것도 못 함).

## 대안
- Vultr 대신 미국/지원국가의 다른 고정 IP 호스트(Deno Deploy·Vercel·소형 VPS)에 같은 패스스루를
  올려도 됩니다. 핵심은 "OpenAI 지원 국가의 안정적인 고정 IP"를 경유하는 것.
