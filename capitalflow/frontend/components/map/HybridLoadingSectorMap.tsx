'use client'

import React, { useState, useEffect, useMemo } from 'react'

// 하이브리드 로딩: 현재 연도 즉시 + 백그라운드에서 나머지 로딩
export default function HybridLoadingSectorMap({
  year = 2023,
  sector = '',
  capitalTypes = [],
  visualizationType = 'choropleth'
}: any) {
  const [currentYearData, setCurrentYearData] = useState<any>(null)
  const [allYearlyData, setAllYearlyData] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [backgroundLoading, setBackgroundLoading] = useState(false)
  const [loadedYears, setLoadedYears] = useState<Set<number>>(new Set())

  // 1단계: 현재 연도만 즉시 로딩
  const loadCurrentYear = async () => {
    const data = await fetchYearData(sector, capitalTypes, year)
    setCurrentYearData(data)
    setAllYearlyData(prev => ({ ...prev, [year]: data }))
    setLoadedYears(prev => new Set([...prev, year]))
    setLoading(false)
  }

  // 2단계: 백그라운드에서 모든 연도 로딩
  const loadRemainingYears = async () => {
    setBackgroundLoading(true)
    
    // 우선순위: 현재 연도 주변부터
    const yearQueue = []
    for (let offset = 1; offset <= 27; offset++) {
      if (year - offset >= 1970) yearQueue.push(year - offset)
      if (year + offset <= 2024) yearQueue.push(year + offset)
    }
    
    for (const y of yearQueue) {
      if (!loadedYears.has(y)) {
        try {
          const data = await fetchYearData(sector, capitalTypes, y)
          setAllYearlyData(prev => ({ ...prev, [y]: data }))
          setLoadedYears(prev => new Set([...prev, y]))
          
          // 작은 지연으로 UI 블로킹 방지
          await new Promise(resolve => setTimeout(resolve, 10))
        } catch (error) {
          console.warn(`Failed to load ${y}:`, error)
        }
      }
    }
    
    setBackgroundLoading(false)
  }

  const fetchYearData = async (sector: string, capitalTypes: string[], year: number) => {
    // API 호출 로직...
    return {}
  }

  useEffect(() => {
    loadCurrentYear().then(() => {
      // 현재 연도 로딩 완료 후 백그라운드 로딩 시작
      setTimeout(loadRemainingYears, 100)
    })
  }, [year, sector, capitalTypes])

  return (
    <div>
      {/* 백그라운드 로딩 상태 표시 */}
      {backgroundLoading && (
        <div className="absolute bottom-4 right-4 bg-blue-100 px-3 py-2 rounded-lg">
          <div className="text-xs text-blue-700">
            🔄 백그라운드에서 다른 연도들을 로딩 중... ({loadedYears.size}/55)
          </div>
        </div>
      )}
      
      {/* 연도 변경 속도 표시 */}
      <div className="absolute top-4 left-4 bg-white px-3 py-2 rounded-lg shadow">
        <div className="text-sm">
          {loadedYears.has(year) ? (
            <span className="text-green-600">⚡ 즉시 표시</span>
          ) : (
            <span className="text-orange-600">🔄 로딩 중...</span>
          )}
        </div>
      </div>
      
      {/* 지도 렌더링... */}
    </div>
  )
}
