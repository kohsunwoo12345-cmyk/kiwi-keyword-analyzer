#!/usr/bin/env bash
# 공용 알리고 릴레이 — Vultr 서버(고정 IP)에 한 번에 설치.
# 사용법(서버에서 한 줄):
#   curl -fsSL https://raw.githubusercontent.com/kohsunwoo12345-cmyk/kiwi-keyword-analyzer/main/deploy/aligo-proxy/setup.sh | bash
# 보안 켜기(선택): 앞에 RELAY_SECRET 을 붙여 실행
#   curl -fsSL <URL> | RELAY_SECRET=원하는비밀키 bash
# 완료되면 Cloudflare 에 넣을 값을 출력한다.
set -e
echo "== 알리고 릴레이 설치 시작 =="
RELAY_SECRET="${RELAY_SECRET:-}"

# 1) Node.js + curl 설치 (없으면)
if ! command -v node >/dev/null 2>&1; then
  echo "-- Node.js 설치 중... (1~2분)"
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update -y && apt-get install -y nodejs curl || true
    command -v node >/dev/null 2>&1 || { curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs; }
  elif command -v dnf >/dev/null 2>&1; then dnf install -y nodejs curl
  elif command -v yum >/dev/null 2>&1; then yum install -y nodejs curl
  fi
fi
command -v curl >/dev/null 2>&1 || { apt-get install -y curl || true; }
echo "-- Node: $(node -v 2>/dev/null || echo '설치 실패')"

# 2) 릴레이 프로그램 작성 (모드 A 패스스루 + 모드 B SMS JSON + 모드 C 알림톡 JSON, curl 위임)
mkdir -p /opt/bygency-aligo-proxy
cat > /opt/bygency-aligo-proxy/server.js <<'JS'
'use strict'
const http=require('http'),{spawn}=require('child_process')
const PORT=Number(process.env.PORT||8080)
const SECRET=String(process.env.RELAY_SECRET||process.env.ALIGO_PROXY_TOKEN||'')
const MAX=1048576
function reply(res,code,o){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8'});res.end(Buffer.isBuffer(o)||typeof o==='string'?o:JSON.stringify(o))}
function authed(q){if(!SECRET)return true;const t=q.headers['x-relay-secret']||q.headers['x-aligo-token']||'';return t===SECRET}
function hostOk(u){try{const x=new URL(u);return x.protocol==='https:'&&/(^|\.)aligo\.in$/i.test(x.hostname)}catch(e){return false}}
function enc(o){const p=new URLSearchParams();for(const[k,v]of Object.entries(o))if(v!=null&&v!=='')p.append(k,String(v));return p.toString()}
function curlPost(target,body,cb){const c=spawn('curl',['-s','-X','POST',target,'-H','Content-Type: application/x-www-form-urlencoded; charset=utf-8','--data-binary','@-','--max-time','25']);const out=[];c.stdout.on('data',x=>out.push(x));c.on('error',()=>cb(502,'{"relayError":"curl-spawn"}'));c.on('close',code=>cb(code===0?200:502,code===0?Buffer.concat(out):'{"relayError":"curl '+code+'"}'));c.stdin.write(body);c.stdin.end()}
function oair(q,s,buf){const t='https://api.openai.com'+q.url;const a=['-s','-w','\n__CODE__%{http_code}','-X',q.method,t,'--max-time','120'];if(q.headers['authorization'])a.push('-H','Authorization: '+q.headers['authorization']);if(q.headers['content-type'])a.push('-H','Content-Type: '+q.headers['content-type']);if(q.headers['openai-organization'])a.push('-H','OpenAI-Organization: '+q.headers['openai-organization']);const hb=q.method!=='GET'&&q.method!=='HEAD'&&buf&&buf.length;if(hb)a.push('--data-binary','@-');const c=spawn('curl',a);const out=[];c.stdout.on('data',x=>out.push(x));c.on('error',()=>reply(s,502,{relayError:'curl-spawn'}));c.on('close',()=>{const b=Buffer.concat(out),str=b.toString('utf8'),m=str.lastIndexOf('\n__CODE__');let code=200,body=b;if(m>=0){code=Number(str.slice(m+9).trim())||200;body=Buffer.from(str.slice(0,m),'utf8')}s.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*'});s.end(body)});if(hb)c.stdin.write(buf);c.stdin.end()}
http.createServer((q,s)=>{
  if(q.url&&(q.url.indexOf('/v1/')===0||q.url.indexOf('/openai/v1/')===0)){if(q.url.indexOf('/openai')===0)q.url=q.url.slice(7);if(q.method==='GET'||q.method==='HEAD')return oair(q,s,null);const bh=[];let bn=0;q.on('data',c=>{bn+=c.length;if(bn>12582912){q.destroy();return reply(s,413,{relayError:'too large'})}bh.push(c)}).on('end',()=>oair(q,s,Buffer.concat(bh)));return}
  if(q.method==='GET')return reply(s,200,{ok:true,service:'bygency-aligo-relay'})
  if(q.method!=='POST')return reply(s,405,{relayError:'POST only'})
  if(!authed(q))return reply(s,401,{relayError:'unauthorized'})
  const ch=[];let n=0
  q.on('data',c=>{n+=c.length;if(n>MAX){q.destroy();return reply(s,413,{relayError:'too large'})}ch.push(c)}).on('end',()=>{
    const raw=Buffer.concat(ch)
    const target=String(q.headers['x-aligo-target']||'')
    if(target){ if(!hostOk(target))return reply(s,400,{relayError:'host not allowed'}); return curlPost(target,raw,(code,out)=>reply(s,code,out)) }
    let j;try{j=JSON.parse(raw.toString('utf8')||'{}')}catch(e){return reply(s,400,{relayError:'need X-Aligo-Target header or JSON body'})}
    const type=String(j.type||j.kind||(j.tpl_code?'alimtalk':'sms')).toLowerCase()
    if(type==='alimtalk'){
      const apikey=j.apikey||j.key,userid=j.userid||j.user_id
      if(!apikey||!userid||!j.senderkey||!j.tpl_code||!j.sender||!j.receiver_1)return reply(s,400,{relayError:'alimtalk requires apikey,userid,senderkey,tpl_code,sender,receiver_1,...'})
      return curlPost('https://kakaoapi.aligo.in/akv10/token/create/30/s/',enc({apikey,userid}),(tc,tout)=>{
        let tok='';try{tok=JSON.parse(String(tout)).token}catch(e){}
        if(!tok)return reply(s,502,{relayError:'token failed',detail:String(tout).slice(0,300)})
        const p={apikey,userid,token:tok}
        for(const[k,v]of Object.entries(j)){if(/^(receiver_|subject_|message_|button_|failover_|fsubject_|fmessage_)\d+$/.test(k)||['senderkey','tpl_code','sender','senddate'].includes(k))p[k]=v}
        curlPost('https://kakaoapi.aligo.in/akv10/alimtalk/send/',enc(p),(code,out)=>reply(s,code,out))
      })
    }
    const key=j.key||j.apikey,user_id=j.user_id||j.userid
    if(!key||!user_id||!j.sender||!j.receiver||!j.msg)return reply(s,400,{relayError:'sms requires key,user_id,sender,receiver,msg'})
    curlPost('https://apis.aligo.in/send/',enc({key,user_id,sender:j.sender,receiver:j.receiver,msg:j.msg,msg_type:j.msg_type,title:j.title,rdate:j.rdate,rtime:j.rtime,testmode_yn:j.testmode_yn}),(code,out)=>reply(s,code,out))
  })
}).listen(PORT,()=>console.log('[bygency-aligo-relay] :'+PORT+' (secret '+(SECRET?'ON':'OFF')+')'))
JS

# 3) 서비스 등록 (재부팅 후에도 자동 실행)
cat > /etc/systemd/system/bygency-aligo-proxy.service <<EOF
[Unit]
Description=BYGENCY Aligo Relay
After=network.target
[Service]
Environment=RELAY_SECRET=${RELAY_SECRET}
ExecStart=$(command -v node) /opt/bygency-aligo-proxy/server.js
Restart=always
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable bygency-aligo-proxy >/dev/null 2>&1 || true
systemctl restart bygency-aligo-proxy || true

# 4) 방화벽 8080 열기 (있으면)
command -v ufw >/dev/null 2>&1 && ufw allow 8080/tcp >/dev/null 2>&1 || true
command -v firewall-cmd >/dev/null 2>&1 && { firewall-cmd --permanent --add-port=8080/tcp >/dev/null 2>&1; firewall-cmd --reload >/dev/null 2>&1; } || true

sleep 1
echo ""
echo "=================================================="
echo " 설치 완료! 상태: $(systemctl is-active bygency-aligo-proxy 2>/dev/null || echo unknown)"
echo " 보안(RELAY_SECRET): $([ -n "$RELAY_SECRET" ] && echo ON || echo OFF)"
echo " 로컬 확인: $(curl -s http://localhost:8080/ 2>/dev/null || echo '(잠시 후 다시)')"
echo ""
echo " OpenAI 릴레이 로컬확인: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/v1/models -H 'Authorization: Bearer test' 2>/dev/null || echo '(잠시 후)')  (401=릴레이→OpenAI 정상 도달)"
echo ""
echo " ▼ Cloudflare Pages 환경변수 ▼"
echo "   ALIGO_PROXY_URL  = http://141.164.36.76:8080"
echo "   OPENAI_RELAY_URL = http://141.164.36.76:8080   (GPT Image 국가차단 우회)"
[ -n "$RELAY_SECRET" ] && echo "   ALIGO_PROXY_TOKEN = $RELAY_SECRET   (BYGENCY 도 이 값을 넣어야 함)"
echo "=================================================="
