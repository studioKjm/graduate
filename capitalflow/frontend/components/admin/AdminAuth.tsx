'use client'

import { useState } from 'react'

interface AdminAuthProps {
  onAuthenticated: () => void
}

export default function AdminAuth({ onAuthenticated }: AdminAuthProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // 간단한 패스워드 체크 (실제 환경에서는 서버 인증 필요)
    if (password === 'admin123' || password === 'capitalflow2025') {
      localStorage.setItem('admin_authenticated', 'true')
      onAuthenticated()
    } else {
      setError('잘못된 패스워드입니다.')
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            CapitalFlow
          </h1>
          <h2 className="text-xl font-semibold text-gray-700">
            관리자 인증
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            관리자 기능에 접근하려면 패스워드를 입력하세요
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                관리자 패스워드
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="패스워드를 입력하세요"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? '인증 중...' : '로그인'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">테스트 계정</span>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600 space-y-1">
              <div>• 패스워드: <code className="bg-gray-100 px-1 rounded">admin123</code></div>
              <div>• 또는: <code className="bg-gray-100 px-1 rounded">capitalflow2025</code></div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          이 페이지는 개발 및 테스트 목적으로만 사용됩니다.
        </p>
      </div>
    </div>
  )
}
