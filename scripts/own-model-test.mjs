// BYGENCY 자체 초해상 모델 검증 — 남의 모델 없이 우리 것만으로 진짜 화질이 좋아지는가.
//
//  · 남의 모델 경로(/models/hf/*)를 전부 막아, 오직 우리 자체 모델만 쓰이도록 강제한다.
//  · 실행기는 진짜 onnxruntime-web, 모델은 우리가 학습시켜 배포하는 진짜 ONNX 파일이다.
//  · 판정: 선명한 정답 → 일부러 흐리게 → 되살리기 → 정답에 얼마나 가까운지(PSNR).
//    단순 확대보다 높아야 '초해상' 이라 부를 수 있다.
//
//  OWN_OUT=디렉터리 로 전/후 그림을 남길 수 있다.
//  실행: npm i -D playwright-core onnxruntime-web@1.17.1 esbuild && node scripts/own-model-test.mjs
import { chromium } from 'playwright-core'
import { execFileSync } from 'node:child_process'
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'

const PUB = path.resolve('public')
const OWN = path.join(PUB, 'models-own/bygency-sr-x2/model.onnx')
const ORT_DIR = path.resolve('node_modules/onnxruntime-web/dist')
if (!fs.existsSync(OWN)) { console.error('자체 모델이 없습니다: ' + OWN + '\n  python3 scripts/train-sr-model.py 로 먼저 학습하세요'); process.exit(2) }
if (!fs.existsSync(ORT_DIR)) { console.error('준비물 없음: npm i -D onnxruntime-web@1.17.1 esbuild'); process.exit(2) }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ownsr-'))
const ORT_ESM = path.join(tmp, 'ortweb.mjs')
execFileSync('npx', ['esbuild', 'onnxruntime-web', '--bundle', '--format=esm', '--platform=browser',
  '--outfile=' + ORT_ESM, '--log-level=error'], { stdio: 'inherit' })

const CT = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.png':'image/png', '.css':'text/css', '.onnx':'application/octet-stream', '.json':'application/json' }
const server = http.createServer((req,res)=>{
  const u = new URL(req.url,'http://x'); const p = u.pathname
  const send=(c,b,ct)=>{res.writeHead(c,{'content-type':ct||'application/json','cache-control':'no-store'});res.end(b)}
  if(p === '/models/lib/ortweb') return send(200, fs.readFileSync(ORT_ESM), 'text/javascript')
  if(p.startsWith('/models/ortw/')){
    const f = path.join(ORT_DIR, path.basename(p))
    return fs.existsSync(f) ? send(200, fs.readFileSync(f), 'application/wasm') : send(404,'no','text/plain')
  }
  // 남의 모델은 전부 막는다 — 우리 자체 모델만으로 결과가 나와야 한다
  if(p.startsWith('/models/')){
    if(u.searchParams.get('probe')==='1') return send(200, JSON.stringify({ ok:false }))
    return send(502,'차단됨(자체 모델만 검증)','text/plain')
  }
  if(p.startsWith('/api/')) return send(200, JSON.stringify({ ok:true }))
  const f = path.join(PUB, p.replace(/^\//,'').replace(/\/$/,''))
  if(f.startsWith(PUB)&&fs.existsSync(f)&&fs.statSync(f).isFile()) return send(200, fs.readFileSync(f), CT[path.extname(f)]||'application/octet-stream')
  return send(404,'nf','text/plain')
})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
const origin='http://127.0.0.1:'+server.address().port

const browser=await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page=await browser.newPage(); const errs=[]; const reqs=[]
page.on('pageerror',e=>errs.push(String(e).slice(0,200)))
page.on('request',r=>reqs.push(r.url()))
await page.goto(origin+'/studio-nvc-prv-8b3k2/index.html?cnexport=1',{waitUntil:'domcontentloaded'})
await page.waitForTimeout(1500)

const out=[]; const ok=(n,c,i)=>out.push([n,!!c,i==null?'':String(i)])

// 어떤 엔진이 잡히는가 — 반드시 우리 자체 모델이어야 한다
const eng = await page.evaluate(() => window.nvSrCheck(2).catch(e => ({ ok:false, error:String(e) })))
ok('자체 모델이 초해상 엔진으로 채택됨', eng.ok === true && /BYGENCY/.test(eng.engine || ''),
   `${eng.engine || eng.error} · ${eng.factor}배 · ${eng.ms}ms`)

// 두 종류 그림으로 화질을 잰다
for (const pattern of ['lines', 'photo']) {
  const r = await page.evaluate(async (pat) => {
    const load = (u) => new Promise((k,n)=>{ const i=new Image(); i.onload=()=>k(i); i.onerror=n; i.src=u })
    const px = (img,w,h) => { const c=document.createElement('canvas'); c.width=w; c.height=h
      const x=c.getContext('2d'); x.imageSmoothingEnabled=true; x.imageSmoothingQuality='high'
      x.drawImage(img,0,0,w,h); return x.getImageData(0,0,w,h).data }
    const psnr = (a,b) => { let se=0,n=0
      for(let i=0;i<a.length;i+=4){ for(let k=0;k<3;k++){ const d=a[i+k]-b[i+k]; se+=d*d; n++ } }
      const mse=se/Math.max(1,n); return mse<=0?99:Math.round(10*Math.log10(255*255/mse)*100)/100 }
    const sharp = (d,w,h) => { let s=0,n=0
      const lum=i=>0.299*d[i]+0.587*d[i+1]+0.114*d[i+2]
      for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++){ const i=(y*w+x)*4
        s+=Math.abs(lum(i)-lum(i+4))+Math.abs(lum(i)-lum(i+w*4)); n+=2 }
      return Math.round((s/n)*1000)/1000 }

    const TW=640, TH=360
    const t=document.createElement('canvas'); t.width=TW; t.height=TH
    const x=t.getContext('2d')
    if(pat==='photo'){
      const g=x.createRadialGradient(TW*0.4,TH*0.4,20,TW*0.5,TH*0.5,TW*0.7)
      g.addColorStop(0,'#f2e2c0'); g.addColorStop(0.5,'#a4785a'); g.addColorStop(1,'#22304a')
      x.fillStyle=g; x.fillRect(0,0,TW,TH)
      for(let i=0;i<18;i++){ const cx=(i*173)%TW, cy=(i*97)%TH, r2=30+(i*37)%80
        const rg=x.createRadialGradient(cx,cy,1,cx,cy,r2)
        rg.addColorStop(0,'rgba(255,240,220,0.5)'); rg.addColorStop(1,'rgba(255,240,220,0)')
        x.fillStyle=rg; x.beginPath(); x.arc(cx,cy,r2,0,Math.PI*2); x.fill() }
    } else {
      const g=x.createLinearGradient(0,0,TW,TH); g.addColorStop(0,'#12306e'); g.addColorStop(1,'#d8b070')
      x.fillStyle=g; x.fillRect(0,0,TW,TH)
      x.strokeStyle='#fff'; x.lineWidth=1
      for(let i=0;i<26;i++){ x.beginPath(); x.moveTo(12+i*24,12); x.lineTo(12+i*24,160); x.stroke() }
      for(let i=0;i<7;i++){ x.beginPath(); x.moveTo(12,175+i*16); x.lineTo(TW-12,175+i*16); x.stroke() }
      for(let i=0;i<7;i++){ x.beginPath(); x.arc(60+i*90,300,22,0,Math.PI*2); x.stroke() }
      x.fillStyle='#fff'; x.font='bold 26px sans-serif'; x.fillText('BYGENCY 자체 모델 1234', 16, TH-14)
    }
    const truthUrl=t.toDataURL('image/png')

    // 사용자가 가진 그림처럼 — 절반으로 줄이고 압축
    const h2=document.createElement('canvas'); h2.width=TW/2; h2.height=TH/2
    const hx=h2.getContext('2d'); hx.imageSmoothingEnabled=true; hx.imageSmoothingQuality='high'
    hx.drawImage(t,0,0,TW/2,TH/2)
    const degraded=h2.toDataURL('image/jpeg',0.7)

    const t0=performance.now()
    const res=await window.__cn.upscaleImageURL(degraded, 2)
    const ms=Math.round(performance.now()-t0)

    const [truthImg, srImg, degImg]=await Promise.all([load(truthUrl), load(res.url), load(degraded)])
    const truthPx=px(truthImg,TW,TH), srPx=px(srImg,TW,TH), plainPx=px(degImg,TW,TH)
    return { ms, dim:res.dim, engine:res.engine, fallback:!!res.fallback,
             psnrSr:psnr(truthPx,srPx), psnrPlain:psnr(truthPx,plainPx),
             sharpTruth:sharp(truthPx,TW,TH), sharpSr:sharp(srPx,TW,TH), sharpPlain:sharp(plainPx,TW,TH),
             truthUrl, degradedUrl:degraded, outUrl:res.url }
  }, pattern)

  const P = pattern === 'lines' ? '선·글자형' : '사진형'
  ok(`[${P}] 자체 모델로 처리됨(단순 확대 아님)`, r.fallback === false && /BYGENCY/.test(r.engine), `${r.engine} · ${r.dim} · ${r.ms}ms`)
  ok(`[${P}] 단순 확대보다 원본에 가까움`, r.psnrSr > r.psnrPlain,
     `단순확대 ${r.psnrPlain} dB → 자체 모델 ${r.psnrSr} dB (${r.psnrSr - r.psnrPlain >= 0 ? '+' : ''}${(r.psnrSr - r.psnrPlain).toFixed(2)})`)
  ok(`[${P}] 디테일이 단순 확대보다 살아남`, r.sharpSr > r.sharpPlain,
     `정답 ${r.sharpTruth} · 단순확대 ${r.sharpPlain} → 자체 모델 ${r.sharpSr}`)

  if (process.env.OWN_OUT) {
    const dir = path.resolve(process.env.OWN_OUT); fs.mkdirSync(dir, { recursive:true })
    const save=(n,u)=>{ const m=/^data:image\/\w+;base64,(.+)$/.exec(String(u)||''); if(m) fs.writeFileSync(path.join(dir,n+'.png'), Buffer.from(m[1],'base64')) }
    save(`${P}-1-정답`, r.truthUrl); save(`${P}-2-흐리게만든입력`, r.degradedUrl); save(`${P}-3-자체모델`, r.outUrl)
  }
  console.log(`[${P}]  단순확대 ${r.psnrPlain} dB → 자체 모델 ${r.psnrSr} dB  (${r.ms}ms · ${r.engine})`)
}

// 남의 모델을 하나도 쓰지 않았는가
const hf = reqs.filter(u => /\/models\/hf\//.test(u) && !/probe=1/.test(u))
ok('남의 모델을 내려받지 않음', hf.length === 0, hf.length ? hf.slice(0,2).join(' , ') : '0건')
const external = reqs.filter(u => !u.startsWith(origin) && !/^(data|blob|about):/.test(u))
ok('외부 서버 요청 0건', external.length === 0, external.slice(0,3).join(' , ') || '없음')
ok('페이지 오류 없음', errs.length === 0, errs.slice(0,2).join(' | ') || '없음')

await browser.close(); server.close(); fs.rmSync(tmp,{recursive:true,force:true})
console.log('')
let fail=0
for(const [n,p,i] of out){ if(!p)fail++; console.log((p?'PASS ':'FAIL ')+n+(i?'  — '+i:'')) }
console.log(`\n${out.length-fail}/${out.length} passed`)
process.exit(fail?1:0)
