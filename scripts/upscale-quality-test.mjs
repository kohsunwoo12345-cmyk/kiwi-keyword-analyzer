// "고치기 전보다 실제로 화질이 좋아졌는가" 를 같은 조건에서 숫자로 비교한다.
//
//  화질을 재는 방법(초해상 분야의 표준):
//   1) 선명한 정답 그림을 준비한다
//   2) 일부러 흐리게 만든다(축소 + JPEG 압축) — 이게 '사용자가 가진 그림'
//   3) 그걸 원래 크기로 되살린다
//   4) 되살린 그림이 정답과 얼마나 같은지(PSNR, dB) 잰다 — 높을수록 원본에 가깝다
//
//  모델은 두 버전에 '똑같은 것' 을 물려서, 달라지는 것이 오직 우리 처리 방식뿐이게 만든다.
//  (모델 품질이 아니라 "모델에 무엇을 어떻게 넣는가" 를 재는 것이 목적)
//  검사 대상: 지금 코드(public/) vs 고치기 전 코드(git 에서 꺼낸 사본)
//
//  PATTERN=lines|photo 로 그림 종류를 바꿔 잰다(기본 lines).
//    lines = 선·격자·글자가 많은 그림 / photo = 부드러운 명암과 미세한 결
//    두 종류는 선명화에 반대로 반응하므로, 설정을 바꿀 때는 반드시 둘 다 재야 한다.
//  OLD_HTML=경로 로 비교 대상 지정. 없으면 지금 코드만 재고 기준선과 비교한다.
//  QUALITY_OUT=디렉터리 로 결과 그림을 남길 수 있다.
//  실행: npm i -D playwright-core && node scripts/upscale-quality-test.mjs
import { chromium } from 'playwright-core'
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'

const PUB = path.resolve('public')
const OLD_HTML = process.env.OLD_HTML || ''
const CT = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.png':'image/png', '.css':'text/css' }

// 두 버전에 똑같이 물릴 모델. 모델이 같으니 점수 차이는 전적으로 처리 방식의 차이다.
//  · 'plain'  : 그냥 4배 확대만 하는 평범한 모델 (복원 능력 없음)
//  · 'better' : 확대 후 흐릿함을 되살리는, 조금 더 좋은 모델 (실제 초해상 모델의 대역)
//  둘을 각각 물려 보면 "좋은 모델의 이득이 결과까지 그대로 전달되는가" 를 확인할 수 있다.
let MODEL_MODE = 'plain'
const fakeTransformers = (mode) => `
export const env = { allowLocalModels:true, useBrowserCache:true, remotePathTemplate:'', remoteHost:'',
                     backends:{ onnx:{ wasm:{ wasmPaths:'' } } } };
export async function pipeline(task, model, opts){
  const base = env.remoteHost + '/' + model + '/resolve/main/';
  const r = await fetch(base + 'config.json'); if(!r.ok) throw new Error('config 없음');
  if(opts && opts.quantized === false){ const q = await fetch(base + 'onnx/model.onnx'); if(!q.ok) throw new Error('fp32 없음'); }
  return async function(dataUrl){
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl; });
    const c = document.createElement('canvas'); c.width = img.width*4; c.height = img.height*4;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(img, 0, 0, c.width, c.height);
    ${mode === 'better' ? `
    // 흐려진 가장자리를 되살린다 — '복원할 줄 아는 모델' 의 대역
    try{
      const w=c.width, h=c.height, src=x.getImageData(0,0,w,h), d=src.data;
      const outI=x.createImageData(w,h), o=outI.data, A=0.55;
      for(let y=0;y<h;y++) for(let xx=0;xx<w;xx++){
        const i=(y*w+xx)*4;
        for(let k=0;k<3;k++){
          const j=i+k, cur=d[j];
          const l=xx>0?d[j-4]:cur, rr=xx<w-1?d[j+4]:cur, u=y>0?d[j-w*4]:cur, dn=y<h-1?d[j+w*4]:cur;
          const v=cur+(cur*4-l-rr-u-dn)*A*0.6;
          o[j]=v<0?0:v>255?255:v;
        }
        o[i+3]=d[i+3];
      }
      x.putImageData(outI,0,0);
    }catch(e){}` : ''}
    return { toCanvas: () => c };
  };
}`

const server = http.createServer((req,res)=>{
  const u = new URL(req.url,'http://x'); const p = u.pathname
  const send=(c,b,ct)=>{res.writeHead(c,{'content-type':ct||'application/json','cache-control':'no-store'});res.end(b)}
  if(p === '/models/lib/transformers') return send(200, fakeTransformers(MODEL_MODE), 'text/javascript')
  if(p.startsWith('/models/')){
    if(u.searchParams.get('probe')==='1') return send(200, JSON.stringify({ ok:/swin2SR/.test(p), cached:true, bytes:1234 }))
    if(/config\.json$/.test(p)) return send(200, JSON.stringify({ model_type:'swin2sr', upscale:4 }))
    if(/model\.onnx$/.test(p)) return send(200, 'ONNX', 'application/octet-stream')
    return send(404,'no')
  }
  if(p.startsWith('/api/')) return send(200, JSON.stringify({ ok:true }))
  if(p === '/old/index.html' && OLD_HTML && fs.existsSync(OLD_HTML))
    return send(200, fs.readFileSync(OLD_HTML), 'text/html; charset=utf-8')
  const f = path.join(PUB, p.replace(/^\//,'').replace(/\/$/,''))
  if(f.startsWith(PUB)&&fs.existsSync(f)&&fs.statSync(f).isFile()) return send(200, fs.readFileSync(f), CT[path.extname(f)]||'application/octet-stream')
  return send(404,'nf','text/plain')
})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
const origin='http://127.0.0.1:'+server.address().port

const browser=await chromium.launch({
  executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--autoplay-policy=no-user-gesture-required'],
})

/** 한 버전을 띄워 화질 점수를 잰다 */
async function measure(pageUrl, label) {
  const page = await browser.newPage()
  const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 160)))
  await page.goto(pageUrl, { waitUntil:'domcontentloaded' })
  await page.waitForTimeout(1400)

  const r = await page.evaluate(async () => {
    // ── 도구 ──
    const load = (u) => new Promise((ok,no)=>{ const i=new Image(); i.onload=()=>ok(i); i.onerror=no; i.src=u })
    const px = (img, w, h) => { const c=document.createElement('canvas'); c.width=w; c.height=h
      const x=c.getContext('2d'); x.imageSmoothingEnabled=true; x.imageSmoothingQuality='high'
      x.drawImage(img,0,0,w,h); return x.getImageData(0,0,w,h).data }
    const psnr = (a,b) => { let se=0,n=0
      for(let i=0;i<a.length;i+=4){ for(let k=0;k<3;k++){ const d=a[i+k]-b[i+k]; se+=d*d; n++ } }
      const mse=se/Math.max(1,n); return mse<=0 ? 99 : Math.round(10*Math.log10(255*255/mse)*100)/100 }
    // 가장자리(디테일)가 얼마나 살아 있는지
    const sharp = (d,w,h) => { let s=0,n=0
      const lum=i=>0.299*d[i]+0.587*d[i+1]+0.114*d[i+2]
      for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++){ const i=(y*w+x)*4
        s+=Math.abs(lum(i)-lum(i+4))+Math.abs(lum(i)-lum(i+w*4)); n+=2 }
      return Math.round((s/n)*1000)/1000 }

    // ── 1) 정답 그림 (1280×720) ──
    //   두 가지 성격으로 잰다. 한 종류에만 맞춰 조정하면 다른 그림에서 나빠질 수 있다.
    //    lines = 가는 선·격자·글자 (도표·자막·로고 같은 그림)
    //    photo = 부드러운 명암과 미세한 결 (사람·풍경 사진, AI 생성물)
    const TW=1280, TH=720
    const t=document.createElement('canvas'); t.width=TW; t.height=TH
    const x=t.getContext('2d')
    const mode=new URL(location.href).searchParams.get('pattern')||'lines'
    if(mode==='photo'){
      const g=x.createRadialGradient(TW*0.4,TH*0.4,40,TW*0.5,TH*0.5,TW*0.7)
      g.addColorStop(0,'#f2e2c0'); g.addColorStop(0.5,'#a4785a'); g.addColorStop(1,'#22304a')
      x.fillStyle=g; x.fillRect(0,0,TW,TH)
      // 부드러운 덩어리(피사체) 여러 개
      for(let i=0;i<26;i++){
        const cx=(i*173)%TW, cy=(i*97)%TH, r=40+(i*37)%110
        const rg=x.createRadialGradient(cx,cy,1,cx,cy,r)
        rg.addColorStop(0,'rgba(255,240,220,0.55)'); rg.addColorStop(1,'rgba(255,240,220,0)')
        x.fillStyle=rg; x.beginPath(); x.arc(cx,cy,r,0,Math.PI*2); x.fill()
      }
      // 미세한 결(피부·천 질감) — 초해상이 살려야 할 고주파
      const id=x.getImageData(0,0,TW,TH), d=id.data
      for(let i=0,p2=0;i<TW*TH;i++,p2+=4){
        const yy=(i/TW)|0, xx=i%TW
        const n=((xx*7+yy*13)%11-5)*2.2 + ((xx*3-yy*5)%7-3)*1.6
        d[p2]=Math.max(0,Math.min(255,d[p2]+n))
        d[p2+1]=Math.max(0,Math.min(255,d[p2+1]+n))
        d[p2+2]=Math.max(0,Math.min(255,d[p2+2]+n))
      }
      x.putImageData(id,0,0)
    } else {
      const g=x.createLinearGradient(0,0,TW,TH); g.addColorStop(0,'#12306e'); g.addColorStop(1,'#d8b070')
      x.fillStyle=g; x.fillRect(0,0,TW,TH)
      x.strokeStyle='#fff'; x.lineWidth=1
      for(let i=0;i<50;i++){ x.beginPath(); x.moveTo(20+i*25,20); x.lineTo(20+i*25,300); x.stroke() }
      for(let i=0;i<10;i++){ x.beginPath(); x.moveTo(20,320+i*18); x.lineTo(TW-20,320+i*18); x.stroke() }
      for(let i=0;i<12;i++){ x.beginPath(); x.arc(80+i*100,560,32,0,Math.PI*2); x.stroke() }
      x.fillStyle='#fff'; x.font='bold 40px sans-serif'; x.fillText('BYGENCY 화질 검사 1234', 24, 690)
    }
    const truthUrl=t.toDataURL('image/png')

    // ── 2) 사용자가 가진 그림처럼 열화 — 480×270 + JPEG 압축 ──
    const SW=480, SH=270
    const s=document.createElement('canvas'); s.width=SW; s.height=SH
    const sx=s.getContext('2d'); sx.imageSmoothingEnabled=true; sx.imageSmoothingQuality='high'
    sx.drawImage(t,0,0,SW,SH)
    const degraded=s.toDataURL('image/jpeg',0.7)

    // ── 3) 되살리기 — 긴 변 1280 목표 (2.67배) ──
    //    이 배율대가 예전 규칙이 원본을 미리 줄이던 구간이다
    const t0=performance.now()
    const res=await window.__cn.upscaleImageURL(degraded, 4, { longTarget: TW })
    const ms=Math.round(performance.now()-t0)

    const [truthImg, srImg, degImg]=await Promise.all([load(truthUrl), load(res.url), load(degraded)])
    const truthPx=px(truthImg,TW,TH), srPx=px(srImg,TW,TH), plainPx=px(degImg,TW,TH)

    return {
      ms, dim:res.dim, engine:res.engine, fallback:!!res.fallback, note:res.note||'',
      psnrSr:psnr(truthPx,srPx), psnrPlain:psnr(truthPx,plainPx),
      sharpTruth:sharp(truthPx,TW,TH), sharpSr:sharp(srPx,TW,TH), sharpPlain:sharp(plainPx,TW,TH),
      outUrl:res.url, degradedUrl:degraded, truthUrl,
    }
  })
  await page.close()
  return { ...r, errs, label }
}

const out=[]; const ok=(n,c,i)=>out.push([n,!!c,i==null?'':String(i)])

// 두 종류의 그림으로 각각 잰다. 선·글자가 많은 그림과 사진 같은 그림은
//  초해상·선명화에 정반대로 반응하므로, 한쪽만 보고 조정하면 다른 쪽이 나빠진다.
const PATTERNS = (process.env.PATTERN ? [process.env.PATTERN] : ['lines', 'photo'])
const LABEL = { lines: '선·글자형', photo: '사진형' }
const report = []

for (const pat of PATTERNS) {
  const P = LABEL[pat] || pat
  MODEL_MODE = 'plain'
  const now = await measure(origin + '/studio-nvc-prv-8b3k2/index.html?cnexport=1&pattern=' + pat, '지금 코드')
  MODEL_MODE = 'better'
  const better = await measure(origin + '/studio-nvc-prv-8b3k2/index.html?cnexport=1&m=better&pattern=' + pat, '좋은 모델')
  MODEL_MODE = 'plain'
  let old = null
  if (OLD_HTML && fs.existsSync(OLD_HTML)) old = await measure(origin + '/old/index.html?cnexport=1&pattern=' + pat, '고치기 전')

  report.push({ pat: P, now, better, old })

  // ── 어떤 그림에서도 반드시 성립해야 하는 것 ──
  ok(`[${P}] 측정이 완주함`, !!now.dim && !now.fallback, `${now.dim} · ${now.engine} · ${now.ms}ms`)
  ok(`[${P}] 기준선이 상식 범위`, now.psnrPlain > 15 && now.psnrPlain < 45, `단순 확대 ${now.psnrPlain} dB`)
  ok(`[${P}] 페이지 오류 없음`, now.errs.length === 0, now.errs.slice(0, 2).join(' | ') || '없음')
  ok(`[${P}] 원본 디테일이 단순 확대보다 더 남음`, now.sharpSr > now.sharpPlain,
     `정답 ${now.sharpTruth} · 단순확대 ${now.sharpPlain} → 지금 ${now.sharpSr}`)
  if (old) {
    // 같은 모델·같은 그림·같은 목표 → 차이는 전적으로 처리 방식의 차이다
    ok(`[${P}] 고치기 전보다 나빠지지 않음`, now.psnrSr >= old.psnrSr - 0.01,
       `고치기 전 ${old.psnrSr} dB → 지금 ${now.psnrSr} dB (${now.psnrSr - old.psnrSr >= 0 ? '+' : ''}${(now.psnrSr - old.psnrSr).toFixed(2)})`)
    ok(`[${P}] 고치기 전보다 디테일이 더 남음`, now.sharpSr > old.sharpSr,
       `고치기 전 ${old.sharpSr} → 지금 ${now.sharpSr} (정답 ${now.sharpTruth})`)
  }

  // ── 선·글자형에서만 판정할 수 있는 것 ──
  //   사진형의 정답에는 아주 미세한 결(노이즈)이 들어 있는데, 절반 이하로 줄이는 순간
  //   그 결은 물리적으로 사라진다. 어떤 모델도 되살릴 수 없으므로 점수가 거의 움직이지 않는다.
  //   (그래서 사진형은 '나빠지지 않는가' 만 보고, 복원 능력은 선·글자형으로 판정한다)
  if (pat === 'lines') {
    ok(`[${P}] AI 결과가 단순 확대보다 원본에 가까움`, now.psnrSr > now.psnrPlain,
       `단순확대 ${now.psnrPlain} dB → AI ${now.psnrSr} dB (+${(now.psnrSr - now.psnrPlain).toFixed(2)})`)
    ok(`[${P}] 더 좋은 모델을 물리면 결과도 좋아짐(파이프라인이 실력을 깎지 않음)`,
       better.psnrSr > now.psnrSr,
       `평범한 모델 ${now.psnrSr} dB → 좋은 모델 ${better.psnrSr} dB (+${(better.psnrSr - now.psnrSr).toFixed(2)})`)
    ok(`[${P}] 좋은 모델은 단순 확대를 이김`, better.psnrSr > better.psnrPlain,
       `단순확대 ${better.psnrPlain} dB → AI ${better.psnrSr} dB (+${(better.psnrSr - better.psnrPlain).toFixed(2)})`)
    if (old) ok(`[${P}] 고치기 전에는 단순 확대보다도 나빴음(문제 재현)`,
       (old.psnrSr - old.psnrPlain) < (now.psnrSr - now.psnrPlain),
       `단순확대 대비: 고치기 전 ${(old.psnrSr - old.psnrPlain).toFixed(2)} dB → 지금 +${(now.psnrSr - now.psnrPlain).toFixed(2)} dB`)
  }
}

if (process.env.QUALITY_OUT) {
  const dir = path.resolve(process.env.QUALITY_OUT); fs.mkdirSync(dir, { recursive: true })
  const save = (name, url) => { const m = /^data:image\/\w+;base64,(.+)$/.exec(String(url) || '')
    if (m) fs.writeFileSync(path.join(dir, name + '.png'), Buffer.from(m[1], 'base64')) }
  for (const r of report) {
    save(`${r.pat}-1-정답`, r.now.truthUrl)
    save(`${r.pat}-2-흐리게만든입력`, r.now.degradedUrl)
    if (r.old) save(`${r.pat}-3-고치기전`, r.old.outUrl)
    save(`${r.pat}-4-지금코드`, r.now.outUrl)
  }
  console.log('결과 그림 저장:', dir)
}

await browser.close(); server.close()
console.log('')
for (const r of report) {
  console.log(`┌ [${r.pat}] 화질 점수 (PSNR · 높을수록 원본에 가까움)`)
  console.log('│  단순 확대(기준선)     : ' + r.now.psnrPlain + ' dB')
  if (r.old) console.log('│  고치기 전            : ' + r.old.psnrSr + ' dB')
  console.log('│  지금 코드            : ' + r.now.psnrSr + ' dB')
  console.log('│  지금 코드 + 좋은 모델 : ' + r.better.psnrSr + ' dB')
  console.log('└  디테일: 정답 ' + r.now.sharpTruth + ' · 단순확대 ' + r.now.sharpPlain +
              (r.old ? ' · 고치기 전 ' + r.old.sharpSr : '') + ' · 지금 ' + r.now.sharpSr)
}
console.log('')
let fail = 0
for (const [n, p, i] of out) { if (!p) fail++; console.log((p ? 'PASS ' : 'FAIL ') + n + (i ? '  — ' + i : '')) }
console.log(`\n${out.length - fail}/${out.length} passed`)
process.exit(fail ? 1 : 0)
