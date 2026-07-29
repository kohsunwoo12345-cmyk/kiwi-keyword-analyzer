'use client'

import { CampaignResults } from '@/components/crm/CampaignResults'

const BASE = '/adminsunkoh028741_11263'

/** 관리자 — 전 회원의 캠페인 결과 */
export default function AdminCrmResultsPage() {
  return <CampaignResults all calendarHref={`${BASE}/crm-campaigns`} detailHref={`${BASE}/crm-campaigns/detail`} />
}
