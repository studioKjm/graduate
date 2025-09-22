'use client'

import { useState, useEffect } from 'react'

interface RealMapWithColorsProps {
  year?: number
  sector?: string
  capitalType?: string
  visualizationType?: 'choropleth' | 'flow' | 'both'
}

export default function RealMapWithColors({
  year = 2023,
  sector,
  capitalType,
  visualizationType = 'choropleth'
}: RealMapWithColorsProps) {
  const [mapData, setMapData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [hoveredCountry, setHoveredCountry] = useState<any>(null)
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
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
        
        console.log('Real map data loaded:', worldData.features.length, 'countries')
        
        // 국가별 자본 데이터
        const capitalData: { [key: string]: { total_capital: number; intensity: number } } = {
          'USA': { total_capital: 1000000, intensity: 1.0 },
          'CHN': { total_capital: 800000, intensity: 0.8 },
          'JPN': { total_capital: 600000, intensity: 0.6 },
          'DEU': { total_capital: 500000, intensity: 0.5 },
          'GBR': { total_capital: 450000, intensity: 0.45 },
          'FRA': { total_capital: 400000, intensity: 0.4 },
          'KOR': { total_capital: 350000, intensity: 0.35 },
          'CAN': { total_capital: 300000, intensity: 0.3 },
          'AUS': { total_capital: 250000, intensity: 0.25 },
          'IND': { total_capital: 200000, intensity: 0.2 },
          'BRA': { total_capital: 180000, intensity: 0.18 },
          'RUS': { total_capital: 150000, intensity: 0.15 },
          'ITA': { total_capital: 120000, intensity: 0.12 },
          'ESP': { total_capital: 100000, intensity: 0.10 },
          'NLD': { total_capital: 80000, intensity: 0.08 },
          'CHE': { total_capital: 70000, intensity: 0.07 },
          'SGP': { total_capital: 60000, intensity: 0.06 },
          'SWE': { total_capital: 50000, intensity: 0.05 },
          'NOR': { total_capital: 45000, intensity: 0.045 },
          'DNK': { total_capital: 40000, intensity: 0.04 },
          'MEX': { total_capital: 35000, intensity: 0.035 },
          'ARG': { total_capital: 30000, intensity: 0.03 },
        }
        
        // GeoJSON 피처에 자본 데이터 추가
        const enrichedFeatures = worldData.features.map((feature: any, index: number) => {
          const countryCode = feature.properties.ISO_A3 || feature.properties.iso_a3 || feature.properties.ADM0_A3
          const countryName = feature.properties.NAME || feature.properties.name || feature.properties.NAME_EN
          
          const capitalInfo = capitalData[countryCode] || {
            total_capital: Math.random() * 25000 + 5000,
            intensity: Math.random() * 0.15 + 0.05
          }
          
          // 주요 국가 데이터 확인
          if (['USA', 'CHN', 'JPN', 'DEU', 'GBR', 'FRA', 'KOR'].includes(countryCode)) {
            console.log(`Data for ${countryName} (${countryCode}):`, capitalInfo)
          }
          
          const enrichedFeature = {
            ...feature,
            properties: {
              ...feature.properties,
              country_code: countryCode,
              country_name: countryName,
              total_capital: capitalInfo.total_capital,
              intensity: capitalInfo.intensity
            }
          }
          
          return enrichedFeature
        })
        
        console.log('Total enriched features:', enrichedFeatures.length)
        console.log('Sample enriched features:', enrichedFeatures.slice(0, 3).map(f => ({
          name: f.properties.country_name,
          code: f.properties.country_code,
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
  }, [year, sector, capitalType, isMounted])

  // SVG 경로 생성
  const getPathFromGeometry = (geometry: any) => {
    if (!geometry || !geometry.coordinates) return ''
    
    const coordsToPath = (coords: number[][]): string => {
      if (!coords || coords.length === 0) return ''
      
      return coords.map((coord, index) => {
        if (!coord || coord.length < 2) return ''
        const [lng, lat] = coord
        
        // 좌표 유효성 검사
        if (typeof lng !== 'number' || typeof lat !== 'number' || 
            isNaN(lng) || isNaN(lat) || 
            lng < -180 || lng > 180 || lat < -90 || lat > 90) {
          return ''
        }
        
        // 간단한 등장 원형 투영
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

  // 색상 계산 - 더 강한 색상 대비
  const getFillColor = (intensity: number): string => {
    console.log(`getFillColor called with intensity: ${intensity}`)
    
    if (intensity >= 0.8) {
      console.log('Returning very high color: #1e40af')
      return '#1e40af' // 매우 높음 - 진한 파랑
    }
    if (intensity >= 0.6) {
      console.log('Returning high color: #3b82f6')
      return '#3b82f6' // 높음 - 파랑
    }
    if (intensity >= 0.4) {
      console.log('Returning medium color: #60a5fa')
      return '#60a5fa' // 보통 - 중간 파랑
    }
    if (intensity >= 0.2) {
      console.log('Returning low color: #93c5fd')
      return '#93c5fd' // 낮음 - 연한 파랑
    }
    if (intensity >= 0.05) {
      console.log('Returning very low color: #dbeafe')
      return '#dbeafe' // 매우 낮음 - 매우 연한 파랑
    }
    if (intensity > 0) {
      console.log('Returning minimal color: #f1f5f9')
      return '#f1f5f9' // 최소 - 거의 흰색
    }
    
    console.log('Returning default color: #f8fafc')
    return '#f8fafc' // 데이터 없음 - 흰색
  }

  const handleMouseMove = (event: React.MouseEvent) => {
    setMousePosition({ x: event.clientX, y: event.clientY })
  }

  if (!isMounted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">지도를 초기화하는 중...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">지도 데이터를 불러오는 중...</p>
          <p className="text-xs text-gray-500 mt-2">실제 세계 지도를 로딩 중입니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative bg-blue-50" onMouseMove={handleMouseMove}>
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 800 400"
        className="w-full h-full"
        style={{ background: 'linear-gradient(to bottom, #e0f2fe 0%, #bae6fd 100%)' }}
      >
        {/* 바다 배경 */}
        <rect width="800" height="400" fill="url(#oceanGradient)" />
        
        {/* 그라디언트 정의 */}
        <defs>
          <linearGradient id="oceanGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="100%" stopColor="#bae6fd" />
          </linearGradient>
        </defs>
        
        {/* 국가들 */}
        {mapData?.features?.map((feature: any, index: number) => {
          const path = getPathFromGeometry(feature.geometry)
          if (!path) return null
          
          const intensity = feature.properties.intensity || 0
          const fillColor = getFillColor(intensity)
          const countryName = feature.properties.country_name || feature.properties.NAME || 'Unknown'
          const countryCode = feature.properties.country_code
          
          // 색상 적용 디버깅 (주요 국가만)
          if (['USA', 'CHN', 'JPN', 'DEU', 'GBR', 'FRA', 'KOR'].includes(countryCode)) {
            console.log(`Rendering ${countryName} (${countryCode}): intensity=${intensity}, color=${fillColor}`)
          }
          
          return (
            <path
              key={`country-${countryCode || index}`}
              d={path}
              fill={fillColor}
              stroke="#ffffff"
              strokeWidth="0.5"
              style={{ 
                fill: fillColor,  // 인라인 스타일로도 추가
                cursor: 'pointer'
              }}
              className="hover:stroke-2 hover:stroke-yellow-400 transition-all duration-200"
              onMouseEnter={() => setHoveredCountry(feature.properties)}
              onMouseLeave={() => setHoveredCountry(null)}
            />
          )
        })}
        
        {/* 흐름 표시 (Flow 모드일 때) */}
        {(visualizationType === 'flow' || visualizationType === 'both') && (
          <g>
            {/* 서울 -> 뉴욕 */}
            <line x1="570" y1="180" x2="250" y2="160" stroke="#ef4444" strokeWidth="3" opacity="0.8" 
                  strokeDasharray="5,5" className="animate-pulse" />
            <circle cx="250" cy="160" r="4" fill="#ef4444" />
            
            {/* 베이징 -> 런던 */}
            <line x1="550" y1="160" x2="400" y2="150" stroke="#f97316" strokeWidth="2" opacity="0.8" 
                  strokeDasharray="3,3" className="animate-pulse" />
            <circle cx="400" cy="150" r="3" fill="#f97316" />
            
            {/* 도쿄 -> 시드니 */}
            <line x1="720" y1="170" x2="680" y2="320" stroke="#8b5cf6" strokeWidth="2" opacity="0.8" 
                  strokeDasharray="4,4" className="animate-pulse" />
            <circle cx="680" cy="320" r="3" fill="#8b5cf6" />
          </g>
        )}
      </svg>
      
      {/* 툴팁 */}
      {hoveredCountry && (
        <div 
          className="absolute z-50 bg-white border border-gray-300 rounded-lg shadow-xl p-3 pointer-events-none max-w-xs"
          style={{
            left: Math.min(mousePosition.x + 10, window.innerWidth - 200),
            top: Math.max(mousePosition.y - 80, 10),
          }}
        >
          <h3 className="font-semibold text-gray-900">
            {hoveredCountry.country_name}
          </h3>
          <div className="space-y-1 text-sm text-gray-600">
            <p>국가 코드: {hoveredCountry.country_code}</p>
            <p>총 자본: ${(hoveredCountry.total_capital || 0).toLocaleString()}</p>
            <p>투자 강도: {((hoveredCountry.intensity || 0) * 100).toFixed(1)}%</p>
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded border" 
                style={{ backgroundColor: getFillColor(hoveredCountry.intensity || 0) }}
              ></div>
              <span className="text-xs">
                {hoveredCountry.intensity >= 0.8 ? '매우 높음' :
                 hoveredCountry.intensity >= 0.6 ? '높음' :
                 hoveredCountry.intensity >= 0.4 ? '보통' :
                 hoveredCountry.intensity >= 0.2 ? '낮음' : '매우 낮음'}
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* 제목 */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-95 rounded-lg px-6 py-3 shadow-lg">
        <h2 className="text-xl font-bold text-gray-900">
          글로벌 자본 흐름 시각화 ({year}년)
        </h2>
        <p className="text-sm text-gray-600 text-center">
          실제 세계 지도 + 색상 시각화
        </p>
      </div>
      
      {/* 통계 정보 */}
      <div className="absolute top-4 right-4 bg-white bg-opacity-95 rounded-lg p-3 shadow-lg">
        <h4 className="font-semibold text-gray-900 mb-2">데이터 현황</h4>
        <div className="space-y-1 text-sm text-gray-600">
          <p>총 국가: {mapData?.features?.length || 0}개</p>
          <p>연도: {year}</p>
          <p>분야: {sector || '전체'}</p>
          <p>자본 타입: {capitalType || '전체'}</p>
        </div>
      </div>
    </div>
  )
}
