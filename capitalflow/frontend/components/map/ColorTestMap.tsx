'use client'

import { useState, useEffect } from 'react'

interface ColorTestMapProps {
  year?: number
  sector?: string
  capitalType?: string
  visualizationType?: 'choropleth' | 'flow' | 'both'
}

export default function ColorTestMap({
  year = 2023,
  sector,
  capitalType,
  visualizationType = 'choropleth'
}: ColorTestMapProps) {
  const [mapData, setMapData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [hoveredCountry, setHoveredCountry] = useState<any>(null)

  // 지도 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const geoResponse = await fetch('/world-countries-detailed.json')
        const worldData = await geoResponse.json()
        
        console.log('Total countries loaded:', worldData.features.length)
        
        // 간단한 색상 테스트 데이터
        const testColors = [
          '#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe',
          '#ef4444', '#f97316', '#eab308', '#22c55e', '#8b5cf6'
        ]
        
        // 각 국가에 테스트 색상 할당
        const enrichedFeatures = worldData.features.map((feature: any, index: number) => {
          const colorIndex = index % testColors.length
          const testColor = testColors[colorIndex]
          const intensity = (index % 10) / 10 // 0.0 to 0.9
          
          return {
            ...feature,
            properties: {
              ...feature.properties,
              country_code: feature.properties.ISO_A3 || feature.properties.iso_a3 || `C${index}`,
              country_name: feature.properties.NAME || feature.properties.name || `Country ${index}`,
              total_capital: (index + 1) * 10000,
              intensity: intensity,
              test_color: testColor
            }
          }
        })
        
        console.log('Sample countries with colors:', enrichedFeatures.slice(0, 5).map(f => ({
          name: f.properties.country_name,
          color: f.properties.test_color,
          intensity: f.properties.intensity
        })))
        
        setMapData({
          type: 'FeatureCollection',
          features: enrichedFeatures
        })
      } catch (error) {
        console.error('Failed to load map data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [year, sector, capitalType])

  // SVG 경로 생성 (간단한 투영)
  const getPathFromGeometry = (geometry: any) => {
    if (!geometry || !geometry.coordinates) return ''
    
    const coordsToPath = (coords: number[][]): string => {
      return coords.map((coord, index) => {
        const [lng, lat] = coord
        const x = (lng + 180) * (800 / 360)
        const y = (90 - lat) * (400 / 180)
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
      }).join(' ') + ' Z'
    }
    
    try {
      if (geometry.type === 'Polygon') {
        return coordsToPath(geometry.coordinates[0])
      } else if (geometry.type === 'MultiPolygon') {
        return geometry.coordinates
          .map((polygon: number[][][]) => coordsToPath(polygon[0]))
          .join(' ')
      }
    } catch (error) {
      console.error('Error converting geometry to path:', error)
    }
    
    return ''
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">지도 데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative bg-blue-50">
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 800 400"
        className="w-full h-full"
      >
        {/* 배경 */}
        <rect width="800" height="400" fill="#e0f2fe" />
        
        {/* 국가들 */}
        {mapData?.features?.map((feature: any, index: number) => {
          const path = getPathFromGeometry(feature.geometry)
          const fillColor = feature.properties.test_color
          const countryName = feature.properties.country_name
          
          return (
            <path
              key={`country-${index}`}
              d={path}
              fill={fillColor}
              stroke="#ffffff"
              strokeWidth="1"
              className="cursor-pointer hover:stroke-2 hover:stroke-yellow-400 transition-all duration-200"
              onMouseEnter={() => setHoveredCountry(feature.properties)}
              onMouseLeave={() => setHoveredCountry(null)}
              opacity="0.8"
            />
          )
        })}
      </svg>
      
      {/* 툴팁 */}
      {hoveredCountry && (
        <div 
          className="absolute z-50 bg-white border-2 border-gray-300 rounded-lg shadow-xl p-4 pointer-events-none max-w-xs"
          style={{
            left: '50%',
            top: '10%',
            transform: 'translateX(-50%)'
          }}
        >
          <h3 className="font-bold text-gray-900 text-lg">
            {hoveredCountry.country_name}
          </h3>
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">국가 코드:</span> {hoveredCountry.country_code}</p>
            <p><span className="font-medium">총 자본:</span> ${(hoveredCountry.total_capital || 0).toLocaleString()}</p>
            <p><span className="font-medium">강도:</span> {(hoveredCountry.intensity * 100).toFixed(1)}%</p>
            <div className="flex items-center gap-2">
              <span className="font-medium">테스트 색상:</span>
              <div 
                className="w-4 h-4 rounded border" 
                style={{ backgroundColor: hoveredCountry.test_color }}
              ></div>
              <span className="text-xs">{hoveredCountry.test_color}</span>
            </div>
          </div>
        </div>
      )}
      
      {/* 정보 패널 */}
      <div className="absolute top-4 left-4 bg-white bg-opacity-95 rounded-lg p-3 shadow-lg">
        <h3 className="font-bold text-gray-900 mb-2">색상 테스트 지도</h3>
        <p className="text-sm text-gray-600">각 국가에 다른 색상이 적용되어 있습니다.</p>
        <p className="text-sm text-gray-600">마우스를 올려 색상 정보를 확인하세요.</p>
        <div className="mt-2 text-xs text-gray-500">
          총 {mapData?.features?.length || 0}개 국가 로드됨
        </div>
      </div>
    </div>
  )
}
