/* 영상 화질 올리기 — 실제로 돌려 보고 나서야 드러난 것들을 못으로 박아 둔다.
 *
 * 브라우저에서 제품 코드를 그대로 태워 보니 세 가지가 틀려 있었다(전부 실측):
 *   ① 결과 길이가 "처리에 걸린 시간" 이었다 — MediaRecorder 는 프레임을 넘긴 순간의 벽시계로
 *      시각을 찍는데, 프레임마다 초해상을 돌리면 실시간보다 한참 느리다.
 *      2.97초 원본 → 5.05초 슬로모션. 느릴수록 더 늘어나 30분짜리는 며칠짜리 파일이 된다.
 *   ② 소리가 통째로 사라졌다 — 캔버스 스트림에는 오디오 트랙이 없다.
 *   ③ 소리를 붙였더니 이번엔 3초 중 0.03초만 남았다 — 초해상이 메인 스레드를 붙잡고 있는 동안
 *      오디오 조각을 못 읽어 버려졌다(1280×720 → 4K).
 *   ④ 그걸 워커로 옮겼더니 원본이 끝난 뒤의 무음까지 실려 3초가 5.3초가 됐다.
 *
 * 그래서 지금 구조는: 프레임 시각을 우리가 찍고(WebCodecs), 소리는 워커에서 뽑고,
 * 원본 길이를 넘는 소리는 버린다. 이 네 가지 중 하나라도 되돌아가면 길이·소리가 다시 깨진다.
 * 여기서는 그 못들이 그대로 있는지, 그리고 30분 한도가 살아 있는지를 지킨다.
 * (검사가 자기 설명문을 읽고 안심하지 않도록 주석을 먼저 지운다 — 예전에 그 함정에 빠진 적이 있다)
 */
import fs from 'node:fs'
const ROOT = '/home/user/kiwi-keyword-analyzer/'
const raw = fs.readFileSync(ROOT + 'public/studio-nvc-prv-8b3k2/index.html', 'utf8')
const src = raw.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/[^\n]*/gm, ' ')

/** 함수 하나의 본문만 잘라 낸다 — 옆 함수의 코드를 보고 통과하면 검사가 아니다. */
function body(name) {
  const i = src.indexOf('function ' + name + '(')
  if (i < 0) return ''
  const s0 = src.indexOf('{', i)
  let d = 0, j = s0
  for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (!d) { j++; break } } }
  return src.slice(s0, j)
}

const fails = []
const ok = (name, cond, detail = '') => {
  if (!cond) fails.push(name + (detail ? ' — ' + detail : ''))
  console.log(`${cond ? 'OK  ' : 'FAIL'} ${name}${detail && !cond ? ' — ' + detail : ''}`)
}

const up = body('upscaleVideoURL')
const grab = body('_grabAudioOpus')
const mux = body('webmWriter')
const resample = body('_upscaleVideoResample')

ok('본문을 찾았다 (upscaleVideoURL·_grabAudioOpus·webmWriter)', !!up && !!grab && !!mux,
   `${up.length}/${grab.length}/${mux.length}자`)

// ① 30분까지 받는다
{
  const m = /MAXSEC\s*=\s*(\d+)/.exec(up)
  ok('① 최대 길이가 1800초(30분)다', m && Number(m[1]) === 1800, m ? m[1] + '초' : 'MAXSEC 이 없다')
}

// ② 프레임 시각을 프레임 번호로 찍는다 (벽시계 아님)
{
  ok('② 프레임 시각이 프레임 번호에서 나온다', /timestamp:\s*Math\.round\(idx\s*\*\s*1000000\s*\/\s*FPS\)/.test(up),
     '이게 없으면 결과 길이가 처리 시간이 된다')
  ok('②-b 초해상 경로가 MediaRecorder 로 녹화하지 않는다', !/MediaRecorder/.test(up),
     'MediaRecorder 는 넘긴 순간의 벽시계로 시각을 찍는다')
  ok('②-c WebCodecs 인코더를 쓴다', /new VideoEncoder\(/.test(up) && /enc\.encode\(/.test(up))
  ok('②-d WebCodecs 가 없는 브라우저는 실시간 리샘플로 물러난다',
     /typeof VideoEncoder\s*===\s*'undefined'[\s\S]{0,80}fallback\(\)/.test(up))
}

// ③ 소리를 워커에서 뽑는다 (메인 스레드가 막혀도 안 끊기게)
{
  ok('③ 오디오 캡처가 워커에서 돈다', /new Worker\(/.test(grab), '메인 스레드에서 읽으면 초해상 중에 조각이 버려진다')
  ok('③-b 워커 안에서 Opus 로 인코딩한다', /AudioEncoder\([\s\S]{0,400}?opus/.test(grab))
  ok('③-c 소리 없는 원본에는 트랙을 안 만든다', /getAudioTracks\(\)\.length/.test(grab))
  ok('③-d 업스케일하는 동안 원본 소리가 들리지 않는다',
     /createMediaElementSource\([\s\S]{0,40}?\)\.connect\(dest\)/.test(grab) && !/connect\(ac\.destination\)/.test(grab))
}

// ④ 원본 길이를 넘는 소리(그래프가 뱉는 무음)는 버린다
{
  ok('④ 원본 길이를 넘는 오디오 조각을 버린다', /c\.ms\s*>\s*clipMs/.test(up),
     '없으면 뒤에 무음이 붙어 결과가 길어진다')
  ok('④-b 그 기준이 실제 원본 길이(clip)에서 나온다', /clipMs\s*=\s*Math\.round\(clip\s*\*\s*1000\)/.test(up))
}

// ⑤ 뭉치기(muxer)가 영상·소리 트랙을 모두 쓴다
{
  ok('⑤ 오디오 트랙(A_OPUS)을 넣는다', /A_OPUS/.test(mux))
  ok('⑤-b 길이를 파일에 적는다(Duration)', /_ebFloat\(0x4489/.test(mux))
  ok('⑤-c 클러스터를 만들어지는 대로 떨어뜨린다(장시간 메모리)', /parts\.push\(new Blob\(/.test(mux))
}

// ⑥ 리샘플 폴백도 30분을 견딘다 (예전엔 3분 고정 타임아웃이라 3분 넘으면 무조건 죽었다)
{
  ok('⑥ 폴백 타임아웃이 영상 길이에 따라 늘어난다', /\(v\.duration\s*\|\|\s*60\)\)\s*\*\s*1400/.test(resample),
     '고정값이면 긴 영상은 "처리 시간 초과" 로 죽는다')
  ok('⑥-b 3분 고정 타임아웃이 남아 있지 않다', !/,\s*180000\s*\)/.test(resample))
  ok('⑥-c 장시간 녹화를 주기적으로 flush 한다', /rec\.start\(2000\)/.test(resample))
}

// ⑦ 길이에 맞춘 용량 예산 — 30분×4K 를 예전 식으로 뽑으면 2GB 가 넘는다
{
  ok('⑦ 길이로 비트레이트 상한을 건다', /1\.2e9\s*\*\s*8\s*\/\s*Math\.max\(1,\s*clip\)/.test(up))
  //  정의만 있고 아무도 안 부르면 소용없다 — 실제 업로드 경로가 크기를 보고 갈아타는지 본다
  const host = body('hostMediaBlob')
  ok('⑦-b 큰 결과물은 나눠 올린다(함수 본문 한도 초과)',
     /blob\.size\s*>\s*80\s*\*\s*1024\s*\*\s*1024[\s\S]{0,60}_hostMediaBlobBig\(/.test(host) && /mp=start/.test(src))
}

/* ⑨ 모델에 넣기 전에 원본을 깎지 않는다
   1440 고정이던 시절엔 1080p 원본이 4K 로 갈 때 1920→1440 으로 먼저 줄여 들어갔다.
   결과 크기는 4K 였지만 원본에 있던 디테일을 버리고 키운 것이었다(해상도 사슬 실측).
   목표의 절반(최대 1920)까지는 원본 그대로 넣어야 한다 — 모델이 ×4 이니 목표의 2배가
   나오고, 그걸 줄여 맞추면 가장 선명하다. */
{
  ok('⑨ 모델 입력 상한이 목표 화질에서 나온다',
     /CAP\s*=\s*Math\.max\(640,\s*Math\.min\(1920,\s*Math\.round\(opts\.longTarget\s*\/\s*2\)\)\)/.test(up),
     '고정값으로 되돌리면 1080p → 4K 에서 원본을 먼저 깎는다')
  ok('⑨-b 1440 고정 상한이 남아 있지 않다', !/CAP\s*=\s*Math\.max\(CAP\s*,\s*1440\)/.test(up))
}

// ⑧ 남은 시간을 실제 속도로 알려 준다 (30분짜리는 몇 시간이 될 수 있다)
{
  ok('⑧ 남은 시간을 계산해 알려 준다', /etaSec:\s*left/.test(up) && /남은 시간 약/.test(src))
  ok('⑧-b 감당 못 할 예상 시간이면 스스로 줄인다', /function retune\(\)/.test(up))
}

console.log(fails.length === 0
  ? '\n영상 업스케일 구조 — 실패 0 (길이·소리·30분 한도 전부 살아 있음)'
  : `\n실패 ${fails.length}건:`)
fails.forEach((f) => console.log('  ✗ ' + f))
process.exit(fails.length ? 1 : 0)
