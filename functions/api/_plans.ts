import { getSetting } from './_utils'

// 관리자 편집 가능한 요금제 설정. settings.plan_config(JSON)에 저장.
export interface PlanTierCfg {
  price: number      // 정가(원/월)
  discount: number   // 할인율(%)
  credits: number    // 가입 승인 시 지급 크레딧
  maxNodes: number   // 스튜디오 최대 노드 수 (0 = 무제한)
  features: string[] // 제공 서비스 항목(요금제 페이지 표시)
}
export type Track = 'marketer' | 'video'
export type PlanConfig = { marketer: Record<string, PlanTierCfg>; video: Record<string, PlanTierCfg> }

export const DEFAULT_PLAN_CONFIG: PlanConfig = {
  marketer: {
    Plus: { price: 29000, discount: 0, credits: 0, maxNodes: 0, features: ['월 3,000 DB 수집', '유튜브·블로그 기본 분석', '플레이스 순위 조회', '문자 발송 (건별 차감)', '기본 리포트 대시보드'] },
    Pro: { price: 89000, discount: 0, credits: 0, maxNodes: 0, features: ['월 30,000 DB 수집', '유튜브·블로그·플레이스 전체 분석', 'CRM · 고객 세그먼트 관리', '알림톡 · 문자 캠페인 자동화', '팀 협업 5인 · 권한 관리', '맞춤 리포트 · 성과 추적'] },
    Max: { price: 249000, discount: 0, credits: 0, maxNodes: 0, features: ['DB 수집 무제한', '마케터 전 기능 잠금 해제', '알림톡 · 문자 대량 발송 최적 단가', '팀 협업 무제한 · 워크스페이스 분리', 'API 연동 · 데이터 내보내기', '전담 매니저 · 우선 기술 지원'] },
  },
  video: {
    Plus: { price: 49000, discount: 0, credits: 1500, maxNodes: 0, features: ['월 1,500 크레딧 제공', '노드 에디터 기본 워크플로우', '기본 영상 생성 모델', '숏폼·광고 템플릿 제공', '1080p 렌더링'] },
    Pro: { price: 149000, discount: 0, credits: 6000, maxNodes: 0, features: ['월 6,000 크레딧 제공', '고급 모델 (Seedance · Veo 등)', '워터마크 제거', '노드 커스텀 워크플로우 저장', '음성·자막 자동 생성', '팀 공유 · 에셋 라이브러리'] },
    Max: { price: 390000, discount: 0, credits: 20000, maxNodes: 0, features: ['월 20,000 크레딧 (무제한급)', '최상위 영상·이미지 모델 전체', '우선 렌더 큐 · 대기 없는 처리', '4K 고해상도 렌더링', 'API · 배치 렌더 자동화', '전담 매니저 · 우선 지원'] },
  },
}

const TIERS = ['Plus', 'Pro', 'Max']

function mergeTier(base: PlanTierCfg, o: any): PlanTierCfg {
  if (!o || typeof o !== 'object') return { ...base }
  return {
    price: o.price != null && Number(o.price) >= 0 ? Math.round(Number(o.price)) : base.price,
    discount: o.discount != null ? Math.max(0, Math.min(100, Number(o.discount) || 0)) : base.discount,
    credits: o.credits != null && Number(o.credits) >= 0 ? Math.round(Number(o.credits)) : base.credits,
    maxNodes: o.maxNodes != null && Number(o.maxNodes) >= 0 ? Math.round(Number(o.maxNodes)) : base.maxNodes,
    features: Array.isArray(o.features) ? o.features.map((f: any) => String(f)).filter(Boolean).slice(0, 20) : base.features,
  }
}
export function mergePlanConfig(parsed: any): PlanConfig {
  const out: PlanConfig = { marketer: {}, video: {} }
  for (const track of ['marketer', 'video'] as Track[]) {
    for (const tier of TIERS) {
      out[track][tier] = mergeTier(DEFAULT_PLAN_CONFIG[track][tier], parsed?.[track]?.[tier])
    }
  }
  return out
}
export function effectivePrice(t: PlanTierCfg): number {
  const d = Math.max(0, Math.min(100, Number(t?.discount) || 0))
  return Math.round((Number(t?.price) || 0) * (1 - d / 100))
}
export async function getPlanConfig(db: D1Database): Promise<PlanConfig> {
  try {
    const raw = await getSetting(db, 'plan_config')
    if (raw) return mergePlanConfig(JSON.parse(raw))
  } catch { /* fall back to default */ }
  return mergePlanConfig(null)
}
// 특정 플랜의 실효가(할인 적용). 없으면 0.
export function planPriceEffective(cfg: PlanConfig, track: string, plan: string): number {
  const t = cfg?.[track === 'video' ? 'video' : 'marketer']?.[plan]
  return t ? effectivePrice(t) : 0
}
