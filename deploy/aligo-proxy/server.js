#!/usr/bin/env node
/*
 * 공용 알리고 릴레이 — Vultr 고정 IP(141.164.36.76)에서 알리고로 요청을 대신 보낸다.
 * 알리고는 "등록된 발송 IP"에서만 API를 허용하므로, Cloudflare 등 고정 IP가 없는
 * 서비스들이 이 서버(고정 IP)를 경유하면 문자·알림톡을 보낼 수 있다.
 *
 * 지원 방식(한 서버가 모두 처리):
 *   A) 패스스루   : 헤더 X-Aligo-Target 에 알리고 URL, 본문은 그대로 전달 (BYGENCY 사용)
 *   B) 간단 SMS   : JSON { type:"sms", key,user_id,sender,receiver,msg, msg_type?, title? }
 *   C) 간단 알림톡: JSON { type:"alimtalk", apikey,userid,senderkey,tpl_code,sender,
 *                        receiver_1,subject_1,message_1, ... }  ← 릴레이가 토큰 자동 발급
 *
 * 보안: 환경변수 RELAY_SECRET(또는 ALIGO_PROXY_TOKEN) 설정 시, 요청 헤더
 *       X-Relay-Secret 또는 X-Aligo-Token 값이 일치해야 통과. (미설정 시 공개)
 *
 * 실제 전송은 curl 로 위임(알리고 WAF 의 Node TLS 차단 우회). 대상 호스트는 *.aligo.in 만 허용.
 * 실행:  RELAY_SECRET=비밀키 PORT=8080 node server.js   (의존성 없음, curl 필요)
 */
'use strict'
const http = require('http')
const { spawn } = require('child_process')

const PORT = Number(process.env.PORT || 8080)
const SECRET = String(process.env.RELAY_SECRET || process.env.ALIGO_PROXY_TOKEN || '')
const MAX_BODY = 1024 * 1024

function reply(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(Buffer.isBuffer(obj) || typeof obj === 'string' ? obj : JSON.stringify(obj))
}
function authed(req) {
  if (!SECRET) return true
  const t = req.headers['x-relay-secret'] || req.headers['x-aligo-token'] || ''
  return t === SECRET
}
function hostOk(u) {
  try { const x = new URL(u); return x.protocol === 'https:' && /(^|\.)aligo\.in$/i.test(x.hostname) } catch { return false }
}
function enc(obj) {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(obj)) if (v != null && v !== '') p.append(k, String(v))
  return p.toString()
}
// curl 로 form-urlencoded POST → cb(statusCode, Buffer|string)
function curlPost(target, bodyStr, cb) {
  const c = spawn('curl', ['-s', '-X', 'POST', target, '-H', 'Content-Type: application/x-www-form-urlencoded; charset=utf-8', '--data-binary', '@-', '--max-time', '25'])
  const out = []
  c.stdout.on('data', (x) => out.push(x))
  c.on('error', () => cb(502, '{"relayError":"curl-spawn (curl 설치 필요)"}'))
  c.on('close', (code) => cb(code === 0 ? 200 : 502, code === 0 ? Buffer.concat(out) : '{"relayError":"curl ' + code + '"}'))
  c.stdin.write(bodyStr); c.stdin.end()
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET') return reply(res, 200, { ok: true, service: 'bygency-aligo-relay' })
  if (req.method !== 'POST') return reply(res, 405, { relayError: 'POST only' })
  if (!authed(req)) return reply(res, 401, { relayError: 'unauthorized' })

  const chunks = []; let size = 0
  req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { req.destroy(); return reply(res, 413, { relayError: 'too large' }) } chunks.push(c) })
  req.on('end', () => {
    const raw = Buffer.concat(chunks)

    // ── 모드 A: 패스스루 (X-Aligo-Target) ──
    const target = String(req.headers['x-aligo-target'] || '')
    if (target) {
      if (!hostOk(target)) return reply(res, 400, { relayError: 'host not allowed' })
      return curlPost(target, raw, (code, out) => reply(res, code, out))
    }

    // ── 모드 B/C: JSON ──
    let j
    try { j = JSON.parse(raw.toString('utf8') || '{}') } catch { return reply(res, 400, { relayError: 'need X-Aligo-Target header or JSON body' }) }
    const type = String(j.type || j.kind || (j.tpl_code ? 'alimtalk' : 'sms')).toLowerCase()

    // 모드 C: 알림톡 (토큰 자동 발급 → 발송)
    if (type === 'alimtalk') {
      const apikey = j.apikey || j.key
      const userid = j.userid || j.user_id
      if (!apikey || !userid || !j.senderkey || !j.tpl_code || !j.sender || !j.receiver_1) {
        return reply(res, 400, { relayError: 'alimtalk requires apikey,userid,senderkey,tpl_code,sender,receiver_1,...' })
      }
      return curlPost('https://kakaoapi.aligo.in/akv10/token/create/30/s/', enc({ apikey, userid }), (tc, tout) => {
        let tok = ''
        try { tok = JSON.parse(String(tout)).token } catch { /* */ }
        if (!tok) return reply(res, 502, { relayError: 'token failed', detail: String(tout).slice(0, 300) })
        const params = { apikey, userid, token: tok }
        for (const [k, v] of Object.entries(j)) {
          if (/^(receiver_|subject_|message_|button_|failover_|fsubject_|fmessage_)\d+$/.test(k) || ['senderkey', 'tpl_code', 'sender', 'senddate'].includes(k)) params[k] = v
        }
        curlPost('https://kakaoapi.aligo.in/akv10/alimtalk/send/', enc(params), (code, out) => reply(res, code, out))
      })
    }

    // 모드 B: SMS
    const key = j.key || j.apikey
    const user_id = j.user_id || j.userid
    if (!key || !user_id || !j.sender || !j.receiver || !j.msg) {
      return reply(res, 400, { relayError: 'sms requires key,user_id,sender,receiver,msg' })
    }
    const body = enc({ key, user_id, sender: j.sender, receiver: j.receiver, msg: j.msg, msg_type: j.msg_type, title: j.title, rdate: j.rdate, rtime: j.rtime, testmode_yn: j.testmode_yn })
    curlPost('https://apis.aligo.in/send/', body, (code, out) => reply(res, code, out))
  })
})

server.listen(PORT, () => console.log(`[bygency-aligo-relay] :${PORT} (secret ${SECRET ? 'ON' : 'OFF'})`))
