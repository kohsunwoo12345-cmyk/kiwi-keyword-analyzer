'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { MessageCircle, X, Send, Headset, Check } from 'lucide-react'
import { chatSend, chatThread, type ChatMsg } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const CONV_KEY = 'bg_chat_conv'
const SEEN_KEY = 'bg_chat_seen'

type L = Record<string, string>
const T: Record<string, L> = {
  title: { ko: 'BYGENCY 고객센터', en: 'BYGENCY Support', ja: 'BYGENCYサポート', zh: 'BYGENCY 客服' },
  online: { ko: '온라인 · 보통 몇 분 내 답변', en: 'Online · usually replies in minutes', ja: 'オンライン · 通常数分で返信', zh: '在线 · 通常几分钟内回复' },
  hello: { ko: '안녕하세요! 👋 BYGENCY 고객센터입니다. 무엇을 도와드릴까요?', en: 'Hi there! 👋 This is BYGENCY Support. How can we help?', ja: 'こんにちは！👋 BYGENCYサポートです。ご用件をお聞かせください。', zh: '您好！👋 这里是 BYGENCY 客服，有什么可以帮您？' },
  ph: { ko: '메시지를 입력하세요…', en: 'Type a message…', ja: 'メッセージを入力…', zh: '输入消息…' },
  open: { ko: '고객센터 채팅', en: 'Chat with support', ja: 'サポートチャット', zh: '联系客服' },
  today: { ko: '오늘', en: 'Today', ja: '今日', zh: '今天' },
  sent: { ko: '전송됨', en: 'Sent', ja: '送信済み', zh: '已发送' },
  agent: { ko: '상담원', en: 'Agent', ja: '担当者', zh: '客服' },
  q1: { ko: '요금이 궁금해요', en: 'Pricing question', ja: '料金について', zh: '价格咨询' },
  q2: { ko: '기능 문의', en: 'Feature question', ja: '機能について', zh: '功能咨询' },
  q3: { ko: '도입 상담', en: 'Talk to sales', ja: '導入相談', zh: '采购咨询' },
}

function hhmm(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(+d)) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}`
}

export function SupportChat() {
  const pathname = usePathname() || ''
  const { lang } = useI18n()
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [convId, setConvId] = useState<string>('')
  const [unseen, setUnseen] = useState(0)
  const [sending, setSending] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)
  const t = (k: string) => T[k]?.[lang] || T[k]?.ko || k

  const hidden = /^\/(adminsunkoh028741_11263|dashboard_USE17237_612|studio-nvc-prv)/.test(pathname)

  useEffect(() => {
    try { setConvId(localStorage.getItem(CONV_KEY) || '') } catch { /* */ }
  }, [])

  async function poll() {
    const r = await chatThread(convId || undefined)
    if (r.ok && r.messages) {
      setMsgs(r.messages)
      if (r.conv_id && r.conv_id !== convId) {
        setConvId(r.conv_id)
        try { localStorage.setItem(CONV_KEY, r.conv_id) } catch { /* */ }
      }
      const adminCount = r.messages.filter((m) => m.sender === 'admin').length
      let seen = 0
      try { seen = Number(localStorage.getItem(SEEN_KEY) || 0) } catch { /* */ }
      if (!open) setUnseen(Math.max(0, adminCount - seen))
    }
  }

  useEffect(() => {
    if (hidden) return
    poll()
    const iv = setInterval(poll, open ? 3500 : 30000)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, convId, hidden])

  useEffect(() => {
    if (open) {
      setUnseen(0)
      const adminCount = msgs.filter((m) => m.sender === 'admin').length
      try { localStorage.setItem(SEEN_KEY, String(adminCount)) } catch { /* */ }
      setTimeout(() => bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' }), 60)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, msgs.length])

  async function sendText(text: string) {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setInput('')
    setSending(true)
    setMsgs((m) => [...m, { sender: 'user', text: trimmed, at: new Date().toISOString() }])
    const r = await chatSend(trimmed, convId || undefined)
    if (r.ok && r.conv_id) {
      setConvId(r.conv_id)
      try { localStorage.setItem(CONV_KEY, r.conv_id) } catch { /* */ }
    }
    setSending(false)
    setTimeout(poll, 400)
  }

  if (hidden) return null

  const showQuick = msgs.filter((m) => m.sender === 'user').length === 0
  const lastUserIdx = (() => { let idx = -1; msgs.forEach((m, i) => { if (m.sender === 'user') idx = i }); return idx })()

  return (
    <div className="fixed bottom-5 right-5 z-[95] print:hidden">
      {/* 패널 */}
      {open && (
        <div className="animate-chat-pop mb-3 flex h-[min(600px,78vh)] w-[min(392px,92vw)] flex-col overflow-hidden rounded-[22px] border border-white/10 bg-[#0a0f1c] shadow-[0_40px_100px_-24px_rgba(0,0,0,0.8)] ring-1 ring-black/5">
          {/* 헤더 */}
          <div className="relative overflow-hidden px-5 pb-4 pt-4 text-white">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-600 to-sky-600" />
            <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
            <div className="relative flex items-center gap-3">
              <span className="relative grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-white/15 ring-1 ring-white/25 backdrop-blur">
                <Headset size={20} />
                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-blue-600 bg-emerald-400" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold leading-tight">{t('title')}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/85">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  {t('online')}
                </p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="닫기" className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg text-white/85 transition hover:bg-white/15 hover:text-white">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* 메시지 */}
          <div ref={bodyRef} className="flex-1 space-y-1 overflow-y-auto bg-gradient-to-b from-[#070b16] to-[#0a0f1c] px-4 py-4">
            <p className="mb-3 text-center">
              <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-slate-400">{t('today')}</span>
            </p>

            {/* 인사 */}
            <div className="flex items-end gap-2">
              <span className="mb-4 grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-sky-500 text-white">
                <Headset size={13} />
              </span>
              <div>
                <div className="max-w-[248px] rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.05] px-3.5 py-2.5 text-[13.5px] leading-relaxed text-slate-100">
                  {t('hello')}
                </div>
                <span className="ml-1 mt-1 block text-[10px] text-slate-500">{t('agent')}</span>
              </div>
            </div>

            {msgs.map((m, i) => {
              const mine = m.sender === 'user'
              const prev = msgs[i - 1]
              const showAvatar = !mine && (!prev || prev.sender !== 'admin')
              return (
                <div key={i} className={cn('animate-bubble-in flex items-end gap-2 pt-2', mine ? 'justify-end' : 'justify-start')}>
                  {!mine && (
                    showAvatar ? (
                      <span className="mb-4 grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-sky-500 text-white">
                        <Headset size={13} />
                      </span>
                    ) : (
                      <span className="w-7 flex-shrink-0" />
                    )
                  )}
                  <div className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
                    <div
                      className={cn(
                        'max-w-[250px] px-3.5 py-2.5 text-[13.5px] leading-relaxed shadow-sm',
                        mine
                          ? 'rounded-2xl rounded-br-md bg-gradient-to-br from-blue-500 to-sky-500 text-white'
                          : 'rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.05] text-slate-100',
                      )}
                    >
                      {m.text}
                    </div>
                    <span className={cn('mt-1 flex items-center gap-1 px-1 text-[10px] text-slate-500', mine ? 'flex-row-reverse' : '')}>
                      {hhmm(m.at)}
                      {mine && i === lastUserIdx && <Check size={11} className="text-blue-400" />}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 빠른 질문 */}
          {showQuick && (
            <div className="flex flex-wrap gap-2 border-t border-white/5 bg-[#0a0f1c] px-4 pt-3">
              {['q1', 'q2', 'q3'].map((k) => (
                <button
                  key={k}
                  onClick={() => sendText(t(k))}
                  className="rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-200 transition hover:bg-blue-500/20"
                >
                  {t(k)}
                </button>
              ))}
            </div>
          )}

          {/* 입력 */}
          <form
            onSubmit={(e) => { e.preventDefault(); sendText(input) }}
            className="flex items-center gap-2 border-t border-white/10 bg-[#0a0f1c] px-3 py-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('ph')}
              className="min-w-0 flex-1 rounded-full border border-white/12 bg-white/[0.05] px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-blue-400/70 focus:bg-white/[0.08]"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-sky-500 text-white shadow-lg shadow-blue-500/30 transition hover:brightness-110 active:scale-95 disabled:opacity-40"
            >
              <Send size={17} className="translate-x-[1px]" />
            </button>
          </form>
        </div>
      )}

      {/* 플로팅 버튼 */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t('open')}
        className={cn(
          'group relative grid h-14 w-14 place-items-center rounded-full text-white shadow-[0_14px_44px_-8px_rgba(37,99,235,0.75)] transition-transform hover:scale-105 active:scale-95',
          'bg-gradient-to-br from-blue-500 via-blue-600 to-sky-600',
        )}
      >
        {!open && unseen > 0 && (
          <span className="absolute inset-0 animate-ping-ring rounded-full bg-blue-400/60" />
        )}
        <span className="relative transition-transform duration-300">
          {open ? <X size={24} /> : <MessageCircle size={24} />}
        </span>
        {!open && unseen > 0 && (
          <span className="absolute -right-1 -top-1 grid h-6 min-w-6 place-items-center rounded-full border-2 border-[#05070e] bg-rose-500 px-1 text-xs font-bold">
            {unseen > 9 ? '9+' : unseen}
          </span>
        )}
      </button>
    </div>
  )
}
