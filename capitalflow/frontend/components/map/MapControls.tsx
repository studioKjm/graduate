'use client'

import { useState } from 'react'
import { 
  CalendarIcon, 
  FunnelIcon, 
  PlayIcon, 
  PauseIcon,
  AdjustmentsHorizontalIcon 
} from '@heroicons/react/24/outline'

interface MapControlsProps {
  onYearChange?: (year: number) => void
  onSectorChange?: (sector: string) => void
  onCapitalTypeChange?: (type: string) => void
  onVisualizationTypeChange?: (type: 'choropleth' | 'flow' | 'both') => void
  onAnimationToggle?: (playing: boolean) => void
}

export default function MapControls({
  onYearChange,
  onSectorChange,
  onCapitalTypeChange,
  onVisualizationTypeChange,
  onAnimationToggle
}: MapControlsProps) {
  const [currentYear, setCurrentYear] = useState(2023)
  const [selectedSector, setSelectedSector] = useState('')
  const [selectedCapitalType, setSelectedCapitalType] = useState('')
  const [visualizationType, setVisualizationType] = useState<'choropleth' | 'flow' | 'both'>('choropleth')
  const [isAnimating, setIsAnimating] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)

  // 임시 데이터 (추후 API에서 가져올 예정)
  const sectors = [
    { id: '', name: '전체' },
    { id: 'AI', name: '인공지능' },
    { id: 'SEMICONDUCTOR', name: '반도체' },
    { id: 'BIO', name: '바이오' },
    { id: 'ENERGY', name: '에너지' },
    { id: 'FINTECH', name: '핀테크' },
  ]

  const capitalTypes = [
    { id: '', name: '전체' },
    { id: 'FDI', name: '외국인직접투자' },
    { id: 'VC', name: '벤처캐피털' },
    { id: 'MA', name: 'M&A' },
    { id: 'IPO', name: '기업공개' },
  ]

  const handleYearChange = (year: number) => {
    setCurrentYear(year)
    onYearChange?.(year)
  }

  const handleSectorChange = (sector: string) => {
    setSelectedSector(sector)
    onSectorChange?.(sector)
  }

  const handleCapitalTypeChange = (type: string) => {
    setSelectedCapitalType(type)
    onCapitalTypeChange?.(type)
  }

  const handleVisualizationTypeChange = (type: 'choropleth' | 'flow' | 'both') => {
    setVisualizationType(type)
    onVisualizationTypeChange?.(type)
  }

  const toggleAnimation = () => {
    setIsAnimating(!isAnimating)
    onAnimationToggle?.(!isAnimating)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-80">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">지도 설정</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 rounded text-gray-400 hover:text-gray-600"
        >
          <AdjustmentsHorizontalIcon className="h-5 w-5" />
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-4">
          {/* 연도 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <CalendarIcon className="h-4 w-4 inline mr-1" />
              연도: {currentYear}
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="1970"
                max="2024"
                step="1"
                value={currentYear}
                onChange={(e) => handleYearChange(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>1970</span>
                <span>2024</span>
              </div>
            </div>
          </div>

          {/* 애니메이션 제어 */}
          <div>
            <button
              onClick={toggleAnimation}
              className={`w-full flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                isAnimating
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
              }`}
            >
              {isAnimating ? (
                <>
                  <PauseIcon className="h-4 w-4 mr-2" />
                  애니메이션 중지
                </>
              ) : (
                <>
                  <PlayIcon className="h-4 w-4 mr-2" />
                  애니메이션 재생
                </>
              )}
            </button>
          </div>

          {/* 분야 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FunnelIcon className="h-4 w-4 inline mr-1" />
              분야
            </label>
            <select
              value={selectedSector}
              onChange={(e) => handleSectorChange(e.target.value)}
              className="w-full input-field text-sm"
            >
              {sectors.map((sector) => (
                <option key={sector.id} value={sector.id}>
                  {sector.name}
                </option>
              ))}
            </select>
          </div>

          {/* 자본 타입 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              자본 타입
            </label>
            <select
              value={selectedCapitalType}
              onChange={(e) => handleCapitalTypeChange(e.target.value)}
              className="w-full input-field text-sm"
            >
              {capitalTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* 시각화 타입 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              시각화 타입
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleVisualizationTypeChange('choropleth')}
                className={`px-3 py-2 text-xs rounded-md font-medium transition-colors duration-200 ${
                  visualizationType === 'choropleth'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                색상
              </button>
              <button
                onClick={() => handleVisualizationTypeChange('flow')}
                className={`px-3 py-2 text-xs rounded-md font-medium transition-colors duration-200 ${
                  visualizationType === 'flow'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                흐름
              </button>
              <button
                onClick={() => handleVisualizationTypeChange('both')}
                className={`px-3 py-2 text-xs rounded-md font-medium transition-colors duration-200 ${
                  visualizationType === 'both'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                모두
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
