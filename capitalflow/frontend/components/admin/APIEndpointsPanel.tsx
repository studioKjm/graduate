'use client'

import React, { useState, useEffect } from 'react'
import CountryQuickLinks from './CountryQuickLinks'

interface APIEndpoint {
  id: string
  category: string
  name: string
  method: string
  path: string
  description: string
  parameters?: Array<{
    name: string
    type: string
    required: boolean
    description: string
    example?: string
  }>
  examples: Array<{
    title: string
    url: string
    description: string
  }>
}

interface APIEndpointsPanelProps {
  apiBaseUrl: string
}

export default function APIEndpointsPanel({ apiBaseUrl }: APIEndpointsPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [testResult, setTestResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  // API 엔드포인트 정의
  const apiEndpoints: APIEndpoint[] = [
    // 메인 API
    {
      id: 'capitalflows-main',
      category: 'main',
      name: '자본 흐름 데이터',
      method: 'GET',
      path: '/capitalflows/',
      description: '전세계 자본 흐름 데이터를 조회합니다. 필터링, 정렬, 집계 기능을 제공합니다.',
      parameters: [
        { name: 'country', type: 'string', required: false, description: '국가 코드 (예: CHN, USA)', example: 'CHN' },
        { name: 'sector', type: 'string', required: false, description: '분야 코드 (예: AI, BIO)', example: 'AI' },
        { name: 'capital_type', type: 'string', required: false, description: '자본 타입 (예: FDI, VC)', example: 'FDI' },
        { name: 'year', type: 'integer', required: false, description: '연도', example: '2023' },
        { name: 'aggregate', type: 'boolean', required: false, description: '집계 모드', example: 'true' },
        { name: 'page_size', type: 'integer', required: false, description: '페이지 크기', example: '100' },
        { name: 'ordering', type: 'string', required: false, description: '정렬 기준', example: 'country__code' }
      ],
      examples: [
        {
          title: '전체 데이터',
          url: `${apiBaseUrl}/capitalflows/`,
          description: '모든 자본 흐름 데이터 조회'
        },
        {
          title: '중국 AI 분야',
          url: `${apiBaseUrl}/capitalflows/?country=CHN&sector=AI`,
          description: '중국의 AI 분야 투자 데이터'
        },
        {
          title: '중국 AI 분야 집계',
          url: `${apiBaseUrl}/capitalflows/?country=CHN&sector=AI&aggregate=true`,
          description: '중국 AI 분야 총 투자액'
        },
        {
          title: '국가별 정렬',
          url: `${apiBaseUrl}/capitalflows/?ordering=country__code&page_size=100`,
          description: '국가 코드별로 정렬된 데이터'
        }
      ]
    },
    
    // 메타데이터 API
    {
      id: 'metadata',
      category: 'metadata',
      name: '메타데이터',
      method: 'GET',
      path: '/metadata/',
      description: '국가, 분야, 자본타입 등 메타데이터를 제공합니다.',
      examples: [
        {
          title: '전체 메타데이터',
          url: `${apiBaseUrl}/metadata/`,
          description: '모든 메타데이터 (국가, 분야, 자본타입)'
        }
      ]
    },

    // 시스템 관리 API
    {
      id: 'health-check',
      category: 'system',
      name: '시스템 상태',
      method: 'GET',
      path: '/health/',
      description: '시스템 상태를 확인합니다.',
      examples: [
        {
          title: '헬스 체크',
          url: `${apiBaseUrl}/health/`,
          description: '시스템 상태 및 데이터베이스 연결 확인'
        }
      ]
    },

    // 관리자 API - 데이터 수집
    {
      id: 'admin-collect',
      category: 'admin',
      name: '데이터 수집',
      method: 'POST',
      path: '/admin/collect/',
      description: '다양한 소스에서 데이터를 수집합니다.',
      parameters: [
        { name: 'source', type: 'string', required: false, description: '데이터 소스 (IMF, OECD, Crunchbase)', example: 'IMF' },
        { name: 'years', type: 'array', required: false, description: '수집할 연도 범위', example: '[2020, 2023]' }
      ],
      examples: [
        {
          title: 'IMF 데이터 수집',
          url: `${apiBaseUrl}/admin/collect/`,
          description: 'POST 요청으로 IMF 데이터 수집 실행'
        }
      ]
    },

    // 관리자 API - 데이터 융합
    {
      id: 'admin-fusion',
      category: 'admin',
      name: '데이터 융합',
      method: 'POST',
      path: '/admin/fusion/',
      description: '다중 소스 데이터를 ML 기반으로 융합합니다.',
      parameters: [
        { name: 'year_start', type: 'integer', required: false, description: '시작 연도', example: '2020' },
        { name: 'year_end', type: 'integer', required: false, description: '종료 연도', example: '2024' },
        { name: 'countries', type: 'array', required: false, description: '대상 국가 목록', example: '["CHN", "USA"]' }
      ],
      examples: [
        {
          title: '전체 데이터 융합',
          url: `${apiBaseUrl}/admin/fusion/`,
          description: 'POST 요청으로 데이터 융합 실행'
        }
      ]
    },

    // 관리자 API - 데이터 검증
    {
      id: 'admin-validate',
      category: 'admin',
      name: '데이터 검증',
      method: 'POST',
      path: '/admin/validate/',
      description: '처리된 데이터의 품질을 검증합니다.',
      parameters: [
        { name: 'year', type: 'integer', required: false, description: '검증할 연도', example: '2023' }
      ],
      examples: [
        {
          title: '2023년 데이터 검증',
          url: `${apiBaseUrl}/admin/validate/`,
          description: 'POST 요청으로 2023년 데이터 검증'
        }
      ]
    },

    // 관리자 API - 처리 로그
    {
      id: 'admin-logs',
      category: 'admin',
      name: '처리 로그',
      method: 'GET',
      path: '/admin/logs/',
      description: '데이터 처리 로그를 조회합니다.',
      parameters: [
        { name: 'limit', type: 'integer', required: false, description: '조회할 로그 수', example: '50' },
        { name: 'processing_type', type: 'string', required: false, description: '처리 타입', example: 'COLLECTION' }
      ],
      examples: [
        {
          title: '최근 로그 50개',
          url: `${apiBaseUrl}/admin/logs/?limit=50`,
          description: '최근 처리 로그 50개 조회'
        }
      ]
    },

    // 파이프라인 API
    {
      id: 'pipeline-overview',
      category: 'pipeline',
      name: '파이프라인 개요',
      method: 'GET',
      path: '/pipeline/overview/',
      description: '데이터 파이프라인 전체 현황을 조회합니다.',
      examples: [
        {
          title: '파이프라인 현황',
          url: `${apiBaseUrl}/pipeline/overview/`,
          description: '소스별 통계, 국가별 통계, 품질 분석'
        }
      ]
    },

    {
      id: 'pipeline-raw-data',
      category: 'pipeline',
      name: '원시 데이터',
      method: 'GET',
      path: '/pipeline/raw-data/',
      description: '원시 데이터 상세 정보를 조회합니다.',
      parameters: [
        { name: 'page_size', type: 'integer', required: false, description: '페이지 크기', example: '10' },
        { name: 'source', type: 'string', required: false, description: '데이터 소스', example: 'IMF' }
      ],
      examples: [
        {
          title: '원시 데이터 샘플',
          url: `${apiBaseUrl}/pipeline/raw-data/?page_size=10`,
          description: '원시 데이터 10개 샘플 조회'
        }
      ]
    },

    {
      id: 'pipeline-processed-data',
      category: 'pipeline',
      name: '정제 데이터',
      method: 'GET',
      path: '/pipeline/processed-data/',
      description: '정제된 데이터 상세 정보를 조회합니다.',
      parameters: [
        { name: 'page_size', type: 'integer', required: false, description: '페이지 크기', example: '10' },
        { name: 'country', type: 'string', required: false, description: '국가 코드', example: 'CHN' }
      ],
      examples: [
        {
          title: '정제 데이터 샘플',
          url: `${apiBaseUrl}/pipeline/processed-data/?page_size=10`,
          description: '정제된 데이터 10개 샘플 조회'
        }
      ]
    },

    {
      id: 'pipeline-traceability',
      category: 'pipeline',
      name: '데이터 추적성',
      method: 'GET',
      path: '/pipeline/traceability/',
      description: '특정 데이터의 처리 과정을 추적합니다.',
      parameters: [
        { name: 'country', type: 'string', required: true, description: '국가 코드', example: 'CHN' },
        { name: 'sector', type: 'string', required: true, description: '분야 코드', example: 'AI' },
        { name: 'capital_type', type: 'string', required: true, description: '자본 타입', example: 'FDI' },
        { name: 'year', type: 'integer', required: true, description: '연도', example: '2023' }
      ],
      examples: [
        {
          title: '중국 AI FDI 추적',
          url: `${apiBaseUrl}/pipeline/traceability/?country=CHN&sector=AI&capital_type=FDI&year=2023`,
          description: '2023년 중국 AI 분야 FDI 데이터 처리 과정 추적'
        }
      ]
    },

    {
      id: 'pipeline-quality',
      category: 'pipeline',
      name: '품질 분석',
      method: 'GET',
      path: '/pipeline/quality-analysis/',
      description: '데이터 품질 분석 결과를 조회합니다.',
      examples: [
        {
          title: '품질 분석',
          url: `${apiBaseUrl}/pipeline/quality-analysis/`,
          description: '소스별 품질, 융합 성능, 연도별 트렌드 분석'
        }
      ]
    }
  ]

  const categories = [
    { id: 'all', name: '전체', color: 'bg-gray-100' },
    { id: 'main', name: '메인 API', color: 'bg-blue-100' },
    { id: 'metadata', name: '메타데이터', color: 'bg-green-100' },
    { id: 'system', name: '시스템', color: 'bg-yellow-100' },
    { id: 'admin', name: '관리자', color: 'bg-red-100' },
    { id: 'pipeline', name: '파이프라인', color: 'bg-purple-100' }
  ]

  const filteredEndpoints = apiEndpoints.filter(endpoint => {
    const matchesCategory = selectedCategory === 'all' || endpoint.category === selectedCategory
    const matchesSearch = endpoint.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         endpoint.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         endpoint.path.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const testAPI = async (url: string) => {
    setIsLoading(true)
    setTestResult(null)
    
    try {
      const response = await fetch(url)
      const data = await response.json()
      setTestResult({
        success: response.ok,
        status: response.status,
        data: data,
        url: url
      })
    } catch (error) {
      setTestResult({
        success: false,
        status: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        url: url
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-100 text-green-800'
      case 'POST': return 'bg-blue-100 text-blue-800'
      case 'PUT': return 'bg-yellow-100 text-yellow-800'
      case 'DELETE': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🔗 API 엔드포인트 관리</h2>
        <p className="text-gray-600 mb-3">
          모든 API 엔드포인트를 체계적으로 관리하고 테스트할 수 있습니다.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">💡 사용 방법</h3>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• <strong>🔗 버튼</strong>: API를 새 탭에서 바로 열기</li>
            <li>• <strong>URL 클릭</strong>: 경로나 예제 URL을 클릭하여 새 탭에서 열기</li>
            <li>• <strong>테스트 버튼</strong>: 현재 페이지에서 API 응답 확인</li>
            <li>• <strong>복사 버튼</strong>: URL을 클립보드에 복사</li>
          </ul>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* 카테고리 필터 */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-500 text-white'
                      : `${category.color} text-gray-700 hover:bg-gray-200`
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* 검색 */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">검색</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="API 이름, 설명, 경로로 검색..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API 목록 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            API 엔드포인트 ({filteredEndpoints.length}개)
          </h3>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredEndpoints.map((endpoint) => (
              <div
                key={endpoint.id}
                onClick={() => setSelectedEndpoint(endpoint)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedEndpoint?.id === endpoint.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{endpoint.name}</h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(`${apiBaseUrl}${endpoint.path}`, '_blank')
                      }}
                      className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs"
                      title="새 탭에서 열기"
                    >
                      🔗
                    </button>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getMethodColor(endpoint.method)}`}>
                      {endpoint.method}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">{endpoint.description}</p>
                <code 
                  className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-800 cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    window.open(`${apiBaseUrl}${endpoint.path}`, '_blank')
                  }}
                  title="클릭하여 새 탭에서 열기"
                >
                  {endpoint.path}
                </code>
              </div>
            ))}
          </div>
        </div>

        {/* API 상세 정보 */}
        <div className="space-y-4">
          {selectedEndpoint ? (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{selectedEndpoint.name}</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getMethodColor(selectedEndpoint.method)}`}>
                  {selectedEndpoint.method}
                </span>
              </div>

              <p className="text-gray-600 mb-4">{selectedEndpoint.description}</p>

              {/* 경로 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">경로</label>
                <div className="flex items-center gap-2">
                  <code 
                    className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm text-gray-800 cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={() => window.open(`${apiBaseUrl}${selectedEndpoint.path}`, '_blank')}
                    title="클릭하여 새 탭에서 열기"
                  >
                    {selectedEndpoint.path}
                  </code>
                  <button
                    onClick={() => window.open(`${apiBaseUrl}${selectedEndpoint.path}`, '_blank')}
                    className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    🔗 열기
                  </button>
                  <button
                    onClick={() => copyToClipboard(`${apiBaseUrl}${selectedEndpoint.path}`)}
                    className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                  >
                    복사
                  </button>
                </div>
              </div>

              {/* 파라미터 */}
              {selectedEndpoint.parameters && selectedEndpoint.parameters.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">파라미터</label>
                  <div className="space-y-2">
                    {selectedEndpoint.parameters.map((param, index) => (
                      <div key={index} className="border border-gray-200 rounded p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-sm font-medium text-blue-600">{param.name}</code>
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">{param.type}</span>
                          {param.required && (
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">필수</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{param.description}</p>
                        {param.example && (
                          <code className="text-xs bg-gray-50 px-2 py-1 rounded text-gray-700 mt-1 inline-block">
                            예: {param.example}
                          </code>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 예제 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">사용 예제</label>
                <div className="space-y-3">
                  {selectedEndpoint.examples.map((example, index) => (
                    <div key={index} className="border border-gray-200 rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-gray-900">{example.title}</h5>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => window.open(example.url, '_blank')}
                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                          >
                            🔗 열기
                          </button>
                          <button
                            onClick={() => testAPI(example.url)}
                            disabled={isLoading}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm disabled:opacity-50"
                          >
                            {isLoading ? '테스트 중...' : '테스트'}
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{example.description}</p>
                      <div className="flex items-center gap-2">
                        <code 
                          className="flex-1 bg-gray-50 px-2 py-1 rounded text-xs text-gray-800 break-all cursor-pointer hover:bg-blue-50"
                          onClick={() => window.open(example.url, '_blank')}
                          title="클릭하여 새 탭에서 열기"
                        >
                          {example.url}
                        </code>
                        <button
                          onClick={() => copyToClipboard(example.url)}
                          className="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-xs"
                        >
                          복사
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              왼쪽에서 API 엔드포인트를 선택하세요
            </div>
          )}

          {/* 테스트 결과 */}
          {testResult && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">테스트 결과</h3>
              
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 rounded text-sm font-semibold ${
                    testResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {testResult.success ? '성공' : '실패'}
                  </span>
                  <span className="text-sm text-gray-600">상태: {testResult.status}</span>
                </div>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-800 break-all">
                  {testResult.url}
                </code>
              </div>

              <div className="max-h-64 overflow-y-auto">
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                  {testResult.error ? testResult.error : JSON.stringify(testResult.data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 국가별 빠른 링크 */}
      <CountryQuickLinks apiBaseUrl={apiBaseUrl} />
    </div>
  )
}
