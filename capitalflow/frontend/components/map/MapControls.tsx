'use client'

import { useState, useEffect } from 'react'
import { 
  CalendarIcon, 
  FunnelIcon, 
  PlayIcon, 
  PauseIcon,
  AdjustmentsHorizontalIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

interface MapControlsProps {
  onYearChange?: (year: number) => void
  onSectorChange?: (sector: string) => void
  onCapitalTypeChange?: (types: string[]) => void
  onVisualizationTypeChange?: (type: 'choropleth' | 'flow' | 'both') => void
  onAnimationToggle?: (playing: boolean) => void
  onAnimationSpeedChange?: (speed: number) => void
  currentYear?: number // 외부에서 현재 연도를 받아옴
}

// 백엔드 메타데이터와 동기화된 분야 목록
const sectors = [
  { id: '', name: '전체' },
  { id: 'AI', name: '인공지능' },
  { id: 'SEMICONDUCTOR', name: '반도체' },
  { id: 'BIO', name: '바이오' },
  { id: 'ENERGY', name: '에너지' },
  { id: 'FINTECH', name: '핀테크' },
  { id: 'AUTOMOTIVE', name: '자동차' },
  { id: 'AEROSPACE', name: '항공우주' },
  { id: 'TELECOM', name: '통신' },
  { id: 'REALESTATE', name: '부동산' },
  { id: 'AGRICULTURE', name: '농업' },
]

const capitalTypes = [
  { id: 'FDI', name: 'FDI (외국인직접투자)', description: '공장·법인 설립, 해외 지사 확장, 해외 지분 10% 이상 취득' },
  { id: 'VC', name: 'VC (벤처캐피털)', description: '스타트업/신생 기업 초기 및 성장 단계 자금 투자' },
  { id: 'MA', name: 'M&A (인수합병)', description: '기업 매각·인수·합병 거래' },
  { id: 'IPO', name: 'IPO (기업공개)', description: '주식시장 신규 상장 및 자본 유입' },
  { id: 'PE', name: 'PE (사모펀드)', description: '상장폐지 후 기업 인수, 구조조정, Buyout 투자' },
  { id: 'BONDS', name: 'Bonds (채권발행)', description: '국채, 회사채 발행을 통한 자금 조달' },
  { id: 'FPI', name: 'FPI (해외포트폴리오투자)', description: '외국인이 주식·채권에 단기/간접 투자하는 자금 흐름' },
  { id: 'SWF', name: 'SWF (국부펀드투자)', description: '국가 단위에서 해외 투자' },
  { id: 'GREENFIELD', name: 'Greenfield (그린필드투자)', description: '해외에 신규 공장·인프라 건설' },
  { id: 'JV', name: 'JV (합작투자)', description: '두 기업/국가 간 공동 법인 설립 자금' },
  { id: 'DEVFIN', name: 'DevFin (개발금융)', description: '세계은행, ADB, ODA 같은 개발 자금' },
]

export default function MapControls({
  onYearChange,
  onSectorChange,
  onCapitalTypeChange,
  onVisualizationTypeChange,
  onAnimationToggle,
  onAnimationSpeedChange,
  currentYear: externalCurrentYear
}: MapControlsProps) {
  // 모든 자본 타입의 id를 디폴트로 설정
  const allCapitalTypeIds = capitalTypes.map(type => type.id)
  
  const [currentYear, setCurrentYear] = useState(1995)
  const [yearRangeMin, setYearRangeMin] = useState(1995) // 디폴트 최소값 1995
  const [yearRangeMax, setYearRangeMax] = useState(2024) // 디폴트 최대값 2024
  const [selectedSector, setSelectedSector] = useState('')
  const [selectedCapitalTypes, setSelectedCapitalTypes] = useState<string[]>(allCapitalTypeIds)
  const [visualizationType, setVisualizationType] = useState<'choropleth' | 'flow' | 'both'>('choropleth')
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationSpeed, setAnimationSpeed] = useState(500) // 밀리초 단위 (0.5초) - 더 빠르게
  const [isExpanded, setIsExpanded] = useState(true)
  const [isSelectedTypesExpanded, setIsSelectedTypesExpanded] = useState(false) // 디폴트로 접어둠
  const [showSpeedControls, setShowSpeedControls] = useState(false) // 속도 조절 패널 표시 여부

  // 즉시 반응하는 연도 변경 핸들러
  const handleYearChange = (year: number) => {
    setCurrentYear(year)
    onYearChange?.(year) // 디바운싱 제거 - 즉시 반응
  }

  // 연도 슬라이더 마우스 휠 스크롤 핸들러 (감도 낮춤)
  const handleYearWheelScroll = (event: React.WheelEvent) => {
    event.preventDefault()
    
    // 감도를 낮추기 위해 누적 스크롤 추적
    const scrollThreshold = 100 // 스크롤 임계값 증가
    const delta = Math.abs(event.deltaY) > scrollThreshold ? (event.deltaY < 0 ? 1 : -1) : 0
    
    if (delta !== 0) {
      const newYear = Math.max(yearRangeMin, Math.min(yearRangeMax, currentYear + delta))
      if (newYear !== currentYear) {
        handleYearChange(newYear)
      }
    }
  }

  const handleSectorChange = (sector: string) => {
    setSelectedSector(sector)
    onSectorChange?.(sector)
  }

  const handleCapitalTypeChange = (type: string) => {
    setSelectedCapitalTypes(prev => {
      const newTypes = prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
      onCapitalTypeChange?.(newTypes)
      return newTypes
    })
  }

  // 전체선택 핸들러
  const handleSelectAll = () => {
    setSelectedCapitalTypes(allCapitalTypeIds)
    onCapitalTypeChange?.(allCapitalTypeIds)
  }

  // 전체해제 핸들러
  const handleDeselectAll = () => {
    setSelectedCapitalTypes([])
    onCapitalTypeChange?.([])
  }

  // 연도 범위 변경 핸들러
  const handleYearRangeChange = (min: number, max: number) => {
    setYearRangeMin(min)
    setYearRangeMax(max)
    
    // 현재 연도가 새로운 범위를 벗어나면 조정
    if (currentYear < min) {
      handleYearChange(min)
    } else if (currentYear > max) {
      handleYearChange(max)
    }
  }

  const handleVisualizationTypeChange = (type: 'choropleth' | 'flow' | 'both') => {
    setVisualizationType(type)
    onVisualizationTypeChange?.(type)
  }

  const toggleAnimation = () => {
    setIsAnimating(!isAnimating)
    onAnimationToggle?.(!isAnimating)
  }

  const handleAnimationSpeedChange = (speed: number) => {
    setAnimationSpeed(speed)
    onAnimationSpeedChange?.(speed)
  }

  // 초기 상태에서 모든 자본 타입이 선택된 상태를 부모에게 알려줌
  useEffect(() => {
    onCapitalTypeChange?.(allCapitalTypeIds)
  }, []) // 빈 배열로 마운트 시에만 실행

  // 외부에서 연도가 변경될 때 내부 상태 동기화
  useEffect(() => {
    if (externalCurrentYear !== undefined && externalCurrentYear !== currentYear) {
      setCurrentYear(externalCurrentYear)
    }
  }, [externalCurrentYear])

  // 현재 연도가 설정된 범위에 맞는지 확인하고 조정
  useEffect(() => {
    if (currentYear < yearRangeMin || currentYear > yearRangeMax) {
      // 현재 연도가 범위를 벗어나면 범위의 중간값으로 설정
      const middleYear = Math.floor((yearRangeMin + yearRangeMax) / 2)
      handleYearChange(middleYear)
    }
  }, [yearRangeMin, yearRangeMax])

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
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <CalendarIcon className="h-4 w-4 inline mr-1" />
              연도: {currentYear}
            </label>
            
            {/* 연도 범위 설정 */}
            <div className="mb-3 p-3 bg-gray-50 rounded-md">
              <div className="text-xs text-gray-600 font-medium mb-2">연도 범위 설정</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">시작년도</label>
                  <input
                    type="number"
                    min="1995"
                    max="2024"
                    value={yearRangeMin}
                    onChange={(e) => {
                      const min = parseInt(e.target.value)
                      if (min <= yearRangeMax) {
                        handleYearRangeChange(min, yearRangeMax)
                      }
                    }}
                    className="w-full mt-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">종료년도</label>
                  <input
                    type="number"
                    min="1995"
                    max="2024"
                    value={yearRangeMax}
                    onChange={(e) => {
                      const max = parseInt(e.target.value)
                      if (max >= yearRangeMin) {
                        handleYearRangeChange(yearRangeMin, max)
                      }
                    }}
                    className="w-full mt-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              {/* 범위 프리셋 버튼 */}
              <div className="flex gap-1 mt-2">
                <button
                  onClick={() => handleYearRangeChange(1995, 2024)}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                >
                  1995-2024
                </button>
                <button
                  onClick={() => handleYearRangeChange(2000, 2024)}
                  className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                >
                  2000-2024
                </button>
                <button
                  onClick={() => handleYearRangeChange(1970, 2024)}
                  className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors"
                >
                  전체(1970-2024)
                </button>
              </div>
            </div>
            
            {/* 연도 슬라이더 */}
            <div className="space-y-2">
              <input
                type="range"
                min={yearRangeMin}
                max={yearRangeMax}
                step="1"
                value={currentYear}
                onChange={(e) => handleYearChange(parseInt(e.target.value))}
                onWheel={handleYearWheelScroll}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider transition-all duration-100 hover:bg-gray-300 focus:ring-2 focus:ring-green-500 focus:outline-none"
                style={{
                  background: `linear-gradient(to right, #10b981 0%, #10b981 ${((currentYear - yearRangeMin) / (yearRangeMax - yearRangeMin)) * 100}%, #e5e7eb ${((currentYear - yearRangeMin) / (yearRangeMax - yearRangeMin)) * 100}%, #e5e7eb 100%)`
                }}
                title="연도를 드래그하거나 마우스 휠로 변경하세요. 마우스 휠 감도가 낮춰져 정확한 선택이 가능합니다!"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{yearRangeMin}</span>
                <span>{yearRangeMax}</span>
              </div>
            </div>
          </div>

          {/* 애니메이션 제어 */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={toggleAnimation}
                className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  isAnimating
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                }`}
              >
                {isAnimating ? (
                  <>
                    <PauseIcon className="h-4 w-4 mr-2" />
                    중지
                  </>
                ) : (
                  <>
                    <PlayIcon className="h-4 w-4 mr-2" />
                    재생
                  </>
                )}
              </button>
              
              <button
                onClick={() => setShowSpeedControls(!showSpeedControls)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  showSpeedControls
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title="애니메이션 속도 조절"
              >
                <ClockIcon className="h-4 w-4" />
              </button>
            </div>
            
            {/* 애니메이션 속도 조절 패널 */}
            {showSpeedControls && (
              <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs text-gray-600 font-medium">
                    애니메이션 속도: {animationSpeed}ms
                  </label>
                  <button
                    onClick={() => setShowSpeedControls(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
                
                {/* 빠른 속도 조절 버튼들 */}
                <div className="flex gap-1 mb-3">
                  <button
                    onClick={() => handleAnimationSpeedChange(200)}
                    className={`px-2 py-1 text-xs rounded ${
                      animationSpeed === 200 ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    초고속
                  </button>
                  <button
                    onClick={() => handleAnimationSpeedChange(500)}
                    className={`px-2 py-1 text-xs rounded ${
                      animationSpeed === 500 ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    빠름
                  </button>
                  <button
                    onClick={() => handleAnimationSpeedChange(1000)}
                    className={`px-2 py-1 text-xs rounded ${
                      animationSpeed === 1000 ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    보통
                  </button>
                  <button
                    onClick={() => handleAnimationSpeedChange(2000)}
                    className={`px-2 py-1 text-xs rounded ${
                      animationSpeed === 2000 ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    느림
                  </button>
                </div>
                
                {/* 세밀한 속도 조절 슬라이더 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ChevronLeftIcon className="h-3 w-3 text-gray-400" />
                    <input
                      type="range"
                      min="200"
                      max="2000"
                      step="50"
                      value={animationSpeed}
                      onChange={(e) => handleAnimationSpeedChange(parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, #10b981 0%, #10b981 ${((animationSpeed - 200) / (2000 - 200)) * 100}%, #e5e7eb ${((animationSpeed - 200) / (2000 - 200)) * 100}%, #e5e7eb 100%)`
                      }}
                    />
                    <ChevronRightIcon className="h-3 w-3 text-gray-400" />
                  </div>
                </div>
              </div>
            )}
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
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">
                자본 타입 
                {selectedCapitalTypes.length > 0 && (
                  <span className="ml-2 text-xs text-primary-600 font-medium">
                    ({selectedCapitalTypes.length}개 선택됨)
                  </span>
                )}
              </label>
              
              {/* 전체선택/전체해제 버튼 */}
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAll}
                  disabled={selectedCapitalTypes.length === allCapitalTypeIds.length}
                  className="px-3 py-1 text-xs bg-primary-100 text-primary-700 rounded-md hover:bg-primary-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="모든 자본 타입 선택"
                >
                  전체선택
                </button>
                <button
                  onClick={handleDeselectAll}
                  disabled={selectedCapitalTypes.length === 0}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="모든 자본 타입 선택 해제"
                >
                  전체해제
                </button>
              </div>
            </div>
            
            {/* 선택된 타입들 표시 - 접기/펼치기 기능 */}
            {selectedCapitalTypes.length > 0 && (
              <div className="mb-3 p-3 bg-primary-50 rounded-md">
                <button
                  onClick={() => setIsSelectedTypesExpanded(!isSelectedTypesExpanded)}
                  className="w-full flex items-center justify-between text-xs text-primary-700 font-medium mb-2 hover:text-primary-800 transition-colors"
                >
                  <span>선택된 자본 타입 ({selectedCapitalTypes.length}개)</span>
                  {isSelectedTypesExpanded ? (
                    <ChevronUpIcon className="h-4 w-4" />
                  ) : (
                    <ChevronDownIcon className="h-4 w-4" />
                  )}
                </button>
                
                {isSelectedTypesExpanded && (
                  <div className="grid grid-cols-1 gap-1">
                    {selectedCapitalTypes.map(typeId => {
                      const type = capitalTypes.find(t => t.id === typeId)
                      return (
                        <div key={typeId} className="flex items-center justify-between px-2 py-1 rounded text-xs bg-primary-100 text-primary-800">
                          <span className="flex-1 truncate">{type?.name}</span>
                          <button
                            onClick={() => handleCapitalTypeChange(typeId)}
                            className="ml-2 hover:text-primary-600 flex-shrink-0"
                            title="제거"
                          >
                            ×
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {capitalTypes.map((type) => (
                <label 
                  key={type.id} 
                  className="flex items-start space-x-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedCapitalTypes.includes(type.id)}
                    onChange={() => handleCapitalTypeChange(type.id)}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{type.name}</div>
                    <div className="text-xs text-gray-500 mt-1 leading-relaxed">{type.description}</div>
                  </div>
                </label>
              ))}
            </div>
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
