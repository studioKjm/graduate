'use client'

import React, { useState, useMemo } from 'react'
import { formatNumberBoth } from '@/utils/formatters'
import {
  ChartBarIcon,
  TableCellsIcon,
  ChartPieIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline'

interface CapitalData {
  [countryCode: string]: {
    countryName: string
    amount: number
    intensity: number
  }
}

interface DataVisualizationPanelProps {
  data: CapitalData
  year: number
  sector: string
  capitalTypes: string[]
}

export default function DataVisualizationPanel({
  data,
  year,
  sector,
  capitalTypes
}: DataVisualizationPanelProps) {
  const [activeTab, setActiveTab] = useState<'chart' | 'table' | 'pie' | 'trend'>('chart')

  // 상위 10개국 데이터 추출
  const topCountries = useMemo(() => {
    return Object.entries(data)
      .filter(([_, country]) => country.amount > 0)
      .sort(([, a], [, b]) => b.amount - a.amount)
      .slice(0, 10)
      .map(([code, country]) => ({
        code,
        name: country.countryName,
        amount: country.amount,
        intensity: country.intensity
      }))
  }, [data])

  // 총합 계산
  const totalAmount = useMemo(() => {
    return Object.values(data).reduce((sum, country) => sum + country.amount, 0)
  }, [data])

  // 최대값 계산 (차트 스케일링용)
  const maxAmount = useMemo(() => {
    return Math.max(...topCountries.map(country => country.amount), 1)
  }, [topCountries])

  const tabs = [
    { id: 'chart' as const, name: '막대 차트', icon: ChartBarIcon },
    { id: 'table' as const, name: '데이터 표', icon: TableCellsIcon },
    { id: 'pie' as const, name: '원형 차트', icon: ChartPieIcon },
    { id: 'trend' as const, name: '트렌드', icon: ArrowTrendingUpIcon },
  ]

  return (
    <div className="bg-white border-t border-gray-200 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              데이터 시각화 - {year}년 {sector || '전체'} 분야
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              선택된 자본 타입: {capitalTypes.join(', ') || '전체'} | 
              총 자본: <span className="font-semibold text-blue-600">
                {formatNumberBoth(totalAmount).short}
              </span>
            </p>
          </div>
          
          {/* 탭 네비게이션 */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* 탭 컨텐츠 */}
        <div className="min-h-96">
          {activeTab === 'chart' && (
            <BarChart countries={topCountries} maxAmount={maxAmount} />
          )}
          {activeTab === 'table' && (
            <DataTable countries={topCountries} totalAmount={totalAmount} />
          )}
          {activeTab === 'pie' && (
            <PieChart countries={topCountries} totalAmount={totalAmount} />
          )}
          {activeTab === 'trend' && (
            <TrendAnalysis countries={topCountries} year={year} sector={sector} />
          )}
        </div>
      </div>
    </div>
  )
}

// 막대 차트 컴포넌트
function BarChart({ countries, maxAmount }: { countries: any[], maxAmount: number }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">상위 10개국 자본 유입</h3>
      <div className="space-y-3">
        {countries.map((country, index) => (
          <div key={country.code} className="flex items-center space-x-4">
            <div className="w-8 text-sm font-medium text-gray-600 text-right">
              {index + 1}
            </div>
            <div className="w-24 text-sm font-medium text-gray-800 truncate">
              {country.name}
            </div>
            <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                style={{
                  width: `${(country.amount / maxAmount) * 100}%`,
                  minWidth: '60px'
                }}
              >
                <span className="text-xs font-medium text-white">
                  {formatNumberBoth(country.amount).short}
                </span>
              </div>
            </div>
            <div className="w-32 text-xs text-gray-500 text-right">
              {formatNumberBoth(country.amount).detailed}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// 데이터 표 컴포넌트
function DataTable({ countries, totalAmount }: { countries: any[], totalAmount: number }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">상세 데이터 표</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                순위
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                국가
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                자본 규모
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                상세 금액
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                비율
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {countries.map((country, index) => (
              <tr key={country.code} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  #{index + 1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {country.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600 text-right">
                  {formatNumberBoth(country.amount).short}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                  {formatNumberBoth(country.amount).detailed}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                  {((country.amount / totalAmount) * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// 원형 차트 컴포넌트 (SVG 기반)
function PieChart({ countries, totalAmount }: { countries: any[], totalAmount: number }) {
  const radius = 120
  const centerX = 150
  const centerY = 150

  let currentAngle = 0
  const slices = countries.slice(0, 6).map((country, index) => {
    const percentage = (country.amount / totalAmount) * 100
    const angle = (percentage / 100) * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    currentAngle += angle

    const x1 = centerX + radius * Math.cos((startAngle * Math.PI) / 180)
    const y1 = centerY + radius * Math.sin((startAngle * Math.PI) / 180)
    const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180)
    const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180)

    const largeArcFlag = angle > 180 ? 1 : 0

    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ')

    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'
    ]

    return {
      path: pathData,
      color: colors[index % colors.length],
      country,
      percentage
    }
  })

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">자본 분포 (상위 6개국)</h3>
      <div className="flex items-center space-x-8">
        <svg width="300" height="300" className="flex-shrink-0">
          {slices.map((slice, index) => (
            <path
              key={index}
              d={slice.path}
              fill={slice.color}
              stroke="white"
              strokeWidth="2"
              className="hover:opacity-80 cursor-pointer"
            />
          ))}
        </svg>
        
        <div className="flex-1 space-y-2">
          {slices.map((slice, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: slice.color }}
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">
                  {slice.country.name}
                </div>
                <div className="text-xs text-gray-500">
                  {formatNumberBoth(slice.country.amount).short} ({slice.percentage.toFixed(1)}%)
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// 트렌드 분석 컴포넌트
function TrendAnalysis({ countries, year, sector }: { countries: any[], year: number, sector: string }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">트렌드 분석</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {countries.length}
          </div>
          <div className="text-sm text-gray-600">활성 투자 국가</div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {formatNumberBoth(countries[0]?.amount || 0).short}
          </div>
          <div className="text-sm text-gray-600">최대 투자 규모</div>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {countries.length > 1 ? 
              `${((countries[0]?.amount || 0) / (countries[1]?.amount || 1)).toFixed(1)}:1` : 
              'N/A'
            }
          </div>
          <div className="text-sm text-gray-600">1위-2위 격차 비율</div>
        </div>
      </div>
      
      <div className="text-sm text-gray-600 space-y-2">
        <div>
          <strong>분석 연도:</strong> {year}년
        </div>
        <div>
          <strong>분석 분야:</strong> {sector || '전체'}
        </div>
        <div>
          <strong>주요 특징:</strong> 
          {countries.length > 0 && (
            <span className="ml-1">
              {countries[0].name}이 최대 투자국으로 전체의 {
                countries.length > 0 ? 
                (countries[0].amount / countries.reduce((sum, c) => sum + c.amount, 0) * 100).toFixed(1) : 
                0
              }%를 차지
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
