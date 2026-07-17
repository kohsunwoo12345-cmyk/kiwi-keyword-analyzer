'use client'

import { Gauge } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { ModelPricing } from '@/components/admin/ModelPricing'
import { CreditsRecall } from '@/components/admin/CreditsRecall'
import { Reveal } from '@/components/motion'

const ACCENT = '#7c3aed'

export default function AiPricingPage() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Gauge}
        eyebrow="ADMIN"
        title="AI 비용 · 원가율(배수)"
        desc="각 AI 모델의 크레딧 차감 배수를 전체 또는 회원별로 조정합니다. X1=원가(제공사 API비용×환율) 그대로, X2=원가의 2배 청구. 원가 이하(X1 미만)로는 설정되지 않으며, 설정한 배수가 실제 크레딧 차감에 그대로 반영됩니다."
        accent={ACCENT}
      />
      <div className="space-y-6 p-6 lg:p-8">
        <Reveal>
          <ModelPricing />
        </Reveal>
        <Reveal>
          <CreditsRecall />
        </Reveal>
      </div>
    </div>
  )
}
