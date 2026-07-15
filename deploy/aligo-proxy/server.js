#!/usr/bin/env node
/*
 * BYGENCY Aligo 프록시 — Vultr 고정 IP(141.164.36.76)에서 알리고로 요청을 전달한다.
 *
 * 흐름:  Cloudflare Pages Functions  →  이 프록시(고정 IP)  →  api/kakaoapi.aligo.in
 * Aligo 관리자에서 "IP 연동 제한"을 켜고 이 서버의 고정 IP를 화이트리스트에 등록하면,
 * 실제 발송 요청이 항상 그 고정 IP에서 나가게 된다.
 *
 * Cloudflare 쪽은 요청 헤더로 전달 대상 URL(X-Aligo-Target)과 인증 토큰(X-Aligo-Token)을 보낸다.
 * 이 서버는 대상 호스트가 *.aligo.in 인지 검증하고, 본문(form-urlencoded)을 그대로 포워딩한다.
 *
 * 실행:
 *   ALIGO_PROXY_TOKEN=발급한긴랜덤토큰 PORT=8080 node server.js
 * 참고: 알리고 앞단 보안이 Node TLS 지문을 403 처리하므로, 실제 전송은 curl 로 위임한다.
 *       (서버에 curl 이 설치돼 있어야 함)
 */
'use strict'
const http = require('http')
const { spawn } = require('child_process')

const PORT = Number(process.env.PORT || 8080)
const TOKEN = String(process.env.ALIGO_PROXY_TOKEN || '') // Cloudflare 의 ALIGO_PROXY_TOKEN 과 동일하게 설정
const MAX_BODY = 1024 * 1024 // 1MB

function deny(res, code, msg) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify({ ok: false, proxyError: msg }))
}

const server = http.createServer((req, res) => {
  // 헬스체크
  if (req.method === 'GET' && (req.url === '/health' || req.url === '/')) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, service: 'bygency-aligo-proxy' }))
    return
  }
  if (req.method !== 'POST') return deny(res, 405, 'POST only')

  // 토큰 검증 (오픈 릴레이 방지)
  if (TOKEN && req.headers['x-aligo-token'] !== TOKEN) return deny(res, 401, 'unauthorized')

  const target = String(req.headers['x-aligo-target'] || '')
  let u
  try { u = new URL(target) } catch { return deny(res, 400, 'bad target url') }
  // 대상 호스트는 반드시 aligo.in 도메인 (apis.aligo.in / kakaoapi.aligo.in)
  if (u.protocol !== 'https:' || !/(^|\.)aligo\.in$/i.test(u.hostname)) {
    return deny(res, 400, 'target host not allowed')
  }

  const chunks = []
  let size = 0
  req.on('data', (c) => {
    size += c.length
    if (size > MAX_BODY) { req.destroy(); return deny(res, 413, 'body too large') }
    chunks.push(c)
  })
  req.on('end', () => {
    const data = Buffer.concat(chunks)
    // curl 로 위임 (알리고 WAF 우회). --data-binary @- 로 원본 본문을 그대로 전달.
    const c = spawn('curl', ['-s', '-X', 'POST', target, '-H', 'Content-Type: application/x-www-form-urlencoded; charset=utf-8', '--data-binary', '@-', '--max-time', '25'])
    const out = []
    c.stdout.on('data', (x) => out.push(x))
    c.on('error', () => deny(res, 502, 'curl spawn failed (curl 설치 필요)'))
    c.on('close', (code) => {
      if (code !== 0) return deny(res, 502, 'curl exit ' + code)
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(Buffer.concat(out))
    })
    c.stdin.write(data)
    c.stdin.end()
  })
})

server.listen(PORT, () => {
  console.log(`[bygency-aligo-proxy] listening on :${PORT}  (token ${TOKEN ? 'ON' : 'OFF'})`)
})
