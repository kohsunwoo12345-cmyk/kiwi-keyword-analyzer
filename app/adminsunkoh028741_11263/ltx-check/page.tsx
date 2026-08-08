'use client'

/* 관리자 — LTX(Lightricks) API 키 확인
   화면과 판정은 전부 KeyCheckPanel · _keycheck.ts 에 있다. 여기는 "어느 제공사냐" 만 정한다.
   제공사마다 화면을 한 벌씩 만들면 판정이 늘어날 때 한쪽에만 반영된다. */

import { KeyCheckPanel } from '@/components/admin/KeyCheckPanel'
import { ADMIN_BASE } from '../layout'

export default function LtxCheckPage() {
  return (
    <KeyCheckPanel
      provider="ltx"
      title="LTX API 키 확인"
      envName="LTX_API_KEY"
      desc="콘솔에 넣어 둔 LTX_API_KEY 가 실제로 작동하는지만 확인합니다. 읽기(GET) 요청만 보내므로 영상이 만들어지지 않고 비용도 발생하지 않습니다."
      registryHref={`${ADMIN_BASE}/model-sync`}
    />
  )
}
