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

  // 모든 연도 데이터를 한 번에 로딩 (최적화된 버전)
  const loadAllYearData = async (sector: string, capitalTypes: string[]) => {
    console.log('🚀 Starting optimized bulk data loading...')
    const yearlyData: YearlyData = {}
    const totalYears = 2024 - 1970 + 1
    let processedYears = 0

    // 자본타입이 전체해제된 경우 빈 데이터 반환
    if (capitalTypes.length === 0) {
      console.log('🚫 No capital types selected, returning empty data for all years')
      for (let year = 1970; year <= 2024; year++) {
        yearlyData[year] = {}
      }
      return yearlyData
    }

    try {
      // 현재 연도 우선 로드
      console.log(`🎯 Priority loading current year ${year}...`)
      const currentYearData = await fetchYearData(sector, capitalTypes, year)
      yearlyData[year] = currentYearData
      processedYears++
      setLoadingProgress((processedYears / totalYears) * 100)

      // 최근 10년 데이터만 우선 로드 (성능 최적화)
      const recentYears = Array.from({ length: 10 }, (_, i) => 2024 - i).filter(y => y !== year)
      console.log(`📊 Loading recent years: ${recentYears.join(', ')}`)
      
      const recentPromises = recentYears.map(y => fetchYearData(sector, capitalTypes, y))
      const recentResults = await Promise.allSettled(recentPromises)
      
      recentResults.forEach((result, index) => {
        const currentYear = recentYears[index]
        if (result.status === 'fulfilled') {
          yearlyData[currentYear] = result.value
        } else {
          console.warn(`Failed year ${currentYear}, using empty data`)
          yearlyData[currentYear] = {}
        }
        processedYears++
        setLoadingProgress((processedYears / totalYears) * 100)
      })

      // 나머지 연도들을 백그라운드에서 로딩 (더 큰 배치로)
      setTimeout(async () => {
        console.log('🔄 Loading remaining years in background...')
        for (let startYear = 1970; startYear <= 2014; startYear += 10) {
          const endYear = Math.min(startYear + 9, 2014)
          const promises = []

          for (let y = startYear; y <= endYear; y++) {
            if (!yearlyData[y]) { // 이미 로드된 연도는 스킵
              promises.push(fetchYearData(sector, capitalTypes, y))
            }
          }

          if (promises.length > 0) {
            const results = await Promise.allSettled(promises)
            
            results.forEach((result, index) => {
              const currentYear = startYear + index
              if (result.status === 'fulfilled') {
                yearlyData[currentYear] = result.value
              } else {
                yearlyData[currentYear] = {}
              }
            })
          }
        }
        
        // 백그라운드 로딩 완료 후 상태 업데이트
        setAllYearlyData({ ...yearlyData })
        console.log('✅ Background loading completed!')
      }, 100)

      console.log('✅ Priority loading completed!', Object.keys(yearlyData).length, 'years loaded')
      return yearlyData
    } catch (error) {
      console.error('❌ Bulk loading failed:', error)
      return {}
    }
  }

  // 단일 연도 데이터 로딩
  const fetchYearData = async (sector: string, capitalTypes: string[], year: number) => {
    try {
      console.log(`🔍 Fetching data for year ${year}, sector: ${sector}, capitalTypes: ${capitalTypes.join(',')}`)
      
      const params = new URLSearchParams()
      if (sector) params.append('sector', sector)
      params.append('year', year.toString())
      
      // 자본타입이 전체해제된 경우 빈 결과 반환
      if (capitalTypes.length === 0) {
        console.log('🚫 No capital types, returning empty data')
        return {}
      }
      
      if (capitalTypes.length > 0) {
        capitalTypes.forEach(type => params.append('capital_types', type))
      }
      params.append('aggregate', 'true')
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5초 타임아웃으로 증가
      
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
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log(`📦 Response data:`, data)
      
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
        console.log(`✅ Processed ${Object.keys(processedData).length} countries with data`)
      } else {
        console.warn('⚠️ Invalid response structure:', data)
      }
      
      return processedData
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn(`⏱️ Timeout for year ${year}`)
      } else {
        console.error(`❌ Error loading year ${year}:`, error.message)
      }
      return {}
    }
  }

  // 현재 연도의 맵 데이터 생성
  const currentMapData = useMemo(() => {
    console.log('🗺️ Generating map data for:', { year, sector, capitalTypes: capitalTypes.length })
    
    if (!mapData) {
      console.log('❌ No map data available')
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
    console.log(`📊 Current year data:`, Object.keys(currentYearData).length, 'countries')
    
    const capitalValues = Object.values(currentYearData).filter(val => val > 0)
    console.log(`💰 Capital values:`, capitalValues.length, 'non-zero values')
    
    if (capitalValues.length === 0) {
      console.log('⚠️ No capital values found, showing empty map')
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
            capital_type_count: capitalTypes.length
          }
        }))
      }
    }

    // 더 드라마틱한 색상 분포를 위한 로그 스케일 적용
    const maxCapital = Math.max(...capitalValues)
    const minCapital = Math.min(...capitalValues)
    
    console.log(`📈 Capital range: ${minCapital.toLocaleString()} - ${maxCapital.toLocaleString()}`)
    
    // 로그 스케일로 변환하여 더 극적인 색상 변화 생성
    const logMax = Math.log10(maxCapital + 1)
    const logMin = Math.log10(minCapital + 1)
    const logRange = logMax - logMin

    const enrichedFeatures = mapData.features.map((feature: any) => {
      const countryCode = feature.id
      const countryName = feature.properties?.NAME || feature.properties?.name || countryCode
      const capitalAmount = currentYearData[countryCode] || 0
      
      let intensity = 0
      if (capitalAmount > 0 && logRange > 0) {
        const logValue = Math.log10(capitalAmount + 1)
        intensity = Math.min((logValue - logMin) / logRange, 1)
        
        // 더 극적인 색상 변화를 위해 강도 조정
        intensity = Math.pow(intensity, 0.7) // 제곱근을 적용하여 더 극적인 변화
      }
      
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

    console.log('✅ Map data generated successfully')
    return {
      type: 'FeatureCollection',
      features: enrichedFeatures
    }
  }, [mapData, allYearlyData, year, capitalTypes, sector])

  // 초기 로딩
  useEffect(() => {
    if (!isMounted) return

    const initializeData = async () => {
      console.log('🚀 Initializing map data...')
      setLoading(true)
      setInitialLoad(true)
      setAllYearlyData({}) // 기존 데이터 초기화

      try {
        // 1. GeoJSON 로딩
        console.log('📍 Loading GeoJSON...')
        const geoResponse = await fetch('/world-countries-detailed.json')
        if (!geoResponse.ok) {
          throw new Error(`Failed to load GeoJSON: ${geoResponse.status}`)
        }
        const worldData = await geoResponse.json()
        setMapData(worldData)
        console.log('✅ GeoJSON loaded successfully')

        // 2. 모든 연도 데이터 로딩
        console.log('📊 Loading yearly data...')
        const yearlyData = await loadAllYearData(sector, capitalTypes)
        setAllYearlyData(yearlyData)
        console.log('✅ Yearly data loaded successfully')

      } catch (error) {
        console.error('❌ Failed to initialize data:', error)
        // 에러 발생 시에도 기본 상태로 설정
        setAllYearlyData({})
      } finally {
        setLoading(false)
        setInitialLoad(false)
        setLoadingProgress(0)
      }
    }

    initializeData()
  }, [sector, capitalTypes])

  // 데이터 변경 시 (연도는 제외) - 최적화된 디바운싱 적용
  useEffect(() => {
    if (initialLoad || !isMounted) return

    // 디바운싱을 위한 타이머
    const updateTimer = setTimeout(() => {
      const updateData = async () => {
        console.log('🔄 Updating data for:', { sector, capitalTypes, year })
        setLoading(true)
        
        // 자본타입이 변경되면 캐시 무효화
        if (capitalTypes.length === 0) {
          // 전체해제 시 즉시 빈 데이터로 설정
          const emptyYearlyData: YearlyData = {}
          for (let year = 1970; year <= 2024; year++) {
            emptyYearlyData[year] = {}
          }
          setAllYearlyData(emptyYearlyData)
          setLoading(false)
          return
        }
        
        try {
          // 현재 연도 데이터만 우선 로드 (빠른 응답)
          console.log(`🎯 Quick loading current year ${year}...`)
          const currentYearData = await fetchYearData(sector, capitalTypes, year)
          console.log('📊 Current year data loaded:', Object.keys(currentYearData).length, 'countries')
          
          // 현재 연도 데이터가 있으면 즉시 표시
          if (Object.keys(currentYearData).length > 0) {
            const quickYearlyData = { ...allYearlyData, [year]: currentYearData }
            setAllYearlyData(quickYearlyData)
            setLoading(false)
          } else {
            console.warn('⚠️ No data found for current year, checking other years...')
            // 최근 5년 데이터 확인
            const recentYears = Array.from({ length: 5 }, (_, i) => 2024 - i)
            const recentPromises = recentYears.map(y => fetchYearData(sector, capitalTypes, y))
            const recentResults = await Promise.allSettled(recentPromises)
            
            let foundData = false
            recentResults.forEach((result, index) => {
              if (result.status === 'fulfilled' && Object.keys(result.value).length > 0) {
                const foundYear = recentYears[index]
                console.log(`✅ Found data for year ${foundYear}`)
                const quickYearlyData = { ...allYearlyData, [foundYear]: result.value }
                setAllYearlyData(quickYearlyData)
                foundData = true
              }
            })
            
            if (!foundData) {
              console.warn('⚠️ No data found in recent years')
            }
            setLoading(false)
          }
          
          // 백그라운드에서 전체 데이터 로드
          setTimeout(async () => {
            try {
              console.log('🔄 Loading full dataset in background...')
              const fullYearlyData = await loadAllYearData(sector, capitalTypes)
              console.log('✅ Full yearly data loaded:', Object.keys(fullYearlyData).length, 'years')
              setAllYearlyData(fullYearlyData)
            } catch (error) {
              console.error('❌ Background loading failed:', error)
            }
          }, 200)
        } catch (error) {
          console.error('❌ Data update failed:', error)
          setLoading(false)
        }
      }

      updateData()
    }, 300) // 300ms 디바운싱으로 증가

    return () => clearTimeout(updateTimer)
  }, [sector, capitalTypes, isMounted, initialLoad, year])

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
    if (intensity === 0) return '#f8fafc' // 더 밝은 회색

    // 더 드라마틱한 색상 범위 적용
    if (sector === 'BIO') {
      if (intensity >= 0.9) return '#064e3b' // 매우 어두운 녹색
      if (intensity >= 0.7) return '#065f46' // 어두운 녹색
      if (intensity >= 0.5) return '#047857' // 중간 어두운 녹색
      if (intensity >= 0.3) return '#059669' // 중간 녹색
      if (intensity >= 0.1) return '#10b981' // 밝은 녹색
      return '#6ee7b7' // 매우 밝은 녹색
    } else if (sector === 'AI') {
      if (intensity >= 0.9) return '#1e1b4b' // 매우 어두운 보라색
      if (intensity >= 0.7) return '#312e81' // 어두운 보라색
      if (intensity >= 0.5) return '#4338ca' // 중간 어두운 보라색
      if (intensity >= 0.3) return '#6366f1' // 중간 보라색
      if (intensity >= 0.1) return '#8b5cf6' // 밝은 보라색
      return '#c4b5fd' // 매우 밝은 보라색
    } else if (sector === 'SEMICONDUCTOR') {
      if (intensity >= 0.9) return '#7c2d12' // 매우 어두운 주황색
      if (intensity >= 0.7) return '#c2410c' // 어두운 주황색
      if (intensity >= 0.5) return '#ea580c' // 중간 어두운 주황색
      if (intensity >= 0.3) return '#f97316' // 중간 주황색
      if (intensity >= 0.1) return '#fb923c' // 밝은 주황색
      return '#fed7aa' // 매우 밝은 주황색
    } else if (sector === 'ENERGY') {
      if (intensity >= 0.9) return '#92400e' // 매우 어두운 노란색
      if (intensity >= 0.7) return '#d97706' // 어두운 노란색
      if (intensity >= 0.5) return '#f59e0b' // 중간 어두운 노란색
      if (intensity >= 0.3) return '#fbbf24' // 중간 노란색
      if (intensity >= 0.1) return '#fcd34d' // 밝은 노란색
      return '#fef3c7' // 매우 밝은 노란색
    } else if (sector === 'FINTECH') {
      if (intensity >= 0.9) return '#991b1b' // 매우 어두운 빨간색
      if (intensity >= 0.7) return '#dc2626' // 어두운 빨간색
      if (intensity >= 0.5) return '#ef4444' // 중간 어두운 빨간색
      if (intensity >= 0.3) return '#f87171' // 중간 빨간색
      if (intensity >= 0.1) return '#fca5a5' // 밝은 빨간색
      return '#fecaca' // 매우 밝은 빨간색
    } else if (sector === 'AUTOMOTIVE') {
      if (intensity >= 0.9) return '#0f766e' // 매우 어두운 청록색
      if (intensity >= 0.7) return '#0d9488' // 어두운 청록색
      if (intensity >= 0.5) return '#14b8a6' // 중간 어두운 청록색
      if (intensity >= 0.3) return '#2dd4bf' // 중간 청록색
      if (intensity >= 0.1) return '#5eead4' // 밝은 청록색
      return '#a7f3d0' // 매우 밝은 청록색
    } else if (sector === 'AEROSPACE') {
      if (intensity >= 0.9) return '#581c87' // 매우 어두운 보라색
      if (intensity >= 0.7) return '#7c3aed' // 어두운 보라색
      if (intensity >= 0.5) return '#8b5cf6' // 중간 어두운 보라색
      if (intensity >= 0.3) return '#a78bfa' // 중간 보라색
      if (intensity >= 0.1) return '#c4b5fd' // 밝은 보라색
      return '#e0e7ff' // 매우 밝은 보라색
    } else if (sector === 'TELECOM') {
      if (intensity >= 0.9) return '#be185d' // 매우 어두운 핑크색
      if (intensity >= 0.7) return '#e11d48' // 어두운 핑크색
      if (intensity >= 0.5) return '#f43f5e' // 중간 어두운 핑크색
      if (intensity >= 0.3) return '#fb7185' // 중간 핑크색
      if (intensity >= 0.1) return '#fda4af' // 밝은 핑크색
      return '#fecdd3' // 매우 밝은 핑크색
    } else if (sector === 'REALESTATE') {
      if (intensity >= 0.9) return '#78350f' // 매우 어두운 갈색
      if (intensity >= 0.7) return '#a16207' // 어두운 갈색
      if (intensity >= 0.5) return '#ca8a04' // 중간 어두운 갈색
      if (intensity >= 0.3) return '#eab308' // 중간 갈색
      if (intensity >= 0.1) return '#facc15' // 밝은 갈색
      return '#fef08a' // 매우 밝은 갈색
    } else if (sector === 'AGRICULTURE') {
      if (intensity >= 0.9) return '#365314' // 매우 어두운 녹색
      if (intensity >= 0.7) return '#4d7c0f' // 어두운 녹색
      if (intensity >= 0.5) return '#65a30d' // 중간 어두운 녹색
      if (intensity >= 0.3) return '#84cc16' // 중간 녹색
      if (intensity >= 0.1) return '#a3e635' // 밝은 녹색
      return '#d9f99d' // 매우 밝은 녹색
    }
    
    // 기본 색상 (전체 분야)
    if (intensity >= 0.9) return '#1e3a8a' // 매우 어두운 파란색
    if (intensity >= 0.7) return '#1e40af' // 어두운 파란색
    if (intensity >= 0.5) return '#2563eb' // 중간 어두운 파란색
    if (intensity >= 0.3) return '#3b82f6' // 중간 파란색
    if (intensity >= 0.1) return '#60a5fa' // 밝은 파란색
    return '#93c5fd' // 매우 밝은 파란색
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
