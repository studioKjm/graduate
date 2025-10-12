'use client'

import React, { useState, useEffect, useMemo } from 'react'

interface FastLoadingSectorMapProps {
  year?: number
  sector?: string
  capitalTypes?: string[]
  visualizationType?: 'choropleth' | 'flow' | 'both'
}

interface YearlyData {
  [year: number]: {
    [countryCode: string]: number
  }
}

export default function FastLoadingSectorMap({
  year = 2023,
  sector = '',
  capitalTypes = [],
  visualizationType = 'choropleth'
}: FastLoadingSectorMapProps) {
  const [mapData, setMapData] = useState<any>(null)
  const [allYearlyData, setAllYearlyData] = useState<YearlyData>({})
  const [loading, setLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [hoveredCountry, setHoveredCountry] = useState<any>(null)
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isMounted, setIsMounted] = useState(false)

  // 🚀 초고속 병렬 로딩 - 10개씩 동시에!
  const loadAllYearDataFast = async (sector: string, capitalTypes: string[]) => {
    console.log('🚀 Starting ULTRA-FAST parallel loading...')
    const yearlyData: YearlyData = {}
    const years = Array.from({ length: 55 }, (_, i) => 1970 + i) // 1970-2024
    const BATCH_SIZE = 10 // 10개씩 동시에 로딩
    
    try {
      for (let i = 0; i < years.length; i += BATCH_SIZE) {
        const yearBatch = years.slice(i, i + BATCH_SIZE)
        console.log(`📦 Loading batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(years.length / BATCH_SIZE)}:`, yearBatch)
        
        // 10개 연도를 동시에 병렬 로딩
        const promises = yearBatch.map(year => 
          fetchYearDataOptimized(sector, capitalTypes, year)
        )
        
        const results = await Promise.allSettled(promises)
        
        results.forEach((result, index) => {
          const currentYear = yearBatch[index]
          if (result.status === 'fulfilled') {
            yearlyData[currentYear] = result.value
          } else {
            console.warn(`Failed to load ${currentYear}:`, result.reason)
            yearlyData[currentYear] = {} // 빈 데이터로 fallback
          }
          
          setLoadingProgress(((i + index + 1) / years.length) * 100)
        })
        
        // 배치 완료 후 잠깐 대기 (서버 부하 방지)
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      console.log('✅ ULTRA-FAST loading completed!', Object.keys(yearlyData).length, 'years loaded')
      return yearlyData
    } catch (error) {
      console.error('❌ Fast loading failed:', error)
      return {}
    }
  }

  // 🎯 최적화된 API 호출 (타임아웃 설정)
  const fetchYearDataOptimized = async (sector: string, capitalTypes: string[], year: number) => {
    // 자본타입이 전체해제된 경우 빈 결과 반환
    if (capitalTypes.length === 0) {
      console.log('🚫 No capital types selected, returning empty data')
      return {}
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5초 타임아웃으로 증가

    try {
      console.log(`🔍 Fetching data for year ${year}, sector: ${sector}, capitalTypes: ${capitalTypes.join(',')}`)
      
      const params = new URLSearchParams()
      if (sector) params.append('sector', sector)
      params.append('year', year.toString())
      if (capitalTypes.length > 0) {
        capitalTypes.forEach(type => params.append('capital_types', type))
      }
      params.append('aggregate', 'true')
      
      const url = `http://localhost:8001/api/v1/visualization/map-data/?${params}`
      console.log(`🌐 Fetching from: ${url}`)
      
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        console.error(`❌ HTTP ${response.status} for year ${year}: ${response.statusText}`)
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log(`📦 Response data for year ${year}:`, data)
      
      const processedData: { [countryCode: string]: number } = {}
      
      if (data.success && data.data && data.data.countries && Array.isArray(data.data.countries)) {
        data.data.countries.forEach((country: any) => {
          if (country.code && country.total_amount !== undefined) {
            const amount = parseFloat(country.total_amount) || 0
            if (amount > 0) {
              processedData[country.code] = amount
            }
          }
        })
        console.log(`✅ Year ${year} processed:`, Object.keys(processedData).length, 'countries with data')
      } else {
        console.warn(`⚠️ Year ${year}: No valid results`)
      }
      
      return processedData
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        console.warn(`⏱️ Timeout for year ${year}`)
      } else {
        console.error(`❌ Error loading ${year}:`, error.message)
      }
      return {}
    }
  }

  // 현재 연도의 맵 데이터 생성 (메모이제이션)
  const currentMapData = useMemo(() => {
    console.log(`🗺️ Creating map data for year ${year}`)
    console.log('Available years:', Object.keys(allYearlyData))
    console.log('Map data exists:', !!mapData)
    
    if (!mapData) {
      console.warn(`❌ Missing mapData`)
      return null
    }

    // 자본타입이 전체해제된 경우 즉시 빈 데이터 반환
    if (capitalTypes.length === 0) {
      console.log('🚫 No capital types selected, showing empty map')
      return {
        type: 'FeatureCollection',
        features: mapData.features.map((feature: any) => ({
          ...feature,
          properties: {
            ...feature.properties,
            country_name: feature.properties?.NAME || feature.properties?.name || feature.id,
            country_code: feature.id,
            capital_amount: 0,
            intensity: 0,
            selected_capital_types: '선택 안함',
            capital_type_count: 0
          }
        }))
      }
    }

    // 현재 연도 데이터가 없으면 로딩 중 상태로 표시
    if (!allYearlyData[year]) {
      console.log(`⏳ Loading data for year ${year}...`)
      return {
        type: 'FeatureCollection',
        features: mapData.features.map((feature: any) => ({
          ...feature,
          properties: {
            ...feature.properties,
            country_name: feature.properties?.NAME || feature.properties?.name || feature.id,
            country_code: feature.id,
            capital_amount: 0,
            intensity: 0,
            selected_capital_types: capitalTypes.join(', '),
            capital_type_count: capitalTypes.length,
            loading: true
          }
        }))
      }
    }

    const currentYearData = allYearlyData[year]
    console.log(`📊 Year ${year} data:`, Object.keys(currentYearData).length, 'countries')
    
    const maxCapital = Math.max(...Object.values(currentYearData), 1)
    console.log(`💰 Max capital for ${year}: $${maxCapital.toLocaleString()}`)

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

    console.log(`🎨 Enhanced ${enrichedFeatures.length} features`)
    return {
      type: 'FeatureCollection',
      features: enrichedFeatures
    }
  }, [mapData, allYearlyData, year, capitalTypes])

  // 📡 GeoJSON 로딩 (한 번만)
  const loadGeoData = async () => {
    try {
      console.log('📍 Loading optimized GeoJSON...')
      const response = await fetch('/world-countries-detailed.json')
      const data = await response.json()
      setMapData(data)
      console.log('✅ GeoJSON loaded:', data.features.length, 'countries')
    } catch (error) {
      console.error('❌ GeoJSON loading failed:', error)
    }
  }

  // 🏁 초기화
  useEffect(() => {
    if (!isMounted) return

    const initialize = async () => {
      setLoading(true)
      setLoadingProgress(0)

      // 자본타입이 전체해제된 경우 즉시 빈 데이터로 설정
      if (capitalTypes.length === 0) {
        console.log('🚫 No capital types selected, showing empty map')
        const emptyYearlyData: YearlyData = {}
        for (let year = 1970; year <= 2024; year++) {
          emptyYearlyData[year] = {}
        }
        setAllYearlyData(emptyYearlyData)
        setLoading(false)
        setLoadingProgress(0)
        return
      }

      // 병렬로 GeoJSON과 데이터 로딩 시작
      const [_, yearlyData] = await Promise.all([
        loadGeoData(),
        loadAllYearDataFast(sector, capitalTypes)
      ])

      setAllYearlyData(yearlyData)
      setLoading(false)
      setLoadingProgress(0)
    }

    initialize()
  }, [sector, capitalTypes])

  // 🖥️ 클라이언트 마운트
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 🎨 색상 정의 (최적화)
  const sectorColors = useMemo(() => ({
    '': { name: '전체', color: '#3b82f6' },
    'AI': { name: '인공지능', color: '#3b82f6' },
    'SEMICONDUCTOR': { name: '반도체', color: '#a855f7' },
    'BIO': { name: '바이오', color: '#22c55e' },
    'ENERGY': { name: '에너지', color: '#eab308' },
    'FINTECH': { name: '핀테크', color: '#ef4444' },
    'AUTOMOTIVE': { name: '자동차', color: '#14b8a6' },
    'AEROSPACE': { name: '항공우주', color: '#6366f1' },
    'TELECOM': { name: '통신', color: '#ec4899' },
    'REALESTATE': { name: '부동산', color: '#b45309' },
    'AGRICULTURE': { name: '농업', color: '#22c55e' }
  }), [])

  const getFillColor = (intensity: number, sector: string) => {
    if (intensity === 0) return '#f3f4f6'

    const colors = {
      'BIO': ['#86efac', '#4ade80', '#22c55e', '#166534', '#14532d'],
      'AI': ['#93c5fd', '#60a5fa', '#3b82f6', '#1e40af', '#1e3a8a']
    }

    const sectorColors = colors[sector as keyof typeof colors] || colors['AI']
    const colorIndex = Math.min(Math.floor(intensity * 5), 4)
    return sectorColors[colorIndex]
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
        <div className="text-2xl font-bold text-blue-600 mb-4">
          🚀 초고속 로딩 중...
        </div>
        
        <div className="w-96 bg-gray-200 rounded-full h-4 mb-4">
          <div 
            className="bg-gradient-to-r from-blue-500 to-green-500 h-4 rounded-full transition-all duration-300 flex items-center justify-center"
            style={{ width: `${loadingProgress}%` }}
          >
            <span className="text-xs text-white font-bold">
              {Math.round(loadingProgress)}%
            </span>
          </div>
        </div>
        
        <div className="text-sm text-gray-600 text-center max-w-md">
          <div className="mb-2">
            ⚡ 10개 연도씩 병렬 로딩으로 속도 최적화
          </div>
          <div className="text-xs">
            완료 후 모든 연도 변경이 즉시 반응합니다!
          </div>
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
      {/* 성능 표시 */}
      <div className="absolute top-4 right-4 z-20 bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded-lg shadow-md">
        <div className="text-sm font-bold">⚡ 초고속 모드</div>
        <div className="text-xs">{Object.keys(allYearlyData).length}년치 데이터 로딩 완료</div>
        <div className="text-xs text-green-600">10개씩 병렬 처리로 최적화</div>
      </div>

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
              ${hoveredCountry.capital_amount?.toLocaleString() || '0'}
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
