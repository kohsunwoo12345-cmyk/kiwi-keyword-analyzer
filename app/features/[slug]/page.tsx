import { FEATURES, getFeature } from '@/lib/features'
import { FeatureDetail } from './FeatureDetail'

export function generateStaticParams() {
  return FEATURES.map((f) => ({ slug: f.slug }))
}

export const dynamicParams = false

// Next 15 부터 params 는 Promise 다.
type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params
  const f = getFeature(slug)
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

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params
  return <FeatureDetail slug={slug} />
}
