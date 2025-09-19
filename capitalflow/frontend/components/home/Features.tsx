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
    description: '국가별 자본 총량을 색상 농도로 직관적으로 시각화합니다.',
    icon: MapIcon,
  },
  {
    name: '시간축 애니메이션',
    description: '1970년부터 현재까지의 자본 흐름 변화를 애니메이션으로 재생할 수 있습니다.',
    icon: PlayIcon,
  },
  {
    name: '다중 필터링',
    description: '연도, 분야, 자본 타입별로 세밀한 데이터 필터링이 가능합니다.',
    icon: FunnelIcon,
  },
  {
    name: 'Flow Map 시각화',
    description: '국가 간 자본 이동 경로를 화살표로 표시하여 자본의 흐름을 추적합니다.',
    icon: ArrowPathIcon,
  },
  {
    name: '데이터 분석',
    description: '트렌드 분석, 순위, 인사이트 등 다양한 분석 기능을 제공합니다.',
    icon: ChartBarIcon,
  },
  {
    name: '글로벌 커버리지',
    description: '전 세계 200여 개국의 투자 데이터를 포괄적으로 다룹니다.',
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
