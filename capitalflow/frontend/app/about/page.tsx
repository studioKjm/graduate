import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About - CapitalFlow',
  description: 'CapitalFlow 프로젝트에 대해 자세히 알아보세요.',
}

export default function AboutPage() {
  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            CapitalFlow 소개
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
            글로벌 자본 흐름을 시각적으로 탐색하고 시대별 자본 권력의 이동을 분석하는 웹 애플리케이션입니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">프로젝트 목표</h2>
            <p className="text-gray-600 mb-4">
              CapitalFlow는 복잡한 글로벌 자본 흐름 데이터를 직관적이고 이해하기 쉬운 시각화로 변환하여, 
              사용자가 다음과 같은 인사이트를 얻을 수 있도록 합니다:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>국가별, 분야별 자본 유입·유출 현황</li>
              <li>시간축 기반 자본 흐름 변화</li>
              <li>산업별 글로벌 패권 구조 변화</li>
              <li>국가 간 자본 이동 경로</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">핵심 기능</h2>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>인터랙티브 세계 지도 시각화</li>
              <li>시간축 애니메이션 재생</li>
              <li>다중 필터링 (연도, 분야, 자본 타입)</li>
              <li>실시간 Flow Map 표시</li>
              <li>사용자 맞춤형 대시보드</li>
              <li>데이터 분석 및 인사이트</li>
            </ul>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">데이터 출처</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">World Bank</h3>
              <p className="text-gray-600">
                국제 직접투자(FDI) 및 다자간 투자 데이터
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">IMF</h3>
              <p className="text-gray-600">
                국제수지 및 자본계정 통계
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">OECD</h3>
              <p className="text-gray-600">
                OECD 국가 간 투자 통계 및 분야별 데이터
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">기술 스택</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">프론트엔드</h4>
              <p className="text-sm text-gray-600">Next.js, React, TypeScript</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">시각화</h4>
              <p className="text-sm text-gray-600">Deck.gl, Mapbox, D3.js</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">백엔드</h4>
              <p className="text-sm text-gray-600">Django, PostgreSQL</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">인프라</h4>
              <p className="text-sm text-gray-600">Docker, Redis, Celery</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
