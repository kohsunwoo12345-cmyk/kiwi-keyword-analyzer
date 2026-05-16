'use client'
import { useState, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  onSearch: (keyword: string) => void
  placeholder?: string
  size?: 'md' | 'lg'
  className?: string
  defaultValue?: string
}

export function SearchBar({ onSearch, placeholder = '키워드를 입력하세요', size = 'md', className, defaultValue = '' }: SearchBarProps) {
  const [value, setValue] = useState(defaultValue)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value.trim()) onSearch(value.trim())
  }

  const handleClear = () => {
    setValue('')
    inputRef.current?.focus()
  }

  return (
    <form onSubmit={handleSubmit} className={cn('relative flex items-center', className)}>
      <Search className={cn(
        'absolute left-3.5 text-gray-400 pointer-events-none',
        size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
      )} />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent pr-24',
          size === 'lg' ? 'pl-12 py-4 text-base' : 'pl-10 py-2.5 text-sm'
        )}
      />
      {value && (
        <button type="button" onClick={handleClear} className="absolute right-[72px] text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      )}
      <button
        type="submit"
        className={cn(
          'absolute right-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors',
          size === 'lg' ? 'px-5 py-2.5 text-sm' : 'px-3.5 py-1.5 text-xs'
        )}
      >
        분석
      </button>
    </form>
  )
}
