'use client'

import { CampaignCalendar } from '@/components/crm/CampaignCalendar'

/** 관리자 — 전 회원의 CRM 마케팅 집행을 달력으로 본다 */
export default function AdminCrmCampaignsPage() {
  return <CampaignCalendar all resultsHref="/adminsunkoh028741_11263/crm-results" />
}
