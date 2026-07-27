'use client'

import { Gauge } from 'lucide-react'
import { PageHeader } from '@/components/dash/PageHeader'
import { ModelPricing } from '@/components/admin/ModelPricing'
import { UpscalePricing } from '@/components/admin/UpscalePricing'
import { EditPricing } from '@/components/admin/EditPricing'
import { UserMarkupList } from '@/components/admin/UserMarkupList'
import { PromptGenPricing } from '@/components/admin/PromptGenPricing'
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
        desc="각 AI 모델의 크레딧 차감 배수를 전체 또는 회원별로 조정합니다. X1=원가(제공사 API비용×환율) 그대로, X2=원가의 2배 청구. 화질 업스케일처럼 제공사 비용이 없는 자체 기능은 원가 자리에 서비스 요금(원)을 직접 입력하며, 그 요금에 배수가 곱해져 차감됩니다."
        accent={ACCENT}
      />
      <div className="space-y-6 p-6 lg:p-8">
        <Reveal>
          <UpscalePricing />
        </Reveal>
        <Reveal>
          <EditPricing />
        </Reveal>
        <Reveal>
          <ModelPricing />
        </Reveal>
        <Reveal>
          <PromptGenPricing />
        </Reveal>
        <Reveal>
          <UserMarkupList />
        </Reveal>
        <Reveal>
          <CreditsRecall />
        </Reveal>
      </div>
    </div>
  )
}
