'use client'

import { CampaignCalendar } from '@/components/crm/CampaignCalendar'

const BASE = '/adminsunkoh028741_11263'

/** 관리자 — 전 회원의 CRM 마케팅 집행 */
export default function AdminCrmCampaignsPage() {
  return <CampaignCalendar all resultsHref={`${BASE}/crm-results`} detailHref={`${BASE}/crm-campaigns/detail`} />
}
