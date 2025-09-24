'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'

interface SectorBasedMapProps {
  year?: number
  sector?: string
  capitalTypes?: string[]
  visualizationType?: 'choropleth' | 'flow' | 'both'
}

export default function SectorBasedMap({
  year = 2023,
  sector = '',
  capitalTypes = [],
  visualizationType = 'choropleth'
}: SectorBasedMapProps) {
  const [mapData, setMapData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [hoveredCountry, setHoveredCountry] = useState<any>(null)
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isMounted, setIsMounted] = useState(false)
  
  // 간단한 캐싱 시스템
  const geoDataCache = useRef<any>(null)
  const apiDataCache = useRef<Map<string, any>>(new Map())
  const lastUpdateRef = useRef<number>(0)

  // 캐시 키 생성
  const getCacheKey = (sector: string, capitalTypes: string[], year: number) => {
    return `${sector}-${capitalTypes.join(',')}-${year}`
  }

  // 안전한 API 데이터 호출 함수 (간단한 캐싱 적용)
  const fetchCapitalFlowData = async (sector: string, capitalTypes: string[], year: number) => {
    const cacheKey = getCacheKey(sector, capitalTypes, year)
    
    // 캐시 확인 (1분간 유효)
    if (apiDataCache.current.has(cacheKey)) {
      const cached = apiDataCache.current.get(cacheKey)
      if (Date.now() - cached.timestamp < 60000) { // 1분 캐시
        console.log(`✅ Cache hit for ${year}`)
        return cached.data
      }
    }

    try {
      const params = new URLSearchParams()
      
      if (sector) params.append('sector', sector)
      if (year) params.append('year', year.toString())
      if (capitalTypes.length > 0) {
        capitalTypes.forEach(type => params.append('capital_types', type))
      }
      params.append('aggregate', 'true')
      
      console.log(`🔄 API call for ${year}`)
      const response = await fetch(`http://localhost:8001/api/v1/capitalflows/capitalflows/?${params}`)
      
      if (!response.ok) {
        console.warn('API 호출 실패, 더미 데이터 사용')
        return null
      }
      
      const data = await response.json()
      
      // 캐시에 저장
      apiDataCache.current.set(cacheKey, {
        data: data,
        timestamp: Date.now()
      })
      
      return data
    } catch (error) {
      console.error('API 호출 오류:', error)
      return null
    }
  }

  // API 데이터를 맵 데이터 형식으로 변환
  const processApiData = (apiData: any) => {
    if (!apiData || !apiData.results) {
      return {}
    }

    const aggregatedData: { [country: string]: number } = {}
    
    for (const result of apiData.results) {
      const countryCode = result.country_code
      const totalAmount = result.total_amount || 0
      
      if (countryCode && totalAmount > 0) {
        aggregatedData[countryCode] = parseFloat(totalAmount)
      }
    }
    
    return aggregatedData
  }

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 분야별 색상 정의
  const sectorColors = {
    '': { name: '전체', baseColor: [59, 130, 246] },        // 파란색 (기본)
    'AI': { name: '인공지능', baseColor: [59, 130, 246] },    // 파란색
    'SEMICONDUCTOR': { name: '반도체', baseColor: [168, 85, 247] }, // 보라색
    'BIO': { name: '바이오', baseColor: [34, 197, 94] },      // 녹색
    'ENERGY': { name: '에너지', baseColor: [234, 179, 8] },   // 노란색
    'FINTECH': { name: '핀테크', baseColor: [239, 68, 68] },  // 빨간색
    'AUTOMOTIVE': { name: '자동차', baseColor: [20, 184, 166] }, // 청록색
    'AEROSPACE': { name: '항공우주', baseColor: [99, 102, 241] }, // 인디고
    'TELECOM': { name: '통신', baseColor: [236, 72, 153] },   // 핑크
    'REALESTATE': { name: '부동산', baseColor: [139, 69, 19] }, // 갈색
    'AGRICULTURE': { name: '농업', baseColor: [34, 139, 34] }, // 진한 녹색
  }

  // 지도 데이터 로드
  useEffect(() => {
    if (!isMounted) return
    
    const loadData = async () => {
      setLoading(true)
      try {
        // GeoJSON 캐싱
        let worldData = geoDataCache.current
        if (!worldData) {
          console.log('🔄 Loading GeoJSON data')
          const geoResponse = await fetch('/world-countries-detailed.json')
          worldData = await geoResponse.json()
          geoDataCache.current = worldData
        } else {
          console.log('✅ GeoJSON cache hit')
        }
        
        console.log('Sector-based map loaded:', worldData.features.length, 'countries')
        console.log('Current sector:', sector, 'Current year:', year)
        console.log('Selected capital types:', capitalTypes)
        
        // 새로운 API 엔드포인트에서 데이터 가져오기
        const apiData = await fetchCapitalFlowData(sector, capitalTypes, year)
        
        console.log('=== API 데이터 로딩 ===')
        console.log('API Response:', apiData)
        
        // API 데이터를 기존 형식으로 변환
        const apiProcessedData = processApiData(apiData)
        
        // 분야별 자본타입별 국가별 자본 데이터 (fallback용 더미 데이터)
        const capitalData: { 
          [sector: string]: { 
            [capitalType: string]: { 
              [country: string]: number 
            } 
          } 
        } = {
          '': { // 전체 분야
            'FDI': { 'USA': 300000, 'CHN': 250000, 'JPN': 200000, 'DEU': 150000, 'GBR': 120000, 'FRA': 100000, 'KOR': 80000, 'CAN': 70000, 'AUS': 60000, 'IND': 50000 },
            'VC': { 'USA': 200000, 'CHN': 150000, 'GBR': 80000, 'CAN': 60000, 'DEU': 50000, 'JPN': 40000, 'KOR': 35000, 'FRA': 30000, 'AUS': 25000, 'IND': 20000 },
            'MA': { 'USA': 300000, 'CHN': 200000, 'JPN': 150000, 'DEU': 120000, 'GBR': 100000, 'FRA': 80000, 'KOR': 70000, 'CAN': 60000, 'AUS': 50000, 'IND': 40000 },
            'IPO': { 'USA': 200000, 'CHN': 200000, 'JPN': 50000, 'DEU': 30000, 'GBR': 50000, 'FRA': 20000, 'KOR': 165000, 'CAN': 110000, 'AUS': 115000, 'IND': 90000 }
          },
          'AI': { // AI 분야
            'FDI': { 'USA': 250000, 'CHN': 200000, 'GBR': 80000, 'CAN': 70000, 'DEU': 60000, 'JPN': 50000, 'KOR': 40000, 'FRA': 35000, 'AUS': 25000, 'IND': 30000 },
            'VC': { 'USA': 400000, 'CHN': 300000, 'GBR': 120000, 'CAN': 100000, 'DEU': 80000, 'JPN': 70000, 'KOR': 60000, 'FRA': 50000, 'AUS': 30000, 'IND': 40000 },
            'MA': { 'USA': 100000, 'CHN': 150000, 'GBR': 60000, 'CAN': 50000, 'DEU': 40000, 'JPN': 35000, 'KOR': 30000, 'FRA': 25000, 'AUS': 15000, 'IND': 20000 },
            'IPO': { 'USA': 50000, 'CHN': 50000, 'GBR': 40000, 'CAN': 30000, 'DEU': 20000, 'JPN': 25000, 'KOR': 20000, 'FRA': 10000, 'AUS': 10000, 'IND': 10000 }
          },
          'SEMICONDUCTOR': { // 반도체 분야
            'FDI': { 'KOR': 150000, 'TWN': 120000, 'USA': 100000, 'JPN': 80000, 'CHN': 70000, 'DEU': 50000, 'SGP': 30000, 'NLD': 25000, 'MYS': 20000, 'THA': 15000 },
            'VC': { 'KOR': 80000, 'TWN': 70000, 'USA': 60000, 'JPN': 50000, 'CHN': 40000, 'DEU': 30000, 'SGP': 25000, 'NLD': 20000, 'MYS': 15000, 'THA': 10000 },
            'MA': { 'KOR': 120000, 'TWN': 100000, 'USA': 90000, 'JPN': 80000, 'CHN': 60000, 'DEU': 50000, 'SGP': 30000, 'NLD': 25000, 'MYS': 20000, 'THA': 10000 },
            'IPO': { 'KOR': 50000, 'TWN': 60000, 'USA': 50000, 'JPN': 40000, 'CHN': 30000, 'DEU': 20000, 'SGP': 15000, 'NLD': 10000, 'MYS': 5000, 'THA': 5000 }
          },
          'BIO': { // 바이오 분야
            'FDI': { 'USA': 200000, 'CHE': 100000, 'DEU': 80000, 'GBR': 70000, 'JPN': 60000, 'FRA': 50000, 'CAN': 40000, 'DNK': 35000, 'SWE': 30000, 'KOR': 10000 },
            'VC': { 'USA': 250000, 'CHE': 120000, 'DEU': 100000, 'GBR': 80000, 'JPN': 70000, 'FRA': 60000, 'CAN': 50000, 'DNK': 40000, 'SWE': 30000, 'KOR': 15000 },
            'MA': { 'USA': 100000, 'CHE': 60000, 'DEU': 50000, 'GBR': 30000, 'JPN': 30000, 'FRA': 25000, 'CAN': 20000, 'DNK': 15000, 'SWE': 15000, 'KOR': 3000 },
            'IPO': { 'USA': 50000, 'CHE': 20000, 'DEU': 20000, 'GBR': 20000, 'JPN': 20000, 'FRA': 15000, 'CAN': 10000, 'DNK': 10000, 'SWE': 5000, 'KOR': 2000 }
          },
          'ENERGY': { // 에너지 분야
            'FDI': { 'USA': 150000, 'CHN': 120000, 'SAU': 100000, 'NOR': 80000, 'RUS': 70000, 'CAN': 60000, 'BRA': 50000, 'GBR': 40000, 'AUS': 35000, 'DEU': 30000 },
            'VC': { 'USA': 100000, 'CHN': 80000, 'SAU': 60000, 'NOR': 50000, 'RUS': 40000, 'CAN': 35000, 'BRA': 30000, 'GBR': 25000, 'AUS': 20000, 'DEU': 15000 },
            'MA': { 'USA': 200000, 'CHN': 150000, 'SAU': 100000, 'NOR': 80000, 'RUS': 60000, 'CAN': 50000, 'BRA': 40000, 'GBR': 35000, 'AUS': 30000, 'DEU': 25000 },
            'IPO': { 'USA': 50000, 'CHN': 50000, 'SAU': 40000, 'NOR': 40000, 'RUS': 30000, 'CAN': 35000, 'BRA': 30000, 'GBR': 20000, 'AUS': 15000, 'DEU': 10000 }
          },
          'FINTECH': { // 핀테크 분야
            'FDI': { 'USA': 120000, 'GBR': 60000, 'CHN': 50000, 'SGP': 40000, 'DEU': 35000, 'CAN': 30000, 'AUS': 25000, 'FRA': 20000, 'JPN': 18000, 'KOR': 15000 },
            'VC': { 'USA': 200000, 'GBR': 100000, 'CHN': 80000, 'SGP': 70000, 'DEU': 50000, 'CAN': 40000, 'AUS': 35000, 'FRA': 30000, 'JPN': 25000, 'KOR': 20000 },
            'MA': { 'USA': 60000, 'GBR': 30000, 'CHN': 40000, 'SGP': 30000, 'DEU': 25000, 'CAN': 20000, 'AUS': 15000, 'FRA': 15000, 'JPN': 12000, 'KOR': 10000 },
            'IPO': { 'USA': 20000, 'GBR': 10000, 'CHN': 10000, 'SGP': 10000, 'DEU': 10000, 'CAN': 10000, 'AUS': 5000, 'FRA': 5000, 'JPN': 5000, 'KOR': 5000 }
          }
        }
        
        // API 데이터 우선 사용, 실패 시 더미 데이터 사용
        let aggregatedData: { [country: string]: number } = {}
        
        if (Object.keys(apiProcessedData).length > 0) {
          // API 데이터 사용
          aggregatedData = apiProcessedData
          console.log('API 데이터 사용:', Object.keys(aggregatedData).length, '개 국가')
        } else {
          // 더미 데이터 사용 (기존 로직)
          const currentSectorData = capitalData[sector] || capitalData['']
          
          if (capitalTypes.length === 0) {
            // 자본 타입이 선택되지 않은 경우 모든 자본 타입 합산
            Object.keys(currentSectorData).forEach(capitalType => {
              Object.entries(currentSectorData[capitalType]).forEach(([country, amount]) => {
                aggregatedData[country] = (aggregatedData[country] || 0) + amount
              })
            })
          } else {
            // 선택된 자본 타입들만 합산
            capitalTypes.forEach(capitalType => {
              if (currentSectorData[capitalType]) {
                Object.entries(currentSectorData[capitalType]).forEach(([country, amount]) => {
                  aggregatedData[country] = (aggregatedData[country] || 0) + amount
                })
              }
            })
          }
          console.log('더미 데이터 사용:', Object.keys(aggregatedData).length, '개 국가')
        }
        
        const maxCapital = Math.max(...Object.values(aggregatedData))
        
        console.log('=== 데이터 로딩 디버깅 ===')
        console.log('Selected sector:', sector)
        console.log('Selected capital types:', capitalTypes)
        console.log('Aggregated data (top 10):', Object.entries(aggregatedData)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([country, amount]) => `${country}: ${amount.toLocaleString()}`))
        console.log('Max capital for normalization:', maxCapital)
        
        // GeoJSON 피처에 자본 데이터 추가
        const enrichedFeatures = worldData.features.map((feature: any, index: number) => {
          const countryCode = feature.id // GeoJSON의 id 필드에 국가 코드가 있음
          const countryName = feature.properties.name || feature.properties.NAME || feature.properties.NAME_EN
          
          const capitalAmount = aggregatedData[countryCode] || 0
          const intensity = capitalAmount > 0 ? Math.min(capitalAmount / maxCapital, 1) : 0
          
          // 주요 국가들의 매칭 상태 확인
          if (['USA', 'CHN', 'JPN', 'DEU', 'GBR', 'FRA', 'KOR'].includes(countryCode) || index < 10) {
            console.log(`=== 국가 매칭 디버깅 ===`)
            console.log(`Country: ${countryName}`)
            console.log(`Country Code: ${countryCode}`)
            console.log(`Capital Amount: ${capitalAmount}`)
            console.log(`Intensity: ${intensity}`)
            console.log(`Available in aggregated data: ${countryCode in aggregatedData}`)
            console.log('---')
          }
          
          const enrichedFeature = {
            ...feature,
            properties: {
              ...feature.properties,
              country_code: countryCode,
              country_name: countryName,
              capital_amount: capitalAmount,
              intensity: intensity,
              sector: sector || '전체',
              selected_capital_types: capitalTypes,
              capital_type_count: capitalTypes.length
            }
          }
          
          return enrichedFeature
        })
        
        console.log('Sample enriched features:', enrichedFeatures
          .filter((f: any) => f.properties.capital_amount > 0)
          .slice(0, 5)
          .map((f: any) => ({
            name: f.properties.country_name,
            code: f.properties.country_code,
            amount: f.properties.capital_amount,
            intensity: f.properties.intensity
          })))
        
        setMapData({
          type: 'FeatureCollection',
          features: enrichedFeatures
        })
        
        // 인접 연도 데이터 미리 로드 (백그라운드)
        setTimeout(() => {
          preloadAdjacentYears(sector, capitalTypes, year)
        }, 500)
        
      } catch (error) {
        console.error('Failed to load map data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [year, sector, capitalTypes, isMounted])

  // 인접 연도 데이터 미리 로드
  const preloadAdjacentYears = async (sector: string, capitalTypes: string[], currentYear: number) => {
    const adjacentYears = [currentYear - 1, currentYear + 1].filter(y => y >= 1970 && y <= 2024)
    
    for (const year of adjacentYears) {
      const cacheKey = getCacheKey(sector, capitalTypes, year)
      if (!apiDataCache.current.has(cacheKey)) {
        try {
          await fetchCapitalFlowData(sector, capitalTypes, year)
          console.log(`🚀 Preloaded data for ${year}`)
        } catch (error) {
          console.log(`⚠️ Failed to preload ${year}`)
        }
      }
    }
  }

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

  // 분야별 색상 계산 (농도에 따른 색상 변화) - 강제 적용 버전
  const getFillColor = (intensity: number, sector: string): string => {
    console.log(`getFillColor called: intensity=${intensity}, sector=${sector}`)
    
    const sectorInfo = sectorColors[sector as keyof typeof sectorColors] || sectorColors['']
    
    if (intensity === 0) {
      console.log('Returning gray for no data')
      return '#e5e7eb' // 데이터 없음 - 회색
    }
    
    // 강제 색상 적용 - 헥스 코드로 직접 반환
    if (sector === 'AI' || sector === '') {
      if (intensity >= 0.8) return '#1e3a8a' // 매우 진한 파랑
      if (intensity >= 0.6) return '#1e40af' // 진한 파랑
      if (intensity >= 0.4) return '#3b82f6' // 파랑
      if (intensity >= 0.2) return '#60a5fa' // 연한 파랑
      return '#93c5fd' // 매우 연한 파랑
    }
    
    if (sector === 'SEMICONDUCTOR') {
      if (intensity >= 0.8) return '#581c87' // 매우 진한 보라
      if (intensity >= 0.6) return '#7c3aed' // 진한 보라
      if (intensity >= 0.4) return '#a855f7' // 보라
      if (intensity >= 0.2) return '#c084fc' // 연한 보라
      return '#ddd6fe' // 매우 연한 보라
    }
    
    if (sector === 'BIO') {
      if (intensity >= 0.8) return '#14532d' // 매우 진한 녹색
      if (intensity >= 0.6) return '#166534' // 진한 녹색
      if (intensity >= 0.4) return '#16a34a' // 녹색
      if (intensity >= 0.2) return '#4ade80' // 연한 녹색
      return '#86efac' // 매우 연한 녹색
    }
    
    if (sector === 'ENERGY') {
      if (intensity >= 0.8) return '#92400e' // 매우 진한 노랑
      if (intensity >= 0.6) return '#ca8a04' // 진한 노랑
      if (intensity >= 0.4) return '#eab308' // 노랑
      if (intensity >= 0.2) return '#facc15' // 연한 노랑
      return '#fde047' // 매우 연한 노랑
    }
    
    if (sector === 'FINTECH') {
      if (intensity >= 0.8) return '#991b1b' // 매우 진한 빨강
      if (intensity >= 0.6) return '#dc2626' // 진한 빨강
      if (intensity >= 0.4) return '#ef4444' // 빨강
      if (intensity >= 0.2) return '#f87171' // 연한 빨강
      return '#fca5a5' // 매우 연한 빨강
    }
    
    if (sector === 'AUTOMOTIVE') {
      if (intensity >= 0.8) return '#0f766e' // 매우 진한 청록
      if (intensity >= 0.6) return '#0d9488' // 진한 청록
      if (intensity >= 0.4) return '#14b8a6' // 청록
      if (intensity >= 0.2) return '#5eead4' // 연한 청록
      return '#a7f3d0' // 매우 연한 청록
    }
    
    if (sector === 'AEROSPACE') {
      if (intensity >= 0.8) return '#3730a3' // 매우 진한 인디고
      if (intensity >= 0.6) return '#4338ca' // 진한 인디고
      if (intensity >= 0.4) return '#6366f1' // 인디고
      if (intensity >= 0.2) return '#a5b4fc' // 연한 인디고
      return '#c7d2fe' // 매우 연한 인디고
    }
    
    if (sector === 'TELECOM') {
      if (intensity >= 0.8) return '#be185d' // 매우 진한 핑크
      if (intensity >= 0.6) return '#db2777' // 진한 핑크
      if (intensity >= 0.4) return '#ec4899' // 핑크
      if (intensity >= 0.2) return '#f9a8d4' // 연한 핑크
      return '#fce7f3' // 매우 연한 핑크
    }
    
    if (sector === 'REALESTATE') {
      if (intensity >= 0.8) return '#78350f' // 매우 진한 갈색
      if (intensity >= 0.6) return '#92400e' // 진한 갈색
      if (intensity >= 0.4) return '#d97706' // 갈색
      if (intensity >= 0.2) return '#fbbf24' // 연한 갈색
      return '#fef3c7' // 매우 연한 갈색
    }
    
    if (sector === 'AGRICULTURE') {
      if (intensity >= 0.8) return '#14532d' // 매우 진한 농업녹색
      if (intensity >= 0.6) return '#166534' // 진한 농업녹색
      if (intensity >= 0.4) return '#22c55e' // 농업녹색
      if (intensity >= 0.2) return '#86efac' // 연한 농업녹색
      return '#dcfce7' // 매우 연한 농업녹색
    }
    
    // 기본값 (파란색)
    if (intensity >= 0.8) return '#1e40af'
    if (intensity >= 0.6) return '#3b82f6'
    if (intensity >= 0.4) return '#60a5fa'
    if (intensity >= 0.2) return '#93c5fd'
    return '#dbeafe'
  }

  const handleMouseMove = (event: React.MouseEvent) => {
    setMousePosition({ x: event.clientX, y: event.clientY })
  }

  if (!isMounted || loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{!isMounted ? '초기화 중...' : '분야별 자본 흐름 지도 로딩 중...'}</p>
        </div>
      </div>
    )
  }

  const currentSectorInfo = sectorColors[sector as keyof typeof sectorColors] || sectorColors['']

  return (
    <div className="w-full h-full relative" style={{ background: 'linear-gradient(to bottom, #f1f5f9, #e2e8f0)' }} onMouseMove={handleMouseMove}>
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 800 400"
        className="w-full h-full"
      >
        {/* 바다 배경 */}
        <rect width="800" height="400" fill="#e0f2fe" />
        
        {/* 국가들 */}
        {mapData?.features?.map((feature: any, index: number) => {
          const path = getPathFromGeometry(feature.geometry)
          if (!path) return null
          
          const intensity = feature.properties.intensity || 0
          const fillColor = getFillColor(intensity, sector)
          const countryName = feature.properties.country_name || 'Unknown'
          const countryCode = feature.properties.country_code
          const capitalAmount = feature.properties.capital_amount || 0
          
          // 색상 적용 확인 로그
          if (capitalAmount > 0 && index < 10) {
            console.log(`Rendering ${countryName}: intensity=${intensity}, color=${fillColor}, amount=${capitalAmount}`)
          }
          
          return (
            <g key={`sector-country-group-${countryCode || index}`}>
              <path
                d={path}
                fill={fillColor}
                stroke="#ffffff"
                strokeWidth="0.8"
                style={{ 
                  cursor: 'pointer',
                  fill: fillColor // 인라인 스타일로 강제 적용
                }}
                onMouseEnter={(e) => {
                  const target = e.currentTarget
                  target.style.stroke = '#fbbf24'
                  target.style.strokeWidth = '2px'
                  setHoveredCountry(feature.properties)
                }}
                onMouseLeave={(e) => {
                  const target = e.currentTarget
                  target.style.stroke = '#ffffff'
                  target.style.strokeWidth = '0.8px'
                  setHoveredCountry(null)
                }}
              />
              {/* 디버깅용 작은 원 - 색상이 적용되는지 확인 */}
              {capitalAmount > 0 && (
                <circle
                  cx={400 + (index % 10) * 30}
                  cy={20}
                  r="3"
                  fill={fillColor}
                  stroke="#000"
                  strokeWidth="0.5"
                />
              )}
            </g>
          )
        })}
        
        {/* 흐름 표시 (Flow 모드일 때) */}
        {(visualizationType === 'flow' || visualizationType === 'both') && (
          <g>
            {/* 주요 투자 흐름 화살표 */}
            <line x1="570" y1="180" x2="250" y2="160" stroke={`rgb(${currentSectorInfo.baseColor.join(',')})`} strokeWidth="3" opacity="0.8" 
                  strokeDasharray="5,5" className="animate-pulse" />
            <circle cx="250" cy="160" r="4" fill={`rgb(${currentSectorInfo.baseColor.join(',')})`} />
          </g>
        )}
      </svg>
      
      {/* 툴팁 */}
      {hoveredCountry && (
        <div 
          className="absolute z-50 bg-white border border-gray-300 rounded-lg shadow-xl p-3 pointer-events-none max-w-xs"
          style={{
            left: Math.min(mousePosition.x + 10, (typeof window !== 'undefined' ? window.innerWidth : 800) - 200),
            top: Math.max(mousePosition.y - 80, 10),
          }}
        >
          <h3 className="font-semibold text-gray-900">
            {hoveredCountry.country_name}
          </h3>
          <div className="space-y-1 text-sm text-gray-600">
            <p>분야: {currentSectorInfo.name}</p>
            <p>자본 총액: ${(hoveredCountry.capital_amount || 0).toLocaleString()}</p>
            <p>상대적 강도: {((hoveredCountry.intensity || 0) * 100).toFixed(1)}%</p>
            {hoveredCountry.selected_capital_types && hoveredCountry.selected_capital_types.length > 0 && (
              <p className="text-xs text-gray-600">
                자본 타입: {hoveredCountry.selected_capital_types.join(', ')} 
                ({hoveredCountry.capital_type_count}개 합산)
              </p>
            )}
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded border" 
                style={{ backgroundColor: getFillColor(hoveredCountry.intensity || 0, sector) }}
              ></div>
              <span className="text-xs">
                {hoveredCountry.intensity >= 0.8 ? '매우 높음' :
                 hoveredCountry.intensity >= 0.6 ? '높음' :
                 hoveredCountry.intensity >= 0.4 ? '보통' :
                 hoveredCountry.intensity >= 0.2 ? '낮음' : 
                 hoveredCountry.intensity > 0 ? '매우 낮음' : '데이터 없음'}
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* 제목 */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-95 rounded-lg px-6 py-3 shadow-lg">
        <h2 className="text-xl font-bold text-gray-900">
          {currentSectorInfo.name} 분야 글로벌 자본 흐름 ({year}년)
        </h2>
        <p className="text-sm text-gray-600 text-center">
          색상 농도로 자본 총액 표시
        </p>
      </div>
      
    </div>
  )
}
