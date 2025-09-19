const dataSources = [
  {
    name: 'World Bank',
    description: '국제 직접투자(FDI) 및 다자간 투자 데이터',
    logo: '🏦',
    url: 'https://www.worldbank.org/',
  },
  {
    name: 'IMF',
    description: '국제수지 및 자본계정 통계',
    logo: '💰',
    url: 'https://www.imf.org/',
  },
  {
    name: 'OECD',
    description: 'OECD 국가 간 투자 통계 및 분야별 데이터',
    logo: '📊',
    url: 'https://www.oecd.org/',
  },
  {
    name: 'UN',
    description: '국제연합 글로벌 투자 동향 보고서',
    logo: '🌐',
    url: 'https://unctad.org/',
  },
]

export default function DataSources() {
  return (
    <div className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            신뢰할 수 있는 데이터 출처
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            국제기구의 공식 데이터를 기반으로 정확하고 신뢰성 있는 분석을 제공합니다.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {dataSources.map((source) => (
            <div
              key={source.name}
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
            >
              <div>
                <span className="text-4xl mb-4 block">
                  {source.logo}
                </span>
                <div className="mt-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="focus:outline-none"
                    >
                      <span className="absolute inset-0" aria-hidden="true" />
                      {source.name}
                    </a>
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {source.description}
                  </p>
                </div>
              </div>
              <span
                className="pointer-events-none absolute top-6 right-6 text-gray-300 group-hover:text-gray-400"
                aria-hidden="true"
              >
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            모든 데이터는 정기적으로 업데이트되며, 데이터 품질과 정확성을 지속적으로 검증합니다.
          </p>
        </div>
      </div>
    </div>
  )
}
