import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number): string {
  if (num >= 10000) return `${(num / 10000).toFixed(1)}만`
  return num.toLocaleString('ko-KR')
}

export function formatNumberFull(num: number): string {
  return num.toLocaleString('ko-KR')
}

export function calcSaturation(monthlySearch: number, monthlyDoc: number): {
  label: string; color: string; level: number
} {
  if (monthlySearch === 0) return { label: '데이터없음', color: 'text-gray-400', level: 0 }
  const ratio = (monthlyDoc / monthlySearch) * 100
  if (ratio < 5) return { label: '매우낮음', color: 'text-blue-600', level: 1 }
  if (ratio < 20) return { label: '낮음', color: 'text-green-600', level: 2 }
  if (ratio < 50) return { label: '보통', color: 'text-yellow-600', level: 3 }
  if (ratio < 100) return { label: '높음', color: 'text-orange-500', level: 4 }
  return { label: '매우높음', color: 'text-red-600', level: 5 }
}

export function calcKeywordGrade(
  totalSearch: number,
  totalDoc: number,
  issueIndex: number = 5
): { grade: string; color: string; bg: string } {
  if (totalSearch === 0) return { grade: 'N', color: 'text-gray-500', bg: 'bg-gray-100' }

  const saturation = totalDoc / totalSearch
  let score = 0

  // 검색량 점수 (40점)
  if (totalSearch >= 100000) score += 40
  else if (totalSearch >= 50000) score += 35
  else if (totalSearch >= 30000) score += 30
  else if (totalSearch >= 10000) score += 25
  else if (totalSearch >= 5000) score += 20
  else if (totalSearch >= 1000) score += 15
  else if (totalSearch >= 500) score += 10
  else score += 5

  // 포화도 점수 (30점, 낮을수록 좋음)
  if (saturation < 0.05) score += 30
  else if (saturation < 0.1) score += 25
  else if (saturation < 0.2) score += 20
  else if (saturation < 0.5) score += 15
  else if (saturation < 1) score += 10
  else score += 5

  // 이슈성 점수 (30점, 낮을수록 안정적으로 좋음)
  if (issueIndex < 3) score += 30
  else if (issueIndex < 5) score += 25
  else if (issueIndex < 10) score += 20
  else if (issueIndex < 20) score += 10
  else score += 5

  const grades = [
    { min: 90, grade: 'S+', color: 'text-purple-700', bg: 'bg-purple-100' },
    { min: 85, grade: 'S', color: 'text-purple-600', bg: 'bg-purple-50' },
    { min: 80, grade: 'S-', color: 'text-purple-500', bg: 'bg-purple-50' },
    { min: 75, grade: 'A+', color: 'text-blue-700', bg: 'bg-blue-100' },
    { min: 70, grade: 'A', color: 'text-blue-600', bg: 'bg-blue-50' },
    { min: 65, grade: 'A-', color: 'text-blue-500', bg: 'bg-blue-50' },
    { min: 58, grade: 'B+', color: 'text-green-700', bg: 'bg-green-100' },
    { min: 52, grade: 'B', color: 'text-green-600', bg: 'bg-green-50' },
    { min: 46, grade: 'B-', color: 'text-green-500', bg: 'bg-green-50' },
    { min: 40, grade: 'C+', color: 'text-yellow-700', bg: 'bg-yellow-100' },
    { min: 34, grade: 'C', color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { min: 28, grade: 'C-', color: 'text-yellow-500', bg: 'bg-yellow-50' },
    { min: 22, grade: 'D+', color: 'text-red-500', bg: 'bg-red-50' },
    { min: 16, grade: 'D', color: 'text-red-600', bg: 'bg-red-100' },
    { min: 0, grade: 'D-', color: 'text-red-700', bg: 'bg-red-100' },
  ]

  for (const g of grades) {
    if (score >= g.min) return { grade: g.grade, color: g.color, bg: g.bg }
  }
  return { grade: 'D-', color: 'text-red-700', bg: 'bg-red-100' }
}

export function getMonthlyRatio(monthly: number[]): number[] {
  const max = Math.max(...monthly, 1)
  return monthly.map(v => Math.round((v / max) * 100))
}

export const MONTH_LABELS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']
export const DAY_LABELS = ['월','화','수','목','금','토','일']
