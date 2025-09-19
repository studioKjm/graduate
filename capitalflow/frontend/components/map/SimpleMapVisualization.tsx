'use client'

import { useState, useEffect, useMemo } from 'react'
import { scaleSequential } from 'd3-scale'
import { interpolateBlues } from 'd3-scale-chromatic'

interface SimpleMapVisualizationProps {
  year?: number
  sector?: string
  capitalType?: string
  visualizationType?: 'choropleth' | 'flow' | 'both'
}

export default function SimpleMapVisualization({
  year = 2023,
  sector,
  capitalType,
  visualizationType = 'choropleth'
}: SimpleMapVisualizationProps) {
  const [mapData, setMapData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [hoveredCountry, setHoveredCountry] = useState<any>(null)
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // 색상 스케일 생성
  const colorScale = useMemo(() => {
    return scaleSequential(interpolateBlues).domain([0, 1])
  }, [])

  // 지도 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const geoResponse = await fetch('/world-countries-detailed.json')
        const worldData = await geoResponse.json()
        
        // 국가별 더미 자본 데이터 (더 다양한 국가 포함)
        const capitalData = {
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
          // 추가 국가들
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
        
        console.log('Loading world data:', worldData.features?.length, 'countries')
        
        // GeoJSON 피처에 자본 데이터 추가
        const enrichedFeatures = worldData.features.map((feature: any) => {
          const countryCode = feature.properties.ISO_A3 || feature.properties.ADM0_A3 || feature.properties.iso_a3
          const countryName = feature.properties.NAME || feature.properties.NAME_EN || feature.properties.name
          
          // 더 다양한 기본값 제공
          const capitalInfo = capitalData[countryCode as keyof typeof capitalData] || {
            total_capital: Math.random() * 25000 + 5000, // 5K-30K 범위
            intensity: Math.random() * 0.15 + 0.05 // 0.05-0.2 범위
          }
          
          console.log(`Country: ${countryName} (${countryCode}) - Intensity: ${capitalInfo.intensity}`)
          
          return {
            ...feature,
            properties: {
              ...feature.properties,
              country_code: countryCode,
              country_name: countryName,
              total_capital: capitalInfo.total_capital,
              intensity: capitalInfo.intensity
            }
          }
        })
        
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

  // SVG 경로 문자열 생성
  const getPathFromGeometry = (geometry: any) => {
    if (!geometry || !geometry.coordinates) return ''
    
    const coordsToPath = (coords: number[][]): string => {
      return coords.map((coord, index) => {
        const [lng, lat] = coord
        // 간단한 등장 원형 투영 (실제 프로젝트에서는 더 정확한 투영 사용)
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

  // 색상 계산 - 더 명확한 색상 차이
  const getFillColor = (intensity: number) => {
    if (intensity === 0) {
      return '#f1f5f9' // 기본 회색 (데이터 없음)
    }
    
    // 파란색 계열로 강도에 따른 색상 매핑
    if (intensity >= 0.8) return '#1e40af' // 진한 파랑 (매우 높음)
    if (intensity >= 0.6) return '#3b82f6' // 파랑 (높음)
    if (intensity >= 0.4) return '#60a5fa' // 중간 파랑 (보통)
    if (intensity >= 0.2) return '#93c5fd' // 연한 파랑 (낮음)
    if (intensity >= 0.1) return '#dbeafe' // 매우 연한 파랑 (매우 낮음)
    return '#f8fafc' // 거의 흰색 (최소)
  }

  const handleMouseMove = (event: React.MouseEvent) => {
    setMousePosition({ x: event.clientX, y: event.clientY })
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">지도 데이터를 불러오는 중...</p>
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
      >
        {/* 배경 */}
        <rect width="800" height="400" fill="#f0f9ff" />
        
        {/* 국가들 */}
        {mapData?.features?.map((feature: any, index: number) => {
          const path = getPathFromGeometry(feature.geometry)
          const intensity = feature.properties.intensity || 0
          const fillColor = getFillColor(intensity)
          const countryName = feature.properties.country_name || feature.properties.NAME || 'Unknown'
          
          // 색상 적용 확인을 위한 로그 (처음 10개 국가만)
          if (index < 10) {
            console.log(`Rendering ${countryName}: intensity=${intensity}, color=${fillColor}`)
          }
          
          return (
            <path
              key={`${feature.properties.country_code || index}-${index}`}
              d={path}
              fill={fillColor}
              stroke="#ffffff"
              strokeWidth="0.8"
              className="cursor-pointer hover:stroke-2 transition-all duration-200"
              onMouseEnter={() => setHoveredCountry(feature.properties)}
              onMouseLeave={() => setHoveredCountry(null)}
            />
          )
        })}
        
        {/* 흐름 표시 (Flow 모드일 때) */}
        {(visualizationType === 'flow' || visualizationType === 'both') && (
          <g>
            {/* 서울 -> 뉴욕 */}
            <line x1="570" y1="180" x2="250" y2="160" stroke="#f59e0b" strokeWidth="3" opacity="0.7" />
            <circle cx="250" cy="160" r="3" fill="#f59e0b" />
            
            {/* 런던 -> 도쿄 */}
            <line x1="400" y1="150" x2="720" y2="170" stroke="#ef4444" strokeWidth="2" opacity="0.7" />
            <circle cx="720" cy="170" r="2" fill="#ef4444" />
            
            {/* 샌프란시스코 -> 베이징 */}
            <line x1="150" y1="170" x2="550" y2="160" stroke="#8b5cf6" strokeWidth="4" opacity="0.7" />
            <circle cx="550" cy="160" r="4" fill="#8b5cf6" />
          </g>
        )}
      </svg>
      
      {/* 툴팁 */}
      {hoveredCountry && (
        <div 
          className="absolute z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3 pointer-events-none max-w-xs"
          style={{
            left: mousePosition.x + 10,
            top: mousePosition.y - 60,
            transform: mousePosition.x > 600 ? 'translateX(-100%)' : 'none'
          }}
        >
          <h3 className="font-semibold text-gray-900">
            {hoveredCountry.country_name || hoveredCountry.NAME}
          </h3>
          <p className="text-sm text-gray-600">
            국가 코드: {hoveredCountry.country_code || hoveredCountry.ISO_A3}
          </p>
          <p className="text-sm text-gray-600">
            총 자본: ${(hoveredCountry.total_capital || 0).toLocaleString()}M
          </p>
          <p className="text-sm text-gray-600">
            강도: {((hoveredCountry.intensity || 0) * 100).toFixed(1)}%
          </p>
        </div>
      )}
      
      {/* 제목 */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-90 rounded-lg px-4 py-2">
        <h2 className="text-lg font-semibold text-gray-900">
          글로벌 자본 흐름 시각화 ({year}년)
        </h2>
        {sector && (
          <p className="text-sm text-gray-600">분야: {sector}</p>
        )}
      </div>
    </div>
  )
}
