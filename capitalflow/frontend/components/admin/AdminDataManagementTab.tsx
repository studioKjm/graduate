'use client'

import { CollectionProgress, DataQuality } from '@/types/admin'
import { useState, useEffect } from 'react'

interface AdminDataManagementTabProps {
  selectedYear: number
  setSelectedYear: (year: number) => void
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
  selectedYear,
  setSelectedYear,
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
  const [isSupplementingData, setIsSupplementingData] = useState(false)
  const [isAdvancedCollecting, setIsAdvancedCollecting] = useState(false)
  const [isEstimatingData, setIsEstimatingData] = useState(false)
  const [isFourthStageEstimating, setIsFourthStageEstimating] = useState(false)
  const [collectionResults, setCollectionResults] = useState<any>(null)
  const [supplementResults, setSupplementResults] = useState<any>(null)
  const [advancedResults, setAdvancedResults] = useState<any>(null)
  const [estimationResults, setEstimationResults] = useState<any>(null)
  const [fourthStageResults, setFourthStageResults] = useState<any>(null)
  const [currentStep, setCurrentStep] = useState(1) // 1: 실제수집, 2: 보충수집, 3: 고급수집, 4: 추정수집, 5: 4단계추정
  const [realDataCount, setRealDataCount] = useState(0)
  const [estimatedDataCount, setEstimatedDataCount] = useState(0)
  const [realDataResults, setRealDataResults] = useState<any>(null)
  
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
        const response = await fetch('http://localhost:8001/api/v1/capitalflows/metadata/')
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

  // 현재 데이터 카운트 로드
  useEffect(() => {
    const fetchCurrentDataCount = async () => {
      try {
        const response = await fetch(`http://localhost:8001/api/v1/capitalflows/admin/detailed-analysis/?year=${selectedYearForCollection}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setRealDataCount(data.data.real_data_count || 0)
            setEstimatedDataCount(data.data.estimated_data_count || 0)
          }
        }
      } catch (error) {
        console.error('데이터 카운트 로드 실패:', error)
      }
    }
    fetchCurrentDataCount()
  }, [selectedYearForCollection])

  // 데이터 불균형 분석
  const analyzeDataImbalance = async () => {
    try {
      const response = await fetch('http://localhost:8001/api/v1/capitalflows/admin/analyze-imbalance/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: selectedYearForCollection })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setDataImbalance(data.data)
          addToast({
            type: 'success',
            title: '데이터 불균형 분석 완료',
            message: `과다 국가: ${data.data.excess_countries?.length || 0}개, 부족 국가: ${data.data.deficit_countries?.length || 0}개`
          })
        }
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

  // 1단계: 실제 데이터 수집
  const executeRealDataCollection = async () => {
    setIsCollectingAll(true)
    setCollectionResults(null)
    setCurrentStep(1)
    
    try {
      console.log('🚀 1단계: 실제 데이터 수집 시작:', selectedYearForCollection)
      
      const response = await fetch('http://localhost:8001/api/v1/capitalflows/admin/collect-all-sources/', {
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
      console.log('📊 1단계 수집 결과:', result)
      
      if (result.success) {
        setCollectionResults(result.data)
        setRealDataResults(result.data)
        setRealDataCount(result.data.real_data || 0)
        setEstimatedDataCount(result.data.estimated_data || 0)
        
        addToast({
          type: 'success',
          title: '1단계: 실제 데이터 수집 완료',
          message: `총 ${result.data.total_collected}개 데이터 수집 (실제: ${result.data.real_data}, 추정: ${result.data.estimated_data})`
        })
      } else {
        addToast({
          type: 'error',
          title: '1단계: 실제 데이터 수집 실패',
          message: result.message || '알 수 없는 오류가 발생했습니다.'
        })
      }
    } catch (error) {
      console.error('❌ 1단계 수집 오류:', error)
      
      addToast({
        type: 'error',
        title: '1단계: 실제 데이터 수집 실패',
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      })
    } finally {
      setIsCollectingAll(false)
    }
  }

  // 2단계: 실제 데이터 보충 수집
  const executeSupplementDataCollection = async () => {
    setIsSupplementingData(true)
    setSupplementResults(null)
    setCurrentStep(2)
    
    try {
      console.log('🔄 2단계: 실제 데이터 보충 수집 시작:', selectedYearForCollection)
      
      const response = await fetch('http://localhost:8001/api/v1/capitalflows/admin/real-data-only-collect/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: selectedYearForCollection,
          supplement_real_data: true,
          target_real_data: 2000
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      console.log('📊 2단계 보충 수집 결과:', result)
      
      if (result.success) {
        setSupplementResults(result.data)
        setRealDataCount(result.data.real_data_count || 0)
        setEstimatedDataCount(result.data.estimated_data_count || 0)
        
        addToast({
          type: 'success',
          title: '2단계: 실제 데이터 보충 완료',
          message: `신규 ${result.data.new_real_data}개, 업데이트 ${result.data.updated_real_data}개 실제 데이터 수집 (총 실제: ${result.data.real_data_count}개)`
        })
      } else {
        addToast({
          type: 'error',
          title: '2단계: 실제 데이터 보충 실패',
          message: result.message || '알 수 없는 오류가 발생했습니다.'
        })
      }
    } catch (error) {
      console.error('❌ 2단계 보충 수집 오류:', error)
      
      addToast({
        type: 'error',
        title: '2단계: 실제 데이터 보충 실패',
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      })
    } finally {
      setIsSupplementingData(false)
    }
  }

  // 3단계: 고급 3차 수집 (부족한 자본타입 중심)
  const executeAdvancedThirdStageCollection = async () => {
    setIsAdvancedCollecting(true)
    setAdvancedResults(null)
    setCurrentStep(3)
    
    try {
      console.log('🚀 3단계: 고급 3차 수집 시작:', selectedYearForCollection)
      
      const response = await fetch('http://localhost:8001/api/v1/capitalflows/admin/advanced-third-stage-collect/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: selectedYearForCollection
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      console.log('📊 3단계 고급 수집 결과:', result)
      
      if (result.success) {
        setAdvancedResults(result.data)
        setRealDataCount(result.data.real_data_count || 0)
        setEstimatedDataCount(result.data.estimated_data_count || 0)
        
        addToast({
          type: 'success',
          title: '3단계: 고급 3차 수집 완료',
          message: `실제 ${result.data.new_real_data + result.data.updated_real_data}개, 추정 ${result.data.new_estimated_data}개 수집 (실제 비율: ${result.data.real_data_ratio?.toFixed(1)}%)`
        })
      } else {
        addToast({
          type: 'error',
          title: '3단계: 고급 3차 수집 실패',
          message: result.message || '알 수 없는 오류가 발생했습니다.'
        })
      }
    } catch (error) {
      console.error('❌ 3단계 고급 수집 오류:', error)
      
      addToast({
        type: 'error',
        title: '3단계: 고급 3차 수집 실패',
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      })
    } finally {
      setIsAdvancedCollecting(false)
    }
  }

  const executeFourthStageEstimation = async () => {
    setIsFourthStageEstimating(true)
    setFourthStageResults(null)
    setCurrentStep(5)
    
    try {
      console.log('🚀 4단계: 누락 데이터 기반 추정 시작:', selectedYearForCollection)
      
      const response = await fetch('http://localhost:8001/api/v1/capitalflows/admin/fourth-stage-estimation/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: selectedYearForCollection,
          max_estimated_data: 1000,
          target_real_ratio: 0.4
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      console.log('📊 4단계 누락 데이터 기반 추정 결과:', result)
      
      if (result.success) {
        setFourthStageResults(result.data)
        
        addToast({
          type: 'success',
          title: '4단계: 누락 데이터 기반 추정 완료',
          message: `생성된 추정 데이터: ${result.data.generated_count}개, 최종 실제 데이터 비율: ${result.data.final_stats?.real_ratio?.toFixed(1)}%`
        })
      } else {
        addToast({
          type: 'error',
          title: '4단계: 누락 데이터 기반 추정 실패',
          message: result.message || '알 수 없는 오류가 발생했습니다.'
        })
      }
    } catch (error) {
      console.error('❌ 4단계 누락 데이터 기반 추정 오류:', error)
      
      addToast({
        type: 'error',
        title: '4단계: 누락 데이터 기반 추정 실패',
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      })
    } finally {
      setIsFourthStageEstimating(false)
    }
  }

  // 5단계: 누락 조합 추정치 수집
  const executeEstimationDataCollection = async () => {
    setIsEstimatingData(true)
    setEstimationResults(null)
    setCurrentStep(5)
    
    try {
      console.log('🔍 4단계: 누락 조합 추정치 수집 시작:', selectedYearForCollection)
      
      const response = await fetch('http://localhost:8001/api/v1/capitalflows/admin/massive-collect/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: selectedYearForCollection,
          estimate_missing_data: true,
          target_estimated_data: 4000
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      console.log('📊 3단계 추정 수집 결과:', result)
      
      if (result.success) {
        setEstimationResults(result.data)
        setEstimatedDataCount(result.data.total_estimated_data || 0)
        
        addToast({
          type: 'success',
          title: '3단계: 추정 데이터 수집 완료',
          message: `추가 ${result.data.estimated_data}개 추정 데이터 생성 (총 추정: ${result.data.total_estimated_data}개)`
        })
      } else {
        addToast({
          type: 'error',
          title: '3단계: 추정 데이터 수집 실패',
          message: result.message || '알 수 없는 오류가 발생했습니다.'
        })
      }
    } catch (error) {
      console.error('❌ 3단계 추정 수집 오류:', error)
      
      addToast({
        type: 'error',
        title: '3단계: 추정 데이터 수집 실패',
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      })
    } finally {
      setIsEstimatingData(false)
    }
  }

  // 모든 조합 계산
  const calculateAllCombinations = (year: number) => {
    // 하드코딩된 값 사용 (100개국 × 30개 분야 × 11개 자본타입 = 33,000개)
    const countries = 100
    const sectors = 30
    const capitalTypes = 11
    
    return countries * sectors * capitalTypes
  }

  // 전체 소스 수집 실행
  const executeAllSourcesCollection = async () => {
    setIsCollectingAll(true)
    setCollectionResults(null)
    
    try {
      console.log('🚀 전체 소스 데이터 수집 시작:', selectedYearForCollection)
      
      const response = await fetch('http://localhost:8001/api/v1/capitalflows/admin/collect-all-sources/', {
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

        {/* 1단계: 실제 데이터 수집 */}
        <div className="border rounded-lg p-4 bg-green-50 mb-6">
          <h4 className="font-medium text-gray-900 mb-2">1단계: 실제 데이터 수집 (우선순위 1)</h4>
          <p className="text-sm text-gray-600 mb-4">
            실제 데이터 소스에서 직접 수집 가능한 데이터를 우선적으로 수집합니다. 목표: 2,000개 실제 데이터
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                수집 연도
              </label>
              <select
                value={selectedYearForCollection}
                onChange={(e) => setSelectedYearForCollection(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {Array.from({length: 10}, (_, i) => 2024 - i).map(year => (
                  <option key={year} value={year}>{year}년</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={executeRealDataCollection}
                disabled={isCollectingAll}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isCollectingAll ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    실제 데이터 수집 중...
                  </>
                ) : (
                  '🎯 1단계: 실제 데이터 수집'
                )}
              </button>
            </div>
            
            <div className="flex items-end">
              <div className="w-full text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                <div className="font-medium">목표: 2,000개 실제 데이터</div>
                <div className="text-lg font-bold text-green-600">현재: {realDataCount}개</div>
                <div className="text-xs">실제 소스에서 직접 수집</div>
              </div>
            </div>
          </div>

          {/* 1단계 결과 */}
          {realDataResults && (
            <div className="mt-4 p-4 bg-white rounded-md border">
              <h5 className="font-medium text-gray-700 mb-3">1단계 수집 결과</h5>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-green-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-green-600">{realDataResults.total_collected?.toLocaleString() || 0}</div>
                  <div className="text-sm text-gray-600">실제 데이터</div>
                </div>
                <div className="bg-blue-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-blue-600">{realDataResults.collected_combinations?.toLocaleString() || 0}</div>
                  <div className="text-sm text-gray-600">수집된 조합</div>
                </div>
                <div className="bg-orange-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-orange-600">{realDataResults.total_combinations?.toLocaleString() || 0}</div>
                  <div className="text-sm text-gray-600">총 조합</div>
                </div>
                <div className="bg-purple-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-purple-600">{((realDataResults.collected_combinations / realDataResults.total_combinations) * 100)?.toFixed(1) || 0}%</div>
                  <div className="text-sm text-gray-600">달성률</div>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <div>실제 데이터 수집: {realDataResults.collected_combinations?.toLocaleString() || 0}개 / {realDataResults.total_combinations?.toLocaleString() || 0}개 조합</div>
                <div>남은 조합: {(realDataResults.total_combinations - realDataResults.collected_combinations)?.toLocaleString() || 0}개</div>
              </div>
            </div>
          )}
        </div>

        {/* 2단계: 보충 데이터 수집 */}
        <div className="border rounded-lg p-4 bg-blue-50 mb-6">
          <h4 className="font-medium text-gray-900 mb-2">2단계: 보충 데이터 수집 (우선순위 2)</h4>
          <p className="text-sm text-gray-600 mb-4">
            추가 소스에서 실제 데이터를 더 수집하여 목표 2,000개를 달성합니다.
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
            
            <div className="flex items-end">
              <button
                onClick={executeSupplementDataCollection}
                disabled={isSupplementingData}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isSupplementingData ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    보충 데이터 수집 중...
                  </>
                ) : (
                  '📈 2단계: 보충 데이터 수집'
                )}
              </button>
            </div>
            
            <div className="flex items-end">
              <div className="w-full text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                <div className="font-medium">목표: 2,000개 실제 데이터</div>
                <div className="text-lg font-bold text-blue-600">현재: {realDataCount}개</div>
                <div className="text-xs">추가 소스에서 수집</div>
              </div>
            </div>
          </div>

          {/* 2단계 결과 */}
          {supplementResults && (
            <div className="mt-4 p-4 bg-white rounded-md border">
              <h5 className="font-medium text-gray-700 mb-3">2단계 수집 결과</h5>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-blue-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-blue-600">{supplementResults.total_collected?.toLocaleString() || 0}</div>
                  <div className="text-sm text-gray-600">보충 데이터</div>
                </div>
                <div className="bg-green-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-green-600">{supplementResults.collected_combinations?.toLocaleString() || 0}</div>
                  <div className="text-sm text-gray-600">수집된 조합</div>
                </div>
                <div className="bg-orange-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-orange-600">{supplementResults.total_combinations?.toLocaleString() || 0}</div>
                  <div className="text-sm text-gray-600">총 조합</div>
                </div>
                <div className="bg-purple-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-purple-600">{((supplementResults.collected_combinations / supplementResults.total_combinations) * 100)?.toFixed(1) || 0}%</div>
                  <div className="text-sm text-gray-600">달성률</div>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <div>보충 데이터 수집: {supplementResults.collected_combinations?.toLocaleString() || 0}개 / {supplementResults.total_combinations?.toLocaleString() || 0}개 조합</div>
                <div>남은 조합: {(supplementResults.total_combinations - supplementResults.collected_combinations)?.toLocaleString() || 0}개</div>
              </div>
            </div>
          )}
        </div>

        {/* 3단계: 고급 3차 수집 */}
        <div className="border rounded-lg p-4 bg-purple-50 mb-6">
          <h4 className="font-medium text-gray-900 mb-2">3단계: 고급 3차 수집 (우선순위 3)</h4>
          <p className="text-sm text-gray-600 mb-4">
            부족한 자본타입(VC, MA, IPO, PE, SWF 등) 중심으로 웹스크래핑, 뉴스, 정부데이터를 활용한 고품질 데이터 수집
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                수집 연도
              </label>
              <select
                value={selectedYearForCollection}
                onChange={(e) => setSelectedYearForCollection(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {Array.from({length: 10}, (_, i) => 2024 - i).map(year => (
                  <option key={year} value={year}>{year}년</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={executeAdvancedThirdStageCollection}
                disabled={isAdvancedCollecting}
                className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isAdvancedCollecting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    고급 수집 중...
                  </>
                ) : (
                  '🚀 3단계: 고급 3차 수집'
                )}
              </button>
            </div>
            
            <div className="flex items-end">
              <div className="w-full text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                <div className="font-medium">목표: 60% 실제 데이터 비율</div>
                <div className="text-lg font-bold text-purple-600">현재: {realDataCount}개</div>
                <div className="text-xs">웹스크래핑 + 뉴스 + 정부데이터</div>
              </div>
            </div>
          </div>

          {/* 3단계 결과 */}
          {advancedResults && (
            <div className="mt-4 p-4 bg-white rounded-md border">
              <h5 className="font-medium text-gray-700 mb-3">3단계 고급 수집 결과</h5>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-purple-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-purple-600">{advancedResults.new_real_data?.toLocaleString() || 0}</div>
                  <div className="text-sm text-gray-600">신규 실제 데이터</div>
                </div>
                <div className="bg-green-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-green-600">{advancedResults.updated_real_data?.toLocaleString() || 0}</div>
                  <div className="text-sm text-gray-600">업데이트 데이터</div>
                </div>
                <div className="bg-orange-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-orange-600">{advancedResults.new_estimated_data?.toLocaleString() || 0}</div>
                  <div className="text-sm text-gray-600">추정 데이터</div>
                </div>
                <div className="bg-blue-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-blue-600">{advancedResults.real_data_ratio?.toFixed(1) || 0}%</div>
                  <div className="text-sm text-gray-600">실제 데이터 비율</div>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <div>웹스크래핑: {advancedResults.improvement_summary?.web_scraping_data || 0}개</div>
                <div>뉴스 데이터: {advancedResults.improvement_summary?.news_data || 0}개</div>
                <div>정부 데이터: {advancedResults.improvement_summary?.government_data || 0}개</div>
                <div>금융기관: {advancedResults.improvement_summary?.financial_data || 0}개</div>
              </div>
            </div>
          )}
        </div>

        {/* 4단계: 누락 데이터 기반 추정 */}
        <div className="border rounded-lg p-4 bg-indigo-50 mb-6">
          <h4 className="font-medium text-gray-900 mb-2">4단계: 누락 데이터 기반 추정 (우선순위 4)</h4>
          <p className="text-sm text-gray-600 mb-4">
            실제 데이터 기반으로 누락된 조합을 분석하고 지능형 추정 방법을 활용하여 고품질 추정 데이터 생성
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                추정 연도
              </label>
              <select
                value={selectedYearForCollection}
                onChange={(e) => setSelectedYearForCollection(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {Array.from({length: 10}, (_, i) => 2024 - i).map(year => (
                  <option key={year} value={year}>{year}년</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={executeFourthStageEstimation}
                disabled={isFourthStageEstimating}
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isFourthStageEstimating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    추정 생성 중...
                  </>
                ) : (
                  '🔮 4단계: 누락 데이터 기반 추정'
                )}
              </button>
            </div>
            
            <div className="flex items-end">
              <div className="w-full text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                <div className="font-medium">목표: 40% 실제 데이터 비율 유지</div>
                <div className="text-lg font-bold text-indigo-600">최대: 1,000개</div>
                <div className="text-xs">지능형 추정 방법</div>
              </div>
            </div>
          </div>

          {/* 4단계 결과 */}
          {fourthStageResults && (
            <div className="mt-4 p-4 bg-white rounded-md border">
              <h5 className="font-medium text-gray-700 mb-3">4단계 누락 데이터 기반 추정 결과</h5>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-indigo-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-indigo-600">{fourthStageResults.generated_count?.toLocaleString() || 0}</div>
                  <div className="text-sm text-gray-600">생성된 추정 데이터</div>
                </div>
                <div className="bg-green-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-green-600">{fourthStageResults.final_stats?.real?.toLocaleString() || 0}</div>
                  <div className="text-sm text-gray-600">총 실제 데이터</div>
                </div>
                <div className="bg-orange-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-orange-600">{fourthStageResults.final_stats?.estimated?.toLocaleString() || 0}</div>
                  <div className="text-sm text-gray-600">총 추정 데이터</div>
                </div>
                <div className="bg-blue-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-blue-600">{fourthStageResults.final_stats?.real_ratio?.toFixed(1) || 0}%</div>
                  <div className="text-sm text-gray-600">실제 데이터 비율</div>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <div className="font-medium mb-2">추정 방법별 분포:</div>
                <div>유사 국가 기반: {fourthStageResults.estimation_methods?.similar_country || 0}개</div>
                <div>유사 분야 기반: {fourthStageResults.estimation_methods?.similar_sector || 0}개</div>
                <div>자본타입 평균: {fourthStageResults.estimation_methods?.capital_type_average || 0}개</div>
                <div>GDP 기반: {fourthStageResults.estimation_methods?.gdp_based || 0}개</div>
              </div>
            </div>
          )}
        </div>

        {/* 5단계: 추정 데이터 생성 */}
        <div className="border rounded-lg p-4 bg-orange-50 mb-6">
          <h4 className="font-medium text-gray-900 mb-2">5단계: 추정 데이터 생성 (우선순위 5)</h4>
          <p className="text-sm text-gray-600 mb-4">
            실제 데이터가 없는 조합에 대해 추정 데이터를 생성합니다. 목표: 4,000개 추정 데이터
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                수집 연도
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
                onClick={executeEstimationDataCollection}
                disabled={isEstimatingData}
                className="w-full bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isEstimatingData ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    추정 데이터 생성 중...
                  </>
                ) : (
                  '🔮 4단계: 추정 데이터 생성'
                )}
              </button>
            </div>
            
            <div className="flex items-end">
              <div className="w-full text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                <div className="font-medium">목표: 4,000개 추정 데이터</div>
                <div className="text-lg font-bold text-orange-600">현재: {estimatedDataCount}개</div>
                <div className="text-xs">알고리즘으로 추정</div>
              </div>
            </div>
          </div>

          {/* 4단계 결과 */}
          {estimationResults && (
            <div className="mt-4 p-4 bg-white rounded-md border">
              <h5 className="font-medium text-gray-700 mb-3">4단계 생성 결과</h5>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-orange-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-orange-600">{estimationResults.total_collected?.toLocaleString() || 0}</div>
                  <div className="text-sm text-gray-600">추정 데이터</div>
                </div>
                <div className="bg-green-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-green-600">{estimationResults.collected_combinations?.toLocaleString() || 0}</div>
                  <div className="text-sm text-gray-600">생성된 조합</div>
                </div>
                <div className="bg-blue-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-blue-600">{estimationResults.total_combinations?.toLocaleString() || 0}</div>
                  <div className="text-sm text-gray-600">총 조합</div>
                </div>
                <div className="bg-purple-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-purple-600">{((estimationResults.collected_combinations / estimationResults.total_combinations) * 100)?.toFixed(1) || 0}%</div>
                  <div className="text-sm text-gray-600">달성률</div>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <div>추정 데이터 생성: {estimationResults.collected_combinations?.toLocaleString() || 0}개 / {estimationResults.total_combinations?.toLocaleString() || 0}개 조합</div>
                <div>남은 조합: {(estimationResults.total_combinations - estimationResults.collected_combinations)?.toLocaleString() || 0}개</div>
              </div>
            </div>
          )}
        </div>


        {/* 4. 데이터 품질 관리 */}
        <div className="border rounded-lg p-4 bg-green-50 mb-6">
          <h4 className="font-medium text-gray-900 mb-2">4. 데이터 품질 관리</h4>
          <p className="text-sm text-gray-600 mb-4">
            수집된 데이터의 품질을 검증하고 이상치를 탐지합니다.
          </p>

          <div className="flex items-center space-x-4">
            <button
              onClick={executeDataValidation}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? '검증 중...' : '데이터 검증'}
            </button>
            
            <div className="text-sm text-gray-600">
              데이터 품질 점수와 이상치를 분석합니다.
            </div>
          </div>

          {/* 데이터 품질 결과 */}
          {dataQuality && (
            <div className="mt-4 p-4 bg-white rounded-md border">
              <h5 className="font-medium text-gray-700 mb-3">데이터 품질 분석 결과</h5>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-blue-600">{dataQuality.avg_quality_score?.toFixed(3) || 0}</div>
                  <div className="text-sm text-gray-600">평균 품질 점수</div>
                </div>
                <div className="bg-red-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-red-600">{dataQuality.outliers?.length || 0}</div>
                  <div className="text-sm text-gray-600">이상치 개수</div>
                </div>
                <div className="bg-green-50 p-3 rounded-md">
                  <div className="text-2xl font-bold text-green-600">{dataQuality.valid_data?.length || 0}</div>
                  <div className="text-sm text-gray-600">유효 데이터</div>
                </div>
              </div>

              {dataQuality.outliers && dataQuality.outliers.length > 0 && (
                <div className="mt-4">
                  <h6 className="font-medium text-gray-600 mb-2">이상치 상위 5개</h6>
                  <div className="space-y-2">
                    {dataQuality.outliers.slice(0, 5).map((outlier: any, index: number) => (
                      <div key={index} className="text-sm bg-red-50 p-2 rounded">
                        <span className="font-medium">{outlier.country}-{outlier.sector}-{outlier.capital_type}</span>
                        <span className="text-red-600 ml-2">품질점수: {outlier.quality_score?.toFixed(3)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 5. 자본타입별 소스 가이드 */}
        <div className="border rounded-lg p-4 bg-purple-50">
          <h4 className="font-medium text-gray-900 mb-2">5. 자본타입별 소스 가이드</h4>
          <p className="text-sm text-gray-600 mb-4">
            각 자본타입별로 사용 가능한 무료/오픈 소스와 API 키 요구사항을 확인할 수 있습니다.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(CAPITAL_TYPE_SOURCES).map(([capitalType, sources]) => (
              <div key={capitalType} className="bg-white p-4 rounded-md border">
                <h5 className="font-medium text-gray-900 mb-2">{capitalType}</h5>
                <div className="space-y-2">
                  {sources.map((source, index) => (
                    <div key={index} className="text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{source.name}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          source.type === 'OFFICIAL' ? 'bg-green-100 text-green-800' :
                          source.type === 'OPEN' ? 'bg-blue-100 text-blue-800' :
                          source.type === 'PRIVATE' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {source.type}
                        </span>
                      </div>
                      <div className="text-gray-600 text-xs mt-1">
                        신뢰도: {source.reliability} | API키: {source.apiKey ? '필요' : '불필요'}
                      </div>
                      <div className="text-gray-500 text-xs mt-1">
                        {source.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}