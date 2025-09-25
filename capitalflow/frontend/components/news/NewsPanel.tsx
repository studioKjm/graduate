'use client'

import React, { useState, useEffect } from 'react'
import { formatNumberBoth } from '@/utils/formatters'

interface NewsPanelProps {
  year: number
  country?: string
  sector?: string
  capitalTypes?: string[]
}

interface NewsArticle {
  title: string
  description: string
  url: string
  urlToImage?: string
  publishedAt: string
  source: {
    name: string
  }
  relevanceScore?: number
}

interface NewsData {
  query: string
  filters: {
    year: number
    country?: string
    sector?: string
    capital_type?: string
    country_name?: string
    sector_name?: string
    capital_type_name?: string
  }
  count: number
  articles: NewsArticle[]
  collected_at: string
  note?: string
}

export default function NewsPanel({ year, country, sector, capitalTypes }: NewsPanelProps) {
  const [newsData, setNewsData] = useState<NewsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCapitalType, setSelectedCapitalType] = useState<string | null>(null)
  const [useDummyData, setUseDummyData] = useState<boolean>(false)

  // 주요 자본 타입 선택 (첫 번째 타입 우선)
  useEffect(() => {
    if (capitalTypes && capitalTypes.length > 0) {
      setSelectedCapitalType(capitalTypes[0])
    } else {
      setSelectedCapitalType('FDI') // 기본값
    }
  }, [capitalTypes])

  // 뉴스 데이터 가져오기
  const fetchNews = async () => {
    if (!selectedCapitalType) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        year: year.toString(),
        dummy: useDummyData.toString()
      })

      if (country) params.append('country', country)
      if (sector) params.append('sector', sector)
      if (selectedCapitalType) params.append('capital_type', selectedCapitalType)

      const response = await fetch(`http://localhost:8001/api/v1/capitalflows/news/?${params}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setNewsData(data.news_data)
      } else {
        throw new Error(data.error || '뉴스 데이터를 가져오는데 실패했습니다')
      }

    } catch (err: any) {
      console.error('News fetch error:', err)
      setError(err.message || '뉴스를 불러오는 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  // 필터가 변경될 때마다 뉴스 갱신
  useEffect(() => {
    if (selectedCapitalType) {
      fetchNews()
    }
  }, [year, country, sector, selectedCapitalType, useDummyData])

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  // 뉴스 카드 렌더링
  const renderNewsCard = (article: NewsArticle, index: number) => (
    <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        {/* 이미지 */}
        <div className="flex-shrink-0">
          {article.urlToImage ? (
            <img
              src={article.urlToImage}
              alt=""
              className="w-24 h-16 object-cover rounded"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <div className="w-24 h-16 bg-gray-200 rounded flex items-center justify-center">
              <span className="text-gray-400 text-xs">📰</span>
            </div>
          )}
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">
            <a 
              href={article.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-blue-600 transition-colors"
            >
              {article.title}
            </a>
          </h4>
          
          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
            {article.description}
          </p>
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="font-medium">{article.source.name}</span>
            <span>{formatDate(article.publishedAt)}</span>
          </div>
          
          {article.relevanceScore && (
            <div className="mt-1">
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">관련도:</span>
                <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${article.relevanceScore * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">{Math.round(article.relevanceScore * 100)}%</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">관련 뉴스</h3>
          <div className="text-sm text-gray-600">
            {year}년 {country && `${country} `}
            {sector && `${sector} 분야 `}
            {selectedCapitalType && `${selectedCapitalType} `}
            관련 최신 뉴스
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* 데이터 소스 토글 */}
          <div className="flex items-center">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={useDummyData}
                onChange={(e) => setUseDummyData(e.target.checked)}
                className="sr-only"
              />
              <div className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
                useDummyData ? 'bg-amber-500' : 'bg-blue-600'
              }`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  useDummyData ? 'translate-x-6' : 'translate-x-1'
                } mt-1`}/>
              </div>
              <span className="ml-2 text-xs text-gray-600">
                {useDummyData ? '더미' : '실제'}
              </span>
            </label>
          </div>

          {/* 새로고침 버튼 */}
          <button
            onClick={fetchNews}
            disabled={loading}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              loading 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            }`}
          >
            {loading ? '로딩 중...' : '새로고침'}
          </button>
        </div>
      </div>

      {/* 자본 타입 선택 */}
      {capitalTypes && capitalTypes.length > 1 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            뉴스 검색 자본 타입:
          </label>
          <div className="flex flex-wrap gap-2">
            {capitalTypes.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedCapitalType(type)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedCapitalType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 검색 정보 */}
      {newsData && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">
            <strong>검색 쿼리:</strong> {newsData.query}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            총 {newsData.count}개 기사 • 수집 시간: {formatDate(newsData.collected_at)}
            {newsData.articles.length > 0 && (
              <span className="ml-2 text-gray-400">
                • 출처: {Array.from(new Set(newsData.articles.map(a => a.source.name))).join(', ')}
              </span>
            )}
            <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
              useDummyData 
                ? 'bg-amber-100 text-amber-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              {useDummyData ? '테스트 데이터' : '실제 뉴스'}
            </span>
            {newsData.note && (
              <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">
                {newsData.note}
              </span>
            )}
          </div>
          {/* 경고 메시지 표시 */}
          {(newsData as any).warnings && (newsData as any).warnings.length > 0 && (
            <div className="mt-2 text-xs text-orange-600">
              <strong>경고:</strong> {(newsData as any).warnings.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* 컨텐츠 */}
      <div className="space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-gray-600">뉴스를 검색하고 있습니다...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="text-red-600">⚠️</span>
              <div>
                <h4 className="text-sm font-medium text-red-900">오류 발생</h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={fetchNews}
              className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors"
            >
              다시 시도
            </button>
          </div>
        )}

        {newsData && newsData.articles.length > 0 && (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {newsData.articles.map((article, index) => renderNewsCard(article, index))}
          </div>
        )}

        {newsData && newsData.articles.length === 0 && !loading && (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-2">📰</div>
            <p className="text-gray-600">해당 조건에 맞는 뉴스가 없습니다.</p>
            <p className="text-sm text-gray-500 mt-1">다른 필터를 시도해보세요.</p>
          </div>
        )}
      </div>
    </div>
  )
}
