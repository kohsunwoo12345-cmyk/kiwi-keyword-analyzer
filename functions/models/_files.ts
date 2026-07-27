// 스튜디오가 실제로 요청하는 모델·런타임 파일 목록 — 자체 호스팅의 '기준표'.
//  적재(warm-models)와 상태 조회(selfhost-status)가 같은 목록을 봐야 숫자가 어긋나지 않는다.

export const MODEL_FILES: string[] = [
  '/models/lib/transformers',
  '/models/lib/vision',
  '/models/lib/ortweb',   // onnxruntime-web (Real-ESRGAN raw ONNX 실행용 · 0.5MB)
  // Depth-Anything V2 base 양자화 — 1순위. (fp32 model.onnx 는 ≈380MB로 미사용)
  '/models/hf/onnx-community/depth-anything-v2-base/resolve/main/config.json',
  '/models/hf/onnx-community/depth-anything-v2-base/resolve/main/preprocessor_config.json',
  '/models/hf/onnx-community/depth-anything-v2-base/resolve/main/onnx/model_quantized.onnx',
  // Depth-Anything V1 base (더 정밀) — 2순위
  '/models/hf/Xenova/depth-anything-base-hf/resolve/main/config.json',
  '/models/hf/Xenova/depth-anything-base-hf/resolve/main/preprocessor_config.json',
  '/models/hf/Xenova/depth-anything-base-hf/resolve/main/onnx/model_quantized.onnx',
  // Depth-Anything small — 폴백
  '/models/hf/Xenova/depth-anything-small-hf/resolve/main/config.json',
  '/models/hf/Xenova/depth-anything-small-hf/resolve/main/preprocessor_config.json',
  '/models/hf/Xenova/depth-anything-small-hf/resolve/main/onnx/model_quantized.onnx',
  // onnxruntime-web wasm (transformers.js 백엔드) — 브라우저 지원에 따라 하나가 쓰임
  '/models/ort/ort-wasm-simd-threaded.wasm',
  '/models/ort/ort-wasm-simd.wasm',
  '/models/ort/ort-wasm-threaded.wasm',
  '/models/ort/ort-wasm.wasm',
  // MediaPipe wasm
  '/models/mpv/vision_wasm_internal.wasm',
  '/models/mpv/vision_wasm_internal.js',
  '/models/mpv/vision_wasm_nosimd_internal.wasm',
  '/models/mpv/vision_wasm_nosimd_internal.js',
  // MediaPipe 모델
  '/models/mpm/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task',
  '/models/mpm/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
  // 초해상(SR) 업스케일 — Swin2SR (x2 = 2×, x4 = 4×). transformers.js image-to-image.
  //  fp32(model.onnx) 가 화질 기준이고 양자화본은 폴백이라 둘 다 적재한다.
  '/models/hf/Xenova/swin2SR-classical-sr-x2-64/resolve/main/config.json',
  '/models/hf/Xenova/swin2SR-classical-sr-x2-64/resolve/main/preprocessor_config.json',
  '/models/hf/Xenova/swin2SR-classical-sr-x2-64/resolve/main/onnx/model.onnx',
  '/models/hf/Xenova/swin2SR-classical-sr-x2-64/resolve/main/onnx/model_quantized.onnx',
  '/models/hf/Xenova/swin2SR-realworld-sr-x4-64-bsrgan-psnr/resolve/main/config.json',
  '/models/hf/Xenova/swin2SR-realworld-sr-x4-64-bsrgan-psnr/resolve/main/preprocessor_config.json',
  '/models/hf/Xenova/swin2SR-realworld-sr-x4-64-bsrgan-psnr/resolve/main/onnx/model.onnx',
  '/models/hf/Xenova/swin2SR-realworld-sr-x4-64-bsrgan-psnr/resolve/main/onnx/model_quantized.onnx',
]

/** 업스케일이 우리 것만으로 돌기 위해 반드시 R2 에 있어야 하는 파일 */
export const SR_REQUIRED = MODEL_FILES.filter((p) => /swin2SR|\/models\/lib\/transformers$|\/models\/ort\//.test(p))

/** Real-ESRGAN 전용 런타임 wasm (약 36MB) — 가중치가 실제로 있을 때만 적재한다.
 *  운영 확인 결과 아래 후보 repo 가 모두 없어(502), 이 파일들은 받아봐야 쓰이지 않는다.
 *  나중에 가중치를 확보하면 캐시 채우기가 자동으로 함께 받아온다. */
export const ESRGAN_RUNTIME_FILES: string[] = [
  '/models/ortw/ort-wasm-simd-threaded.wasm',
  '/models/ortw/ort-wasm-simd.wasm',
  '/models/ortw/ort-wasm-threaded.wasm',
  '/models/ortw/ort-wasm.wasm',
]

/** 있으면 최상급 엔진(Real-ESRGAN)으로 자동 승격되는 후보 — 존재 확인만 한다(다운로드 아님) */
export const ESRGAN_PROBES: string[] = [
  '/models/hf/onnx-community/real-esrgan-x4plus/resolve/main/onnx/model.onnx',
  '/models/hf/Xenova/real-esrgan-x4plus/resolve/main/onnx/model.onnx',
  '/models/hf/onnx-community/Real-ESRGAN_x4plus/resolve/main/onnx/model.onnx',
  '/models/hf/Xenova/4x-UltraSharp/resolve/main/onnx/model.onnx',
]
