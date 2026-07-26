// /models 프록시와 관리자 점검(warm-models)이 '같은' R2 키를 계산하도록 한 곳에 둔다.
//  키가 어긋나면 "적재했는데 계속 외부에서 받는" 사고가 조용히 생긴다.

// 카테고리별 캐시 버전 — 상류 URL을 바꾼 카테고리는 버전을 올려 옛(잘못된) R2 캐시를 무효화한다.
//  ort: onnxruntime-web@1.14.0 → transformers 자체 dist wasm 으로 교체(v2).
export const CACHE_VER: Record<string, string> = { ort: 'v2' }

/** /models/<cat>/<sub> + 쿼리 → R2 오브젝트 키 */
export function modelKey(cat: string, sub: string, search = ''): string {
  return (
    'modelcache/' + cat + (CACHE_VER[cat] ? '@' + CACHE_VER[cat] : '') + '/' + sub +
    (search ? '_' + btoa(search).replace(/[^a-zA-Z0-9]/g, '') : '')
  )
}

/** 스튜디오가 쓰는 '/models/...' 경로를 프록시와 동일한 규칙으로 키로 변환 */
export function modelKeyFromPath(path: string): string {
  const clean = String(path || '').split('?')[0].replace(/^\/models\//, '')
  const parts = clean.split('/').filter(Boolean)
  const cat = parts[0] || ''
  if (cat === 'lib') return modelKey('lib', 'lib/' + (parts[1] || ''))
  const sub = parts.slice(1).map((s) => encodeURIComponent(decodeURIComponent(s))).join('/')
  return modelKey(cat, sub)
}

/** 자체 호스팅 모드 — 'strict' 면 R2 에 없는 파일을 외부 상류에서 받지 않는다. */
export const SELFHOST_KEY = 'models_selfhost'
/** 관리자가 캐시 채우기를 실행한 동안만 열리는 상류 허용 창(epoch ms) */
export const WARM_UNTIL_KEY = 'models_warm_until'
/** 마지막으로 외부 상류를 탄 시각·경로 (자체 호스팅이 실제로 유지되는지 감시용) */
export const LAST_UPSTREAM_KEY = 'models_last_upstream'
