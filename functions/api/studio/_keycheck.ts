/* ══════════════════════════════════════════════════════════════════════════
   제공사 API 키 확인 — 읽기만 한다. 생성은 어떤 경우에도 하지 않는다.
   ──────────────────────────────────────────────────────────────────────────
   키만 콘솔에 들어오고 연동은 아직 안 된 제공사가 계속 생긴다(LTX·Recraft…).
   그때마다 답해야 하는 질문은 늘 같다: **이 키가 진짜 되는가.**

   처음엔 LTX 안에 그 판정을 통째로 박아 뒀다. 다음 제공사(Recraft)가 오자마자
   같은 60줄을 한 벌 더 적을 뻔했다 — 그러면 한쪽만 고쳐지는 날이 반드시 온다.
   루마·클링 단가표가 정확히 그렇게 어긋나 있었다. 그래서 여기 한 군데만 둔다.

   ── 지켜야 하는 것 두 가지 ────────────────────────────────────────────
   ① ⚠ **GET 만 보낸다.** 제공사로 나가는 자리는 이 파일의 read() 하나뿐이고
      method 가 그 안에 박혀 있다. 본문(body)도 붙이지 않는다.
      만들 수 있는 요청이 없으니 만들어질 것도 없다 = 돈이 안 나간다.
      알리바바에서 이걸 안 지켜 실제로 태스크 5건을 만들었다(파라미터 검사가 큐 뒤에서
      돌아 형식이 틀려도 접수됐다). scripts/keycheck.test.mjs 가 이 규칙을 지킨다.

   ② ⚠ **200 하나로 판정하지 않는다.** 인증을 아예 안 보는 주소도 200 을 준다.
      그래서 같은 주소를 **일부러 틀린 키로 한 번 더** 읽어 갈리는지를 본다.
        우리 키 200 · 틀린 키 401  → 이 주소는 인증을 본다. 우리 키가 통과했다(확정)
        우리 키 200 · 틀린 키 200  → 인증을 안 본다. 이 200 은 증거가 아니다(확인 못 함)
        우리 키 401 · 틀린 키 401  → 우리 키가 거절됐다(확정)
        우리 키 404 · 틀린 키 401  → 인증은 통과했고 경로만 다르다(작동함)
      "요청이 성공했는가" 가 아니라 **"인증이 갈렸는가"** 를 본다.
      판정에 "확인 못 함"(null)이 있다. 없애면 모르는 것을 안다고 말하는 화면이 된다.
   ══════════════════════════════════════════════════════════════════════════ */

/** 한 번 읽어 볼 경로. 어느 것도 작업을 만들지 않는 것만 넣는다. */
export type KeyProbe = {
  이름: string
  path: string
  /** account = 계정·잔액 · models = 모델 목록 · job = 없는 작업 조회 */
  종류: 'account' | 'models' | 'job'
}

export type KeyProvider = {
  id: string
  label: string
  /** 키 환경변수 후보. generate.js 의 keys() 와 같은 값이어야 한다. */
  envNames: string[]
  /** 후보 주소. 하나로 못 박을 수 있으면 하나만 둔다. */
  hosts: string[]
  /** 검사에서 가짜 서버로 돌리는 통로(환경변수로만 바뀐다 — 회원 요청으로는 못 바꾼다) */
  hostOverrideEnv: string[]
  probes: KeyProbe[]
  /** 키 발급·충전 콘솔 주소 — 거절됐을 때 어디로 가야 하는지 */
  console: string
  /** 생성 경로가 붙었는가. false 면 키가 살아 있어도 회원 화면에는 안 나간다. */
  wired: boolean
  /** 주소를 못 박은 근거(또는 못 박은 이유). 화면에 그대로 보여 준다. */
  주소근거: string
  /** 잔액 뽑는 법 — 필드 이름이 제공사마다 다르다. 없으면 안 뽑는다. */
  balance?: (j: any) => { value: number; unit: string } | null
}

export type KeyProbeResult = {
  검사: string; url: string; status: number; ms: number
  code?: string | null; message?: string | null; 본문?: string; 오류?: string
  _json?: any
}

export type KeyCheckResult = {
  provider: string
  제공사: string
  주의: string
  키있음: boolean
  키지문?: string
  키길이?: number
  /** true = 된다(확정) · false = 안 된다(확정) · null = 확인 못 함 */
  키작동: boolean | null
  판정: string
  근거: string
  잔액: number | null
  잔액단위?: string
  모델목록: { 호스트: string; 경로: string; 개수: number; 모델: string[] }[]
  대조: KeyProbeResult | null
  결과: KeyProbeResult[]
  주소근거: string
  다음: string
  콘솔: string
}

/** 일부러 틀린 키. 형식은 그럴듯하되 어떤 계정에도 없는 값이다. */
export const CONTROL_KEY = 'control-invalid-key-00000000000000000000'

const cut = (t: any) => String(t == null ? '' : t).slice(0, 400)

/* 오류 본문이 제공사마다 다른 모양으로 온다 —
     평평형 { code, message }   봉투형 { error: { code, message } }   { detail } */
function errOf(j: any) {
  const raw = (j && (j.code || (j.error && j.error.code) || j.type)) || ''
  const msg = (j && (j.message || (j.error && (j.error.message || j.error)) || j.detail)) || ''
  return {
    code: String(raw || ''),
    message: String(typeof msg === 'string' ? msg : (JSON.stringify(msg) || '')),
  }
}

/* 목록 응답에서 모델 이름만 뽑는다. 배열이 담긴 필드 이름도, 이름 필드도 문서마다 다르다.
   하나로 못 박으면 이름이 다를 때 조용히 빈 목록이 되고 — 그러면 "쓸 수 있는 모델이 없다"
   는 틀린 결론이 나온다. 그래서 찾아서 쓴다(알리바바 진단에서 배운 그대로). */
export function modelIdsFrom(j: any): string[] {
  const box = (j && (j.data || j.models || j.output || j)) || {}
  let arr: any[] | null = Array.isArray(box) ? box : null
  if (!arr && box && typeof box === 'object') {
    for (const v of Object.values(box)) if (Array.isArray(v)) { arr = v; break }
  }
  if (!arr) return []
  return arr.map((it: any) => {
    if (typeof it === 'string') return it
    if (!it || typeof it !== 'object') return ''
    for (const f of ['id', 'model', 'model_id', 'name', 'slug']) {
      if (typeof it[f] === 'string' && it[f]) return it[f]
    }
    const s = Object.values(it).find((v) => typeof v === 'string')
    return (s as string) || ''
  }).filter(Boolean)
}

/** generate.js 의 fetchT 를 그대로 받는다(타임아웃·502 방지가 그 안에 들어 있다). */
export type FetchT = (url: string, opts: any, ms: number) => Promise<Response>

/* ⚠ 제공사로 나가는 자리는 여기 하나뿐이다. method 가 박혀 있고 body 가 없다.
   새 확인을 붙이고 싶어도 이 함수를 통해야 한다 — 그래야 "확인만 했는데 만들어졌다" 가 안 난다. */
async function read(fetchT: FetchT, label: string, url: string, key: string, keep: boolean): Promise<KeyProbeResult> {
  const t0 = Date.now()
  try {
    const r = await fetchT(url, {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + key, Accept: 'application/json' },
    }, 8000)
    const text = await r.text().catch(() => '')
    let parsed: any = null
    try { parsed = JSON.parse(text) } catch { /* JSON 이 아닐 수 있다 */ }
    const e = errOf(parsed)
    return {
      검사: label, url, status: r.status, ms: Date.now() - t0,
      code: e.code || null, message: e.message ? e.message.slice(0, 200) : null,
      //  목록은 자르면 정작 봐야 할 모델 이름이 잘려 나간다(알리바바에서 그랬다) — 따로 정리한다
      본문: keep ? '(목록은 아래 모델목록 항목으로 따로 정리)' : cut(text),
      _json: parsed,
    }
  } catch (err: any) {
    return {
      검사: label, url, status: 0, ms: Date.now() - t0,
      오류: String((err && err.message) || err).slice(0, 160),
    }
  }
}

/**
 * 키 하나를 확인한다. 읽기(GET)만 보내므로 생성도 과금도 없다.
 * @param hostOverride 검사용 가짜 서버 주소(환경변수로만 들어온다). 있으면 이것만 본다.
 */
export async function runKeyCheck(
  p: KeyProvider, key: string, fetchT: FetchT, hostOverride?: string | null,
): Promise<KeyCheckResult> {
  const hosts = hostOverride ? [String(hostOverride)] : p.hosts
  const results: KeyProbeResult[] = []
  const 모델목록: KeyCheckResult['모델목록'] = []
  let 잔액: number | null = null
  let 잔액단위: string | undefined

  for (const base of hosts) {
    const 이름 = base.replace(/^https?:\/\//, '')
    for (let i = 0; i < p.probes.length; i++) {
      const pr = p.probes[i]
      const keep = pr.종류 === 'models'
      const r = await read(fetchT, 이름 + ' · ' + pr.이름, base + pr.path, key, keep)
      results.push(r)
      //  첫 요청이 아예 안 닿으면 그 호스트는 없는 주소다. 남은 경로를 더 두들길 이유가 없다.
      if (i === 0 && r.status === 0) {
        results.push({
          검사: 이름 + ' · 나머지 건너뜀', url: base, status: 0, ms: 0,
          오류: '첫 요청이 닿지 않아 이 호스트는 더 묻지 않았습니다.',
        })
        break
      }
      if (r.status >= 200 && r.status < 300 && r._json) {
        if (pr.종류 === 'models') {
          const ids = modelIdsFrom(r._json)
          if (ids.length) 모델목록.push({ 호스트: base, 경로: pr.path, 개수: ids.length, 모델: ids.slice(0, 120) })
        }
        if (pr.종류 === 'account' && p.balance) {
          const b = p.balance(r._json)
          if (b && Number.isFinite(b.value)) { 잔액 = b.value; 잔액단위 = b.unit }
        }
      }
    }
  }

  /* ── 대조 확인 ── 가장 증거가 되는 주소 하나를 골라 일부러 틀린 키로 한 번 더 읽는다.
     2xx 가 있으면 그걸 쓰고, 없으면 "서버가 답은 한" 주소(인증 거절이 아닌 것)를 쓴다. */
  const 답한것 = results.filter((r) => r.status > 0)
  const 통과한것 = results.filter((r) => r.status >= 200 && r.status < 300)
  const 대표 = 통과한것[0] || 답한것.find((r) => r.status !== 401 && r.status !== 403) || 답한것[0] || null
  let 대조: KeyProbeResult | null = null
  if (대표) 대조 = await read(fetchT, '대조(일부러 틀린 키) · ' + 대표.검사, 대표.url, CONTROL_KEY, false)

  const 대조거절 = !!대조 && (대조.status === 401 || 대조.status === 403)
  const 대조통과 = !!대조 && 대조.status >= 200 && 대조.status < 300

  let 키작동: boolean | null = null
  let 판정 = ''
  let 근거 = ''

  if (!답한것.length) {
    키작동 = null
    판정 = '확인 못 함 — ' + p.label + ' 서버에 닿지 않았습니다.'
    근거 = '후보 주소 어느 곳도 응답하지 않았습니다. 키 문제가 아니라 주소가 다르거나 통신이 막힌 것입니다. '
         + '이 진단은 배포된 서버에서 열어야 합니다.'
  } else if (통과한것.length && 대조거절) {
    키작동 = true
    판정 = '키가 작동합니다 — 확정.'
    근거 = '우리 키는 ' + 통과한것[0].status + ' 로 통과했고, 같은 주소를 일부러 틀린 키로 읽으니 '
         + 대조!.status + ' 로 거절됐습니다. 이 주소는 인증을 실제로 보고 있으며 우리 키가 그걸 통과했다는 뜻입니다.'
  } else if (통과한것.length && 대조통과) {
    키작동 = null
    판정 = '확인 못 함 — 이 주소는 인증을 보지 않습니다.'
    근거 = '우리 키도 200, 일부러 틀린 키도 200 입니다. 이 200 은 키가 맞다는 증거가 아닙니다. '
         + '인증을 요구하는 다른 경로를 찾아야 합니다.'
  } else if (통과한것.length) {
    키작동 = null
    판정 = '키는 통과한 것으로 보이나 확정하지 못했습니다.'
    근거 = '우리 키로 ' + 통과한것[0].status + ' 를 받았지만 대조(틀린 키) 확인이 결론을 내지 못했습니다'
         + (대조 ? '(대조 응답 ' + 대조.status + ')' : '') + '.'
  } else if (답한것.every((r) => r.status === 401)) {
    키작동 = false
    판정 = '키가 거절됐습니다 — 확정.'
    근거 = '응답한 모든 주소가 401 입니다. 값이 잘못됐거나 만료·비활성 키입니다. '
         + '콘솔(' + p.console + ')에서 키를 다시 발급해 환경변수를 교체해야 합니다.'
  } else if (대조거절 && 대표 && 대표.status !== 401 && 대표.status !== 403) {
    키작동 = true
    판정 = '키가 작동합니다 — 인증은 통과했고, 요청 자체가 다른 이유로 거절됐습니다.'
    근거 = '우리 키는 ' + 대표.status + '(인증 거절이 아님), 일부러 틀린 키는 ' + 대조!.status + ' 입니다. '
         + '인증이 갈렸다는 것은 우리 키가 서버에 받아들여졌다는 뜻입니다.'
  } else if (답한것.some((r) => r.status === 401) && 답한것.some((r) => r.status === 404)) {
    키작동 = null
    판정 = '확인 못 함 — 인증을 묻는 주소를 아직 못 찾았습니다.'
    근거 = '401 과 404 가 섞여 있습니다. 404 는 그 경로가 없다는 뜻이라 키 판단에 못 씁니다. '
         + '아래 결과에서 401 이 난 주소가 진짜 API 주소일 가능성이 높습니다.'
  } else {
    키작동 = null
    판정 = '확인 못 함 — 서버가 판단할 수 있는 답을 주지 않았습니다.'
    근거 = '받은 상태코드로는 인증 통과 여부를 가를 수 없습니다. 아래 결과 원문을 보고 판단해야 합니다.'
  }

  results.forEach((r) => { delete r._json })   // 파싱본은 내부용 — 응답에 통째로 싣지 않는다
  if (대조) delete 대조._json

  return {
    provider: p.id,
    제공사: p.label,
    주의: '이 진단은 GET(읽기)만 보냅니다. 이미지·영상이 만들어지지 않으므로 돈이 나가지 않습니다.',
    키있음: true,
    //  ⚠ 키 값은 어떤 경우에도 나가지 않는다. 배포된 키와 콘솔 키를 대조할 앞뒤 몇 글자만 준다.
    키지문: String(key).slice(0, 6) + '…' + String(key).slice(-4),
    키길이: String(key).length,
    키작동, 판정, 근거,
    잔액, 잔액단위,
    모델목록,
    대조,
    결과: results,
    주소근거: p.주소근거,
    콘솔: p.console,
    다음: 키작동 === true
      ? (p.wired
          ? '연결이 끝난 제공사입니다. 관리자 → AI 모델 목록에서 상태를 확인하세요.'
          : '키는 확인됐습니다. 아직 생성 경로가 없어 회원 화면에는 나가지 않습니다 — '
            + '관리자 → 모델 등록부에서 모델을 켜기 전에 연결 작업이 먼저입니다.')
      : '키가 확정되기 전에는 모델을 켜지 않습니다 — 회원이 고를 수 있는데 안 되는 모델은 만들지 않습니다.',
  }
}

/** 키가 아예 없을 때의 답. 제공사를 두들기지 않는다. */
export function noKeyResult(p: KeyProvider): Partial<KeyCheckResult> & { error: string } {
  return {
    provider: p.id,
    제공사: p.label,
    키있음: false,
    키작동: false,
    판정: p.envNames[0] + ' 가 서버에 없습니다. 값이 없으니 확인할 것도 없습니다.',
    근거: '환경변수에 키를 넣은 뒤 다시 확인하세요. 찾는 이름: ' + p.envNames.join(' · '),
    콘솔: p.console,
    error: p.envNames[0] + ' 미설정',
  }
}
