'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { MessageCircle, X, Send, Headset } from 'lucide-react'
import { chatSend, chatThread, type ChatMsg } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const CONV_KEY = 'bg_chat_conv'
const SEEN_KEY = 'bg_chat_seen'

const T: Record<string, Record<string, string>> = {
  title: { ko: '고객센터', en: 'Support', ja: 'カスタマーサポート', zh: '客服中心' },
  sub: { ko: '보통 몇 분 내 답변드려요', en: 'We usually reply within minutes', ja: '通常数分で返信します', zh: '通常几分钟内回复' },
  hello: { ko: '안녕하세요! 무엇을 도와드릴까요? 편하게 메시지를 남겨주세요.', en: 'Hi! How can we help? Feel free to leave a message.', ja: 'こんにちは！ご用件をお聞かせください。お気軽にメッセージをどうぞ。', zh: '您好！有什么可以帮您？请随时留言。' },
  ph: { ko: '메시지를 입력하세요…', en: 'Type a message…', ja: 'メッセージを入力…', zh: '输入消息…' },
  open: { ko: '고객센터 채팅', en: 'Chat with support', ja: 'サポートチャット', zh: '联系客服' },
}

export function SupportChat() {
  const pathname = usePathname() || ''
  const { lang } = useI18n()
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [convId, setConvId] = useState<string>('')
  const [unseen, setUnseen] = useState(0)
  const bodyRef = useRef<HTMLDivElement>(null)
  const t = (k: string) => T[k]?.[lang] || T[k]?.ko || k

  // 관리자/대시보드/스튜디오에서는 숨김
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

  // 열려있을 때만 폴링(3s), 닫혀있으면 30s 간격으로 새 답변 확인
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
      setTimeout(() => bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' }), 50)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, msgs.length])

  async function submit(e?: React.FormEvent) {
    e?.preventDefault()
    const text = input.trim()
    if (!text) return
    setInput('')
    setMsgs((m) => [...m, { sender: 'user', text, at: new Date().toISOString() }])
    const r = await chatSend(text, convId || undefined)
    if (r.ok && r.conv_id) {
      setConvId(r.conv_id)
      try { localStorage.setItem(CONV_KEY, r.conv_id) } catch { /* */ }
    }
    setTimeout(poll, 400)
  }

  if (hidden) return null

  return (
    <div className="fixed bottom-5 right-5 z-[90] print:hidden">
      {/* 패널 */}
      {open && (
        <div className="mb-3 flex h-[min(560px,75vh)] w-[min(380px,92vw)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b1120] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]">
          {/* 헤더 */}
          <div className="relative flex items-center gap-3 border-b border-white/10 bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3.5 text-white">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15">
              <Headset size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight">{t('title')}</p>
              <p className="text-[11px] text-white/80">{t('sub')}</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="닫기" className="grid h-8 w-8 place-items-center rounded-lg text-white/80 hover:bg-white/15 hover:text-white">
              <X size={18} />
            </button>
          </div>

          {/* 메시지 */}
          <div ref={bodyRef} className="flex-1 space-y-3 overflow-y-auto bg-[#070b16] px-4 py-4">
            <div className="flex gap-2">
              <span className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-violet-500/20 text-violet-300">
                <Headset size={14} />
              </span>
              <div className="max-w-[80%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm leading-relaxed text-slate-200">
                {t('hello')}
              </div>
            </div>
            {msgs.map((m, i) => (
              <div key={i} className={cn('flex gap-2', m.sender === 'user' ? 'justify-end' : 'justify-start')}>
                {m.sender === 'admin' && (
                  <span className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-violet-500/20 text-violet-300">
                    <Headset size={14} />
                  </span>
                )}
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                    m.sender === 'user'
                      ? 'rounded-br-sm bg-violet-600 text-white'
                      : 'rounded-bl-sm border border-white/10 bg-white/[0.04] text-slate-200',
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* 입력 */}
          <form onSubmit={submit} className="flex items-center gap-2 border-t border-white/10 bg-[#0b1120] px-3 py-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('ph')}
              className="min-w-0 flex-1 rounded-xl border border-white/12 bg-white/[0.05] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-violet-400/70"
            />
            <button type="submit" disabled={!input.trim()} className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl brand-gradient text-white shadow-lg shadow-violet-500/30 transition hover:brightness-110 disabled:opacity-40">
              <Send size={17} />
            </button>
          </form>
        </div>
      )}

      {/* 플로팅 버튼 */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t('open')}
        className="group relative grid h-14 w-14 place-items-center rounded-full brand-gradient text-white shadow-[0_12px_40px_-8px_rgba(124,58,237,0.7)] transition-transform hover:scale-105"
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
        {!open && unseen > 0 && (
          <span className="absolute -right-1 -top-1 grid h-6 min-w-6 place-items-center rounded-full border-2 border-[#05070e] bg-rose-500 px-1 text-xs font-bold">
            {unseen > 9 ? '9+' : unseen}
          </span>
        )}
      </button>
    </div>
  )
}
