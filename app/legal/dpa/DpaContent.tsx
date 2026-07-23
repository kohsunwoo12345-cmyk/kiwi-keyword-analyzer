'use client'

import { LegalShell } from '@/components/legal/LegalShell'
import { useT, type Dict } from '@/lib/i18n'

const M: Dict = {
  '개인정보처리위탁 특약': { en: 'Data Processing Addendum', ja: '個人情報取扱委託特約', zh: '个人信息处理委托特别条款' },
  '2026년 9월 1일': { en: 'September 1, 2026', ja: '2026年9月1日', zh: '2026年9月1日' },
  '본 약관은 한국어본을 원본으로 합니다. 번역본과 해석상 차이가 있을 경우 한국어본이 우선합니다.': {
    en: 'The Korean-language version of this document is the original. In the event of any discrepancy between the translation and the Korean version, the Korean version prevails.',
    ja: '本書面は韓国語版を原本とします。翻訳版との間に解釈の相違がある場合は、韓国語版が優先します。',
    zh: '本文件以韩语版本为准。如译文与韩语版本存在解释差异，以韩语版本为准。',
  },
  '본 특약은 기업회원이 BYGENCY를 통해 고객 데이터를 처리하는 경우 이용약관과 함께 적용됩니다.': {
    en: 'This Addendum applies together with the Terms of Service when a business member processes customer data through BYGENCY.',
    ja: '本特約は、企業会員がBYGENCYを通じて顧客データを処理する場合、利用規約とともに適用されます。',
    zh: '当企业会员通过 BYGENCY 处理客户数据时，本特别条款与服务条款一并适用。',
  },

  '제1조 당사자의 역할': { en: 'Article 1 Roles of the Parties', ja: '第1条 当事者の役割', zh: '第1条 各方角色' },
  '기업회원은 고객 데이터의 개인정보처리자 또는 컨트롤러입니다.': {
    en: 'The business member is the personal information controller of the customer data.',
    ja: '企業会員は顧客データの個人情報取扱者（コントローラー）です。',
    zh: '企业会员是客户数据的个人信息处理者（控制者）。',
  },
  '회사는 기업회원의 문서화된 지시에 따라 고객 데이터를 처리하는 수탁자 또는 프로세서입니다.': {
    en: 'The Company is the processor that processes customer data on the business member’s documented instructions.',
    ja: '当社は、企業会員の文書化された指示に従って顧客データを処理する受託者（プロセッサー）です。',
    zh: '公司是根据企业会员的书面指示处理客户数据的受托者（处理者）。',
  },
  '각 당사자는 자신에게 적용되는 개인정보 보호 법률을 준수합니다.': {
    en: 'Each party complies with the data protection laws applicable to it.',
    ja: '各当事者は、自身に適用される個人情報保護法令を遵守します。',
    zh: '各方遵守适用于自身的个人信息保护法律。',
  },

  '제2조 처리 내용': { en: 'Article 2 Details of Processing', ja: '第2条 処理の内容', zh: '第2条 处理内容' },
  '처리 대상:': { en: 'Subject of processing:', ja: '処理対象：', zh: '处理对象：' },
  '기업회원이 랜딩페이지, CRM, 캠페인, 협업 및 메시지 발송 기능에 입력하는 고객 데이터': {
    en: 'Customer data the business member enters into the landing page, CRM, campaign, collaboration, and message-sending features.',
    ja: '企業会員がランディングページ、CRM、キャンペーン、コラボレーション、メッセージ送信機能に入力する顧客データ。',
    zh: '企业会员在着陆页、CRM、活动、协作及消息发送功能中录入的客户数据。',
  },
  '처리 목적:': { en: 'Purpose of processing:', ja: '処理目的：', zh: '处理目的：' },
  '랜딩페이지 호스팅, 고객정보 저장·분류, 상담관리, 메시지 발송, 캠페인 성과분석, 데이터 내보내기, 백업, 보안 및 기술지원': {
    en: 'Landing page hosting, storage and classification of customer information, consultation management, message sending, campaign performance analysis, data export, backup, security, and technical support.',
    ja: 'ランディングページのホスティング、顧客情報の保存・分類、相談管理、メッセージ送信、キャンペーン成果分析、データエクスポート、バックアップ、セキュリティおよび技術サポート。',
    zh: '着陆页托管、客户信息存储与分类、咨询管理、消息发送、活动绩效分析、数据导出、备份、安全及技术支持。',
  },
  '정보주체:': { en: 'Data subjects:', ja: '情報主体：', zh: '信息主体：' },
  '기업회원의 잠재고객, 고객, 거래처, 임직원, 신청자 및 기타 연락대상자': {
    en: 'The business member’s prospects, customers, business partners, employees, applicants, and other contacts.',
    ja: '企業会員の見込み客、顧客、取引先、役職員、応募者およびその他の連絡対象者。',
    zh: '企业会员的潜在客户、客户、业务伙伴、员工、申请人及其他联系对象。',
  },
  '개인정보 유형:': { en: 'Types of personal data:', ja: '個人情報の種類：', zh: '个人信息类型：' },
  '이름, 이메일 주소, 전화번호, 회사명, 직책, 상담내용, 캠페인 정보, 동의기록, 메시지 발송기록, IP 주소 및 기업회원이 설정한 추가 항목': {
    en: 'Name, email address, phone number, company name, job title, consultation content, campaign information, consent records, message-sending records, IP address, and additional fields configured by the business member.',
    ja: '氏名、メールアドレス、電話番号、会社名、役職、相談内容、キャンペーン情報、同意記録、メッセージ送信記録、IPアドレス、および企業会員が設定した追加項目。',
    zh: '姓名、电子邮箱、电话号码、公司名称、职务、咨询内容、活动信息、同意记录、消息发送记录、IP 地址以及企业会员设置的附加字段。',
  },
  '민감정보:': { en: 'Sensitive data:', ja: '機微情報：', zh: '敏感信息：' },
  '원칙적으로 처리하지 않음. 기업회원이 민감정보 처리를 요청하려면 적법한 근거, 별도 보호조치 및 회사의 사전 승인을 확보해야 함': {
    en: 'Not processed as a rule. To request processing of sensitive data, the business member must secure a lawful basis, separate protective measures, and the Company’s prior approval.',
    ja: '原則として処理しません。企業会員が機微情報の処理を求める場合は、適法な根拠、別途の保護措置および当社の事前承認を確保する必要があります。',
    zh: '原则上不予处理。企业会员如需请求处理敏感信息，须具备合法依据、单独的保护措施并取得公司的事先批准。',
  },
  '처리기간:': { en: 'Processing period:', ja: '処理期間：', zh: '处理期间：' },
  '기업회원의 계약기간 및 삭제·반환 완료 시까지': {
    en: 'The business member’s contract period and until deletion or return is completed.',
    ja: '企業会員の契約期間および削除・返還が完了するまで。',
    zh: '企业会员的合同期间以及删除或返还完成之时为止。',
  },

  '제3조 기업회원의 지시': { en: 'Article 3 Business Member’s Instructions', ja: '第3条 企業会員の指示', zh: '第3条 企业会员的指示' },
  '회사는 이용약관, 서비스 설정, 주문서 및 기업회원이 적법하게 제공한 추가 지시에 따라 고객 데이터를 처리합니다.': {
    en: 'The Company processes customer data in accordance with the Terms of Service, service settings, order forms, and additional instructions lawfully provided by the business member.',
    ja: '当社は、利用規約、サービス設定、注文書、および企業会員が適法に提供した追加指示に従って顧客データを処理します。',
    zh: '公司根据服务条款、服务设置、订单以及企业会员合法提供的附加指示处理客户数据。',
  },
  '회사가 기업회원의 지시가 적용 법률을 위반한다고 판단하면 가능한 범위에서 기업회원에게 알리고 해당 처리를 중단할 수 있습니다.': {
    en: 'If the Company determines that the business member’s instruction violates applicable law, it may, to the extent possible, notify the business member and suspend the relevant processing.',
    ja: '当社が企業会員の指示が適用法令に違反すると判断した場合、可能な範囲で企業会員に通知し、当該処理を中止することができます。',
    zh: '如公司认为企业会员的指示违反适用法律，可在可能范围内通知企业会员并中止相关处理。',
  },
  '기업회원은 회사에 불법 또는 부당한 처리를 지시해서는 안 됩니다.': {
    en: 'The business member must not instruct the Company to carry out unlawful or improper processing.',
    ja: '企業会員は、当社に違法または不当な処理を指示してはなりません。',
    zh: '企业会员不得指示公司进行违法或不当的处理。',
  },

  '제4조 기업회원의 의무': { en: 'Article 4 Business Member’s Obligations', ja: '第4条 企業会員の義務', zh: '第4条 企业会员的义务' },
  '기업회원은 다음을 보증합니다.': { en: 'The business member warrants the following.', ja: '企業会員は次の事項を保証します。', zh: '企业会员保证以下事项。' },
  '고객 데이터를 수집·이용할 적법한 근거가 있음': {
    en: 'It has a lawful basis to collect and use the customer data.',
    ja: '顧客データを収集・利用する適法な根拠を有していること。',
    zh: '具有收集与使用客户数据的合法依据。',
  },
  '필요한 고지와 동의를 완료함': {
    en: 'It has completed the required notices and consents.',
    ja: '必要な告知および同意を完了していること。',
    zh: '已完成必要的告知与同意。',
  },
  '고객 데이터가 정확하고 목적에 필요한 최소한의 범위임': {
    en: 'The customer data is accurate and limited to the minimum necessary for the purpose.',
    ja: '顧客データが正確であり、目的に必要な最小限の範囲であること。',
    zh: '客户数据准确且限于实现目的所需的最小范围。',
  },
  '정보주체 권리행사 절차를 제공함': {
    en: 'It provides procedures for data subjects to exercise their rights.',
    ja: '情報主体の権利行使手続を提供すること。',
    zh: '提供信息主体行使权利的程序。',
  },
  '광고 수신동의와 수신거부 증빙을 보유함': {
    en: 'It retains proof of advertising opt-in consent and opt-out.',
    ja: '広告受信同意および受信拒否の証跡を保有すること。',
    zh: '保留广告接收同意与拒收的证明。',
  },
  '구매, 스크래핑 또는 무단 수집한 목록을 사용하지 않음': {
    en: 'It does not use purchased, scraped, or unlawfully collected lists.',
    ja: '購入、スクレイピング、または無断で収集したリストを使用しないこと。',
    zh: '不使用购买、抓取或未经授权收集的名单。',
  },
  '특별한 보호가 필요한 정보를 불필요하게 업로드하지 않음': {
    en: 'It does not unnecessarily upload information requiring special protection.',
    ja: '特別な保護が必要な情報を不必要にアップロードしないこと。',
    zh: '不必要地上传需特别保护的信息。',
  },
  '회사에 제공한 지시가 적법함': {
    en: 'The instructions provided to the Company are lawful.',
    ja: '当社に提供した指示が適法であること。',
    zh: '向公司提供的指示合法。',
  },
  '랜딩페이지에 자신의 개인정보처리방침과 연락처를 게시함': {
    en: 'It posts its own privacy policy and contact information on its landing pages.',
    ja: 'ランディングページに自社のプライバシーポリシーと連絡先を掲載すること。',
    zh: '在其着陆页发布自己的隐私政策与联系方式。',
  },
  '적용되는 DNC·스팸·전화권유 규정을 준수함': {
    en: 'It complies with applicable do-not-call, spam, and telemarketing regulations.',
    ja: '適用されるDNC・スパム・電話勧誘規制を遵守すること。',
    zh: '遵守适用的免打扰、垃圾信息及电话营销规定。',
  },

  '제5조 비밀유지와 접근통제': { en: 'Article 5 Confidentiality and Access Control', ja: '第5条 秘密保持とアクセス制御', zh: '第5条 保密与访问控制' },
  '회사는 고객 데이터에 접근하는 임직원과 계약자에게 비밀유지의무를 부과합니다.': {
    en: 'The Company imposes confidentiality obligations on employees and contractors who access customer data.',
    ja: '当社は、顧客データにアクセスする役職員および契約者に秘密保持義務を課します。',
    zh: '公司对访问客户数据的员工与承包商施加保密义务。',
  },
  '고객 데이터에 대한 접근권한은 업무상 필요한 사람에게 최소한으로 부여합니다.': {
    en: 'Access rights to customer data are granted on a minimal, need-to-know basis.',
    ja: '顧客データへのアクセス権限は、業務上必要な者に最小限で付与します。',
    zh: '客户数据的访问权限仅在最小必要范围内授予因业务需要的人员。',
  },
  '회사는 접근권한을 정기적으로 검토하고 불필요한 권한을 회수합니다.': {
    en: 'The Company regularly reviews access rights and revokes unnecessary ones.',
    ja: '当社はアクセス権限を定期的に見直し、不要な権限を回収します。',
    zh: '公司定期审查访问权限并收回不必要的权限。',
  },

  '제6조 보안조치': { en: 'Article 6 Security Measures', ja: '第6条 セキュリティ措置', zh: '第6条 安全措施' },
  '회사는 위험도에 적합한 기술적·관리적 보호조치를 적용합니다.': {
    en: 'The Company applies technical and organizational safeguards appropriate to the risk.',
    ja: '当社はリスクに適した技術的・管理的保護措置を適用します。',
    zh: '公司采取与风险相适应的技术与管理保护措施。',
  },
  '전송구간 암호화': { en: 'Encryption in transit', ja: '通信区間の暗号化', zh: '传输链路加密' },
  '저장 데이터 보호': { en: 'Protection of data at rest', ja: '保存データの保護', zh: '存储数据保护' },
  '역할 기반 접근통제': { en: 'Role-based access control', ja: 'ロールベースアクセス制御', zh: '基于角色的访问控制' },
  '관리자 다중인증': { en: 'Multi-factor authentication for administrators', ja: '管理者の多要素認証', zh: '管理员多重身份验证' },
  '접근기록과 감사로그': { en: 'Access records and audit logs', ja: 'アクセス記録と監査ログ', zh: '访问记录与审计日志' },
  '취약점 관리': { en: 'Vulnerability management', ja: '脆弱性管理', zh: '漏洞管理' },
  '보안사고 대응': { en: 'Security incident response', ja: 'セキュリティインシデント対応', zh: '安全事件响应' },
  '백업과 복구': { en: 'Backup and recovery', ja: 'バックアップと復旧', zh: '备份与恢复' },
  '임직원 교육': { en: 'Employee training', ja: '役職員教育', zh: '员工培训' },
  '재수탁자 보안관리': { en: 'Sub-processor security management', ja: '再受託者のセキュリティ管理', zh: '次级处理者安全管理' },
  '고객 데이터의 논리적 분리': { en: 'Logical separation of customer data', ja: '顧客データの論理的分離', zh: '客户数据的逻辑隔离' },
  '안전한 삭제': { en: 'Secure deletion', ja: '安全な削除', zh: '安全删除' },
  '기업회원은 사용자 권한, 비밀번호, API 키, 발신계정 및 내보낸 파일을 안전하게 관리해야 합니다.': {
    en: 'The business member must securely manage user permissions, passwords, API keys, sending accounts, and exported files.',
    ja: '企業会員は、ユーザー権限、パスワード、APIキー、送信アカウントおよびエクスポートしたファイルを安全に管理する必要があります。',
    zh: '企业会员须妥善管理用户权限、密码、API 密钥、发送账户及导出的文件。',
  },

  '제7조 재수탁자': { en: 'Article 7 Sub-processors', ja: '第7条 再受託者', zh: '第7条 次级处理者' },
  '기업회원은 회사가 공개한 재수탁자를 이용하는 것에 일반적으로 동의합니다.': {
    en: 'The business member generally consents to the use of the sub-processors disclosed by the Company.',
    ja: '企業会員は、当社が公開した再受託者の利用に一般的に同意します。',
    zh: '企业会员一般同意使用公司所公开的次级处理者。',
  },
  '회사는 재수탁자 목록을 최신 상태로 공개합니다.': {
    en: 'The Company keeps its list of sub-processors up to date and public.',
    ja: '当社は再受託者リストを最新の状態で公開します。',
    zh: '公司公开并保持次级处理者名单为最新状态。',
  },
  '회사는 새로운 재수탁자를 추가하거나 고객 데이터 처리 국가를 중대하게 변경하는 경우 원칙적으로 최소 15일 또는 30일 전에 기업회원에게 알립니다.': {
    en: 'When adding a new sub-processor or materially changing the country where customer data is processed, the Company will, in principle, notify the business member at least 15 or 30 days in advance.',
    ja: '当社は、新たな再受託者を追加し、または顧客データの処理国を重大に変更する場合、原則として最低15日または30日前に企業会員へ通知します。',
    zh: '公司在新增次级处理者或重大变更客户数据处理国家时，原则上至少提前 15 日或 30 日通知企业会员。',
  },
  '기업회원은 합리적인 개인정보 보호 사유가 있는 경우 이의를 제기할 수 있습니다.': {
    en: 'The business member may object where it has reasonable data protection grounds.',
    ja: '企業会員は、合理的な個人情報保護上の理由がある場合、異議を申し立てることができます。',
    zh: '企业会员如有合理的个人信息保护理由，可提出异议。',
  },
  '양 당사자가 합리적인 대체방안을 찾지 못하면 영향받는 기능 또는 계약을 해지할 수 있습니다.': {
    en: 'If the parties cannot find a reasonable alternative, either may terminate the affected feature or contract.',
    ja: '両当事者が合理的な代替案を見出せない場合、影響を受ける機能または契約を解除することができます。',
    zh: '若双方无法找到合理替代方案，可终止受影响的功能或合同。',
  },
  '회사는 재수탁자에게 본 특약과 실질적으로 동등한 개인정보 보호의무를 부과합니다.': {
    en: 'The Company imposes on sub-processors data protection obligations substantially equivalent to this Addendum.',
    ja: '当社は再受託者に対し、本特約と実質的に同等の個人情報保護義務を課します。',
    zh: '公司对次级处理者施加与本特别条款实质相当的个人信息保护义务。',
  },

  '제8조 국외이전': { en: 'Article 8 Cross-Border Transfers', ja: '第8条 国外移転', zh: '第8条 跨境转移' },
  '고객 데이터가 국외로 이전되는 경우 회사는 적용 법률상 필요한 보호조치를 적용합니다.': {
    en: 'Where customer data is transferred abroad, the Company applies the safeguards required by applicable law.',
    ja: '顧客データが国外へ移転される場合、当社は適用法令上必要な保護措置を適用します。',
    zh: '当客户数据被转移至境外时，公司采取适用法律所要求的保护措施。',
  },
  'EU·EEA 개인정보에는 적정성 결정 또는 EU 표준계약조항을 적용합니다.': {
    en: 'For EU/EEA personal data, an adequacy decision or the EU Standard Contractual Clauses apply.',
    ja: 'EU・EEAの個人情報には、十分性認定またはEU標準契約条項を適用します。',
    zh: '对于欧盟/欧洲经济区个人信息，适用充分性认定或欧盟标准合同条款。',
  },
  '영국 개인정보에는 적정성 규정, 영국 국제데이터이전계약 또는 영국 부속서를 적용합니다.': {
    en: 'For UK personal data, the UK adequacy regulations, the UK International Data Transfer Agreement, or the UK Addendum apply.',
    ja: '英国の個人情報には、十分性規則、英国国際データ移転契約または英国附属書を適用します。',
    zh: '对于英国个人信息，适用英国充分性规定、英国国际数据传输协议或英国附录。',
  },
  '대한민국 개인정보에는 개인정보 보호법상 국외이전 근거와 보호조치를 적용합니다.': {
    en: 'For Korean personal data, the cross-border transfer basis and safeguards under the Personal Information Protection Act apply.',
    ja: '大韓民国の個人情報には、個人情報保護法上の国外移転根拠および保護措置を適用します。',
    zh: '对于韩国个人信息，适用《个人信息保护法》规定的跨境转移依据与保护措施。',
  },
  '회사는 이전 국가, 수령자, 목적 및 보유기간을 재수탁자 목록이나 개인정보처리방침에 공개합니다.': {
    en: 'The Company discloses the destination country, recipients, purpose, and retention period in its sub-processor list or privacy policy.',
    ja: '当社は、移転先の国、受領者、目的および保有期間を再受託者リストまたはプライバシーポリシーに公開します。',
    zh: '公司在次级处理者名单或隐私政策中公开转移目的国、接收方、目的及保存期限。',
  },
  '기업회원은 자신의 고객에게 필요한 국외이전 고지 또는 동의를 제공해야 합니다.': {
    en: 'The business member must provide its customers with the cross-border transfer notice or consent required.',
    ja: '企業会員は、自社の顧客に対して必要な国外移転の告知または同意を提供する必要があります。',
    zh: '企业会员须向其客户提供所需的跨境转移告知或同意。',
  },

  '제9조 정보주체 요청': { en: 'Article 9 Data Subject Requests', ja: '第9条 情報主体からの請求', zh: '第9条 信息主体请求' },
  '회사가 기업회원의 고객으로부터 직접 권리행사 요청을 받으면 법률상 금지되지 않는 한 기업회원에게 전달합니다.': {
    en: 'If the Company receives a rights request directly from the business member’s customer, it forwards it to the business member unless prohibited by law.',
    ja: '当社が企業会員の顧客から直接権利行使の請求を受けた場合、法律上禁止されない限り企業会員に転送します。',
    zh: '如公司直接收到企业会员客户的权利行使请求，除法律禁止外将转交企业会员。',
  },
  '회사는 기술적으로 가능한 범위에서 검색, 내보내기, 정정, 삭제 및 처리제한 기능을 제공합니다.': {
    en: 'The Company provides search, export, correction, deletion, and restriction-of-processing features to the extent technically feasible.',
    ja: '当社は、技術的に可能な範囲で検索、エクスポート、訂正、削除および処理制限の機能を提供します。',
    zh: '公司在技术可行范围内提供检索、导出、更正、删除及限制处理功能。',
  },
  '요청 대응의 최종 판단과 법적 책임은 기업회원에게 있습니다.': {
    en: 'The final decision on and legal responsibility for responding to requests rest with the business member.',
    ja: '請求対応の最終判断および法的責任は企業会員にあります。',
    zh: '对请求作出最终判断及承担法律责任的主体为企业会员。',
  },
  '과도하거나 반복적이거나 별도의 개발이 필요한 지원에는 합리적인 비용이 부과될 수 있습니다. 다만, 회사의 귀책 또는 법률상 무상 지원의무가 있는 경우는 제외합니다.': {
    en: 'Reasonable fees may apply to support that is excessive, repetitive, or requires separate development, except where the Company is at fault or a free-of-charge duty applies by law.',
    ja: '過度、反復的、または別途の開発を要する支援には合理的な費用が課される場合があります。ただし、当社の帰責または法律上無償支援義務がある場合を除きます。',
    zh: '对于过度、重复或需单独开发的支持，可能收取合理费用；但公司存在过错或法律规定负有无偿支持义务的情形除外。',
  },

  '제10조 개인정보 침해': { en: 'Article 10 Personal Data Breach', ja: '第10条 個人情報侵害', zh: '第10条 个人信息侵害' },
  '회사는 고객 데이터 침해를 확인하면 기업회원에게 부당한 지연 없이 통지합니다.': {
    en: 'Upon confirming a customer data breach, the Company notifies the business member without undue delay.',
    ja: '当社は、顧客データの侵害を確認した場合、企業会員に不当な遅延なく通知します。',
    zh: '公司确认客户数据侵害后，将无不当延迟地通知企业会员。',
  },
  '가능한 경우 회사는 침해 확인 후 48시간 이내에 초기 통지를 제공하도록 노력합니다.': {
    en: 'Where possible, the Company endeavors to provide an initial notice within 48 hours of confirming the breach.',
    ja: '可能な場合、当社は侵害確認後48時間以内に初期通知を提供するよう努めます。',
    zh: '在可能的情况下，公司力争在确认侵害后 48 小时内提供初步通知。',
  },
  '초기 통지에는 가능한 범위에서 다음 정보를 포함합니다.': {
    en: 'The initial notice includes the following information to the extent possible.',
    ja: '初期通知には、可能な範囲で次の情報を含めます。',
    zh: '初步通知在可能范围内包含以下信息。',
  },
  '가. 사고의 성격': { en: 'a. Nature of the incident', ja: 'ア．事故の性質', zh: '甲. 事件的性质' },
  '나. 영향받은 정보와 정보주체': { en: 'b. Information and data subjects affected', ja: 'イ．影響を受けた情報と情報主体', zh: '乙. 受影响的信息与信息主体' },
  '다. 예상되는 결과': { en: 'c. Likely consequences', ja: 'ウ．予想される結果', zh: '丙. 可能的后果' },
  '라. 회사가 취한 조치': { en: 'd. Measures taken by the Company', ja: 'エ．当社が講じた措置', zh: '丁. 公司已采取的措施' },
  '마. 문의 담당자': { en: 'e. Contact person for inquiries', ja: 'オ．問い合わせ担当者', zh: '戊. 咨询联系人' },
  '조사 중인 사항은 추가 통지로 보완할 수 있습니다.': {
    en: 'Matters under investigation may be supplemented by further notices.',
    ja: '調査中の事項は追加の通知で補完することができます。',
    zh: '正在调查的事项可通过后续通知补充。',
  },
  '정보주체와 감독기관에 대한 통지 여부와 내용은 원칙적으로 기업회원이 결정합니다. 다만, 회사가 직접 통지할 법적 의무가 있는 경우는 제외합니다.': {
    en: 'Whether and what to notify data subjects and supervisory authorities is, in principle, decided by the business member, except where the Company has a legal duty to notify directly.',
    ja: '情報主体および監督機関への通知の要否と内容は、原則として企業会員が決定します。ただし、当社が直接通知する法的義務がある場合を除きます。',
    zh: '是否及如何通知信息主体与监管机关，原则上由企业会员决定；但公司负有直接通知的法定义务的情形除外。',
  },

  '제11조 영향평가와 감독기관 대응': { en: 'Article 11 Impact Assessments and Regulator Engagement', ja: '第11条 影響評価と監督機関対応', zh: '第11条 影响评估与监管机关应对' },
  '회사는 기업회원의 개인정보 영향평가, 사전협의 또는 감독기관 대응에 필요한 합리적인 정보를 제공합니다.': {
    en: 'The Company provides reasonable information needed for the business member’s data protection impact assessments, prior consultations, or regulator engagement.',
    ja: '当社は、企業会員の個人情報影響評価、事前協議または監督機関対応に必要な合理的な情報を提供します。',
    zh: '公司提供企业会员进行个人信息影响评估、事先咨询或应对监管机关所需的合理信息。',
  },
  '지원 범위는 처리 성격, 회사가 보유한 정보 및 계약된 요금제를 고려합니다.': {
    en: 'The scope of support takes into account the nature of processing, information held by the Company, and the contracted plan.',
    ja: '支援の範囲は、処理の性質、当社が保有する情報および契約された料金プランを考慮します。',
    zh: '支持范围将考虑处理的性质、公司持有的信息及所签约的套餐。',
  },

  '제12조 감사': { en: 'Article 12 Audits', ja: '第12条 監査', zh: '第12条 审计' },
  '회사는 독립적인 보안 인증, 감사보고서 또는 보안자료를 제공하는 방식으로 감사요청에 대응할 수 있습니다.': {
    en: 'The Company may respond to audit requests by providing independent security certifications, audit reports, or security documentation.',
    ja: '当社は、独立したセキュリティ認証、監査報告書またはセキュリティ資料を提供する方法で監査要請に対応することができます。',
    zh: '公司可通过提供独立的安全认证、审计报告或安全资料来响应审计请求。',
  },
  '기업회원은 합리적인 사전 통지 후 고객 데이터 처리와 관련된 감사를 요청할 수 있습니다.': {
    en: 'The business member may request an audit relating to the processing of customer data upon reasonable prior notice.',
    ja: '企業会員は、合理的な事前通知の後、顧客データ処理に関連する監査を要請することができます。',
    zh: '企业会员可在合理的事先通知后，请求就客户数据处理进行审计。',
  },
  '감사는 회사의 보안, 다른 고객의 비밀정보 및 서비스 운영을 부당하게 침해하지 않아야 합니다.': {
    en: 'Audits must not unduly compromise the Company’s security, other customers’ confidential information, or service operations.',
    ja: '監査は、当社のセキュリティ、他の顧客の秘密情報およびサービス運営を不当に侵害してはなりません。',
    zh: '审计不得不当损害公司的安全、其他客户的保密信息及服务运营。',
  },
  '동일 범위의 감사는 원칙적으로 연 1회로 제한할 수 있습니다. 다만, 중대한 침해사고 또는 감독기관 요구가 있는 경우는 제외합니다.': {
    en: 'Audits of the same scope may, in principle, be limited to once per year, except in the case of a serious breach or a regulator’s demand.',
    ja: '同一範囲の監査は、原則として年1回に制限することができます。ただし、重大な侵害事故または監督機関の要求がある場合を除きます。',
    zh: '同一范围的审计原则上可限于每年一次；但发生重大侵害事故或监管机关要求的情形除外。',
  },

  '제13조 데이터 반환과 삭제': { en: 'Article 13 Return and Deletion of Data', ja: '第13条 データの返還と削除', zh: '第13条 数据返还与删除' },
  '계약 종료 시 기업회원은 고객 데이터를 내보낼 수 있습니다.': {
    en: 'Upon termination, the business member may export the customer data.',
    ja: '契約終了時、企業会員は顧客データをエクスポートすることができます。',
    zh: '合同终止时，企业会员可导出客户数据。',
  },
  '회사는 계약 종료 후 30일 등의 기간이 지나면 고객 데이터를 삭제합니다. (구체 기간': {
    en: 'The Company deletes customer data after a period such as 30 days following termination. (Specific period',
    ja: '当社は、契約終了後30日等の期間が経過した後、顧客データを削除します。（具体的な期間',
    zh: '公司在合同终止后经过如 30 天等期间后删除客户数据。（具体期间',
  },
  '백업본은 최대 90일 등 내 순차 삭제합니다. (구체 기간': {
    en: 'Backups are deleted on a rolling basis within a period such as up to 90 days. (Specific period',
    ja: 'バックアップは最大90日等以内に順次削除します。（具体的な期間',
    zh: '备份将在如最长 90 天等期间内依次删除。（具体期间',
  },
  '법률상 보관의무가 있는 경우 해당 데이터는 분리해 보관하고 다른 목적으로 이용하지 않습니다.': {
    en: 'Where retention is legally required, such data is stored separately and not used for any other purpose.',
    ja: '法律上の保管義務がある場合、当該データは分離して保管し、他の目的には利用しません。',
    zh: '如法律要求保存，则将该等数据单独保存且不用于其他目的。',
  },
  '기업회원이 요청하면 회사는 삭제 완료 사실을 확인해 줄 수 있습니다.': {
    en: 'Upon the business member’s request, the Company may confirm that deletion has been completed.',
    ja: '企業会員の要請があれば、当社は削除完了の事実を確認することができます。',
    zh: '经企业会员请求，公司可确认删除已完成的事实。',
  },

  '제14조 CCPA 서비스 제공자·계약자 조항': { en: 'Article 14 CCPA Service Provider / Contractor Clauses', ja: '第14条 CCPAサービスプロバイダー・契約者条項', zh: '第14条 CCPA 服务提供者/承包者条款' },
  '적용되는 경우 회사는 고객 데이터를 기업회원과의 계약상 사업 목적을 위해서만 처리합니다.': {
    en: 'Where applicable, the Company processes customer data only for the business purposes under its contract with the business member.',
    ja: '該当する場合、当社は顧客データを企業会員との契約上の事業目的のためにのみ処理します。',
    zh: '在适用情形下，公司仅为与企业会员合同项下的商业目的处理客户数据。',
  },
  '회사는 다음 행위를 하지 않습니다.': { en: 'The Company does not do the following.', ja: '当社は次の行為を行いません。', zh: '公司不从事以下行为。' },
  '고객 데이터를 판매하거나 공유': { en: 'Sell or share customer data', ja: '顧客データを販売または共有する', zh: '出售或共享客户数据' },
  '기업회원의 지시와 계약 목적 외 사용': { en: 'Use it beyond the business member’s instructions and contractual purpose', ja: '企業会員の指示および契約目的以外に使用する', zh: '超出企业会员指示与合同目的使用' },
  '허용되지 않은 다른 고객 데이터와 결합': { en: 'Combine it with other customer data where not permitted', ja: '許可されていない他の顧客データと結合する', zh: '与未经许可的其他客户数据合并' },
  '타기팅 광고를 위해 고객 데이터 이용': { en: 'Use customer data for targeted advertising', ja: 'ターゲティング広告のために顧客データを利用する', zh: '将客户数据用于定向广告' },
  '계약 목적 외 고객 데이터 보유·사용·공개': { en: 'Retain, use, or disclose customer data outside the contractual purpose', ja: '契約目的以外に顧客データを保有・使用・開示する', zh: '在合同目的之外保留、使用或披露客户数据' },
  '회사는 적용되는 제한을 준수할 수 있음을 확인하며 기업회원은 법률상 허용되는 범위에서 준수 여부를 확인하기 위한 합리적인 조치를 취할 수 있습니다.': {
    en: 'The Company confirms it can comply with the applicable restrictions, and the business member may take reasonable steps, to the extent permitted by law, to verify compliance.',
    ja: '当社は適用される制限を遵守できることを確認し、企業会員は法律上許容される範囲で遵守状況を確認するための合理的な措置を講じることができます。',
    zh: '公司确认其能够遵守适用的限制，企业会员可在法律允许范围内采取合理措施核实其遵守情况。',
  },

  '제15조 EU 표준계약조항': { en: 'Article 15 EU Standard Contractual Clauses', ja: '第15条 EU標準契約条項', zh: '第15条 欧盟标准合同条款' },
  'EU·EEA 개인정보가 적정성 결정을 받지 않은 국가로 이전되고 다른 적법한 이전근거가 없는 경우 EU 집행위원회의 표준계약조항이 본 특약에 편입됩니다.': {
    en: 'Where EU/EEA personal data is transferred to a country without an adequacy decision and no other lawful transfer basis exists, the European Commission’s Standard Contractual Clauses are incorporated into this Addendum.',
    ja: 'EU・EEAの個人情報が十分性認定を受けていない国へ移転され、他の適法な移転根拠がない場合、欧州委員会の標準契約条項が本特約に組み込まれます。',
    zh: '如欧盟/欧洲经济区个人信息被转移至未获充分性认定的国家且无其他合法转移依据，则欧盟委员会的标准合同条款并入本特别条款。',
  },
  '모듈은 당사자의 실제 역할에 따라 결정합니다.': {
    en: 'The applicable module is determined by the parties’ actual roles.',
    ja: 'モジュールは当事者の実際の役割に応じて決定します。',
    zh: '所适用的模块依双方的实际角色确定。',
  },
  '컨트롤러에서 프로세서': { en: 'Controller to processor', ja: 'コントローラーからプロセッサー', zh: '控制者至处理者' },
  '프로세서에서 프로세서': { en: 'Processor to processor', ja: 'プロセッサーからプロセッサー', zh: '处理者至处理者' },
  '기타 실제 처리관계에 맞는 모듈': { en: 'Other modules matching the actual processing relationship', ja: 'その他、実際の処理関係に適合するモジュール', zh: '符合实际处理关系的其他模块' },
  '충돌 시 표준계약조항이 우선합니다.': {
    en: 'In the event of conflict, the Standard Contractual Clauses prevail.',
    ja: '矛盾が生じた場合、標準契約条項が優先します。',
    zh: '发生冲突时，以标准合同条款为准。',
  },

  '제16조 책임': { en: 'Article 16 Liability', ja: '第16条 責任', zh: '第16条 责任' },
  '본 특약에 따른 책임은 이용약관 또는 기업계약의 책임 조항을 따릅니다.': {
    en: 'Liability under this Addendum follows the liability provisions of the Terms of Service or the enterprise agreement.',
    ja: '本特約に基づく責任は、利用規約または企業契約の責任条項に従います。',
    zh: '本特别条款项下的责任遵循服务条款或企业协议的责任条款。',
  },
  '다만, 적용 개인정보 보호 법률상 제한할 수 없는 정보주체의 권리 또는 당사자의 법적 책임을 제한하지 않습니다.': {
    en: 'However, it does not limit data subjects’ rights or a party’s legal liability that cannot be limited under applicable data protection law.',
    ja: 'ただし、適用される個人情報保護法上制限できない情報主体の権利または当事者の法的責任を制限するものではありません。',
    zh: '但不限制适用个人信息保护法下不可限制的信息主体权利或一方的法律责任。',
  },
}

export function DpaContent() {
  const t = useT(M)
  return (
    <LegalShell title={t('개인정보처리위탁 특약')} effective={t('2026년 9월 1일')}>
      <p className="text-sm opacity-70">{t('본 약관은 한국어본을 원본으로 합니다. 번역본과 해석상 차이가 있을 경우 한국어본이 우선합니다.')}</p>
      <p className="lead">{t('본 특약은 기업회원이 BYGENCY를 통해 고객 데이터를 처리하는 경우 이용약관과 함께 적용됩니다.')}</p>

      <h2>{t('제1조 당사자의 역할')}</h2>
      <ol>
        <li>{t('기업회원은 고객 데이터의 개인정보처리자 또는 컨트롤러입니다.')}</li>
        <li>{t('회사는 기업회원의 문서화된 지시에 따라 고객 데이터를 처리하는 수탁자 또는 프로세서입니다.')}</li>
        <li>{t('각 당사자는 자신에게 적용되는 개인정보 보호 법률을 준수합니다.')}</li>
      </ol>

      <h2>{t('제2조 처리 내용')}</h2>
      <p><strong>{t('처리 대상:')}</strong> {t('기업회원이 랜딩페이지, CRM, 캠페인, 협업 및 메시지 발송 기능에 입력하는 고객 데이터')}</p>
      <p><strong>{t('처리 목적:')}</strong> {t('랜딩페이지 호스팅, 고객정보 저장·분류, 상담관리, 메시지 발송, 캠페인 성과분석, 데이터 내보내기, 백업, 보안 및 기술지원')}</p>
      <p><strong>{t('정보주체:')}</strong> {t('기업회원의 잠재고객, 고객, 거래처, 임직원, 신청자 및 기타 연락대상자')}</p>
      <p><strong>{t('개인정보 유형:')}</strong> {t('이름, 이메일 주소, 전화번호, 회사명, 직책, 상담내용, 캠페인 정보, 동의기록, 메시지 발송기록, IP 주소 및 기업회원이 설정한 추가 항목')}</p>
      <p><strong>{t('민감정보:')}</strong> {t('원칙적으로 처리하지 않음. 기업회원이 민감정보 처리를 요청하려면 적법한 근거, 별도 보호조치 및 회사의 사전 승인을 확보해야 함')}</p>
      <p><strong>{t('처리기간:')}</strong> {t('기업회원의 계약기간 및 삭제·반환 완료 시까지')}</p>

      <h2>{t('제3조 기업회원의 지시')}</h2>
      <ol>
        <li>{t('회사는 이용약관, 서비스 설정, 주문서 및 기업회원이 적법하게 제공한 추가 지시에 따라 고객 데이터를 처리합니다.')}</li>
        <li>{t('회사가 기업회원의 지시가 적용 법률을 위반한다고 판단하면 가능한 범위에서 기업회원에게 알리고 해당 처리를 중단할 수 있습니다.')}</li>
        <li>{t('기업회원은 회사에 불법 또는 부당한 처리를 지시해서는 안 됩니다.')}</li>
      </ol>

      <h2>{t('제4조 기업회원의 의무')}</h2>
      <p>{t('기업회원은 다음을 보증합니다.')}</p>
      <ol>
        <li>{t('고객 데이터를 수집·이용할 적법한 근거가 있음')}</li>
        <li>{t('필요한 고지와 동의를 완료함')}</li>
        <li>{t('고객 데이터가 정확하고 목적에 필요한 최소한의 범위임')}</li>
        <li>{t('정보주체 권리행사 절차를 제공함')}</li>
        <li>{t('광고 수신동의와 수신거부 증빙을 보유함')}</li>
        <li>{t('구매, 스크래핑 또는 무단 수집한 목록을 사용하지 않음')}</li>
        <li>{t('특별한 보호가 필요한 정보를 불필요하게 업로드하지 않음')}</li>
        <li>{t('회사에 제공한 지시가 적법함')}</li>
        <li>{t('랜딩페이지에 자신의 개인정보처리방침과 연락처를 게시함')}</li>
        <li>{t('적용되는 DNC·스팸·전화권유 규정을 준수함')}</li>
      </ol>

      <h2>{t('제5조 비밀유지와 접근통제')}</h2>
      <ol>
        <li>{t('회사는 고객 데이터에 접근하는 임직원과 계약자에게 비밀유지의무를 부과합니다.')}</li>
        <li>{t('고객 데이터에 대한 접근권한은 업무상 필요한 사람에게 최소한으로 부여합니다.')}</li>
        <li>{t('회사는 접근권한을 정기적으로 검토하고 불필요한 권한을 회수합니다.')}</li>
      </ol>

      <h2>{t('제6조 보안조치')}</h2>
      <p>{t('회사는 위험도에 적합한 기술적·관리적 보호조치를 적용합니다.')}</p>
      <ol>
        <li>{t('전송구간 암호화')}</li>
        <li>{t('저장 데이터 보호')}</li>
        <li>{t('역할 기반 접근통제')}</li>
        <li>{t('관리자 다중인증')}</li>
        <li>{t('접근기록과 감사로그')}</li>
        <li>{t('취약점 관리')}</li>
        <li>{t('보안사고 대응')}</li>
        <li>{t('백업과 복구')}</li>
        <li>{t('임직원 교육')}</li>
        <li>{t('재수탁자 보안관리')}</li>
        <li>{t('고객 데이터의 논리적 분리')}</li>
        <li>{t('안전한 삭제')}</li>
      </ol>
      <p>{t('기업회원은 사용자 권한, 비밀번호, API 키, 발신계정 및 내보낸 파일을 안전하게 관리해야 합니다.')}</p>

      <h2>{t('제7조 재수탁자')}</h2>
      <ol>
        <li>{t('기업회원은 회사가 공개한 재수탁자를 이용하는 것에 일반적으로 동의합니다.')}</li>
        <li>{t('회사는 재수탁자 목록을 최신 상태로 공개합니다.')}</li>
        <li>{t('회사는 새로운 재수탁자를 추가하거나 고객 데이터 처리 국가를 중대하게 변경하는 경우 원칙적으로 최소 15일 또는 30일 전에 기업회원에게 알립니다.')}</li>
        <li>{t('기업회원은 합리적인 개인정보 보호 사유가 있는 경우 이의를 제기할 수 있습니다.')}</li>
        <li>{t('양 당사자가 합리적인 대체방안을 찾지 못하면 영향받는 기능 또는 계약을 해지할 수 있습니다.')}</li>
        <li>{t('회사는 재수탁자에게 본 특약과 실질적으로 동등한 개인정보 보호의무를 부과합니다.')}</li>
      </ol>

      <h2>{t('제8조 국외이전')}</h2>
      <ol>
        <li>{t('고객 데이터가 국외로 이전되는 경우 회사는 적용 법률상 필요한 보호조치를 적용합니다.')}</li>
        <li>{t('EU·EEA 개인정보에는 적정성 결정 또는 EU 표준계약조항을 적용합니다.')}</li>
        <li>{t('영국 개인정보에는 적정성 규정, 영국 국제데이터이전계약 또는 영국 부속서를 적용합니다.')}</li>
        <li>{t('대한민국 개인정보에는 개인정보 보호법상 국외이전 근거와 보호조치를 적용합니다.')}</li>
        <li>{t('회사는 이전 국가, 수령자, 목적 및 보유기간을 재수탁자 목록이나 개인정보처리방침에 공개합니다.')}</li>
        <li>{t('기업회원은 자신의 고객에게 필요한 국외이전 고지 또는 동의를 제공해야 합니다.')}</li>
      </ol>

      <h2>{t('제9조 정보주체 요청')}</h2>
      <ol>
        <li>{t('회사가 기업회원의 고객으로부터 직접 권리행사 요청을 받으면 법률상 금지되지 않는 한 기업회원에게 전달합니다.')}</li>
        <li>{t('회사는 기술적으로 가능한 범위에서 검색, 내보내기, 정정, 삭제 및 처리제한 기능을 제공합니다.')}</li>
        <li>{t('요청 대응의 최종 판단과 법적 책임은 기업회원에게 있습니다.')}</li>
        <li>{t('과도하거나 반복적이거나 별도의 개발이 필요한 지원에는 합리적인 비용이 부과될 수 있습니다. 다만, 회사의 귀책 또는 법률상 무상 지원의무가 있는 경우는 제외합니다.')}</li>
      </ol>

      <h2>{t('제10조 개인정보 침해')}</h2>
      <ol>
        <li>{t('회사는 고객 데이터 침해를 확인하면 기업회원에게 부당한 지연 없이 통지합니다.')}</li>
        <li>{t('가능한 경우 회사는 침해 확인 후 48시간 이내에 초기 통지를 제공하도록 노력합니다.')}</li>
        <li>
          {t('초기 통지에는 가능한 범위에서 다음 정보를 포함합니다.')}
          <ul>
            <li>{t('가. 사고의 성격')}</li>
            <li>{t('나. 영향받은 정보와 정보주체')}</li>
            <li>{t('다. 예상되는 결과')}</li>
            <li>{t('라. 회사가 취한 조치')}</li>
            <li>{t('마. 문의 담당자')}</li>
          </ul>
        </li>
        <li>{t('조사 중인 사항은 추가 통지로 보완할 수 있습니다.')}</li>
        <li>{t('정보주체와 감독기관에 대한 통지 여부와 내용은 원칙적으로 기업회원이 결정합니다. 다만, 회사가 직접 통지할 법적 의무가 있는 경우는 제외합니다.')}</li>
      </ol>

      <h2>{t('제11조 영향평가와 감독기관 대응')}</h2>
      <p>{t('회사는 기업회원의 개인정보 영향평가, 사전협의 또는 감독기관 대응에 필요한 합리적인 정보를 제공합니다.')}</p>
      <p>{t('지원 범위는 처리 성격, 회사가 보유한 정보 및 계약된 요금제를 고려합니다.')}</p>

      <h2>{t('제12조 감사')}</h2>
      <ol>
        <li>{t('회사는 독립적인 보안 인증, 감사보고서 또는 보안자료를 제공하는 방식으로 감사요청에 대응할 수 있습니다.')}</li>
        <li>{t('기업회원은 합리적인 사전 통지 후 고객 데이터 처리와 관련된 감사를 요청할 수 있습니다.')}</li>
        <li>{t('감사는 회사의 보안, 다른 고객의 비밀정보 및 서비스 운영을 부당하게 침해하지 않아야 합니다.')}</li>
        <li>{t('동일 범위의 감사는 원칙적으로 연 1회로 제한할 수 있습니다. 다만, 중대한 침해사고 또는 감독기관 요구가 있는 경우는 제외합니다.')}</li>
      </ol>

      <h2>{t('제13조 데이터 반환과 삭제')}</h2>
      <ol>
        <li>{t('계약 종료 시 기업회원은 고객 데이터를 내보낼 수 있습니다.')}</li>
        <li>{t('회사는 계약 종료 후 30일 등의 기간이 지나면 고객 데이터를 삭제합니다. (구체 기간')} <span className="ph">[추후 입력]</span>)</li>
        <li>{t('백업본은 최대 90일 등 내 순차 삭제합니다. (구체 기간')} <span className="ph">[추후 입력]</span>)</li>
        <li>{t('법률상 보관의무가 있는 경우 해당 데이터는 분리해 보관하고 다른 목적으로 이용하지 않습니다.')}</li>
        <li>{t('기업회원이 요청하면 회사는 삭제 완료 사실을 확인해 줄 수 있습니다.')}</li>
      </ol>

      <h2>{t('제14조 CCPA 서비스 제공자·계약자 조항')}</h2>
      <p>{t('적용되는 경우 회사는 고객 데이터를 기업회원과의 계약상 사업 목적을 위해서만 처리합니다.')}</p>
      <p>{t('회사는 다음 행위를 하지 않습니다.')}</p>
      <ol>
        <li>{t('고객 데이터를 판매하거나 공유')}</li>
        <li>{t('기업회원의 지시와 계약 목적 외 사용')}</li>
        <li>{t('허용되지 않은 다른 고객 데이터와 결합')}</li>
        <li>{t('타기팅 광고를 위해 고객 데이터 이용')}</li>
        <li>{t('계약 목적 외 고객 데이터 보유·사용·공개')}</li>
      </ol>
      <p>{t('회사는 적용되는 제한을 준수할 수 있음을 확인하며 기업회원은 법률상 허용되는 범위에서 준수 여부를 확인하기 위한 합리적인 조치를 취할 수 있습니다.')}</p>

      <h2>{t('제15조 EU 표준계약조항')}</h2>
      <p>{t('EU·EEA 개인정보가 적정성 결정을 받지 않은 국가로 이전되고 다른 적법한 이전근거가 없는 경우 EU 집행위원회의 표준계약조항이 본 특약에 편입됩니다.')}</p>
      <p>{t('모듈은 당사자의 실제 역할에 따라 결정합니다.')}</p>
      <ol>
        <li>{t('컨트롤러에서 프로세서')}</li>
        <li>{t('프로세서에서 프로세서')}</li>
        <li>{t('기타 실제 처리관계에 맞는 모듈')}</li>
      </ol>
      <p>{t('충돌 시 표준계약조항이 우선합니다.')}</p>

      <h2>{t('제16조 책임')}</h2>
      <p>{t('본 특약에 따른 책임은 이용약관 또는 기업계약의 책임 조항을 따릅니다.')}</p>
      <p>{t('다만, 적용 개인정보 보호 법률상 제한할 수 없는 정보주체의 권리 또는 당사자의 법적 책임을 제한하지 않습니다.')}</p>
    </LegalShell>
  )
}
