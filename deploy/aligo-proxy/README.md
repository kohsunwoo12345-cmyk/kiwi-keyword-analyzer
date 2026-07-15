# BYGENCY Aligo 프록시 (Vultr 고정 IP)

BYGENCY는 Cloudflare Pages에서 실행되므로 발송 요청이 **Cloudflare IP**에서 나갑니다.
Aligo의 "IP 연동 제한"을 사용해 **구매하신 Vultr 고정 IP(141.164.36.76)** 만 허용하려면,
그 서버에 이 작은 프록시를 띄워서 요청을 대신 전달하게 해야 합니다.

```
Cloudflare Functions  →  Vultr 프록시(141.164.36.76)  →  api/kakaoapi.aligo.in
```

Aligo에 등록되는 발신 IP = **141.164.36.76** 이 됩니다.

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
| `ALIGO_USER_ID` | 알리고 아이디 | **필수** |
| `ALIGO_SENDER` | 등록 발신번호(예: 0212345678) | **필수** (SMS/알림톡 발신) |
| `ALIGO_SENDER_KEY` | 알림톡 발신프로필 키(senderkey) | 알림톡 사용 시 필수 |
| `ALIGO_TEMPLATE_CODE` | 기본 템플릿 코드 | (선택) 기본 알림톡 템플릿 |
| `ALIGO_PROXY_URL` | `http://141.164.36.76:8080` (또는 `https://aligo.example.com`) | **고정 IP 경유용** |
| `ALIGO_PROXY_TOKEN` | 위에서 만든 토큰 | 프록시 인증(프록시와 동일값) |

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
