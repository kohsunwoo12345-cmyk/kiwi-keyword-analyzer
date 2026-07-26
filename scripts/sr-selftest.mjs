// 초해상(SR) 업스케일 파이프라인 자체 점검 — 실제 Chromium 에서 캔버스 연산을 돌려 검증한다.
//  검증 대상: 타일 분할·겹침 페더 합성(이음매/빈칸), 모델 패딩 출력 크롭, 엔진 스모크 테스트,
//             알파 보존, 목표 해상도 계산(엔진 배율이 요청과 달라도), 리샘플 폴백의 정직한 표시.
//  실행:  npm i -D playwright-core && node scripts/sr-selftest.mjs      (프로젝트 루트에서)
//  브라우저는 이미지에 설치된 것을 그대로 쓴다(다운로드 없음).
// 새 초해상 파이프라인의 위험한 부분(타일 분할·페더 합성·알파 보존·폴백)을 실제 브라우저에서 검증한다.
import { chromium } from 'playwright-core'
import fs from 'fs'

const html = fs.readFileSync('public/studio-nvc-prv-8b3k2/index.html', 'utf8')
const a = html.indexOf("var SR_MEM='nv_sr4'")
const b = html.indexOf('\nvar DEFS = {')
if (a < 0 || b < 0) throw new Error('SR 블록을 찾지 못함')
const SR = html.slice(a, b)

const STUBS = `
  function toast(){} function tr(s){return s}
  function sameOriginMedia(u){return u}
  // 가짜 SR 엔진: 정확한 최근접이웃 f배 확대 (pad>0 이면 오른쪽·아래에 패딩을 덧붙여 내놓는다)
  function mkRunner(f, pad, tile){
    return { factor:f, tile:tile||64, engine:'MOCK x'+f, run:function(cv){
      var w=cv.width,h=cv.height, ow=w*f+(pad||0), oh=h*f+(pad||0);
      var o=document.createElement('canvas'); o.width=ow; o.height=oh;
      var x=o.getContext('2d');
      if(pad){ x.fillStyle='#f0f'; x.fillRect(0,0,ow,oh); }
      x.imageSmoothingEnabled=false; x.drawImage(cv,0,0,w,h,0,0,w*f,h*f);
      return Promise.resolve(o);
    }};
  }
  function noise(w,h,alpha){
    var c=document.createElement('canvas'); c.width=w; c.height=h;
    var x=c.getContext('2d'), im=x.createImageData(w,h), d=im.data, s=12345;
    function rnd(){ s=(s*1103515245+12345)&0x7fffffff; return (s>>>16)&255; }
    for(var i=0;i<w*h;i++){ d[i*4]=rnd(); d[i*4+1]=rnd(); d[i*4+2]=rnd(); d[i*4+3]=alpha? (i%256) : 255; }
    x.putImageData(im,0,0); return c;
  }
  function nnRef(src,f){   // 기준: 전체를 한 번에 최근접이웃 f배
    var c=document.createElement('canvas'); c.width=src.width*f; c.height=src.height*f;
    var x=c.getContext('2d'); x.imageSmoothingEnabled=false; x.drawImage(src,0,0,c.width,c.height); return c;
  }
  function maxDiff(c1,c2){
    if(c1.width!==c2.width||c1.height!==c2.height) return {dim:c1.width+'x'+c1.height+' vs '+c2.width+'x'+c2.height, max:999};
    var a=c1.getContext('2d').getImageData(0,0,c1.width,c1.height).data;
    var b=c2.getContext('2d').getImageData(0,0,c2.width,c2.height).data;
    var m=0, n=0;
    for(var i=0;i<a.length;i++){ var d=Math.abs(a[i]-b[i]); if(d>m)m=d; if(d>8)n++; }
    return { max:m, bad:n, total:a.length };
  }
`

const TESTS = `
async function run(){
  var out=[];
  function ok(name, cond, info){ out.push({name:name, pass:!!cond, info:info===undefined?'':String(info)}); }

  // 1) 타일 SR 이 전체를 빈틈없이 덮고, 겹침 페더가 원본을 훼손하지 않는가
  var src=noise(300,220,false);
  var got=await _srCanvas2(mkRunner(2,0,64), src);
  var d1=maxDiff(got, nnRef(src,2));
  // 겹침 구간은 알파 합성 반올림으로 ±몇 단위 차이가 난다(육안 불가). 이음매·빈칸이면 100 단위로 벌어진다.
  ok('타일 합성 = 기준 2배 (이음매·빈칸 없음)', d1.max<=6 && d1.bad===0, JSON.stringify(d1));

  // 2) 모델이 8의 배수로 패딩해 더 크게 내놓아도 늘리지 않고 잘라 쓰는가
  var got2=await _srCanvas2(mkRunner(2,6,64), src);
  var d2=maxDiff(got2, nnRef(src,2));
  ok('패딩 출력 크롭 처리(늘리지 않음)', d2.max<=6 && d2.bad===0, JSON.stringify(d2));

  // 3) 타일보다 작은 이미지 / 딱 떨어지지 않는 크기
  var small=noise(40,17,false);
  var got3=await _srCanvas2(mkRunner(4,0,64), small);
  var d3=maxDiff(got3, nnRef(small,4));
  ok('타일보다 작은 이미지 x4', d3.max<=6 && d3.bad===0, JSON.stringify(d3));

  // 4) 스모크 테스트: 깨진 엔진은 걸러내고 정상 엔진만 통과
  var bad1={factor:4,tile:64,engine:'BAD-null',run:function(){return Promise.resolve(null)}};
  var bad2={factor:4,tile:64,engine:'BAD-1x',run:function(cv){return Promise.resolve(cv)}};
  var r1=await _smokeTest(bad1).then(function(){return 'accepted'},function(e){return 'rejected'});
  var r2=await _smokeTest(bad2).then(function(){return 'accepted'},function(e){return 'rejected'});
  var r3=await _smokeTest(mkRunner(2,0,64)).then(function(r){return r.factor},function(e){return 'rejected:'+e.message});
  var r4=await _smokeTest(mkRunner(4,8,64)).then(function(r){return r.factor},function(e){return 'rejected:'+e.message});
  ok('스모크: 결과 없는 엔진 거부', r1==='rejected', r1);
  ok('스모크: 배율 1배 엔진 거부', r2==='rejected', r2);
  ok('스모크: 정상 x2 통과·배율 보정', r3===2, r3);
  ok('스모크: 패딩 x4 통과·배율 보정', r4===4, r4);

  // 5) 알파 보존 — 실제 SR 모델은 RGB 만 다뤄 알파를 255 로 뭉갠다. 그 상황을 그대로 재현해 검증.
  var ac=noise(64,64,true);
  var opaqueRunner={ factor:2, tile:64, engine:'MOCK-opaque', run:function(cv){
    var o=document.createElement('canvas'); o.width=cv.width*2; o.height=cv.height*2;
    var x=o.getContext('2d'); x.fillStyle='#888'; x.fillRect(0,0,o.width,o.height);   // 알파 소실 재현
    x.imageSmoothingEnabled=false; x.drawImage(cv,0,0,o.width,o.height);
    return Promise.resolve(o);
  }};
  var srAlpha=await _srCanvas2(opaqueRunner, ac);
  var beforeA=srAlpha.getContext('2d').getImageData(0,0,srAlpha.width,srAlpha.height).data;
  var allOpaque=true; for(var i=3;i<beforeA.length;i+=4){ if(beforeA[i]!==255){ allOpaque=false; break; } }
  _applyAlphaFrom(srAlpha, ac);
  var px=srAlpha.getContext('2d').getImageData(0,0,srAlpha.width,srAlpha.height).data;
  var seen={}, transparentKept=true;
  for(var i=3;i<px.length;i+=4){ seen[px[i]]=1; }
  // 원본이 완전 투명한 좌상단 픽셀은 결과도 투명해야 한다
  transparentKept = px[3]===0;
  ok('SR 이 알파를 날리는 상황 재현', allOpaque, 'allOpaque='+allOpaque);
  ok('알파 보존(원본 알파 복원)', Object.keys(seen).length>4 && transparentKept, '알파값종류='+Object.keys(seen).length+' 투명유지='+transparentKept);
  ok('_hasAlpha 판정', _hasAlpha(ac)===true && _hasAlpha(noise(8,8,false))===false);

  // 6) upscaleImageURL — 엔진 배율이 요청과 달라도 목표 해상도를 정확히 맞추는가
  var srcUrl=noise(100,50,false).toDataURL('image/png');
  window.getUpscaler=function(){ return Promise.resolve(mkRunner(2,0,64)); };   // x4 요청인데 x2 엔진만 가능
  var prog=[];
  var r5=await upscaleImageURL(srcUrl, 4, null, function(p){ prog.push(p); });
  ok('요청 4배 · x2 엔진 → 목표 해상도 정확', r5.dim==='400×200', r5.dim);
  ok('엔진명 기록', r5.engine==='MOCK x2' && r5.fallback===false, r5.engine);
  ok('진행률 콜백 동작', prog.length>0 && prog[prog.length-1]===1, JSON.stringify(prog.slice(-3)));

  // 7) longTarget(5K 상당) — 긴 변을 목표에 맞춤
  var r6=await upscaleImageURL(srcUrl, 4, { longTarget:400 });
  ok('longTarget 긴 변 맞춤', r6.dim==='400×200', r6.dim);

  // 8) 초해상 불가 → 리샘플 폴백이 '정직하게' 표시되는가
  window.getUpscaler=function(){ return Promise.reject(new Error('엔진 없음')); };
  var r7=await upscaleImageURL(srcUrl, 2);
  ok('폴백 표시(fallback=true)', r7.fallback===true && r7.engine==='리샘플(폴백)', r7.engine);
  ok('폴백 해상도', r7.dim==='200×100', r7.dim);
  ok('폴백 사유 전달', /엔진 없음/.test(r7.reason||''), r7.reason);

  // 9) 리샘플 폴백 자체의 출력 크기(단계적 확대 경로 포함)
  var r8=await _upscaleImageResample(srcUrl, 3.5);
  ok('리샘플 3.5배 크기', r8.dim==='350×175', r8.dim);

  return out;
}
`

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page = await browser.newPage()
const errs = []
page.on('pageerror', (e) => errs.push(String(e)))
await page.setContent('<!doctype html><meta charset="utf-8"><body></body>')
await page.addScriptTag({ content: STUBS + '\n' + SR + '\n' + TESTS })
const results = await page.evaluate('run()')
await browser.close()

let fail = 0
for (const r of results) {
  if (!r.pass) fail++
  console.log((r.pass ? 'PASS ' : 'FAIL ') + r.name + (r.info ? '  — ' + r.info : ''))
}
if (errs.length) console.log('\npage errors:\n' + errs.join('\n'))
console.log(`\n${results.length - fail}/${results.length} passed`)
process.exit(fail ? 1 : 0)
