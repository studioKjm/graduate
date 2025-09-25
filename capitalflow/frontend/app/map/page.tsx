'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import MapControls from '@/components/map/MapControls'
import MapLegend from '@/components/map/MapLegend'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import DataVisualizationPanel from '@/components/charts/DataVisualizationPanel'
import NewsPanel from '@/components/news/NewsPanel'

// Dynamically import the bulk loading map component for instant year switching
const MapVisualization = dynamic(() => import('@/components/map/BulkLoadingSectorMap'), {
  loading: () => <LoadingSpinner />,
  ssr: false,
})

export default function MapPage() {
  // 모든 자본 타입을 디폴트로 설정
  const allCapitalTypes = [
    'FDI', 'VC', 'MA', 'IPO', 'PE', 'BONDS', 'FPI', 'SWF', 'GREENFIELD', 'JV', 'DEVFIN'
  ]
  
  const [mapFilters, setMapFilters] = useState({
    year: 2023,
    sector: '',
    capitalTypes: allCapitalTypes,
    visualizationType: 'choropleth' as 'choropleth' | 'flow' | 'both'
  })
  const [isAnimating, setIsAnimating] = useState(false)
  const [mapData, setMapData] = useState<any>({}) // 지도 데이터 상태 추가

  const handleFiltersChange = (newFilters: Partial<typeof mapFilters>) => {
    setMapFilters(prev => ({ ...prev, ...newFilters }))
  }

  const handleAnimationToggle = (playing: boolean) => {
    setIsAnimating(playing)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="h-screen relative bg-gray-100">
        {/* Map Container */}
        <div className="absolute inset-0">
          <MapVisualization 
            year={mapFilters.year}
            sector={mapFilters.sector}
            capitalTypes={mapFilters.capitalTypes}
            visualizationType={mapFilters.visualizationType}
            onDataChange={setMapData}
          />
        </div>
        
        {/* Map Controls */}
        <div className="absolute top-4 left-4 z-10">
          <MapControls 
            onYearChange={(year) => handleFiltersChange({ year })}
            onSectorChange={(sector) => handleFiltersChange({ sector })}
            onCapitalTypeChange={(capitalTypes) => handleFiltersChange({ capitalTypes })}
            onVisualizationTypeChange={(visualizationType) => handleFiltersChange({ visualizationType })}
            onAnimationToggle={handleAnimationToggle}
          />
        </div>
        
        {/* Map Legend */}
        <div className="absolute bottom-4 left-4 z-10">
          <MapLegend 
            visualizationType={mapFilters.visualizationType}
            maxValue={1000000}
            minValue={0}
          />
        </div>
        
        {/* Info Panel */}
        <div className="absolute top-4 right-4 z-10 max-w-sm">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              현재 설정
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">연도:</span> {mapFilters.year}
              </div>
              <div>
                <span className="font-medium">분야:</span> {mapFilters.sector || '전체'}
              </div>
              <div>
                <span className="font-medium">자본 타입:</span> {
                  mapFilters.capitalTypes.length === 0 ? '선택 안함' : 
                  mapFilters.capitalTypes.length === allCapitalTypes.length ? '전체 선택' :
                  mapFilters.capitalTypes.length === 1 ? mapFilters.capitalTypes[0] :
                  `${mapFilters.capitalTypes.length}개 선택`
                }
              </div>
              {mapFilters.capitalTypes.length > 1 && mapFilters.capitalTypes.length < allCapitalTypes.length && (
                <div className="text-xs text-gray-500 pl-4">
                  {mapFilters.capitalTypes.join(', ')}
                </div>
              )}
              <div>
                <span className="font-medium">시각화:</span> {
                  mapFilters.visualizationType === 'choropleth' ? '색상' :
                  mapFilters.visualizationType === 'flow' ? '흐름' : '색상+흐름'
                }
              </div>
              {isAnimating && (
                <div className="text-primary-600 font-medium">
                  ⏵ 애니메이션 재생 중
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Instructions */}
        <div className="absolute bottom-4 right-4 z-10">
          <div className="bg-white bg-opacity-90 rounded-lg shadow-lg border border-gray-200 p-3 max-w-xs">
            <p className="text-sm text-gray-600">
              💡 <strong>사용법:</strong><br/>
              • 지도를 드래그하여 이동<br/>
              • 마우스 휠로 확대/축소<br/>
              • 국가에 마우스를 올려 정보 확인<br/>
              • 좌측 컨트롤로 필터 조정
            </p>
          </div>
        </div>
      </div>

      {/* 데이터 시각화 패널 */}
      <DataVisualizationPanel
        data={mapData}
        year={mapFilters.year}
        sector={mapFilters.sector}
        capitalTypes={mapFilters.capitalTypes}
      />

      {/* 뉴스 패널 */}
      <NewsPanel
        year={mapFilters.year}
        country={(() => {
          // 가장 높은 투자액을 가진 국가 선택
          if (!mapData || Object.keys(mapData).length === 0) return 'USA' // 기본값
          
          const entries = Object.entries(mapData)
          if (entries.length === 0) return 'USA'
          
          // 투자액이 가장 높은 국가 찾기
          const topCountry = entries.reduce((max, [countryCode, data]: [string, any]) => {
            const amount = data?.amount || 0
            return amount > (max.amount || 0) ? { countryCode, amount } : max
          }, { countryCode: 'USA', amount: 0 })
          
          return topCountry.countryCode
        })()}
        sector={mapFilters.sector}
        capitalTypes={mapFilters.capitalTypes}
      />
    </div>
  )
}
