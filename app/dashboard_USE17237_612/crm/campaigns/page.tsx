'use client'

import { CampaignCalendar } from '@/components/crm/CampaignCalendar'

const BASE = '/dashboard_USE17237_612/crm'

export default function CrmCampaignsPage() {
  return <CampaignCalendar resultsHref={`${BASE}/results`} detailHref={`${BASE}/campaigns/detail`} />
}
