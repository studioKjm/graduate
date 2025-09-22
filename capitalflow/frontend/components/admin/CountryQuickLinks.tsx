'use client'

import React, { useState } from 'react'

interface Country {
  code: string
  name: string
  name_en: string
  region: string
}

interface CountryQuickLinksProps {
  apiBaseUrl: string
}

export default function CountryQuickLinks({ apiBaseUrl }: CountryQuickLinksProps) {
  const [selectedSector, setSelectedSector] = useState<string>('AI')
  const [selectedCapitalType, setSelectedCapitalType] = useState<string>('FDI')

  // 주요 국가 목록
  const majorCountries: Country[] = [
    { code: 'CHN', name: '중국', name_en: 'China', region: 'East Asia' },
    { code: 'USA', name: '미국', name_en: 'United States', region: 'North America' },
    { code: 'JPN', name: '일본', name_en: 'Japan', region: 'East Asia' },
    { code: 'DEU', name: '독일', name_en: 'Germany', region: 'Europe' },
    { code: 'GBR', name: '영국', name_en: 'United Kingdom', region: 'Europe' },
    { code: 'FRA', name: '프랑스', name_en: 'France', region: 'Europe' },
    { code: 'KOR', name: '한국', name_en: 'South Korea', region: 'East Asia' },
    { code: 'IND', name: '인도', name_en: 'India', region: 'South Asia' },
    { code: 'CAN', name: '캐나다', name_en: 'Canada', region: 'North America' },
    { code: 'AUS', name: '호주', name_en: 'Australia', region: 'Oceania' },
    { code: 'BRA', name: '브라질', name_en: 'Brazil', region: 'South America' },
    { code: 'RUS', name: '러시아', name_en: 'Russia', region: 'Europe' },
    { code: 'ITA', name: '이탈리아', name_en: 'Italy', region: 'Europe' },
    { code: 'ESP', name: '스페인', name_en: 'Spain', region: 'Europe' },
    { code: 'CHE', name: '스위스', name_en: 'Switzerland', region: 'Europe' },
    { code: 'SGP', name: '싱가포르', name_en: 'Singapore', region: 'Southeast Asia' }
  ]

  const sectors = [
    { code: 'AI', name: '인공지능' },
    { code: 'SEMICONDUCTOR', name: '반도체' },
    { code: 'BIO', name: '바이오' },
    { code: 'ENERGY', name: '에너지' },
    { code: 'FINTECH', name: '핀테크' },
    { code: 'AUTOMOTIVE', name: '자동차' },
    { code: 'AEROSPACE', name: '항공우주' },
    { code: 'TELECOM', name: '통신' },
    { code: 'REALESTATE', name: '부동산' },
    { code: 'AGRICULTURE', name: '농업' }
  ]

  const capitalTypes = [
    { code: 'FDI', name: 'FDI' },
    { code: 'VC', name: 'VC' },
    { code: 'MA', name: 'M&A' },
    { code: 'IPO', name: 'IPO' },
    { code: 'PE', name: 'PE' },
    { code: 'BONDS', name: 'Bonds' },
    { code: 'FPI', name: 'FPI' },
    { code: 'SWF', name: 'SWF' },
    { code: 'GREENFIELD', name: 'Greenfield' },
    { code: 'JV', name: 'JV' },
    { code: 'DEVFIN', name: 'DevFin' }
  ]

  const generateURL = (country: string, includeAggregation: boolean = false) => {
    const params = new URLSearchParams()
    params.append('country', country)
    params.append('sector', selectedSector)
    if (selectedCapitalType !== 'ALL') {
      params.append('capital_type', selectedCapitalType)
    }
    params.append('year', '2023')
    if (includeAggregation) {
      params.append('aggregate', 'true')
    }
    
    return `${apiBaseUrl}/api/v1/capitalflows/capitalflows/?${params.toString()}`
  }

  const openURL = (url: string) => {
    window.open(url, '_blank')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🌍 국가별 빠른 접근</h2>
        <p className="text-gray-600">
          주요 국가별 자본 흐름 데이터에 빠르게 접근할 수 있습니다.
        </p>
      </div>

      {/* 필터 설정 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 필터 설정</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 분야 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">분야</label>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {sectors.map((sector) => (
                <option key={sector.code} value={sector.code}>
                  {sector.name} ({sector.code})
                </option>
              ))}
            </select>
          </div>

          {/* 자본타입 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">자본타입</label>
            <select
              value={selectedCapitalType}
              onChange={(e) => setSelectedCapitalType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">전체</option>
              {capitalTypes.map((type) => (
                <option key={type.code} value={type.code}>
                  {type.name} ({type.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>현재 설정:</strong> {sectors.find(s => s.code === selectedSector)?.name} 분야, {' '}
            {selectedCapitalType === 'ALL' ? '전체 자본타입' : capitalTypes.find(c => c.code === selectedCapitalType)?.name} (2023년)
          </p>
        </div>
      </div>

      {/* 국가별 링크 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🔗 국가별 데이터 링크</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {majorCountries.map((country) => (
            <div key={country.code} className="border border-gray-200 rounded-lg p-4">
              <div className="mb-3">
                <h4 className="font-medium text-gray-900">{country.name}</h4>
                <p className="text-sm text-gray-600">{country.name_en}</p>
                <p className="text-xs text-gray-500">{country.region}</p>
              </div>

              <div className="space-y-2">
                {/* 상세 데이터 링크 */}
                <div>
                  <button
                    onClick={() => openURL(generateURL(country.code, false))}
                    className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    📊 상세 데이터
                  </button>
                </div>

                {/* 집계 데이터 링크 */}
                <div>
                  <button
                    onClick={() => openURL(generateURL(country.code, true))}
                    className="w-full px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                  >
                    📈 집계 데이터
                  </button>
                </div>

                {/* URL 복사 */}
                <div className="flex gap-1">
                  <button
                    onClick={() => copyToClipboard(generateURL(country.code, false))}
                    className="flex-1 px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-xs"
                  >
                    상세 복사
                  </button>
                  <button
                    onClick={() => copyToClipboard(generateURL(country.code, true))}
                    className="flex-1 px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-xs"
                  >
                    집계 복사
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 주요 비교 링크 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">⚔️ 주요 국가 비교</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* G3 비교 */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">🏆 G3 경제대국</h4>
            <p className="text-sm text-gray-600 mb-3">미국, 중국, 일본</p>
            <div className="space-y-2">
              <button
                onClick={() => openURL(`${apiBaseUrl}/api/v1/capitalflows/capitalflows/?country=USA&country=CHN&country=JPN&sector=${selectedSector}&aggregate=true&year=2023`)}
                className="w-full px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
              >
                집계 비교
              </button>
            </div>
          </div>

          {/* 아시아 4강 */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">🌏 아시아 4강</h4>
            <p className="text-sm text-gray-600 mb-3">중국, 일본, 한국, 인도</p>
            <div className="space-y-2">
              <button
                onClick={() => openURL(`${apiBaseUrl}/api/v1/capitalflows/capitalflows/?country=CHN&country=JPN&country=KOR&country=IND&sector=${selectedSector}&aggregate=true&year=2023`)}
                className="w-full px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
              >
                집계 비교
              </button>
            </div>
          </div>

          {/* 유럽 주요국 */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">🇪🇺 유럽 주요국</h4>
            <p className="text-sm text-gray-600 mb-3">독일, 영국, 프랑스</p>
            <div className="space-y-2">
              <button
                onClick={() => openURL(`${apiBaseUrl}/api/v1/capitalflows/capitalflows/?country=DEU&country=GBR&country=FRA&sector=${selectedSector}&aggregate=true&year=2023`)}
                className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                집계 비교
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 전체 국가 데이터 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🌐 전체 데이터 접근</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">모든 국가 데이터</h4>
            <button
              onClick={() => openURL(`${apiBaseUrl}/api/v1/capitalflows/capitalflows/?ordering=country__code&page_size=1000`)}
              className="w-full px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
            >
              전체 데이터 보기
            </button>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">메타데이터</h4>
            <button
              onClick={() => openURL(`${apiBaseUrl}/api/v1/capitalflows/metadata/`)}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              국가/분야/자본타입 목록
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
