'use client'

import { useState } from 'react'
import { interpolateBlues } from 'd3-scale-chromatic'
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

interface MapLegendProps {
  visualizationType?: 'choropleth' | 'flow' | 'both'
  maxValue?: number
  minValue?: number
}

export default function MapLegend({
  visualizationType = 'choropleth',
  maxValue = 1000000,
  minValue = 0
}: MapLegendProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  // 색상 그라디언트 생성
  const colorStops = Array.from({ length: 9 }, (_, i) => {
    const intensity = i / 8
    return {
      intensity,
      color: interpolateBlues(intensity),
      value: minValue + (maxValue - minValue) * intensity
    }
  })

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(0)}M`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`
    } else {
      return `$${value.toFixed(0)}`
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 min-w-64">
      <div className="flex items-center justify-between p-3 pb-2">
        <h4 className="text-sm font-semibold text-gray-900">범례</h4>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors"
          title={isCollapsed ? "범례 펼치기" : "범례 접기"}
        >
          {isCollapsed ? (
            <ChevronUpIcon className="h-4 w-4" />
          ) : (
            <ChevronDownIcon className="h-4 w-4" />
          )}
        </button>
      </div>
      
      {!isCollapsed && (
        <div className="px-3 pb-3">
      
      {(visualizationType === 'choropleth' || visualizationType === 'both') && (
        <div className="mb-4">
          <div className="text-xs font-medium text-gray-700 mb-2">
            자본 총량 (색상 농도)
          </div>
          
          {/* 색상 바 */}
          <div className="relative">
            <div 
              className="h-4 rounded"
              style={{
                background: `linear-gradient(to right, ${colorStops.map(stop => stop.color).join(', ')})`
              }}
            />
            
            {/* 값 라벨 */}
            <div className="flex justify-between mt-1 text-xs text-gray-600">
              <span>{formatValue(minValue)}</span>
              <span>{formatValue(maxValue)}</span>
            </div>
          </div>
          
          {/* 색상 단계별 설명 */}
          <div className="mt-2 space-y-1">
            <div className="flex items-center text-xs">
              <div 
                className="w-3 h-3 rounded mr-2"
                style={{ backgroundColor: interpolateBlues(0.2) }}
              />
              <span className="text-gray-600">낮음</span>
            </div>
            <div className="flex items-center text-xs">
              <div 
                className="w-3 h-3 rounded mr-2"
                style={{ backgroundColor: interpolateBlues(0.6) }}
              />
              <span className="text-gray-600">보통</span>
            </div>
            <div className="flex items-center text-xs">
              <div 
                className="w-3 h-3 rounded mr-2"
                style={{ backgroundColor: interpolateBlues(1.0) }}
              />
              <span className="text-gray-600">높음</span>
            </div>
          </div>
        </div>
      )}
      
      {(visualizationType === 'flow' || visualizationType === 'both') && (
        <div>
          <div className="text-xs font-medium text-gray-700 mb-2">
            자본 흐름 (선 두께)
          </div>
          
          {/* 흐름 선 예시 */}
          <div className="space-y-2">
            <div className="flex items-center">
              <div className="w-8 h-0.5 bg-gradient-to-r from-orange-400 to-yellow-400 mr-3 rounded" />
              <span className="text-xs text-gray-600">소량 (~$100M)</span>
            </div>
            <div className="flex items-center">
              <div className="w-8 h-1 bg-gradient-to-r from-orange-400 to-yellow-400 mr-3 rounded" />
              <span className="text-xs text-gray-600">중간 (~$500M)</span>
            </div>
            <div className="flex items-center">
              <div className="w-8 h-1.5 bg-gradient-to-r from-orange-400 to-yellow-400 mr-3 rounded" />
              <span className="text-xs text-gray-600">대량 ($1B+)</span>
            </div>
          </div>
          
          {/* 흐름 방향 설명 */}
          <div className="mt-3 pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-600">
              <div className="flex items-center mb-1">
                <div className="w-3 h-3 rounded-full bg-orange-400 mr-2" />
                <span>출발지</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-yellow-400 mr-2" />
                <span>목적지</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
          {/* 추가 정보 */}
          <div className="mt-4 pt-3 border-t border-gray-200 text-xs text-gray-500">
            <p>지도를 클릭하거나 마우스를 올려 상세 정보를 확인하세요.</p>
          </div>
        </div>
      )}
    </div>
  )
}
