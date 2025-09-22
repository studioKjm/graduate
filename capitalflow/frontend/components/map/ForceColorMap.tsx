'use client'

import { useState, useEffect } from 'react'

export default function ForceColorMap() {
  const [mapData, setMapData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [hoveredCountry, setHoveredCountry] = useState<any>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 지도 데이터 로드
  useEffect(() => {
    if (!isMounted) return
    
    const loadData = async () => {
      setLoading(true)
      try {
        const geoResponse = await fetch('/world-countries-detailed.json')
        const worldData = await geoResponse.json()
        
        console.log('Force color map loaded:', worldData.features.length, 'countries')
        
        // 강제 색상 적용을 위한 색상 배열
        const forceColors = [
          '#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe',
          '#ef4444', '#f97316', '#eab308', '#22c55e', '#8b5cf6',
          '#ec4899', '#06b6d4', '#84cc16', '#f59e0b', '#6366f1'
        ]
        
        const enrichedFeatures = worldData.features.map((feature: any, index: number) => {
          const colorIndex = index % forceColors.length
          const forceColor = forceColors[colorIndex]
          const intensity = (index % 10) / 10 + 0.1 // 0.1 to 1.0
          
          const countryCode = feature.properties.ISO_A3 || feature.properties.iso_a3 || feature.properties.ADM0_A3
          const countryName = feature.properties.NAME || feature.properties.name || feature.properties.NAME_EN
          
          return {
            ...feature,
            properties: {
              ...feature.properties,
              country_code: countryCode,
              country_name: countryName,
              total_capital: (index + 1) * 10000,
              intensity: intensity,
              force_color: forceColor
            }
          }
        })
        
        console.log('Sample countries with forced colors:', enrichedFeatures.slice(0, 5).map(f => ({
          name: f.properties.country_name,
          code: f.properties.country_code,
          color: f.properties.force_color,
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
  }, [isMounted])

  // SVG 경로 생성
  const getPathFromGeometry = (geometry: any) => {
    if (!geometry || !geometry.coordinates) return ''
    
    const coordsToPath = (coords: number[][]): string => {
      if (!coords || coords.length === 0) return ''
      
      return coords.map((coord, index) => {
        if (!coord || coord.length < 2) return ''
        const [lng, lat] = coord
        
        if (typeof lng !== 'number' || typeof lat !== 'number' || 
            isNaN(lng) || isNaN(lat) || 
            lng < -180 || lng > 180 || lat < -90 || lat > 90) {
          return ''
        }
        
        const x = (lng + 180) * (800 / 360)
        const y = (90 - lat) * (400 / 180)
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
      }).filter(Boolean).join(' ') + (coords.length > 2 ? ' Z' : '')
    }
    
    try {
      if (geometry.type === 'Polygon') {
        return coordsToPath(geometry.coordinates[0])
      } else if (geometry.type === 'MultiPolygon') {
        return geometry.coordinates
          .map((polygon: number[][][]) => coordsToPath(polygon[0]))
          .filter(Boolean)
          .join(' ')
      }
    } catch (error) {
      console.error('Error converting geometry to path:', error)
    }
    
    return ''
  }

  if (!isMounted || loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{!isMounted ? '초기화 중...' : '강제 색상 지도 로딩 중...'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative" style={{ background: 'linear-gradient(to bottom, #e0f2fe, #bae6fd)' }}>
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 800 400"
        className="w-full h-full"
      >
        {/* 바다 배경 */}
        <rect width="800" height="400" fill="#bae6fd" />
        
        {/* 국가들 - 강제 색상 적용 */}
        {mapData?.features?.map((feature: any, index: number) => {
          const path = getPathFromGeometry(feature.geometry)
          if (!path) return null
          
          const forceColor = feature.properties.force_color
          const countryName = feature.properties.country_name || 'Unknown'
          const countryCode = feature.properties.country_code
          
          // 렌더링 확인 로그
          if (index < 5) {
            console.log(`Rendering country ${index}: ${countryName} with color ${forceColor}`)
          }
          
          return (
            <path
              key={`force-country-${index}`}
              d={path}
              fill={forceColor}
              stroke="#ffffff"
              strokeWidth="1"
              style={{ 
                fill: forceColor,
                cursor: 'pointer'
              }}
              className="hover:stroke-2 hover:stroke-yellow-400 transition-all duration-200"
              onMouseEnter={() => setHoveredCountry(feature.properties)}
              onMouseLeave={() => setHoveredCountry(null)}
            />
          )
        })}
      </svg>
      
      {/* 툴팁 */}
      {hoveredCountry && (
        <div className="absolute top-4 right-4 bg-white border-2 border-gray-300 rounded-lg shadow-xl p-4 z-50 max-w-xs">
          <h3 className="font-bold text-gray-900">
            {hoveredCountry.country_name}
          </h3>
          <div className="space-y-1 text-sm text-gray-600">
            <p>국가 코드: {hoveredCountry.country_code}</p>
            <p>총 자본: ${(hoveredCountry.total_capital || 0).toLocaleString()}</p>
            <p>강도: {((hoveredCountry.intensity || 0) * 100).toFixed(1)}%</p>
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded border" 
                style={{ backgroundColor: hoveredCountry.force_color }}
              ></div>
              <span className="text-xs font-mono">{hoveredCountry.force_color}</span>
            </div>
          </div>
        </div>
      )}
      
      {/* 제목 */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-95 rounded-lg px-6 py-3 shadow-lg">
        <h2 className="text-xl font-bold text-gray-900">
          강제 색상 테스트 지도
        </h2>
        <p className="text-sm text-gray-600 text-center">
          각 국가마다 다른 색상이 강제로 적용됩니다
        </p>
      </div>
      
      {/* 정보 패널 */}
      <div className="absolute bottom-4 left-4 bg-white bg-opacity-95 rounded-lg p-4 shadow-lg">
        <h4 className="font-semibold text-gray-900 mb-2">색상 테스트 정보</h4>
        <div className="space-y-1 text-sm text-gray-600">
          <p>총 국가: {mapData?.features?.length || 0}개</p>
          <p>색상 종류: 15가지</p>
          <p>상태: 모든 국가에 강제 색상 적용</p>
          <p className="text-xs text-gray-500 mt-2">
            각 국가에 마우스를 올려 색상 코드를 확인하세요
          </p>
        </div>
      </div>
    </div>
  )
}
