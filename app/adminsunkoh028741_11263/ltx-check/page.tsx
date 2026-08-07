'use client'

/* 관리자 — LTX(Lightricks) API 키 확인
   이 화면이 하는 일은 딱 하나다: **콘솔에 넣어 둔 LTX_API_KEY 가 진짜 되는가.**

   ⚠ 여기서는 영상이 만들어지지 않는다. 서버 진단(?diag=ltx)이 GET(읽기)만 보내기 때문이다.
     "확인만 했는데 돈이 나갔다" 를 알리바바에서 한 번 겪었다(확인 요청이 실제 태스크를 만들었다).
     그래서 이 화면에는 생성 단추가 없고, 서버 쪽에도 보내는 자리가 GET 하나뿐이다.

   ⚠ 판정에 "확인 못 함" 이 있다. 없애고 싶은 유혹이 있는데 없애면 안 된다 —
     200 하나만 보고 "된다" 고 말하는 화면이 되고, 그 말을 믿고 모델을 켜면 회원이 실패를 본다. */

import { useCallback, useEffect, useState } from 'react'
import {
  KeyRound, RefreshCw, CheckCircle2, XCircle, HelpCircle, Loader2,
  ShieldCheck, Boxes, ExternalLink,
} from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { Panel } from '@/components/ui'
import { cn } from '@/lib/utils'
import { ADMIN_BASE } from '../layout'

const ACCENT = '#7c3aed'

type Probe = {
  검사: string; url: string; status: number; ms?: number
  code?: string | null; message?: string | null; 본문?: string; 오류?: string
}
type Res = {
  diag?: string
  키있음?: boolean
  키지문?: string
  키길이?: number
  키작동?: boolean | null
  판정?: string
  근거?: string
  잔액?: number | null
  모델목록?: { 호스트: string; 경로: string; 개수: number; 모델: string[] }[]
  대조?: Probe | null
  결과?: Probe[]
  주의?: string
  다음?: string
  error?: string
  needAdmin?: boolean
}

/* 상태코드 하나가 무슨 뜻인지 — 이 표가 이 화면의 전부다.
   숫자만 늘어놓으면 관리자가 매번 다시 판단해야 하고, 매번 다르게 판단한다. */
function 뜻(status: number): { label: string; tone: 'ok' | 'bad' | 'mid' | 'dead' } {
  if (status === 0) return { label: '닿지 않음', tone: 'dead' }
  if (status >= 200 && status < 300) return { label: '통과', tone: 'ok' }
  if (status === 401) return { label: '인증 거절 — 키 문제', tone: 'bad' }
  if (status === 403) return { label: '권한 없음', tone: 'mid' }
  if (status === 404) return { label: '그 경로 없음 — 키 판단 불가', tone: 'mid' }
  if (status === 429) return { label: '한도 초과 — 키는 살아 있음', tone: 'mid' }
  return { label: '거절(키 문제 아님)', tone: 'mid' }
}

const TONE: Record<string, string> = {
  ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  bad: 'bg-rose-50 text-rose-700 border-rose-200',
  mid: 'bg-amber-50 text-amber-700 border-amber-200',
  dead: 'bg-slate-100 text-slate-500 border-slate-200',
}

export default function LtxCheckPage() {
  const [res, setRes] = useState<Res | null>(null)
  const [loading, setLoading] = useState(false)

  const run = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/generate?diag=ltx', { credentials: 'include', cache: 'no-store' })
      setRes(await r.json())
    } catch (e: any) {
      setRes({ error: String(e?.message || e) })
    }
    setLoading(false)
  }, [])
  useEffect(() => { run() }, [run])

  const works = res?.키작동
  const verdictTone = works === true ? 'ok' : works === false ? 'bad' : 'mid'
  const VerdictIcon = works === true ? CheckCircle2 : works === false ? XCircle : HelpCircle

  return (
    <div>
      <PageHeader
        icon={KeyRound}
        eyebrow="ADMIN"
        title="LTX API 키 확인"
        desc="콘솔에 넣어 둔 LTX_API_KEY 가 실제로 작동하는지만 확인합니다. 읽기(GET) 요청만 보내므로 영상이 만들어지지 않고 비용도 발생하지 않습니다."
        accent={ACCENT}
        action={
          <button
            onClick={run}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 px-3 py-1.5 text-sm font-bold text-white hover:brightness-110 disabled:opacity-60"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} 다시 확인
          </button>
        }
      />

      {/* 이 화면이 돈을 쓰지 않는다는 사실을 화면에서도 못 박는다 */}
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <ShieldCheck size={16} className="mt-0.5 shrink-0" />
        <span>
          <b>생성은 하지 않습니다.</b> 확인에 쓰는 요청은 전부 읽기(GET)입니다 — 모델 목록·잔액 조회와
          <b> 없는 작업 번호 조회</b>뿐이라 만들어질 결과물이 없습니다. 따라서 이 화면을 몇 번 눌러도 요금이 나가지 않습니다.
        </span>
      </div>

      {res?.needAdmin && (
        <Panel className="mb-4"><p className="text-sm text-rose-600">관리자로 로그인해야 확인할 수 있습니다.</p></Panel>
      )}

      {loading && !res && (
        <Panel><p className="flex items-center gap-2 text-sm text-[var(--text-dim)]"><Loader2 size={14} className="animate-spin" /> LTX 서버에 물어보는 중…</p></Panel>
      )}

      {res && !res.needAdmin && (
        <>
          {/* ── 판정 ── */}
          <Panel className="mb-4">
            <div className={cn('flex items-start gap-3 rounded-xl border px-4 py-3', TONE[verdictTone])}>
              <VerdictIcon size={20} className="mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-base font-bold">
                  {res.error && !res.판정 ? res.error : res.판정 || '판정 없음'}
                </p>
                {res.근거 && <p className="mt-1 text-sm leading-relaxed opacity-90">{res.근거}</p>}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-[var(--border)] p-3">
                <p className="text-xs text-[var(--text-dim)]">키 설정</p>
                <p className="mt-0.5 font-semibold">{res.키있음 ? '설정됨 (LTX_API_KEY)' : '없음'}</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] p-3">
                <p className="text-xs text-[var(--text-dim)]">키 지문 · 길이</p>
                {/* 값 자체는 서버가 절대 안 준다. 콘솔 키와 같은 것인지 대조하는 용도다. */}
                <p className="mt-0.5 font-mono text-sm font-semibold">
                  {res.키지문 || '—'}{res.키길이 ? ` · ${res.키길이}자` : ''}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--border)] p-3">
                <p className="text-xs text-[var(--text-dim)]">잔액(조회된 경우)</p>
                <p className="mt-0.5 font-semibold">{res.잔액 == null ? '조회 안 됨' : res.잔액.toLocaleString('ko-KR')}</p>
              </div>
            </div>

            {res.다음 && <p className="mt-3 text-xs text-[var(--text-dim)]">다음 단계 — {res.다음}</p>}
          </Panel>

          {/* ── 대조 확인: 이 진단이 결론을 낼 수 있는 이유 ── */}
          {res.대조 && (
            <Panel className="mb-4" title={<span className="flex items-center gap-2"><ShieldCheck size={16} className="text-violet-500" /> 대조 확인 (일부러 틀린 키)</span>}>
              <p className="mb-3 text-sm leading-relaxed text-[var(--text-soft)]">
                200 하나만 보고 &ldquo;된다&rdquo;고 하면 틀립니다 — 인증을 아예 보지 않는 주소도 200 을 줍니다.
                그래서 <b>같은 주소를 일부러 틀린 키로 한 번 더</b> 읽습니다.
                우리 키는 통과하는데 틀린 키가 거절되면, 그 주소는 인증을 실제로 보고 있고 우리 키가 그걸 통과했다는 뜻입니다.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <tbody>
                    <tr className="border-b border-[var(--border)]">
                      <td className="py-2 pr-3 text-[var(--text-dim)]">우리 키</td>
                      <td className="py-2 font-mono">{res.결과?.find((x) => x.url === res.대조?.url)?.status ?? '—'}</td>
                      <td className="py-2 text-[var(--text-dim)]">{뜻(res.결과?.find((x) => x.url === res.대조?.url)?.status ?? 0).label}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 text-[var(--text-dim)]">일부러 틀린 키</td>
                      <td className="py-2 font-mono">{res.대조.status}</td>
                      <td className="py-2 text-[var(--text-dim)]">{뜻(res.대조.status).label}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-2 break-all font-mono text-xs text-[var(--text-dim)]">{res.대조.url}</p>
            </Panel>
          )}

          {/* ── 제공사가 알려 준 모델 ── */}
          {!!res.모델목록?.length && (
            <Panel className="mb-4" title={<span className="flex items-center gap-2"><Boxes size={16} className="text-violet-500" /> 이 키로 잡히는 모델</span>}>
              {res.모델목록.map((g, i) => (
                <div key={i} className="mb-3 last:mb-0">
                  <p className="mb-2 font-mono text-xs text-[var(--text-dim)]">{g.호스트}{g.경로} · {g.개수}개</p>
                  <div className="flex flex-wrap gap-1.5">
                    {g.모델.map((m) => (
                      <span key={m} className="rounded-md border border-[var(--border)] bg-slate-50 px-2 py-1 font-mono text-xs">{m}</span>
                    ))}
                  </div>
                </div>
              ))}
              <p className="mt-3 text-xs text-[var(--text-dim)]">
                여기 나온 모델 ID 는 <b>제공사가 직접 알려 준 것</b>입니다 — 추측이 아닙니다.
                <a href={`${ADMIN_BASE}/model-sync`} className="ml-1 inline-flex items-center gap-1 font-semibold text-violet-600 hover:underline">
                  모델 등록부에서 등록 <ExternalLink size={11} />
                </a>
                하면 배포 없이 노드 목록에 나타납니다.
              </p>
            </Panel>
          )}

          {/* ── 원문 ── 판정을 못 믿을 때 사람이 직접 읽는 자리 ── */}
          <Panel title="확인한 주소와 응답 (원문)">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]">
                    <th className="py-2 pr-3 font-medium">검사</th>
                    <th className="py-2 pr-3 font-medium">상태</th>
                    <th className="py-2 pr-3 font-medium">뜻</th>
                    <th className="py-2 pr-3 font-medium">응답 시간</th>
                    <th className="py-2 font-medium">응답 원문 / 오류</th>
                  </tr>
                </thead>
                <tbody>
                  {(res.결과 || []).map((r, i) => {
                    const t = 뜻(r.status)
                    return (
                      <tr key={i} className="border-b border-[var(--border)] align-top last:border-0">
                        <td className="py-2 pr-3">
                          <p className="font-medium">{r.검사}</p>
                          <p className="break-all font-mono text-[11px] text-[var(--text-dim)]">{r.url}</p>
                        </td>
                        <td className="py-2 pr-3 font-mono">{r.status || '—'}</td>
                        <td className="py-2 pr-3">
                          <span className={cn('inline-block rounded-md border px-2 py-0.5 text-xs font-semibold', TONE[t.tone])}>{t.label}</span>
                        </td>
                        <td className="py-2 pr-3 text-xs text-[var(--text-dim)]">{r.ms != null ? `${r.ms}ms` : '—'}</td>
                        <td className="py-2">
                          {r.오류
                            ? <p className="text-xs text-rose-600">{r.오류}</p>
                            : <p className="break-all font-mono text-[11px] text-[var(--text-dim)]">{r.message || r.본문 || '—'}</p>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {res.주의 && <p className="mt-3 text-xs text-[var(--text-dim)]">{res.주의}</p>}
          </Panel>

          {/* 주소를 못 박지 못한 이유를 숨기지 않는다 — 숨기면 다음 사람이 같은 벽을 다시 만난다 */}
          <p className="mt-4 text-xs leading-relaxed text-[var(--text-dim)]">
            확인 대상 주소는 <span className="font-mono">api.ltx.video</span> · <span className="font-mono">api.ltx.io</span> 두 곳을 훑습니다.
            LTX 공식 문서가 개발 환경에서 열리지 않아 주소를 하나로 못 박지 않았고, 대신 <b>실제로 답하는 곳을 찾는</b> 방식으로 만들었습니다.
            배포된 서버에서 이 화면을 열면 어느 주소가 답하는지가 위 표에 그대로 나옵니다.
          </p>
        </>
      )}
    </div>
  )
}
