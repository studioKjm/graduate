'use client'

import { CollectionProgress, DataQuality } from '@/types/admin'
import { useState } from 'react'

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
  const [rawCollectionSettings, setRawCollectionSettings] = useState({
    countries: [] as string[],
    sectors: [] as string[],
    capitalTypes: [] as string[],
    years: [] as number[],
    sources: [] as string[]
  })
  const [isRawCollecting, setIsRawCollecting] = useState(false)

  const executeRawDataCollection = async () => {
    setIsRawCollecting(true)
    try {
      const response = await fetch('http://localhost:8001/api/v1/capitalflows/admin/raw-collect/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rawCollectionSettings)
      })
      
      const result = await response.json()
      
      if (result.success) {
        addToast({
          type: 'success',
          title: '원시데이터 수집 완료',
          message: result.message
        })
      } else {
        addToast({
          type: 'error',
          title: '원시데이터 수집 실패',
          message: result.error || '알 수 없는 오류가 발생했습니다.'
        })
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: '원시데이터 수집 실패',
        message: error instanceof Error ? error.message : String(error)
      })
    } finally {
      setIsRawCollecting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">데이터 처리 작업</h3>

        <div className="space-y-4">
          {/* 원시데이터 수집 */}
          <div className="border rounded-lg p-4 bg-blue-50">
            <h4 className="font-medium text-gray-900 mb-2">원시데이터 수집</h4>
            <p className="text-sm text-gray-600 mb-3">원하는 조건으로 원시데이터를 수집합니다.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {/* 국가 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  국가 (빈 값이면 전체)
                </label>
                <input
                  type="text"
                  placeholder="예: US,CN,JP (쉼표로 구분)"
                  value={rawCollectionSettings.countries.join(',')}
                  onChange={(e) => setRawCollectionSettings(prev => ({
                    ...prev,
                    countries: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 분야 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  분야 (빈 값이면 전체)
                </label>
                <input
                  type="text"
                  placeholder="예: AI,SEMICONDUCTOR,BIO (쉼표로 구분)"
                  value={rawCollectionSettings.sectors.join(',')}
                  onChange={(e) => setRawCollectionSettings(prev => ({
                    ...prev,
                    sectors: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 자본타입 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  자본타입 (빈 값이면 전체)
                </label>
                <input
                  type="text"
                  placeholder="예: FDI,VC,M&A (쉼표로 구분)"
                  value={rawCollectionSettings.capitalTypes.join(',')}
                  onChange={(e) => setRawCollectionSettings(prev => ({
                    ...prev,
                    capitalTypes: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 연도 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  연도 (빈 값이면 전체)
                </label>
                <input
                  type="text"
                  placeholder="예: 2023,2024 (쉼표로 구분)"
                  value={rawCollectionSettings.years.join(',')}
                  onChange={(e) => setRawCollectionSettings(prev => ({
                    ...prev,
                    years: e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 소스 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  소스 (빈 값이면 전체)
                </label>
                <input
                  type="text"
                  placeholder="예: World Bank,IMF,UNCTAD (쉼표로 구분)"
                  value={rawCollectionSettings.sources.join(',')}
                  onChange={(e) => setRawCollectionSettings(prev => ({
                    ...prev,
                    sources: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 수집 실행 버튼 */}
              <div className="flex items-end">
                <button
                  onClick={executeRawDataCollection}
                  disabled={isRawCollecting}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {isRawCollecting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      수집 중...
                    </>
                  ) : (
                    '원시데이터 수집 시작'
                  )}
                </button>
              </div>
            </div>

            <div className="text-sm text-gray-500">
              <p>• 빈 값으로 두면 해당 조건의 모든 데이터를 수집합니다</p>
              <p>• 수집 시간은 선택한 조건의 수에 따라 달라집니다</p>
            </div>
          </div>

          {/* 실제 데이터 수집 */}
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

          {/* 데이터 융합 */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">데이터 융합</h4>
            <p className="text-sm text-gray-600 mb-3">다중 소스 데이터를 ML 기반으로 융합합니다.</p>
            <button
              onClick={executeDataFusion}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              융합 실행
            </button>
          </div>

          {/* 데이터 검증 */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">데이터 검증</h4>
            <p className="text-sm text-gray-600 mb-3">처리된 데이터의 품질을 검증합니다.</p>
            <button
              onClick={executeDataValidation}
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
  )
}
