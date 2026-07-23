'use client'

import { Fragment, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

// 이모지 문자 → 로컬 고퀄 SVG(/emoji/{codepoint}.svg) 를 인라인 <img> 로 표시.
//  · 초기 HTML 에 바로 <img> 로 나가 런타임 EmojiParser 의 깜빡임(FOUC)이 없다.
//  · class="bg-emoji" 라 EmojiParser 의 skip() 대상 → 이중 변환되지 않는다.
//  · 크기·정렬은 globals.css 의 `img.bg-emoji` 규칙(height/width 1em, vertical-align)이 담당.
//  · SVG 가 없으면(onError) 원본 이모지 텍스트로 폴백 → 깨진 이미지가 뜨지 않는다.

// 0xFE0F(변이 선택자)는 Twemoji 파일명 규칙대로 제외한다.
function fileName(e: string): string {
  return Array.from(e)
    .map((c) => c.codePointAt(0) as number)
    .filter((c) => c !== 0xfe0f)
    .map((c) => c.toString(16))
    .join('-')
}

// EmojiParser 와 동일한 이모지 매칭 규칙(ZWJ 시퀀스·변이 선택자 포함).
const EMOJI_RE = /(\p{Extended_Pictographic})(️)?(‍\p{Extended_Pictographic}(️)?)*/gu

/** 단일 이모지 하나를 인라인 SVG(<img class="bg-emoji">)로 렌더한다. SVG 없으면 원문 텍스트로 폴백. */
export function Emoji({ e, label, className }: { e: string; label?: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <>{e}</>
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/emoji/${fileName(e)}.svg`}
      alt={label ?? e}
      draggable={false}
      className={cn('bg-emoji', className)}
      onError={() => setFailed(true)}
    />
  )
}

/**
 * 문자열 안의 모든 이모지를 인라인 SVG 로 치환해 렌더한다(텍스트는 그대로).
 * 번역 사전·상태 메시지 등 이모지가 섞인 문자열을 고퀄 SVG 화할 때 사용.
 */
export function EmojiText({ children, className }: { children: string; className?: string }) {
  const text = children ?? ''
  EMOJI_RE.lastIndex = 0
  const nodes: ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  let key = 0
  while ((m = EMOJI_RE.exec(text))) {
    if (m.index > last) nodes.push(<Fragment key={key++}>{text.slice(last, m.index)}</Fragment>)
    nodes.push(<Emoji key={key++} e={m[0]} />)
    last = m.index + m[0].length
  }
  if (last < text.length) nodes.push(<Fragment key={key++}>{text.slice(last)}</Fragment>)
  if (className) return <span className={className}>{nodes}</span>
  return <>{nodes}</>
}
