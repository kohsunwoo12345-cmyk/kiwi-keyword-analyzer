import type { Metadata } from 'next'
import { RegionalContent } from './RegionalContent'

export const metadata: Metadata = {
  title: '지역별 적용 부속서 · BYGENCY',
  description: 'BYGENCY 글로벌 지역별 적용 부속서',
}

export default function RegionalAnnexPage() {
  return <RegionalContent />
}
