'use client'

import { useState, useEffect } from 'react'

interface PipelineOverview {
  raw_data_records: number
  processed_data_records: number
  processing_ratio: number
  last_updated: string
}

interface SourceStats {
  source_name: string
  source_type: string
  reliability_weight: number
  raw_records: number
  avg_quality_score: number
  is_active: boolean
}

interface CountryStats {
  country__code: string
  country__name: string
  total_records: number
  total_amount: string
  avg_confidence: number
}

interface SectorStats {
  sector__code: string
  sector__name: string
  total_records: number
  total_amount: string
  avg_confidence: number
}

interface DataPipelinePanelProps {
  apiBaseUrl: string
}

export default function DataPipelinePanel({ apiBaseUrl }: DataPipelinePanelProps) {
  const [overview, setOverview] = useState<PipelineOverview | null>(null)
  const [sourceStats, setSourceStats] = useState<SourceStats[]>([])
  const [countryStats, setCountryStats] = useState<CountryStats[]>([])
  const [sectorStats, setSectorStats] = useState<SectorStats[]>([])
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'overview' | 'sources' | 'countries' | 'sectors'>('overview')

  useEffect(() => {
    fetchPipelineOverview()
  }, [])

  const fetchPipelineOverview = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${apiBaseUrl}/pipeline/overview/`)
      if (!response.ok) throw new Error('Failed to fetch pipeline overview')
      
      const data = await response.json()
      setOverview(data.pipeline_overview)
      setSourceStats(data.source_statistics)
      setCountryStats(data.country_statistics)
      setSectorStats(data.sector_statistics)
    } catch (error) {
      console.error('파이프라인 개요 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number | string) => {
    const n = typeof num === 'string' ? parseFloat(num) : num
    if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
    return n.toLocaleString()
  }

  const getSourceTypeColor = (type: string) => {
    switch (type) {
      case 'OFFICIAL': return 'bg-green-100 text-green-800'
      case 'PRIVATE_DB': return 'bg-blue-100 text-blue-800'
      case 'CRAWLED': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getQualityColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600'
    if (score >= 0.7) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">데이터 파이프라인 현황</h3>
        <div className="mt-2 flex space-x-4">
          {[
            { key: 'overview', label: '전체 개요' },
            { key: 'sources', label: '소스별 현황' },
            { key: 'countries', label: '국가별 현황' },
            { key: 'sectors', label: '분야별 현황' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveView(key as any)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                activeView === key
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {activeView === 'overview' && overview && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-blue-600">원시 데이터</p>
                  <p className="text-2xl font-bold text-blue-900">{formatNumber(overview.raw_data_records)}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-green-600">정제된 데이터</p>
                  <p className="text-2xl font-bold text-green-900">{formatNumber(overview.processed_data_records)}</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-purple-600">처리 비율</p>
                  <p className="text-2xl font-bold text-purple-900">{(overview.processing_ratio * 100).toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'sources' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">소스명</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">타입</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">신뢰도</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">레코드 수</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">평균 품질</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sourceStats.map((source) => (
                  <tr key={source.source_name}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {source.source_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSourceTypeColor(source.source_type)}`}>
                        {source.source_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {source.reliability_weight.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(source.raw_records)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${getQualityColor(source.avg_quality_score)}`}>
                        {source.avg_quality_score.toFixed(3)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        source.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {source.is_active ? '활성' : '비활성'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeView === 'countries' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">국가</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">레코드 수</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">총 투자액</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">평균 신뢰도</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {countryStats.slice(0, 15).map((country) => (
                  <tr key={country.country__code}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-6 w-8">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {country.country__code}
                          </span>
                        </div>
                        <div className="ml-2">
                          <div className="text-sm font-medium text-gray-900">{country.country__name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(country.total_records)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${formatNumber(country.total_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${getQualityColor(country.avg_confidence)}`}>
                        {country.avg_confidence.toFixed(3)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeView === 'sectors' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">분야</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">레코드 수</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">총 투자액</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">평균 신뢰도</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sectorStats.map((sector) => (
                  <tr key={sector.sector__code}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-6 w-12">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {sector.sector__code}
                          </span>
                        </div>
                        <div className="ml-2">
                          <div className="text-sm font-medium text-gray-900">{sector.sector__name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(sector.total_records)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${formatNumber(sector.total_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${getQualityColor(sector.avg_confidence)}`}>
                        {sector.avg_confidence.toFixed(3)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <button
          onClick={fetchPipelineOverview}
          className="text-sm text-blue-600 hover:text-blue-500 transition-colors"
        >
          새로고침
        </button>
      </div>
    </div>
  )
}
