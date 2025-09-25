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
      const response = await fetch(`${API_BASE_URL}/health/`)
      const data = await response.json()
      setSystemStats(data)
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

  // 데이터 수집 실행
  const executeDataCollection = async (sourceName?: string) => {
    setLoading(true)
    try {
      const body = sourceName ? { source: sourceName } : {}
      const response = await fetch(`${API_BASE_URL}/admin/collect/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      const message = sourceName 
        ? `${sourceName} 데이터 수집 완료: ${result.collected_records}개 레코드`
        : `전체 데이터 수집 완료: ${result.total_records}개 레코드`
      
      addToast({
        type: 'success',
        title: '데이터 수집 완료',
        message: message
      })
      fetchProcessingLogs()
      fetchSystemStats() // 통계 업데이트
    } catch (error) {
      addToast({
        type: 'error',
        title: '데이터 수집 실패',
        message: error.message || error.toString()
      })
    } finally {
      setLoading(false)
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
          year_start: 2020,
          year_end: 2024
        })
      })
      const result = await response.json()
      addToast({
        type: 'success',
        title: '데이터 융합 완료',
        message: `처리: ${result.results?.processed || 0}개, 생성: ${result.results?.created || 0}개`
      })
      fetchProcessingLogs()
      fetchSystemStats()
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
              <h3 className="text-lg font-medium text-gray-900 mb-4">빠른 액션</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => {
                    fetchSystemStats()
                    fetchMetadata()
                    fetchProcessingLogs()
                    addToast({
                      type: 'info',
                      title: '데이터 새로고침',
                      message: '모든 데이터를 다시 불러왔습니다.'
                    })
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  데이터 새로고침
                </button>
                <button
                  onClick={() => executeDataCollection()}
                  disabled={loading}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {loading ? '처리중...' : '전체 데이터 수집'}
                </button>
                <button
                  onClick={() => executeDataFusion()}
                  disabled={loading}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {loading ? '처리중...' : '데이터 융합 실행'}
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
                  <h4 className="font-medium text-gray-900 mb-2">데이터 수집</h4>
                  <p className="text-sm text-gray-600 mb-3">외부 소스에서 새로운 데이터를 수집합니다.</p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => executeDataCollection()}
                      disabled={loading}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      전체 소스 수집
                    </button>
                    <button
                      onClick={() => executeDataCollection('IMF')}
                      disabled={loading}
                      className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                      IMF만 수집
                    </button>
                    <button
                      onClick={() => executeDataCollection('Crunchbase')}
                      disabled={loading}
                      className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                      Crunchbase만 수집
                    </button>
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
