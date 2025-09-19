import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Notice - CapitalFlow',
  description: 'CapitalFlow 서비스 공지사항을 확인하세요.',
}

// 임시 공지사항 데이터 (추후 API로 대체)
const notices = [
  {
    id: 1,
    title: '서비스 베타 오픈 안내',
    content: 'CapitalFlow 베타 서비스가 오픈되었습니다. 많은 관심과 피드백 부탁드립니다.',
    date: '2024-01-15',
    important: true,
  },
  {
    id: 2,
    title: '데이터 업데이트 안내',
    content: '2023년 4분기 글로벌 투자 데이터가 업데이트되었습니다.',
    date: '2024-01-10',
    important: false,
  },
  {
    id: 3,
    title: '시스템 점검 예정',
    content: '1월 20일 오전 2시-4시, 시스템 점검이 예정되어 있습니다.',
    date: '2024-01-08',
    important: true,
  },
]

export default function NoticePage() {
  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            공지사항
          </h1>
          <p className="text-xl text-gray-600">
            CapitalFlow 서비스 업데이트 및 중요 알림사항
          </p>
        </div>

        <div className="space-y-6">
          {notices.map((notice) => (
            <div
              key={notice.id}
              className={`card border-l-4 ${
                notice.important
                  ? 'border-l-red-500 bg-red-50'
                  : 'border-l-blue-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {notice.title}
                    </h3>
                    {notice.important && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        중요
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 mb-3">
                    {notice.content}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(notice.date).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-500">
            더 많은 공지사항은 추후 업데이트될 예정입니다.
          </p>
        </div>
      </div>
    </div>
  )
}
