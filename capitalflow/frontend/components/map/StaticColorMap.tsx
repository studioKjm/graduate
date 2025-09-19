'use client'

import { useState, useEffect } from 'react'

export default function StaticColorMap() {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">지도를 로딩하는 중...</p>
        </div>
      </div>
    )
  }

  // 간단한 테스트 국가들 (좌표는 대략적)
  const testCountries = [
    {
      name: '미국',
      code: 'USA',
      path: 'M158 140 L280 140 L280 200 L158 200 Z',
      color: '#1e40af',
      capital: 1000000,
      intensity: 1.0
    },
    {
      name: '중국',
      code: 'CHN', 
      path: 'M580 160 L680 160 L680 220 L580 220 Z',
      color: '#3b82f6',
      capital: 800000,
      intensity: 0.8
    },
    {
      name: '일본',
      code: 'JPN',
      path: 'M720 170 L750 170 L750 200 L720 200 Z',
      color: '#60a5fa',
      capital: 600000,
      intensity: 0.6
    },
    {
      name: '독일',
      code: 'DEU',
      path: 'M420 130 L450 130 L450 160 L420 160 Z',
      color: '#93c5fd',
      capital: 500000,
      intensity: 0.5
    },
    {
      name: '영국',
      code: 'GBR',
      path: 'M380 120 L405 120 L405 145 L380 145 Z',
      color: '#dbeafe',
      capital: 450000,
      intensity: 0.45
    },
    {
      name: '프랑스',
      code: 'FRA',
      path: 'M400 140 L425 140 L425 165 L400 165 Z',
      color: '#bfdbfe',
      capital: 400000,
      intensity: 0.4
    },
    {
      name: '한국',
      code: 'KOR',
      path: 'M700 180 L715 180 L715 195 L700 195 Z',
      color: '#3b82f6',
      capital: 350000,
      intensity: 0.35
    },
    {
      name: '캐나다',
      code: 'CAN',
      path: 'M120 80 L300 80 L300 130 L120 130 Z',
      color: '#93c5fd',
      capital: 300000,
      intensity: 0.3
    },
    {
      name: '호주',
      code: 'AUS',
      path: 'M640 280 L720 280 L720 330 L640 330 Z',
      color: '#bfdbfe',
      capital: 250000,
      intensity: 0.25
    },
    {
      name: '브라질',
      code: 'BRA',
      path: 'M250 220 L320 220 L320 290 L250 290 Z',
      color: '#dbeafe',
      capital: 180000,
      intensity: 0.18
    }
  ]

  return (
    <div className="w-full h-full relative bg-slate-100">
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 800 400"
        className="w-full h-full"
      >
        {/* 배경 */}
        <rect width="800" height="400" fill="#e2e8f0" />
        
        {/* 바다 색상 */}
        <rect width="800" height="400" fill="#bae6fd" opacity="0.3" />
        
        {/* 테스트 국가들 */}
        {testCountries.map((country, index) => (
          <path
            key={country.code}
            d={country.path}
            fill={country.color}
            stroke="#ffffff"
            strokeWidth="2"
            className="cursor-pointer hover:stroke-yellow-400 hover:stroke-4 transition-all duration-200"
            onMouseEnter={() => setHoveredCountry(country.name)}
            onMouseLeave={() => setHoveredCountry(null)}
          />
        ))}
        
        {/* 국가 라벨 */}
        {testCountries.map((country, index) => {
          // 각 국가의 중심점 계산 (간단한 방법)
          const centerX = index < 5 ? 200 + index * 100 : 200 + (index - 5) * 100
          const centerY = index < 5 ? 160 : 250
          
          return (
            <text
              key={`label-${country.code}`}
              x={centerX}
              y={centerY}
              textAnchor="middle"
              className="text-xs font-medium fill-white drop-shadow-lg"
              style={{ pointerEvents: 'none' }}
            >
              {country.name}
            </text>
          )
        })}
        
        {/* 흐름 화살표 (예시) */}
        <g>
          {/* 한국 → 미국 */}
          <line x1="707" y1="187" x2="200" y2="170" stroke="#ef4444" strokeWidth="3" opacity="0.8" />
          <circle cx="200" cy="170" r="4" fill="#ef4444" />
          
          {/* 중국 → 일본 */}
          <line x1="630" y1="190" x2="735" y2="185" stroke="#f97316" strokeWidth="2" opacity="0.8" />
          <circle cx="735" cy="185" r="3" fill="#f97316" />
        </g>
      </svg>
      
      {/* 툴팁 */}
      {hoveredCountry && (
        <div className="absolute top-4 right-4 bg-white border-2 border-gray-300 rounded-lg shadow-xl p-4 z-50">
          <h3 className="font-bold text-gray-900 text-lg">
            {hoveredCountry}
          </h3>
          <p className="text-sm text-gray-600">
            색상이 제대로 표시되고 있습니다!
          </p>
        </div>
      )}
      
      {/* 색상 범례 */}
      <div className="absolute bottom-4 left-4 bg-white bg-opacity-95 rounded-lg p-4 shadow-lg">
        <h4 className="font-semibold text-gray-900 mb-3">투자 강도</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{backgroundColor: '#1e40af'}}></div>
            <span className="text-sm">매우 높음 (80%+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{backgroundColor: '#3b82f6'}}></div>
            <span className="text-sm">높음 (60-80%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{backgroundColor: '#60a5fa'}}></div>
            <span className="text-sm">보통 (40-60%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{backgroundColor: '#93c5fd'}}></div>
            <span className="text-sm">낮음 (20-40%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{backgroundColor: '#dbeafe'}}></div>
            <span className="text-sm">매우 낮음 (0-20%)</span>
          </div>
        </div>
      </div>
      
      {/* 상단 제목 */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-95 rounded-lg px-6 py-3 shadow-lg">
        <h2 className="text-xl font-bold text-gray-900">
          글로벌 자본 흐름 시각화 (색상 테스트)
        </h2>
        <p className="text-sm text-gray-600 text-center">
          각 국가의 색상이 투자 강도를 나타냅니다
        </p>
      </div>
    </div>
  )
}
