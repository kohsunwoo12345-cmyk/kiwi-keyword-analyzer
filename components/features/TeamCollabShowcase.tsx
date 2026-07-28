'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  KanbanSquare,
  Bot,
  Sparkles,
  Send,
  MessageCircle,
  AtSign,
  CheckCircle2,
  Paperclip,
  UserPlus,
  Activity,
  Clock,
  Copy,
} from 'lucide-react'
import { Reveal } from '@/components/motion'
import { SectionTag } from '@/components/ui'
import { useT, type Dict } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { Feature } from '@/lib/features'

/* ───────────────── i18n ───────────────── */
const M: Dict = {
  /* kanban */
  '라이브 협업 보드': { en: 'Live collaboration board', ja: 'ライブ協業ボード', zh: '实时协作看板' },
  '카드 한 곳에 모이면 놓치는 일이 없습니다': { en: 'Gather it into cards and nothing slips through', ja: 'カード一か所に集まれば取りこぼしがなくなります', zh: '汇成一处卡片，就不会再漏掉事情' },
  '메신저와 메모장에 흩어진 업무를 보드 하나로 모읍니다. 담당자와 마감이 붙은 카드가 단계별로 흘러가는 걸 팀 전체가 같이 봅니다.': {
    en: 'Pull work scattered across messengers and notepads into one board. The whole team watches cards — with owners and deadlines attached — flow from stage to stage.',
    ja: 'メッセンジャーやメモ帳に散らばった業務をボード一つにまとめます。担当者と締め切りが付いたカードが段階ごとに流れるのをチーム全体で見守ります。',
    zh: '把散落在聊天工具和便签里的工作汇到一块看板。带着负责人和截止日的卡片一段段往前流转，整个团队一起看得见。',
  },
  '대기': { en: 'Backlog', ja: '待機', zh: '待办' },
  '진행 중': { en: 'In progress', ja: '進行中', zh: '进行中' },
  '검수': { en: 'Review', ja: 'レビュー', zh: '待审' },
  '완료': { en: 'Done', ja: '完了', zh: '完成' },
  '인스타 릴스 3편 기획': { en: 'Plan 3 Instagram Reels', ja: 'インスタリール3本の企画', zh: '策划 3 支 Instagram Reels' },
  '9월 신제품 상세페이지': { en: 'September product detail page', ja: '9月新製品の詳細ページ', zh: '9 月新品详情页' },
  '리타겟팅 소재 A/B': { en: 'Retargeting creative A/B', ja: 'リターゲティング素材のA/B', zh: '再营销素材 A/B' },
  '고객 후기 영상 편집': { en: 'Edit customer review video', ja: '顧客レビュー動画の編集', zh: '剪辑客户评价视频' },
  '뉴스레터 9월호 발송': { en: 'Send September newsletter', ja: 'ニュースレター9月号の配信', zh: '发送 9 月刊通讯' },
  '블로그 상위노출 점검': { en: 'Check blog rankings', ja: 'ブログ上位表示のチェック', zh: '检查博客排名' },
  '콘텐츠': { en: 'Content', ja: 'コンテンツ', zh: '内容' },
  '디자인': { en: 'Design', ja: 'デザイン', zh: '设计' },
  '광고': { en: 'Ads', ja: '広告', zh: '广告' },
  '영상': { en: 'Video', ja: '動画', zh: '视频' },
  'CRM': { en: 'CRM', ja: 'CRM', zh: 'CRM' },
  'SEO': { en: 'SEO', ja: 'SEO', zh: 'SEO' },
  '오늘 마감': { en: 'Due today', ja: '今日締切', zh: '今天到期' },
  '내일 마감': { en: 'Due tomorrow', ja: '明日締切', zh: '明天到期' },
  '이번 주': { en: 'This week', ja: '今週', zh: '本周' },
  '개 카드': { en: ' cards', ja: '枚', zh: ' 张' },
  '규칙에 따라 담당자와 마감이 자동 배정됩니다': { en: 'Owners and deadlines are assigned automatically by rules', ja: 'ルールに従って担当者と締め切りが自動で割り当てられます', zh: '按规则自动分配负责人与截止日' },

  /* ai chat */
  'AI 마케팅 어시스턴트': { en: 'AI marketing assistant', ja: 'AIマーケティングアシスタント', zh: 'AI 营销助手' },
  '막히는 순간, 옆자리에 전문가가 앉아 있습니다': { en: 'The moment you stall, an expert is sitting right next to you', ja: '詰まった瞬間、隣に専門家が座っています', zh: '卡住的那一刻，专家就坐在你旁边' },
  '카피 한 줄, 기획 초안, 예산 배분까지 물어보면 바로 답이 나옵니다. 결과는 그대로 카드로 옮겨 팀에 공유하세요.': {
    en: 'Ask about a line of copy, a first draft, or budget allocation and the answer comes right back. Move the result straight onto a card and share it with the team.',
    ja: 'コピー一行、企画の下書き、予算配分まで聞けばすぐ答えが返ります。結果はそのままカードに移してチームに共有しましょう。',
    zh: '文案一句、企划初稿、预算分配，问了就有答案。结果可以直接搬到卡片上分享给团队。',
  },
  '신제품 앰플 광고 카피 3개만 뽑아줘': { en: 'Give me 3 ad copy lines for the new ampoule', ja: '新作アンプルの広告コピーを3つ出して', zh: '给我 3 条新品安瓶的广告文案' },
  '릴스 조회수가 안 나와요. 뭘 고쳐야 할까요?': { en: 'My Reels aren’t getting views. What should I fix?', ja: 'リールの再生数が伸びません。何を直すべき？', zh: 'Reels 播放量上不去，该改什么？' },
  '후킹 강도를 기준으로 세 가지 결을 다르게 뽑았습니다. 카드로 옮겨 팀 검수까지 바로 넘길 수 있어요.': {
    en: 'I wrote three variations with different hook intensities. You can move them to a card and send them straight to team review.',
    ja: 'フックの強さを基準に3つの異なるトーンで書きました。カードに移してチームレビューまですぐ回せます。',
    zh: '按钩子强度写了三种不同调性。可以搬到卡片上，直接送去团队审核。',
  },
  '첫 2초가 전부입니다. 훅 문장을 앞으로 당기고, 3초 컷 편집과 자막을 붙이면 평균 시청 지속률이 올라갑니다.': {
    en: 'The first 2 seconds are everything. Pull the hook line forward, add 3-second cuts and captions, and average retention goes up.',
    ja: '最初の2秒がすべてです。フック文を前に出し、3秒カット編集と字幕を付ければ平均視聴維持率が上がります。',
    zh: '前 2 秒决定一切。把钩子句提前，加上 3 秒快剪和字幕，平均观看留存就会上来。',
  },
  '3주 만에 결이 달라진 피부, 직접 확인하세요': { en: 'Skin that changed in 3 weeks — see for yourself', ja: '3週間で変わった肌、ご自身で確かめて', zh: '三周就不一样的肌肤，自己来看' },
  '바르고 자면 끝. 아침이 증명합니다': { en: 'Apply and sleep. The morning proves it', ja: '塗って寝るだけ。朝が証明します', zh: '涂了就睡，早晨会证明' },
  '앰플 하나 바꿨을 뿐인데': { en: 'All I changed was one ampoule', ja: 'アンプルを一つ変えただけなのに', zh: '只是换了一支安瓶而已' },
  '카드로 옮기기': { en: 'Move to card', ja: 'カードに移す', zh: '搬到卡片' },
  '메시지를 입력하세요...': { en: 'Type a message...', ja: 'メッセージを入力...', zh: '输入消息...' },
  '광고 카피 추천': { en: 'Ad copy ideas', ja: '広告コピー提案', zh: '广告文案推荐' },
  '릴스 전략': { en: 'Reels strategy', ja: 'リール戦略', zh: 'Reels 策略' },
  '예산 배분': { en: 'Budget split', ja: '予算配分', zh: '预算分配' },
  '24시간 대기 중': { en: 'On call 24/7', ja: '24時間待機中', zh: '7×24 待命' },

  /* activity */
  '실시간 활동': { en: 'Live activity', ja: 'リアルタイム活動', zh: '实时动态' },
  '회의를 잡지 않아도 맥락이 남습니다': { en: 'Context stays, without scheduling a meeting', ja: '会議を設けなくても文脈が残ります', zh: '不用开会，上下文也留得住' },
  '코멘트와 멘션이 카드에 그대로 쌓여, 누가 무엇을 언제 했는지 따로 물어볼 필요가 없습니다.': {
    en: 'Comments and mentions pile up right on the card, so nobody has to ask who did what and when.',
    ja: 'コメントとメンションがカードにそのまま積み上がるので、誰が何をいつやったのかを聞き直す必要がありません。',
    zh: '评论与@直接堆在卡片上，谁在什么时候做了什么，不用再去问。',
  },
  '님이': { en: ' ', ja: 'さんが', zh: ' ' },
  '방금': { en: 'just now', ja: 'たった今', zh: '刚刚' },
  '분 전': { en: 'm ago', ja: '分前', zh: '分钟前' },
  '온라인': { en: 'online', ja: 'オンライン', zh: '在线' },
  '김민수': { en: 'Minsu Kim', ja: 'キム・ミンス', zh: '金民秀' },
  '이서연': { en: 'Seoyeon Lee', ja: 'イ・ソヨン', zh: '李书妍' },
  '박지훈': { en: 'Jihoon Park', ja: 'パク・ジフン', zh: '朴智勋' },
  '최유나': { en: 'Yuna Choi', ja: 'チェ・ユナ', zh: '崔有娜' },
  '정하늘': { en: 'Haneul Jung', ja: 'チョン・ハヌル', zh: '郑天' },
  '명 접속 중': { en: ' online now', ja: '名が接続中', zh: ' 人在线' },
  '릴스 기획 카드에 코멘트를 남겼습니다': { en: 'commented on the Reels planning card', ja: 'リール企画カードにコメントしました', zh: '在 Reels 策划卡片上留言了' },
  '상세페이지 시안 2종을 올렸습니다': { en: 'uploaded 2 detail-page drafts', ja: '詳細ページの案を2種アップしました', zh: '上传了 2 版详情页初稿' },
  '검수 단계로 카드를 옮겼습니다': { en: 'moved a card to Review', ja: 'カードをレビューに移しました', zh: '把卡片移到了待审' },
  '회원님을 멘션했습니다': { en: 'mentioned you', ja: 'あなたをメンションしました', zh: '@了你' },
  '새 팀원을 초대했습니다': { en: 'invited a new teammate', ja: '新しいメンバーを招待しました', zh: '邀请了新成员' },
  '뉴스레터 발송을 완료했습니다': { en: 'finished sending the newsletter', ja: 'ニュースレターの配信を完了しました', zh: '完成了通讯发送' },
}

function useInView<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return { ref, inView }
}

/* ───────────────── 팀 아바타 ───────────────── */
const PEOPLE = [
  { id: 'kim', initial: '김', color: '#0ea5e9' },
  { id: 'lee', initial: '이', color: '#a855f7' },
  { id: 'park', initial: '박', color: '#f59e0b' },
  { id: 'choi', initial: '최', color: '#10b981' },
  { id: 'jung', initial: '정', color: '#f43f5e' },
]
const NAMES: Record<string, string> = { kim: '김민수', lee: '이서연', park: '박지훈', choi: '최유나', jung: '정하늘' }

function Avatar({ id, size = 24 }: { id: string; size?: number }) {
  const p = PEOPLE.find((x) => x.id === id) ?? PEOPLE[0]
  return (
    <span
      className="grid flex-shrink-0 place-items-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `linear-gradient(135deg, ${p.color}, ${p.color}aa)`,
        boxShadow: `0 4px 12px -6px ${p.color}`,
      }}
    >
      {p.initial}
    </span>
  )
}

/* ───────────────── 1. 라이브 칸반 보드 ───────────────── */
const COLUMNS = ['대기', '진행 중', '검수', '완료']
const CARD_H = 92

type BoardCard = { id: string; title: string; tag: string; tagColor: string; who: string; due: string }
const CARDS: BoardCard[] = [
  { id: 'c1', title: '인스타 릴스 3편 기획', tag: '콘텐츠', tagColor: '#0ea5e9', who: 'kim', due: '오늘 마감' },
  { id: 'c2', title: '9월 신제품 상세페이지', tag: '디자인', tagColor: '#a855f7', who: 'lee', due: '내일 마감' },
  { id: 'c3', title: '리타겟팅 소재 A/B', tag: '광고', tagColor: '#f59e0b', who: 'park', due: '이번 주' },
  { id: 'c4', title: '고객 후기 영상 편집', tag: '영상', tagColor: '#f43f5e', who: 'choi', due: '이번 주' },
  { id: 'c5', title: '뉴스레터 9월호 발송', tag: 'CRM', tagColor: '#10b981', who: 'jung', due: '내일 마감' },
  { id: 'c6', title: '블로그 상위노출 점검', tag: 'SEO', tagColor: '#22d3ee', who: 'kim', due: '이번 주' },
]
const INITIAL_COLS: Record<string, number> = { c1: 0, c2: 1, c3: 1, c4: 2, c5: 3, c6: 0 }

function LiveBoard({ feature }: { feature: Feature }) {
  const t = useT(M)
  const { ref, inView } = useInView<HTMLDivElement>(0.2)
  const [cols, setCols] = useState<Record<string, number>>(INITIAL_COLS)
  const [moving, setMoving] = useState<string | null>(null)
  const tick = useRef(0)

  useEffect(() => {
    if (!inView) return
    const id = setInterval(() => {
      const card = CARDS[tick.current % CARDS.length]
      tick.current += 1
      setMoving(card.id)
      setCols((c) => ({ ...c, [card.id]: (c[card.id] + 1) % COLUMNS.length }))
      setTimeout(() => setMoving(null), 900)
    }, 2000)
    return () => clearInterval(id)
  }, [inView])

  // 컬럼별 슬롯 배치
  const placed = useMemo(() => {
    const slots: Record<number, number> = {}
    return CARDS.map((c) => {
      const col = cols[c.id]
      const slot = slots[col] ?? 0
      slots[col] = slot + 1
      return { ...c, col, slot }
    })
  }, [cols])

  const counts = COLUMNS.map((_, i) => placed.filter((c) => c.col === i).length)
  const maxSlot = Math.max(...counts, 1)

  return (
    <section className="relative overflow-hidden py-20">
      <div
        className="animate-drift pointer-events-none absolute left-1/2 top-4 h-[340px] w-[820px] -translate-x-1/2 rounded-full blur-[140px]"
        style={{ background: `${feature.accent}1f` }}
      />
      <div ref={ref} className="relative mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionTag>{t('라이브 협업 보드')}</SectionTag>
          <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">{t('카드 한 곳에 모이면 놓치는 일이 없습니다')}</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-soft)]">
            {t('메신저와 메모장에 흩어진 업무를 보드 하나로 모읍니다. 담당자와 마감이 붙은 카드가 단계별로 흘러가는 걸 팀 전체가 같이 봅니다.')}
          </p>
        </Reveal>

        <Reveal variant="scale" className="mt-12">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d16] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)]">
            {/* 헤더 */}
            <div className="flex items-center gap-3 border-b border-white/[0.08] bg-white/[0.02] px-4 py-3">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                <KanbanSquare size={12} /> {CARDS.length}
                {t('개 카드')}
              </span>
              <span className="ml-auto flex -space-x-2">
                {PEOPLE.map((p) => (
                  <span key={p.id} className="rounded-full ring-2 ring-[#0b0d16]">
                    <Avatar id={p.id} size={24} />
                  </span>
                ))}
              </span>
            </div>

            {/* 보드 — 좁은 화면에서는 가로 스크롤 */}
            <div className="overflow-x-auto no-scrollbar">
              <div className="min-w-[660px] p-4">
                {/* 컬럼 헤더 */}
                <div className="mb-3 grid grid-cols-4 gap-3">
                  {COLUMNS.map((c, i) => (
                    <div key={c} className="flex items-center gap-2 px-1">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: i === 3 ? '#10b981' : i === 2 ? '#f59e0b' : feature.accent }}
                      />
                      <span className="text-[12px] font-semibold text-[var(--text-soft)]">{t(c)}</span>
                      <span className="ml-auto rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[var(--text-dim)]">
                        {counts[i]}
                      </span>
                    </div>
                  ))}
                </div>

                {/* 컬럼 배경 + 카드 */}
                <div className="relative" style={{ height: Math.max(2, maxSlot) * CARD_H + 12 }}>
                  <div className="absolute inset-0 grid grid-cols-4 gap-3">
                    {COLUMNS.map((c) => (
                      <div key={c} className="rounded-2xl border border-dashed border-white/[0.07] bg-white/[0.015]" />
                    ))}
                  </div>

                  {placed.map((c) => (
                    <div
                      key={c.id}
                      className={cn(
                        'absolute rounded-2xl border bg-[#121522] p-3 transition-all duration-[850ms]',
                        moving === c.id ? 'z-10 border-white/25' : 'border-white/[0.09]',
                      )}
                      style={{
                        width: 'calc(25% - 9px)',
                        left: `calc(${c.col * 25}% + ${c.col * 3}px)`,
                        top: c.slot * CARD_H + 6,
                        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                        transform: moving === c.id ? 'scale(1.03) rotate(-0.6deg)' : 'none',
                        boxShadow: moving === c.id ? `0 20px 44px -20px ${feature.accent}` : '0 10px 26px -22px rgba(0,0,0,0.9)',
                      }}
                    >
                      <span
                        className="inline-flex rounded-md px-1.5 py-0.5 text-[9.5px] font-bold"
                        style={{ background: `${c.tagColor}22`, color: c.tagColor }}
                      >
                        {t(c.tag)}
                      </span>
                      <p className="mt-1.5 line-clamp-2 text-[12.5px] font-semibold leading-snug text-[var(--text)]">{t(c.title)}</p>
                      <div className="mt-2.5 flex items-center gap-1.5">
                        <Avatar id={c.who} size={20} />
                        <span className="truncate text-[10px] text-[var(--text-dim)]">{t(NAMES[c.who])}</span>
                        <span
                          className="ml-auto inline-flex flex-shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-semibold"
                          style={{
                            background: c.due === '오늘 마감' ? '#ef444422' : 'rgba(255,255,255,0.05)',
                            color: c.due === '오늘 마감' ? '#f87171' : 'var(--text-dim)',
                          }}
                        >
                          <Clock size={8} /> {t(c.due)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 border-t border-white/[0.07] px-4 py-3 text-[11.5px] text-[var(--text-dim)]">
              <Sparkles size={12} style={{ color: feature.accent }} />
              {t('규칙에 따라 담당자와 마감이 자동 배정됩니다')}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ───────────────── 2. AI 어시스턴트 채팅 ───────────────── */
type Turn = { q: string; a: string; copies?: string[] }
const TURNS: Turn[] = [
  {
    q: '신제품 앰플 광고 카피 3개만 뽑아줘',
    a: '후킹 강도를 기준으로 세 가지 결을 다르게 뽑았습니다. 카드로 옮겨 팀 검수까지 바로 넘길 수 있어요.',
    copies: ['3주 만에 결이 달라진 피부, 직접 확인하세요', '바르고 자면 끝. 아침이 증명합니다', '앰플 하나 바꿨을 뿐인데'],
  },
  {
    q: '릴스 조회수가 안 나와요. 뭘 고쳐야 할까요?',
    a: '첫 2초가 전부입니다. 훅 문장을 앞으로 당기고, 3초 컷 편집과 자막을 붙이면 평균 시청 지속률이 올라갑니다.',
  },
]

type Phase = 'typing-q' | 'thinking' | 'typing-a' | 'hold'

function AiAssistant({ feature }: { feature: Feature }) {
  const t = useT(M)
  const { ref, inView } = useInView<HTMLDivElement>(0.25)
  const [turn, setTurn] = useState(0)
  const [phase, setPhase] = useState<Phase>('typing-q')
  const [qLen, setQLen] = useState(0)
  const [aLen, setALen] = useState(0)
  const scroller = useRef<HTMLDivElement>(null)

  const q = t(TURNS[turn].q)
  const a = t(TURNS[turn].a)

  // 단계별 타이핑 시퀀스
  useEffect(() => {
    if (!inView) return
    let id: ReturnType<typeof setTimeout>

    if (phase === 'typing-q') {
      if (qLen < q.length) id = setTimeout(() => setQLen((v) => v + 1), 45)
      else id = setTimeout(() => setPhase('thinking'), 420)
    } else if (phase === 'thinking') {
      id = setTimeout(() => setPhase('typing-a'), 1100)
    } else if (phase === 'typing-a') {
      if (aLen < a.length) id = setTimeout(() => setALen((v) => v + 1), 22)
      else id = setTimeout(() => setPhase('hold'), 300)
    } else {
      id = setTimeout(() => {
        setTurn((v) => (v + 1) % TURNS.length)
        setQLen(0)
        setALen(0)
        setPhase('typing-q')
      }, 3600)
    }
    return () => clearTimeout(id)
  }, [phase, qLen, aLen, q, a, inView])

  // 새 줄이 생길 때마다 아래로 따라간다
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [qLen, aLen, phase])

  const showCopies = phase === 'hold' && !!TURNS[turn].copies

  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-white/[0.015] py-20">
      <div
        className="animate-drift-slow pointer-events-none absolute right-0 top-8 h-[340px] w-[520px] rounded-full blur-[140px]"
        style={{ background: `${feature.accent}22` }}
      />
      <div ref={ref} className="relative mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionTag>{t('AI 마케팅 어시스턴트')}</SectionTag>
          <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">{t('막히는 순간, 옆자리에 전문가가 앉아 있습니다')}</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-soft)]">
            {t('카피 한 줄, 기획 초안, 예산 배분까지 물어보면 바로 답이 나옵니다. 결과는 그대로 카드로 옮겨 팀에 공유하세요.')}
          </p>
        </Reveal>

        <Reveal variant="scale" className="mx-auto mt-12 max-w-2xl">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d16] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)]">
            {/* 헤더 */}
            <div className="flex items-center gap-3 border-b border-white/[0.08] bg-white/[0.02] px-4 py-3">
              <span className="relative grid h-9 w-9 place-items-center rounded-xl" style={{ background: `${feature.accent}1f`, color: feature.accent }}>
                <Bot size={17} />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0b0d16]" />
              </span>
              <div>
                <p className="text-[13px] font-semibold text-[var(--text)]">BYGENCY AI</p>
                <p className="text-[10.5px] text-[var(--text-dim)]">{t('24시간 대기 중')}</p>
              </div>
            </div>

            {/* 대화 */}
            <div ref={scroller} className="no-scrollbar h-[330px] overflow-y-auto px-4 py-4">
              <div className="flex min-h-full flex-col justify-end space-y-3">
              {/* 사용자 */}
              <div className="flex justify-end">
                <span className="max-w-[82%] rounded-2xl rounded-br-md px-3.5 py-2.5 text-[13px] leading-relaxed text-white" style={{ background: feature.accent }}>
                  {q.slice(0, qLen)}
                  {phase === 'typing-q' && <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-white/80" style={{ animation: 'pulse 1s steps(2) infinite' }} />}
                </span>
              </div>

              {/* AI */}
              {phase !== 'typing-q' && (
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg" style={{ background: `${feature.accent}1f`, color: feature.accent }}>
                    <Bot size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    {phase === 'thinking' ? (
                      <span className="inline-flex items-center gap-1 rounded-2xl rounded-tl-md bg-white/[0.06] px-3.5 py-3">
                        {[0, 1, 2].map((i) => (
                          <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-[var(--text-dim)]" style={{ animationDelay: `${i * 0.16}s` }} />
                        ))}
                      </span>
                    ) : (
                      <span className="block max-w-[92%] rounded-2xl rounded-tl-md bg-white/[0.06] px-3.5 py-2.5 text-[13px] leading-relaxed text-[var(--text-soft)]">
                        {a.slice(0, aLen)}
                        {phase === 'typing-a' && (
                          <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5" style={{ background: feature.accent, animation: 'pulse 1s steps(2) infinite' }} />
                        )}
                      </span>
                    )}

                    {/* 결과 카드 */}
                    {showCopies && (
                      <div className="animate-fade-up mt-2.5 space-y-2">
                        {TURNS[turn].copies!.map((c, i) => (
                          <div
                            key={c}
                            className="flex items-center gap-2.5 rounded-xl border border-white/[0.09] bg-white/[0.03] px-3 py-2.5"
                            style={{ animation: `fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 110}ms both` }}
                          >
                            <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-md text-[10px] font-bold" style={{ background: `${feature.accent}22`, color: feature.accent }}>
                              {i + 1}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--text)]">{t(c)}</span>
                            <Copy size={12} className="flex-shrink-0 text-[var(--text-dim)]" />
                          </div>
                        ))}
                        <button
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-semibold transition-transform duration-300 hover:scale-[1.03]"
                          style={{ background: `${feature.accent}1f`, color: feature.accent }}
                        >
                          <KanbanSquare size={12} /> {t('카드로 옮기기')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              </div>
            </div>

            {/* 입력창 */}
            <div className="border-t border-white/[0.08] bg-white/[0.02] px-4 py-3">
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {['광고 카피 추천', '릴스 전략', '예산 배분'].map((c) => (
                  <span key={c} className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-[var(--text-dim)]">
                    {t(c)}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.03] px-3 py-2.5">
                <span className="flex-1 truncate text-[12.5px] text-[var(--text-dim)]">{t('메시지를 입력하세요...')}</span>
                <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: feature.accent }}>
                  <Send size={13} className="text-white" />
                </span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ───────────────── 3. 실시간 활동 피드 ───────────────── */
type Act = { who: string; text: string; icon: typeof MessageCircle; color: string; mention?: boolean }
const ACTS: Act[] = [
  { who: 'kim', text: '릴스 기획 카드에 코멘트를 남겼습니다', icon: MessageCircle, color: '#0ea5e9' },
  { who: 'lee', text: '상세페이지 시안 2종을 올렸습니다', icon: Paperclip, color: '#a855f7' },
  { who: 'park', text: '검수 단계로 카드를 옮겼습니다', icon: KanbanSquare, color: '#f59e0b' },
  { who: 'choi', text: '회원님을 멘션했습니다', icon: AtSign, color: '#f43f5e', mention: true },
  { who: 'jung', text: '뉴스레터 발송을 완료했습니다', icon: CheckCircle2, color: '#10b981' },
  { who: 'kim', text: '새 팀원을 초대했습니다', icon: UserPlus, color: '#22d3ee' },
]

function ActivityFeed({ feature }: { feature: Feature }) {
  const t = useT(M)
  const { ref, inView } = useInView<HTMLDivElement>(0.25)
  const [items, setItems] = useState<{ key: number; act: Act; age: number }[]>(() =>
    // 앞으로 들어올 항목(0번부터)과 겹치지 않도록 뒤쪽 활동으로 초기 목록을 채운다
    [5, 4, 3, 2].map((n, i) => ({ key: -i - 1, act: ACTS[n], age: i + 1 })),
  )
  const next = useRef(0)

  useEffect(() => {
    if (!inView) return
    const id = setInterval(() => {
      const act = ACTS[next.current % ACTS.length]
      const key = next.current
      next.current += 1
      setItems((list) => [{ key, act, age: 0 }, ...list.map((x) => ({ ...x, age: x.age + 1 }))].slice(0, 5))
    }, 2400)
    return () => clearInterval(id)
  }, [inView])

  return (
    <section className="relative overflow-hidden py-20">
      <div
        className="animate-drift pointer-events-none absolute left-1/2 top-0 h-[300px] w-[720px] -translate-x-1/2 rounded-full blur-[140px]"
        style={{ background: `${feature.accent}1a` }}
      />
      <div ref={ref} className="relative mx-auto max-w-5xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionTag>{t('실시간 활동')}</SectionTag>
          <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl">{t('회의를 잡지 않아도 맥락이 남습니다')}</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--text-soft)]">
            {t('코멘트와 멘션이 카드에 그대로 쌓여, 누가 무엇을 언제 했는지 따로 물어볼 필요가 없습니다.')}
          </p>
        </Reveal>

        <Reveal variant="scale" className="mx-auto mt-12 max-w-2xl">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d16] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)]">
            {/* 접속 중인 팀원 */}
            <div className="flex items-center gap-3 border-b border-white/[0.08] bg-white/[0.02] px-4 py-3">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
                <Activity size={12} /> {t('실시간 활동')}
              </span>
              <span className="ml-auto flex items-center gap-2">
                <span className="flex -space-x-2">
                  {PEOPLE.slice(0, 4).map((p) => (
                    <span key={p.id} className="relative rounded-full ring-2 ring-[#0b0d16]">
                      <Avatar id={p.id} size={22} />
                      <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[#0b0d16]" />
                    </span>
                  ))}
                </span>
                <span className="text-[11px] text-[var(--text-dim)]">
                  4{t('명 접속 중')}
                </span>
              </span>
            </div>

            {/* 피드 */}
            <div className="relative h-[300px] overflow-hidden px-4 py-3">
              <div className="space-y-2">
                {items.map((it) => {
                  const Icon = it.act.icon
                  const fresh = it.age === 0
                  return (
                    <div
                      key={it.key}
                      className={cn(
                        'flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition-all duration-700',
                        fresh ? 'border-white/20 bg-white/[0.06]' : 'border-white/[0.07] bg-white/[0.02]',
                      )}
                      style={{
                        animation: fresh ? 'fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) both' : undefined,
                        opacity: Math.max(0.35, 1 - it.age * 0.14),
                      }}
                    >
                      <span className="relative">
                        <Avatar id={it.act.who} size={30} />
                        <span
                          className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full ring-2 ring-[#0b0d16]"
                          style={{ background: it.act.color }}
                        >
                          <Icon size={9} className="text-white" />
                        </span>
                      </span>
                      <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-[var(--text-soft)]">
                        <span className="font-semibold text-[var(--text)]">{t(NAMES[it.act.who])}</span>
                        {t('님이')}{' '}
                        {it.act.mention ? (
                          <span className="rounded px-1 py-0.5 font-semibold" style={{ background: `${feature.accent}22`, color: feature.accent }}>
                            {t(it.act.text)}
                          </span>
                        ) : (
                          t(it.act.text)
                        )}
                      </p>
                      <span className="flex-shrink-0 text-[10.5px] tabular-nums text-[var(--text-dim)]">
                        {it.age === 0 ? t('방금') : `${it.age * 2}${t('분 전')}`}
                      </span>
                    </div>
                  )
                })}
              </div>
              {/* 아래쪽 페이드 */}
              <span className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0b0d16] to-transparent" />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ───────────────── export ───────────────── */
export function TeamCollabShowcase({ feature }: { feature: Feature }) {
  return (
    <>
      <LiveBoard feature={feature} />
      <AiAssistant feature={feature} />
      <ActivityFeed feature={feature} />
    </>
  )
}
