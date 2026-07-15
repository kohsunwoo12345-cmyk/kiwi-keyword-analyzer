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
 * 의존성 없음(Node 내장 http/https 만 사용). Node 16+ 권장.
 */
'use strict'
const http = require('http')
const https = require('https')

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
    const preq = https.request(
      target,
      { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8', 'Content-Length': data.length, 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36', 'Accept': 'application/json, text/plain, */*' } },
      (pres) => {
        res.writeHead(pres.statusCode || 502, { 'Content-Type': pres.headers['content-type'] || 'application/json; charset=utf-8' })
        pres.pipe(res)
      },
    )
    preq.on('error', (e) => deny(res, 502, 'upstream error: ' + String(e && e.message || e)))
    preq.write(data)
    preq.end()
  })
})

server.listen(PORT, () => {
  console.log(`[bygency-aligo-proxy] listening on :${PORT}  (token ${TOKEN ? 'ON' : 'OFF'})`)
})
