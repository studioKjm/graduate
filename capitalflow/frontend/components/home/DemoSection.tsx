import { PlayIcon } from '@heroicons/react/24/solid'

export default function DemoSection() {
  return (
    <div className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            실제 동작을 확인해보세요
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            AI 분야 글로벌 투자 흐름의 변화를 시간축으로 살펴보는 예시입니다.
          </p>
        </div>

        <div className="mt-12">
          <div className="relative rounded-lg overflow-hidden shadow-xl">
            {/* 임시 데모 영상 플레이스홀더 */}
            <div className="aspect-w-16 aspect-h-9 bg-gradient-to-br from-blue-900 to-indigo-900">
              <div className="flex items-center justify-center">
                <div className="text-center text-white">
                  <button className="inline-flex items-center justify-center w-20 h-20 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-all duration-200 group">
                    <PlayIcon className="h-8 w-8 text-white ml-1 group-hover:scale-110 transition-transform duration-200" />
                  </button>
                  <p className="mt-4 text-lg font-medium">
                    데모 영상 재생
                  </p>
                  <p className="text-sm opacity-80">
                    실제 시각화 화면을 미리 체험해보세요
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600">200+</div>
              <div className="mt-2 text-sm font-medium text-gray-900">국가 데이터</div>
              <div className="text-xs text-gray-500">전 세계 투자 정보</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600">50+</div>
              <div className="mt-2 text-sm font-medium text-gray-900">산업 분야</div>
              <div className="text-xs text-gray-500">세부 카테고리 분석</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600">1970~</div>
              <div className="mt-2 text-sm font-medium text-gray-900">시계열 데이터</div>
              <div className="text-xs text-gray-500">50년간의 변화 추적</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
