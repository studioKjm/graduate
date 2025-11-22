'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import DataSourceCard from '@/components/admin/DataSourceCard'
import APITestPanel from '@/components/admin/APITestPanel'
import ToastContainer, { ToastMessage } from '@/components/admin/Toast'
import { useAuth } from '@/hooks/useAuth'
import DataPipelinePanel from '@/components/admin/DataPipelinePanel'
import APIEndpointsPanel from '@/components/admin/APIEndpointsPanel'
import AdminOverviewTab from '@/components/admin/AdminOverviewTab'
import AdminDataManagementTab from '@/components/admin/AdminDataManagementTab'
import { 
  DataSource, 
  ProcessingLog, 
  SystemStats, 
  CollectionProgress, 
  DataQuality, 
  CollectionStats, 
  DetailedStats 
} from '@/types/admin'

export default function AdminPage() {
  const router = useRouter()
  const { isAuthenticated, isAdmin, isLoading, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [isRedirecting, setIsRedirecting] = useState(false)  // 리다이렉트 중 플래그
  const hasRedirected = useRef(false)  // 리다이렉트 실행 여부 추적 (무한 루프 방지)
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [processingLogs, setProcessingLogs] = useState<ProcessingLog[]>([])
  const [loading, setLoading] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [lastUpdated, setLastUpdated] = useState<string>('')
  
  // 데이터 수집 관련 상태
  const [selectedYear, setSelectedYear] = useState<number>(2024)
  const [isCollecting, setIsCollecting] = useState(false)
  
  // 실시간 모니터링 상태
  const [collectionProgress, setCollectionProgress] = useState<CollectionProgress>({
    current: 0,
    total: 0,
    source: '',
    status: 'idle',
    startTime: null,
    estimatedTime: null
  })
  
  // 데이터 품질 분석 상태
  const [dataQuality, setDataQuality] = useState<DataQuality | null>(null)
  
  // 수집 통계 상태
  const [collectionStats, setCollectionStats] = useState<CollectionStats | null>(null)
  
  // 상세 통계 상태
  const [detailedStats, setDetailedStats] = useState<DetailedStats | null>(null)
  
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
      console.log('시스템 상태 조회 시작...')
      const timestamp = new Date().getTime()
      const response = await fetch(`${API_BASE_URL}/health/?t=${timestamp}`, {
        cache: 'no-cache'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('시스템 상태 조회 성공:', data)
      setSystemStats(data)
      setLastUpdated(new Date().toLocaleString('ko-KR'))
    } catch (error) {
      console.error('시스템 상태 조회 실패:', error)
      addToast({
        type: 'error',
        title: '시스템 상태 조회 실패',
        message: error instanceof Error ? error.message : String(error)
      })
    }
  }

  // 메타데이터 조회
  const fetchMetadata = async () => {
    try {
      console.log('메타데이터 조회 시작...')
      const response = await fetch(`${API_BASE_URL}/metadata/`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('메타데이터 조회 성공:', data)
      setDataSources(data.data_sources || [])
    } catch (error) {
      console.error('메타데이터 조회 실패:', error)
      addToast({
        type: 'error',
        title: '메타데이터 조회 실패',
        message: error instanceof Error ? error.message : String(error)
      })
    }
  }

  // 처리 로그 조회
  const fetchProcessingLogs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/logs/`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setProcessingLogs(data.logs || [])
    } catch (error) {
      console.error('처리 로그 조회 실패:', error)
      addToast({
        type: 'error',
        title: '처리 로그 조회 실패',
        message: error instanceof Error ? error.message : String(error)
      })
    }
  }

  // 데이터 품질 분석 조회
  const fetchDataQuality = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/pipeline/quality-analysis/`)
      const data = await response.json()
      
      if (data.success) {
        setDataQuality({
          totalRecords: data.totalRecords || 0,
          bySource: data.bySource || [],
          byCountry: data.byCountry || [],
          bySector: data.bySector || [],
          byYear: data.byYear || [],
          missingData: data.missingData || []
        })
      }
    } catch (error) {
      console.error('데이터 품질 분석 조회 실패:', error)
    }
  }

  // 수집 통계 조회
  const fetchCollectionStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/collection-stats/`)
      if (response.ok) {
        const data = await response.json()
        
        if (data.success) {
          const stats = {
            totalCollected: data.summary.total_collected,
            totalProcessed: data.summary.total_processed,
            successRate: data.summary.success_rate,
            avgProcessingTime: data.summary.avg_processing_time,
            overallCollectionRate: data.summary.overall_collection_rate,
            totalPossibleCombinations: data.summary.total_possible_combinations,
            lastCollection: data.summary.last_collection
          }
          
          setCollectionStats(stats)
          
          setDetailedStats({
            yearStats: data.year_stats || [],
            countryStats: data.country_stats || [],
            sectorStats: data.sector_stats || [],
            capitalTypeStats: data.capital_type_stats || [],
            sourceStats: data.source_stats || [],
            missingData: data.missing_data || []
          })
        }
      }
    } catch (error) {
      console.error('수집 통계 조회 실패:', error)
    }
  }


  // 데이터 융합 실행
  const executeDataFusion = async (fusionSettings?: any) => {
    setLoading(true)
    try {
      const body = fusionSettings ? {
        year_start: fusionSettings.yearStart,
        year_end: fusionSettings.yearEnd,
        mode: fusionSettings.mode
      } : { year: 2023 }
      
      console.log('융합 요청:', body)
      
      const response = await fetch(`${API_BASE_URL}/admin/fusion/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const result = await response.json()
      
      if (result.success) {
        addToast({
          type: 'success',
          title: '데이터 융합 완료',
          message: `처리: ${result.results?.processed || 0}개, 생성: ${result.results?.created || 0}개, 업데이트: ${result.results?.updated || 0}개`
        })
      } else {
        addToast({
          type: 'error',
          title: '데이터 융합 실패',
          message: result.error || '알 수 없는 오류가 발생했습니다.'
        })
      }
      
      fetchProcessingLogs()
      fetchSystemStats()
    } catch (error) {
      addToast({
        type: 'error',
        title: '데이터 융합 실패',
        message: error instanceof Error ? error.message : String(error)
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
        message: error instanceof Error ? error.message : String(error)
      })
    } finally {
      setLoading(false)
    }
  }

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

  // 인증 및 관리자 권한 확인 (useEffect에서만 상태 변경)
  useEffect(() => {
    console.log('🔒 관리자 페이지 접근 확인:', { isAuthenticated, isAdmin, isLoading, isRedirecting, hasRedirected: hasRedirected.current })
    
    // 로딩이 완료되면 즉시 체크
    if (!isLoading) {
      // 인증되지 않았거나 관리자가 아닌 경우 즉시 로그인 페이지로 리다이렉트
      if (!isAuthenticated || !isAdmin) {
        if (!hasRedirected.current) {
          console.log('❌ 접근 거부 - 로그인 페이지로 리다이렉트', { isAuthenticated, isAdmin })
          hasRedirected.current = true
          setIsRedirecting(true)
          // 즉시 리다이렉트
          window.location.href = '/auth/login'
        }
        return
      }
      
      console.log('✅ 관리자 권한 확인됨')
      // 관리자 권한이 확인되면 리다이렉트 플래그 해제
      if (isRedirecting) {
        setIsRedirecting(false)
      }
      // 관리자 권한이 확인되면 리다이렉트 플래그 초기화
      hasRedirected.current = false
    } else {
      // 로딩 중일 때는 리다이렉트 플래그 초기화하지 않음
      console.log('⏳ 인증 상태 확인 중...')
    }
  }, [isAuthenticated, isAdmin, isLoading, isRedirecting])

  // 데이터 로딩 (인증 및 관리자 권한 확인 후에만 실행)
  useEffect(() => {
    // 로딩이 완료되고, 인증되었고, 관리자이며, 리다이렉트 중이 아닐 때만 데이터 로딩
    if (!isLoading && isAuthenticated && isAdmin && !isRedirecting) {
      console.log('✅ 인증 완료, 데이터 로딩 시작...')
      const loadData = async () => {
        try {
          await Promise.all([
            fetchSystemStats(),
            fetchMetadata(),
            fetchProcessingLogs(),
            fetchDataQuality(),
            fetchCollectionStats()
          ])
          console.log('✅ 모든 데이터 로딩 완료')
        } catch (error) {
          console.error('❌ 데이터 로딩 중 오류:', error)
        }
      }
      loadData()
    }
  }, [isAuthenticated, isAdmin, isLoading, isRedirecting])

  // 로딩 중이거나 리다이렉트 중이거나 인증되지 않았거나 관리자가 아닌 경우
  // 모든 조건을 만족해야만 페이지 렌더링
  // 주의: 모든 훅은 조건부 렌더링 전에 호출되어야 함
  if (isLoading || isRedirecting || !isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4" />
          <p className="text-gray-600">
            {isLoading 
              ? '로딩 중...' 
              : isRedirecting 
                ? '리다이렉트 중...' 
                : '접근 권한 확인 중...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-semibold text-gray-900">
              CapitalFlow 관리자 대시보드
            </h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  logout()
                  router.push('/auth/login')
                }}
                className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: '시스템 개요' },
              { id: 'data-management', name: '데이터 관리' },
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <AdminOverviewTab
            systemStats={systemStats}
            collectionProgress={collectionProgress}
            dataQuality={dataQuality}
            collectionStats={collectionStats}
            detailedStats={detailedStats}
            lastUpdated={lastUpdated}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            isCollecting={isCollecting}
            loading={loading}
            executeDataFusion={executeDataFusion}
            fetchDataQuality={fetchDataQuality}
            fetchCollectionStats={fetchCollectionStats}
            fetchSystemStats={fetchSystemStats}
            fetchMetadata={fetchMetadata}
            fetchProcessingLogs={fetchProcessingLogs}
            addToast={addToast}
          />
        )}
        
        {activeTab === 'data-management' && (
          <AdminDataManagementTab
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            executeDataFusion={executeDataFusion}
            executeDataValidation={executeDataValidation}
            dataQuality={dataQuality}
            isCollecting={isCollecting}
            loading={loading}
            collectionProgress={collectionProgress}
            addToast={addToast}
          />
        )}
        
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

        {activeTab === 'api-test' && (
          <APITestPanel baseUrl={API_BASE_URL} />
        )}

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
                  onCollect={() => {}}
                  loading={loading}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} onRemoveToast={() => {}} />
    </div>
  )
}
