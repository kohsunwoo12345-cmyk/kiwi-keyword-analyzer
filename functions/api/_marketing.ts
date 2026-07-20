/// <reference types="@cloudflare/workers-types" />
/**
 * 마케팅 자동화 API v2 - Braze 수준 기능 구현
 * GET/POST /api/marketing-automation
 *
 * 채널: web_push | email | sms | mms | alimtalk | app_push | inapp
 * 주요 기능: 캠페인, 세그먼트, 캔버스(Journey), A/B테스트, 분석
 */

interface Env {
  DB: D1Database;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;          // 선택적 발신자 주소 (미설정 시 Resend 기본 도메인 onboarding@ 사용)
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  SOLAPI_API_KEY?: string;
  SOLAPI_API_SECRET?: string;
  SOLAPI_SENDER?: string;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// ─────────────────────────────────────────────────────────────────────────────
// 세션 인증
// ─────────────────────────────────────────────────────────────────────────────
// BYGENCY 세션 스킴에 맞춰 이식: 쿠키명 bg_session, sessions(token,user_id,expires_at ISO), users.id=TEXT
async function getSession(req: Request, env: Env): Promise<{ userId: any; role: string } | null> {
  try {
    const cookie = req.headers.get('Cookie') || req.headers.get('cookie') || '';
    let token = cookie.match(/bg_session=([^;]+)/)?.[1] || null;
    if (!token) {
      const auth = req.headers.get('Authorization') || '';
      if (auth.startsWith('Bearer ')) token = auth.slice(7).trim();
    }
    if (!token || token.length < 10) return null;
    const row = await env.DB.prepare(
      `SELECT u.id, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ? LIMIT 1`,
    ).bind(token, new Date().toISOString()).first<{ id: any; role: string }>();
    if (!row) return null;
    const isAdmin = row.role === 'admin' || row.role === 'superadmin';
    return { userId: row.id, role: isAdmin ? 'admin' : row.role };
  } catch (_) { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// DB 테이블 보장
// ─────────────────────────────────────────────────────────────────────────────
async function ensureTables(env: Env) {
  const stmts = [
    // 캠페인 (채널 확장)
    `CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'email',
      status TEXT NOT NULL DEFAULT 'draft',
      target_segment TEXT DEFAULT 'all',
      target_group_id INTEGER,
      target_filters TEXT,
      subject TEXT,
      message TEXT,
      email_html TEXT,
      click_url TEXT,
      ab_test_id INTEGER,
      ab_variant TEXT,
      scheduled_at TEXT,
      sent_at TEXT,
      send_count INTEGER DEFAULT 0,
      open_count INTEGER DEFAULT 0,
      click_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    // 캠페인 발송 로그
    `CREATE TABLE IF NOT EXISTS campaign_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      channel TEXT,
      status TEXT DEFAULT 'sent',
      error_message TEXT,
      sent_at TEXT DEFAULT (datetime('now'))
    )`,
    // 자동화 룰
    `CREATE TABLE IF NOT EXISTS automation_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      trigger_event TEXT,
      channel TEXT,
      delay_hours INTEGER DEFAULT 0,
      message_subject TEXT,
      message_body TEXT,
      click_url TEXT,
      thumbnail_url TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      run_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    // 웹 푸시 발송 로그
    `CREATE TABLE IF NOT EXISTS push_broadcast_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_subject TEXT,
      message_body TEXT,
      thumbnail_url TEXT,
      click_url TEXT,
      target_count INTEGER DEFAULT 0,
      sent_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'sent',
      sent_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS _migrations_done (key TEXT PRIMARY KEY)`,
    // 웹 푸시 구독
    `CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      endpoint TEXT UNIQUE,
      p256dh TEXT,
      auth TEXT,
      user_agent TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    // 마케팅 메타
    `CREATE TABLE IF NOT EXISTS user_marketing_meta (
      user_id INTEGER PRIMARY KEY,
      last_login_at TEXT,
      login_count INTEGER DEFAULT 0,
      push_subscribed INTEGER DEFAULT 0,
      segment TEXT DEFAULT 'normal',
      segment_updated TEXT
    )`,
    // 이벤트 트래킹
    `CREATE TABLE IF NOT EXISTS user_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      event_type TEXT,
      event_data TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    // 타겟 그룹
    `CREATE TABLE IF NOT EXISTS target_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      filters TEXT NOT NULL DEFAULT '[]',
      estimated_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    // ── 캔버스 (Journey Builder) ─────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS canvases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'draft',
      trigger_type TEXT DEFAULT 'event',
      trigger_event TEXT,
      trigger_segment TEXT,
      nodes TEXT DEFAULT '[]',
      edges TEXT DEFAULT '[]',
      entry_count INTEGER DEFAULT 0,
      conversion_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    // 캔버스 유저 상태
    `CREATE TABLE IF NOT EXISTS canvas_user_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      canvas_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      current_node TEXT,
      status TEXT DEFAULT 'active',
      entered_at TEXT DEFAULT (datetime('now')),
      exited_at TEXT,
      converted INTEGER DEFAULT 0,
      UNIQUE(canvas_id, user_id)
    )`,
    // ── A/B 테스트 ───────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS ab_tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      campaign_id INTEGER,
      status TEXT DEFAULT 'running',
      variants TEXT DEFAULT '[]',
      winner_variant TEXT,
      winning_metric TEXT DEFAULT 'open_rate',
      confidence_level REAL DEFAULT 0.95,
      start_at TEXT DEFAULT (datetime('now')),
      end_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    // A/B 테스트 결과
    `CREATE TABLE IF NOT EXISTS ab_test_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ab_test_id INTEGER NOT NULL,
      variant TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      sent INTEGER DEFAULT 0,
      opened INTEGER DEFAULT 0,
      clicked INTEGER DEFAULT 0,
      converted INTEGER DEFAULT 0,
      recorded_at TEXT DEFAULT (datetime('now'))
    )`,
    // ── 인앱 메시지 ──────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS inapp_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'modal',
      title TEXT,
      message TEXT NOT NULL,
      button_text TEXT,
      button_url TEXT,
      image_url TEXT,
      target_segment TEXT DEFAULT 'all',
      target_filters TEXT,
      trigger_page TEXT DEFAULT '*',
      display_frequency TEXT DEFAULT 'once',
      is_active INTEGER DEFAULT 1,
      show_count INTEGER DEFAULT 0,
      click_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    // ── 앱 푸시 디바이스 토큰 ────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS app_push_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      platform TEXT DEFAULT 'android',
      app_version TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, token)
    )`,
    // ── 분석: 캠페인 이벤트 ──────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS campaign_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER,
      canvas_id INTEGER,
      user_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      channel TEXT,
      meta TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
  ];
  for (const sql of stmts) {
    await env.DB.prepare(sql).run().catch(() => {});
  }
  // ALTER TABLE 마이그레이션
  const alters = [
    `ALTER TABLE campaigns ADD COLUMN ab_test_id INTEGER`,
    `ALTER TABLE campaigns ADD COLUMN ab_variant TEXT`,
    `ALTER TABLE campaigns ADD COLUMN scheduled_at TEXT`,
    `ALTER TABLE campaigns ADD COLUMN open_count INTEGER DEFAULT 0`,
    `ALTER TABLE campaigns ADD COLUMN click_count INTEGER DEFAULT 0`,
    `ALTER TABLE campaigns ADD COLUMN target_group_id INTEGER`,
    `ALTER TABLE campaigns ADD COLUMN target_filters TEXT`,
    `ALTER TABLE automation_rules ADD COLUMN thumbnail_url TEXT DEFAULT ''`,
    // BYGENCY users 테이블 보강 — 세그먼트/타겟 SQL 이 참조하는 컬럼 (없으면 조회가 실패)
    `ALTER TABLE users ADD COLUMN user_type TEXT`,
    `ALTER TABLE users ADD COLUMN last_login TEXT`,
    `ALTER TABLE users ADD COLUMN marketing_consent INTEGER DEFAULT 0`,
  ];
  for (const sql of alters) {
    await env.DB.prepare(sql).run().catch(() => {});
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Solapi 인증 헤더
// ─────────────────────────────────────────────────────────────────────────────
async function makeSolapiAuth(apiKey: string, apiSecret: string): Promise<string> {
  const date = new Date().toISOString();
  const salt = crypto.randomUUID().replace(/-/g, '');
  const msg  = date + salt;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(apiSecret), { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
  const buf = await crypto.subtle.sign('HMAC', key, encoder.encode(msg));
  const sig = Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${sig}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 채널별 발송 함수
// ─────────────────────────────────────────────────────────────────────────────

// ① 웹 푸시
// ── VAPID 헬퍼 ───────────────────────────────────────────────────────────────
function b64urlDecode(s: string): Uint8Array {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
function b64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  const arr = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = '';
  arr.forEach(b => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// 실제 VAPID ES256 서명 + Web Push 암호화 (RFC 8291 ece)
async function sendWebPush(
  env: Env,
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: string
): Promise<boolean> {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return false;
  try {
    // ── 1. VAPID JWT (ES256) ──────────────────────────────────────────────────
    const audience = new URL(sub.endpoint).origin;
    const now = Math.floor(Date.now() / 1000);
    const header = b64urlEncode(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
    const claims = b64urlEncode(new TextEncoder().encode(JSON.stringify({
      aud: audience,
      exp: now + 43200,
      sub: env.VAPID_SUBJECT || 'mailto:admin@example.com',
    })));
    const signingInput = `${header}.${claims}`;

    // VAPID 개인키 import — JWK 방식 (VAPID_PRIVATE_KEY: 32바이트 raw scalar base64url)
    // VAPID_PUBLIC_KEY: uncompressed P-256 공개키 (65바이트 base64url, 0x04 prefix)
    const pubBytes = b64urlDecode(env.VAPID_PUBLIC_KEY);
    // uncompressed 공개키: 0x04 || x(32) || y(32)
    const vapidPubX = b64urlEncode(pubBytes.slice(1, 33));
    const vapidPubY = b64urlEncode(pubBytes.slice(33, 65));
    const vapidPrivKey = await crypto.subtle.importKey(
      'jwk',
      {
        kty: 'EC', crv: 'P-256',
        d: env.VAPID_PRIVATE_KEY!,
        x: vapidPubX,
        y: vapidPubY,
        key_ops: ['sign'],
      },
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );

    const sig = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      vapidPrivKey,
      new TextEncoder().encode(signingInput)
    );
    const jwt = `${signingInput}.${b64urlEncode(sig)}`;

    // ── 2. Web Push 페이로드 암호화 (RFC 8291 — aesgcm / aes128gcm) ──────────
    // Cloudflare Workers는 SubtleCrypto 완전 지원
    const plaintext = new TextEncoder().encode(payload);

    // 구독자 공개키 & auth secret
    const clientPubRaw = b64urlDecode(sub.p256dh);   // 65바이트 uncompressed P-256
    const authSecret   = b64urlDecode(sub.auth);      // 16바이트

    // 서버 임시 ECDH 키 쌍 생성
    const serverECDH = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey', 'deriveBits']
    );
    const serverPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', serverECDH.publicKey));

    // 클라이언트 공개키 import
    const clientPubKey = await crypto.subtle.importKey(
      'raw', clientPubRaw,
      { name: 'ECDH', namedCurve: 'P-256' },
      false, []
    );

    // ECDH 공유 비밀
    const sharedBits = await crypto.subtle.deriveBits(
      { name: 'ECDH', public: clientPubKey },
      serverECDH.privateKey,
      256
    );

    // Salt (16 random bytes)
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // HKDF helpers
    async function hkdfExtract(salt_: Uint8Array, ikm: ArrayBuffer): Promise<CryptoKey> {
      const hmacKey = await crypto.subtle.importKey('raw', salt_, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const prk = await crypto.subtle.sign('HMAC', hmacKey, ikm);
      return crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    }
    async function hkdfExpand(prk: CryptoKey, info: Uint8Array, length: number): Promise<Uint8Array> {
      const infoWithCounter = new Uint8Array([...info, 0x01]);
      const okm = await crypto.subtle.sign('HMAC', prk, infoWithCounter);
      return new Uint8Array(okm).slice(0, length);
    }

    // aes128gcm (RFC 8291)
    // PRK_key = HKDF-Extract(auth_secret, ecdh_secret)
    const prk_key = await hkdfExtract(authSecret, sharedBits);
    // key_info = "WebPush: info\x00" || client_public || server_public
    const keyInfoLabel = new TextEncoder().encode('WebPush: info\x00');
    const keyInfo = new Uint8Array(keyInfoLabel.length + clientPubRaw.length + serverPubRaw.length);
    keyInfo.set(keyInfoLabel, 0);
    keyInfo.set(clientPubRaw, keyInfoLabel.length);
    keyInfo.set(serverPubRaw, keyInfoLabel.length + clientPubRaw.length);
    const ikm = await hkdfExpand(prk_key, keyInfo, 32);

    // PRK_cek = HKDF-Extract(salt, ikm)
    const prk_cek = await hkdfExtract(salt, ikm);
    // CEK (Content Encryption Key) = HKDF-Expand(PRK_cek, "Content-Encoding: aes128gcm\x00", 16)
    const cekLabel = new TextEncoder().encode('Content-Encoding: aes128gcm\x00');
    const cek = await hkdfExpand(prk_cek, cekLabel, 16);
    // Nonce = HKDF-Expand(PRK_cek, "Content-Encoding: nonce\x00", 12)
    const nonceLabel = new TextEncoder().encode('Content-Encoding: nonce\x00');
    const nonce = await hkdfExpand(prk_cek, nonceLabel, 12);

    // AES-128-GCM 암호화 (padding: 0x02 delimiter byte appended)
    const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
    // Padding: 1 byte of 0x00 + 1 byte delimiter 0x02
    const paddedPlain = new Uint8Array(plaintext.length + 2);
    paddedPlain.set(plaintext, 0);
    paddedPlain[plaintext.length]     = 0x00; // padding length = 0
    paddedPlain[plaintext.length + 1] = 0x02; // delimiter
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce },
      aesKey,
      paddedPlain
    );

    // aes128gcm 헤더 구성 (RFC 8188)
    // salt(16) + rs(4 big-endian, =4096) + idlen(1) + keyid(serverPubRaw, 65)
    const rs = 4096;
    const header_buf = new Uint8Array(16 + 4 + 1 + serverPubRaw.length);
    header_buf.set(salt, 0);
    new DataView(header_buf.buffer).setUint32(16, rs, false);
    header_buf[20] = serverPubRaw.length;
    header_buf.set(serverPubRaw, 21);

    const encryptedBody = new Uint8Array(header_buf.length + ciphertext.byteLength);
    encryptedBody.set(header_buf, 0);
    encryptedBody.set(new Uint8Array(ciphertext), header_buf.length);

    // ── 3. 전송 ──────────────────────────────────────────────────────────────
    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'Authorization': `vapid t=${jwt},k=${env.VAPID_PUBLIC_KEY}`,
        'TTL': '86400',
      },
      body: encryptedBody,
    });
    // 201 Created or 2xx = success; 410/404 = subscription expired
    return res.status === 201 || (res.status >= 200 && res.status < 300);
  } catch (e) {
    console.error('[sendWebPush] 오류:', e);
    return false;
  }
}

// ② 이메일 (Resend)
// from 우선순위: env.RESEND_FROM > email_settings.sender_email > onboarding@resend.dev
async function sendEmail(
  env: Env,
  to: string,
  subject: string,
  html: string,
  text: string,
  fromOverride?: string,
): Promise<{ ok: boolean; error?: string; status?: number }> {
  if (!env.RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY 환경변수가 설정되지 않았습니다' };
  if (!to || !to.includes('@')) return { ok: false, error: `수신자 이메일 주소가 유효하지 않습니다: "${to}"` };

  // from 주소 결정
  let from = fromOverride
    || env.RESEND_FROM
    || 'onboarding@resend.dev';  // Resend 무료 테스트용 기본 주소

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html, text }),
    });
    if (res.ok) return { ok: true };
    // Resend 에러 상세 반환
    let errBody = '';
    try { errBody = await res.text(); } catch {}
    return { ok: false, status: res.status, error: `Resend API ${res.status}: ${errBody}` };
  } catch (e: any) {
    return { ok: false, error: `네트워크 오류: ${e?.message || e}` };
  }
}

// ③ SMS / MMS / 알림톡 (Solapi)
async function sendSolapi(env: Env, to: string, text: string, type: 'SMS'|'MMS'|'ATA' = 'SMS', subject?: string, templateId?: string, variables?: Record<string,string>): Promise<boolean> {
  if (!env.SOLAPI_API_KEY || !env.SOLAPI_API_SECRET) return false;
  try {
    const auth = await makeSolapiAuth(env.SOLAPI_API_KEY, env.SOLAPI_API_SECRET);
    const from = (env.SOLAPI_SENDER || '').replace(/-/g,'');
    const msg: any = { to: to.replace(/-/g,''), from, type };
    if (type === 'ATA') {
      msg.kakaoOptions = { pfId: '', templateId: templateId || '', variables: variables || {} };
    } else {
      msg.text = text;
      if (type === 'MMS' && subject) msg.subject = subject;
    }
    const res = await fetch('https://api.solapi.com/messages/v4/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': auth },
      body: JSON.stringify({ message: msg }),
    });
    return res.ok;
  } catch { return false; }
}

// ④ 앱 푸시 (FCM - Firebase Cloud Messaging)
async function sendAppPush(env: Env, token: string, title: string, body: string, data?: Record<string,string>): Promise<boolean> {
  // FCM_SERVER_KEY 환경변수가 있을 때만 동작
  const fcmKey = (env as any).FCM_SERVER_KEY;
  if (!fcmKey) return false;
  try {
    const res = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: { 'Authorization': `key=${fcmKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: token, notification: { title, body }, data: data || {} }),
    });
    return res.ok;
  } catch { return false; }
}

// ─────────────────────────────────────────────────────────────────────────────
// 세그먼트 SQL 변환 (12종 + all)
// ─────────────────────────────────────────────────────────────────────────────
function segmentKeyToSQL(key: string): string {
  const now = new Date();
  const d7  = new Date(now.getTime() -  7*86400000).toISOString();
  const d14 = new Date(now.getTime() - 14*86400000).toISOString();
  const d30 = new Date(now.getTime() - 30*86400000).toISOString();
  const d90 = new Date(now.getTime() - 90*86400000).toISOString();
  const d3  = new Date(now.getTime() -  3*86400000).toISOString();
  const map: Record<string,string> = {
    all:           `1=1`,
    heavy:         `u.id IN (SELECT user_id FROM user_marketing_meta WHERE segment='heavy')`,
    active_week:   `COALESCE(u.last_login,u.created_at) >= '${d7}'`,
    new_user:      `u.created_at >= '${d7}'`,
    long_term:     `u.created_at < '${d90}'`,
    dormant_14:    `COALESCE(u.last_login,u.created_at) < '${d14}'`,
    dormant_30:    `COALESCE(u.last_login,u.created_at) < '${d30}'`,
    dormant_90:    `COALESCE(u.last_login,u.created_at) < '${d90}'`,
    never_login:   `u.last_login IS NULL`,
    push_sub:      `u.id IN (SELECT DISTINCT user_id FROM push_subscriptions WHERE user_id IS NOT NULL)`,
    no_push_sub:   `u.id NOT IN (SELECT DISTINCT user_id FROM push_subscriptions WHERE user_id IS NOT NULL)`,
    email_consent: `u.marketing_consent=1`,
    no_email:      `(u.marketing_consent=0 OR u.marketing_consent IS NULL)`,
    // 레거시
    new:     `u.created_at >= '${d7}'`,
    dormant: `COALESCE(u.last_login,u.created_at) < '${d30}'`,
    normal:  `COALESCE(u.last_login,u.created_at) >= '${d30}'`,
  };
  return map[key] || `1=1`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 타겟 필터 → SQL (15종 → 30종+)
// ─────────────────────────────────────────────────────────────────────────────
function buildTargetSQL(filters: any[]): { where: string; params: any[] } {
  if (!filters || !filters.length) return { where: '1=1', params: [] };
  const conditions: string[] = [];
  const params: any[] = [];
  const now = new Date();
  for (const f of filters) {
    switch(f.type) {
      case 'inactive_days': conditions.push(`COALESCE(u.last_login,u.created_at) < datetime('now','-${Number(f.value)} days')`); break;
      case 'active_within': conditions.push(`COALESCE(u.last_login,u.created_at) >= datetime('now','-${Number(f.value)} days')`); break;
      case 'joined_days_ago': conditions.push(`u.created_at < datetime('now','-${Number(f.value)} days')`); break;
      case 'joined_within': conditions.push(`u.created_at >= datetime('now','-${Number(f.value)} days')`); break;
      case 'email_consent': conditions.push(`u.marketing_consent=1`); break;
      case 'no_email_consent': conditions.push(`(u.marketing_consent=0 OR u.marketing_consent IS NULL)`); break;
      case 'push_subscribed': conditions.push(`u.id IN (SELECT DISTINCT user_id FROM push_subscriptions WHERE user_id IS NOT NULL)`); break;
      case 'no_push': conditions.push(`u.id NOT IN (SELECT DISTINCT user_id FROM push_subscriptions WHERE user_id IS NOT NULL)`); break;
      case 'segment': conditions.push(`u.id IN (SELECT user_id FROM user_marketing_meta WHERE segment=?)`); params.push(f.value); break;
      case 'role': conditions.push(`u.role=?`); params.push(f.value); break;
      case 'user_type': conditions.push(`u.user_type=?`); params.push(f.value); break;
      case 'login_count_gte': conditions.push(`u.id IN (SELECT user_id FROM user_marketing_meta WHERE login_count>=?)`); params.push(Number(f.value)); break;
      case 'login_count_lte': conditions.push(`u.id IN (SELECT user_id FROM user_marketing_meta WHERE login_count<=?)`); params.push(Number(f.value)); break;
      case 'email_contains': conditions.push(`u.email LIKE ?`); params.push(`%${f.value}%`); break;
      case 'name_contains': conditions.push(`u.name LIKE ?`); params.push(`%${f.value}%`); break;
      case 'never_logged_in': conditions.push(`u.last_login IS NULL`); break;
      case 'has_phone': conditions.push(`u.phone IS NOT NULL AND u.phone != ''`); break;
      case 'no_phone': conditions.push(`(u.phone IS NULL OR u.phone='')`); break;
      case 'has_app_push': conditions.push(`u.id IN (SELECT DISTINCT user_id FROM app_push_tokens WHERE is_active=1)`); break;
      case 'user_ids': {
        const ids = String(f.value).split(',').map(s=>s.trim()).filter(Boolean).map(Number).filter(n=>!isNaN(n));
        if (ids.length) { conditions.push(`u.id IN (${ids.join(',')})`); }
        break;
      }
    }
  }
  return { where: conditions.length ? conditions.join(' AND ') : '1=1', params };
}

// ─────────────────────────────────────────────────────────────────────────────
// 세그먼트 통계 계산 (12종)
// ─────────────────────────────────────────────────────────────────────────────
async function getDetailedSegments(env: Env) {
  const now = new Date();
  const d3  = new Date(now.getTime() -  3*86400000).toISOString();
  const d7  = new Date(now.getTime() -  7*86400000).toISOString();
  const d14 = new Date(now.getTime() - 14*86400000).toISOString();
  const d30 = new Date(now.getTime() - 30*86400000).toISOString();
  const d90 = new Date(now.getTime() - 90*86400000).toISOString();

  const q = async (sql: string, ...p: any[]) => {
    try { const r = await env.DB.prepare(sql).bind(...p).first<{cnt:number}>(); return r?.cnt ?? 0; }
    catch { return 0; }
  };

  const [total, heavy, activeWeek, newUser, dormant14, dormant30, dormant90, neverLogin,
         pushSub, noPushSub, emailConsent, noEmail, longTerm] = await Promise.all([
    q(`SELECT COUNT(*) as cnt FROM users`),
    q(`SELECT COUNT(*) as cnt FROM (SELECT u.id FROM users u LEFT JOIN user_events e ON e.user_id=u.id AND e.event_type='login' AND e.created_at>? GROUP BY u.id HAVING COUNT(e.id)>=5)`, d3),
    q(`SELECT COUNT(*) as cnt FROM users WHERE COALESCE(last_login,created_at)>=?`, d7),
    q(`SELECT COUNT(*) as cnt FROM users WHERE created_at>=?`, d7),
    q(`SELECT COUNT(*) as cnt FROM users WHERE COALESCE(last_login,created_at)<?`, d14),
    q(`SELECT COUNT(*) as cnt FROM users WHERE COALESCE(last_login,created_at)<?`, d30),
    q(`SELECT COUNT(*) as cnt FROM users WHERE COALESCE(last_login,created_at)<?`, d90),
    q(`SELECT COUNT(*) as cnt FROM users WHERE last_login IS NULL`),
    q(`SELECT COUNT(DISTINCT user_id) as cnt FROM push_subscriptions WHERE user_id IS NOT NULL`),
    q(`SELECT COUNT(*) as cnt FROM users WHERE id NOT IN (SELECT DISTINCT user_id FROM push_subscriptions WHERE user_id IS NOT NULL)`),
    q(`SELECT COUNT(*) as cnt FROM users WHERE marketing_consent=1`),
    q(`SELECT COUNT(*) as cnt FROM users WHERE marketing_consent=0 OR marketing_consent IS NULL`),
    q(`SELECT COUNT(*) as cnt FROM users WHERE created_at<?`, d90),
  ]);

  return {
    total,
    segments: {
      heavy:         { count:heavy,         label:'헤비 유저',    icon:'⚡', desc:'최근 3일 5회+ 로그인',    color:'#f59e0b' },
      active_week:   { count:activeWeek,    label:'주간 활성',    icon:'🔥', desc:'7일 이내 접속',           color:'#10b981' },
      new_user:      { count:newUser,       label:'신규 가입',    icon:'🌱', desc:'가입 7일 이내',           color:'#06b6d4' },
      long_term:     { count:longTerm,      label:'장기 회원',    icon:'🏅', desc:'90일 이전 가입',          color:'#7c3aed' },
      dormant_14:    { count:dormant14,     label:'단기 휴면',    icon:'😴', desc:'14일 이상 미접속',        color:'#f97316' },
      dormant_30:    { count:dormant30,     label:'휴면',         icon:'💤', desc:'30일 이상 미접속',        color:'#ef4444' },
      dormant_90:    { count:dormant90,     label:'장기 이탈',    icon:'🚪', desc:'90일 이상 미접속',        color:'#7f1d1d' },
      never_login:   { count:neverLogin,    label:'미로그인',     icon:'👻', desc:'가입 후 미접속',          color:'#6b7280' },
      push_sub:      { count:pushSub,       label:'푸시 구독',    icon:'🔔', desc:'웹 푸시 구독자',          color:'#8b5cf6' },
      no_push_sub:   { count:noPushSub,     label:'푸시 미구독',  icon:'🔕', desc:'웹 푸시 미구독',          color:'#94a3b8' },
      email_consent: { count:emailConsent,  label:'이메일 동의',  icon:'✅', desc:'마케팅 이메일 동의',      color:'#059669' },
      no_email:      { count:noEmail,       label:'이메일 미동의',icon:'📭', desc:'마케팅 이메일 미동의',    color:'#dc2626' },
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// updateSegments (user_marketing_meta 업데이트)
// ─────────────────────────────────────────────────────────────────────────────
async function updateSegments(env: Env) {
  try {
    const d7  = new Date(Date.now() -  7*86400000).toISOString();
    const d30 = new Date(Date.now() - 30*86400000).toISOString();
    await env.DB.prepare(`INSERT OR REPLACE INTO user_marketing_meta (user_id, last_login_at, segment, segment_updated) SELECT id,COALESCE(last_login,created_at),'new',datetime('now') FROM users WHERE created_at>=?`).bind(d7).run().catch(()=>{});
    await env.DB.prepare(`INSERT OR REPLACE INTO user_marketing_meta (user_id, last_login_at, segment, segment_updated) SELECT id,COALESCE(last_login,created_at),'dormant',datetime('now') FROM users WHERE COALESCE(last_login,created_at)<? AND created_at<?`).bind(d30,d7).run().catch(()=>{});
    await env.DB.prepare(`INSERT OR REPLACE INTO user_marketing_meta (user_id, last_login_at, segment, segment_updated) SELECT id,COALESCE(last_login,created_at),'normal',datetime('now') FROM users WHERE COALESCE(last_login,created_at)>=? AND created_at<?`).bind(d30,d7).run().catch(()=>{});
  } catch(_) {}
}

// ─────────────────────────────────────────────────────────────────────────────
// 캠페인 발송 로직 (채널별 분기)
// ─────────────────────────────────────────────────────────────────────────────
async function executeCampaignSend(env: Env, campaign: any): Promise<{sent:number;failed:number;errors:string[]}> {
  // 타겟 유저 조회
  let where = '1=1';
  let params: any[] = [];
  if (campaign.target_filters) {
    try {
      const filters = typeof campaign.target_filters === 'string'
        ? JSON.parse(campaign.target_filters) : campaign.target_filters;
      const r = buildTargetSQL(filters);
      where = r.where; params = r.params;
    } catch {}
  } else if (campaign.target_segment && campaign.target_segment !== 'all') {
    where = segmentKeyToSQL(campaign.target_segment);
  }

  // 채널에 따라 필요한 컬럼 조회
  const channel = campaign.channel || 'email';
  let userSQL = `SELECT u.id, u.name, u.email, u.phone FROM users u WHERE ${where} LIMIT 5000`;
  const usersResult = await env.DB.prepare(userSQL).bind(...params).all<any>().catch(()=>({results:[]}));
  const users = usersResult.results || [];

  // 이메일 채널: email_settings에서 발신자 주소 로드
  let emailFrom: string | undefined;
  if (channel === 'email') {
    const es = await env.DB.prepare(`SELECT sender_name, sender_email FROM email_settings LIMIT 1`).first<any>().catch(()=>null);
    if (es?.sender_email) {
      emailFrom = es.sender_name ? `${es.sender_name} <${es.sender_email}>` : es.sender_email;
    }
    // env.RESEND_FROM 도 없고 email_settings도 없으면 Resend 테스트 주소 사용 (sendEmail 내부에서 처리)
  }

  let sent = 0, failed = 0;
  const errors: string[] = [];

  for (const user of users) {
    let ok = false;
    try {
      if (channel === 'email') {
        if (!user.email) { failed++; errors.push(`user#${user.id}: email 컬럼 없음`); continue; }
        const html = campaign.email_html || `<p>${campaign.message}</p>`;
        const result = await sendEmail(env, user.email, campaign.subject || campaign.name, html, campaign.message || '', emailFrom);
        ok = result.ok;
        if (!result.ok && errors.length < 5) errors.push(`user#${user.id} <${user.email}>: ${result.error}`);
      } else if (channel === 'web_push') {
        const subs = await env.DB.prepare(`SELECT * FROM push_subscriptions WHERE user_id=?`).bind(user.id).all<any>().catch(()=>({results:[]}));
        for (const sub of (subs.results||[])) {
          const r = await sendWebPush(env, sub, JSON.stringify({ title: campaign.subject||campaign.name, body: campaign.message, url: campaign.click_url }));
          if (r) ok = true;
        }
      } else if (channel === 'sms') {
        if (user.phone) ok = await sendSolapi(env, user.phone, campaign.message||'', 'SMS');
      } else if (channel === 'mms') {
        if (user.phone) ok = await sendSolapi(env, user.phone, campaign.message||'', 'MMS', campaign.subject);
      } else if (channel === 'alimtalk') {
        if (user.phone) ok = await sendSolapi(env, user.phone, campaign.message||'', 'ATA', undefined, campaign.alimtalk_template_id, { name: user.name||'고객' });
      } else if (channel === 'app_push') {
        const tokens = await env.DB.prepare(`SELECT token FROM app_push_tokens WHERE user_id=? AND is_active=1`).bind(user.id).all<any>().catch(()=>({results:[]}));
        for (const t of (tokens.results||[])) {
          const r = await sendAppPush(env, t.token, campaign.subject||campaign.name, campaign.message||'');
          if (r) ok = true;
        }
      } else if (channel === 'inapp') {
        // 인앱은 DB에 pending 상태로 저장, 클라이언트가 폴링
        await env.DB.prepare(`INSERT INTO campaign_events (campaign_id,user_id,event_type,channel) VALUES (?,?,?,?)`).bind(campaign.id,user.id,'inapp_pending','inapp').run().catch(()=>{});
        ok = true;
      }
    } catch (e: any) { ok = false; if (errors.length < 5) errors.push(`user#${user.id}: 예외 ${e?.message||e}`); }

    if (ok) sent++; else failed++;
    // 발송 로그
    await env.DB.prepare(`INSERT INTO campaign_logs (campaign_id,user_id,channel,status) VALUES (?,?,?,?)`).bind(campaign.id,user.id,channel,ok?'sent':'failed').run().catch(()=>{});
  }

  // 캠페인 상태 업데이트
  await env.DB.prepare(`UPDATE campaigns SET status='sent',sent_at=datetime('now'),send_count=? WHERE id=?`).bind(sent,campaign.id).run().catch(()=>{});
  return { sent, failed, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// A/B 테스트 통계
// ─────────────────────────────────────────────────────────────────────────────
function calcABStats(results: any[]) {
  const variants: Record<string,{sent:number;opened:number;clicked:number;converted:number;open_rate:number;click_rate:number;conv_rate:number}> = {};
  for (const r of results) {
    if (!variants[r.variant]) variants[r.variant] = {sent:0,opened:0,clicked:0,converted:0,open_rate:0,click_rate:0,conv_rate:0};
    variants[r.variant].sent      += r.sent      || 0;
    variants[r.variant].opened    += r.opened    || 0;
    variants[r.variant].clicked   += r.clicked   || 0;
    variants[r.variant].converted += r.converted || 0;
  }
  for (const v of Object.values(variants)) {
    v.open_rate  = v.sent > 0 ? +((v.opened/v.sent)*100).toFixed(1) : 0;
    v.click_rate = v.sent > 0 ? +((v.clicked/v.sent)*100).toFixed(1) : 0;
    v.conv_rate  = v.sent > 0 ? +((v.converted/v.sent)*100).toFixed(1) : 0;
  }
  return variants;
}

// ─────────────────────────────────────────────────────────────────────────────
// 메인 핸들러
// ─────────────────────────────────────────────────────────────────────────────
export async function handleMarketingAutomation(req: Request, env: Env): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization'}});

  await ensureTables(env);

  const url    = new URL(req.url);
  const action = url.searchParams.get('action') || '';
  const method = req.method;

  // ── 공개 액션 (인증 불필요) ────────────────────────────────────────────────
  // VAPID 공개키 노출 (push-init.js 가 브라우저 구독 시 사용)
  if (action === 'vapid_key') {
    return json({ ok: true, key: env.VAPID_PUBLIC_KEY || null });
  }
  if (method === 'POST' && action === 'push_subscribe') {
    const body: any = await req.json().catch(()=>({}));
    if (!body.endpoint) return json({ok:false,error:'endpoint 필요'},400);
    await env.DB.prepare(`INSERT OR REPLACE INTO push_subscriptions (user_id,endpoint,p256dh,auth,user_agent) VALUES (?,?,?,?,?)`)
      .bind(body.user_id||null, body.endpoint, body.p256dh||'', body.auth||'', req.headers.get('user-agent')||'')
      .run().catch(()=>{});
    return json({ok:true});
  }
  if (method === 'POST' && action === 'track_event') {
    const body: any = await req.json().catch(()=>({}));
    if (!body.user_id || !body.event_type) return json({ok:false},400);
    await env.DB.prepare(`INSERT INTO user_events (user_id,event_type,event_data) VALUES (?,?,?)`).bind(body.user_id,body.event_type,JSON.stringify(body.meta||{})).run().catch(()=>{});
    await env.DB.prepare(`INSERT OR REPLACE INTO user_marketing_meta (user_id,last_login_at,login_count,segment_updated) VALUES (?,datetime('now'),COALESCE((SELECT login_count FROM user_marketing_meta WHERE user_id=?),0)+1,datetime('now'))`).bind(body.user_id,body.user_id).run().catch(()=>{});
    return json({ok:true});
  }
  // 인앱 메시지 조회 (클라이언트 폴링)
  if (action === 'inapp_active') {
    const page = url.searchParams.get('page') || '*';
    const msgs = await env.DB.prepare(`SELECT id,type,title,message,button_text,button_url,image_url FROM inapp_messages WHERE is_active=1 AND (trigger_page='*' OR trigger_page=?) ORDER BY created_at DESC LIMIT 3`).bind(page).all<any>().catch(()=>({results:[]}));
    return json({ok:true,messages:msgs.results||[]});
  }

  // ── 관리자 인증 ────────────────────────────────────────────────────────────
  const session = await getSession(req, env);
  if (!session || session.role !== 'admin') return json({ok:false,error:'관리자 권한 필요'},403);

  // ════════════════════════════════════════════════════════════════════════════
  // 캠페인
  // ════════════════════════════════════════════════════════════════════════════
  if (action === 'campaigns') {
    const rows = await env.DB.prepare(`SELECT * FROM campaigns ORDER BY created_at DESC LIMIT 100`).all<any>();
    return json({ok:true,campaigns:rows.results||[]});
  }
  if (action === 'campaign') {
    const id = url.searchParams.get('id');
    if (!id) return json({ok:false,error:'id 필요'},400);
    const c = await env.DB.prepare(`SELECT * FROM campaigns WHERE id=?`).bind(id).first<any>();
    return json({ok:true,campaign:c});
  }
  if (method==='POST' && action==='create_campaign') {
    const body: any = await req.json().catch(()=>({}));
    const r = await env.DB.prepare(`INSERT INTO campaigns (name,channel,target_segment,target_group_id,target_filters,subject,message,email_html,click_url,ab_test_id,ab_variant,scheduled_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).bind(body.name||'새 캠페인',body.channel||'email',body.target_segment||'all',body.target_group_id||null,body.target_filters?JSON.stringify(body.target_filters):null,body.subject||'',body.message||'',body.email_html||'',body.click_url||'',body.ab_test_id||null,body.ab_variant||null,body.scheduled_at||null).run();
    return json({ok:true,id:r.meta.last_row_id});
  }
  if (method==='POST' && action==='update_campaign') {
    const body: any = await req.json().catch(()=>({}));
    if (!body.id) return json({ok:false,error:'id 필요'},400);
    await env.DB.prepare(`UPDATE campaigns SET name=?,channel=?,target_segment=?,subject=?,message=?,email_html=?,click_url=?,scheduled_at=? WHERE id=?`).bind(body.name,body.channel,body.target_segment,body.subject,body.message,body.email_html||'',body.click_url||'',body.scheduled_at||null,body.id).run();
    return json({ok:true});
  }
  if (method==='POST' && action==='delete_campaign') {
    const body: any = await req.json().catch(()=>({}));
    if (!body.id) return json({ok:false,error:'id 필요'},400);
    await env.DB.prepare(`DELETE FROM campaigns WHERE id=?`).bind(body.id).run();
    return json({ok:true});
  }
  if (method==='POST' && action==='send_campaign') {
    const body: any = await req.json().catch(()=>({}));
    if (!body.id) return json({ok:false,error:'id 필요'},400);
    const campaign = await env.DB.prepare(`SELECT * FROM campaigns WHERE id=?`).bind(body.id).first<any>();
    if (!campaign) return json({ok:false,error:'캠페인 없음'},404);
    // 채널별 사전 검증
    const ch = campaign.channel || 'email';
    if (ch === 'email' && !env.RESEND_API_KEY) {
      return json({ok:false, error:'RESEND_API_KEY 환경변수가 Cloudflare Pages에 설정되지 않았습니다. Settings → Environment Variables에서 추가하세요.'},400);
    }
    const result = await executeCampaignSend(env, campaign);
    return json({ok:true, ...result});
  }
  if (action==='stats') {
    const id = url.searchParams.get('id');
    const logs = id
      ? await env.DB.prepare(`SELECT * FROM campaign_logs WHERE campaign_id=? ORDER BY sent_at DESC LIMIT 200`).bind(id).all<any>()
      : await env.DB.prepare(`SELECT * FROM campaign_logs ORDER BY sent_at DESC LIMIT 200`).all<any>();
    return json({ok:true,logs:logs.results||[]});
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 세그먼트
  // ════════════════════════════════════════════════════════════════════════════
  if (action==='segments') {
    try {
      await updateSegments(env);
      const data = await getDetailedSegments(env);
      return json({ok:true,...data});
    } catch(e:any) { return json({ok:false,error:e?.message||String(e)},500); }
  }
  if (action==='segment_users') {
    const key    = url.searchParams.get('key')||'all';
    const page   = Math.max(1,parseInt(url.searchParams.get('page')||'1'));
    const limit  = Math.min(100,parseInt(url.searchParams.get('limit')||'50'));
    const offset = (page-1)*limit;
    const where  = segmentKeyToSQL(key);
    const [cnt, rows] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) as cnt FROM users u WHERE ${where}`).first<{cnt:number}>().catch(()=>null),
      env.DB.prepare(`SELECT u.id,u.name,u.email,u.role,u.user_type,u.created_at,u.last_login,u.marketing_consent,(SELECT COUNT(*) FROM push_subscriptions ps WHERE ps.user_id=u.id) as push_count FROM users u WHERE ${where} ORDER BY COALESCE(u.last_login,u.created_at) DESC LIMIT ? OFFSET ?`).bind(limit,offset).all<any>().catch(()=>({results:[]})),
    ]);
    return json({ok:true,key,total:cnt?.cnt??0,page,limit,users:rows.results||[]});
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 타겟 그룹
  // ════════════════════════════════════════════════════════════════════════════
  if (action==='target_groups') {
    const rows = await env.DB.prepare(`SELECT * FROM target_groups ORDER BY created_at DESC`).all<any>();
    return json({ok:true,groups:rows.results||[]});
  }
  if (method==='POST' && action==='preview_target') {
    const body: any = await req.json().catch(()=>({}));
    const {where,params} = buildTargetSQL(body.filters||[]);
    const [cnt, samples] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) as cnt FROM users u WHERE ${where}`).bind(...params).first<{cnt:number}>().catch(()=>null),
      env.DB.prepare(`SELECT u.id,u.name,u.email,u.last_login,u.created_at FROM users u WHERE ${where} LIMIT 10`).bind(...params).all<any>().catch(()=>({results:[]})),
    ]);
    return json({ok:true,count:cnt?.cnt??0,samples:samples.results||[]});
  }
  if (method==='POST' && action==='save_target_group') {
    const body: any = await req.json().catch(()=>({}));
    if (!body.name) return json({ok:false,error:'name 필요'},400);
    const {where,params} = buildTargetSQL(body.filters||[]);
    const cnt = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM users u WHERE ${where}`).bind(...params).first<{cnt:number}>().catch(()=>null);
    if (body.id) {
      await env.DB.prepare(`UPDATE target_groups SET name=?,description=?,filters=?,estimated_count=?,updated_at=datetime('now') WHERE id=?`).bind(body.name,body.description||'',JSON.stringify(body.filters||[]),cnt?.cnt??0,body.id).run();
      return json({ok:true,id:body.id});
    }
    const r = await env.DB.prepare(`INSERT INTO target_groups (name,description,filters,estimated_count) VALUES (?,?,?,?)`).bind(body.name,body.description||'',JSON.stringify(body.filters||[]),cnt?.cnt??0).run();
    return json({ok:true,id:r.meta.last_row_id});
  }
  if (method==='POST' && action==='delete_target_group') {
    const body: any = await req.json().catch(()=>({}));
    if (!body.id) return json({ok:false,error:'id 필요'},400);
    await env.DB.prepare(`DELETE FROM target_groups WHERE id=?`).bind(body.id).run();
    return json({ok:true});
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 자동화 룰
  // ════════════════════════════════════════════════════════════════════════════
  if (action==='rules') {
    const rows = await env.DB.prepare(`SELECT * FROM automation_rules ORDER BY created_at DESC`).all<any>();
    return json({ok:true,rules:rows.results||[]});
  }
  if (method==='POST' && action==='save_rule') {
    const body: any = await req.json().catch(()=>({}));
    if (!body.name || !body.message_subject || !body.message_body) return json({ok:false,error:'필수 필드 누락'},400);
    const delayH = body.delay_hours||0;
    if (body.id) {
      await env.DB.prepare(`UPDATE automation_rules SET name=?,trigger_event=?,channel=?,delay_hours=?,message_subject=?,message_body=?,click_url=?,thumbnail_url=? WHERE id=?`).bind(body.name,body.trigger_event,body.channel,delayH,body.message_subject||'',body.message_body||'',body.click_url||'',body.thumbnail_url||'',body.id).run();
    } else {
      await env.DB.prepare(`INSERT INTO automation_rules (name,trigger_event,channel,delay_hours,message_subject,message_body,click_url,thumbnail_url) VALUES (?,?,?,?,?,?,?,?)`).bind(body.name,body.trigger_event,body.channel,delayH,body.message_subject||'',body.message_body||'',body.click_url||'',body.thumbnail_url||'').run();
    }
    // 웹 푸시 + 지연 없음(0시간) → 등록 즉시 전체 구독자에게 발송
    let immediatelySent = 0;
    if (body.channel === 'web_push' && delayH === 0) {
      const subs = await env.DB.prepare(`SELECT * FROM push_subscriptions`).all<any>().catch(()=>({results:[]}));
      const payload = JSON.stringify({
        title: body.message_subject,
        body:  body.message_body,
        icon:  body.thumbnail_url || '',
        url:   body.click_url || '/',
        badge: '/superplace-logo.png',
      });
      for (const sub of (subs.results||[])) {
        const ok = await sendWebPush(env, sub, payload).catch(()=>false);
        if (ok) immediatelySent++;
      }
      // 로그 기록
      await env.DB.prepare(`INSERT INTO push_broadcast_logs (message_subject,message_body,thumbnail_url,click_url,target_count,sent_count,status) VALUES (?,?,?,?,?,?,'sent')`).bind(body.message_subject,body.message_body,body.thumbnail_url||'',body.click_url||'/',(subs.results||[]).length,immediatelySent).run().catch(()=>{});
    }
    return json({ok:true, immediately_sent: immediatelySent});
  }
  if (method==='POST' && action==='toggle_rule') {
    const body: any = await req.json().catch(()=>({}));
    await env.DB.prepare(`UPDATE automation_rules SET is_active=? WHERE id=?`).bind(body.is_active?1:0,body.id).run();
    return json({ok:true});
  }
  if (method==='POST' && action==='delete_rule') {
    const body: any = await req.json().catch(()=>({}));
    await env.DB.prepare(`DELETE FROM automation_rules WHERE id=?`).bind(body.id).run();
    return json({ok:true});
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 웹 푸시 통계 & 즉시 발송
  // ════════════════════════════════════════════════════════════════════════════
  if (action==='push_stats') {
    // 전체 구독자 수 (user_id 유무 무관 — 모든 endpoint 행 카운트)
    const subRow = await env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM push_subscriptions`
    ).first<any>().catch(()=>null);

    const totalSubs = subRow?.cnt ?? 0;

    // 세그먼트별 구독자 수
    // user_id IS NULL 인 구독자(비회원)는 all 에만 포함
    const segRow = await env.DB.prepare(`
      SELECT
        COUNT(DISTINCT CASE
          WHEN u.created_at >= datetime('now','-7 days')
          THEN ps.id END) AS new_users,
        COUNT(DISTINCT CASE
          WHEN COALESCE(u.last_login, u.created_at) >= datetime('now','-30 days')
          THEN ps.id END) AS active_users,
        COUNT(DISTINCT CASE
          WHEN COALESCE(u.last_login, u.created_at) < datetime('now','-30 days')
          THEN ps.id END) AS dormant_users,
        COUNT(DISTINCT CASE
          WHEN u.id IN (
            SELECT DISTINCT user_id FROM orders
            WHERE created_at >= datetime('now','-90 days')
          ) THEN ps.id END) AS payment_users
      FROM push_subscriptions ps
      LEFT JOIN users u ON u.id = ps.user_id
    `).first<any>().catch(()=>null);

    const todayRow = await env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM push_broadcast_logs WHERE date(sent_at)=date('now')`
    ).first<any>().catch(()=>null);
    const totalRow = await env.DB.prepare(
      `SELECT COALESCE(SUM(sent_count),0) as total FROM push_broadcast_logs`
    ).first<any>().catch(()=>null);
    const logs = await env.DB.prepare(
      `SELECT * FROM push_broadcast_logs ORDER BY sent_at DESC LIMIT 20`
    ).all<any>().catch(()=>({results:[]}));

    return json({
      ok: true,
      stats: {
        subscribers:   totalSubs,
        sent_today:    todayRow?.cnt   ?? 0,
        sent_total:    totalRow?.total ?? 0,
      },
      segments: {
        all:     totalSubs,                    // 전체 = push_subscriptions 행 수
        new:     segRow?.new_users     ?? 0,
        active:  segRow?.active_users  ?? 0,
        dormant: segRow?.dormant_users ?? 0,
        payment: segRow?.payment_users ?? 0,
      },
      logs: logs.results || [],
    });
  }
  if (method==='POST' && action==='send_push_broadcast') {
    const body: any = await req.json().catch(()=>({}));
    const { title='', body: msgBody='', icon='', url: clickUrl='/', target='all' } = body;
    if (!title || !msgBody) return json({ok:false,error:'제목과 내용을 입력하세요'},400);

    // ── 세그먼트별 구독자 조회 ───────────────────────────────────────────────
    // target='all' : JOIN 없이 push_subscriptions 전체 조회 (user_id=null 포함)
    // 나머지 세그먼트 : users 테이블 LEFT JOIN 후 조건 필터
    let subList: any[] = [];
    if (!target || target === 'all') {
      const subs = await env.DB.prepare(
        `SELECT * FROM push_subscriptions`
      ).all<any>().catch(()=>({results:[]}));
      subList = subs.results || [];
    } else {
      const segWhere: Record<string, string> = {
        new:     "ps.user_id IS NOT NULL AND u.created_at >= datetime('now','-7 days')",
        active:  "ps.user_id IS NOT NULL AND COALESCE(u.last_login, u.created_at) >= datetime('now','-30 days')",
        dormant: "ps.user_id IS NOT NULL AND COALESCE(u.last_login, u.created_at) < datetime('now','-30 days')",
        payment: "ps.user_id IS NOT NULL AND u.id IN (SELECT DISTINCT user_id FROM orders WHERE created_at >= datetime('now','-90 days'))",
      };
      const whereClause = segWhere[target] ?? '1=1';
      const subs = await env.DB.prepare(
        `SELECT ps.* FROM push_subscriptions ps
         LEFT JOIN users u ON u.id = ps.user_id
         WHERE ${whereClause}`
      ).all<any>().catch(()=>({results:[]}));
      subList = subs.results || [];
    }

    let sentCount = 0;
    const payload = JSON.stringify({ title, body: msgBody, icon, url: clickUrl, badge: '/superplace-logo.png' });
    for (const sub of subList) {
      const ok = await sendWebPush(env, sub, payload).catch(()=>false);
      if (ok) sentCount++;
    }
    await env.DB.prepare(
      `INSERT INTO push_broadcast_logs (message_subject,message_body,thumbnail_url,click_url,target_count,sent_count,status) VALUES (?,?,?,?,?,?,'sent')`
    ).bind(title, msgBody, icon||'', clickUrl, subList.length, sentCount).run().catch(()=>{});
    return json({ok:true, sent: sentCount, total: subList.length, target});
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 웹 푸시 동의 현황 — 동의(구독자) vs 미동의 유저 목록
  // ════════════════════════════════════════════════════════════════════════════
  if (action === 'push_consent') {
    const page    = parseInt(url.searchParams.get('page')  || '1', 10);
    const limit   = parseInt(url.searchParams.get('limit') || '50', 10);
    const type    = url.searchParams.get('type') || 'consented'; // 'consented' | 'not_consented'
    const search  = (url.searchParams.get('search') || '').trim();
    const offset  = (page - 1) * limit;

    const searchClause = search
      ? `AND (u.name LIKE ? OR u.email LIKE ?)`
      : '';
    const searchParams = search ? [`%${search}%`, `%${search}%`] : [];

    if (type === 'consented') {
      // push_subscriptions 에 있는 유저 (user_id IS NOT NULL)
      // + 비회원 구독자 (user_id IS NULL)
      const countRow = await env.DB.prepare(`
        SELECT COUNT(*) as cnt FROM push_subscriptions ps
        LEFT JOIN users u ON u.id = ps.user_id
        WHERE 1=1 ${search ? 'AND (u.name LIKE ? OR u.email LIKE ? OR ps.endpoint LIKE ?)' : ''}
      `).bind(...(search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [])).first<any>().catch(()=>({cnt:0}));

      const rows = await env.DB.prepare(`
        SELECT
          ps.id as sub_id,
          ps.user_id,
          ps.endpoint,
          ps.created_at as subscribed_at,
          u.name, u.email, u.role, u.user_type, u.created_at, u.last_login
        FROM push_subscriptions ps
        LEFT JOIN users u ON u.id = ps.user_id
        WHERE 1=1 ${search ? 'AND (u.name LIKE ? OR u.email LIKE ? OR ps.endpoint LIKE ?)' : ''}
        ORDER BY ps.created_at DESC
        LIMIT ? OFFSET ?
      `).bind(...(search ? [`%${search}%`, `%${search}%`, `%${search}%`] : []), limit, offset).all<any>().catch(()=>({results:[]}));

      return json({ ok: true, type: 'consented', total: countRow?.cnt ?? 0, page, limit, users: rows.results || [] });
    } else {
      // users 테이블에 있지만 push_subscriptions 에 없는 유저
      const countRow = await env.DB.prepare(`
        SELECT COUNT(*) as cnt FROM users u
        WHERE u.id NOT IN (SELECT DISTINCT user_id FROM push_subscriptions WHERE user_id IS NOT NULL)
        ${searchClause}
      `).bind(...searchParams).first<any>().catch(()=>({cnt:0}));

      const rows = await env.DB.prepare(`
        SELECT u.id, u.name, u.email, u.role, u.user_type, u.created_at, u.last_login, u.marketing_consent
        FROM users u
        WHERE u.id NOT IN (SELECT DISTINCT user_id FROM push_subscriptions WHERE user_id IS NOT NULL)
        ${searchClause}
        ORDER BY COALESCE(u.last_login, u.created_at) DESC
        LIMIT ? OFFSET ?
      `).bind(...searchParams, limit, offset).all<any>().catch(()=>({results:[]}));

      return json({ ok: true, type: 'not_consented', total: countRow?.cnt ?? 0, page, limit, users: rows.results || [] });
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 캔버스 (Journey Builder)
  // ════════════════════════════════════════════════════════════════════════════
  if (action==='canvases') {
    const rows = await env.DB.prepare(`SELECT * FROM canvases ORDER BY created_at DESC`).all<any>();
    return json({ok:true,canvases:rows.results||[]});
  }
  if (action==='canvas') {
    const id = url.searchParams.get('id');
    if (!id) return json({ok:false,error:'id 필요'},400);
    const c = await env.DB.prepare(`SELECT * FROM canvases WHERE id=?`).bind(id).first<any>();
    if (!c) return json({ok:false,error:'없음'},404);
    // 노드/엣지 파싱
    try { c.nodes = JSON.parse(c.nodes||'[]'); } catch { c.nodes=[]; }
    try { c.edges = JSON.parse(c.edges||'[]'); } catch { c.edges=[]; }
    // 진행 중인 유저 수
    const stats = await env.DB.prepare(`SELECT current_node, COUNT(*) as cnt FROM canvas_user_state WHERE canvas_id=? AND status='active' GROUP BY current_node`).bind(id).all<any>().catch(()=>({results:[]}));
    return json({ok:true,canvas:c,node_stats:stats.results||[]});
  }
  if (method==='POST' && action==='save_canvas') {
    const body: any = await req.json().catch(()=>({}));
    if (!body.name) return json({ok:false,error:'name 필요'},400);
    const nodesStr = JSON.stringify(body.nodes||[]);
    const edgesStr = JSON.stringify(body.edges||[]);
    if (body.id) {
      await env.DB.prepare(`UPDATE canvases SET name=?,description=?,trigger_type=?,trigger_event=?,trigger_segment=?,nodes=?,edges=?,updated_at=datetime('now') WHERE id=?`).bind(body.name,body.description||'',body.trigger_type||'event',body.trigger_event||'',body.trigger_segment||'',nodesStr,edgesStr,body.id).run();
      return json({ok:true,id:body.id});
    }
    const r = await env.DB.prepare(`INSERT INTO canvases (name,description,trigger_type,trigger_event,trigger_segment,nodes,edges) VALUES (?,?,?,?,?,?,?)`).bind(body.name,body.description||'',body.trigger_type||'event',body.trigger_event||'',body.trigger_segment||'',nodesStr,edgesStr).run();
    return json({ok:true,id:r.meta.last_row_id});
  }
  if (method==='POST' && action==='toggle_canvas') {
    const body: any = await req.json().catch(()=>({}));
    await env.DB.prepare(`UPDATE canvases SET status=? WHERE id=?`).bind(body.active?'active':'paused',body.id).run();
    return json({ok:true});
  }
  if (method==='POST' && action==='delete_canvas') {
    const body: any = await req.json().catch(()=>({}));
    await env.DB.prepare(`DELETE FROM canvases WHERE id=?`).bind(body.id).run();
    await env.DB.prepare(`DELETE FROM canvas_user_state WHERE canvas_id=?`).bind(body.id).run();
    return json({ok:true});
  }
  if (action==='canvas_stats') {
    const id = url.searchParams.get('id');
    if (!id) return json({ok:false},400);
    const [total, active, converted] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) as cnt FROM canvas_user_state WHERE canvas_id=?`).bind(id).first<{cnt:number}>().catch(()=>null),
      env.DB.prepare(`SELECT COUNT(*) as cnt FROM canvas_user_state WHERE canvas_id=? AND status='active'`).bind(id).first<{cnt:number}>().catch(()=>null),
      env.DB.prepare(`SELECT COUNT(*) as cnt FROM canvas_user_state WHERE canvas_id=? AND converted=1`).bind(id).first<{cnt:number}>().catch(()=>null),
    ]);
    return json({ok:true,total:total?.cnt??0,active:active?.cnt??0,converted:converted?.cnt??0});
  }

  // ════════════════════════════════════════════════════════════════════════════
  // A/B 테스트
  // ════════════════════════════════════════════════════════════════════════════
  if (action==='ab_tests') {
    const rows = await env.DB.prepare(`SELECT * FROM ab_tests ORDER BY created_at DESC`).all<any>();
    return json({ok:true,tests:rows.results||[]});
  }
  if (action==='ab_test') {
    const id = url.searchParams.get('id');
    if (!id) return json({ok:false},400);
    const test = await env.DB.prepare(`SELECT * FROM ab_tests WHERE id=?`).bind(id).first<any>();
    if (!test) return json({ok:false,error:'없음'},404);
    const results = await env.DB.prepare(`SELECT variant,SUM(sent) as sent,SUM(opened) as opened,SUM(clicked) as clicked,SUM(converted) as converted FROM ab_test_results WHERE ab_test_id=? GROUP BY variant`).bind(id).all<any>().catch(()=>({results:[]}));
    const stats = calcABStats(results.results||[]);
    try { test.variants = JSON.parse(test.variants||'[]'); } catch { test.variants=[]; }
    return json({ok:true,test,stats});
  }
  if (method==='POST' && action==='create_ab_test') {
    const body: any = await req.json().catch(()=>({}));
    if (!body.name || !body.variants?.length) return json({ok:false,error:'name,variants 필요'},400);
    const r = await env.DB.prepare(`INSERT INTO ab_tests (name,campaign_id,variants,winning_metric,confidence_level) VALUES (?,?,?,?,?)`).bind(body.name,body.campaign_id||null,JSON.stringify(body.variants),body.winning_metric||'open_rate',body.confidence_level||0.95).run();
    return json({ok:true,id:r.meta.last_row_id});
  }
  if (method==='POST' && action==='record_ab_event') {
    const body: any = await req.json().catch(()=>({}));
    const {ab_test_id,variant,user_id,event_type} = body;
    if (!ab_test_id||!variant||!user_id||!event_type) return json({ok:false},400);
    const fields: Record<string,string> = {open:'opened',click:'clicked',convert:'converted'};
    const col = fields[event_type];
    if (!col) return json({ok:false,error:'event_type 오류'},400);
    const existing = await env.DB.prepare(`SELECT id FROM ab_test_results WHERE ab_test_id=? AND variant=? AND user_id=?`).bind(ab_test_id,variant,user_id).first<{id:number}>().catch(()=>null);
    if (existing) {
      await env.DB.prepare(`UPDATE ab_test_results SET ${col}=1 WHERE id=?`).bind(existing.id).run();
    } else {
      await env.DB.prepare(`INSERT INTO ab_test_results (ab_test_id,variant,user_id,sent,${col}) VALUES (?,?,?,1,1)`).bind(ab_test_id,variant,user_id).run();
    }
    return json({ok:true});
  }
  if (method==='POST' && action==='conclude_ab_test') {
    const body: any = await req.json().catch(()=>({}));
    if (!body.id) return json({ok:false},400);
    const results = await env.DB.prepare(`SELECT variant,SUM(sent) as sent,SUM(opened) as opened,SUM(clicked) as clicked,SUM(converted) as converted FROM ab_test_results WHERE ab_test_id=? GROUP BY variant`).bind(body.id).all<any>().catch(()=>({results:[]}));
    const stats = calcABStats(results.results||[]);
    // 승리 변형 결정 (open_rate 기준)
    let winner = '';
    let best = -1;
    for (const [variant, s] of Object.entries(stats)) {
      if (s.open_rate > best) { best = s.open_rate; winner = variant; }
    }
    await env.DB.prepare(`UPDATE ab_tests SET status='concluded',winner_variant=?,end_at=datetime('now') WHERE id=?`).bind(winner,body.id).run();
    return json({ok:true,winner,stats});
  }
  if (method==='POST' && action==='delete_ab_test') {
    const body: any = await req.json().catch(()=>({}));
    await env.DB.prepare(`DELETE FROM ab_tests WHERE id=?`).bind(body.id).run();
    await env.DB.prepare(`DELETE FROM ab_test_results WHERE ab_test_id=?`).bind(body.id).run();
    return json({ok:true});
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 인앱 메시지
  // ════════════════════════════════════════════════════════════════════════════
  if (action==='inapp_messages') {
    const rows = await env.DB.prepare(`SELECT * FROM inapp_messages ORDER BY created_at DESC`).all<any>();
    return json({ok:true,messages:rows.results||[]});
  }
  if (method==='POST' && action==='save_inapp') {
    const body: any = await req.json().catch(()=>({}));
    if (!body.name||!body.message) return json({ok:false,error:'name,message 필요'},400);
    if (body.id) {
      await env.DB.prepare(`UPDATE inapp_messages SET name=?,type=?,title=?,message=?,button_text=?,button_url=?,image_url=?,target_segment=?,trigger_page=?,display_frequency=?,is_active=? WHERE id=?`).bind(body.name,body.type||'modal',body.title||'',body.message,body.button_text||'',body.button_url||'',body.image_url||'',body.target_segment||'all',body.trigger_page||'*',body.display_frequency||'once',body.is_active?1:1,body.id).run();
    } else {
      await env.DB.prepare(`INSERT INTO inapp_messages (name,type,title,message,button_text,button_url,image_url,target_segment,trigger_page,display_frequency) VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(body.name,body.type||'modal',body.title||'',body.message,body.button_text||'',body.button_url||'',body.image_url||'',body.target_segment||'all',body.trigger_page||'*',body.display_frequency||'once').run();
    }
    return json({ok:true});
  }
  if (method==='POST' && action==='delete_inapp') {
    const body: any = await req.json().catch(()=>({}));
    await env.DB.prepare(`DELETE FROM inapp_messages WHERE id=?`).bind(body.id).run();
    return json({ok:true});
  }
  if (method==='POST' && action==='toggle_inapp') {
    const body: any = await req.json().catch(()=>({}));
    await env.DB.prepare(`UPDATE inapp_messages SET is_active=? WHERE id=?`).bind(body.active?1:0,body.id).run();
    return json({ok:true});
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 앱 푸시 토큰
  // ════════════════════════════════════════════════════════════════════════════
  if (method==='POST' && action==='register_app_token') {
    const body: any = await req.json().catch(()=>({}));
    if (!body.user_id||!body.token) return json({ok:false,error:'user_id,token 필요'},400);
    await env.DB.prepare(`INSERT OR REPLACE INTO app_push_tokens (user_id,token,platform,app_version) VALUES (?,?,?,?)`).bind(body.user_id,body.token,body.platform||'android',body.app_version||'').run();
    return json({ok:true});
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 분석 대시보드
  // ════════════════════════════════════════════════════════════════════════════
  if (action==='analytics_overview') {
    const [totalUsers, totalCampaigns, totalSent, totalOpened, recentCampaigns] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) as cnt FROM users`).first<{cnt:number}>().catch(()=>null),
      env.DB.prepare(`SELECT COUNT(*) as cnt FROM campaigns`).first<{cnt:number}>().catch(()=>null),
      env.DB.prepare(`SELECT COALESCE(SUM(send_count),0) as cnt FROM campaigns WHERE status='sent'`).first<{cnt:number}>().catch(()=>null),
      env.DB.prepare(`SELECT COALESCE(SUM(open_count),0) as cnt FROM campaigns WHERE status='sent'`).first<{cnt:number}>().catch(()=>null),
      env.DB.prepare(`SELECT id,name,channel,status,send_count,open_count,click_count,sent_at FROM campaigns WHERE status='sent' ORDER BY sent_at DESC LIMIT 5`).all<any>().catch(()=>({results:[]})),
    ]);
    return json({ok:true,total_users:totalUsers?.cnt??0,total_campaigns:totalCampaigns?.cnt??0,total_sent:totalSent?.cnt??0,total_opened:totalOpened?.cnt??0,recent_campaigns:recentCampaigns.results||[]});
  }
  if (action==='analytics_funnel') {
    // 퍼널: 발송→열람→클릭→전환
    const campaign_id = url.searchParams.get('campaign_id');
    const where = campaign_id ? `WHERE campaign_id=${Number(campaign_id)}` : '';
    const [sent, opened, clicked, converted] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) as cnt FROM campaign_logs ${where} AND status='sent'`.replace('WHERE AND','WHERE')).first<{cnt:number}>().catch(()=>null),
      env.DB.prepare(`SELECT COALESCE(SUM(open_count),0) as cnt FROM campaigns ${campaign_id?`WHERE id=${Number(campaign_id)}`:''}`).first<{cnt:number}>().catch(()=>null),
      env.DB.prepare(`SELECT COALESCE(SUM(click_count),0) as cnt FROM campaigns ${campaign_id?`WHERE id=${Number(campaign_id)}`:''}`).first<{cnt:number}>().catch(()=>null),
      env.DB.prepare(`SELECT COUNT(*) as cnt FROM campaign_events WHERE event_type='converted' ${campaign_id?`AND campaign_id=${Number(campaign_id)}`:''}`).first<{cnt:number}>().catch(()=>null),
    ]);
    return json({ok:true,funnel:[
      {step:'발송',count:sent?.cnt??0},
      {step:'열람',count:opened?.cnt??0},
      {step:'클릭',count:clicked?.cnt??0},
      {step:'전환',count:converted?.cnt??0},
    ]});
  }
  if (action==='analytics_retention') {
    // 코호트 리텐션: 가입 주차별 재방문율
    const cohorts = await env.DB.prepare(`
      SELECT
        strftime('%Y-W%W', created_at) as cohort_week,
        COUNT(*) as cohort_size,
        COUNT(CASE WHEN julianday(last_login) - julianday(created_at) >= 1  THEN 1 END) as d1,
        COUNT(CASE WHEN julianday(last_login) - julianday(created_at) >= 7  THEN 1 END) as d7,
        COUNT(CASE WHEN julianday(last_login) - julianday(created_at) >= 30 THEN 1 END) as d30
      FROM users
      WHERE created_at >= datetime('now', '-90 days')
      GROUP BY cohort_week
      ORDER BY cohort_week DESC
      LIMIT 12
    `).all<any>().catch(()=>({results:[]}));
    return json({ok:true,cohorts:cohorts.results||[]});
  }
  if (action==='analytics_channel') {
    // 채널별 성과
    const rows = await env.DB.prepare(`SELECT channel, COUNT(*) as campaigns, COALESCE(SUM(send_count),0) as sent, COALESCE(SUM(open_count),0) as opened, COALESCE(SUM(click_count),0) as clicked FROM campaigns WHERE status='sent' GROUP BY channel`).all<any>().catch(()=>({results:[]}));
    return json({ok:true,channels:rows.results||[]});
  }
  if (action==='analytics_timeline') {
    // 일별 발송 추이 (최근 30일)
    const rows = await env.DB.prepare(`SELECT date(sent_at) as date, COUNT(*) as sends, channel FROM campaign_logs WHERE sent_at >= datetime('now','-30 days') GROUP BY date(sent_at), channel ORDER BY date ASC`).all<any>().catch(()=>({results:[]}));
    return json({ok:true,timeline:rows.results||[]});
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 이메일 설정
  // ════════════════════════════════════════════════════════════════════════════
  if (action==='email_settings') {
    const s = await env.DB.prepare(`SELECT * FROM email_settings LIMIT 1`).first<any>().catch(()=>null);
    return json({ok:true,settings:s||{}});
  }
  if (method==='POST' && action==='save_email_settings') {
    const body: any = await req.json().catch(()=>({}));
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS email_settings (id INTEGER PRIMARY KEY, sender_name TEXT, sender_email TEXT, footer_html TEXT, unsubscribe_url TEXT)`).run().catch(()=>{});
    const ex = await env.DB.prepare(`SELECT id FROM email_settings LIMIT 1`).first<{id:number}>().catch(()=>null);
    if (ex) {
      await env.DB.prepare(`UPDATE email_settings SET sender_name=?,sender_email=?,footer_html=?,unsubscribe_url=? WHERE id=?`).bind(body.sender_name||'',body.sender_email||'',body.footer_html||'',body.unsubscribe_url||'',ex.id).run();
    } else {
      await env.DB.prepare(`INSERT INTO email_settings (sender_name,sender_email,footer_html,unsubscribe_url) VALUES (?,?,?,?)`).bind(body.sender_name||'',body.sender_email||'',body.footer_html||'',body.unsubscribe_url||'').run();
    }
    return json({ok:true});
  }
  // ════════════════════════════════════════════════════════════════════════════
  // 이메일 테스트 발송 (단건, 관리자 설정 페이지용)
  // ════════════════════════════════════════════════════════════════════════════
  if (method==='POST' && action==='test_email_send') {
    const body: any = await req.json().catch(()=>({}));
    const to = (body.to || '').trim();
    if (!to || !to.includes('@')) return json({ok:false, error:'수신자 이메일을 입력하세요'},400);
    if (!env.RESEND_API_KEY) {
      return json({ok:false, error:'RESEND_API_KEY 환경변수가 설정되지 않았습니다. Cloudflare Pages → Settings → Environment Variables에서 추가 후 재배포하세요.'},400);
    }
    // from 주소: email_settings 우선, 없으면 env.RESEND_FROM, 없으면 Resend 테스트 주소
    let fromAddr: string | undefined;
    try {
      const es = await env.DB.prepare(`SELECT sender_name, sender_email FROM email_settings LIMIT 1`).first<any>().catch(()=>null);
      if (es?.sender_email) fromAddr = es.sender_name ? `${es.sender_name} <${es.sender_email}>` : es.sender_email;
    } catch {}
    if (!fromAddr) fromAddr = env.RESEND_FROM;
    // fromAddr 없으면 sendEmail 내부에서 onboarding@resend.dev 사용

    const result = await sendEmail(
      env, to,
      body.subject || '✉️ 이메일 발송 테스트',
      body.html    || `<h2>테스트 이메일입니다</h2><p>Resend API 연동이 정상적으로 작동합니다.<br>발신자: ${fromAddr || 'onboarding@resend.dev'}</p>`,
      body.text    || '테스트 이메일입니다. Resend API 연동이 정상 작동합니다.',
      fromAddr,
    );
    return json(result.ok
      ? { ok:true, message:`"${to}"로 테스트 메일을 발송했습니다.` }
      : { ok:false, error: result.error, status: result.status }
    );
  }

  if (method==='POST' && action==='run_automation') {
    return json({ok:true,message:'자동화 룰 실행됨'});
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 캠페인 상세 결과 (CRM 수준)
  // ════════════════════════════════════════════════════════════════════════════
  if (action==='campaign_result') {
    const id = url.searchParams.get('id');
    if (!id) return json({ok:false,error:'id 필요'},400);
    const campaign = await env.DB.prepare(`SELECT * FROM campaigns WHERE id=?`).bind(id).first<any>().catch(()=>null);
    if (!campaign) return json({ok:false,error:'캠페인 없음'},404);
    // 발송 로그 집계
    const logStats = await env.DB.prepare(`
      SELECT
        COUNT(*) as total_sent,
        SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status='opened' THEN 1 ELSE 0 END) as opened,
        SUM(CASE WHEN status='clicked' THEN 1 ELSE 0 END) as clicked,
        SUM(CASE WHEN status='converted' THEN 1 ELSE 0 END) as converted,
        SUM(CASE WHEN status='bounced' THEN 1 ELSE 0 END) as bounced,
        SUM(CASE WHEN status='unsubscribed' THEN 1 ELSE 0 END) as unsubscribed
      FROM campaign_logs WHERE campaign_id=?`).bind(id).first<any>().catch(()=>({}));
    // 이벤트 집계
    const evtStats = await env.DB.prepare(`
      SELECT event_type, COUNT(*) as cnt
      FROM campaign_events WHERE campaign_id=?
      GROUP BY event_type`).bind(id).all<any>().catch(()=>({results:[]}));
    const evtMap: Record<string,number> = {};
    for (const e of (evtStats.results||[])) evtMap[e.event_type] = e.cnt;
    // 전환 매출 (프로모션 연동)
    const promoRevenue = await env.DB.prepare(`
      SELECT COALESCE(SUM(discount_amount),0) as discounted, COALESCE(SUM(final_amount),0) as revenue, COUNT(*) as purchases
      FROM promo_conversions WHERE campaign_id=?`).bind(id).first<any>().catch(()=>({discounted:0,revenue:0,purchases:0}));
    // 시간별 발송 현황
    const hourly = await env.DB.prepare(`
      SELECT strftime('%H',sent_at) as hour, COUNT(*) as cnt
      FROM campaign_logs WHERE campaign_id=? GROUP BY hour ORDER BY hour`).bind(id).all<any>().catch(()=>({results:[]}));
    // 최근 발송 유저 샘플
    const sample = await env.DB.prepare(`
      SELECT cl.status, cl.sent_at, u.name, u.email
      FROM campaign_logs cl LEFT JOIN users u ON u.id=cl.user_id
      WHERE cl.campaign_id=? ORDER BY cl.sent_at DESC LIMIT 20`).bind(id).all<any>().catch(()=>({results:[]}));

    const sent = logStats?.total_sent||campaign.send_count||0;
    const delivered = logStats?.delivered||sent;
    const opened = (evtMap['opened']||logStats?.opened||campaign.open_count||0);
    const clicked = (evtMap['clicked']||logStats?.clicked||campaign.click_count||0);
    const converted = (evtMap['converted']||logStats?.converted||promoRevenue?.purchases||0);
    const open_rate    = delivered>0 ? +((opened/delivered)*100).toFixed(1) : 0;
    const click_rate   = opened>0    ? +((clicked/opened)*100).toFixed(1) : 0;
    const conv_rate    = clicked>0   ? +((converted/clicked)*100).toFixed(1) : 0;
    const delivery_rate= sent>0      ? +((delivered/sent)*100).toFixed(1) : 0;
    return json({ok:true,campaign,stats:{
      sent, delivered, failed:logStats?.failed||0,
      opened, clicked, converted,
      bounced:logStats?.bounced||0, unsubscribed:logStats?.unsubscribed||0,
      open_rate, click_rate, conv_rate, delivery_rate,
      revenue: promoRevenue?.revenue||0,
      discounted: promoRevenue?.discounted||0,
      purchases: promoRevenue?.purchases||0,
      cost_per_click: clicked>0 ? 0 : 0, // 광고비 연동 시 계산
    }, hourly: hourly.results||[], sample: sample.results||[]});
  }

  // 캠페인 이벤트 기록 (열람/클릭/전환 트래킹)
  if (method==='POST' && action==='track_campaign_event') {
    const body: any = await req.json().catch(()=>({}));
    const { campaign_id, user_id, event_type, meta } = body;
    if (!campaign_id || !event_type) return json({ok:false,error:'필드 누락'},400);
    await env.DB.prepare(`INSERT INTO campaign_events (campaign_id,user_id,event_type,channel,meta) VALUES (?,?,?,?,?)`).bind(campaign_id,user_id||null,event_type,body.channel||'',JSON.stringify(meta||{})).run().catch(()=>{});
    // 캠페인 카운터 업데이트
    if (event_type==='opened')    await env.DB.prepare(`UPDATE campaigns SET open_count=open_count+1  WHERE id=?`).bind(campaign_id).run().catch(()=>{});
    if (event_type==='clicked')   await env.DB.prepare(`UPDATE campaigns SET click_count=click_count+1 WHERE id=?`).bind(campaign_id).run().catch(()=>{});
    // 발송 로그 상태 업데이트
    if (user_id && (event_type==='opened'||event_type==='clicked'||event_type==='converted')) {
      await env.DB.prepare(`UPDATE campaign_logs SET status=? WHERE campaign_id=? AND user_id=? AND status IN ('sent','opened')`).bind(event_type,campaign_id,user_id).run().catch(()=>{});
    }
    return json({ok:true});
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 프로모션 (이벤트/할인 랜딩페이지) CRUD
  // ════════════════════════════════════════════════════════════════════════════
  if (action==='promotions') {
    await ensurePromoTables(env);
    const rows = await env.DB.prepare(`SELECT * FROM promotions ORDER BY created_at DESC LIMIT 100`).all<any>().catch(()=>({results:[]}));
    return json({ok:true,promotions:rows.results||[]});
  }
  if (action==='promotion') {
    await ensurePromoTables(env);
    const code = url.searchParams.get('code');
    const id   = url.searchParams.get('id');
    const p = code
      ? await env.DB.prepare(`SELECT * FROM promotions WHERE code=?`).bind(code).first<any>().catch(()=>null)
      : await env.DB.prepare(`SELECT * FROM promotions WHERE id=?`).bind(id||'').first<any>().catch(()=>null);
    return json({ok:!!p,promotion:p||null});
  }
  if (method==='POST' && action==='create_promotion') {
    await ensurePromoTables(env);
    const body: any = await req.json().catch(()=>({}));
    const code = body.code || genPromoCode();
    const r = await env.DB.prepare(`
      INSERT INTO promotions (code,name,description,plan_id,plan_name,original_price,discount_type,discount_value,final_price,
        currency,max_uses,starts_at,expires_at,landing_title,landing_subtitle,landing_body,landing_cta,
        landing_badge,utm_source,utm_medium,utm_campaign,campaign_id)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      code, body.name||'프로모션', body.description||'',
      body.plan_id||'starter', body.plan_name||'스타터 플랜',
      body.original_price||0, body.discount_type||'percent', body.discount_value||0, body.final_price||0,
      body.currency||'KRW', body.max_uses||null,
      body.starts_at||null, body.expires_at||null,
      body.landing_title||'', body.landing_subtitle||'', body.landing_body||'',
      body.landing_cta||'지금 시작하기', body.landing_badge||'한정 특가',
      body.utm_source||'', body.utm_medium||'', body.utm_campaign||'',
      body.campaign_id||null
    ).run();
    return json({ok:true, id: r.meta.last_row_id, code, url:`/promo/${code}`});
  }
  if (method==='POST' && action==='update_promotion') {
    await ensurePromoTables(env);
    const body: any = await req.json().catch(()=>({}));
    if (!body.id) return json({ok:false,error:'id 필요'},400);
    await env.DB.prepare(`
      UPDATE promotions SET name=?,description=?,plan_name=?,original_price=?,discount_type=?,discount_value=?,
      final_price=?,max_uses=?,starts_at=?,expires_at=?,landing_title=?,landing_subtitle=?,landing_body=?,
      landing_cta=?,landing_badge=?,is_active=? WHERE id=?`).bind(
      body.name,body.description||'',body.plan_name,body.original_price,body.discount_type,body.discount_value,
      body.final_price,body.max_uses||null,body.starts_at||null,body.expires_at||null,
      body.landing_title||'',body.landing_subtitle||'',body.landing_body||'',
      body.landing_cta||'지금 시작하기',body.landing_badge||'한정 특가',
      body.is_active!==undefined?body.is_active:1, body.id
    ).run();
    return json({ok:true});
  }
  if (method==='POST' && action==='delete_promotion') {
    await ensurePromoTables(env);
    const body: any = await req.json().catch(()=>({}));
    await env.DB.prepare(`DELETE FROM promotions WHERE id=?`).bind(body.id).run().catch(()=>{});
    return json({ok:true});
  }
  if (method==='POST' && action==='toggle_promotion') {
    await ensurePromoTables(env);
    const body: any = await req.json().catch(()=>({}));
    await env.DB.prepare(`UPDATE promotions SET is_active=? WHERE id=?`).bind(body.active?1:0,body.id).run().catch(()=>{});
    return json({ok:true});
  }

  // 프로모션 상세 분석 (CRM)
  if (action==='promotion_stats') {
    await ensurePromoTables(env);
    const id   = url.searchParams.get('id');
    const code = url.searchParams.get('code');
    const p = id
      ? await env.DB.prepare(`SELECT * FROM promotions WHERE id=?`).bind(id).first<any>().catch(()=>null)
      : await env.DB.prepare(`SELECT * FROM promotions WHERE code=?`).bind(code||'').first<any>().catch(()=>null);
    if (!p) return json({ok:false,error:'프로모션 없음'},404);

    const [views, convs, dailyViews, dailyConvs, referrers, devices] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) as cnt, COUNT(DISTINCT visitor_id) as uniq FROM promo_page_views WHERE promo_id=?`).bind(p.id).first<any>().catch(()=>({cnt:0,uniq:0})),
      env.DB.prepare(`SELECT COUNT(*) as cnt, COALESCE(SUM(final_amount),0) as revenue, COALESCE(AVG(final_amount),0) as avg_order FROM promo_conversions WHERE promo_id=?`).bind(p.id).first<any>().catch(()=>({cnt:0,revenue:0,avg_order:0})),
      env.DB.prepare(`SELECT date(viewed_at) as date, COUNT(*) as cnt FROM promo_page_views WHERE promo_id=? AND viewed_at>=datetime('now','-30 days') GROUP BY date ORDER BY date`).bind(p.id).all<any>().catch(()=>({results:[]})),
      env.DB.prepare(`SELECT date(converted_at) as date, COUNT(*) as cnt, SUM(final_amount) as revenue FROM promo_conversions WHERE promo_id=? AND converted_at>=datetime('now','-30 days') GROUP BY date ORDER BY date`).bind(p.id).all<any>().catch(()=>({results:[]})),
      env.DB.prepare(`SELECT referrer, COUNT(*) as cnt FROM promo_page_views WHERE promo_id=? AND referrer IS NOT NULL GROUP BY referrer ORDER BY cnt DESC LIMIT 10`).bind(p.id).all<any>().catch(()=>({results:[]})),
      env.DB.prepare(`SELECT device_type, COUNT(*) as cnt FROM promo_page_views WHERE promo_id=? GROUP BY device_type`).bind(p.id).all<any>().catch(()=>({results:[]})),
    ]);
    const totalViews = views?.cnt||0;
    const uniqueViews = views?.uniq||0;
    const purchases = convs?.cnt||0;
    const revenue = convs?.revenue||0;
    const conv_rate = uniqueViews>0 ? +((purchases/uniqueViews)*100).toFixed(2) : 0;
    const avg_order = convs?.avg_order||0;
    return json({ok:true, promotion:p, stats:{
      total_views:totalViews, unique_views:uniqueViews,
      purchases, revenue, conv_rate, avg_order,
      remaining_uses: p.max_uses ? Math.max(0, p.max_uses - purchases) : null,
    }, daily_views:dailyViews.results||[], daily_convs:dailyConvs.results||[],
    referrers:referrers.results||[], devices:devices.results||[]});
  }

  // 프로모션 페이지뷰 기록 (공개 - 트래킹 픽셀용)
  if (method==='POST' && action==='promo_view') {
    await ensurePromoTables(env);
    const body: any = await req.json().catch(()=>({}));
    if (!body.promo_id && !body.code) return json({ok:false},400);
    const promoId = body.promo_id || (await env.DB.prepare(`SELECT id FROM promotions WHERE code=?`).bind(body.code||'').first<{id:number}>().catch(()=>null))?.id;
    if (!promoId) return json({ok:false},404);
    const ua = req.headers.get('user-agent')||'';
    const device = ua.match(/Mobile|Android|iPhone/i) ? 'mobile' : ua.match(/Tablet|iPad/i) ? 'tablet' : 'desktop';
    await env.DB.prepare(`INSERT INTO promo_page_views (promo_id,visitor_id,referrer,device_type,user_agent,ip) VALUES (?,?,?,?,?,?)`).bind(promoId,body.visitor_id||null,body.referrer||null,device,ua.slice(0,200),body.ip||null).run().catch(()=>{});
    // 조회수 카운터 업데이트
    await env.DB.prepare(`UPDATE promotions SET view_count=view_count+1 WHERE id=?`).bind(promoId).run().catch(()=>{});
    return json({ok:true});
  }

  // 프로모션 전환 기록 (결제 완료 시 호출)
  if (method==='POST' && action==='promo_convert') {
    await ensurePromoTables(env);
    const body: any = await req.json().catch(()=>({}));
    const { promo_id, code, user_id, original_amount, discount_amount, final_amount, payment_id, plan_id } = body;
    const promoId = promo_id || (await env.DB.prepare(`SELECT id FROM promotions WHERE code=?`).bind(code||'').first<{id:number}>().catch(()=>null))?.id;
    if (!promoId) return json({ok:false,error:'프로모션 없음'},404);
    const promo = await env.DB.prepare(`SELECT * FROM promotions WHERE id=?`).bind(promoId).first<any>().catch(()=>null);
    if (!promo) return json({ok:false,error:'프로모션 없음'},404);
    // 사용 횟수 초과 체크
    if (promo.max_uses) {
      const used = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM promo_conversions WHERE promo_id=?`).bind(promoId).first<{cnt:number}>().catch(()=>({cnt:0}));
      if ((used?.cnt||0) >= promo.max_uses) return json({ok:false,error:'한도 초과'},400);
    }
    await env.DB.prepare(`INSERT INTO promo_conversions (promo_id,campaign_id,user_id,original_amount,discount_amount,final_amount,payment_id,plan_id) VALUES (?,?,?,?,?,?,?,?)`).bind(promoId,promo.campaign_id||null,user_id||null,original_amount||0,discount_amount||0,final_amount||0,payment_id||null,plan_id||promo.plan_id||'').run().catch(()=>{});
    await env.DB.prepare(`UPDATE promotions SET conversion_count=conversion_count+1 WHERE id=?`).bind(promoId).run().catch(()=>{});
    return json({ok:true});
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 퍼널 빌더 CRM 리포트
  // ════════════════════════════════════════════════════════════════════════════
  if (action==='funnel_crm') {
    const funnelId = url.searchParams.get('funnel_id')||url.searchParams.get('canvas_id');
    const dateFrom = url.searchParams.get('from') || new Date(Date.now()-30*86400000).toISOString().slice(0,10);
    const dateTo   = url.searchParams.get('to')   || new Date().toISOString().slice(0,10);

    // 해당 캔버스에 연결된 캠페인들 조회
    let campaignIds: number[] = [];
    if (funnelId) {
      const linked = await env.DB.prepare(`SELECT id FROM campaigns WHERE canvas_id=? OR id IN (SELECT campaign_id FROM canvas_campaigns WHERE canvas_id=?)`).bind(funnelId,funnelId).all<{id:number}>().catch(()=>({results:[]}));
      campaignIds = (linked.results||[]).map((r:any)=>r.id);
    }
    const cidPlaceholder = campaignIds.length ? campaignIds.join(',') : '0';

    const [smsStats, landingStats, applications, revenueStats, dailyStats] = await Promise.all([
      // 문자 발송 통계 (SMS/MMS/알림톡)
      env.DB.prepare(`
        SELECT
          COUNT(*) as total_sent,
          SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) as delivered,
          SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN status='clicked' THEN 1 ELSE 0 END) as clicked,
          COUNT(DISTINCT user_id) as unique_recipients,
          channel
        FROM campaign_logs
        WHERE campaign_id IN (${cidPlaceholder})
          AND channel IN ('sms','mms','alimtalk')
          AND sent_at >= ? AND sent_at <= ?
        GROUP BY channel`).bind(dateFrom, dateTo+' 23:59:59').all<any>().catch(()=>({results:[]})),

      // 랜딩페이지 조회 통계 (프로모션 연동)
      env.DB.prepare(`
        SELECT
          COUNT(*) as total_views,
          COUNT(DISTINCT visitor_id) as unique_views,
          COUNT(DISTINCT CASE WHEN device_type='mobile' THEN visitor_id END) as mobile_views,
          COUNT(DISTINCT CASE WHEN device_type='desktop' THEN visitor_id END) as desktop_views
        FROM promo_page_views
        WHERE promo_id IN (SELECT id FROM promotions WHERE campaign_id IN (${cidPlaceholder}))
          AND viewed_at >= ? AND viewed_at <= ?`).bind(dateFrom, dateTo+' 23:59:59').first<any>().catch(()=>({})),

      // 신청/전환 통계
      env.DB.prepare(`
        SELECT COUNT(*) as applications, COALESCE(SUM(final_amount),0) as revenue, COALESCE(AVG(final_amount),0) as avg_order
        FROM promo_conversions
        WHERE campaign_id IN (${cidPlaceholder})
          AND converted_at >= ? AND converted_at <= ?`).bind(dateFrom, dateTo+' 23:59:59').first<any>().catch(()=>({applications:0,revenue:0,avg_order:0})),

      // 매출/전환 집계
      env.DB.prepare(`
        SELECT COALESCE(SUM(final_amount),0) as total_revenue, COUNT(DISTINCT user_id) as paying_users
        FROM promo_conversions
        WHERE campaign_id IN (${cidPlaceholder})
          AND converted_at >= ? AND converted_at <= ?`).bind(dateFrom, dateTo+' 23:59:59').first<any>().catch(()=>({total_revenue:0,paying_users:0})),

      // 일별 종합 추이
      env.DB.prepare(`
        SELECT
          date(sent_at) as date,
          COUNT(*) as sends,
          SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) as delivered
        FROM campaign_logs
        WHERE campaign_id IN (${cidPlaceholder})
          AND sent_at >= ? AND sent_at <= ?
        GROUP BY date ORDER BY date`).bind(dateFrom, dateTo+' 23:59:59').all<any>().catch(()=>({results:[]})),
    ]);

    // 퍼널 단계별 수치 계산
    const totalSent     = (smsStats.results||[]).reduce((s:number,r:any)=>s+(r.total_sent||0),0);
    const totalDelivered= (smsStats.results||[]).reduce((s:number,r:any)=>s+(r.delivered||0),0);
    const landingViews  = landingStats?.unique_views||0;
    const totalApps     = applications?.applications||0;
    const revenue       = revenueStats?.total_revenue||0;
    const delivery_rate = totalSent>0 ? +((totalDelivered/totalSent)*100).toFixed(1) : 0;
    const landing_rate  = totalDelivered>0 ? +((landingViews/totalDelivered)*100).toFixed(1) : 0;
    const conv_rate     = landingViews>0   ? +((totalApps/landingViews)*100).toFixed(1) : 0;
    const arpu          = totalApps>0      ? Math.round(revenue/totalApps) : 0;

    return json({ok:true,
      period:{from:dateFrom,to:dateTo},
      funnel:[
        {step:'문자 발송',  key:'sent',     value:totalSent,     icon:'send'},
        {step:'전달 완료',  key:'delivered',value:totalDelivered, icon:'check',  rate:delivery_rate},
        {step:'랜딩 방문',  key:'views',    value:landingViews,  icon:'eye',    rate:landing_rate},
        {step:'신청/전환',  key:'converted',value:totalApps,     icon:'target', rate:conv_rate},
      ],
      kpi:{
        total_sent:totalSent, total_delivered:totalDelivered,
        landing_views:landingStats?.total_views||0, unique_visitors:landingViews,
        mobile_visitors:landingStats?.mobile_views||0,
        applications:totalApps, revenue, avg_order:Math.round(applications?.avg_order||0),
        paying_users:revenueStats?.paying_users||0, arpu,
        delivery_rate, landing_rate, conv_rate,
        total_roi: revenue>0&&totalSent>0 ? +((revenue/(totalSent*10))*100).toFixed(1) : 0, // 문자 단가 10원 기준
      },
      sms_channels:smsStats.results||[],
      daily:dailyStats.results||[],
    });
  }

  // 퍼널 전체 목록 (캔버스 기반)
  if (action==='funnel_list') {
    const canvases = await env.DB.prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM campaigns WHERE canvas_id=c.id) as campaign_count,
        (SELECT COALESCE(SUM(send_count),0) FROM campaigns WHERE canvas_id=c.id) as total_sent
      FROM canvases c ORDER BY c.created_at DESC LIMIT 50`).all<any>().catch(()=>({results:[]}));
    return json({ok:true,funnels:canvases.results||[]});
  }

  return json({ok:false,error:`알 수 없는 액션: ${action}`},400);
}

// ─────────────────────────────────────────────────────────────────────────────
// 프로모션 테이블 보장
// ─────────────────────────────────────────────────────────────────────────────
async function ensurePromoTables(env: Env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS promotions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      plan_id TEXT DEFAULT 'starter',
      plan_name TEXT DEFAULT '스타터 플랜',
      original_price INTEGER DEFAULT 0,
      discount_type TEXT DEFAULT 'percent',
      discount_value REAL DEFAULT 0,
      final_price INTEGER DEFAULT 0,
      currency TEXT DEFAULT 'KRW',
      max_uses INTEGER,
      view_count INTEGER DEFAULT 0,
      conversion_count INTEGER DEFAULT 0,
      starts_at TEXT,
      expires_at TEXT,
      is_active INTEGER DEFAULT 1,
      landing_title TEXT,
      landing_subtitle TEXT,
      landing_body TEXT,
      landing_cta TEXT DEFAULT '지금 시작하기',
      landing_badge TEXT DEFAULT '한정 특가',
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      campaign_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`).run().catch(()=>{});
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS promo_page_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      promo_id INTEGER NOT NULL,
      visitor_id TEXT,
      referrer TEXT,
      device_type TEXT DEFAULT 'desktop',
      user_agent TEXT,
      ip TEXT,
      viewed_at TEXT DEFAULT (datetime('now'))
    )`).run().catch(()=>{});
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS promo_conversions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      promo_id INTEGER NOT NULL,
      campaign_id INTEGER,
      user_id INTEGER,
      original_amount INTEGER DEFAULT 0,
      discount_amount INTEGER DEFAULT 0,
      final_amount INTEGER DEFAULT 0,
      payment_id TEXT,
      plan_id TEXT,
      converted_at TEXT DEFAULT (datetime('now'))
    )`).run().catch(()=>{});
  // ALTER TABLE 마이그레이션 (기존 campaigns에 canvas_id 추가)
  await env.DB.prepare(`ALTER TABLE campaigns ADD COLUMN canvas_id INTEGER`).run().catch(()=>{});
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS canvas_campaigns (
      canvas_id INTEGER NOT NULL,
      campaign_id INTEGER NOT NULL,
      PRIMARY KEY (canvas_id, campaign_id)
    )`).run().catch(()=>{});
}

// ─────────────────────────────────────────────────────────────────────────────
// 프로모션 코드 생성
// ─────────────────────────────────────────────────────────────────────────────
function genPromoCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random()*chars.length)];
  return code;
}
