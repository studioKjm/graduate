'use client'

import { CollectionProgress, DataQuality, CollectionStats, DetailedStats, SystemStats, ToastMessage } from '@/types/admin'

interface AdminOverviewTabProps {
  systemStats: SystemStats | null
  collectionProgress: CollectionProgress
  dataQuality: DataQuality | null
  collectionStats: CollectionStats | null
  detailedStats: DetailedStats | null
  lastUpdated: string
  selectedDataSource: string
  setSelectedDataSource: (source: string) => void
  selectedYear: number
  setSelectedYear: (year: number) => void
  isCollecting: boolean
  loading: boolean
  executeDataCollection: () => Promise<void>
  executeDataFusion: () => Promise<void>
  fetchDataQuality: () => Promise<void>
  fetchCollectionStats: () => Promise<void>
  fetchSystemStats: () => Promise<void>
  fetchMetadata: () => Promise<void>
  fetchProcessingLogs: () => Promise<void>
  addToast: (toast: Omit<ToastMessage, 'id'>) => void
}

export default function AdminOverviewTab({
  systemStats,
  collectionProgress,
  dataQuality,
  collectionStats,
  detailedStats,
  lastUpdated,
  selectedDataSource,
  setSelectedDataSource,
  selectedYear,
  setSelectedYear,
  isCollecting,
  loading,
  executeDataCollection,
  executeDataFusion,
  fetchDataQuality,
  fetchCollectionStats,
  fetchSystemStats,
  fetchMetadata,
  fetchProcessingLogs,
  addToast
}: AdminOverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* 시스템 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {systemStats ? (
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
        ) : (
          // 로딩 상태
          <>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-2">처리된 데이터</h3>
              <div className="flex items-center justify-center h-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
              <p className="text-sm text-gray-500">로딩 중...</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-2">원시 데이터</h3>
              <div className="flex items-center justify-center h-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
              <p className="text-sm text-gray-500">로딩 중...</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-2">활성 소스</h3>
              <div className="flex items-center justify-center h-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
              <p className="text-sm text-gray-500">로딩 중...</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-2">데이터 품질</h3>
              <div className="flex items-center justify-center h-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
              </div>
              <p className="text-sm text-gray-500">로딩 중...</p>
            </div>
          </>
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

                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{collectionStats.successRate.toFixed(1)}%</div>
                    <div className="text-sm text-gray-600">성공률</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{collectionStats.avgProcessingTime.toFixed(1)}초</div>
                    <div className="text-sm text-gray-600">평균 처리시간</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{collectionStats.overallCollectionRate?.toFixed(1) || '0.0'}%</div>
                    <div className="text-sm text-gray-600">전체 수집률</div>
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

        {/* 상세 수집 현황 */}
        {detailedStats && (
          <div className="mt-6 space-y-6">
                    {/* 연도별 수집 현황 */}
                    <div className="bg-white p-6 rounded-lg shadow border">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">연도별 수집 현황</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">연도</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">수집 건수</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">수집률</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">총 금액</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">평균 금액</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">데이터 타입</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">융합률</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">신뢰도</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상세</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {detailedStats.yearStats.map((stat, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{stat.year}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stat.count.toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <div className="flex items-center">
                                    <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                      <div
                                        className="bg-blue-500 h-2 rounded-full"
                                        style={{ width: `${stat.collection_rate || 0}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-sm font-medium">{(stat.collection_rate || 0).toFixed(1)}%</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <div className="group relative">
                                    <span className="cursor-pointer hover:text-blue-600">
                                      {stat.total_amount_formatted || `$${(stat.total_amount || 0).toLocaleString()}`}
                                    </span>
                                    <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                                      ${(stat.total_amount || 0).toLocaleString()}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <div className="group relative">
                                    <span className="cursor-pointer hover:text-blue-600">
                                      {stat.avg_amount_formatted || `$${(stat.avg_amount || 0).toLocaleString()}`}
                                    </span>
                                    <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                                      ${(stat.avg_amount || 0).toLocaleString()}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    stat.data_type === '더미 데이터' 
                                      ? 'bg-yellow-100 text-yellow-800' 
                                      : 'bg-green-100 text-green-800'
                                  }`}>
                                    {stat.data_type || 'N/A'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {stat.fusion_status ? `${stat.fusion_status.fusion_rate}%` : 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {stat.confidence_display || (stat.avg_quality ? `${stat.avg_quality}%` : 'N/A')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <button
                                    onClick={() => {
                                      // 상세 정보 모달 표시
                                      const details = {
                                        year: stat.year,
                                        dataType: stat.data_type,
                                        fusionStatus: stat.fusion_status,
                                        sourceStats: stat.source_stats,
                                        avgQuality: stat.avg_quality,
                                        uniqueCombinations: stat.unique_combinations,
                                        maxCombinations: stat.max_combinations
                                      }
                                      console.log('상세 정보:', details)
                                      alert(`상세 정보:\n\n데이터 타입: ${stat.data_type || 'N/A'}\n융합률: ${stat.fusion_status?.fusion_rate || 0}%\n신뢰도: ${stat.avg_quality || 0}%\n고유 조합: ${stat.unique_combinations || 0}/${stat.max_combinations || 0}\n\n자세한 내용은 콘솔을 확인하세요.`)
                                    }}
                                    className="text-blue-600 hover:text-blue-800 font-medium"
                                  >
                                    보기
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

            {/* 국가별 수집 현황 */}
            <div className="bg-white p-6 rounded-lg shadow border">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">국가별 수집 현황 (전체 국가)</h4>
              <div className="overflow-x-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">국가</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">수집 건수</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">수집률</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">총 금액</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">평균 금액</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {detailedStats.countryStats.map((stat, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{stat.country__name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stat.count.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className="bg-green-500 h-2 rounded-full"
                                style={{ width: `${stat.collection_rate || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{(stat.collection_rate || 0).toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${(stat.total_amount || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${(stat.avg_amount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 분야별 수집 현황 */}
            <div className="bg-white p-6 rounded-lg shadow border">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">분야별 수집 현황</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">분야</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">수집 건수</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">수집률</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">총 금액</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">평균 금액</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {detailedStats.sectorStats.map((stat, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{stat.sector__name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stat.count.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className="bg-purple-500 h-2 rounded-full"
                                style={{ width: `${stat.collection_rate || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{(stat.collection_rate || 0).toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${(stat.total_amount || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${(stat.avg_amount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 자본타입별 수집 현황 */}
            <div className="bg-white p-6 rounded-lg shadow border">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">자본타입별 수집 현황</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">자본타입</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">수집 건수</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">수집률</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">총 금액</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">평균 금액</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {detailedStats.capitalTypeStats.map((stat, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{stat.capital_type__name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stat.count.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className="bg-orange-500 h-2 rounded-full"
                                style={{ width: `${stat.collection_rate || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{(stat.collection_rate || 0).toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${(stat.total_amount || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${(stat.avg_amount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 소스별 수집 현황 */}
            <div className="bg-white p-6 rounded-lg shadow border">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">소스별 수집 현황</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">소스</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">타입</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">수집 건수</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">총 금액</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">평균 품질</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {detailedStats.sourceStats.map((stat, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{stat.source__name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stat.source__source_type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stat.count.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${(stat.total_amount || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{((stat.avg_quality || 0) * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 누락된 데이터 분석 */}
            {detailedStats.missingData.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow border">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">누락된 데이터 분석 (전체 {detailedStats.missingData.length}개)</h4>
                <div className="overflow-x-auto max-h-96">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">국가</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">분야</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">자본타입</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">연도</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {detailedStats.missingData.map((missing, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{missing.country}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{missing.sector}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{missing.capital_type}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{missing.year}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
