'use client'

import { useState } from 'react'

interface APITestResult {
  success: boolean
  data?: any
  error?: string
  duration: number
  status?: number
}

interface APIEndpoint {
  endpoint: string
  method: string
  description: string
  sampleParams?: string
  requiresAuth?: boolean
}

const API_ENDPOINTS: APIEndpoint[] = [
  {
    endpoint: '/health/',
    method: 'GET',
    description: '시스템 상태 및 통계 확인',
  },
  {
    endpoint: '/metadata/',
    method: 'GET',
    description: '국가, 분야, 자본타입, 데이터소스 메타데이터',
  },
  {
    endpoint: '/capitalflows/',
    method: 'GET',
    description: '기본 자본 흐름 데이터 (빈 결과)',
  },
  {
    endpoint: '/capitalflows/?limit=5',
    method: 'GET',
    description: '최근 5개 자본 흐름 데이터',
  },
  {
    endpoint: '/capitalflows/?sector=AI&year=2023',
    method: 'GET',
    description: 'AI 분야 2023년 데이터',
  },
  {
    endpoint: '/capitalflows/?country=USA&sector=AI',
    method: 'GET',
    description: '미국 AI 분야 모든 연도 데이터',
  },
  {
    endpoint: '/capitalflows/?sector=AI&capital_types=VC&capital_types=FDI&aggregate=true',
    method: 'GET',
    description: 'AI 분야 VC+FDI 집계 데이터',
  },
  {
    endpoint: '/capitalflows/?year__gte=2022&year__lte=2023&aggregate=true',
    method: 'GET',
    description: '2022-2023년 연도별 집계',
  },
  {
    endpoint: '/admin/logs/?limit=10',
    method: 'GET',
    description: '최근 10개 처리 로그',
  },
  {
    endpoint: '/admin/collect/',
    method: 'POST',
    description: '전체 데이터 수집 실행',
    requiresAuth: true,
  },
  {
    endpoint: '/admin/fusion/',
    method: 'POST',
    description: '데이터 융합 실행',
    requiresAuth: true,
  },
  {
    endpoint: '/admin/validate/',
    method: 'POST',
    description: '데이터 검증 실행',
    requiresAuth: true,
  },
]

interface APITestPanelProps {
  baseUrl: string
}

export default function APITestPanel({ baseUrl }: APITestPanelProps) {
  const [testResults, setTestResults] = useState<{[key: string]: APITestResult}>({})
  const [loading, setLoading] = useState<{[key: string]: boolean}>({})
  const [customEndpoint, setCustomEndpoint] = useState('')
  const [customMethod, setCustomMethod] = useState('GET')
  const [customBody, setCustomBody] = useState('')

  const testEndpoint = async (endpoint: APIEndpoint) => {
    const key = `${endpoint.method}:${endpoint.endpoint}`
    setLoading(prev => ({ ...prev, [key]: true }))
    
    const startTime = Date.now()
    
    try {
      const url = `${baseUrl}${endpoint.endpoint}`
      const options: RequestInit = {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
        },
      }
      
      if (endpoint.method === 'POST') {
        if (endpoint.endpoint.includes('/collect/')) {
          options.body = JSON.stringify({})
        } else if (endpoint.endpoint.includes('/fusion/')) {
          options.body = JSON.stringify({
            year_start: 2020,
            year_end: 2024
          })
        } else if (endpoint.endpoint.includes('/validate/')) {
          options.body = JSON.stringify({
            year: 2023
          })
        }
      }
      
      const response = await fetch(url, options)
      const data = await response.json()
      const duration = Date.now() - startTime
      
      setTestResults(prev => ({
        ...prev,
        [key]: {
          success: response.ok,
          data: data,
          duration: duration,
          status: response.status
        }
      }))
    } catch (error) {
      const duration = Date.now() - startTime
      setTestResults(prev => ({
        ...prev,
        [key]: {
          success: false,
          error: error?.toString() || 'Unknown error',
          duration: duration
        }
      }))
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }))
    }
  }

  const testCustomEndpoint = async () => {
    const key = `custom:${customMethod}:${customEndpoint}`
    setLoading(prev => ({ ...prev, [key]: true }))
    
    const startTime = Date.now()
    
    try {
      const url = customEndpoint.startsWith('http') 
        ? customEndpoint 
        : `${baseUrl}${customEndpoint}`
      
      const options: RequestInit = {
        method: customMethod,
        headers: {
          'Content-Type': 'application/json',
        },
      }
      
      if (customMethod !== 'GET' && customBody) {
        try {
          JSON.parse(customBody) // 유효한 JSON인지 확인
          options.body = customBody
        } catch {
          throw new Error('Invalid JSON in request body')
        }
      }
      
      const response = await fetch(url, options)
      const data = await response.json()
      const duration = Date.now() - startTime
      
      setTestResults(prev => ({
        ...prev,
        [key]: {
          success: response.ok,
          data: data,
          duration: duration,
          status: response.status
        }
      }))
    } catch (error) {
      const duration = Date.now() - startTime
      setTestResults(prev => ({
        ...prev,
        [key]: {
          success: false,
          error: error?.toString() || 'Unknown error',
          duration: duration
        }
      }))
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }))
    }
  }

  const clearResults = () => {
    setTestResults({})
  }

  const runAllTests = async () => {
    const getEndpoints = API_ENDPOINTS.filter(ep => ep.method === 'GET')
    
    for (const endpoint of getEndpoints) {
      await testEndpoint(endpoint)
      await new Promise(resolve => setTimeout(resolve, 500)) // 0.5초 간격
    }
  }

  return (
    <div className="space-y-6">
      {/* 컨트롤 패널 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">API 테스트 컨트롤</h3>
        <div className="flex space-x-4">
          <button
            onClick={runAllTests}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            모든 GET 엔드포인트 테스트
          </button>
          <button
            onClick={clearResults}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            결과 초기화
          </button>
        </div>
      </div>

      {/* 커스텀 엔드포인트 테스트 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">커스텀 API 테스트</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
              <select
                value={customMethod}
                onChange={(e) => setCustomMethod(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint</label>
              <input
                type="text"
                value={customEndpoint}
                onChange={(e) => setCustomEndpoint(e.target.value)}
                placeholder="/capitalflows/?country=USA"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>
          
          {customMethod !== 'GET' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Request Body (JSON)</label>
              <textarea
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
                placeholder='{"key": "value"}'
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          )}
          
          <button
            onClick={testCustomEndpoint}
            disabled={!customEndpoint}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            테스트 실행
          </button>
          
          {/* 커스텀 테스트 결과 */}
          {(() => {
            const key = `custom:${customMethod}:${customEndpoint}`
            const result = testResults[key]
            const isLoading = loading[key]
            
            if (isLoading) {
              return (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="text-blue-800">테스트 실행 중...</div>
                </div>
              )
            }
            
            if (result) {
              return (
                <div className={`mt-4 p-3 rounded-md ${
                  result.success 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${
                      result.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {result.success ? `성공 (${result.status})` : '실패'}
                    </span>
                    <span className="text-sm text-gray-600">
                      {result.duration}ms
                    </span>
                  </div>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto max-h-40">
                    {JSON.stringify(result.data || result.error, null, 2)}
                  </pre>
                </div>
              )
            }
            
            return null
          })()}
        </div>
      </div>

      {/* 프리셋 엔드포인트 테스트 */}
      <div className="space-y-4">
        {API_ENDPOINTS.map((endpoint) => {
          const key = `${endpoint.method}:${endpoint.endpoint}`
          const result = testResults[key]
          const isLoading = loading[key]
          
          return (
            <div key={key} className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      endpoint.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                      endpoint.method === 'POST' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {endpoint.method}
                    </span>
                    <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                      {endpoint.endpoint}
                    </code>
                    {endpoint.requiresAuth && (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        AUTH
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{endpoint.description}</p>
                </div>
                <button
                  onClick={() => testEndpoint(endpoint)}
                  disabled={isLoading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? '테스트 중...' : '테스트'}
                </button>
              </div>
              
              {result && (
                <div className={`p-3 rounded-md ${
                  result.success 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${
                      result.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {result.success ? `성공 (${result.status})` : '실패'}
                    </span>
                    <span className="text-sm text-gray-600">
                      {result.duration}ms
                    </span>
                  </div>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto max-h-60">
                    {JSON.stringify(result.data || result.error, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
