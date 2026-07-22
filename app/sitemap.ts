import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

export const dynamic = 'force-static'

// 공개 마케팅 페이지 사이트맵 (관리자·대시보드·API 제외)
export default function sitemap(): MetadataRoute.Sitemap {
  const now = '2026-07-19T00:00:00.000Z'
  const routes: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
    { path: '/', priority: 1.0, freq: 'daily' },
    { path: '/features', priority: 0.9, freq: 'weekly' },
    { path: '/features/video', priority: 0.9, freq: 'weekly' },
    { path: '/features/youtube', priority: 0.8, freq: 'weekly' },
    { path: '/features/blog', priority: 0.8, freq: 'weekly' },
    { path: '/features/team', priority: 0.7, freq: 'weekly' },
    { path: '/features/crm', priority: 0.7, freq: 'weekly' },
    { path: '/features/ads', priority: 0.7, freq: 'weekly' },
    { path: '/pricing', priority: 0.9, freq: 'weekly' },
    { path: '/about', priority: 0.6, freq: 'monthly' },
    { path: '/claude-mcp', priority: 0.7, freq: 'monthly' },
    { path: '/contact', priority: 0.5, freq: 'monthly' },
    { path: '/activate', priority: 0.5, freq: 'monthly' },
    { path: '/login', priority: 0.3, freq: 'yearly' },
    { path: '/signup', priority: 0.4, freq: 'yearly' },
    { path: '/legal/terms', priority: 0.2, freq: 'yearly' },
    { path: '/legal/privacy', priority: 0.2, freq: 'yearly' },
    { path: '/legal/cookies', priority: 0.2, freq: 'yearly' },
    { path: '/legal/dpa', priority: 0.2, freq: 'yearly' },
    { path: '/legal/regional', priority: 0.2, freq: 'yearly' },
  ]
  return routes.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.freq,
    priority: r.priority,
  }))
}
