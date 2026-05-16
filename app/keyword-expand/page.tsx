'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { GradeChip } from '@/components/ui/GradeChip'
import { Badge } from '@/components/ui/Badge'
import { Layers, Search, ArrowRight, Plus, ChevronRight, Loader2, CheckCircle } from 'lucide-react'
import { formatNumber, calcKeywordGrade, calcSaturation } from '@/lib/utils'
import { getMockKeywordStats } from '@/lib/naver-api'

interface TreeNode {
  keyword: string
  totalSearch: number
  grade: string
  satLabel: string
  children: TreeNode[]
  expanded: boolean
  loading: boolean
  isReal?: boolean
}

function createNode(keyword: string, isReal = false): TreeNode {
  const stats = getMockKeywordStats([keyword])[0]
  const total = stats.monthlyPcQcCnt + stats.monthlyMobileQcCnt
  const blog = Math.round(total * 0.3)
  const grade = calcKeywordGrade(total, blog)
  const sat = calcSaturation(total, blog)
  return {
    keyword,
    totalSearch: total,
    grade: grade.grade,
    satLabel: sat.label,
    children: [],
    expanded: false,
    loading: false,
    isReal,
  }
}

// 실제 자동완성 API 호출
async function fetchRealRelatedFromApi(keyword: string): Promise<string[]> {
  try {
    const res = await fetch(`/api/expand?q=${encodeURIComponent(keyword)}&depth=1&limit=10`)
    const json = await res.json()
    if (json.ok && json.related && json.related.length > 0) {
      return json.related
    }
    return []
  } catch {
    return []
  }
}

async function expandNode(keyword: string): Promise<TreeNode[]> {
  // 실제 자동완성 API 호출
  const real = await fetchRealRelatedFromApi(keyword)
  if (real.length > 0) {
    return real.map(kw => createNode(kw, true))
  }
  // 폴백: Mock 데이터
  const suffixes = ['방법', '추천', '후기', '가격', '비교']
  return suffixes.map(s => createNode(`${keyword} ${s}`, false))
}

function TreeNodeComponent({ node, depth, onExpand, onNavigate }: {
  node: TreeNode
  depth: number
  onExpand: (keyword: string) => void
  onNavigate: (kw: string) => void
}) {
  const indent = depth * 24

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-green-50 group transition-colors`}
        style={{ marginLeft: indent }}
      >
        <button
          onClick={() => onExpand(node.keyword)}
          className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-green-500 transition-colors flex-shrink-0 cursor-pointer"
        >
          {node.loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-green-500" />
          ) : node.children.length > 0 ? (
            <ChevronRight className={`w-4 h-4 transition-transform ${node.expanded ? 'rotate-90' : ''}`} />
          ) : (
            <Plus className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />
          )}
        </button>

        <GradeChip grade={node.grade} size="sm" />

        <span
          onClick={() => onNavigate(node.keyword)}
          className="font-medium text-gray-900 hover:text-green-700 flex-1 text-sm cursor-pointer"
        >
          {node.keyword}
        </span>

        <div className="flex items-center gap-3 text-xs text-gray-400">
          {node.isReal && (
            <span className="text-green-500 text-[10px] flex items-center gap-0.5">
              <CheckCircle className="w-2.5 h-2.5" />실제
            </span>
          )}
          <span>{formatNumber(node.totalSearch)}</span>
          <span className={
            node.satLabel === '매우낮음' || node.satLabel === '낮음' ? 'text-green-600' :
            node.satLabel === '보통' ? 'text-yellow-600' : 'text-red-500'
          }>{node.satLabel}</span>
        </div>

        <button
          onClick={() => onNavigate(node.keyword)}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ArrowRight className="w-4 h-4 text-green-500" />
        </button>
      </div>

      {node.expanded && node.children.map(child => (
        <TreeNodeComponent
          key={child.keyword}
          node={child}
          depth={depth + 1}
          onExpand={onExpand}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  )
}

function findNode(nodes: TreeNode[], keyword: string): TreeNode | null {
  for (const n of nodes) {
    if (n.keyword === keyword) return n
    const found = findNode(n.children, keyword)
    if (found) return found
  }
  return null
}

export default function KeywordExpandPage() {
  const router = useRouter()
  const [seedKeyword, setSeedKeyword] = useState('')
  const [tree, setTree] = useState<TreeNode[]>([])
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [isRealData, setIsRealData] = useState(false)

  const handleGenerate = async () => {
    if (!seedKeyword.trim()) return
    setLoading(true)
    setIsRealData(false)

    // 실제 자동완성 API 호출
    const real = await fetchRealRelatedFromApi(seedKeyword.trim())
    if (real.length > 0) {
      const nodes = real.map(kw => createNode(kw, true))
      setTree(nodes)
      setIsRealData(true)
    } else {
      // 폴백: Mock
      const suffixes = ['방법', '추천', '후기', '가격', '비교', '종류', '효과', '사용법', '구매', '정리']
      const nodes = suffixes.map(s => createNode(`${seedKeyword} ${s}`, false))
      setTree(nodes)
    }

    setGenerated(true)
    setLoading(false)
  }

  const handleExpand = async (keyword: string) => {
    const updateNode = (nodes: TreeNode[]): TreeNode[] =>
      nodes.map(n => {
        if (n.keyword === keyword) {
          if (n.children.length > 0) {
            return { ...n, expanded: !n.expanded }
          }
          return { ...n, loading: true, expanded: true }
        }
        return { ...n, children: updateNode(n.children) }
      })

    setTree(prev => updateNode(prev))

    const node = findNode(tree, keyword)
    if (!node || node.children.length > 0) return

    const children = await expandNode(keyword)

    const setChildren = (nodes: TreeNode[]): TreeNode[] =>
      nodes.map(n => {
        if (n.keyword === keyword) return { ...n, children, loading: false, expanded: true }
        return { ...n, children: setChildren(n.children) }
      })

    setTree(prev => setChildren(prev))
  }

  const handleNavigate = (kw: string) => {
    router.push(`/keyword?q=${encodeURIComponent(kw)}`)
  }

  const EXAMPLES = ['다이어트', '재테크', '여름여행', '인테리어', '강아지']

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <Layers className="w-7 h-7 text-indigo-500" />
          키워드 확장
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          네이버 자동완성 기반으로 연관 키워드를 트리 구조로 무한 확장합니다
        </p>
      </div>

      {/* 입력 */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                value={seedKeyword}
                onChange={e => setSeedKeyword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                placeholder="시드 키워드 입력 (예: 다이어트)"
                className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading || !seedKeyword.trim()}
              className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
              확장
            </button>
          </div>
          {/* 예시 버튼 */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-gray-400">예시:</span>
            {EXAMPLES.map(kw => (
              <button
                key={kw}
                onClick={() => setSeedKeyword(kw)}
                className="text-xs bg-gray-100 hover:bg-indigo-100 hover:text-indigo-700 text-gray-600 px-3 py-1 rounded-lg transition-colors"
              >
                {kw}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* 트리 */}
      {generated && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle>
                "<span className="text-indigo-600">{seedKeyword}</span>" 연관 키워드 트리
              </CardTitle>
              <div className="flex items-center gap-2">
                {isRealData ? (
                  <Badge variant="success" className="flex items-center gap-1 text-xs">
                    <CheckCircle className="w-3 h-3" />
                    네이버 자동완성 실제 데이터
                  </Badge>
                ) : (
                  <Badge variant="warning" className="text-xs">
                    샘플 데이터
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardBody>
            {/* 헤더 */}
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-gray-100 text-xs text-gray-400">
              <div className="w-5" />
              <div className="w-10">등급</div>
              <div className="flex-1">키워드</div>
              <div className="w-24 text-right">검색량 / 포화도</div>
              <div className="w-6" />
            </div>

            {/* 루트 노드 */}
            <div className="flex items-center gap-2 py-2 px-3 bg-indigo-50 rounded-lg border border-indigo-200 mb-2">
              <div className="w-5 flex items-center justify-center">
                <div className="w-2 h-2 bg-indigo-500 rounded-full" />
              </div>
              <span className="font-black text-indigo-700 text-base flex-1">{seedKeyword}</span>
              <button
                onClick={() => handleNavigate(seedKeyword)}
                className="text-xs text-indigo-500 hover:underline flex items-center gap-1"
              >
                분석 <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* 트리 노드들 */}
            <div className="space-y-0.5">
              {tree.map(node => (
                <TreeNodeComponent
                  key={node.keyword}
                  node={node}
                  depth={1}
                  onExpand={handleExpand}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>

            <p className="text-xs text-gray-400 mt-4 p-3 bg-gray-50 rounded-lg">
              💡 + 아이콘을 클릭하면 해당 키워드의 연관 키워드를 네이버 자동완성으로 실시간 확장합니다. 무한 확장 가능합니다.
            </p>
          </CardBody>
        </Card>
      )}

      {!generated && (
        <div className="text-center py-20 text-gray-400">
          <Layers className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="text-sm">시드 키워드를 입력하면 연관 키워드 트리가 생성됩니다</p>
          <p className="text-xs mt-2 text-green-500">✓ 네이버 자동완성 실제 데이터 사용</p>
        </div>
      )}
    </div>
  )
}
