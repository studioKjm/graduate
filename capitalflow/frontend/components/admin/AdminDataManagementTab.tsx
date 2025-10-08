'use client'

import { CollectionProgress, DataQuality } from '@/types/admin'
import { useState, useEffect } from 'react'

interface AdminDataManagementTabProps {
  selectedDataSource: string
  setSelectedDataSource: (source: string) => void
  selectedYear: number
  setSelectedYear: (year: number) => void
  executeDataCollection: () => Promise<void>
  executeDataFusion: () => Promise<void>
  executeDataValidation: () => Promise<void>
  dataQuality: DataQuality | null
  isCollecting: boolean
  loading: boolean
  collectionProgress: CollectionProgress
  addToast: (toast: any) => void
}

// 자본타입별 무료/오픈 API 소스 목록
const CAPITAL_TYPE_SOURCES = {
  'FDI': [
    { name: 'World Bank', type: 'OFFICIAL', reliability: 0.88, apiKey: false, description: '국가별 FDI 유입·유출 데이터' },
    { name: 'UNCTAD', type: 'OFFICIAL', reliability: 0.90, apiKey: false, description: 'FDI 흐름/스톡 통계' },
    { name: 'IMF BOP', type: 'OFFICIAL', reliability: 0.95, apiKey: false, description: '국제수지·직접투자 데이터' },
    { name: 'Eurostat', type: 'OFFICIAL', reliability: 0.92, apiKey: false, description: 'EU 회원국 FDI 상세' },
    { name: 'BEA (US)', type: 'OFFICIAL', reliability: 0.94, apiKey: false, description: '미국 FDI 통계' }
  ],
  'VC': [
    { name: 'OECD VC', type: 'OFFICIAL', reliability: 0.85, apiKey: false, description: '국가·연도별 VC 총액' },
    { name: 'SEC Form D', type: 'OFFICIAL', reliability: 0.90, apiKey: false, description: '미국 비상장자금 조달' },
    { name: 'Crunchbase Basic', type: 'PRIVATE', reliability: 0.70, apiKey: true, description: '제한적 VC 데이터' }
  ],
  'MA': [
    { name: 'SEC EDGAR', type: 'OFFICIAL', reliability: 0.90, apiKey: false, description: '미국 상장·공시 문서' },
    { name: 'OpenCorporates', type: 'OPEN', reliability: 0.80, apiKey: false, description: '회사 레지스트리·소유구조' },
    { name: 'EU DG-COMP', type: 'OFFICIAL', reliability: 0.85, apiKey: false, description: 'EU 주요 합병 케이스' }
  ],
  'IPO': [
    { name: 'SEC EDGAR', type: 'OFFICIAL', reliability: 0.95, apiKey: false, description: '미국 IPO 등록·공시' },
    { name: 'Finnhub', type: 'PRIVATE', reliability: 0.80, apiKey: true, description: '글로벌 IPO 캘린더' },
    { name: 'FinancialModelingPrep', type: 'PRIVATE', reliability: 0.75, apiKey: true, description: 'IPO 상장내역' }
  ],
  'PE': [
    { name: 'OECD PE', type: 'OFFICIAL', reliability: 0.85, apiKey: false, description: '국가·시계열 PE 통계' },
    { name: 'SEC Form D', type: 'OFFICIAL', reliability: 0.90, apiKey: false, description: '펀드조성 활동' }
  ],
  'BONDS': [
    { name: 'FRED', type: 'OFFICIAL', reliability: 0.94, apiKey: false, description: '채권·금리·발행량 시계열' },
    { name: 'BIS', type: 'OFFICIAL', reliability: 0.92, apiKey: false, description: '국제 채권·증권 통계' },
    { name: 'ECB SDW', type: 'OFFICIAL', reliability: 0.93, apiKey: false, description: '유로존 채권·금융계정' }
  ],
  'FPI': [
    { name: 'IMF CPIS', type: 'OFFICIAL', reliability: 0.90, apiKey: false, description: '포트폴리오 투자 보유/거래' },
    { name: 'OECD', type: 'OFFICIAL', reliability: 0.85, apiKey: false, description: '포트폴리오 계정 통계' }
  ],
  'SWF': [
    { name: 'IFSWF', type: 'PARTIAL', reliability: 0.70, apiKey: false, description: 'SWF 관련 데이터 (부분 공개)' },
    { name: 'GlobalSWF', type: 'PARTIAL', reliability: 0.65, apiKey: false, description: 'SWF 보고서 (부분 공개)' }
  ],
  'GREENFIELD': [
    { name: 'World Bank PPI', type: 'OFFICIAL', reliability: 0.88, apiKey: false, description: '인프라 투자 프로젝트' },
    { name: 'UN Local', type: 'OFFICIAL', reliability: 0.75, apiKey: false, description: '로컬/국가 투자청 자료' }
  ],
  'JV': [
    { name: 'OpenCorporates', type: 'OPEN', reliability: 0.80, apiKey: false, description: '회사 관계·지분 데이터' },
    { name: 'Companies House', type: 'OFFICIAL', reliability: 0.85, apiKey: false, description: 'UK 회사·공시 API' },
    { name: 'EDINET', type: 'OFFICIAL', reliability: 0.80, apiKey: false, description: '일본 공시 API' }
  ],
  'DEVFIN': [
    { name: 'IATI Datastore', type: 'OFFICIAL', reliability: 0.90, apiKey: false, description: 'ODA/공적 금융 프로젝트' },
    { name: 'OECD-DAC', type: 'OFFICIAL', reliability: 0.88, apiKey: false, description: '국가별 ODA 통계' },
    { name: 'AidData', type: 'OPEN', reliability: 0.85, apiKey: false, description: '개발금융 프로젝트 DB' }
  ]
}

export default function AdminDataManagementTab({
  selectedDataSource,
  setSelectedDataSource,
  selectedYear,
  setSelectedYear,
  executeDataCollection,
  executeDataFusion,
  executeDataValidation,
  dataQuality,
  isCollecting,
  loading,
  collectionProgress,
  addToast
}: AdminDataManagementTabProps) {
  const [selectedYearForCollection, setSelectedYearForCollection] = useState(2024)
  const [isCollectingAll, setIsCollectingAll] = useState(false)
  const [isBalancedCollecting, setIsBalancedCollecting] = useState(false)
  const [collectionResults, setCollectionResults] = useState<any>(null)
  const [balancedCollectionResults, setBalancedCollectionResults] = useState<any>(null)
  const [missingCombinations, setMissingCombinations] = useState<any[]>([])
  const [duplicateData, setDuplicateData] = useState<any[]>([])
  const [dataImbalance, setDataImbalance] = useState<any>(null)
  
  const [metadata, setMetadata] = useState({
    countries: [] as Array<{code: string, name: string}>,
    sectors: [] as Array<{code: string, name: string}>,
    capitalTypes: [] as Array<{code: string, name: string}>,
    dataSources: [] as Array<{id: string, name: string, source_type: string}>
  })

  // 메타데이터 로드
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const response = await fetch('http://localhost:8002/api/v1/capitalflows/metadata/')
        if (response.ok) {
          const data = await response.json()
          setMetadata({
            countries: data.countries || [],
            sectors: data.sectors || [],
            capitalTypes: data.capital_types || [],
            dataSources: data.data_sources || []
          })
        }
      } catch (error) {
        console.error('메타데이터 로드 실패:', error)
      }
    }
    fetchMetadata()
  }, [])

  // 데이터 불균형 분석
  const analyzeDataImbalance = async () => {
    try {
      const response = await fetch('http://localhost:8002/api/v1/capitalflows/admin/analyze-imbalance/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: selectedYearForCollection })
      })
      
      if (response.ok) {
        const data = await response.json()
        setDataImbalance(data)
        addToast({
          type: 'success',
          title: '데이터 불균형 분석 완료',
          message: `과다 국가: ${data.excess_countries?.length || 0}개, 부족 국가: ${data.deficit_countries?.length || 0}개`
        })
      }
    } catch (error) {
      console.error('데이터 불균형 분석 실패:', error)
      addToast({
        type: 'error',
        title: '데이터 불균형 분석 실패',
        message: '데이터 불균형 분석 중 오류가 발생했습니다.'
      })
    }
  }

  // 균형 맞춤 수집 실행
  const executeBalancedCollection = async () => {
    setIsBalancedCollecting(true)
    setBalancedCollectionResults(null)
    
    try {
      console.log('⚖️ 균형 맞춤 데이터 수집 시작:', selectedYearForCollection)
      
      const response = await fetch('http://localhost:8002/api/v1/capitalflows/admin/massive-collect/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: selectedYearForCollection,
          balanced_collection: true
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      console.log('📊 균형 맞춤 수집 결과:', result)
      
      if (result.success) {
        setBalancedCollectionResults(result.data)
        
        addToast({
          type: 'success',
          title: '균형 맞춤 데이터 수집 완료',
          message: `총 ${result.data.total_collected}개 데이터 수집 (실제: ${result.data.real_data}, 추정: ${result.data.estimated_data})`
        })
      } else {
        addToast({
          type: 'error',
          title: '균형 맞춤 데이터 수집 실패',
          message: result.message || '알 수 없는 오류가 발생했습니다.'
        })
      }
    } catch (error) {
      console.error('❌ 균형 맞춤 수집 오류:', error)
      
      addToast({
        type: 'error',
        title: '균형 맞춤 데이터 수집 실패',
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      })
    } finally {
      setIsBalancedCollecting(false)
    }
  }

  // 모든 조합 계산
  const calculateAllCombinations = (year: number) => {
    const countries = metadata.countries.length || 32
    const sectors = metadata.sectors.length || 11
    const capitalTypes = metadata.capitalTypes.length || 11
    
    return countries * sectors * capitalTypes
  }

  // 전체 소스 수집 실행
  const executeAllSourcesCollection = async () => {
    setIsCollectingAll(true)
    setCollectionResults(null)
    setMissingCombinations([])
    setDuplicateData([])
    
    try {
      console.log('🚀 전체 소스 데이터 수집 시작:', selectedYearForCollection)
      
      const response = await fetch('http://localhost:8002/api/v1/capitalflows/admin/collect-all-sources/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: selectedYearForCollection,
          collect_all_sources: true,
          calculate_combinations: true
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      console.log('📊 전체 수집 결과:', result)
      
      if (result.success) {
        setCollectionResults(result.data)
        
        // 누락된 조합 분석
        if (result.data.missing_combinations) {
          setMissingCombinations(result.data.missing_combinations)
        }
        
        // 중복 데이터 분석
        if (result.data.duplicate_data) {
          setDuplicateData(result.data.duplicate_data)
        }
        
        addToast({
          type: 'success',
          title: '전체 소스 데이터 수집 완료',
          message: `총 ${result.data.total_collected}개 데이터 수집, ${result.data.total_combinations}개 조합 중 ${result.data.collected_combinations}개 확보`
        })
      } else {
        addToast({
          type: 'error',
          title: '전체 소스 데이터 수집 실패',
          message: result.error || '알 수 없는 오류가 발생했습니다.'
        })
      }
    } catch (error) {
      console.error('❌ 전체 소스 수집 오류:', error)
      
      addToast({
        type: 'error',
        title: '전체 소스 데이터 수집 실패',
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      })
    } finally {
      setIsCollectingAll(false)
    }
  }

  // 신뢰도별 데이터 처리
  const processDataByReliability = (data: any[]) => {
    return data.sort((a, b) => (b.reliability || 0) - (a.reliability || 0))
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">통합 데이터 수집 및 관리</h3>

        {/* 0. 데이터 불균형 분석 및 균형 맞춤 수집 */}
        <div className="border rounded-lg p-4 bg-orange-50 mb-6">
          <h4 className="font-medium text-gray-900 mb-2">0. 데이터 불균형 분석 및 균형 맞춤 수집</h4>
          <p className="text-sm text-gray-600 mb-4">
            현재 데이터 분포를 분석하여 불균형을 파악하고, 균형을 맞추는 방향으로 데이터를 수집합니다.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                분석 연도
              </label>
              <select
                value={selectedYearForCollection}
                onChange={(e) => setSelectedYearForCollection(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {Array.from({length: 10}, (_, i) => 2024 - i).map(year => (
                  <option key={year} value={year}>{year}년</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={analyzeDataImbalance}
                className="w-full bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors flex items-center justify-center"
              >
                🔍 불균형 분석
              </button>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={executeBalancedCollection}
                disabled={isBalancedCollecting}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isBalancedCollecting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    균형 맞춤 수집 중...
                  </>
                ) : (
                  '⚖️ 균형 맞춤 수집'
                )}
              </button>
            </div>
          </div>

          {/* 데이터 불균형 분석 결과 */}
          {dataImbalance && (
            <div className="mt-4 p-4 bg-white rounded-md border">
              <h5 className="font-medium text-gray-700 mb-3">불균형 분석 결과</h5>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-red-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-red-600">{dataImbalance.excess_countries?.length || 0}</div>
                  <div className="text-sm text-gray-600">과다 국가</div>
                </div>
                <div className="bg-blue-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-blue-600">{dataImbalance.deficit_countries?.length || 0}</div>
                  <div className="text-sm text-gray-600">부족 국가</div>
                </div>
                <div className="bg-green-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-green-600">{dataImbalance.normal_countries?.length || 0}</div>
                  <div className="text-sm text-gray-600">적정 국가</div>
                </div>
              </div>

              {/* 과다 국가 목록 */}
              {dataImbalance.excess_countries && dataImbalance.excess_countries.length > 0 && (
                <div className="mb-4">
                  <h6 className="font-medium text-gray-600 mb-2">과다 국가 (상위 5개)</h6>
                  <div className="flex flex-wrap gap-2">
                    {dataImbalance.excess_countries.slice(0, 5).map((country: any, index: number) => (
                      <span key={index} className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                        {country.country} ({country.count}개, {country.imbalance_ratio.toFixed(1)}x)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 부족 국가 목록 */}
              {dataImbalance.deficit_countries && dataImbalance.deficit_countries.length > 0 && (
                <div className="mb-4">
                  <h6 className="font-medium text-gray-600 mb-2">부족 국가 (상위 5개)</h6>
                  <div className="flex flex-wrap gap-2">
                    {dataImbalance.deficit_countries.slice(0, 5).map((country: any, index: number) => (
                      <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {country.country} ({country.count}개, {country.imbalance_ratio.toFixed(1)}x)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 균형 맞춤 수집 결과 */}
          {balancedCollectionResults && (
            <div className="mt-4 p-4 bg-white rounded-md border">
              <h5 className="font-medium text-gray-700 mb-3">균형 맞춤 수집 결과</h5>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-blue-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-blue-600">{balancedCollectionResults.total_collected}</div>
                  <div className="text-sm text-gray-600">총 수집</div>
                </div>
                <div className="bg-green-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-green-600">{balancedCollectionResults.real_data}</div>
                  <div className="text-sm text-gray-600">실제 데이터</div>
                </div>
                <div className="bg-yellow-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-yellow-600">{balancedCollectionResults.estimated_data}</div>
                  <div className="text-sm text-gray-600">추정 데이터</div>
                </div>
                <div className="bg-purple-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-purple-600">{balancedCollectionResults.achievement_rate?.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">달성률</div>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <p>• 실제 데이터 비율: {balancedCollectionResults.real_data_ratio?.toFixed(1)}%</p>
                <p>• 추정 데이터 비율: {balancedCollectionResults.estimated_data_ratio?.toFixed(1)}%</p>
                <p>• 목표 대비 달성률: {balancedCollectionResults.min_achievement_rate?.toFixed(1)}%</p>
              </div>
            </div>
          )}
        </div>

        {/* 1. 연도별 전체 조합 수집 */}
        <div className="border rounded-lg p-4 bg-blue-50 mb-6">
          <h4 className="font-medium text-gray-900 mb-2">1. 연도별 전체 조합 수집</h4>
          <p className="text-sm text-gray-600 mb-4">
            선택한 연도의 모든 가능한 조합(국가×분야×자본타입)을 계산하고, 
            모든 무료/오픈 소스에서 최대한 많은 데이터를 수집합니다.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                수집 연도
              </label>
              <select
                value={selectedYearForCollection}
                onChange={(e) => setSelectedYearForCollection(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({length: 10}, (_, i) => 2024 - i).map(year => (
                  <option key={year} value={year}>{year}년</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                예상 총 조합 수
              </label>
              <div className="px-3 py-2 bg-gray-100 rounded-md text-sm font-mono">
                {calculateAllCombinations(selectedYearForCollection).toLocaleString()}개
              </div>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={executeAllSourcesCollection}
                disabled={isCollectingAll}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isCollectingAll ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    수집 중...
                  </>
                ) : (
                  '전체 소스 수집 시작'
                )}
              </button>
            </div>
          </div>

          {/* 수집 결과 표시 */}
          {collectionResults && (
            <div className="mt-4 p-4 bg-white rounded-md border">
              <h5 className="font-medium text-gray-700 mb-3">수집 결과</h5>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                <div className="bg-blue-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-blue-600">{collectionResults.total_combinations}</div>
                  <div className="text-sm text-gray-600">총 조합 수</div>
                </div>
                <div className="bg-green-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-green-600">{collectionResults.collected_combinations}</div>
                  <div className="text-sm text-gray-600">수집된 조합</div>
                </div>
                <div className="bg-red-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-red-600">{collectionResults.missing_combinations?.length || 0}</div>
                  <div className="text-sm text-gray-600">누락된 조합</div>
                </div>
                <div className="bg-yellow-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-yellow-600">
                    {collectionResults.duplicate_analysis?.total_duplicate_combinations || 0}
                  </div>
                  <div className="text-sm text-gray-600">중복 조합</div>
                </div>
                <div className="bg-purple-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-purple-600">
                    {collectionResults.total_combinations > 0 ? 
                      Math.round((collectionResults.collected_combinations / collectionResults.total_combinations) * 100) : 0}%
                  </div>
                  <div className="text-sm text-gray-600">수집률</div>
                </div>
              </div>

              {/* 중복 데이터 분석 */}
              {collectionResults.duplicate_analysis && (
                <div className="mt-4 p-4 bg-yellow-50 rounded-md">
                  <h6 className="font-medium text-gray-700 mb-2">중복 데이터 분석</h6>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">중복 조합 수:</span> {collectionResults.duplicate_analysis.total_duplicate_combinations}개
                    </div>
                    <div>
                      <span className="font-medium">중복 레코드 수:</span> {collectionResults.duplicate_analysis.total_duplicate_records}개
                    </div>
                    <div>
                      <span className="font-medium">중복률:</span> {collectionResults.duplicate_analysis.duplicate_rate.toFixed(1)}%
                    </div>
                  </div>
                </div>
              )}

              {/* 소스별 수집 현황 */}
              {collectionResults.source_results && (
                <div className="mb-4">
                  <h6 className="font-medium text-gray-700 mb-2">소스별 수집 현황</h6>
                  <div className="space-y-2">
                    {Object.entries(collectionResults.source_results).map(([source, data]: [string, any]) => (
                      <div key={source} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm font-medium">{source}</span>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-600">{data.collected}개 수집</span>
                          <span className="text-sm text-gray-600">{data.reliability}% 신뢰도</span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            data.status === 'success' ? 'bg-green-100 text-green-800' :
                            data.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {data.status === 'success' ? '성공' :
                             data.status === 'partial' ? '부분' : '실패'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 수집된 데이터 상세 정보 */}
              {collectionResults.collected_details && (
                <div className="mb-4">
                  <h6 className="font-medium text-gray-700 mb-2">수집된 데이터 상세 정보</h6>
                  
                  {/* 소스별 상세 정보 */}
                  {collectionResults.collected_details.source_summary && (
                    <div className="mb-4">
                      <h7 className="font-medium text-gray-600 mb-2">소스별 상세</h7>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(collectionResults.collected_details.source_summary).map(([source, data]: [string, any]) => (
                          <div key={source} className="bg-white p-3 rounded border">
                            <div className="font-medium text-sm mb-2">{source}</div>
                            <div className="text-xs space-y-1">
                              <div>수집 건수: {data.count}개</div>
                              <div>총 금액: ${(data.total_amount / 1000000000).toFixed(2)}B</div>
                              <div>국가: {data.countries?.join(', ') || 'N/A'}</div>
                              <div>분야: {data.sectors?.join(', ') || 'N/A'}</div>
                              <div>자본타입: {data.capital_types?.join(', ') || 'N/A'}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 국가별 상세 정보 */}
                  {collectionResults.collected_details.country_summary && (
                    <div className="mb-4">
                      <h7 className="font-medium text-gray-600 mb-2">국가별 상세</h7>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(collectionResults.collected_details.country_summary).slice(0, 10).map(([country, data]: [string, any]) => (
                          <div key={country} className="bg-white p-3 rounded border">
                            <div className="font-medium text-sm mb-2">{country}</div>
                            <div className="text-xs space-y-1">
                              <div>수집 건수: {data.count}개</div>
                              <div>총 금액: ${(data.total_amount / 1000000000).toFixed(2)}B</div>
                              <div>소스: {data.sources?.join(', ') || 'N/A'}</div>
                              <div>분야: {data.sectors?.join(', ') || 'N/A'}</div>
                              <div>자본타입: {data.capital_types?.join(', ') || 'N/A'}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 분야별 상세 정보 */}
                  {collectionResults.collected_details.sector_summary && (
                    <div className="mb-4">
                      <h7 className="font-medium text-gray-600 mb-2">분야별 상세</h7>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(collectionResults.collected_details.sector_summary).map(([sector, data]: [string, any]) => (
                          <div key={sector} className="bg-white p-3 rounded border">
                            <div className="font-medium text-sm mb-2">{sector}</div>
                            <div className="text-xs space-y-1">
                              <div>수집 건수: {data.count}개</div>
                              <div>총 금액: ${(data.total_amount / 1000000000).toFixed(2)}B</div>
                              <div>소스: {data.sources?.join(', ') || 'N/A'}</div>
                              <div>국가: {data.countries?.join(', ') || 'N/A'}</div>
                              <div>자본타입: {data.capital_types?.join(', ') || 'N/A'}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 자본타입별 상세 정보 */}
                  {collectionResults.collected_details.capital_type_summary && (
                    <div className="mb-4">
                      <h7 className="font-medium text-gray-600 mb-2">자본타입별 상세</h7>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(collectionResults.collected_details.capital_type_summary).map(([capitalType, data]: [string, any]) => (
                          <div key={capitalType} className="bg-white p-3 rounded border">
                            <div className="font-medium text-sm mb-2">{capitalType}</div>
                            <div className="text-xs space-y-1">
                              <div>수집 건수: {data.count}개</div>
                              <div>총 금액: ${(data.total_amount / 1000000000).toFixed(2)}B</div>
                              <div>소스: {data.sources?.join(', ') || 'N/A'}</div>
                              <div>국가: {data.countries?.join(', ') || 'N/A'}</div>
                              <div>분야: {data.sectors?.join(', ') || 'N/A'}</div>
                            </div>
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

        {/* 2. 자본타입별 소스 현황 */}
        <div className="border rounded-lg p-4 bg-green-50 mb-6">
          <h4 className="font-medium text-gray-900 mb-2">2. 자본타입별 무료/오픈 소스 현황</h4>
          <p className="text-sm text-gray-600 mb-4">
            각 자본타입별로 사용 가능한 무료/오픈 API 소스와 신뢰도를 표시합니다.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(CAPITAL_TYPE_SOURCES).map(([capitalType, sources]) => (
              <div key={capitalType} className="bg-white p-4 rounded-md border">
                <h5 className="font-medium text-gray-700 mb-2">{capitalType}</h5>
                <div className="space-y-2">
                  {sources.map((source, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{source.name}</span>
                        {source.apiKey && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded">
                            API키 필요
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">{source.type}</span>
                        <span className={`text-xs px-1 py-0.5 rounded ${
                          source.reliability >= 0.9 ? 'bg-green-100 text-green-800' :
                          source.reliability >= 0.8 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {Math.round(source.reliability * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. 누락된 조합 분석 */}
        {missingCombinations.length > 0 && (
          <div className="border rounded-lg p-4 bg-red-50 mb-6">
            <h4 className="font-medium text-gray-900 mb-2">3. 누락된 조합 분석</h4>
            <p className="text-sm text-gray-600 mb-4">
              수집하지 못한 조합들을 표시합니다. 이 조합들은 더미 데이터를 생성하지 않고 비워둡니다.
            </p>

            <div className="max-h-60 overflow-y-auto bg-white border rounded-md p-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {missingCombinations.slice(0, 100).map((combo: any, index: number) => (
                  <div key={index} className="text-xs bg-red-100 p-2 rounded border-l-4 border-red-400">
                    <div className="font-medium">{combo.country_code}-{combo.sector_code}-{combo.capital_type_code}</div>
                    <div className="text-gray-500">연도: {combo.year}</div>
                    <div className="text-gray-500">누락 이유: {combo.reason || '데이터 없음'}</div>
                  </div>
                ))}
              </div>
              {missingCombinations.length > 100 && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  ... 및 {missingCombinations.length - 100}개 더
                </p>
              )}
            </div>
          </div>
        )}

        {/* 4. 중복 데이터 처리 */}
        {duplicateData.length > 0 && (
          <div className="border rounded-lg p-4 bg-yellow-50 mb-6">
            <h4 className="font-medium text-gray-900 mb-2">4. 중복 데이터 처리 (신뢰도 기반)</h4>
            <p className="text-sm text-gray-600 mb-4">
              동일한 조합에 대해 여러 소스에서 데이터를 수집한 경우, 신뢰도가 높은 데이터를 우선 선택합니다.
            </p>

            <div className="max-h-60 overflow-y-auto bg-white border rounded-md p-3">
              <div className="space-y-2">
                {duplicateData.slice(0, 50).map((duplicate: any, index: number) => (
                  <div key={index} className="p-3 bg-gray-50 rounded border">
                    <div className="font-medium text-sm">
                      {duplicate.country_code}-{duplicate.sector_code}-{duplicate.capital_type_code} ({duplicate.year}년)
                    </div>
                    <div className="mt-2 space-y-1">
                      {duplicate.sources.map((source: any, sourceIndex: number) => (
                        <div key={sourceIndex} className={`flex items-center justify-between text-xs p-2 rounded ${
                          source.selected ? 'bg-green-100 border border-green-300' : 'bg-gray-100'
                        }`}>
                          <span className="font-medium">{source.name}</span>
                          <div className="flex items-center space-x-2">
                            <span>신뢰도: {Math.round(source.reliability * 100)}%</span>
                            <span>금액: ${source.amount?.toLocaleString() || 'N/A'}</span>
                            {source.selected && (
                              <span className="text-green-600 font-medium">✓ 선택됨</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {duplicateData.length > 50 && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  ... 및 {duplicateData.length - 50}개 더
                </p>
              )}
            </div>
          </div>
        )}

        {/* 5. 데이터 융합 (기존 유지) */}
        <div className="border rounded-lg p-4 bg-purple-50">
          <h4 className="font-medium text-gray-900 mb-2">5. 데이터 융합 (추후 구현)</h4>
          <p className="text-sm text-gray-600 mb-4">
            원시데이터 수집이 완료된 후 구현할 예정입니다.
          </p>
          
          <div className="bg-gray-100 p-4 rounded-md">
            <p className="text-sm text-gray-500 text-center">
              데이터 융합 기능은 원시데이터 수집 로직이 완성된 후 구현됩니다.
            </p>
          </div>
        </div>

        {/* 6. 실시간 수집 모니터링 */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium text-gray-900 mb-2">실시간 수집 모니터링</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">현재 상태:</span>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  collectionProgress.status === 'idle' ? 'bg-gray-400' :
                  collectionProgress.status === 'collecting' ? 'bg-yellow-400 animate-pulse' :
                  collectionProgress.status === 'processing' ? 'bg-blue-400 animate-pulse' :
                  collectionProgress.status === 'completed' ? 'bg-green-400' :
                  'bg-red-400'
                }`}></div>
                <span className="text-sm font-medium">
                  {collectionProgress.status === 'idle' ? '대기 중' :
                  collectionProgress.status === 'collecting' ? '수집 중' :
                  collectionProgress.status === 'processing' ? '처리 중' :
                  collectionProgress.status === 'completed' ? '완료' :
                  '오류'}
                </span>
              </div>
            </div>

            {collectionProgress.status !== 'idle' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">진행률:</span>
                  <span className="text-sm font-medium">{collectionProgress.current}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      collectionProgress.status === 'completed' ? 'bg-green-500' :
                      collectionProgress.status === 'error' ? 'bg-red-500' :
                      'bg-blue-500'
                    }`}
                    style={{ width: `${collectionProgress.current}%` }}
                  ></div>
                </div>
                {collectionProgress.startTime && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">경과 시간:</span>
                    <span className="text-sm font-medium">
                      {Math.floor((Date.now() - collectionProgress.startTime) / 1000)}초
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}