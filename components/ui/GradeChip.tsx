'use client'
import { cn } from '@/lib/utils'

interface GradeChipProps {
  grade: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const gradeStyles: Record<string, { bg: string; text: string; border: string }> = {
  'S+': { bg: 'bg-purple-600', text: 'text-white', border: 'border-purple-700' },
  'S':  { bg: 'bg-purple-500', text: 'text-white', border: 'border-purple-600' },
  'S-': { bg: 'bg-purple-400', text: 'text-white', border: 'border-purple-500' },
  'A+': { bg: 'bg-blue-600',   text: 'text-white', border: 'border-blue-700' },
  'A':  { bg: 'bg-blue-500',   text: 'text-white', border: 'border-blue-600' },
  'A-': { bg: 'bg-blue-400',   text: 'text-white', border: 'border-blue-500' },
  'B+': { bg: 'bg-emerald-600',text: 'text-white', border: 'border-emerald-700' },
  'B':  { bg: 'bg-emerald-500',text: 'text-white', border: 'border-emerald-600' },
  'B-': { bg: 'bg-emerald-400',text: 'text-white', border: 'border-emerald-500' },
  'C+': { bg: 'bg-yellow-500', text: 'text-white', border: 'border-yellow-600' },
  'C':  { bg: 'bg-yellow-400', text: 'text-white', border: 'border-yellow-500' },
  'C-': { bg: 'bg-yellow-300', text: 'text-gray-800', border: 'border-yellow-400' },
  'D+': { bg: 'bg-red-400',    text: 'text-white', border: 'border-red-500' },
  'D':  { bg: 'bg-red-500',    text: 'text-white', border: 'border-red-600' },
  'D-': { bg: 'bg-red-600',    text: 'text-white', border: 'border-red-700' },
  'N':  { bg: 'bg-gray-300',   text: 'text-gray-600', border: 'border-gray-400' },
}

export function GradeChip({ grade, size = 'md', className }: GradeChipProps) {
  const style = gradeStyles[grade] || gradeStyles['N']
  const sizes = {
    sm: 'text-xs px-2 py-0.5 rounded',
    md: 'text-sm px-3 py-1 rounded-md',
    lg: 'text-lg px-4 py-1.5 rounded-lg font-bold',
    xl: 'text-3xl px-6 py-2 rounded-xl font-black',
  }
  return (
    <span className={cn(
      'inline-flex items-center justify-center font-bold border',
      style.bg, style.text, style.border, sizes[size], className
    )}>
      {grade}
    </span>
  )
}
