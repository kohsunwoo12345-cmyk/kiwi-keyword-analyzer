// 요금 계산 — '임의(랜덤)' 검증.
//
//  돈 계산은 특정 값 몇 개만 맞아서는 안 된다. 어떤 조합을 넣어도 '반드시 성립해야 하는 성질'이 있다.
//  모델·초·해상도·환율·배수·크레딧단가를 무작위로 뽑아 그 성질들을 확인한다.
//
//   1) 음수가 절대 나오지 않는다 (비용·크레딧·매출)
//   2) 숫자가 항상 유효하다 (NaN·무한대 없음)
//   3) 매출 = 크레딧 × 크레딧단가 (반올림 오차 1원 이내)
//   4) 순이익 = 매출 − 원가
//   5) 배수를 올리면 크레딧이 줄지 않는다 (단조성)
//   6) 영상 길이를 늘리면 크레딧이 줄지 않는다 (단조성)
//   7) 환율이 오르면 원가가 줄지 않는다 (단조성)
//   8) 같은 입력은 항상 같은 결과 (재현성)
//   9) 배수는 최소 1배 이상 (원가 밑으로 파는 일이 없어야 한다)
//  10) 자체 기능(업스케일·편집)은 제공사 원가가 0 이다
//  11) 크레딧단가를 2배로 하면 크레딧은 절반이 된다 (같은 돈)
//  12) explainCost 가 실제 기록과 어긋난다고 잘못 경고하지 않는다
//
//  실행: node scripts/pricing-random-test.mjs        (SEED=123 · N=400)
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'
import { pathToFileURL } from 'node:url'

const SEED = Number(process.env.SEED || (Date.now() % 1e9))
const N = Number(process.env.N || 400)
console.log(`씨앗(SEED)=${SEED} · 무작위 조합 ${N}개  ← 실패 시 SEED=${SEED} 로 재현됩니다\n`)
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0
  let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t
  return ((t^t>>>14)>>>0)/4294967296 } }
const rnd = mulberry32(SEED)
const ri = (lo,hi)=>lo+Math.floor(rnd()*(hi-lo+1))
const pick = (a)=>a[Math.floor(rnd()*a.length)]

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'price-'))
const OUT = path.join(tmp, 'pricing.mjs')
execFileSync('npx', ['esbuild','functions/api/studio/_pricing.ts','--bundle','--format=esm','--platform=neutral',
  '--outfile='+OUT,'--log-level=error'], { stdio:'inherit' })
const P = await import(pathToFileURL(OUT).href)

const MODELS = Object.keys(P.MODEL_COST)
const RES = ['720p','1080p','4K', undefined]
const out=[]; const ok=(n,c,i)=>out.push([n,!!c,i==null?'':String(i)])
const bad = { neg:[], nan:[], rev:[], profit:[], monoMk:[], monoSec:[], monoRate:[], repeat:[], mk1:[], selfCost:[], basis:[], explain:[] }

for(let i=0;i<N;i++){
  const model = pick(MODELS)
  const m = P.MODEL_COST[model]
  const isImg = m.u === 'img'
  const units = isImg ? 0 : ri(1,120)
  const inp = { model, units, kind: isImg?'image':'video', res: pick(RES), audio: rnd()<0.4 }
  const rate = pick([900, 1200, 1400, 1600.5, 2000])
  const markup = pick([undefined, 0.5, 1, 1.5, 2, 2.5, 3, 7.25])
  const basis = pick([50, 65, 100, 33.3])
  const r = P.computeCharge(inp, rate, markup, basis)
  const tag = `${model} ${isImg?'이미지':units+'초'} 환율${rate} 배수${markup??'기본'} 단가${basis}`

  if(r.costKrw < 0 || r.credits < 0 || r.revenueKrw < 0 || r.usd < 0) bad.neg.push(tag)
  for(const k of ['usd','costKrw','markup','credits','revenueKrw','profitKrw','usdKrw'])
    if(!Number.isFinite(r[k])) bad.nan.push(`${tag} · ${k}=${r[k]}`)
  if(Math.abs(r.revenueKrw - r.credits*basis) > 1) bad.rev.push(`${tag} · 매출 ${r.revenueKrw} vs 크레딧×단가 ${(r.credits*basis).toFixed(2)}`)
  if(Math.abs(r.profitKrw - (r.revenueKrw - r.costKrw)) > 0.011) bad.profit.push(`${tag} · 이익 ${r.profitKrw} vs ${(r.revenueKrw-r.costKrw).toFixed(2)}`)
  if(r.markup < 1) bad.mk1.push(`${tag} · 배수 ${r.markup}`)

  // 배수 단조성
  const lo = P.computeCharge(inp, rate, 1, basis), hi = P.computeCharge(inp, rate, 4, basis)
  if(hi.credits < lo.credits - 1e-9) bad.monoMk.push(`${tag} · 1배 ${lo.credits} → 4배 ${hi.credits}`)
  // 길이 단조성 (영상만)
  if(!isImg){
    const a = P.computeCharge({ ...inp, units: 5 }, rate, markup, basis)
    const b = P.computeCharge({ ...inp, units: 60 }, rate, markup, basis)
    if(b.credits < a.credits - 1e-9) bad.monoSec.push(`${tag} · 5초 ${a.credits} → 60초 ${b.credits}`)
  }
  // 환율 단조성
  const c1 = P.computeCharge(inp, 1000, markup, basis), c2 = P.computeCharge(inp, 2000, markup, basis)
  if(c2.costKrw < c1.costKrw) bad.monoRate.push(`${tag} · 1000 ${c1.costKrw}원 → 2000 ${c2.costKrw}원`)
  // 재현성
  const again = P.computeCharge(inp, rate, markup, basis)
  if(JSON.stringify(again) !== JSON.stringify(r)) bad.repeat.push(tag)
  // 자체 기능은 제공사 원가가 0
  if(P.SELF_HOSTED_PROVS.has(m.prov) && r.costKrw !== 0) bad.selfCost.push(`${tag} · 원가 ${r.costKrw}원`)
  // 크레딧단가를 2배로 하면 크레딧은 절반 (같은 돈)
  const half = P.computeCharge(inp, rate, markup, basis*2)
  if(r.credits > 0 && Math.abs(half.credits - r.credits/2) > Math.max(0.02, r.credits*0.02))
    bad.basis.push(`${tag} · 단가${basis} ${r.credits}크레딧 → 단가${basis*2} ${half.credits}크레딧`)
  // 방금 계산한 값을 그대로 설명시키면 '어긋남' 경고가 나오면 안 된다
  const ex = P.explainCost({ model, kind: r.kind, units, usd: r.usd, usdKrw: rate, costKrw: r.costKrw,
                             credits: r.credits, revenueKrw: r.revenueKrw, markup: r.markup })
  if(ex && ex.mismatch) bad.explain.push(`${tag} · ${JSON.stringify(ex).slice(0,120)}`)
}

const show = (a)=> a.length ? a.slice(0,2).join(' | ') : ''
ok('음수 금액이 나오지 않음', bad.neg.length===0, show(bad.neg) || `${N}건 정상`)
ok('숫자가 항상 유효함(NaN·무한대 없음)', bad.nan.length===0, show(bad.nan) || `${N}건 정상`)
ok('매출 = 크레딧 × 크레딧단가', bad.rev.length===0, show(bad.rev) || `${N}건 일치`)
ok('순이익 = 매출 − 원가', bad.profit.length===0, show(bad.profit) || `${N}건 일치`)
ok('배수는 최소 1배 이상(원가 밑으로 팔지 않음)', bad.mk1.length===0, show(bad.mk1) || `${N}건 정상`)
ok('배수를 올리면 크레딧이 줄지 않음', bad.monoMk.length===0, show(bad.monoMk) || `${N}건 정상`)
ok('영상이 길어지면 크레딧이 줄지 않음', bad.monoSec.length===0, show(bad.monoSec) || '정상')
ok('환율이 오르면 원가가 줄지 않음', bad.monoRate.length===0, show(bad.monoRate) || `${N}건 정상`)
ok('같은 입력은 항상 같은 결과', bad.repeat.length===0, show(bad.repeat) || `${N}건 동일`)
ok('자체 기능(업스케일·편집)은 제공사 원가 0', bad.selfCost.length===0, show(bad.selfCost) || '정상')
ok('크레딧단가를 2배로 하면 크레딧은 절반', bad.basis.length===0, show(bad.basis) || `${N}건 정상`)
ok('방금 계산한 금액을 잘못 경고하지 않음', bad.explain.length===0, show(bad.explain) || `${N}건 정상`)

// 경계값 — 이상한 입력에도 무너지지 않아야 한다
const weird = [
  { name:'없는 모델', args:[{ model:'존재하지-않는-모델', units:10, kind:'video' }, 1400] },
  { name:'초가 0', args:[{ model: MODELS[0], units:0, kind:'video' }, 1400] },
  { name:'초가 음수', args:[{ model: MODELS[0], units:-5, kind:'video' }, 1400] },
  { name:'초가 소수', args:[{ model: MODELS[0], units:3.7, kind:'video' }, 1400] },
  { name:'초가 아주 큼', args:[{ model: MODELS[0], units:1e6, kind:'video' }, 1400] },
  { name:'환율 0', args:[{ model: MODELS[0], units:5, kind:'video' }, 0] },
  { name:'환율 음수', args:[{ model: MODELS[0], units:5, kind:'video' }, -100] },
  { name:'모델명 빈칸', args:[{ model:'', units:5, kind:'video' }, 1400] },
  { name:'초가 NaN', args:[{ model: MODELS[0], units: NaN, kind:'video' }, 1400] },
  { name:'단가 0', args:[{ model: MODELS[0], units:5, kind:'video' }, 1400, 2, 0] },
]
const wBad=[]
for(const w of weird){
  try{
    const r = P.computeCharge(...w.args)
    const bad2 = !Number.isFinite(r.credits) || !Number.isFinite(r.costKrw) || r.credits < 0 || r.costKrw < 0
    if(bad2) wBad.push(`${w.name} → 크레딧 ${r.credits} 원가 ${r.costKrw}`)
  }catch(e){ wBad.push(`${w.name} → 터짐: ${String(e&&e.message||e).slice(0,50)}`) }
}
ok('이상한 입력에도 무너지지 않음(없는 모델·음수·NaN·환율0 등)', wBad.length===0,
   wBad.length ? wBad.slice(0,3).join(' | ') : `${weird.length}가지 모두 안전`)

// billedSeconds — '제공사가 실제로 만드는 초'.
//  ⚠ 요청보다 작을 수 있는 게 정상이다. 런웨이는 최대 10초, 구글은 최대 8초까지만 만들기 때문에
//    100초를 요청해도 10초짜리가 나오고 10초치만 청구된다(과소청구가 아니라 상한).
//  그래서 성질만 본다: 항상 1초 이상 · 유효한 숫자 · 길게 요청할수록 줄지 않음 ·
//  상한이 없는 제공사(브라우저 편집·나레이션 등)는 요청한 만큼 그대로 청구.
const CAPPED = new Set(['seedance','runway','kling','hailuo','luma','google'])
const bsBad=[]
for(let i=0;i<200;i++){
  const model=pick(MODELS), s=ri(1,300)
  const b=P.billedSeconds(model, s)
  const prov=P.MODEL_COST[model].prov
  if(!Number.isFinite(b) || b < 1) bsBad.push(`${model} ${s}초 → ${b}`)
  const b2=P.billedSeconds(model, s+10)
  if(b2 < b) bsBad.push(`${model} 길게 요청했는데 줄어듦 ${s}→${b}, ${s+10}→${b2}`)
  if(!CAPPED.has(prov) && b < s - 0.5) bsBad.push(`${model}(상한 없는 제공사) ${s}초인데 ${b}초만 청구`)
  if(P.billedSeconds(model, s) !== b) bsBad.push(`${model} 같은 입력에 다른 값`)
}
ok('청구 초가 규칙대로(상한 있는 곳은 상한, 없는 곳은 요청 그대로)', bsBad.length===0,
   bsBad.slice(0,3).join(' | ') || '200건 정상')

fs.rmSync(tmp,{recursive:true,force:true})
console.log('')
let fail=0
for(const [n,p,i] of out){ if(!p)fail++; console.log((p?'PASS ':'FAIL ')+n+(i?'  — '+i:'')) }
console.log(`\n씨앗 ${SEED} · ${out.length-fail}/${out.length} passed`)
process.exit(fail?1:0)
