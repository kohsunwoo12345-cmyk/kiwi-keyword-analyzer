import { FEATURES, getFeature } from '@/lib/features'
import { FeatureDetail } from './FeatureDetail'

export function generateStaticParams() {
  return FEATURES.map((f) => ({ slug: f.slug }))
}

export const dynamicParams = false

export function generateMetadata({ params }: { params: { slug: string } }) {
  const f = getFeature(params.slug)
  if (!f) {
    return {
      title: '기능 | BYGENCY',
      description: 'BYGENCY 올인원 마케팅 그로스 플랫폼의 기능을 살펴보세요.',
    }
  }
  return {
    title: `${f.title} | BYGENCY`,
    description: f.desc,
  }
}

export default function Page({ params }: { params: { slug: string } }) {
  return <FeatureDetail slug={params.slug} />
}
