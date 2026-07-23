'use client'

import { LegalShell } from '@/components/legal/LegalShell'
import { useT, type Dict } from '@/lib/i18n'

const M: Dict = {
  '쿠키정책': { en: 'Cookie Policy', ja: 'Cookieポリシー', zh: 'Cookie 政策' },
  '2026년 9월 1일': { en: 'September 1, 2026', ja: '2026年9月1日', zh: '2026年9月1日' },
  '본 약관은 한국어본을 원본으로 합니다. 번역본과 해석상 차이가 있을 경우 한국어본이 우선합니다.': {
    en: 'The Korean-language version of this document is the original. In the event of any discrepancy between the translation and the Korean version, the Korean version prevails.',
    ja: '本書面は韓国語版を原本とします。翻訳版との間に解釈の相違がある場合は、韓国語版が優先します。',
    zh: '本文件以韩语版本为准。如译文与韩语版本存在解释差异，以韩语版本为准。',
  },
  '1. 쿠키의 정의': { en: '1. Definition of Cookies', ja: '1. Cookieの定義', zh: '1. Cookie 的定义' },
  '쿠키는 웹사이트가 이용자의 브라우저 또는 기기에 저장하는 작은 정보파일입니다.': {
    en: 'A cookie is a small data file that a website stores on the user\'s browser or device.',
    ja: 'Cookieとは、ウェブサイトが利用者のブラウザまたは端末に保存する小さな情報ファイルです。',
    zh: 'Cookie 是网站存储在用户浏览器或设备上的小型信息文件。',
  },
  '2. 쿠키의 종류': { en: '2. Types of Cookies', ja: '2. Cookieの種類', zh: '2. Cookie 的类型' },
  '필수 쿠키': { en: 'Essential Cookies', ja: '必須Cookie', zh: '必要 Cookie' },
  '서비스 로그인, 보안, 네트워크 연결 및 동의설정 저장을 위해 필요합니다. 필수 쿠키는 비활성화할 수 없으나 브라우저 설정으로 차단할 경우 서비스가 정상 작동하지 않을 수 있습니다.': {
    en: 'These are required for service login, security, network connectivity, and storing consent settings. Essential cookies cannot be disabled, but blocking them through browser settings may cause the service to malfunction.',
    ja: 'サービスのログイン、セキュリティ、ネットワーク接続、および同意設定の保存のために必要です。必須Cookieは無効化できませんが、ブラウザ設定で遮断した場合、サービスが正常に動作しないことがあります。',
    zh: '用于服务登录、安全、网络连接以及保存同意设置。必要 Cookie 无法停用，但通过浏览器设置拦截时，服务可能无法正常运行。',
  },
  '기능 쿠키': { en: 'Functional Cookies', ja: '機能Cookie', zh: '功能 Cookie' },
  '언어, 지역, 인터페이스 및 사용자 설정을 기억합니다.': {
    en: 'These remember language, region, interface, and user preferences.',
    ja: '言語、地域、インターフェース、およびユーザー設定を記憶します。',
    zh: '记住语言、地区、界面及用户设置。',
  },
  '분석 쿠키': { en: 'Analytics Cookies', ja: '分析Cookie', zh: '分析 Cookie' },
  '이용자가 서비스를 어떻게 사용하는지 통계적으로 분석하고 오류를 개선합니다.': {
    en: 'These statistically analyze how users use the service and help improve errors.',
    ja: '利用者がサービスをどのように利用するかを統計的に分析し、エラーを改善します。',
    zh: '统计分析用户如何使用服务并改进错误。',
  },
  '광고 쿠키': { en: 'Advertising Cookies', ja: '広告Cookie', zh: '广告 Cookie' },
  '회사의 마케팅 및 광고효과 측정 또는 맞춤형 광고에 사용됩니다.': {
    en: 'These are used for the Company\'s marketing, measuring advertising effectiveness, or personalized advertising.',
    ja: '当社のマーケティングおよび広告効果の測定、またはパーソナライズド広告に使用されます。',
    zh: '用于公司的营销及广告效果衡量或个性化广告。',
  },
  '3. 실제 쿠키 목록': { en: '3. Actual Cookie List', ja: '3. 実際のCookie一覧', zh: '3. 实际 Cookie 清单' },
  '실제 쿠키 목록은 서비스 공개 시점에 스캔 결과에 맞춰 아래 형식으로 공개합니다. (쿠키명 / 제공자 / 목적 / 종류(필수·기능·분석·광고) / 보관기간 / 제3자 여부) — 현재': {
    en: 'The actual cookie list will be disclosed at the time of service launch in the following format, based on scan results. (Cookie name / Provider / Purpose / Type (essential·functional·analytics·advertising) / Retention period / Third-party status) — Currently',
    ja: '実際のCookie一覧は、サービス公開時点でスキャン結果に合わせて以下の形式で公開します。（Cookie名 / 提供者 / 目的 / 種類（必須・機能・分析・広告） / 保管期間 / 第三者提供の有無） — 現在',
    zh: '实际 Cookie 清单将在服务发布时根据扫描结果按以下格式公开。（Cookie 名称 / 提供者 / 目的 / 类型（必要·功能·分析·广告） / 保存期限 / 是否第三方） — 目前',
  },
  '4. 동의 관리': { en: '4. Consent Management', ja: '4. 同意の管理', zh: '4. 同意管理' },
  '이용자는 최초 방문 시 쿠키 배너에서 “모두 허용”, “필수 쿠키만” 또는 “설정”을 선택할 수 있습니다.': {
    en: 'On their first visit, users can choose "Allow all," "Essential cookies only," or "Settings" in the cookie banner.',
    ja: '利用者は初回訪問時に、Cookieバナーで「すべて許可」「必須Cookieのみ」または「設定」を選択できます。',
    zh: '用户首次访问时，可在 Cookie 横幅中选择"全部允许""仅必要 Cookie"或"设置"。',
  },
  '비필수 쿠키 동의는 언제든지 웹사이트 하단의 “쿠키 설정”에서 철회할 수 있습니다.': {
    en: 'Consent to non-essential cookies can be withdrawn at any time via "Cookie Settings" at the bottom of the website.',
    ja: '非必須Cookieへの同意は、ウェブサイト下部の「Cookie設定」からいつでも撤回できます。',
    zh: '对非必要 Cookie 的同意可随时通过网站底部的"Cookie 设置"撤回。',
  },
  '동의 철회 전 적법하게 처리된 정보에는 철회가 소급 적용되지 않습니다.': {
    en: 'Withdrawal does not apply retroactively to information lawfully processed before the withdrawal.',
    ja: '撤回前に適法に処理された情報には、撤回は遡及して適用されません。',
    zh: '撤回不会追溯适用于撤回前已合法处理的信息。',
  },
  '5. GPC와 추적거부': { en: '5. GPC and Do Not Track', ja: '5. GPCとトラッキング拒否', zh: '5. GPC 与拒绝追踪' },
  '회사가 적용 대상인 경우 Global Privacy Control 등 법적으로 인정되는 브라우저 신호를 개인정보 판매·공유 거부 요청으로 처리합니다.': {
    en: 'Where the Company is subject to such requirements, it treats legally recognized browser signals such as Global Privacy Control as requests to opt out of the sale or sharing of personal information.',
    ja: '当社が適用対象である場合、Global Privacy Controlなど法的に認められるブラウザ信号を、個人情報の販売・共有の拒否要請として処理します。',
    zh: '在公司属于适用对象的情况下，将 Global Privacy Control 等法律认可的浏览器信号作为拒绝出售·共享个人信息的请求处理。',
  },
  '일반적인 Do Not Track 신호는 통일된 법적 기준이 없는 경우 쿠키 설정에서 별도로 선택하도록 안내할 수 있습니다.': {
    en: 'For general Do Not Track signals, where no unified legal standard exists, we may direct users to make a separate choice in cookie settings.',
    ja: '一般的なDo Not Track信号については、統一された法的基準がない場合、Cookie設定で別途選択するようご案内することがあります。',
    zh: '对于一般的 Do Not Track 信号，在没有统一法律标准的情况下，我们可能引导用户在 Cookie 设置中另行选择。',
  },
}

export function CookiesContent() {
  const t = useT(M)
  return (
    <LegalShell title={t('쿠키정책')} effective={t('2026년 9월 1일')}>
      <p className="text-sm opacity-70">
        {t('본 약관은 한국어본을 원본으로 합니다. 번역본과 해석상 차이가 있을 경우 한국어본이 우선합니다.')}
      </p>

      <h2>{t('1. 쿠키의 정의')}</h2>
      <p>{t('쿠키는 웹사이트가 이용자의 브라우저 또는 기기에 저장하는 작은 정보파일입니다.')}</p>

      <h2>{t('2. 쿠키의 종류')}</h2>
      <h3>{t('필수 쿠키')}</h3>
      <p>{t('서비스 로그인, 보안, 네트워크 연결 및 동의설정 저장을 위해 필요합니다. 필수 쿠키는 비활성화할 수 없으나 브라우저 설정으로 차단할 경우 서비스가 정상 작동하지 않을 수 있습니다.')}</p>
      <h3>{t('기능 쿠키')}</h3>
      <p>{t('언어, 지역, 인터페이스 및 사용자 설정을 기억합니다.')}</p>
      <h3>{t('분석 쿠키')}</h3>
      <p>{t('이용자가 서비스를 어떻게 사용하는지 통계적으로 분석하고 오류를 개선합니다.')}</p>
      <h3>{t('광고 쿠키')}</h3>
      <p>{t('회사의 마케팅 및 광고효과 측정 또는 맞춤형 광고에 사용됩니다.')}</p>

      <h2>{t('3. 실제 쿠키 목록')}</h2>
      <p>
        {t('실제 쿠키 목록은 서비스 공개 시점에 스캔 결과에 맞춰 아래 형식으로 공개합니다. (쿠키명 / 제공자 / 목적 / 종류(필수·기능·분석·광고) / 보관기간 / 제3자 여부) — 현재')}{' '}
        <span className="ph">[추후 입력]</span>
      </p>

      <h2>{t('4. 동의 관리')}</h2>
      <p>{t('이용자는 최초 방문 시 쿠키 배너에서 “모두 허용”, “필수 쿠키만” 또는 “설정”을 선택할 수 있습니다.')}</p>
      <p>{t('비필수 쿠키 동의는 언제든지 웹사이트 하단의 “쿠키 설정”에서 철회할 수 있습니다.')}</p>
      <p>{t('동의 철회 전 적법하게 처리된 정보에는 철회가 소급 적용되지 않습니다.')}</p>

      <h2>{t('5. GPC와 추적거부')}</h2>
      <p>{t('회사가 적용 대상인 경우 Global Privacy Control 등 법적으로 인정되는 브라우저 신호를 개인정보 판매·공유 거부 요청으로 처리합니다.')}</p>
      <p>{t('일반적인 Do Not Track 신호는 통일된 법적 기준이 없는 경우 쿠키 설정에서 별도로 선택하도록 안내할 수 있습니다.')}</p>
    </LegalShell>
  )
}
