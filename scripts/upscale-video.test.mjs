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
/* 저장소 위치는 체크아웃마다 다르다 — 배포 서버는 /home/user 가 아니다.
   빌드가 npm test 를 먼저 돌리므로, 경로를 박아 두면 그 서버에서 테스트가 파일을 못 찾아
   빌드 자체가 죽는다. 이 파일 위치에서 저장소 뿌리를 구한다. */
const ROOT = new URL('../', import.meta.url).pathname
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

/** 문자열로 들고 있는 코드(워커 본문 등)까지 보려면 함수 본문을 그대로 꺼내야 한다 */
const _srcOf = (name) => body(name)

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

/* ⑩ GPU 없이 CPU 코어를 나눠 쓴다
   초해상은 타일을 하나씩 순서대로 돌렸다 — 코어가 4개여도 1개만 썼다.
   WASM 내부 스레드는 교차출처 격리 헤더가 필요한데 재 보니 이 작업에서 1.11배뿐이고
   세션 준비는 6배 느려졌다(실측) → 대신 워커마다 엔진을 세워 타일을 나눠 돌린다.
   실측: 프레임당 770ms → 498ms(1.55배). 워커가 없으면 기존 단일 경로로 물러나고 결과는 같다. */
{
  const pool = body('ensureSrPool')
  ok('⑩ 워커 묶음이 있다', /new Worker\([\s\S]{0,60}type:\s*'module'/.test(pool), 'GPU 없이 코어를 나눠 쓰는 유일한 길이다')
  /*  워커 개수가 속도를 거의 다 정한다(시간의 90%가 초해상). 단계별 실측에서 최적점이
      정확히 "코어 수" 였다: 4코어에서 1개 6770ms · 2개 3720 · 3개 2492 · 4개 1970 · 5개 2021 · 8개 2147.
      한때 메모리가 걱정돼 2개로 묶어 뒀고, 그게 1.89배를 버리고 있었다 — 다시 줄이지 못하게 못을 박는다. */
  ok('⑩-b 워커 개수가 코어 수까지 올라간다', /Math\.min\(cores,\s*memCap\)/.test(pool),
     '코어 수보다 적게 묶으면 그만큼 그냥 느려진다')
  ok('⑩-b2 기기 메모리로 상한을 둔다', /navigator\.deviceMemory/.test(pool), '워커마다 가중치를 따로 들고 있다')
  ok('⑩-b3 워커를 하나도 안 쓰는 경우는 없다', /Math\.max\(1,\s*Math\.min\(cores/.test(pool),
     '워커 1개라도 메인 스레드 단독보다 빠르다(428ms vs 770ms 실측)')
  ok('⑩-c 픽셀 변환을 워커가 한다(메인 스레드 부담↓)', /Float32Array\(3\s*\*\s*n\)/.test(_srcOf('_srWorkerSrc')))
  const up2 = body('getUpscaler')
  ok('⑩-d 묶음을 못 만들면 기존 단일 경로로 물러난다',
     /ensureSrPool\([\s\S]{0,400}?\.catch\([\s\S]{0,200}?ensureEsrgan\(/.test(up2))
  const sc = body('_srCanvas2')
  ok('⑩-e 타일을 동시에 돌린다', /Promise\.all\(lanes\.map\(runLane\)\)/.test(sc), '한 장씩 돌면 코어 1개만 쓴다')
  ok('⑩-f 동시에 도는 만큼 자르기 캔버스를 따로 둔다', /lanes\.push\(\{\s*cv:/.test(sc), '한 장을 나눠 쓰면 서로 덮어쓴다')
}

/* ⑭ "빠르게" 는 화질을 낮추는 게 아니라 가벼운 모델로 바꾸는 것이다
   정답을 놓고 잰 비교(실제 학습된 ESRGAN 계열 3종): 70만 파라미터 모델이 726만짜리 대비
   10배 빠르고 PSNR 차이 0.02dB · SSIM 0.026 이었다. 그래서 선택지로 넣었다(기본은 최고 화질).
   모델 파일은 우리 서버에 직접 둔다 — 외부 저장소가 죽어도 이 기능이 살아 있어야 한다. */
{
  ok('⑭ 빠른 모델을 우리 서버에서 직접 준다',
     /var ESRGAN_FAST_URLS=\['\/models-sr\//.test(src), '외부에서 받아오면 그쪽이 죽을 때 같이 죽는다')
  const m = /ESRGAN_FAST_URLS=\['([^']+)'\]/.exec(src)
  ok('⑭-b 그 파일이 실제로 저장소에 있다', !!m && fs.existsSync(ROOT + 'public' + m[1]), m ? m[1] : '경로를 못 읽었다')
  ok('⑭-c 출처·라이선스를 적어 뒀다',
     fs.existsSync(ROOT + 'public/models-sr/LICENSE-esrgan-medium.txt') && fs.existsSync(ROOT + 'public/models-sr/README.md'))
  const pool = body('ensureSrPool')
  ok('⑭-d 모델 묶음을 모드별로 따로 만든다', /_srPools\[mode\]/.test(pool) && /fast\?ESRGAN_FAST_URLS:ESRGAN_URLS/.test(pool.replace(/\s/g, '')),
     '한 묶음을 돌려 쓰면 먼저 고른 모드가 계속 쓰인다')
  ok('⑭-e 기본은 최고 화질이다', /n\.w\.upSpeed==='fast'/.test(src) && /data-upspeed="best"/.test(src),
     'upSpeed 가 비어 있으면 최고 화질이어야 한다')
  ok('⑭-f 고른 모드가 실제 실행까지 전달된다',
     /fast:\s*uFast/.test(src) && /getUpscaler\(factor,\s*opts&&opts\.fast\)/.test(src))
  //  워커를 못 쓰는 브라우저에서도 "빠르게" 가 빨라야 한다 — 폴백이 모드를 무시하면 아무 의미가 없다
  ok('⑭-g 워커 없는 경로도 고른 모드를 따른다',
     /ensureEsrgan\(fast\)/.test(body('getUpscaler')) && /fast \? ESRGAN_FAST_URLS : ESRGAN_URLS/.test(body('ensureEsrgan')))
}

/* ⑬ GPU 없이 돈다 — 초해상은 CPU(wasm)만 쓴다
   GPU 를 전부 끈 브라우저(WebGL 차단·WebGPU 어댑터 없음)에서 처음부터 끝까지 돌려 확인했다:
     영상 1920×1080 · 4.12초 · 소리 4.06초 · 프레임당 381ms · 이미지 1920×1920
   나중에 누가 속도를 이유로 GPU 실행 장치를 끼워 넣으면, GPU 없는 기기에서 조용히 죽거나
   느린 경로로 떨어질 수 있다. 초해상이 요구하는 장치가 CPU 뿐임을 여기서 지킨다. */
{
  const eps = [...src.matchAll(/executionProviders:\s*\[([^\]]*)\]/g)]
    .map((m) => m[1].replace(/['"\s]/g, ''))
  ok('⑬ 초해상이 CPU(wasm)만 요청한다', eps.length >= 2 && eps.every((e) => e === 'wasm'),
     eps.join(' | ') || 'executionProviders 를 못 찾았다')
  //  모델을 세우는 자리들이 GPU 유무를 따지지 않아야 한다(따지면 기기에 따라 다르게 동작한다)
  const srFns = ['ensureSrPool', '_srWorkerSrc', 'ensureEsrgan', 'getUpscaler'].map(body).join('\n')
  ok('⑬-b 초해상 준비 과정이 GPU 유무를 보지 않는다', !/navigator\.gpu|webgpu|webgl/i.test(srFns))
}

/* ⑫ 안 바뀐 자리는 다시 계산하지 않는다 — GPU 없이 시간을 줄이는 가장 큰 몫
   영상은 프레임 사이가 대부분 같은데 매 프레임 전부를 모델에 다시 넣고 있었다.
   출력 캔버스를 계속 쓰면 안 바뀐 타일은 이전 결과가 이미 그 자리에 남아 있다 — 아무것도 안 해도 된다.
   실측(진짜 엔진, 직전 커밋과 A/B): 정지 배경 1.83배 · 서서히 밝아짐 1.44배 ·
   화면 전체가 매 프레임 바뀌는 최악의 경우도 1.33배(프레임마다 캔버스를 새로 안 만들어서).
   세 경우 모두 결과 그림 차이 0.3/255 이하 — 빨라지되 달라지지 않는다. */
{
  const sc2 = body('_srCanvas2')
  ok('⑫ 이전 프레임과 같은 타일을 건너뛴다', /_sampleDiff\(cache\.samp\[ix\],\s*samp\)\s*<=\s*1\.2/.test(sc2),
     '없으면 안 바뀐 자리도 매 프레임 다시 계산한다')
  //  "cache.buf 를 읽는다" 만으로는 부족하다 — 새로 만든 캔버스를 cache.buf 에 넣어 다음 프레임에도 남겨야 한다
  ok('⑫-b 출력 캔버스를 계속 쓴다(건너뛴 자리에 이전 결과가 남아 있어야 한다)',
     /var out=cache\.buf;/.test(sc2) && /out=cache\.buf=document\.createElement\('canvas'\)/.test(sc2))
  ok('⑫-c 조금씩 변하는 장면에서 굳지 않게 주기적으로 다시 한다', /\(cache\.age\[ix\]\|\|0\)<60/.test(sc2),
     '차이가 아주 천천히 쌓이면 영영 안 바뀐 것으로 볼 수 있다')
  ok('⑫-d 비교는 싸게 — 픽셀을 건너뛰며 훑는다', /step=3/.test(body('_tileSample')))
  ok('⑫-e 타일 배치가 바뀌면 기억을 버린다', /cache\.key!==cacheKey/.test(sc2), '다른 크기의 기억과 비교하면 엉뚱하게 건너뛴다')
}

/* ⑪ 타일 크기를 프레임마다 고른다 — 계산량이 곧 시간이다 */
{
  const pick = body('_pickTile')
  ok('⑪ 타일 후보를 계산량으로 비교한다', /px\s*\+=\s*Math\.min\(T,\s*W-wx\)\s*\*\s*Math\.min\(T,\s*H-wy\)/.test(pick))
  //  고른 값이 맞으려면 _srCanvas2 의 자르기와 똑같은 식이어야 한다 — 두 곳이 갈리면 고른 값이 틀린다
  const cropExpr = /wx=Math\.max\(0, Math\.min\(cx-PAD, Math\.max\(0,W-TILE\)\)\)/
  ok('⑪-b _srCanvas2 의 자르기 식이 그대로다', cropExpr.test(body('_srCanvas2')))
  ok('⑪-c 자동 선택을 켠 러너만 고른다(Swin2SR 은 크기 제약)', /runner\.tileAuto\s*\?\s*_pickTile/.test(body('_srCanvas2')))
}

// ⑧ 남은 시간을 실제 속도로 알려 준다 (30분짜리는 몇 시간이 될 수 있다)
{
  ok('⑧ 남은 시간을 계산해 알려 준다', /etaSec:\s*left/.test(up) && /남은 시간 약/.test(src))
  ok('⑧-b 감당 못 할 예상 시간이면 스스로 줄인다', /function retune\(\)/.test(up))
  /* 그 기준이 원본 길이에서 나와야 한다.
     12시간 고정이던 시절, 진짜 엔진 속도로 재 보니 5분짜리 720p→4K 가 "10시간 20분" 으로 잡혔고
     기준 아래라 그대로 통과했다 — 10시간짜리 작업을 말없이 계속 돌렸다(실측).
     고정값으로 되돌아가면 같은 일이 다시 일어난다. */
  ok('⑧-c 감당 기준이 원본 길이에 비례한다',
     /BUDGET_H\s*=\s*Math\.min\(3,\s*Math\.max\(0\.5,\s*clip\s*\*\s*6\s*\/\s*3600\)\)/.test(up) &&
     /projH\s*<=\s*BUDGET_H/.test(up),
     '고정 시간 기준이면 몇 시간짜리 작업이 기준 아래로 새어 나간다')
  ok('⑧-d 처리 크기 줄이기가 효과 없으면 건너뛴다',
     /half\s*<\s*Math\.max\(iw,\s*ih\)/.test(up), '작은 원본에서는 줄여도 그대로라 재는 시간만 버린다')
  //  스레드는 교차출처 격리 없이는 못 쓴다 — 쓸 수 있을 때만 쓰게 해 둔 부분
  ok('⑧-e 스레드를 쓸 수 없는 환경에서는 1개로 못 박는다',
     /crossOriginIsolated\)\s*ort\.env\.wasm\.numThreads\s*=\s*1/.test(src))
}

/* ⑮ GPU 없는 기기에서 초해상을 "끄기" 전에 가벼운 모델로 갈아탄다
   같은 조건(CPU·WASM, GPU 차단, 타일 128)에서 실측:
     기본 Real-ESRGAN x4plus(1670만) 32.50초/타일 · rdn-medium(70만) 1.44초/타일 → 22.6배
   이 단계가 없으면 어떤 영상도 예산 안에 못 들어와 결국 초해상이 꺼지고,
   GPU 없는 사용자는 AI 화질 향상을 아예 못 받고 단순 확대만 받는다. */
{
  /* 조건까지 같이 본다 — 코드가 "있기만" 하면 통과하는 검사는 의미가 없다.
     실제로 if(false) 로 막아 두고 재 봤더니 이 줄만으로는 잡히지 않았다. */
  ok('⑮ 끄기 전에 가벼운 모델로 갈아타는 단계가 있다',
     /if\(tuned<=1\s*&&\s*!runner\.fast\)/.test(up) &&
     /getUpscaler\(factor,\s*true\)/.test(up) && /runner\s*=\s*r2/.test(up),
     '이 단계가 없으면 CPU 사용자는 초해상을 전혀 못 받는다')
  //  순서가 뒤집히면(끄기가 먼저) 갈아타는 단계에 영영 도달하지 못한다
  ok('⑮-b 갈아타기가 "초해상 끄기" 보다 먼저 온다',
     up.indexOf('!runner.fast') >= 0 && up.indexOf('!runner.fast') < up.lastIndexOf('srOn=false'))
  ok('⑮-c 갈아탄 뒤 속도를 다시 잰다(옛 측정으로 또 끄면 안 된다)',
     /runner\s*=\s*r2;\s*srMs\s*=\s*0,?\s*;?\s*srN\s*=\s*0|runner=r2;\s*srMs=0;\s*srN=0/.test(up.replace(/\s+/g, ' ').replace(/ /g, '')) ||
     /runner=r2;srMs=0;srN=0/.test(up.replace(/\s/g, '')))
  ok('⑮-d 갈아타는 동안 판단을 멈춘다(중복 교체 방지)', /swapping/.test(up))
  //  한 프레임에 90초씩 걸리는 기기에서 8프레임을 채우려면 12분이 든다 — 그 전에 판단해야 한다
  ok('⑮-e 프레임이 아주 느리면 8프레임을 기다리지 않는다',
     /srN\s*<\s*8\s*&&\s*srMs\s*<\s*60000/.test(up),
     '느린 기기일수록 오래 기다리는 건 거꾸로다')
  //  이미지는 한 장이라 "돌리면서 고칠" 기회가 없다 → 시작 전에 한 타일로 재 본다
  const probe = body('_srProbe')
  ok('⑮-f 이미지도 시작 전에 속도를 재 본다', probe.length > 0 && /projSec/.test(probe))
  ok('⑮-g 재 본 결과가 예산을 넘으면 가벼운 모델로 바꾼다',
     /projSec\s*<=\s*180/.test(probe) && /getUpscaler\(4,\s*true\)/.test(probe))
  ok('⑮-h 재다가 실패해도 업스케일은 계속된다',
     /function\s*\(\)\s*\{\s*return runner;\s*\}/.test(probe), '재는 일 때문에 기능이 막히면 안 된다')
  ok('⑮-i 이미지 경로가 실제로 재 본 러너를 쓴다',
     /_srProbe\(runner,\s*srcC,\s*iw,\s*ih\)/.test(body('upscaleImageURL')) &&
     /_srCanvas2\(rr,\s*srcC\)/.test(body('upscaleImageURL')))
}

console.log(fails.length === 0
  ? '\n영상 업스케일 구조 — 실패 0 (길이·소리·30분 한도 전부 살아 있음)'
  : `\n실패 ${fails.length}건:`)
fails.forEach((f) => console.log('  ✗ ' + f))
process.exit(fails.length ? 1 : 0)
