import Link from 'next/link'
import { ArrowRightIcon, PlayIcon } from '@heroicons/react/24/outline'

export default function Hero() {
  return (
    <div className="relative bg-gradient-to-br from-blue-50 via-white to-indigo-50 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="relative z-10 pb-8 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
          <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
            <div className="sm:text-center lg:text-left">
              <h1 className="text-4xl tracking-tight font-bold text-gray-900 sm:text-5xl md:text-6xl">
                <span className="block xl:inline">글로벌 자본의</span>{' '}
                <span className="block text-gradient xl:inline">흐름을 보다</span>
              </h1>
              <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                글로벌 자본 흐름을 지도, 차트, 뉴스 등 다양한 시각화 형태로 제공합니다. 
                World Bank, IMF, FRED, SEC 등 공식 기관 데이터를 통해 
                완전한 자본 이동 지도를 구축합니다.
              </p>
              <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                <div className="rounded-md shadow">
                  <Link
                    href="/map"
                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 md:py-4 md:text-lg md:px-10 transition-colors duration-200"
                  >
                    지도 시작하기
                    <ArrowRightIcon className="ml-2 h-5 w-5" />
                  </Link>
                </div>
                <div className="mt-3 sm:mt-0 sm:ml-3">
                  <button className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 md:py-4 md:text-lg md:px-10 transition-colors duration-200">
                    <PlayIcon className="mr-2 h-5 w-5" />
                    데모 보기
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
      <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
        <div className="h-56 w-full bg-gradient-to-br from-primary-400 to-blue-600 sm:h-72 md:h-96 lg:w-full lg:h-full flex items-center justify-center">
          {/* 여기에 나중에 미니 지도 미리보기나 애니메이션을 추가할 수 있습니다 */}
          <div className="text-white text-center">
            <div className="text-6xl mb-4">🌍</div>
            <p className="text-xl font-semibold">글로벌 자본 흐름</p>
            <p className="text-sm opacity-90 mt-2">실시간 시각화</p>
          </div>
        </div>
      </div>
    </div>
  )
}
