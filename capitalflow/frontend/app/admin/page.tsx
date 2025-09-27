'use client'

import { useState, useEffect } from 'react'
import DataSourceCard from '@/components/admin/DataSourceCard'
import APITestPanel from '@/components/admin/APITestPanel'
import AdminAuth from '@/components/admin/AdminAuth'
import ToastContainer, { ToastMessage } from '@/components/admin/Toast'
import DataPipelinePanel from '@/components/admin/DataPipelinePanel'
import APIEndpointsPanel from '@/components/admin/APIEndpointsPanel'

interface DataSource {
  id: string
  name: string
  description: string
  source_type: string
  reliability_level: string
  reliability_weight: number
  is_active: boolean
}

interface ProcessingLog {
  id: string
  processing_type: string
  status: string
  source_name?: string
  country_name?: string
  sector_name?: string
  year_start?: number
  year_end?: number
  records_processed: number
  records_success: number
  records_failed: number
  start_time: string
  end_time?: string
  duration_seconds?: number
  error_message?: string
}

interface SystemStats {
  status: string
  statistics: {
    processed_data_count: number
    raw_data_count: number
    active_sources: number
    latest_processing: any
  }
}

interface APITestResult {
  success: boolean
  data?: any
  error?: string
  duration: number
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [processingLogs, setProcessingLogs] = useState<ProcessingLog[]>([])
  const [loading, setLoading] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [lastUpdated, setLastUpdated] = useState<string>('')
  
  // 데이터 수집 관련 상태
  const [selectedDataSource, setSelectedDataSource] = useState<string>('all')
  const [selectedYear, setSelectedYear] = useState<number>(2023)
  const [isCollecting, setIsCollecting] = useState(false)
  
  // 실시간 모니터링 상태
  const [collectionProgress, setCollectionProgress] = useState<{
    current: number
    total: number
    source: string
    status: 'idle' | 'collecting' | 'processing' | 'completed' | 'error'
    startTime: number | null
    estimatedTime: number | null
  }>({
    current: 0,
    total: 0,
    source: '',
    status: 'idle',
    startTime: null,
    estimatedTime: null
  })
  
  // 데이터 품질 분석 상태
  const [dataQuality, setDataQuality] = useState<{
    totalRecords: number
    bySource: Array<{source: string, count: number, avgConfidence: number}>
    byCountry: Array<{country: string, count: number, avgConfidence: number}>
    bySector: Array<{sector: string, count: number, avgConfidence: number}>
    byYear: Array<{year: number, count: number, avgConfidence: number}>
    missingData: Array<{country: string, sector: string, capitalType: string, year: number}>
  } | null>(null)
  
  // 수집 통계 상태
  const [collectionStats, setCollectionStats] = useState<{
    totalCollected: number
    totalProcessed: number
    successRate: number
    avgProcessingTime: number
    lastCollection: string | null
  } | null>(null)
  
  const API_BASE_URL = 'http://localhost:8001/api/v1/capitalflows'

  // 토스트 관리 함수들
  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const newToast: ToastMessage = {
      ...toast,
      id: Date.now().toString()
    }
    setToasts(prev => [...prev, newToast])
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  // 시스템 상태 조회
  const fetchSystemStats = async () => {
    try {
      // 캐시 방지를 위한 타임스탬프 추가
      const timestamp = new Date().getTime()
      const response = await fetch(`${API_BASE_URL}/health/?t=${timestamp}`, {
        cache: 'no-cache'
      })
      const data = await response.json()
      setSystemStats(data)
      setLastUpdated(new Date().toLocaleString('ko-KR'))
      console.log('시스템 상태 업데이트:', data.statistics)
    } catch (error) {
      console.error('시스템 상태 조회 실패:', error)
    }
  }

  // 메타데이터 조회
  const fetchMetadata = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/metadata/`)
      const data = await response.json()
      setDataSources(data.data_sources || [])
    } catch (error) {
      console.error('메타데이터 조회 실패:', error)
    }
  }

  // 처리 로그 조회
  const fetchProcessingLogs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/logs/?limit=50`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()
      setProcessingLogs(data.results || [])
    } catch (error) {
      console.error('처리 로그 조회 실패:', error)
      // 사용자에게 알림 표시 (선택사항)
      // alert(`처리 로그 조회 실패: ${error.message}`)
    }
  }

  // 데이터 품질 분석
  const fetchDataQuality = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/pipeline/quality-analysis/`)
      if (response.ok) {
        const data = await response.json()
        setDataQuality(data)
      }
    } catch (error) {
      console.error('데이터 품질 분석 실패:', error)
    }
  }

  // 수집 통계 조회
  const fetchCollectionStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/logs/?limit=100`)
      if (response.ok) {
        const data = await response.json()
        const logs = data.results || []
        
        const stats = {
          totalCollected: logs.reduce((sum: number, log: any) => sum + (log.records_processed || 0), 0),
          totalProcessed: logs.reduce((sum: number, log: any) => sum + (log.records_success || 0), 0),
          successRate: 0,
          avgProcessingTime: 0,
          lastCollection: logs.length > 0 ? logs[0].start_time : null
        }
        
        stats.successRate = stats.totalProcessed > 0 ? (stats.totalProcessed / stats.totalCollected) * 100 : 0
        stats.avgProcessingTime = logs.reduce((sum: number, log: any) => sum + (log.duration_seconds || 0), 0) / logs.length || 0
        
        setCollectionStats(stats)
      }
    } catch (error) {
      console.error('수집 통계 조회 실패:', error)
    }
  }

  // 데이터 수집 실행 (개선된 버전)
  const executeDataCollection = async () => {
    setIsCollecting(true)
    setLoading(true)
    
    // 수집 진행 상태 초기화
    setCollectionProgress({
      current: 0,
      total: 100,
      source: selectedDataSource,
      status: 'collecting',
      startTime: Date.now(),
      estimatedTime: null
    })
    
    try {
      const body = { 
        year: selectedYear,
        ...(selectedDataSource !== 'all' && { source: selectedDataSource })
      }
      
      // 수집 시작 알림
      addToast({
        type: 'info',
        title: '데이터 수집 시작',
        message: `${selectedDataSource} 소스에서 ${selectedYear}년 데이터 수집을 시작합니다...`
      })
      
      const response = await fetch(`${API_BASE_URL}/admin/collect/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        const results = result.results
        const sourceName = selectedDataSource === 'all' ? '전체 소스' : selectedDataSource
        const message = `${sourceName} 데이터 수집 완료 (${selectedYear}년): 수집 ${results.collected || 0}개, 생성 ${results.created || 0}개`
        
        // 수집 완료 상태 업데이트
        setCollectionProgress(prev => ({
          ...prev,
          status: 'completed',
          current: 100
        }))
        
        addToast({
          type: 'success',
          title: '데이터 수집 완료',
          message: message
        })
        
        // 데이터 품질 분석 및 통계 업데이트
        await Promise.all([
          fetchProcessingLogs(),
          fetchSystemStats(),
          fetchDataQuality(),
          fetchCollectionStats()
        ])
      } else {
        throw new Error(result.error || '데이터 수집 실패')
      }
    } catch (error) {
      setCollectionProgress(prev => ({
        ...prev,
        status: 'error'
      }))
      
      addToast({
        type: 'error',
        title: '데이터 수집 실패',
        message: error.message || error.toString()
      })
    } finally {
      setLoading(false)
      setIsCollecting(false)
    }
  }

  // 데이터 융합 실행
  const executeDataFusion = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/admin/fusion/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year_start: 1970,  // 전체 기간으로 변경
          year_end: 2024
        })
      })
      const result = await response.json()
      console.log('데이터 융합 결과:', result)
      
      addToast({
        type: 'success',
        title: '데이터 융합 완료',
        message: `처리: ${result.results?.processed || 0}개, 생성: ${result.results?.created || 0}개, 업데이트: ${result.results?.updated || 0}개`
      })
      
      // 융합 완료 후 강제 새로고침 (1초 후)
      setTimeout(() => {
        console.log('데이터 새로고침 시작...')
        fetchProcessingLogs()
        fetchSystemStats()
        addToast({
          type: 'info',
          title: '데이터 새로고침',
          message: '최신 데이터로 업데이트되었습니다.'
        })
      }, 1000)
    } catch (error) {
      addToast({
        type: 'error',
        title: '데이터 융합 실패',
        message: error.message || error.toString()
      })
    } finally {
      setLoading(false)
    }
  }

  // 데이터 검증 실행
  const executeDataValidation = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/admin/validate/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: 2023 })
      })
      const result = await response.json()
      addToast({
        type: 'success',
        title: '데이터 검증 완료',
        message: `검증: ${result.results?.validated || 0}개, 통과: ${result.results?.passed || 0}개`
      })
      fetchProcessingLogs()
      fetchSystemStats()
    } catch (error) {
      addToast({
        type: 'error',
        title: '데이터 검증 실패',
        message: error.message || error.toString()
      })
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    // 인증 상태 확인
    const authenticated = localStorage.getItem('admin_authenticated')
    if (authenticated === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchSystemStats()
      fetchMetadata()
      fetchProcessingLogs()
      fetchDataQuality()
      fetchCollectionStats()
    }
  }, [isAuthenticated])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR')
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A'
    if (seconds < 60) return `${seconds.toFixed(1)}초`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}분 ${remainingSeconds.toFixed(1)}초`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS': return 'text-green-600 bg-green-100'
      case 'FAILED': return 'text-red-600 bg-red-100'
      case 'PARTIAL': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  // 인증되지 않은 경우 로그인 페이지 표시
  if (!isAuthenticated) {
    return <AdminAuth onAuthenticated={() => setIsAuthenticated(true)} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-semibold text-gray-900">
              CapitalFlow 관리자 대시보드
            </h1>
            <div className="flex items-center space-x-4">
              {systemStats && (
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  systemStats.status === 'healthy' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  시스템 상태: {systemStats.status}
                </div>
              )}
              <button
                onClick={() => {
                  localStorage.removeItem('admin_authenticated')
                  setIsAuthenticated(false)
                }}
                className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: '시스템 개요' },
                { id: 'pipeline', name: '데이터 파이프라인' },
                { id: 'api-endpoints', name: 'API 엔드포인트' },
                { id: 'api-test', name: 'API 테스트' },
                { id: 'logs', name: '처리 로그' },
                { id: 'sources', name: '데이터 소스' }
              ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* 시스템 개요 탭 */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {systemStats && (
                <>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">처리된 데이터</h3>
                    <p className="text-3xl font-bold text-blue-600">
                      {(systemStats?.statistics?.processed_data_count || 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">개 레코드</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">원시 데이터</h3>
                    <p className="text-3xl font-bold text-green-600">
                      {(systemStats?.statistics?.raw_data_count || 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">개 레코드</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">활성 소스</h3>
                    <p className="text-3xl font-bold text-purple-600">
                      {systemStats?.statistics?.active_sources || 0}
                    </p>
                    <p className="text-sm text-gray-500">개 소스</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">데이터 품질</h3>
                    <p className="text-3xl font-bold text-orange-600">95.2%</p>
                    <p className="text-sm text-gray-500">평균 신뢰도</p>
                  </div>
                </>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">빠른 액션</h3>
                {lastUpdated && (
                  <span className="text-sm text-gray-500">
                    마지막 업데이트: {lastUpdated}
                  </span>
                )}
              </div>
              
              {/* 실시간 데이터 수집 모니터링 대시보드 */}
              <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">실시간 데이터 수집 모니터링</h4>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      collectionProgress.status === 'idle' ? 'bg-gray-400' :
                      collectionProgress.status === 'collecting' ? 'bg-yellow-400 animate-pulse' :
                      collectionProgress.status === 'processing' ? 'bg-blue-400 animate-pulse' :
                      collectionProgress.status === 'completed' ? 'bg-green-400' :
                      'bg-red-400'
                    }`}></div>
                    <span className="text-sm font-medium text-gray-700">
                      {collectionProgress.status === 'idle' ? '대기 중' :
                       collectionProgress.status === 'collecting' ? '수집 중' :
                       collectionProgress.status === 'processing' ? '처리 중' :
                       collectionProgress.status === 'completed' ? '완료' :
                       '오류'}
                    </span>
                  </div>
                </div>

                {/* 수집 진행률 바 */}
                {collectionProgress.status !== 'idle' && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>{collectionProgress.source} 소스 수집 중...</span>
                      <span>{collectionProgress.current}%</span>
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
                      <div className="text-xs text-gray-500 mt-1">
                        경과 시간: {Math.floor((Date.now() - collectionProgress.startTime) / 1000)}초
                      </div>
                    )}
                  </div>
                )}

                {/* 데이터 수집 컨트롤 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      데이터 소스
                    </label>
                    <select
                      value={selectedDataSource}
                      onChange={(e) => setSelectedDataSource(e.target.value)}
                      disabled={isCollecting}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="all">전체 소스</option>
                      <option value="imf">IMF</option>
                      <option value="worldbank">World Bank</option>
                      <option value="unctad">UNCTAD</option>
                      <option value="bis">BIS</option>
                      <option value="crunchbase">Crunchbase</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      연도
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      disabled={isCollecting}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value={2024}>2024년</option>
                      <option value={2023}>2023년</option>
                      <option value={2022}>2022년</option>
                      <option value={2021}>2021년</option>
                      <option value={2020}>2020년</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      연도 범위
                    </label>
                    <div className="flex space-x-2">
                      <select
                        disabled={isCollecting}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        <option value={2020}>2020년</option>
                        <option value={2021}>2021년</option>
                        <option value={2022}>2022년</option>
                        <option value={2023}>2023년</option>
                        <option value={2024}>2024년</option>
                      </select>
                      <span className="flex items-center text-gray-500">~</span>
                      <select
                        disabled={isCollecting}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        <option value={2024}>2024년</option>
                        <option value={2023}>2023년</option>
                        <option value={2022}>2022년</option>
                        <option value={2021}>2021년</option>
                        <option value={2020}>2020년</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={executeDataCollection}
                      disabled={loading || isCollecting}
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                      {isCollecting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          수집 중...
                        </>
                      ) : (
                        '데이터 수집 시작'
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* 데이터 품질 분석 및 종합 요약 대시보드 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* 데이터 품질 분석 */}
                <div className="bg-white p-6 rounded-lg shadow border">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">데이터 품질 분석</h4>
                  
                  {dataQuality ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{dataQuality.totalRecords.toLocaleString()}</div>
                          <div className="text-sm text-gray-600">총 레코드 수</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {dataQuality.bySource.length > 0 ? 
                              (dataQuality.bySource.reduce((sum, item) => sum + item.avgConfidence, 0) / dataQuality.bySource.length * 100).toFixed(1) + '%' : 
                              '0%'
                            }
                          </div>
                          <div className="text-sm text-gray-600">평균 신뢰도</div>
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-gray-700 mb-2">소스별 데이터 분포</h5>
                        <div className="space-y-2">
                          {dataQuality.bySource.slice(0, 5).map((item, index) => (
                            <div key={index} className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">{item.source}</span>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium">{item.count}개</span>
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-blue-500 h-2 rounded-full" 
                                    style={{ width: `${(item.avgConfidence * 100)}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs text-gray-500">{(item.avgConfidence * 100).toFixed(1)}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      데이터 품질 분석 중...
                    </div>
                  )}
                </div>

                {/* 수집 통계 */}
                <div className="bg-white p-6 rounded-lg shadow border">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">수집 통계</h4>
                  
                  {collectionStats ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-indigo-50 rounded-lg">
                          <div className="text-2xl font-bold text-indigo-600">{collectionStats.totalCollected.toLocaleString()}</div>
                          <div className="text-sm text-gray-600">총 수집</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">{collectionStats.totalProcessed.toLocaleString()}</div>
                          <div className="text-sm text-gray-600">총 처리</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{collectionStats.successRate.toFixed(1)}%</div>
                          <div className="text-sm text-gray-600">성공률</div>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">{collectionStats.avgProcessingTime.toFixed(1)}초</div>
                          <div className="text-sm text-gray-600">평균 처리시간</div>
                        </div>
                      </div>
                      
                      {collectionStats.lastCollection && (
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm text-gray-600">마지막 수집</div>
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(collectionStats.lastCollection).toLocaleString('ko-KR')}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-2"></div>
                      수집 통계 분석 중...
                    </div>
                  )}
                </div>
              </div>

              {/* 빠른 액션 버튼들 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => {
                    console.log('수동 새로고침 시작...')
                    fetchSystemStats()
                    fetchMetadata()
                    fetchProcessingLogs()
                    fetchDataQuality()
                    fetchCollectionStats()
                    addToast({
                      type: 'info',
                      title: '데이터 새로고침',
                      message: '모든 데이터를 다시 불러왔습니다.'
                    })
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  🔄 데이터 새로고침
                </button>
                <button
                  onClick={() => executeDataFusion()}
                  disabled={loading}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {loading ? '처리중...' : '데이터 융합 실행'}
                </button>
                <button
                  onClick={() => {
                    fetchDataQuality()
                    fetchCollectionStats()
                    addToast({
                      type: 'info',
                      title: '분석 새로고침',
                      message: '데이터 품질 분석을 업데이트했습니다.'
                    })
                  }}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors flex items-center justify-center"
                >
                  📊 분석 새로고침
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 데이터 관리 탭 */}
        {activeTab === 'data-management' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">데이터 처리 작업</h3>
              
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">실제 데이터 수집</h4>
                  <p className="text-sm text-gray-600 mb-3">외부 소스에서 실제 데이터를 수집합니다.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        데이터 소스
                      </label>
                      <select
                        value={selectedDataSource}
                        onChange={(e) => setSelectedDataSource(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">전체 소스</option>
                        <option value="imf">IMF</option>
                        <option value="worldbank">World Bank</option>
                        <option value="unctad">UNCTAD</option>
                        <option value="bis">BIS</option>
                        <option value="crunchbase">Crunchbase</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        연도
                      </label>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={2024}>2024년</option>
                        <option value={2023}>2023년</option>
                        <option value={2022}>2022년</option>
                        <option value={2021}>2021년</option>
                        <option value={2020}>2020년</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={executeDataCollection}
                        disabled={loading || isCollecting}
                        className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                      >
                        {isCollecting ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            수집 중...
                          </>
                        ) : (
                          '데이터 수집 시작'
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    <p>• <strong>World Bank</strong>: FDI 및 포트폴리오 투자 데이터</p>
                    <p>• <strong>IMF</strong>: 국제수지 및 자본흐름 데이터</p>
                    <p>• <strong>UNCTAD</strong>: 글로벌 FDI 통계</p>
                    <p>• <strong>BIS</strong>: 국제은행 자본흐름</p>
                    <p>• <strong>Crunchbase</strong>: 벤처캐피털 투자 데이터</p>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">데이터 융합</h4>
                  <p className="text-sm text-gray-600 mb-3">다중 소스 데이터를 ML 기반으로 융합합니다.</p>
                  <button
                    onClick={() => executeDataFusion()}
                    disabled={loading}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    융합 실행
                  </button>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">데이터 검증</h4>
                  <p className="text-sm text-gray-600 mb-3">처리된 데이터의 품질을 검증합니다.</p>
                  <button
                    onClick={() => executeDataValidation()}
                    disabled={loading}
                    className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    검증 실행
                  </button>
                </div>

                {/* 수집되지 않은 데이터 분석 */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">수집되지 않은 데이터 분석</h4>
                  <p className="text-sm text-gray-600 mb-3">누락된 데이터 조합을 분석합니다.</p>
                  
                  {dataQuality && dataQuality.missingData ? (
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600">
                        총 {dataQuality.missingData.length}개의 누락된 조합 발견
                      </div>
                      <div className="max-h-32 overflow-y-auto">
                        {dataQuality.missingData.slice(0, 10).map((item, index) => (
                          <div key={index} className="text-xs text-gray-500 py-1 border-b border-gray-100">
                            {item.country} - {item.sector} - {item.capitalType} ({item.year}년)
                          </div>
                        ))}
                        {dataQuality.missingData.length > 10 && (
                          <div className="text-xs text-gray-400 py-1">
                            ... 및 {dataQuality.missingData.length - 10}개 더
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">분석 중...</div>
                  )}
                </div>

                {/* 실시간 수집 모니터링 */}
                <div className="border rounded-lg p-4">
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
          </div>
        )}

        {/* 데이터 파이프라인 탭 */}
          {activeTab === 'pipeline' && (
            <div className="space-y-6">
              <DataPipelinePanel apiBaseUrl={API_BASE_URL} />
            </div>
          )}

          {activeTab === 'api-endpoints' && (
            <div className="space-y-6">
              <APIEndpointsPanel apiBaseUrl={API_BASE_URL} />
            </div>
          )}

        {/* API 테스트 탭 */}
        {activeTab === 'api-test' && (
          <APITestPanel baseUrl={API_BASE_URL} />
        )}

        {/* 처리 로그 탭 */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">처리 로그</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      처리 타입
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      소스/국가
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      처리 결과
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      시작 시간
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      소요 시간
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {processingLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {log.processing_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.source_name || log.country_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        성공: {log.records_success} / 실패: {log.records_failed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(log.start_time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDuration(log.duration_seconds)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 데이터 소스 탭 */}
        {activeTab === 'sources' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">데이터 소스 관리</h3>
              <p className="text-sm text-gray-600 mb-6">
                각 데이터 소스의 상태를 확인하고 개별적으로 데이터를 수집할 수 있습니다.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dataSources.map((source) => (
                <DataSourceCard
                  key={source.id}
                  source={source}
                  onCollect={executeDataCollection}
                  loading={loading}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 토스트 알림 */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  )
}
