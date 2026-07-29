'use client'

import { CampaignDetail } from '@/components/crm/CampaignDetail'

/** 관리자 — 집행 상세 (회원 화면과 같은 내용, 수정·발송 버튼은 없다) */
export default function AdminCrmCampaignDetailPage() {
  return <CampaignDetail all backHref="/adminsunkoh028741_11263/crm-campaigns" />
}
