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
  onCapitalTypeChange?: (types: string[]) => void
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
  const [selectedCapitalTypes, setSelectedCapitalTypes] = useState<string[]>([])
  const [visualizationType, setVisualizationType] = useState<'choropleth' | 'flow' | 'both'>('choropleth')
  const [isAnimating, setIsAnimating] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)

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

  // 즉시 반응하는 연도 변경 핸들러
  const handleYearChange = (year: number) => {
    setCurrentYear(year)
    onYearChange?.(year) // 디바운싱 제거 - 즉시 반응
  }

  // 연도 슬라이더 마우스 휠 스크롤 핸들러
  const handleYearWheelScroll = (event: React.WheelEvent) => {
    event.preventDefault()
    const delta = event.deltaY < 0 ? 1 : -1 // 스크롤 내릴 때 미래로 (감도 낮게)
    const newYear = Math.max(1970, Math.min(2024, currentYear + delta))
    handleYearChange(newYear)
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
              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                ⚡ 즉시 반응
              </span>
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="1970"
                max="2024"
                step="1"
                value={currentYear}
                onChange={(e) => handleYearChange(parseInt(e.target.value))}
                onWheel={handleYearWheelScroll}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider transition-all duration-100 hover:bg-gray-300 focus:ring-2 focus:ring-green-500 focus:outline-none"
                style={{
                  background: `linear-gradient(to right, #10b981 0%, #10b981 ${((currentYear - 1970) / (2024 - 1970)) * 100}%, #e5e7eb ${((currentYear - 1970) / (2024 - 1970)) * 100}%, #e5e7eb 100%)`
                }}
                title="연도를 드래그하거나 마우스 휠로 변경하세요. 모든 데이터가 미리 로드되어 즉시 반응합니다!"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>1970</span>
                <span className="text-green-600 font-medium">🚀 빠른 반응</span>
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
            <label className="block text-sm font-medium text-gray-700 mb-3">
              자본 타입 
              {selectedCapitalTypes.length > 0 && (
                <span className="ml-2 text-xs text-primary-600 font-medium">
                  ({selectedCapitalTypes.length}개 선택됨)
                </span>
              )}
            </label>
            
            {/* 선택된 타입들 표시 - 하단 정렬 */}
            {selectedCapitalTypes.length > 0 && (
              <div className="mb-3 p-3 bg-primary-50 rounded-md">
                <div className="text-xs text-primary-700 font-medium mb-2">
                  선택된 자본 타입 ({selectedCapitalTypes.length}개):
                </div>
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
