'use client'

import { CampaignResults } from '@/components/crm/CampaignResults'

const BASE = '/dashboard_USE17237_612/crm'

export default function CrmResultsPage() {
  return <CampaignResults calendarHref={`${BASE}/campaigns`} detailHref={`${BASE}/campaigns/detail`} />
}
