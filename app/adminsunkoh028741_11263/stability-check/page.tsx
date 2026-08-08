'use client'

/* 관리자 — Stability AI API 키 확인
   LTX·Recraft·Bria 와 같은 화면·같은 판정을 쓴다(KeyCheckPanel · _keycheck.ts).

   ⚠ 이 제공사만 환경변수 이름이 흔들린다. 받은 이름이 `Stabilitya-API-KEY` 였다 —
     Stability 에 a 가 하나 더 붙어 있고 구분자도 붙임표다. 오타로 보이지만 진짜 그
     이름으로 넣었을 수 있어서 후보를 넓게 잡아 뒀다(_stability.ts). 화면은 그중
     **실제로 잡힌 이름**을 그대로 보여 준다 — "키 없음" 과 "이름이 다름" 은 다른 문제다. */

import { KeyCheckPanel } from '@/components/admin/KeyCheckPanel'
import { ADMIN_BASE } from '../layout'

export default function StabilityCheckPage() {
  return (
    <KeyCheckPanel
      provider="stability"
      title="Stability AI 키 확인"
      envName="Stabilitya-API-KEY (표준형도 함께 찾습니다)"
      desc="넣어 두신 Stability 키가 실제로 작동하는지와 남은 크레딧을 확인합니다. 조회 전용 경로만 읽고 생성 경로는 건드리지 않으므로 이미지가 만들어지지 않고 비용도 발생하지 않습니다."
      registryHref={`${ADMIN_BASE}/model-sync`}
    />
  )
}
