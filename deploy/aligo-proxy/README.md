# BYGENCY Aligo 프록시 (Vultr 고정 IP)

BYGENCY는 Cloudflare Pages에서 실행되므로 발송 요청이 **Cloudflare IP**에서 나갑니다.
Aligo의 "IP 연동 제한"을 사용해 **구매하신 Vultr 고정 IP(141.164.36.76)** 만 허용하려면,
그 서버에 이 작은 프록시를 띄워서 요청을 대신 전달하게 해야 합니다.

```
Cloudflare Functions  →  Vultr 프록시(141.164.36.76)  →  api/kakaoapi.aligo.in
```

Aligo에 등록되는 발신 IP = **141.164.36.76** 이 됩니다.

---

## 공용 릴레이 — 여러 사이트에서 사용하기

이 릴레이는 한 대로 여러 사이트/여러 알리고 계정을 처리합니다. 각 사이트가 **자기 알리고 계정에 141.164.36.76 을 발송 IP로 등록**하고, 아래 방식 중 하나로 요청만 보내면 됩니다. (한 서버 IP는 여러 알리고 계정이 동시에 등록 가능)

지원하는 3가지 방식:

**A) 패스스루 (BYGENCY 사용)** — 헤더로 대상 지정
```
POST http://141.164.36.76:8080/
Header: X-Aligo-Target: https://apis.aligo.in/send/
Body:   key=...&user_id=...&sender=...&receiver=...&msg=...   (form-urlencoded)
```

**B) 간단 SMS (다른 사이트 추천)** — JSON만 보내면 릴레이가 알아서 발송
```
POST http://141.164.36.76:8080/
Content-Type: application/json
{ "type":"sms", "key":"발급키", "user_id":"알리고아이디",
  "sender":"발신번호", "receiver":"수신번호(,로 여러명)", "msg":"내용", "msg_type":"SMS" }
```

**C) 간단 알림톡** — 릴레이가 토큰을 자동 발급해 발송
```
POST http://141.164.36.76:8080/
Content-Type: application/json
{ "type":"alimtalk", "apikey":"발급키", "userid":"알리고아이디",
  "senderkey":"발신프로필키", "tpl_code":"템플릿코드", "sender":"발신번호",
  "receiver_1":"수신번호", "subject_1":"제목", "message_1":"내용(템플릿 치환 완료)" }
```
응답은 알리고 원본 JSON 그대로 돌려줍니다. (SMS: `result_code`, 알림톡: `code`)

### 보안 (RELAY_SECRET) — 여러 사이트에 열 때 권장
릴레이에 비밀키를 걸면, 그 키를 아는 사이트만 사용할 수 있습니다.

1. 릴레이 설치 시 비밀키 지정:
   `curl -fsSL <setup.sh URL> | RELAY_SECRET=긴랜덤키 bash`
2. 각 요청 헤더에 그 키를 첨부: `X-Relay-Secret: 긴랜덤키`
3. **BYGENCY(Cloudflare)** 는 `ALIGO_PROXY_TOKEN` 환경변수에 같은 키를 넣으면 됩니다.
   (⚠️ 순서: 먼저 Cloudflare 에 `ALIGO_PROXY_TOKEN` 을 넣고 재배포한 뒤, 릴레이에 `RELAY_SECRET` 을 켜세요. 그래야 그 사이 발송이 끊기지 않습니다.)

> ⚠️ 이 릴레이 서버는 모든 연결 사이트의 공통 관문(단일 장애점)입니다. 서버가 중지되면 연결된 사이트들의 발송이 멈춥니다. 중요해지면 이중화를 고려하세요.

---

## 1) Vultr 서버에 올리기

`server.js` 한 파일이면 됩니다. 의존성 없음(Node 16+).

```bash
# 서버에 파일 복사 후
sudo mkdir -p /opt/bygency-aligo-proxy
sudo cp server.js /opt/bygency-aligo-proxy/

# 긴 랜덤 토큰 생성 (Cloudflare 환경변수와 동일하게 쓸 값)
openssl rand -hex 24
```

### systemd 서비스 등록

`/etc/systemd/system/bygency-aligo-proxy.service`:

```ini
[Unit]
Description=BYGENCY Aligo Proxy
After=network.target

[Service]
Environment=PORT=8080
Environment=ALIGO_PROXY_TOKEN=여기에_위에서_만든_토큰
ExecStart=/usr/bin/node /opt/bygency-aligo-proxy/server.js
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now bygency-aligo-proxy
sudo systemctl status bygency-aligo-proxy
```

방화벽에서 8080 포트(또는 아래 TLS 사용 시 443)를 열어주세요.

---

## 2) TLS 권장 (Caddy)

Cloudflare → Vultr 구간에 API 키·문구가 오갑니다. 도메인이 있다면 Caddy로 자동 HTTPS를 붙이는 것을 권장합니다.
도메인이 없다면 `http://141.164.36.76:8080` 으로도 동작하지만, 그 경우 반드시 `ALIGO_PROXY_TOKEN`을 설정하세요.

예) 서브도메인 `aligo.example.com` 을 141.164.36.76 로 지정한 뒤 `/etc/caddy/Caddyfile`:

```
aligo.example.com {
    reverse_proxy 127.0.0.1:8080
}
```

그러면 `ALIGO_PROXY_URL = https://aligo.example.com` 로 설정하면 됩니다.

---

## 3) Cloudflare Pages 환경변수

Cloudflare Pages → 프로젝트 → Settings → Environment variables 에 추가:

| 변수 | 값 | 설명 |
|------|-----|------|
| `ALIGO_API_KEY` | (발급받은 키) | 알리고 API 키 ✅ 이미 설정됨 |
| `ALIGO_USER_ID` | 알리고 아이디 | **필수** (알리고 API는 key+user_id 둘 다 요구) |
| `ALIGO_SENDER_KEY` | 알림톡 발신프로필 키(senderkey) | 알림톡 사용 시 필수 |
| `ALIGO_PROXY_URL` | `http://141.164.36.76:8080` (또는 `https://aligo.example.com`) | **고정 IP 경유용** |
| `ALIGO_PROXY_TOKEN` | 위에서 만든 토큰 | 프록시 인증(프록시와 동일값) |
| `ALIGO_SENDER` | 등록 발신번호(예: 0212345678) | (선택) **시스템 발송용 기본 발신번호**. 회원 발송은 앱에 등록·승인된 발신번호를 사용하므로 불필요. 관리자 공지/시스템 문자에만 사용됨. |
| `ALIGO_TEMPLATE_CODE` | 기본 템플릿 코드 | (선택) 기본 알림톡 템플릿 |

> **발신번호는 환경변수가 아니라 앱의 발신번호 등록·승인 시스템에서 가져옵니다.**
> 회원이 대시보드에서 발신번호를 등록 → 관리자 승인 → 발송 시 그 번호가 알리고 API의 `sender` 로 전달됩니다.
> `ALIGO_SENDER` 는 관리자 공지 문자처럼 회원 발신번호가 없는 **시스템 발송**의 기본값일 뿐이며 없어도 됩니다.
> (단, 알리고에 발신번호 사전등록은 되어 있어야 실제 전송됩니다.)

`ALIGO_PROXY_URL` 이 설정되면 모든 알리고 호출(문자·알림톡·토큰·템플릿·잔여조회)이
이 프록시를 경유합니다. 비워두면 Cloudflare에서 직접 호출합니다.

---

## 4) Aligo 관리자 설정

1. 발신번호 사전등록(문자) — `ALIGO_SENDER` 로 쓸 번호.
2. 카카오 채널 연동 + 발신프로필 키(senderkey) 발급 — `ALIGO_SENDER_KEY`.
3. 알림톡 템플릿 등록/승인 — 승인된 `tpl_code` 사용.
4. **IP 연동 제한 사용** → 허용 IP에 `141.164.36.76` 등록.

---

## 5) 점검

- 프록시 헬스: `curl http://141.164.36.76:8080/health` → `{"ok":true,...}`
- 서비스 상태: `/api/health` 응답의 "문자·알림톡(알리고)" 항목이 `ok:true`
- 실제 발송 테스트: 대시보드 문자/알림톡 발송 → 성공/실패 사유 확인
