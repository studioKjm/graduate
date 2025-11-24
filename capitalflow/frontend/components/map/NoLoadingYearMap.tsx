'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { formatNumberBoth } from '@/utils/formatters'
import apiClient from '@/lib/api-client'

interface NoLoadingYearMapProps {
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

export default function NoLoadingYearMap({
  year = 2024,
  sector = '',
  capitalTypes = [],
  visualizationType = 'choropleth',
  onDataChange
}: NoLoadingYearMapProps) {
  const [mapData, setMapData] = useState<any>(null)
  const [allYearlyData, setAllYearlyData] = useState<YearlyData>({})
  // 브라우저 환경에서는 즉시 true로 설정하여 초기화가 바로 시작되도록 함
  const [isMounted, setIsMounted] = useState(typeof window !== 'undefined')
  const [hoveredCountry, setHoveredCountry] = useState<any>(null)
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const prevCapitalTypesRef = useRef<string[]>(capitalTypes)
  const initializationInProgressRef = useRef(false) // 초기화가 진행 중인지 추적 (비동기 작업 중복 방지)

  // 단일 연도 데이터 로딩
  const fetchYearData = async (sector: string, capitalTypes: string[], year: number) => {
    try {
      console.log(`🔍 Fetching data for year ${year}, sector: ${sector}, capitalTypes: ${capitalTypes.join(',')}`)
      
      // 자본타입이 전체해제된 경우 빈 결과 반환
      if (capitalTypes.length === 0) {
        console.log('🚫 No capital types selected, returning empty data')
        return {}
      }

      // API 클라이언트를 사용하여 요청
      const params = new URLSearchParams()
      if (sector) params.append('sector', sector)
      params.append('year', year.toString())
      // capital_types는 배열로 전달 (백엔드에서 getlist로 받음)
        capitalTypes.forEach(type => params.append('capital_types', type))
      
      const url = `/api/v1/visualization/map-data/?${params.toString()}`
      console.log(`🌐 [API] Fetching from: ${url}`)
      console.log(`🌐 [API] Full URL will be: ${apiClient['baseURL']}${url}`)
      console.log(`🌐 [API] Parameters:`, { year, sector, capitalTypes })
      
      // 실제 데이터만 사용하므로 재시도 로직 제거 (더미 데이터 방지)
      // 백엔드 서버가 없으면 즉시 실패하여 에러 메시지 표시
      let data
      try {
        data = await apiClient.get(url)
        console.log(`📦 [API] Response received for year ${year}:`, {
          success: data?.success,
          hasData: !!data?.data,
          hasCountries: !!(data?.data && data?.data.countries),
          countriesCount: data?.data?.countries?.length || 0,
          sampleCountry: data?.data?.countries?.[0],
          fullResponse: data
      })
      } catch (apiError: any) {
        console.error(`❌ [API] Request failed for year ${year}:`, {
          error: apiError.message,
          errorType: apiError.name,
          url: url,
          stack: apiError.stack
        })
        throw apiError
      }
      
      const processedData: { [countryCode: string]: number } = {}
      
      // API 응답 구조 확인 및 처리
      // 백엔드가 success: false를 반환하더라도 data 필드가 있으면 처리
      if (data && data.data && data.data.countries && Array.isArray(data.data.countries)) {
        data.data.countries.forEach((country: any) => {
          if (country.code && country.total_amount !== undefined) {
            const amount = parseFloat(country.total_amount) || 0
            if (amount > 0) {
              processedData[country.code] = amount
            }
          }
        })
        console.log(`✅ [API] Processed ${Object.keys(processedData).length} countries with data for year ${year}`)
      } else {
        // 데이터가 없거나 구조가 다른 경우
        console.warn(`⚠️ [API] No data or invalid structure for year ${year}:`, {
          success: data?.success,
          message: data?.message,
          hasData: !!data?.data,
          hasCountries: !!(data?.data && data?.data.countries)
        })
      }
      
      // 데이터가 있어도 없어도 processedData 반환 (빈 객체일 수 있음)
      return processedData
    } catch (error: any) {
      const errorMessage = error.message || String(error)
      console.error(`❌ Error loading year ${year}:`, errorMessage)
      
      // 네트워크 에러인 경우 사용자에게 알림
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError') || errorMessage.includes('timeout')) {
        setError(`백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요. (연도: ${year})`)
      }
      
      // 에러 발생 시 null 반환 (더미 데이터 방지)
      // 실제 데이터만 사용하므로 에러 시 데이터 없음
      return null
    }
  }

  // 현재 연도의 맵 데이터 생성
  // mapData가 로드되기 전에는 실행되지 않도록 보호
  const currentMapData = useMemo(() => {
    // mapData가 없거나 초기화가 완료되지 않았으면 즉시 null 반환 (로딩 중)
    if (!mapData || isLoading) {
      return null
    }
    
    console.log('🗺️ [RENDER] Generating map data for:', { 
      year, 
      sector, 
      capitalTypes: capitalTypes.length,
      hasMapData: !!mapData,
      hasYearlyData: Object.keys(allYearlyData).length > 0,
      isLoading
    })

    // 자본타입이 전체해제된 경우 시각적으로만 0으로 표시 (데이터는 유지)
    if (capitalTypes.length === 0) {
      console.log('🚫 No capital types selected, showing empty map visually')
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

    // 현재 연도 데이터 확인
    const currentYearData = allYearlyData[year]
    
    console.log(`🗺️ Processing year ${year} data:`, {
      availableYears: Object.keys(allYearlyData),
      currentYearData: currentYearData ? Object.keys(currentYearData).length : 0,
      allYearlyDataKeys: Object.keys(allYearlyData),
      year1995Exists: !!allYearlyData[1995],
      year1995Data: allYearlyData[1995] ? Object.keys(allYearlyData[1995]).length : 0,
      year2000Exists: !!allYearlyData[2000],
      year2000Data: allYearlyData[2000] ? Object.keys(allYearlyData[2000]).length : 0,
      year2008Exists: !!allYearlyData[2008],
      year2008Data: allYearlyData[2008] ? Object.keys(allYearlyData[2008]).length : 0,
      year2010Exists: !!allYearlyData[2010],
      year2010Data: allYearlyData[2010] ? Object.keys(allYearlyData[2010]).length : 0,
      currentYearDataType: typeof currentYearData,
      currentYearDataIsArray: Array.isArray(currentYearData),
      currentYearDataIsObject: currentYearData && typeof currentYearData === 'object'
    })
    
    // 현재 연도 데이터가 없으면 빈 지도 표시 (GeoJSON은 있으므로 지도는 표시)
    if (!currentYearData || Object.keys(currentYearData).length === 0) {
      console.log(`⚠️ No data for year ${year}, showing empty map (GeoJSON available)`)
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
            selected_capital_types: capitalTypes.length > 0 ? capitalTypes.join(', ') : '전체',
            capital_type_count: capitalTypes.length || 1
          }
        }))
      }
    }

    // 안전한 데이터 처리
    const capitalValues = currentYearData ? Object.values(currentYearData).filter(val => val > 0) : []
    console.log(`💰 Capital values for year ${year}:`, capitalValues.length, 'non-zero values', {
      hasCurrentYearData: !!currentYearData,
      currentYearDataKeys: currentYearData ? Object.keys(currentYearData) : [],
      sampleValues: capitalValues.slice(0, 5)
    })
    
    // 실제 자본 값이 없으면 빈 지도 표시 (GeoJSON은 있으므로 지도는 표시)
    if (capitalValues.length === 0) {
      console.log('⚠️ No capital values found, showing empty map (GeoJSON available)')
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
            selected_capital_types: capitalTypes.length > 0 ? capitalTypes.join(', ') : '전체',
            capital_type_count: capitalTypes.length || 1
          }
        }))
      }
    }

    // 더 드라마틱한 색상 분포를 위한 로그 스케일 적용
    const maxCapital = Math.max(...capitalValues)
    const minCapital = Math.min(...capitalValues)
    
    console.log(`📈 Capital range for year ${year}: ${minCapital.toLocaleString()} - ${maxCapital.toLocaleString()}`)
    
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

    console.log('✅ [RENDER] Map data generated successfully for year', year)
    return {
      type: 'FeatureCollection',
      features: enrichedFeatures
    }
  }, [mapData, allYearlyData, year, capitalTypes, sector, isLoading]) // isLoading 추가하여 로딩 중에는 재계산 방지

  // 분야나 자본타입 변경 시 데이터 재로딩
  useEffect(() => {
    if (typeof window === 'undefined' || !isMounted) return

    const updateTimer = setTimeout(async () => {
      const prevCapitalTypes = prevCapitalTypesRef.current
      const hasCapitalTypesChanged = JSON.stringify(prevCapitalTypes) !== JSON.stringify(capitalTypes)
      
      // 자본타입이 전체해제된 경우 데이터를 지우지 않고 그대로 유지
      if (capitalTypes.length === 0) {
        prevCapitalTypesRef.current = capitalTypes
        return
      }
      
      // 자본타입이 다시 선택된 경우 데이터를 다시 로딩
      if (hasCapitalTypesChanged) {
        console.log('🔄 [UPDATE] Capital types changed, reloading data...')
        
        try {
          const allYears = Array.from({ length: 30 }, (_, i) => 1995 + i)
        const promises = allYears.map(y => fetchYearData(sector, capitalTypes, y))
        const results = await Promise.allSettled(promises)
        
          const yearlyData: YearlyData = {}
          results.forEach((result, index) => {
            const currentYear = allYears[index]
            if (result.status === 'fulfilled' && result.value !== null && typeof result.value === 'object') {
              // 실제 데이터만 저장 (null이 아닌 경우)
              yearlyData[currentYear] = result.value
            }
            // 에러 발생 시 데이터 저장하지 않음 (더미 데이터 방지)
          })
        
        setAllYearlyData(yearlyData)
          console.log('✅ [UPDATE] Data updated for sector/capital type change')
      } catch (error) {
          console.error('❌ [UPDATE] Data update failed:', error)
        }
      }
      
      prevCapitalTypesRef.current = capitalTypes
    }, 200)

    return () => clearTimeout(updateTimer)
  }, [sector, capitalTypes, isMounted])

  // 분야나 자본타입 변경 시 (디바운싱 적용)
  useEffect(() => {
    if (typeof window === 'undefined' || !isMounted) return

    const updateTimer = setTimeout(async () => {
      const prevCapitalTypes = prevCapitalTypesRef.current
      const hasCapitalTypesChanged = JSON.stringify(prevCapitalTypes) !== JSON.stringify(capitalTypes)
      
      console.log('🔄 Updating data for sector/capital type change:', { 
        sector, 
        capitalTypes, 
        prevCapitalTypes,
        hasCapitalTypesChanged,
        currentDataYears: Object.keys(allYearlyData).length
      })
      
      // 자본타입이 전체해제된 경우 데이터를 지우지 않고 그대로 유지
      if (capitalTypes.length === 0) {
        console.log('🚫 No capital types selected, keeping existing data', {
          existingYears: Object.keys(allYearlyData).length,
          sampleYear: Object.keys(allYearlyData)[0]
        })
        prevCapitalTypesRef.current = capitalTypes
        return
      }
      
      // 자본타입이 다시 선택된 경우 데이터를 다시 로딩
      if (hasCapitalTypesChanged) {
        console.log('🔄 Capital types changed, reloading data...', {
          from: prevCapitalTypes,
          to: capitalTypes
        })
        
        try {
          // 모든 연도 데이터를 다시 로딩
          const allYears = Array.from({ length: 30 }, (_, i) => 1995 + i) // 1995-2024
          console.log('📅 Reloading years:', allYears.slice(0, 5), '...', allYears.slice(-5))
          
          const promises = allYears.map(y => fetchYearData(sector, capitalTypes, y))
          const results = await Promise.allSettled(promises)
          
          const yearlyData: YearlyData = {}
          results.forEach((result, index) => {
            const currentYear = allYears[index]
            if (result.status === 'fulfilled' && result.value !== null && typeof result.value === 'object') {
              // 실제 데이터만 저장
              yearlyData[currentYear] = result.value
              const dataCount = Object.keys(result.value).length
              console.log(`✅ Year ${currentYear} data reloaded: ${dataCount} countries`)
            } else if (result.status === 'rejected') {
              console.warn(`⚠️ Failed to reload year ${currentYear}:`, result.reason)
              // 에러 발생 시 데이터 저장하지 않음 (더미 데이터 방지)
            } else {
              console.warn(`⚠️ Year ${currentYear} returned null (no data)`)
              // null 데이터는 저장하지 않음 (더미 데이터 방지)
            }
          })
          
          setAllYearlyData(yearlyData)
          console.log('✅ Data updated for sector/capital type change', {
            totalYears: Object.keys(yearlyData).length,
            year1995Data: yearlyData[1995] ? Object.keys(yearlyData[1995]).length : 0,
            year2008Data: yearlyData[2008] ? Object.keys(yearlyData[2008]).length : 0,
            year2020Data: yearlyData[2020] ? Object.keys(yearlyData[2020]).length : 0,
            sampleYearData: yearlyData[2020] ? Object.keys(yearlyData[2020]).slice(0, 3) : []
          })
          
          // 데이터 업데이트 후 상태 확인
          setTimeout(() => {
            console.log('🔍 Data state after update:', {
              allYearlyDataKeys: Object.keys(allYearlyData),
              year2020Exists: !!allYearlyData[2020],
              year2020Data: allYearlyData[2020] ? Object.keys(allYearlyData[2020]).length : 0
            })
          }, 100)
        } catch (error) {
          console.error('❌ Data update failed:', error)
          setAllYearlyData({})
        }
      }
      
      // 이전 상태 업데이트
      prevCapitalTypesRef.current = capitalTypes
    }, 200) // 200ms 디바운싱

    return () => clearTimeout(updateTimer)
  }, [sector, capitalTypes])

  // 클라이언트 마운트 및 초기화 - 한 번에 처리
  // 빈 의존성 배열로 마운트 시 한 번만 실행되도록 보장
  useEffect(() => {
    // 브라우저 환경에서만 실행
    if (typeof window === 'undefined') {
      return
    }
    
    // 이미 초기화가 진행 중이면 중복 실행 방지
    // 새로고침 시 컴포넌트가 완전히 새로 생성되므로 ref도 초기화됨
    if (initializationInProgressRef.current) {
      console.log('⏸️ [MOUNT] 초기화가 이미 진행 중, 중복 실행 방지')
      return
    }
    
    console.log('🔧 [MOUNT] 컴포넌트 마운트 시작 - 즉시 초기화 시작')
    
    // 초기화 함수
    const initializeAllData = async () => {
      // 비동기 작업 중복 방지
      if (initializationInProgressRef.current) {
        return
      }
      
      initializationInProgressRef.current = true
      console.log('🚀 [INIT] Initializing all years data at once...')
      setIsLoading(true)
      setError(null)

      try {
        // 1. GeoJSON 로딩
        console.log('📍 [GEOJSON] Loading GeoJSON...')
        // Next.js static export에서는 public 폴더의 파일이 루트에 복사됨
        // 여러 경로를 시도 (절대 경로부터)
        let geoResponse: Response | null = null
        const currentOrigin = typeof window !== 'undefined' ? window.location.origin : ''
        const geoPaths = [
          '/world-countries-detailed.json',  // 절대 경로 (가장 일반적)
          `${currentOrigin}/world-countries-detailed.json`,  // 전체 URL
          './world-countries-detailed.json',  // 상대 경로
          'world-countries-detailed.json'     // 현재 디렉토리
        ]
        
        for (const path of geoPaths) {
          try {
            console.log(`🔍 [GEOJSON] Trying path: ${path}`)
            geoResponse = await fetch(path)
            if (geoResponse.ok) {
              console.log(`✅ [GEOJSON] Found at: ${path}`)
              break
            } else {
              console.warn(`⚠️ [GEOJSON] Path ${path} returned status: ${geoResponse.status}`)
            }
          } catch (error: any) {
            console.warn(`⚠️ [GEOJSON] Failed to load from ${path}:`, error.message)
            continue
          }
        }
        
        if (!geoResponse || !geoResponse.ok) {
          console.error('❌ [GEOJSON] All paths failed, trying to continue without GeoJSON')
          // GeoJSON 로드 실패해도 지도는 표시할 수 있도록 경고만 표시
          // 에러를 설정하지 않음 (지도는 데이터 없이 표시 가능)
          console.warn('⚠️ [GEOJSON] GeoJSON 파일을 불러올 수 없습니다. 지도 표시가 제한될 수 있습니다.')
          // GeoJSON이 없어도 빈 mapData를 설정하여 로딩 상태 해제
          setMapData({ type: 'FeatureCollection', features: [] })
        } else {
          try {
        const worldData = await geoResponse.json()
        setMapData(worldData)
        console.log('✅ [GEOJSON] GeoJSON loaded successfully, features:', worldData.features?.length || 0)
          } catch (parseError: any) {
            console.error('❌ [GEOJSON] Failed to parse JSON:', parseError.message)
            // 파싱 실패 시에도 빈 mapData 설정
            setMapData({ type: 'FeatureCollection', features: [] })
          }
        }

        // 2. 모든 연도 데이터를 병렬로 로딩 (1995-2024)
        console.log('📊 [DATA] Loading all years data in parallel...')
        const allYears = Array.from({ length: 30 }, (_, i) => 1995 + i) // 1995-2024
        console.log('📅 [DATA] Years to load:', allYears.length, 'years')
        
        // 모든 연도를 병렬로 로딩
        const promises = allYears.map(y => fetchYearData(sector, capitalTypes, y))
        const results = await Promise.allSettled(promises)
        
        const yearlyData: YearlyData = {}
        let successCount = 0
        let failureCount = 0
        
        results.forEach((result, index) => {
          const currentYear = allYears[index]
          if (result.status === 'fulfilled') {
            // null이 아닌 경우에만 데이터 저장 (실제 데이터만 사용)
            if (result.value !== null && typeof result.value === 'object') {
              yearlyData[currentYear] = result.value
              const dataCount = Object.keys(result.value).length
              if (dataCount > 0) successCount++
              if (index < 3 || index === allYears.length - 1) {
                console.log(`✅ [DATA] Year ${currentYear} data loaded: ${dataCount} countries`)
              }
            } else {
              failureCount++
              if (index < 3) {
                console.warn(`⚠️ [DATA] Year ${currentYear} returned null (no data)`)
              }
            }
          } else {
            failureCount++
            if (index < 3) {
              console.warn(`⚠️ [DATA] Failed to load year ${currentYear}:`, result.reason)
            }
            // 에러 발생 시 데이터 저장하지 않음 (더미 데이터 방지)
          }
        })
        
        setAllYearlyData(yearlyData)
        
        // 실제 데이터가 하나도 없는 경우 경고만 표시 (에러로 처리하지 않음)
        // 일부 연도에 데이터가 없을 수 있으므로 정상적인 상황일 수 있음
        if (successCount === 0) {
          console.warn(`⚠️ [INIT] No data found for any year. This might be normal if the database is empty.`)
          // 에러를 설정하지 않고 빈 데이터로 진행 (지도는 표시되지만 데이터 없음)
        } else if (failureCount > successCount) {
          console.warn(`⚠️ [INIT] Some years failed to load: success=${successCount}, failure=${failureCount}`)
        }
        
        console.log('✅ [INIT] All years data loaded successfully', {
          totalYears: Object.keys(yearlyData).length,
          successCount,
          failureCount
        })

      } catch (error: any) {
        console.error('❌ [INIT] Failed to initialize data:', error)
        const errorMessage = error.message || String(error)
        setError(`데이터 초기화 실패: ${errorMessage}`)
        setAllYearlyData({})
        
        // 네트워크 에러인 경우 자동 재시도하지 않음 (실제 데이터만 사용)
        // 재시도 로직 제거: 더미 데이터 방지를 위해 실패 시 즉시 로딩 완료 처리
        console.log('⚠️ [INIT] 백엔드 서버 연결 실패 - 실제 데이터 없음, 지도 표시 안 함')
      } finally {
        setIsLoading(false)
        initializationInProgressRef.current = false // 초기화 완료 후 플래그 리셋
      }
    }
    
    // 즉시 초기화 시작
    initializeAllData()
    
    // cleanup: 컴포넌트 언마운트 시 플래그 리셋
    return () => {
      initializationInProgressRef.current = false
    }
  }, []) // 빈 의존성 배열로 마운트 시 한 번만 실행

  // 현재 연도 데이터를 상위 컴포넌트로 전달
  useEffect(() => {
    const currentYearData = allYearlyData[year]
    if (!currentYearData || Object.keys(currentYearData).length === 0 || !onDataChange) return

    const formattedData: any = {}
    Object.entries(currentYearData).forEach(([countryCode, amount]) => {
      if (amount > 0) {
        formattedData[countryCode] = {
          countryName: countryCode,
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

  // 초기 로딩 중인 경우만 로딩 표시
  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-gray-600 mb-2">데이터 로딩 중...</div>
          {error && (
            <div className="text-sm text-red-600 mt-2 max-w-md px-4">
              {error}
            </div>
          )}
        </div>
      </div>
    )
  }

  // mapData가 없으면 (GeoJSON 로드 실패) 안내 메시지 표시
  if (!mapData || !mapData.features || mapData.features.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
        <div className="text-yellow-600 font-semibold mb-2 text-center px-4">
          ⚠️ GeoJSON 파일을 불러올 수 없습니다
        </div>
        <div className="text-sm text-gray-600 max-w-md text-center px-4 mb-4">
          world-countries-detailed.json 파일이 배포에 포함되어 있는지 확인해주세요.
        </div>
        {error && (
          <div className="text-xs text-red-500 max-w-md text-center px-4">
            {error}
          </div>
        )}
      </div>
    )
  }

  // currentMapData가 없으면 (로딩 중이거나 에러) 처리
  // 이제 데이터가 없어도 GeoJSON이 있으면 빈 지도를 표시하므로 이 체크는 로딩 중일 때만 필요
  if (!currentMapData) {
    // 로딩 중이 아니면 빈 지도도 표시해야 하는데 currentMapData가 null인 경우는 로딩 중이거나 에러
    if (isLoading) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="text-gray-600 mb-2">데이터 로딩 중...</div>
            {error && (
              <div className="text-sm text-red-600 mt-2 max-w-md px-4">
                {error}
              </div>
            )}
          </div>
        </div>
      )
    }
    // 로딩이 완료되었는데 currentMapData가 null이면 에러
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
        <div className="text-red-600 font-semibold mb-2 text-center px-4">
          ⚠️ 지도 데이터 생성 실패
        </div>
        <div className="text-sm text-gray-600 max-w-md text-center px-4 mb-4">
          지도 데이터를 생성할 수 없습니다. 페이지를 새로고침해보세요.
        </div>
        {error && (
          <div className="text-xs text-red-500 max-w-md text-center px-4">
            {error}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full h-full relative bg-blue-50">
      {/* 에러 메시지 표시 */}
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded-lg shadow-lg max-w-2xl">
          <div className="flex items-center justify-between">
            <div>
              <strong>⚠️ 경고:</strong> {error}
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-4 text-yellow-600 hover:text-yellow-800"
            >
              ✕
            </button>
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
