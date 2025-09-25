'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { formatNumberBoth } from '@/utils/formatters'

interface BulkLoadingSectorMapProps {
  year?: number
  sector?: string
  capitalTypes?: string[]
  visualizationType?: 'choropleth' | 'flow' | 'both'
  onDataChange?: (data: any) => void
}

interface YearlyData {
  [year: number]: {
    [countryCode: string]: number
  }
}

export default function BulkLoadingSectorMap({
  year = 2023,
  sector = '',
  capitalTypes = [],
  visualizationType = 'choropleth',
  onDataChange
}: BulkLoadingSectorMapProps) {
  const [mapData, setMapData] = useState<any>(null)
  const [allYearlyData, setAllYearlyData] = useState<YearlyData>({})
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [hoveredCountry, setHoveredCountry] = useState<any>(null)
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isMounted, setIsMounted] = useState(false)

  // 모든 연도 데이터를 한 번에 로딩
  const loadAllYearData = async (sector: string, capitalTypes: string[]) => {
    console.log('🚀 Starting bulk data loading...')
    const yearlyData: YearlyData = {}
    const totalYears = 2024 - 1970 + 1
    let processedYears = 0

    try {
      // 배치로 연도별 데이터 로딩 (8개씩으로 증가)
      for (let startYear = 1970; startYear <= 2024; startYear += 8) {
        const endYear = Math.min(startYear + 7, 2024)
        const promises = []

        for (let y = startYear; y <= endYear; y++) {
          promises.push(fetchYearData(sector, capitalTypes, y))
        }

        const results = await Promise.allSettled(promises)
        
        results.forEach((result, index) => {
          const currentYear = startYear + index
          if (result.status === 'fulfilled') {
            yearlyData[currentYear] = result.value
          } else {
            console.warn(`Failed year ${currentYear}, using empty data`)
            yearlyData[currentYear] = {}
          }
          processedYears++
          setLoadingProgress((processedYears / totalYears) * 100)
        })

        // UI 업데이트를 위한 작은 지연 (단축)
        await new Promise(resolve => setTimeout(resolve, 25))
      }

      console.log('✅ Bulk loading completed!', Object.keys(yearlyData).length, 'years loaded')
      return yearlyData
    } catch (error) {
      console.error('❌ Bulk loading failed:', error)
      return {}
    }
  }

  // 단일 연도 데이터 로딩
  const fetchYearData = async (sector: string, capitalTypes: string[], year: number) => {
    try {
      const params = new URLSearchParams()
      if (sector) params.append('sector', sector)
      params.append('year', year.toString())
      if (capitalTypes.length > 0) {
        capitalTypes.forEach(type => params.append('capital_types', type))
      }
      params.append('aggregate', 'true')
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2000) // 2초 타임아웃
      
      const response = await fetch(
        `http://localhost:8001/api/v1/capitalflows/capitalflows/?${params}`,
        { 
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      )
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      const processedData: { [countryCode: string]: number } = {}
      
      if (data.results && Array.isArray(data.results)) {
        data.results.forEach((item: any) => {
          if (item.country_code && item.total_amount !== undefined) {
            processedData[item.country_code] = parseFloat(item.total_amount) || 0
          }
        })
      }
      
      return processedData
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn(`⏱️ Timeout for year ${year}`)
      } else {
        console.warn(`⚠️ Error loading year ${year}:`, error.message)
      }
      return {}
    }
  }

  // 현재 연도의 맵 데이터 생성
  const currentMapData = useMemo(() => {
    if (!mapData || !allYearlyData[year]) {
      return null
    }

    const currentYearData = allYearlyData[year]
    const maxCapital = Math.max(...Object.values(currentYearData), 1)

    const enrichedFeatures = mapData.features.map((feature: any) => {
      const countryCode = feature.id
      const countryName = feature.properties?.NAME || feature.properties?.name || countryCode
      const capitalAmount = currentYearData[countryCode] || 0
      const intensity = maxCapital > 0 ? Math.min(capitalAmount / maxCapital, 1) : 0
      
      return {
        ...feature,
        properties: {
          ...feature.properties,
          country_name: countryName,
          country_code: countryCode,
          capital_amount: capitalAmount,
          intensity: intensity,
          selected_capital_types: capitalTypes.length > 0 ? capitalTypes.join(', ') : '전체',
          capital_type_count: capitalTypes.length || 1
        }
      }
    })

    return {
      type: 'FeatureCollection',
      features: enrichedFeatures
    }
  }, [mapData, allYearlyData, year, capitalTypes])

  // 초기 로딩
  useEffect(() => {
    if (!isMounted) return

    const initializeData = async () => {
      setLoading(true)
      setInitialLoad(true)

      try {
        // 1. GeoJSON 로딩
        console.log('📍 Loading GeoJSON...')
        const geoResponse = await fetch('/world-countries-detailed.json')
        const worldData = await geoResponse.json()
        setMapData(worldData)

        // 2. 모든 연도 데이터 로딩
        const yearlyData = await loadAllYearData(sector, capitalTypes)
        setAllYearlyData(yearlyData)

      } catch (error) {
        console.error('Failed to initialize data:', error)
      } finally {
        setLoading(false)
        setInitialLoad(false)
        setLoadingProgress(0)
      }
    }

    initializeData()
  }, [isMounted, sector, capitalTypes])

  // 데이터 변경 시 (연도는 제외)
  useEffect(() => {
    if (initialLoad || !isMounted) return

    const updateData = async () => {
      setLoading(true)
      const yearlyData = await loadAllYearData(sector, capitalTypes)
      setAllYearlyData(yearlyData)
      setLoading(false)
    }

    updateData()
  }, [sector, capitalTypes, isMounted, initialLoad])

  // 클라이언트 마운트
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 현재 연도 데이터를 상위 컴포넌트로 전달
  useEffect(() => {
    if (!allYearlyData[year] || !onDataChange) return

    const currentYearData = allYearlyData[year]
    const formattedData: any = {}

    Object.entries(currentYearData).forEach(([countryCode, amount]) => {
      if (amount > 0) {
        formattedData[countryCode] = {
          countryName: countryCode, // 실제로는 국가명 매핑이 필요할 수 있음
          amount: amount,
          intensity: amount / Math.max(...Object.values(currentYearData), 1)
        }
      }
    })

    onDataChange(formattedData)
  }, [allYearlyData, year, onDataChange])

  // 색상 정의
  const sectorColors = {
    '': { name: '전체', baseColor: [59, 130, 246] },
    'AI': { name: '인공지능', baseColor: [59, 130, 246] },
    'SEMICONDUCTOR': { name: '반도체', baseColor: [168, 85, 247] },
    'BIO': { name: '바이오', baseColor: [34, 197, 94] },
    'ENERGY': { name: '에너지', baseColor: [234, 179, 8] },
    'FINTECH': { name: '핀테크', baseColor: [239, 68, 68] },
    'AUTOMOTIVE': { name: '자동차', baseColor: [20, 184, 166] },
    'AEROSPACE': { name: '항공우주', baseColor: [99, 102, 241] },
    'TELECOM': { name: '통신', baseColor: [236, 72, 153] },
    'REALESTATE': { name: '부동산', baseColor: [139, 69, 19] },
    'AGRICULTURE': { name: '농업', baseColor: [34, 139, 34] }
  }

  const getFillColor = (intensity: number, sector: string) => {
    if (intensity === 0) return '#f3f4f6'

    if (sector === 'BIO') {
      if (intensity >= 0.8) return '#14532d'
      if (intensity >= 0.6) return '#166534'
      if (intensity >= 0.4) return '#22c55e'
      if (intensity >= 0.2) return '#4ade80'
      return '#86efac'
    } else if (sector === 'AI') {
      if (intensity >= 0.8) return '#1e3a8a'
      if (intensity >= 0.6) return '#1e40af'
      if (intensity >= 0.4) return '#3b82f6'
      if (intensity >= 0.2) return '#60a5fa'
      return '#93c5fd'
    }
    // 다른 분야들도 동일한 패턴으로 추가...
    
    // 기본 색상
    if (intensity >= 0.8) return '#1e3a8a'
    if (intensity >= 0.6) return '#1e40af'
    if (intensity >= 0.4) return '#3b82f6'
    if (intensity >= 0.2) return '#60a5fa'
    return '#93c5fd'
  }

  if (!isMounted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">지도 초기화 중...</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
        <div className="text-gray-600 mb-4">
          {initialLoad ? '모든 연도 데이터 로딩 중...' : '데이터 업데이트 중...'}
        </div>
        
        {loadingProgress > 0 && (
          <div className="w-80 bg-gray-200 rounded-full h-3 mb-2">
            <div 
              className="bg-blue-500 h-3 rounded-full transition-all duration-300 flex items-center justify-center"
              style={{ width: `${loadingProgress}%` }}
            >
              <span className="text-xs text-white font-medium">
                {Math.round(loadingProgress)}%
              </span>
            </div>
          </div>
        )}
        
        <div className="text-sm text-gray-500 text-center">
          {initialLoad ? (
            <>
              1970-2024년 모든 데이터를 불러오고 있습니다.<br/>
              완료 후 연도 변경이 즉시 반영됩니다.
            </>
          ) : (
            '새로운 설정으로 데이터를 업데이트하고 있습니다.'
          )}
        </div>
      </div>
    )
  }

  if (!currentMapData) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-red-600">지도 데이터를 불러올 수 없습니다.</div>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative bg-blue-50">

      {/* SVG 지도 */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1000 500"
        style={{ background: '#e0f2fe' }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          setMousePosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
          })
        }}
      >
        {currentMapData.features.map((feature: any, index: number) => {
          const geometry = feature.geometry
          const intensity = feature.properties.intensity || 0
          const fillColor = getFillColor(intensity, sector)
          
          if (geometry.type === 'Polygon') {
            const coordinates = geometry.coordinates[0]
            const pathData = coordinates.map((coord: number[], i: number) => {
              const x = ((coord[0] + 180) / 360) * 1000
              const y = ((90 - coord[1]) / 180) * 500
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
            }).join(' ') + ' Z'
            
            return (
              <path
                key={`${feature.id}-${index}`}
                d={pathData}
                fill={fillColor}
                stroke="#ffffff"
                strokeWidth="0.5"
                style={{ 
                  cursor: 'pointer',
                  transition: 'all 0.1s ease' // 빠른 전환
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.setAttribute('stroke', '#2563eb')
                  e.currentTarget.setAttribute('stroke-width', '2')
                  setHoveredCountry(feature.properties)
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.setAttribute('stroke', '#ffffff')
                  e.currentTarget.setAttribute('stroke-width', '0.5')
                  setHoveredCountry(null)
                }}
              />
            )
          } else if (geometry.type === 'MultiPolygon') {
            return geometry.coordinates.map((polygon: number[][][], polyIndex: number) => {
              const coordinates = polygon[0]
              const pathData = coordinates.map((coord: number[], i: number) => {
                const x = ((coord[0] + 180) / 360) * 1000
                const y = ((90 - coord[1]) / 180) * 500
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
              }).join(' ') + ' Z'
              
              return (
                <path
                  key={`${feature.id}-${index}-${polyIndex}`}
                  d={pathData}
                  fill={fillColor}
                  stroke="#ffffff"
                  strokeWidth="0.5"
                  style={{ 
                    cursor: 'pointer',
                    transition: 'all 0.1s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.setAttribute('stroke', '#2563eb')
                    e.currentTarget.setAttribute('stroke-width', '2')
                    setHoveredCountry(feature.properties)
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.setAttribute('stroke', '#ffffff')
                    e.currentTarget.setAttribute('stroke-width', '0.5')
                    setHoveredCountry(null)
                  }}
                />
              )
            })
          }
          return null
        })}
      </svg>

      {/* 툴팁 */}
      {hoveredCountry && (
        <div
          className="absolute pointer-events-none bg-white p-3 rounded-lg shadow-lg border z-30 max-w-xs"
          style={{
            left: mousePosition.x + 10,
            top: mousePosition.y - 10,
            transform: mousePosition.x > 500 ? 'translateX(-100%)' : 'none'
          }}
        >
          <div className="font-bold text-gray-900 mb-1">
            {hoveredCountry.country_name}
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <div>
              <span className="font-medium">총 자본:</span>{' '}
              <span className="font-bold text-blue-600">
                {formatNumberBoth(hoveredCountry.capital_amount || 0).short}
              </span>
              <div className="text-xs text-gray-500 mt-1">
                {formatNumberBoth(hoveredCountry.capital_amount || 0).detailed}
              </div>
            </div>
            <div>
              <span className="font-medium">선택된 타입:</span>{' '}
              {hoveredCountry.selected_capital_types}
            </div>
            <div>
              <span className="font-medium">연도:</span> {year}
            </div>
            <div>
              <span className="font-medium">분야:</span>{' '}
              {sectorColors[sector as keyof typeof sectorColors]?.name || sector || '전체'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
