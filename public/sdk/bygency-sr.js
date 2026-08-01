/*!
 * BYGENCY 초해상(Super-Resolution) SDK — 빌려간 모델을 그쪽 기기에서 돌리기 위한 최소 코드.
 *
 * 왜 이런 모양인가: 우리 초해상 모델은 서버에서 돌지 않는다. 그쪽 브라우저나 Node 에서 돈다.
 * 그래서 이 SDK 가 하는 일은 셋뿐이다 — 리스 토큰으로 가중치를 받고, 세션을 세우고,
 * 큰 그림을 타일로 잘라 이어 붙인다. 타일 처리는 우리 스튜디오와 같은 방식이다:
 *   · 이음매를 없애려 상하좌우 16px 을 겹쳐 자르고 가운데만 쓴다
 *   · 겹치는 만큼 계산이 늘어나므로, 프레임마다 계산량이 가장 적은 타일 크기를 고른다
 *
 * 쓰는 법 (브라우저):
 *   <script type="module">
 *     import * as ort from 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.1/+esm'
 *     import { createUpscaler } from 'https://nextbygency.com/sdk/bygency-sr.js'
 *     const up = await createUpscaler({ ort, lease: 'eyJ...'  })   // 리스 토큰
 *     const canvas = await up.upscaleImage(document.querySelector('img'))
 *     document.body.appendChild(canvas)
 *   </script>
 *
 * 요구사항: onnxruntime-web 1.17.x (WASM). GPU 는 필요 없다.
 * 라이선스: 모델 가중치는 각 모델의 라이선스를 따른다(GET /api/v1/models 의 license 참조).
 */

const PAD = 16                       // 타일끼리 겹치는 폭 — 이음매 제거용
const DEFAULT_BASE = 'https://nextbygency.com'

/** 계산량이 가장 적은 타일 크기를 고른다(스튜디오의 _pickTile 과 같은 식). */
function pickTile(W, H, max) {
  const cands = [96, 128, 160, 192, 224, 256]
  let best = null
  for (const T of cands) {
    if (T > max) continue
    const C = T - 2 * PAD
    if (C <= 0) continue
    let px = 0
    for (let cy = 0; cy < H; cy += C) for (let cx = 0; cx < W; cx += C) {
      let wx = Math.max(0, Math.min(cx - PAD, Math.max(0, W - T))); if (W <= T) wx = 0
      let wy = Math.max(0, Math.min(cy - PAD, Math.max(0, H - T))); if (H <= T) wy = 0
      px += Math.min(T, W - wx) * Math.min(T, H - wy)
    }
    if (!best || px < best.px) best = { T, px }
  }
  return best ? best.T : max
}

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h)
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c
}

/**
 * 업스케일러를 만든다.
 * @param {object} o
 * @param {object} o.ort      onnxruntime-web 모듈 (직접 넘긴다 — 우리가 CDN 을 강제하지 않는다)
 * @param {string} o.lease    POST /api/v1/lease 로 받은 리스 토큰
 * @param {string} [o.model]  기본 'sr-x4-fast'
 * @param {string} [o.base]   API 기준 주소
 * @param {ArrayBuffer} [o.weights] 이미 받아 둔 가중치가 있으면 그걸 쓴다(재발급·재다운로드 없이)
 */
export async function createUpscaler(o) {
  const ort = o && o.ort
  if (!ort) throw new Error('onnxruntime-web 모듈을 ort 로 넘겨주세요.')
  const base = (o.base || DEFAULT_BASE).replace(/\/+$/, '')
  const model = o.model || 'sr-x4-fast'

  let weights = o.weights
  if (!weights) {
    if (!o.lease) throw new Error('리스 토큰(lease)이 필요합니다. POST /api/v1/lease 로 발급받으세요.')
    const file = model === 'sr-x4-fast' ? 'rdn-medium-x4.onnx' : null
    if (!file) throw new Error('모르는 모델: ' + model)
    const r = await fetch(`${base}/api/v1/model-file/${file}?lease=${encodeURIComponent(o.lease)}`)
    if (!r.ok) {
      let msg = ''
      try { msg = (await r.json()).error || '' } catch { /* 본문이 JSON 이 아닐 수 있다 */ }
      throw new Error('가중치를 못 받았습니다 (' + r.status + ') ' + msg)
    }
    weights = await r.arrayBuffer()
  }

  const sess = await ort.InferenceSession.create(new Uint8Array(weights), {
    executionProviders: ['wasm'], graphOptimizationLevel: 'all',
  })
  const IN = sess.inputNames[0], OUT = sess.outputNames[0]

  /** 타일 하나(RGBA) → 확대된 RGBA */
  async function runTile(rgba, w, h) {
    const n = w * h, d = new Float32Array(3 * n)
    for (let p = 0; p < n; p++) { d[p] = rgba[p * 4] / 255; d[n + p] = rgba[p * 4 + 1] / 255; d[2 * n + p] = rgba[p * 4 + 2] / 255 }
    const feeds = {}; feeds[IN] = new ort.Tensor('float32', d, [1, 3, h, w])
    const res = await sess.run(feeds)
    const o2 = res[OUT], od = o2.data, ow = o2.dims[3], oh = o2.dims[2], on = ow * oh
    const out = new Uint8ClampedArray(on * 4)
    for (let q = 0; q < on; q++) {
      let v = od[q] * 255; out[q * 4] = v < 0 ? 0 : v > 255 ? 255 : v
      v = od[on + q] * 255; out[q * 4 + 1] = v < 0 ? 0 : v > 255 ? 255 : v
      v = od[2 * on + q] * 255; out[q * 4 + 2] = v < 0 ? 0 : v > 255 ? 255 : v
      out[q * 4 + 3] = 255
    }
    return { buf: out, ow, oh }
  }

  return {
    scale: 4,
    /**
     * 이미지를 4배로 올린다. source 는 <img>/<canvas>/ImageBitmap 등 drawImage 가 받는 것.
     * @param {object} [opt] { longTarget?: number, onProgress?: (0~1)=>void }
     */
    async upscaleImage(source, opt) {
      opt = opt || {}
      const sw = source.naturalWidth || source.videoWidth || source.width
      const sh = source.naturalHeight || source.videoHeight || source.height
      if (!sw || !sh) throw new Error('이미지 크기를 읽지 못했습니다.')
      const src = makeCanvas(sw, sh)
      src.getContext('2d').drawImage(source, 0, 0)
      const sctx = src.getContext('2d')

      const TILE = pickTile(sw, sh, 256), CORE = TILE - 2 * PAD
      const out = makeCanvas(sw * 4, sh * 4)
      const octx = out.getContext('2d')
      const jobs = []
      for (let cy = 0; cy < sh; cy += CORE) for (let cx = 0; cx < sw; cx += CORE) jobs.push([cx, cy])

      for (let i = 0; i < jobs.length; i++) {
        const [cx, cy] = jobs[i]
        const coreW = Math.min(CORE, sw - cx), coreH = Math.min(CORE, sh - cy)
        let wx = Math.max(0, Math.min(cx - PAD, Math.max(0, sw - TILE))); if (sw <= TILE) wx = 0
        let wy = Math.max(0, Math.min(cy - PAD, Math.max(0, sh - TILE))); if (sh <= TILE) wy = 0
        const ww = Math.min(TILE, sw - wx), wh = Math.min(TILE, sh - wy)
        const id = sctx.getImageData(wx, wy, ww, wh)
        const r = await runTile(id.data, ww, wh)
        const tc = makeCanvas(r.ow, r.oh)
        tc.getContext('2d').putImageData(new ImageData(r.buf, r.ow, r.oh), 0, 0)
        //  겹쳐 자른 가장자리는 버리고 가운데(core)만 제자리에 붙인다
        octx.drawImage(tc, (cx - wx) * 4, (cy - wy) * 4, coreW * 4, coreH * 4, cx * 4, cy * 4, coreW * 4, coreH * 4)
        if (opt.onProgress) opt.onProgress((i + 1) / jobs.length)
      }

      //  긴 변 목표가 있으면 거기에 맞춰 줄인다 — ×4 결과를 줄이면 초과표본이 되어 더 선명하다
      const target = Number(opt.longTarget) || 0
      if (target > 0) {
        const long = Math.max(out.width, out.height)
        if (long !== target) {
          const k = target / long
          const fin = makeCanvas(Math.round(out.width * k), Math.round(out.height * k))
          const fx = fin.getContext('2d')
          fx.imageSmoothingEnabled = true; fx.imageSmoothingQuality = 'high'
          fx.drawImage(out, 0, 0, fin.width, fin.height)
          return fin
        }
      }
      return out
    },
    /** 타일 단위로 직접 쓰고 싶을 때 (영상 프레임 파이프라인 등) */
    runTile,
    dispose() { try { sess.release && sess.release() } catch { /* 이미 정리된 경우 */ } },
  }
}

export default { createUpscaler }
