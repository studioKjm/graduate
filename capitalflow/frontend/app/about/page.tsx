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
            글로벌 자본 흐름을 지도, 차트, 뉴스 등 다양한 시각화 형태로 제공하는 
            웹 애플리케이션입니다. World Bank, IMF, FRED, SEC 등 공식 기관 데이터를 통해 
            완전한 자본 이동 지도를 구축합니다.
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
              <li>1995-2024년 30년간의 글로벌 자본 흐름 변화</li>
              <li>FDI, FPI, VC, PE, MA, IPO, BONDS, SWF, GREENFIELD, JV, DEVFIN 등 11개 자본 유형별 분석</li>
              <li>다양한 추정 방법을 통한 완전한 자본 흐름 지도</li>
              <li>20개 핵심 분야별 자본 투입 현황</li>
              <li>실시간 데이터 업데이트 및 시각화</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">핵심 기능</h2>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>1995-2024년 인터랙티브 세계 지도 시각화</li>
              <li>부드러운 시간축 애니메이션 재생</li>
              <li>11개 자본 유형별 다중 필터링</li>
              <li>다양한 방법의 데이터 추정 및 보완</li>
              <li>실시간 뉴스 연동 및 분석</li>
              <li>관리자 대시보드 및 데이터 관리</li>
            </ul>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">현재 사용 중인 데이터 출처</h2>
          
          {/* 주요 국제기구 - 실제 사용 중 */}
          <div className="mb-12">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">주요 국제기구</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">World Bank</h4>
                <p className="text-gray-600 text-sm">
                  FDI, FPI 데이터 - 국제 직접투자 및 포트폴리오 투자 통계
                </p>
                <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">활성</span>
              </div>
              <div className="text-center bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">IMF</h4>
                <p className="text-gray-600 text-sm">
                  국제수지 및 자본계정 통계 - 공식 금융 데이터
                </p>
                <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">활성</span>
              </div>
              <div className="text-center bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">UNCTAD</h4>
                <p className="text-gray-600 text-sm">
                  세계투자보고서 및 글로벌 FDI 데이터
                </p>
                <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">활성</span>
              </div>
              <div className="text-center bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">BIS</h4>
                <p className="text-gray-600 text-sm">
                  국제결제은행 은행 간 자본 흐름 통계
                </p>
                <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">활성</span>
              </div>
            </div>
          </div>

          {/* 중앙은행 및 금융기관 - 실제 사용 중 */}
          <div className="mb-12">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">중앙은행 및 금융기관</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="text-center bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                <h4 className="text-lg font-semibold text-gray-900 mb-1">FRED (Fed)</h4>
                <p className="text-gray-600 text-sm">미국 연준 경제 데이터 - BONDS, FPI, VC, PE, IPO</p>
                <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">활성</span>
              </div>
              <div className="text-center bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                <h4 className="text-lg font-semibold text-gray-900 mb-1">SEC EDGAR</h4>
                <p className="text-gray-600 text-sm">미국 증권거래위원회 - MA, IPO, VC 기업 공시</p>
                <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">활성</span>
              </div>
              <div className="text-center bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                <h4 className="text-lg font-semibold text-gray-900 mb-1">한국은행 (BOK)</h4>
                <p className="text-gray-600 text-sm">ECOS 경제통계시스템 - 한국 자본 흐름 데이터</p>
                <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">활성</span>
              </div>
            </div>
          </div>

          {/* 민간 데이터 제공업체 - 실제 사용 중 */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">민간 데이터 제공업체</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Alpha Vantage</h4>
                <p className="text-gray-600 text-sm">금융 시장 데이터 - FPI, VC, PE, IPO, BONDS</p>
                <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">활성</span>
              </div>
              <div className="text-center bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Yahoo Finance</h4>
                <p className="text-gray-600 text-sm">주식 시장 데이터 - FPI, VC, PE, IPO</p>
                <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">활성</span>
              </div>
              <div className="text-center bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">GlobalSWF</h4>
                <p className="text-gray-600 text-sm">국부펀드 투자 데이터 - SWF 투자 현황</p>
                <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">활성</span>
              </div>
              <div className="text-center bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">데이터 추정</h4>
                <p className="text-gray-600 text-sm">유사 국가/분야 기반 추정, GDP 기반 추정 - 누락 데이터 보완</p>
                <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">활성</span>
              </div>
            </div>
          </div>

          {/* 데이터 처리 정보 */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 text-center">데이터 처리 방식</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-medium text-gray-900 mb-1">신뢰도 가중치</div>
                <p className="text-gray-600">IMF (0.95), World Bank (0.88), FRED (0.94), SEC (0.90), Alpha Vantage (0.75)</p>
              </div>
              <div className="text-center">
                <div className="font-medium text-gray-900 mb-1">데이터 융합</div>
                <p className="text-gray-600">다양한 추정 방법, 가중평균, 패턴 분석</p>
              </div>
              <div className="text-center">
                <div className="font-medium text-gray-900 mb-1">업데이트 주기</div>
                <p className="text-gray-600">실시간 (Alpha Vantage), 일일 (FRED), 연간 (World Bank, IMF)</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
