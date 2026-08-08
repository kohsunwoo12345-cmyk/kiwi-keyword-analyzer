'use client'

/* 관리자 — Recraft API 키 확인
   LTX 와 같은 화면·같은 판정을 쓴다(KeyCheckPanel · _keycheck.ts).

   Recraft 는 LTX 와 달리 주소를 원문으로 확인했다 — 공개 OpenAPI 명세의 servers 값이다.
   그래서 후보를 훑지 않고 명세에 적힌 유일한 읽기 경로(GET /users/me) 하나만 본다.
   그 경로는 계정과 잔액을 돌려주고 인증을 반드시 본다 — 확인에 이보다 나은 자리가 없다.
   ⚠ 생성 경로(/images/generations…)는 아예 건드리지 않는다. */

import { KeyCheckPanel } from '@/components/admin/KeyCheckPanel'
import { ADMIN_BASE } from '../layout'

export default function RecraftCheckPage() {
  return (
    <KeyCheckPanel
      provider="recraft"
      title="Recraft API 키 확인"
      envName="Recraft_API_KEY"
      desc="콘솔에 넣어 둔 Recraft_API_KEY 가 실제로 작동하는지와 남은 잔액을 확인합니다. 계정 조회(GET /users/me) 하나만 읽으며 생성 경로는 건드리지 않습니다 — 이미지가 만들어지지 않고 비용도 발생하지 않습니다."
      registryHref={`${ADMIN_BASE}/model-sync`}
    />
  )
}
