'use client'

import { useEffect } from 'react'

// 사이트 전역 이모지 → 고퀄 SVG(Twemoji) 자동 교체.
//  · 렌더된 DOM의 텍스트 속 이모지를 /emoji/{codepoint}.svg <img> 로 바꾼다.
//  · React 리렌더/라우팅에도 MutationObserver 로 다시 적용.
//  · 입력창·코드·스크립트·[data-no-emoji] 등은 건드리지 않는다.
const EMOJI_RE = /(\p{Extended_Pictographic})(️)?(‍\p{Extended_Pictographic}(️)?)*/gu
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'CODE', 'PRE', 'NOSCRIPT', 'SVG', 'CANVAS', 'VIDEO'])

function fileName(e: string): string {
  return Array.from(e).map((c) => c.codePointAt(0) as number).filter((c) => c !== 0xfe0f).map((c) => c.toString(16)).join('-')
}

function skip(el: Element | null): boolean {
  let n: Element | null = el
  while (n) {
    if (SKIP_TAGS.has(n.tagName)) return true
    if ((n as HTMLElement).isContentEditable) return true
    if (n.hasAttribute('data-no-emoji')) return true
    if (n.classList && n.classList.contains('bg-emoji')) return true
    n = n.parentElement
  }
  return false
}

function makeImg(e: string): HTMLImageElement {
  const img = document.createElement('img')
  img.className = 'bg-emoji'
  img.src = '/emoji/' + fileName(e) + '.svg'
  img.alt = e
  img.setAttribute('draggable', 'false')
  img.setAttribute('aria-hidden', 'false')
  // SVG 없으면 원래 이모지 텍스트로 복구
  img.addEventListener('error', () => { img.replaceWith(document.createTextNode(e)) }, { once: true })
  return img
}

function processTextNode(node: Text) {
  const text = node.nodeValue
  if (!text) return
  EMOJI_RE.lastIndex = 0
  if (!EMOJI_RE.test(text)) return
  if (skip(node.parentElement)) return
  EMOJI_RE.lastIndex = 0
  const frag = document.createDocumentFragment()
  let last = 0
  let m: RegExpExecArray | null
  while ((m = EMOJI_RE.exec(text))) {
    const e = m[0]
    if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)))
    frag.appendChild(makeImg(e))
    last = m.index + e.length
  }
  if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)))
  node.replaceWith(frag)
}

function walk(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) { processTextNode(root as Text); return }
  if (root.nodeType !== Node.ELEMENT_NODE) return
  if (skip(root as Element)) return
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const t = n.nodeValue
      if (!t || !t.trim()) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })
  const texts: Text[] = []
  let cur = tw.nextNode()
  while (cur) { texts.push(cur as Text); cur = tw.nextNode() }
  texts.forEach(processTextNode)
}

export function EmojiParser() {
  useEffect(() => {
    let raf = 0
    const pending = new Set<Node>()
    const flush = () => {
      raf = 0
      const nodes = Array.from(pending)
      pending.clear()
      nodes.forEach((n) => { if (n.isConnected) walk(n) })
    }
    const schedule = (n: Node) => { pending.add(n); if (!raf) raf = requestAnimationFrame(flush) }

    // 최초 1회 전체 파싱
    walk(document.body)

    const obs = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'characterData') schedule(r.target)
        else r.addedNodes.forEach((n) => schedule(n))
      }
    })
    obs.observe(document.body, { childList: true, subtree: true, characterData: true })
    return () => { obs.disconnect(); if (raf) cancelAnimationFrame(raf) }
  }, [])
  return null
}
