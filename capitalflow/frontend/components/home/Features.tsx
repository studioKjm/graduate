import { 
  MapIcon, 
  PlayIcon, 
  FunnelIcon, 
  ArrowPathIcon,
  ChartBarIcon,
  GlobeAltIcon 
} from '@heroicons/react/24/outline'

const features = [
  {
    name: '인터랙티브 세계 지도',
    description: '1995-2024년 30년간의 글로벌 자본 흐름을 색상 농도로 직관적으로 시각화합니다.',
    icon: MapIcon,
  },
  {
    name: '시간축 애니메이션',
    description: '1995년부터 2024년까지의 자본 흐름 변화를 부드러운 애니메이션으로 재생할 수 있습니다.',
    icon: PlayIcon,
  },
  {
    name: '11개 자본 유형',
    description: 'FDI, FPI, VC, PE, MA, IPO, BONDS, SWF, GREENFIELD, JV, DEVFIN 등 다양한 자본 유형을 지원합니다.',
    icon: FunnelIcon,
  },
  {
    name: '다양한 데이터 소스',
    description: 'World Bank, IMF, FRED, SEC 등 공식 기관과 Alpha Vantage, Yahoo Finance 등 금융 데이터를 통합합니다.',
    icon: ArrowPathIcon,
  },
  {
    name: '데이터 추정 및 보완',
    description: '유사 국가/분야 기반 추정, GDP 기반 추정 등 다양한 방법으로 누락 데이터를 보완합니다.',
    icon: ChartBarIcon,
  },
  {
    name: '전 세계 커버리지',
    description: '전 세계 200여 개국의 투자 데이터를 20개 핵심 분야별로 포괄적으로 다룹니다.',
    icon: GlobeAltIcon,
  },
]

export default function Features() {
  return (
    <div className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:text-center">
          <h2 className="text-base text-primary-600 font-semibold tracking-wide uppercase">
            핵심 기능
          </h2>
          <p className="mt-2 text-3xl leading-8 font-bold tracking-tight text-gray-900 sm:text-4xl">
            더 나은 자본 흐름 분석
          </p>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
            복잡한 글로벌 자본 데이터를 직관적인 시각화로 변환하여 
            새로운 인사이트를 발견하세요.
          </p>
        </div>

        <div className="mt-12">
          <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.name} className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
                    <feature.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">
                    {feature.name}
                  </p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">
                  {feature.description}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}
