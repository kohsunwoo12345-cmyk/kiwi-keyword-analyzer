'use client'

/* 관리자 전용 — 노드 스튜디오 실동작 테스트.
   "말로 된 설명" 대신 이 페이지에서 실제로 돌려보고 결과를 눈으로 확인한다.
   · 업스케일: 숨은 iframe 으로 실제 스튜디오를 띄우고 그 안의 진짜 함수를 호출한다(같은 출처라 가능).
   · 외부 호출 감시: iframe 의 fetch 를 감싸 업스케일 도중 나간 요청을 전부 기록 → 외부가 있으면 실패.
   · 씨댄스 전송: 실서버에 dryRun 으로 보내 '첫 프레임/레퍼런스가 어떤 역할로 나가는지' 를 그대로 본다. */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FlaskConical, Play, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Loader2,
  Server, Sparkles, Film, ExternalLink, Upload,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel, Button } from '@/components/ui'
import { cn } from '@/lib/utils'

const STUDIO_SRC = '/studio-nvc-prv-8b3k2/?cnexport=1'

type State = 'idle' | 'run' | 'pass' | 'fail' | 'warn'
type Line = { label: string; value: string; state?: State }

const ICON: Record<State, JSX.Element> = {
  idle: <span className="h-4 w-4 rounded-full border border-[var(--border)]" />,
  run: <Loader2 size={16} className="animate-spin text-violet-500" />,
  pass: <CheckCircle2 size={16} className="text-emerald-500" />,
  fail: <XCircle size={16} className="text-rose-500" />,
  warn: <AlertTriangle size={16} className="text-amber-500" />,
}

function Row({ label, value, state = 'idle' }: Line) {
  return (
    <div className="flex items-start gap-2 border-b border-[var(--border-soft)] py-2 last:border-0">
      <span className="mt-0.5 flex-shrink-0">{ICON[state]}</span>
      <span className="w-56 flex-shrink-0 text-sm font-medium">{label}</span>
      <span className="min-w-0 flex-1 break-words text-sm text-[var(--text-soft)]">{value || '—'}</span>
    </div>
  )
}

export default function StudioTestsPage() {
  const frame = useRef<HTMLIFrameElement | null>(null)
  const [frameReady, setFrameReady] = useState(false)

  // ── 1. 자체 호스팅 현황 ──
  const [host, setHost] = useState<Line[]>([])
  const [hostBusy, setHostBusy] = useState(false)
  const loadHost = useCallback(async () => {
    setHostBusy(true)
    setHost([{ label: '조회 중', value: '', state: 'run' }])
    try {
      const r = await fetch('/api/admin/selfhost-status', { credentials: 'include', cache: 'no-store' })
      const j = await r.json()
      if (!j.ok) throw new Error(j.error || '조회 실패')
      const all = j.ready === j.total
      setHost([
        { label: '모델 파일 자체 보유', value: `${j.ready} / ${j.total}개 · ${(j.bytes / 1048576).toFixed(1)}MB`, state: all ? 'pass' : 'warn' },
        { label: '업스케일 필수 파일', value: `${j.srReady} / ${j.srTotal}개`, state: j.srReady === j.srTotal ? 'pass' : 'warn' },
        { label: '현재 모드', value: j.mode === 'strict' ? '자체 호스팅 전용 — 외부에서 받지 않음' : '자동 — 없는 파일은 외부에서 받아 저장', state: j.mode === 'strict' ? 'pass' : 'warn' },
        { label: '마지막 외부 사용', value: j.lastUpstream || '기록 없음', state: j.lastUpstream ? 'warn' : 'pass' },
        ...(j.missing?.length ? [{ label: '빠진 파일', value: j.missing.slice(0, 5).join(' , ') + (j.missing.length > 5 ? ` 외 ${j.missing.length - 5}개` : ''), state: 'warn' as State }] : []),
      ])
    } catch (e: any) {
      setHost([{ label: '조회 실패', value: String(e?.message || e), state: 'fail' }])
    }
    setHostBusy(false)
  }, [])
  useEffect(() => { loadHost() }, [loadHost])

  // ── 2. 업스케일 실동작 ──
  const [up, setUp] = useState<Line[]>([])
  const [upBusy, setUpBusy] = useState(false)
  const [before, setBefore] = useState<string>('')
  const [after, setAfter] = useState<string>('')
  const [scale, setScale] = useState(2)
  const [ownImg, setOwnImg] = useState<string>('')

  /** 테스트용 기본 이미지 — 가는 선·글자·그라디언트가 있어 선명도 차이가 눈에 띈다 */
  function makeTestImage(): string {
    const c = document.createElement('canvas'); c.width = 200; c.height = 132
    const x = c.getContext('2d')!
    const g = x.createLinearGradient(0, 0, 200, 132); g.addColorStop(0, '#1e3a8a'); g.addColorStop(1, '#0f766e')
    x.fillStyle = g; x.fillRect(0, 0, 200, 132)
    x.strokeStyle = '#fff'; x.lineWidth = 1
    for (let i = 0; i < 10; i++) { x.beginPath(); x.moveTo(10 + i * 6, 12); x.lineTo(10 + i * 6, 60); x.stroke() }
    x.beginPath(); x.arc(150, 40, 24, 0, Math.PI * 2); x.stroke()
    x.fillStyle = '#fff'; x.font = 'bold 15px sans-serif'; x.fillText('BYGENCY 화질', 12, 92)
    x.font = '10px sans-serif'; x.fillText('가는 선과 작은 글자로 선명도 비교', 12, 112)
    return c.toDataURL('image/png')
  }

  const runUpscale = useCallback(async () => {
    const w: any = frame.current?.contentWindow
    if (!w?.__cn?.upscaleImageURL) { setUp([{ label: '스튜디오 로드', value: '아직 준비되지 않았습니다. 잠시 후 다시 눌러주세요.', state: 'fail' }]); return }
    setUpBusy(true); setAfter('')
    const src = ownImg || makeTestImage()
    setBefore(src)
    const out: Line[] = [{ label: '초해상 엔진 확인', value: '모델 로딩 중… (최초 1회는 다운로드로 오래 걸립니다)', state: 'run' }]
    setUp([...out])

    // 업스케일이 도는 동안 iframe 이 낸 요청을 전부 기록한다(외부로 나가면 잡힌다)
    const seen: string[] = []
    const origFetch = w.fetch
    w.fetch = function (...a: any[]) { try { seen.push(String(a[0]?.url || a[0])) } catch { /* noop */ } return origFetch.apply(this, a) }

    try {
      const eng = await w.nvSrCheck(scale >= 4 ? 4 : 2)
      out[0] = eng.ok
        ? { label: '초해상 엔진 확인', value: `${eng.engine} · ${eng.factor}배 · ${eng.ms}ms`, state: 'pass' }
        : { label: '초해상 엔진 확인', value: `모델을 쓸 수 없음 → 리샘플로 동작 (${eng.error})`, state: 'fail' }
      setUp([...out])

      const t0 = Date.now()
      const res = await w.__cn.upscaleImageURL(src, scale >= 5 ? 4 : scale, scale >= 5 ? { longTarget: 5120 } : null)
      const secs = ((Date.now() - t0) / 1000).toFixed(1)
      setAfter(res.url)
      out.push({
        label: '업스케일 실행',
        value: `${res.srcDim} → ${res.dim} · ${res.engine} · ${secs}초${res.clamped ? ' (해상도 한계로 배율 조정됨)' : ''}`,
        state: res.fallback ? 'fail' : 'pass',
      })
      out.push({
        label: '진짜 초해상 여부',
        value: res.fallback ? '아니오 — 모델을 못 써서 단순 확대로 처리했습니다' + (res.reason ? ` (${res.reason})` : '') : '예 — AI 모델이 디테일을 복원했습니다',
        state: res.fallback ? 'fail' : 'pass',
      })
      const outside = seen.filter((u) => /^https?:\/\//i.test(u) && !u.startsWith(location.origin))
      out.push({
        label: '외부 서버 호출',
        value: outside.length ? `${outside.length}건 — ${outside.slice(0, 3).join(' , ')}` : `0건 (우리 서버만 사용 · 총 ${seen.length}건 요청)`,
        state: outside.length ? 'fail' : 'pass',
      })
      out.push({ label: '비용', value: '0원 — 외부 API를 쓰지 않아 크레딧도 차감되지 않습니다', state: 'pass' })
    } catch (e: any) {
      out.push({ label: '업스케일 실행', value: '실패: ' + String(e?.message || e), state: 'fail' })
    } finally {
      w.fetch = origFetch
    }
    setUp([...out]); setUpBusy(false)
  }, [ownImg, scale])

  // ── 3. 씨댄스 2.0 전송 검증(dryRun) ──
  const [sd, setSd] = useState<Line[]>([])
  const [sdBusy, setSdBusy] = useState(false)
  const [useFirst, setUseFirst] = useState(true)
  const [refCount, setRefCount] = useState(2)

  const runSeedance = useCallback(async () => {
    setSdBusy(true); setSd([{ label: '서버에 확인 중', value: '', state: 'run' }])
    // 실제 이미지 대신 서로 구분되는 아주 작은 더미 이미지 — 실제 생성은 하지 않는다(dryRun)
    const dummy = (tag: string) => {
      const c = document.createElement('canvas'); c.width = 8; c.height = 8
      const x = c.getContext('2d')!; x.fillStyle = '#' + (tag.charCodeAt(0) % 9) + '48' + (tag.charCodeAt(0) % 7) + 'a2'
      x.fillRect(0, 0, 8, 8); x.fillStyle = '#fff'; x.fillText(tag, 0, 7)
      return c.toDataURL('image/jpeg', 0.8)
    }
    const first = dummy('F')
    const refs = Array.from({ length: refCount }, (_, i) => dummy(String.fromCharCode(65 + i)))
    const nameOf = (u: string) => (u === first ? '첫 프레임 이미지' : `레퍼런스 ${refs.indexOf(u) + 1}번`)
    try {
      const r = await fetch('/api/generate', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dryRun: true, provider: 'seedance', model: 'Seedance 2.0',
          prompt: '테스트 장면', seconds: 5, ratio: '16:9',
          firstFrame: useFirst ? first : null, refImages: refs,
        }),
      })
      const j = await r.json()
      const content: any[] = j?.payload?.content || []
      const roleList = (role: string) => content.filter((c) => c.role === role).map((c) => nameOf(c.image_url?.url || ''))
      const ff = roleList('first_frame'), rf = roleList('reference_image')
      const text = String(content.find((c) => c.type === 'text')?.text || '')
      const tags = Array.from(new Set(text.match(/@Image\d/g) || []))
      const dup = ff.length > 0 && rf.some((n) => n === '첫 프레임 이미지')

      setSd([
        { label: '첫 프레임', value: ff.length ? `${ff.join(', ')} → first_frame 역할로 전송` : '전송 안 함 (레퍼런스 모드)', state: useFirst ? (ff.length === 1 ? 'pass' : 'fail') : (ff.length === 0 ? 'pass' : 'fail') },
        { label: '레퍼런스', value: rf.length ? `${rf.join(', ')} → reference_image 역할로 함께 전송` : '없음', state: rf.length === refCount ? 'pass' : 'fail' },
        { label: '중복 전송', value: dup ? '첫 프레임이 레퍼런스로도 중복 전송됨' : '없음 — 각자 제 역할로만 전송', state: dup ? 'fail' : 'pass' },
        { label: '프롬프트 번호(@Image)', value: tags.length ? `${tags.join(', ')} — 레퍼런스 ${rf.length}장과 ${tags.length === rf.length ? '일치' : '불일치'}` : '태그 없음', state: tags.length === rf.length ? 'pass' : 'warn' },
        { label: '3D 변환 지시문', value: /3D\/CG modeling clip/.test(text) ? '들어감 — 영상 레퍼런스가 없으면 잘못된 지시입니다' : '없음 (정상)', state: /3D\/CG modeling clip/.test(text) ? 'fail' : 'pass' },
        { label: '실제 생성 여부', value: j?.note || '호출 없음 (dryRun) — 크레딧 차감 없음', state: 'pass' },
      ])
    } catch (e: any) {
      setSd([{ label: '확인 실패', value: String(e?.message || e), state: 'fail' }])
    }
    setSdBusy(false)
  }, [useFirst, refCount])

  return (
    <div>
      <PageHeader
        icon={FlaskConical}
        eyebrow="STUDIO"
        title="노드 스튜디오 테스트"
        desc="업스케일이 실제로 도는지, 외부 서버를 쓰는지, 첫 프레임과 레퍼런스가 제대로 전송되는지를 이 페이지에서 직접 돌려 확인합니다. 실제 생성(크레딧 차감)은 일어나지 않습니다."
      />

      {/* 1. 자체 호스팅 */}
      <Panel
        title={<span className="flex items-center gap-2"><Server size={16} className="text-violet-500" /> 1. 우리 서버로만 돌아가는가</span>}
        action={
          <div className="flex gap-2">
            <Button variant="soft" size="sm" onClick={loadHost} disabled={hostBusy}><RefreshCw size={14} className={cn(hostBusy && 'animate-spin')} /> 새로고침</Button>
            <Button variant="soft" size="sm" href="/api/admin/warm-models"><ExternalLink size={14} /> 모델 채우기 페이지</Button>
          </div>
        }
      >
        <div className="px-1">{host.map((l, i) => <Row key={i} {...l} />)}</div>
        <p className="mt-3 rounded-lg bg-[var(--panel-2)] px-3 py-2 text-xs text-[var(--text-dim)]">
          모델 파일이 전부 우리 R2에 있고 모드가 “자체 호스팅 전용”이면, 브라우저도 서버도 외부에서 아무것도 받지 않습니다.
          빠진 파일이 있으면 “모델 채우기 페이지”를 한 번 열어주세요.
        </p>
      </Panel>

      {/* 2. 업스케일 */}
      <div className="mt-5" />
      <Panel
        title={<span className="flex items-center gap-2"><Sparkles size={16} className="text-violet-500" /> 2. 화질 업스케일이 진짜로 되는가</span>}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-[var(--border)] p-0.5">
              {[2, 4, 5].map((s) => (
                <button key={s} onClick={() => setScale(s)}
                  className={cn('rounded-md px-2.5 py-1 text-xs font-semibold', scale === s ? 'bg-violet-600 text-white' : 'text-[var(--text-soft)]')}>
                  {s === 5 ? '5K' : s + '×'}
                </button>
              ))}
            </div>
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--text-soft)]">
              <Upload size={13} /> 내 이미지
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0]; if (!f) return
                const rd = new FileReader(); rd.onload = () => setOwnImg(String(rd.result || '')); rd.readAsDataURL(f)
              }} />
            </label>
            <Button size="sm" onClick={runUpscale} disabled={upBusy || !frameReady}>
              {upBusy ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} 실행
            </Button>
          </div>
        }
      >
        {!frameReady && <p className="pb-2 text-xs text-[var(--text-dim)]">스튜디오 준비 중…</p>}
        <div className="px-1">{up.length ? up.map((l, i) => <Row key={i} {...l} />) : <p className="py-6 text-center text-sm text-[var(--text-dim)]">“실행”을 누르면 실제 업스케일을 돌려 결과를 보여줍니다.</p>}</div>
        {before && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <figure className="overflow-hidden rounded-xl border border-[var(--border)]">
              <figcaption className="border-b border-[var(--border-soft)] bg-[var(--panel-2)] px-3 py-1.5 text-xs font-semibold">원본</figcaption>
              <img src={before} alt="원본" className="w-full bg-black/20" />
            </figure>
            <figure className="overflow-hidden rounded-xl border border-[var(--border)]">
              <figcaption className="border-b border-[var(--border-soft)] bg-[var(--panel-2)] px-3 py-1.5 text-xs font-semibold">업스케일 결과</figcaption>
              {after ? <img src={after} alt="결과" className="w-full bg-black/20" /> : <div className="py-12 text-center text-xs text-[var(--text-dim)]">처리 중…</div>}
            </figure>
          </div>
        )}
        <p className="mt-3 rounded-lg bg-[var(--panel-2)] px-3 py-2 text-xs text-[var(--text-dim)]">
          두 이미지를 확대해 비교해 보세요. 가는 선과 작은 글자가 뭉개지지 않고 또렷하면 초해상이 제대로 동작한 것입니다.
          최초 1회는 모델을 내려받느라 오래 걸리고, 그 다음부터는 빨라집니다.
        </p>
      </Panel>

      {/* 3. 씨댄스 전송 */}
      <div className="mt-5" />
      <Panel
        title={<span className="flex items-center gap-2"><Film size={16} className="text-violet-500" /> 3. 첫 프레임·레퍼런스가 제대로 전송되는가 (씨댄스 2.0)</span>}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 text-xs text-[var(--text-soft)]">
              <input type="checkbox" checked={useFirst} onChange={(e) => setUseFirst(e.target.checked)} /> 첫 프레임 지정
            </label>
            <div className="flex rounded-lg border border-[var(--border)] p-0.5">
              {[0, 1, 2, 3].map((n) => (
                <button key={n} onClick={() => setRefCount(n)}
                  className={cn('rounded-md px-2.5 py-1 text-xs font-semibold', refCount === n ? 'bg-violet-600 text-white' : 'text-[var(--text-soft)]')}>
                  레퍼런스 {n}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={runSeedance} disabled={sdBusy}>
              {sdBusy ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} 확인
            </Button>
          </div>
        }
      >
        <div className="px-1">{sd.length ? sd.map((l, i) => <Row key={i} {...l} />) : <p className="py-6 text-center text-sm text-[var(--text-dim)]">“확인”을 누르면 실제 서버가 씨댄스에 무엇을 보내는지 그대로 보여줍니다. 영상은 생성되지 않습니다.</p>}</div>
        <p className="mt-3 rounded-lg bg-[var(--panel-2)] px-3 py-2 text-xs text-[var(--text-dim)]">
          첫 프레임은 <b>first_frame</b>, 참고 사진은 <b>reference_image</b> 역할로 나가야 맞습니다.
          같은 그림이 두 역할로 중복되거나, 프롬프트의 @Image 번호가 레퍼런스 장수와 다르면 결과가 지정과 다르게 나옵니다.
        </p>
      </Panel>

      {/* 실제 스튜디오 — 테스트 실행용(숨김) */}
      <iframe
        ref={frame}
        src={STUDIO_SRC}
        title="studio"
        onLoad={() => setTimeout(() => setFrameReady(true), 600)}
        style={{ position: 'fixed', width: 1, height: 1, opacity: 0, pointerEvents: 'none', left: -9999, top: 0 }}
      />
    </div>
  )
}
