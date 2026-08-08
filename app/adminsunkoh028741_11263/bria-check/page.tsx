'use client'

/* 관리자 — Bria API 키 확인
   LTX·Recraft 와 같은 화면·같은 판정을 쓴다(KeyCheckPanel · _keycheck.ts).

   ⚠ Bria 만 다른 점: 인증이 **`api_token` 헤더**다. Bearer 가 아니다.
     (Bria 가 직접 배포하는 공식 ComfyUI 노드 코드에서 읽었다.)
     Bearer 로 물었으면 멀쩡한 키가 401 로 돌아왔을 것이고, 우리는 그 답을 믿고
     키를 재발급하러 갔을 것이다 — 확인 도구가 틀린 답을 확신에 차서 말하는 게 제일 나쁘다.

   읽는 곳은 조회 전용 경로 둘(/v1/tailored-gen/models/…)뿐이고
   생성 경로(/v2/image/…)는 아예 건드리지 않는다. */

import { KeyCheckPanel } from '@/components/admin/KeyCheckPanel'
import { ADMIN_BASE } from '../layout'

export default function BriaCheckPage() {
  return (
    <KeyCheckPanel
      provider="bria"
      title="Bria API 키 확인"
      envName="BRIA_API_KEY"
      desc="콘솔에 넣어 둔 BRIA_API_KEY 가 실제로 작동하는지만 확인합니다. 조회 전용 경로만 읽고 생성 경로는 건드리지 않으므로 이미지가 만들어지지 않고 비용도 발생하지 않습니다. (Bria 는 Bearer 가 아니라 api_token 헤더로 인증합니다.)"
      registryHref={`${ADMIN_BASE}/model-sync`}
    />
  )
}
