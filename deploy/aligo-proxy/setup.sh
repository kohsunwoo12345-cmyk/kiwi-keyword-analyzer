#!/usr/bin/env bash
# BYGENCY 알리고 프록시 — Vultr 서버(고정 IP)에 한 번에 설치.
# 사용법(서버에서 한 줄):
#   curl -fsSL https://raw.githubusercontent.com/kohsunwoo12345-cmyk/kiwi-keyword-analyzer/main/deploy/aligo-proxy/setup.sh | bash
# 완료되면 Cloudflare 에 넣을 ALIGO_PROXY_URL 값을 출력한다.
set -e
echo "== BYGENCY 알리고 프록시 설치 시작 =="

# 1) Node.js 설치 (없으면)
if ! command -v node >/dev/null 2>&1; then
  echo "-- Node.js 설치 중... (1~2분)"
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update -y && apt-get install -y nodejs || true
    command -v node >/dev/null 2>&1 || { curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs; }
  elif command -v dnf >/dev/null 2>&1; then dnf install -y nodejs
  elif command -v yum >/dev/null 2>&1; then yum install -y nodejs
  fi
fi
echo "-- Node: $(node -v 2>/dev/null || echo '설치 실패')"

# 2) 프록시 프로그램 작성
mkdir -p /opt/bygency-aligo-proxy
cat > /opt/bygency-aligo-proxy/server.js <<'JS'
const http=require('http'),https=require('https');
const T=process.env.ALIGO_PROXY_TOKEN||'';
http.createServer((q,s)=>{
  if(q.method==='GET'){s.writeHead(200,{'Content-Type':'application/json'});return s.end('{"ok":true,"service":"bygency-aligo-proxy"}')}
  if(q.method!=='POST'){s.writeHead(405);return s.end('POST only')}
  if(T&&q.headers['x-aligo-token']!==T){s.writeHead(401);return s.end('{"proxyError":"unauthorized"}')}
  const t=q.headers['x-aligo-target']||'';let u;
  try{u=new URL(t)}catch(e){s.writeHead(400);return s.end('{"proxyError":"bad target"}')}
  if(u.protocol!=='https:'||!/(^|\.)aligo\.in$/i.test(u.hostname)){s.writeHead(400);return s.end('{"proxyError":"host not allowed"}')}
  let b=[],n=0;q.on('data',c=>{n+=c.length;if(n>1048576){q.destroy();return}b.push(c)}).on('end',()=>{
    const d=Buffer.concat(b);
    const r=https.request(t,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded; charset=utf-8','Content-Length':d.length}},p=>{
      s.writeHead(p.statusCode||502,{'Content-Type':p.headers['content-type']||'application/json'});p.pipe(s)});
    r.on('error',e=>{s.writeHead(502);s.end('{"proxyError":"upstream"}')});r.write(d);r.end();
  });
}).listen(8080,()=>console.log('bygency-aligo-proxy on :8080'));
JS

# 3) 서비스 등록 (재부팅 후에도 자동 실행). 토큰 없이 동작(대상 호스트는 aligo.in 으로만 제한됨).
cat > /etc/systemd/system/bygency-aligo-proxy.service <<EOF
[Unit]
Description=BYGENCY Aligo Proxy
After=network.target
[Service]
ExecStart=$(command -v node) /opt/bygency-aligo-proxy/server.js
Restart=always
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now bygency-aligo-proxy || true

# 4) 방화벽 8080 열기 (있으면)
command -v ufw >/dev/null 2>&1 && ufw allow 8080/tcp >/dev/null 2>&1 || true
command -v firewall-cmd >/dev/null 2>&1 && { firewall-cmd --permanent --add-port=8080/tcp >/dev/null 2>&1; firewall-cmd --reload >/dev/null 2>&1; } || true

sleep 1
echo ""
echo "=================================================="
echo " 설치 완료! 상태: $(systemctl is-active bygency-aligo-proxy 2>/dev/null || echo unknown)"
echo " 로컬 확인: $(curl -s http://localhost:8080/ 2>/dev/null || echo '(잠시 후 다시)')"
echo ""
echo " ▼ Cloudflare Pages 환경변수에 아래 1개만 추가하세요 ▼"
echo ""
echo "   ALIGO_PROXY_URL = http://141.164.36.76:8080"
echo ""
echo "=================================================="
