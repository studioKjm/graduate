'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'

interface OptimizedSectorBasedMapProps {
  year?: number
  sector?: string
  capitalTypes?: string[]
  visualizationType?: 'choropleth' | 'flow' | 'both'
}

interface CapitalFlowData {
  country: string
  sector: string
  capital_type: string
  year: number
  final_amount_usd: number
}

// 전역 캐시 시스템
class DataCache {
  private static instance: DataCache
  private geoCache: Map<string, any> = new Map()
  private apiCache: Map<string, CapitalFlowData[]> = new Map()
  private cacheTimestamps: Map<string, number> = new Map()
  private readonly CACHE_EXPIRY = 5 * 60 * 1000 // 5분

  static getInstance(): DataCache {
    if (!DataCache.instance) {
      DataCache.instance = new DataCache()
    }
    return DataCache.instance
  }

  private isExpired(key: string): boolean {
    const timestamp = this.cacheTimestamps.get(key)
    if (!timestamp) return true
    return Date.now() - timestamp > this.CACHE_EXPIRY
  }

  setGeoData(data: any): void {
    this.geoCache.set('world-geo', data)
    this.cacheTimestamps.set('world-geo', Date.now())
  }

  getGeoData(): any | null {
    if (this.isExpired('world-geo')) return null
    return this.geoCache.get('world-geo') || null
  }

  setApiData(key: string, data: CapitalFlowData[]): void {
    this.apiCache.set(key, data)
    this.cacheTimestamps.set(key, Date.now())
  }

  getApiData(key: string): CapitalFlowData[] | null {
    if (this.isExpired(key)) return null
    return this.apiCache.get(key) || null
  }

  // 배치로 여러 연도 데이터 미리 로드
  async preloadYearRange(sector: string, capitalTypes: string[], startYear: number, endYear: number): Promise<void> {
    const promises = []
    for (let year = startYear; year <= endYear; year++) {
      const cacheKey = `${sector}-${capitalTypes.join(',')}-${year}`
      if (!this.getApiData(cacheKey)) {
        promises.push(this.fetchSingleYear(sector, capitalTypes, year, cacheKey))
      }
    }
    await Promise.all(promises)
  }

  private async fetchSingleYear(sector: string, capitalTypes: string[], year: number, cacheKey: string): Promise<void> {
    try {
      const params = new URLSearchParams()
      if (sector) params.append('sector', sector)
      params.append('year', year.toString())
      if (capitalTypes.length > 0) {
        capitalTypes.forEach(type => params.append('capital_types', type))
      }
      params.append('aggregate', 'true')
      
      const response = await fetch(`http://localhost:8001/api/v1/capitalflows/capitalflows/?${params}`)
      if (response.ok) {
        const data = await response.json()
        this.setApiData(cacheKey, data.results || [])
      }
    } catch (error) {
      console.warn(`Failed to preload data for ${year}:`, error)
    }
  }
}

export default function OptimizedSectorBasedMap({
  year = 2023,
  sector = '',
  capitalTypes = [],
  visualizationType = 'choropleth'
}: OptimizedSectorBasedMapProps) {
  const [mapData, setMapData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [hoveredCountry, setHoveredCountry] = useState<any>(null)
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isMounted, setIsMounted] = useState(false)
  const [preloadProgress, setPreloadProgress] = useState<number>(0)

  const cache = DataCache.getInstance()

  // 최적화된 API 데이터 호출 함수
  const fetchCapitalFlowData = useCallback(async (sector: string, capitalTypes: string[], year: number): Promise<CapitalFlowData[]> => {
    const cacheKey = `${sector}-${capitalTypes.join(',')}-${year}`
    
    // 캐시에서 먼저 확인
    const cachedData = cache.getApiData(cacheKey)
    if (cachedData) {
      console.log(`✅ Cache hit for ${year}`)
      return cachedData
    }

    console.log(`🔄 API call for ${year}`)
    try {
      const params = new URLSearchParams()
      if (sector) params.append('sector', sector)
      params.append('year', year.toString())
      if (capitalTypes.length > 0) {
        capitalTypes.forEach(type => params.append('capital_types', type))
      }
      params.append('aggregate', 'true')
      
      const response = await fetch(`http://localhost:8001/api/v1/capitalflows/capitalflows/?${params}`)
      
      if (!response.ok) {
        console.warn('API 호출 실패, 빈 배열 반환')
        return []
      }

      const data = await response.json()
      const results = data.results || []
      
      // 캐시에 저장
      cache.setApiData(cacheKey, results)
      
      return results
    } catch (error) {
      console.error('API 호출 중 오류:', error)
      return []
    }
  }, [cache])

  // GeoJSON 데이터 로드 (한 번만)
  const loadGeoData = useCallback(async () => {
    let geoData = cache.getGeoData()
    
    if (!geoData) {
      console.log('🔄 Loading GeoJSON data')
      const geoResponse = await fetch('/world-countries-detailed.json')
      geoData = await geoResponse.json()
      cache.setGeoData(geoData)
    } else {
      console.log('✅ GeoJSON cache hit')
    }
    
    return geoData
  }, [cache])

  // 배치 데이터 미리 로드
  const preloadAdjacentYears = useCallback(async () => {
    if (!sector) return

    const currentYear = year
    const yearRange = 5 // 현재 연도 ±5년
    const startYear = Math.max(1970, currentYear - yearRange)
    const endYear = Math.min(2024, currentYear + yearRange)
    
    console.log(`🚀 Preloading data for ${startYear}-${endYear}`)
    
    let loaded = 0
    const total = endYear - startYear + 1
    
    for (let y = startYear; y <= endYear; y++) {
      const cacheKey = `${sector}-${capitalTypes.join(',')}-${y}`
      if (!cache.getApiData(cacheKey)) {
        await fetchCapitalFlowData(sector, capitalTypes, y)
      }
      loaded++
      setPreloadProgress((loaded / total) * 100)
    }
    
    console.log('✅ Preloading completed')
    setTimeout(() => setPreloadProgress(0), 1000) // 진행률 숨기기
  }, [sector, capitalTypes, year, fetchCapitalFlowData, cache])

  // API 데이터를 기존 형식으로 변환
  const processApiData = useCallback((apiData: CapitalFlowData[]) => {
    const processed: { [country: string]: number } = {}
    
    apiData.forEach(item => {
      const country = item.country
      const amount = item.final_amount_usd || 0
      if (!processed[country]) {
        processed[country] = 0
      }
      processed[country] += amount
    })
    
    return processed
  }, [])

  // 메인 데이터 로딩
  useEffect(() => {
    if (!isMounted) return
    
    const loadData = async () => {
      setLoading(true)
      try {
        // 1. GeoJSON 로드 (캐시됨)
        const worldData = await loadGeoData()
        
        // 2. 현재 연도 데이터 로드
        const apiData = await fetchCapitalFlowData(sector, capitalTypes, year)
        const apiProcessedData = processApiData(apiData)
        
        // 3. 지도 데이터 결합
        let aggregatedData: { [country: string]: number } = {}
        
        if (Object.keys(apiProcessedData).length > 0) {
          aggregatedData = apiProcessedData
          console.log('✅ Using API data')
        } else {
          // Fallback 더미 데이터 (기존 로직 유지)
          const dummyData = getDummyData(sector, capitalTypes)
          aggregatedData = dummyData
          console.log('⚠️ Using fallback dummy data')
        }

        const maxCapital = Math.max(...Object.values(aggregatedData), 1)
        
        const enrichedFeatures = worldData.features.map((feature: any) => {
          const countryCode = feature.id
          const countryName = feature.properties?.NAME || feature.properties?.name || countryCode
          const capitalAmount = aggregatedData[countryCode] || 0
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

        setMapData({ 
          type: 'FeatureCollection', 
          features: enrichedFeatures 
        })
        
        // 4. 인접 연도 데이터 미리 로드 (백그라운드)
        setTimeout(() => preloadAdjacentYears(), 100)
        
      } catch (error) {
        console.error('데이터 로딩 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [isMounted, sector, capitalTypes, year, loadGeoData, fetchCapitalFlowData, processApiData, preloadAdjacentYears])

  // 클라이언트 마운트 감지
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 더미 데이터 함수 (기존 fallback 로직)
  const getDummyData = (sector: string, capitalTypes: string[]) => {
    const dummyCapitalData: { [sector: string]: { [capitalType: string]: { [country: string]: number } } } = {
      'BIO': {
        'FDI': { 'USA': 600000, 'CHE': 200000, 'DEU': 150000, 'GBR': 200000, 'JPN': 180000, 'FRA': 150000, 'CAN': 120000, 'DNK': 80000, 'SWE': 80000, 'KOR': 30000 },
        'VC': { 'USA': 600000, 'CHE': 200000, 'DEU': 150000, 'GBR': 200000, 'JPN': 180000, 'FRA': 150000, 'CAN': 120000, 'DNK': 80000, 'SWE': 80000, 'KOR': 30000 },
        'MA': { 'USA': 600000, 'CHE': 200000, 'DEU': 150000, 'GBR': 200000, 'JPN': 180000, 'FRA': 150000, 'CAN': 120000, 'DNK': 80000, 'SWE': 80000, 'KOR': 30000 },
        'IPO': { 'USA': 600000, 'CHE': 200000, 'DEU': 150000, 'GBR': 200000, 'JPN': 180000, 'FRA': 150000, 'CAN': 120000, 'DNK': 80000, 'SWE': 80000, 'KOR': 30000 }
      }
    }

    const sectorData = dummyCapitalData[sector] || dummyCapitalData['BIO']
    const aggregated: { [country: string]: number } = {}

    if (capitalTypes.length === 0) {
      // 모든 자본 타입 합산
      Object.values(sectorData).forEach(typeData => {
        Object.entries(typeData).forEach(([country, amount]) => {
          aggregated[country] = (aggregated[country] || 0) + amount
        })
      })
    } else {
      // 선택된 자본 타입만 합산
      capitalTypes.forEach(type => {
        const typeData = sectorData[type] || {}
        Object.entries(typeData).forEach(([country, amount]) => {
          aggregated[country] = (aggregated[country] || 0) + amount
        })
      })
    }

    return aggregated
  }

  // 색상 계산 함수들 (기존 로직 유지)
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

    // 각 분야별 색상 적용
    if (sector === 'AI') {
      if (intensity >= 0.8) return '#1e3a8a'
      if (intensity >= 0.6) return '#1e40af'
      if (intensity >= 0.4) return '#3b82f6'
      if (intensity >= 0.2) return '#60a5fa'
      return '#93c5fd'
    } else if (sector === 'BIO') {
      if (intensity >= 0.8) return '#14532d'
      if (intensity >= 0.6) return '#166534'
      if (intensity >= 0.4) return '#22c55e'
      if (intensity >= 0.2) return '#4ade80'
      return '#86efac'
    } else if (sector === 'SEMICONDUCTOR') {
      if (intensity >= 0.8) return '#581c87'
      if (intensity >= 0.6) return '#7c3aed'
      if (intensity >= 0.4) return '#a855f7'
      if (intensity >= 0.2) return '#c084fc'
      return '#ddd6fe'
    } else if (sector === 'ENERGY') {
      if (intensity >= 0.8) return '#a16207'
      if (intensity >= 0.6) return '#ca8a04'
      if (intensity >= 0.4) return '#eab308'
      if (intensity >= 0.2) return '#facc15'
      return '#fde047'
    } else if (sector === 'FINTECH') {
      if (intensity >= 0.8) return '#991b1b'
      if (intensity >= 0.6) return '#dc2626'
      if (intensity >= 0.4) return '#ef4444'
      if (intensity >= 0.2) return '#f87171'
      return '#fca5a5'
    } else if (sector === 'AUTOMOTIVE') {
      if (intensity >= 0.8) return '#0f766e'
      if (intensity >= 0.6) return '#0d9488'
      if (intensity >= 0.4) return '#14b8a6'
      if (intensity >= 0.2) return '#5eead4'
      return '#a7f3d0'
    } else if (sector === 'AEROSPACE') {
      if (intensity >= 0.8) return '#3730a3'
      if (intensity >= 0.6) return '#4338ca'
      if (intensity >= 0.4) return '#6366f1'
      if (intensity >= 0.2) return '#818cf8'
      return '#c7d2fe'
    } else if (sector === 'TELECOM') {
      if (intensity >= 0.8) return '#be185d'
      if (intensity >= 0.6) return '#db2777'
      if (intensity >= 0.4) return '#ec4899'
      if (intensity >= 0.2) return '#f472b6'
      return '#fbcfe8'
    } else if (sector === 'REALESTATE') {
      if (intensity >= 0.8) return '#78350f'
      if (intensity >= 0.6) return '#92400e'
      if (intensity >= 0.4) return '#b45309'
      if (intensity >= 0.2) return '#d97706'
      return '#fbbf24'
    } else if (sector === 'AGRICULTURE') {
      if (intensity >= 0.8) return '#052e16'
      if (intensity >= 0.6) return '#064e3b'
      if (intensity >= 0.4) return '#047857'
      if (intensity >= 0.2) return '#10b981'
      return '#6ee7b7'
    } else {
      // 전체 분야 (기본 파란색)
      if (intensity >= 0.8) return '#1e3a8a'
      if (intensity >= 0.6) return '#1e40af'
      if (intensity >= 0.4) return '#3b82f6'
      if (intensity >= 0.2) return '#60a5fa'
      return '#93c5fd'
    }
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
          {preloadProgress > 0 ? '데이터 최적화 중...' : '분야별 자본 흐름 지도 로딩 중...'}
        </div>
        {preloadProgress > 0 && (
          <div className="w-64 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${preloadProgress}%` }}
            />
          </div>
        )}
      </div>
    )
  }

  if (!mapData) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-red-600">지도 데이터를 불러올 수 없습니다.</div>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative bg-blue-50">
      {/* 성능 최적화 표시 */}
      {preloadProgress > 0 && (
        <div className="absolute top-4 right-4 z-20 bg-white px-3 py-2 rounded-lg shadow-md">
          <div className="text-xs text-gray-600 mb-1">성능 최적화 중...</div>
          <div className="w-32 bg-gray-200 rounded-full h-1">
            <div 
              className="bg-green-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${preloadProgress}%` }}
            />
          </div>
        </div>
      )}

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
        {mapData.features.map((feature: any, index: number) => {
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
                  transition: 'all 0.2s ease'
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
                    transition: 'all 0.2s ease'
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
