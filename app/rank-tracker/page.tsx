'use client'
import { useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatNumberFull } from '@/lib/utils'
import { Plus, Trash2, TrendingUp, TrendingDown, Minus, BarChart2, ExternalLink, Settings } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Project {
  id: string
  name: string
  url: string
  keywords: KeywordItem[]
}

interface KeywordItem {
  id: string
  keyword: string
  currentRank: number | null
  prevRank: number | null
  platform: 'naver' | 'google'
  history: { date: string; rank: number | null }[]
}

const DEMO_PROJECTS: Project[] = [
  {
    id: '1',
    name: '내 블로그',
    url: 'myblog.tistory.com',
    keywords: [
      {
        id: 'k1',
        keyword: '다이어트 방법',
        currentRank: 3,
        prevRank: 5,
        platform: 'naver',
        history: [
          { date: '05/10', rank: 8 },
          { date: '05/11', rank: 7 },
          { date: '05/12', rank: 5 },
          { date: '05/13', rank: 5 },
          { date: '05/14', rank: 4 },
          { date: '05/15', rank: 3 },
          { date: '05/16', rank: 3 },
        ],
      },
      {
        id: 'k2',
        keyword: '재테크 방법',
        currentRank: 12,
        prevRank: 9,
        platform: 'naver',
        history: [
          { date: '05/10', rank: 7 },
          { date: '05/11', rank: 8 },
          { date: '05/12', rank: 9 },
          { date: '05/13', rank: 10 },
          { date: '05/14', rank: 11 },
          { date: '05/15', rank: 12 },
          { date: '05/16', rank: 12 },
        ],
      },
      {
        id: 'k3',
        keyword: '노트북 추천',
        currentRank: null,
        prevRank: null,
        platform: 'naver',
        history: [],
      },
    ],
  },
]

function RankBadge({ rank }: { rank: number | null }) {
  if (!rank) return <span className="text-gray-400 text-sm">-</span>
  const color = rank <= 3 ? 'bg-green-500 text-white' : rank <= 10 ? 'bg-blue-500 text-white' : rank <= 20 ? 'bg-yellow-500 text-white' : 'bg-gray-300 text-gray-700'
  return <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${color}`}>{rank}</span>
}

function RankChange({ current, prev }: { current: number | null; prev: number | null }) {
  if (!current || !prev) return <Minus className="w-4 h-4 text-gray-300" />
  const diff = prev - current
  if (diff > 0) return <span className="flex items-center gap-0.5 text-green-600 text-xs font-bold"><TrendingUp className="w-3 h-3" />+{diff}</span>
  if (diff < 0) return <span className="flex items-center gap-0.5 text-red-500 text-xs font-bold"><TrendingDown className="w-3 h-3" />{diff}</span>
  return <Minus className="w-4 h-4 text-gray-300" />
}

export default function RankTrackerPage() {
  const [projects, setProjects] = useState<Project[]>(DEMO_PROJECTS)
  const [activeProject, setActiveProject] = useState(DEMO_PROJECTS[0].id)
  const [showAddProject, setShowAddProject] = useState(false)
  const [showAddKeyword, setShowAddKeyword] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectUrl, setNewProjectUrl] = useState('')
  const [newKeyword, setNewKeyword] = useState('')
  const [selectedKeyword, setSelectedKeyword] = useState<KeywordItem | null>(null)

  const project = projects.find(p => p.id === activeProject)

  const addProject = () => {
    if (!newProjectName.trim()) return
    const newP: Project = {
      id: Date.now().toString(),
      name: newProjectName,
      url: newProjectUrl,
      keywords: [],
    }
    setProjects([...projects, newP])
    setActiveProject(newP.id)
    setNewProjectName('')
    setNewProjectUrl('')
    setShowAddProject(false)
  }

  const addKeyword = () => {
    if (!newKeyword.trim() || !project) return
    const newKw: KeywordItem = {
      id: Date.now().toString(),
      keyword: newKeyword,
      currentRank: null,
      prevRank: null,
      platform: 'naver',
      history: [],
    }
    setProjects(ps => ps.map(p =>
      p.id === activeProject ? { ...p, keywords: [...p.keywords, newKw] } : p
    ))
    setNewKeyword('')
    setShowAddKeyword(false)
  }

  const deleteKeyword = (kwId: string) => {
    setProjects(ps => ps.map(p =>
      p.id === activeProject ? { ...p, keywords: p.keywords.filter(k => k.id !== kwId) } : p
    ))
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <BarChart2 className="w-7 h-7 text-blue-500" />
            검색 순위 추적
          </h1>
          <p className="text-gray-500 text-sm mt-1">프로젝트별 키워드 순위 변화를 매일 자동 추적합니다</p>
        </div>
        <Badge variant="info">매일 자동 갱신</Badge>
      </div>

      <div className="flex gap-6">
        {/* 프로젝트 사이드바 */}
        <div className="w-52 flex-shrink-0 space-y-2">
          <div className="text-xs text-gray-400 font-semibold uppercase px-2 mb-1">프로젝트</div>
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => setActiveProject(p.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeProject === p.id ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-gray-400 truncate">{p.url}</div>
              <div className="text-xs text-gray-400 mt-0.5">{p.keywords.length}개 키워드</div>
            </button>
          ))}
          {showAddProject ? (
            <div className="p-3 border border-blue-200 rounded-lg space-y-2">
              <input
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                placeholder="프로젝트 이름"
                className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <input
                value={newProjectUrl}
                onChange={e => setNewProjectUrl(e.target.value)}
                placeholder="사이트 URL"
                className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <div className="flex gap-1">
                <button onClick={addProject} className="flex-1 text-xs bg-blue-500 text-white py-1.5 rounded">추가</button>
                <button onClick={() => setShowAddProject(false)} className="flex-1 text-xs bg-gray-100 text-gray-600 py-1.5 rounded">취소</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddProject(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-dashed border-gray-200 hover:border-blue-300 transition-colors"
            >
              <Plus className="w-4 h-4" />
              프로젝트 추가
            </button>
          )}
        </div>

        {/* 메인 영역 */}
        <div className="flex-1 space-y-5">
          {project && (
            <>
              {/* 프로젝트 헤더 */}
              <Card>
                <CardBody className="flex items-center justify-between py-3">
                  <div>
                    <h2 className="font-bold text-gray-900">{project.name}</h2>
                    <a href={`https://${project.url}`} target="_blank" className="text-xs text-gray-400 hover:text-blue-500 flex items-center gap-1">
                      {project.url} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <button className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:border-gray-400 flex items-center gap-1">
                      <Settings className="w-3 h-3" />
                      설정
                    </button>
                    {showAddKeyword ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={newKeyword}
                          onChange={e => setNewKeyword(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addKeyword()}
                          placeholder="키워드 입력"
                          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <button onClick={addKeyword} className="text-sm bg-blue-500 text-white px-3 py-1.5 rounded-lg">추가</button>
                        <button onClick={() => setShowAddKeyword(false)} className="text-sm text-gray-400 px-2 py-1.5">취소</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAddKeyword(true)}
                        className="text-sm bg-blue-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-600"
                      >
                        <Plus className="w-4 h-4" />
                        키워드 추가
                      </button>
                    )}
                  </div>
                </CardBody>
              </Card>

              {/* 키워드 테이블 */}
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-3 text-xs text-gray-500">키워드</th>
                        <th className="text-center px-4 py-3 text-xs text-gray-500">현재 순위</th>
                        <th className="text-center px-4 py-3 text-xs text-gray-500">변화</th>
                        <th className="text-center px-4 py-3 text-xs text-gray-500">7일 추이</th>
                        <th className="text-center px-4 py-3 text-xs text-gray-500">플랫폼</th>
                        <th className="text-right px-4 py-3 text-xs text-gray-500">관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.keywords.map(kw => (
                        <tr key={kw.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setSelectedKeyword(selectedKeyword?.id === kw.id ? null : kw)}
                              className="font-medium text-gray-800 hover:text-blue-600 text-left"
                            >
                              {kw.keyword}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <RankBadge rank={kw.currentRank} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <RankChange current={kw.currentRank} prev={kw.prevRank} />
                          </td>
                          <td className="px-4 py-3">
                            {kw.history.length > 0 ? (
                              <div className="w-24 h-8">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={kw.history}>
                                    <Line type="monotone" dataKey="rank" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            ) : <span className="text-gray-300 text-xs">추적 대기</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${kw.platform === 'naver' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                              {kw.platform === 'naver' ? 'N' : 'G'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => deleteKeyword(kw.id)}
                              className="text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {project.keywords.length === 0 && (
                    <div className="text-center py-16 text-gray-400">
                      <BarChart2 className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                      <p>키워드를 추가하면 매일 순위를 자동으로 추적합니다</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* 선택 키워드 상세 그래프 */}
              {selectedKeyword && selectedKeyword.history.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>"{selectedKeyword.keyword}" 순위 변화 상세</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={selectedKeyword.history} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis reversed tick={{ fontSize: 11 }} domain={['dataMin - 2', 'dataMax + 2']} />
                        <Tooltip formatter={(v: number) => [`${v}위`, '순위']} contentStyle={{ fontSize: 12 }} />
                        <Line type="monotone" dataKey="rank" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-gray-400 text-center mt-2">* Y축은 역순 (1위가 최상단)</p>
                  </CardBody>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
