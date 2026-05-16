export interface KeywordAnalysis {
  keyword: string
  pcSearch: number
  mobileSearch: number
  totalSearch: number
  blogCount: number
  cafeCount: number
  saturation: {
    ratio: number
    label: string
    color: string
    level: number
  }
  grade: {
    grade: string
    color: string
    bg: string
  }
  relKeywords: RelKeyword[]
  trends: TrendData[]
  monthlyTrends: MonthlyTrend[]
  weekdayTrends: WeekdayTrend[]
  genderRatio: { male: number; female: number }
  ageGroup: { [key: string]: number }
  sections: NaverSection[]
  issueIndex: number
  firstAppearDate: string
  pcBid: number
  mobileBid: number
  pcCtr: number
  mobileCtr: number
  competitionLevel: string
}

export interface RelKeyword {
  keyword: string
  pcSearch: number
  mobileSearch: number
  totalSearch: number
  blogCount: number
  cafeCount: number
  saturationRatio: number
}

export interface TrendData {
  period: string
  ratio: number
}

export interface MonthlyTrend {
  month: string
  pc: number
  mobile: number
}

export interface WeekdayTrend {
  day: string
  ratio: number
}

export interface NaverSection {
  name: string
  icon: string
  count?: number
  platform: 'pc' | 'mobile' | 'both'
}

export interface RankProject {
  id: string
  name: string
  url: string
  keywords: RankKeyword[]
  createdAt: string
}

export interface RankKeyword {
  id: string
  keyword: string
  history: RankHistory[]
  currentRank?: number
  platform: 'naver' | 'google' | 'both'
}

export interface RankHistory {
  date: string
  naverRank?: number
  googleRank?: number
}

export interface InfluenceItem {
  rank: number
  url: string
  name: string
  keywordCount: number
  exposureIndex: number
  freshnessGrade: string
  expertGrade: string
  category: string
  rankChange: number
}

export interface BulkKeyword {
  keyword: string
  pcSearch: number
  mobileSearch: number
  totalSearch: number
  blogCount: number
  cafeCount: number
  saturation: string
  grade: string
}

export type PlanType = 'free' | 'basic' | 'standard' | 'premium'

export interface Plan {
  type: PlanType
  name: string
  price: number
  features: {
    relKeywordLimit: number
    clusterLimit: number
    trendPeriod: string
    csvDownload: boolean
    bulkLimit: number
    advancedFilters: boolean
  }
}
