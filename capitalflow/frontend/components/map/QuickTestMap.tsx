'use client'

import React, { useState, useEffect } from 'react'

interface QuickTestMapProps {
  year?: number
  sector?: string
  capitalTypes?: string[]
}

export default function QuickTestMap({
  year = 2023,
  sector = 'BIO',
  capitalTypes = []
}: QuickTestMapProps) {
  const [testResults, setTestResults] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const runTests = async () => {
      console.log('🧪 Starting Quick Tests...')
      
      const tests = {
        api_health: null,
        api_data: null,
        geojson: null
      }

      try {
        // 1. API Health Check
        console.log('1️⃣ Testing API Health...')
        const healthResponse = await fetch('http://localhost:8001/api/v1/capitalflows/health/')
        tests.api_health = {
          status: healthResponse.status,
          data: await healthResponse.json()
        }
        console.log('✅ Health Check:', tests.api_health)

        // 2. API Data Check
        console.log('2️⃣ Testing API Data...')
        const dataResponse = await fetch(`http://localhost:8001/api/v1/capitalflows/capitalflows/?sector=${sector}&year=${year}&aggregate=true`)
        tests.api_data = {
          status: dataResponse.status,
          data: await dataResponse.json()
        }
        console.log('✅ Data Check:', tests.api_data)

        // 3. GeoJSON Check
        console.log('3️⃣ Testing GeoJSON...')
        const geoResponse = await fetch('/world-countries-detailed.json')
        const geoData = await geoResponse.json()
        tests.geojson = {
          status: geoResponse.status,
          featuresCount: geoData.features?.length || 0,
          firstCountry: geoData.features?.[0]?.id || 'Unknown'
        }
        console.log('✅ GeoJSON Check:', tests.geojson)

      } catch (error) {
        console.error('❌ Test Error:', error)
        tests.error = error.message
      }

      setTestResults(tests)
      setLoading(false)
    }

    runTests()
  }, [year, sector])

  if (loading) {
    return (
      <div className="p-8 bg-blue-50 rounded-lg">
        <div className="text-lg font-bold text-blue-600 mb-4">🧪 시스템 진단 중...</div>
        <div className="text-sm text-gray-600">API 및 데이터 연결 상태를 확인하고 있습니다.</div>
      </div>
    )
  }

  return (
    <div className="p-8 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">🔍 시스템 진단 결과</h2>
      
      <div className="space-y-6">
        {/* API Health */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">1️⃣ API 서버 상태</h3>
          <div className={`p-3 rounded ${testResults?.api_health?.status === 200 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <div><strong>상태:</strong> {testResults?.api_health?.status === 200 ? '✅ 정상' : '❌ 오류'}</div>
            <div><strong>메시지:</strong> {testResults?.api_health?.data?.message || 'No message'}</div>
          </div>
        </div>

        {/* API Data */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">2️⃣ 데이터 API</h3>
          <div className={`p-3 rounded ${testResults?.api_data?.status === 200 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <div><strong>상태:</strong> {testResults?.api_data?.status === 200 ? '✅ 정상' : '❌ 오류'}</div>
            <div><strong>데이터 개수:</strong> {testResults?.api_data?.data?.count || 0}개 국가</div>
            <div><strong>설정:</strong> {sector} 분야, {year}년</div>
            {testResults?.api_data?.data?.results?.slice(0, 3).map((country: any, i: number) => (
              <div key={i} className="text-sm mt-1">
                <strong>{country.country_name}:</strong> ${(country.total_amount || 0).toLocaleString()}
              </div>
            ))}
          </div>
        </div>

        {/* GeoJSON */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">3️⃣ 지도 데이터</h3>
          <div className={`p-3 rounded ${testResults?.geojson?.status === 200 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <div><strong>상태:</strong> {testResults?.geojson?.status === 200 ? '✅ 정상' : '❌ 오류'}</div>
            <div><strong>국가 수:</strong> {testResults?.geojson?.featuresCount}개</div>
            <div><strong>첫 번째 국가:</strong> {testResults?.geojson?.firstCountry}</div>
          </div>
        </div>

        {/* Error */}
        {testResults?.error && (
          <div className="border border-red-200 rounded-lg p-4 bg-red-50">
            <h3 className="text-lg font-semibold text-red-700 mb-2">❌ 오류 발생</h3>
            <div className="text-red-600">{testResults.error}</div>
          </div>
        )}

        {/* 결론 */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">📝 진단 결론</h3>
          {testResults?.api_health?.status === 200 && 
           testResults?.api_data?.status === 200 && 
           testResults?.geojson?.status === 200 ? (
            <div className="p-4 bg-green-100 text-green-800 rounded-lg">
              <strong>✅ 모든 시스템이 정상 작동중입니다!</strong>
              <div className="mt-2 text-sm">
                FastLoadingSectorMap 컴포넌트의 로딩 로직에 문제가 있을 수 있습니다. 
                브라우저 개발자 도구의 콘솔을 확인해주세요.
              </div>
            </div>
          ) : (
            <div className="p-4 bg-red-100 text-red-800 rounded-lg">
              <strong>❌ 시스템에 문제가 있습니다!</strong>
              <div className="mt-2 text-sm">위의 빨간색 표시된 항목들을 먼저 해결해야 합니다.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
