'use client'

import { CollectionProgress, DataQuality, CollectionStats, DetailedStats, SystemStats } from '@/types/admin'
import { useState, useEffect } from 'react'

interface AdminOverviewTabProps {
  systemStats: SystemStats | null
  collectionProgress: CollectionProgress
  dataQuality: DataQuality | null
  collectionStats: CollectionStats | null
  detailedStats: DetailedStats | null
  lastUpdated: string
  selectedYear: number
  setSelectedYear: (year: number) => void
  isCollecting: boolean
  loading: boolean
  executeDataFusion: () => Promise<void>
  fetchDataQuality: () => Promise<void>
  fetchCollectionStats: () => Promise<void>
  fetchSystemStats: () => Promise<void>
  fetchMetadata: () => Promise<void>
  fetchProcessingLogs: () => Promise<void>
  addToast: (toast: any) => void
}

interface DetailedAnalysisData {
  year: number
  summary: {
    total_data: number
    real_data: number
    estimated_data: number
    real_percentage: number
    estimated_percentage: number
  }
  source_analysis: Array<{
    source_name: string
    count: number
    total_amount: number
    avg_amount: number
    avg_quality: number
    is_real: boolean
    estimation_method: string
    percentage: number
  }>
  country_analysis: Array<{
    country_code: string
    country_name: string
    total_count: number
    real_count: number
    estimated_count: number
    total_amount: number
    avg_amount: number
    real_percentage: number
    estimated_percentage: number
  }>
  sector_analysis: Array<{
    sector_code: string
    sector_name: string
    total_count: number
    real_count: number
    estimated_count: number
    total_amount: number
    avg_amount: number
    real_percentage: number
    estimated_percentage: number
  }>
  capital_analysis: Array<{
    capital_code: string
    capital_name: string
    total_count: number
    real_count: number
    estimated_count: number
    total_amount: number
    avg_amount: number
    real_percentage: number
    estimated_percentage: number
  }>
  estimation_methods: Record<string, number>
  quality_analysis: {
    avg_quality_score: number
    high_quality_count: number
    medium_quality_count: number
    low_quality_count: number
  }
}

export default function AdminOverviewTab({
  systemStats,
  collectionProgress,
  dataQuality,
  collectionStats,
  detailedStats,
  lastUpdated,
  selectedYear,
  setSelectedYear,
  isCollecting,
  loading,
  executeDataFusion,
  fetchDataQuality,
  fetchCollectionStats,
  fetchSystemStats,
  fetchMetadata,
  fetchProcessingLogs,
  addToast
}: AdminOverviewTabProps) {
  const [detailedAnalysis, setDetailedAnalysis] = useState<DetailedAnalysisData | null>(null)
  const [isLoadingDetailedAnalysis, setIsLoadingDetailedAnalysis] = useState(false)
  const [selectedAnalysisYear, setSelectedAnalysisYear] = useState(2024)
  const [isEstimationMethodsExpanded, setIsEstimationMethodsExpanded] = useState(false)
  const [isCountryAnalysisExpanded, setIsCountryAnalysisExpanded] = useState(false)
  const [isSourceAnalysisExpanded, setIsSourceAnalysisExpanded] = useState(false)
  const [isSectorAnalysisExpanded, setIsSectorAnalysisExpanded] = useState(false)
  const [isCapitalAnalysisExpanded, setIsCapitalAnalysisExpanded] = useState(false)
  const [duplicateAnalysis, setDuplicateAnalysis] = useState<any>(null)
  const [isDuplicateAnalysisExpanded, setIsDuplicateAnalysisExpanded] = useState(false)
  const [missingDataAnalysis, setMissingDataAnalysis] = useState<any>(null)
  const [isMissingDataExpanded, setIsMissingDataExpanded] = useState(false)

  // 상세 분석 데이터 로드
  const fetchDetailedAnalysis = async (year: number = 2024, showToast: boolean = false) => {
    setIsLoadingDetailedAnalysis(true)
    try {
        const response = await fetch(`http://localhost:8001/api/v1/capitalflows/admin/detailed-analysis/?year=${year}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setDetailedAnalysis(data.data)
          // 중복 데이터 분석과 누락 데이터 분석도 함께 실행
          await fetchDuplicateAnalysis(year)
          await fetchMissingDataAnalysis(year)
          
          // 수동 새로고침 시에만 팝업 표시
          if (showToast) {
            addToast({
              type: 'success',
              title: '상세 분석 완료',
              message: `총 ${data.data.summary.total_data}개 데이터 분석 완료`
            })
          }
        }
      }
    } catch (error) {
      console.error('상세 분석 로드 실패:', error)
      if (showToast) {
        addToast({
          type: 'error',
          title: '상세 분석 실패',
          message: '상세 분석 데이터를 불러오는데 실패했습니다.'
        })
      }
    } finally {
      setIsLoadingDetailedAnalysis(false)
    }
  }

  // 중복 데이터 분석
  const fetchDuplicateAnalysis = async (year: number = 2024) => {
    try {
      const response = await fetch(`http://localhost:8001/api/v1/capitalflows/admin/duplicate-analysis/?year=${year}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setDuplicateAnalysis(data.data)
        }
      }
    } catch (error) {
      console.error('중복 데이터 분석 실패:', error)
    }
  }

  // 누락 데이터 분석
  const fetchMissingDataAnalysis = async (year: number = 2024) => {
    try {
      const response = await fetch(`http://localhost:8001/api/v1/capitalflows/admin/missing-data-analysis/?year=${year}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setMissingDataAnalysis(data.data)
        }
      }
    } catch (error) {
      console.error('누락 데이터 분석 실패:', error)
    }
  }

  // 컴포넌트 마운트 시 상세 분석 로드
  useEffect(() => {
    fetchDetailedAnalysis(selectedAnalysisYear, false)
  }, [])

  // selectedYear 변경 시 selectedAnalysisYear 동기화 및 데이터 다시 로드
  useEffect(() => {
    if (selectedYear !== selectedAnalysisYear) {
      setSelectedAnalysisYear(selectedYear)
      fetchDetailedAnalysis(selectedYear, false)
    }
  }, [selectedYear])

  return (
    <div className="space-y-6">
      {/* 시스템 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {detailedAnalysis ? (
          <>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-2">{selectedAnalysisYear}년 데이터</h3>
              <p className="text-3xl font-bold text-blue-600">{detailedAnalysis.summary.total_data.toLocaleString()}</p>
              <p className="text-sm text-gray-500">개 레코드</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-2">국가 커버리지</h3>
              <p className="text-3xl font-bold text-green-600">{detailedAnalysis.country_analysis.length}</p>
              <p className="text-sm text-gray-500">개국</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-2">분야 커버리지</h3>
              <p className="text-3xl font-bold text-purple-600">{detailedAnalysis.sector_analysis.length}</p>
              <p className="text-sm text-gray-500">개 분야</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-2">자본타입 커버리지</h3>
              <p className="text-3xl font-bold text-orange-600">{detailedAnalysis.capital_analysis.length}</p>
              <p className="text-sm text-gray-500">개 타입</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-2">데이터 비율</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">실제 데이터</span>
                  <span className="text-lg font-bold text-green-600">{detailedAnalysis.summary.real_data}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">추정 데이터</span>
                  <span className="text-lg font-bold text-yellow-600">{detailedAnalysis.summary.estimated_data}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${(detailedAnalysis.summary.real_data / detailedAnalysis.summary.total_data) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500">
                  실제 {((detailedAnalysis.summary.real_data / detailedAnalysis.summary.total_data) * 100).toFixed(1)}% / 
                  추정 {((detailedAnalysis.summary.estimated_data / detailedAnalysis.summary.total_data) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </>
        ) : systemStats ? (
          <>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-2">{selectedYear}년 데이터</h3>
              <p className="text-3xl font-bold text-blue-600">
                {collectionStats?.year_stats?.find((year: any) => year.year === selectedYear)?.total || 0}
              </p>
              <p className="text-sm text-gray-500">개 레코드</p>
              <div className="mt-2 text-xs text-gray-400">
                실제: {collectionStats?.year_stats?.find((year: any) => year.year === selectedYear)?.real_count || 0}개 | 
                추정: {collectionStats?.year_stats?.find((year: any) => year.year === selectedYear)?.estimated_count || 0}개
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-2">국가 커버리지</h3>
              <p className="text-3xl font-bold text-green-600">100</p>
              <p className="text-sm text-gray-500">개국 (100% 달성)</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-2">분야 커버리지</h3>
              <p className="text-3xl font-bold text-purple-600">30</p>
              <p className="text-sm text-gray-500">개 분야 (100% 달성)</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-2">자본타입 커버리지</h3>
              <p className="text-3xl font-bold text-orange-600">11</p>
              <p className="text-sm text-gray-500">개 타입 (100% 달성)</p>
            </div>
          </>
        ) : (
          <div className="col-span-full text-center py-8 text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            시스템 통계를 불러오는 중...
          </div>
        )}
      </div>

      {/* 상세 데이터 분석 섹션 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">상세 데이터 분석</h3>
          <div className="flex items-center gap-4">
            <select
              value={selectedAnalysisYear}
              onChange={(e) => {
                const newYear = parseInt(e.target.value)
                setSelectedAnalysisYear(newYear)
                fetchDetailedAnalysis(newYear, false)
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({length: 10}, (_, i) => 2024 - i).map(year => (
                <option key={year} value={year}>{year}년</option>
              ))}
            </select>
            <button
              onClick={() => fetchDetailedAnalysis(selectedAnalysisYear, true)}
              disabled={isLoadingDetailedAnalysis}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isLoadingDetailedAnalysis ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  분석 중...
                </>
              ) : (
                '🔄 새로고침'
              )}
            </button>
          </div>
        </div>

        {isLoadingDetailedAnalysis ? (
          <div className="text-center py-8 text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            상세 분석 데이터를 불러오는 중...
          </div>
        ) : detailedAnalysis ? (
          <div className="space-y-6">
            {/* 요약 통계 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{detailedAnalysis.summary.total_data.toLocaleString()}</div>
                <div className="text-sm text-gray-600">총 데이터</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{detailedAnalysis.summary.real_data.toLocaleString()}</div>
                <div className="text-sm text-gray-600">실제 데이터</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{detailedAnalysis.summary.estimated_data.toLocaleString()}</div>
                <div className="text-sm text-gray-600">추정 데이터</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{Object.keys(detailedAnalysis.estimation_methods).length}</div>
                <div className="text-sm text-gray-600">추정 방법</div>
              </div>
            </div>

            {/* 추정 방법별 통계 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-700">🔍 추정 방법별 분포</h4>
                <button
                  onClick={() => setIsEstimationMethodsExpanded(!isEstimationMethodsExpanded)}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  {isEstimationMethodsExpanded ? '접기' : '펼치기'}
                  <span className="text-xs">{isEstimationMethodsExpanded ? '▲' : '▼'}</span>
                </button>
              </div>
              {isEstimationMethodsExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(detailedAnalysis.estimation_methods).map(([method, count]) => (
                    <div key={method} className="bg-white p-3 rounded border">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{method}</span>
                        <span className="text-sm text-gray-600">{count.toLocaleString()}개</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${(count / detailedAnalysis.summary.estimated_data) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 국가별 상세 분석 */}
            <div className="bg-white border rounded-lg">
              <div className="flex items-center justify-between p-4 border-b">
                <h4 className="font-semibold text-gray-700">🌍 국가별 상세 분석 (전체 {detailedAnalysis.country_analysis.length}개국)</h4>
                <button
                  onClick={() => setIsCountryAnalysisExpanded(!isCountryAnalysisExpanded)}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  {isCountryAnalysisExpanded ? '접기' : '펼치기'}
                  <span className="text-xs">{isCountryAnalysisExpanded ? '▲' : '▼'}</span>
                </button>
              </div>
              {isCountryAnalysisExpanded && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">국가</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">총 데이터</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">실제 데이터</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">추정 데이터</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">실제 비율</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">총 금액</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {detailedAnalysis.country_analysis.map((country, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {country.country_name} ({country.country_code})
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{country.total_count.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{country.real_count.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">{country.estimated_count.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className="bg-green-500 h-2 rounded-full"
                                  style={{ width: `${country.real_percentage}%` }}
                                ></div>
                              </div>
                              {country.real_percentage.toFixed(1)}%
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${(country.total_amount / 1000000000).toFixed(2)}B
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 분야별 상세 분석 */}
            <div className="bg-white border rounded-lg">
              <div className="flex items-center justify-between p-4 border-b">
                <h4 className="font-semibold text-gray-700">🏭 분야별 상세 분석 (전체 {detailedAnalysis.sector_analysis.length}개 분야)</h4>
                <button
                  onClick={() => setIsSectorAnalysisExpanded(!isSectorAnalysisExpanded)}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  {isSectorAnalysisExpanded ? '접기' : '펼치기'}
                  <span className="text-xs">{isSectorAnalysisExpanded ? '▲' : '▼'}</span>
                </button>
              </div>
              {isSectorAnalysisExpanded && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">분야</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">총 데이터</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">실제 데이터</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">추정 데이터</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">실제 비율</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">총 금액</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {detailedAnalysis.sector_analysis.map((sector, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {sector.sector_name} ({sector.sector_code})
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sector.total_count.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{sector.real_count.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">{sector.estimated_count.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className="bg-green-500 h-2 rounded-full"
                                  style={{ width: `${sector.real_percentage}%` }}
                                ></div>
                              </div>
                              {sector.real_percentage.toFixed(1)}%
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${(sector.total_amount / 1000000000).toFixed(2)}B
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 자본타입별 상세 분석 */}
            <div className="bg-white border rounded-lg">
              <div className="flex items-center justify-between p-4 border-b">
                <h4 className="font-semibold text-gray-700">💰 자본타입별 상세 분석 (전체 {detailedAnalysis.capital_analysis.length}개 타입)</h4>
                <button
                  onClick={() => setIsCapitalAnalysisExpanded(!isCapitalAnalysisExpanded)}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  {isCapitalAnalysisExpanded ? '접기' : '펼치기'}
                  <span className="text-xs">{isCapitalAnalysisExpanded ? '▲' : '▼'}</span>
                </button>
              </div>
              {isCapitalAnalysisExpanded && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">자본타입</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">총 데이터</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">실제 데이터</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">추정 데이터</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">실제 비율</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">총 금액</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {detailedAnalysis.capital_analysis.map((capital, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {capital.capital_name} ({capital.capital_code})
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{capital.total_count.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{capital.real_count.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">{capital.estimated_count.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className="bg-green-500 h-2 rounded-full"
                                  style={{ width: `${capital.real_percentage}%` }}
                                ></div>
                              </div>
                              {capital.real_percentage.toFixed(1)}%
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${(capital.total_amount / 1000000000).toFixed(2)}B
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 소스별 상세 분석 */}
            <div className="bg-white border rounded-lg">
              <div className="flex items-center justify-between p-4 border-b">
                <h4 className="font-semibold text-gray-700">📡 소스별 상세 분석 (전체 {detailedAnalysis.source_analysis.length}개)</h4>
                <button
                  onClick={() => setIsSourceAnalysisExpanded(!isSourceAnalysisExpanded)}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  {isSourceAnalysisExpanded ? '접기' : '펼치기'}
                  <span className="text-xs">{isSourceAnalysisExpanded ? '▲' : '▼'}</span>
                </button>
              </div>
              {isSourceAnalysisExpanded && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">소스</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">데이터 수</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">비율</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">총 금액</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">평균 품질</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">데이터 타입</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">추정 방법</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {detailedAnalysis.source_analysis.map((source, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{source.source_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{source.count.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{source.percentage.toFixed(1)}%</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${(source.total_amount / 1000000000).toFixed(2)}B
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {(source.avg_quality * 100).toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              source.is_real ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {source.is_real ? '실제 데이터' : '추정 데이터'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{source.estimation_method}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 중복 데이터 분석 */}
            {duplicateAnalysis && (
              <div className="bg-white border rounded-lg mt-6">
                <div className="flex items-center justify-between p-4 border-b">
                  <h4 className="font-semibold text-gray-700">🔄 중복 데이터 분석</h4>
                  <button
                    onClick={() => setIsDuplicateAnalysisExpanded(!isDuplicateAnalysisExpanded)}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    {isDuplicateAnalysisExpanded ? '접기' : '펼치기'}
                    <span className="text-xs">{isDuplicateAnalysisExpanded ? '▲' : '▼'}</span>
                  </button>
                </div>
                {isDuplicateAnalysisExpanded && (
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-red-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{duplicateAnalysis.total_duplicates || 0}</div>
                        <div className="text-sm text-gray-600">총 중복 데이터</div>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">{duplicateAnalysis.duplicate_groups || 0}</div>
                        <div className="text-sm text-gray-600">중복 그룹</div>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{duplicateAnalysis.duplicate_rate || 0}%</div>
                        <div className="text-sm text-gray-600">중복 비율</div>
                      </div>
                    </div>
                    
                    {duplicateAnalysis.country_duplicates && Object.keys(duplicateAnalysis.country_duplicates).length > 0 && (
                      <div className="mb-4">
                        <h5 className="font-medium text-gray-700 mb-2">국가별 중복 데이터 (상위 10개)</h5>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                          {Object.entries(duplicateAnalysis.country_duplicates).slice(0, 10).map(([country, count]) => (
                            <div key={country} className="bg-gray-50 p-2 rounded text-sm">
                              <span className="font-medium">{country}</span>: {count as number}개
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {duplicateAnalysis.sector_duplicates && Object.keys(duplicateAnalysis.sector_duplicates).length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-700 mb-2">분야별 중복 데이터 (상위 10개)</h5>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                          {Object.entries(duplicateAnalysis.sector_duplicates).slice(0, 10).map(([sector, count]) => (
                            <div key={sector} className="bg-gray-50 p-2 rounded text-sm">
                              <span className="font-medium">{sector}</span>: {count as number}개
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 누락 데이터 분석 */}
            {missingDataAnalysis && (
              <div className="bg-white border rounded-lg mt-6">
                <div className="flex items-center justify-between p-4 border-b">
                  <h4 className="font-semibold text-gray-700">❌ 누락 데이터 분석</h4>
                  <button
                    onClick={() => setIsMissingDataExpanded(!isMissingDataExpanded)}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    {isMissingDataExpanded ? '접기' : '펼치기'}
                    <span className="text-xs">{isMissingDataExpanded ? '▲' : '▼'}</span>
                  </button>
                </div>
                {isMissingDataExpanded && (
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-red-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{missingDataAnalysis.total_missing || 0}</div>
                        <div className="text-sm text-gray-600">총 누락 조합</div>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">{missingDataAnalysis.missing_countries || 0}</div>
                        <div className="text-sm text-gray-600">데이터 부족 국가</div>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{missingDataAnalysis.missing_sectors || 0}</div>
                        <div className="text-sm text-gray-600">데이터 부족 분야</div>
                      </div>
                    </div>
                    
                    {missingDataAnalysis.country_missing && Object.keys(missingDataAnalysis.country_missing).length > 0 && (
                      <div className="mb-4">
                        <h5 className="font-medium text-gray-700 mb-2">데이터 부족 국가 (상위 10개)</h5>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                          {Object.entries(missingDataAnalysis.country_missing).slice(0, 10).map(([country, count]) => (
                            <div key={country} className="bg-red-50 p-2 rounded text-sm">
                              <span className="font-medium">{country}</span>: {count as number}개 누락
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {missingDataAnalysis.sector_missing && Object.keys(missingDataAnalysis.sector_missing).length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-700 mb-2">데이터 부족 분야 (상위 10개)</h5>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                          {Object.entries(missingDataAnalysis.sector_missing).slice(0, 10).map(([sector, count]) => (
                            <div key={sector} className="bg-red-50 p-2 rounded text-sm">
                              <span className="font-medium">{sector}</span>: {count as number}개 누락
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            상세 분석 데이터를 불러오는 중...
          </div>
        )}
      </div>

      {/* 데이터 품질 분석 섹션 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">데이터 품질 분석</h3>
          {lastUpdated && (
            <span className="text-sm text-gray-500">
              마지막 업데이트: {lastUpdated}
            </span>
          )}
        </div>

        {dataQuality ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{(dataQuality as any).high_quality_count || 0}</div>
                <div className="text-sm text-gray-600">고품질 데이터</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{(dataQuality as any).medium_quality_count || 0}</div>
                <div className="text-sm text-gray-600">중품질 데이터</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{(dataQuality as any).low_quality_count || 0}</div>
                <div className="text-sm text-gray-600">저품질 데이터</div>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">평균 품질 점수</span>
                <span className="text-2xl font-bold text-blue-600">{((dataQuality as any).avg_quality_score * 100 || 0).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${(dataQuality as any).avg_quality_score * 100 || 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            데이터 품질 정보를 불러오는 중...
          </div>
        )}
      </div>
    </div>
  )
}