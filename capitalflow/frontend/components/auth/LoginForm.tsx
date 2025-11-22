'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import apiClient from '@/lib/api-client'

const loginSchema = z.object({
  username: z.string().min(1, '사용자명을 입력해주세요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    try {
      const result = await apiClient.post('/api/v1/auth/login/', data)

      // 토큰 저장
      if (result.access && result.refresh) {
        localStorage.setItem('access_token', result.access)
        localStorage.setItem('refresh_token', result.refresh)
        
        // 사용자 정보 저장 (관리자 정보 포함)
        const userInfo = {
          id: result.user_id,
          username: result.username,
          email: result.email || '',
          is_staff: result.is_staff === true || result.is_staff === 'true' || result.is_staff === 1,  // boolean, 문자열, 숫자 처리
          is_superuser: result.is_superuser === true || result.is_superuser === 'true' || result.is_superuser === 1,  // boolean, 문자열, 숫자 처리
        }
        console.log('💾 사용자 정보 저장:', userInfo)
        console.log('👤 관리자 여부:', { is_staff: userInfo.is_staff, is_superuser: userInfo.is_superuser })
        console.log('📦 원본 응답:', { is_staff: result.is_staff, is_superuser: result.is_superuser })
        localStorage.setItem('user_info', JSON.stringify(userInfo))
        
        // 인증 상태 변경 이벤트 발생 (약간의 지연을 추가하여 React 상태 업데이트 확인)
        setTimeout(() => {
          window.dispatchEvent(new Event('auth-state-change'))
        }, 100)
        
        toast.success('로그인 성공!')
        
        // 관리자인 경우 관리자 페이지로, 일반 사용자는 지도 페이지로 이동
        if (userInfo.is_staff || userInfo.is_superuser) {
          router.push('/admin')
        } else {
          router.push('/map')
        }
      }
    } catch (error: any) {
      console.error('Login error:', error)
      
      // 에러 메시지에 따라 다르게 처리
      if (error.message?.includes('401') || error.message?.includes('Invalid credentials')) {
        toast.error('사용자명 또는 비밀번호가 올바르지 않습니다.')
      } else if (error.message?.includes('timeout')) {
        toast.error('서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.')
      } else if (error.message?.includes('404')) {
        toast.error('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.')
      } else {
        toast.error(error.message || '로그인 중 오류가 발생했습니다.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-4">
        <div>
          <label htmlFor="username" className="sr-only">
            사용자명
          </label>
          <input
            {...register('username')}
            type="text"
            autoComplete="username"
            placeholder="사용자명"
            className={`input-field ${errors.username ? 'border-red-500 focus:ring-red-500' : ''}`}
          />
          {errors.username && (
            <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
          )}
        </div>

        <div className="relative">
          <label htmlFor="password" className="sr-only">
            비밀번호
          </label>
          <input
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="비밀번호"
            className={`input-field pr-10 ${errors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeSlashIcon className="h-5 w-5 text-gray-400" />
            ) : (
              <EyeIcon className="h-5 w-5 text-gray-400" />
            )}
          </button>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
            로그인 상태 유지
          </label>
        </div>

        <div className="text-sm">
          <a
            href="#"
            className="font-medium text-primary-600 hover:text-primary-500"
          >
            비밀번호를 잊으셨나요?
          </a>
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
            isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? (
            <div className="flex items-center">
              <div className="loading-spinner h-4 w-4 mr-2" />
              로그인 중...
            </div>
          ) : (
            '로그인'
          )}
        </button>
      </div>

      {/* 소셜 로그인 (추후 구현) */}
      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">또는</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
            disabled
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="ml-2">Google</span>
          </button>

          <button
            type="button"
            className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
            disabled
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.024-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.748-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001.012.001z" />
            </svg>
            <span className="ml-2">Kakao</span>
          </button>
        </div>
      </div>
    </form>
  )
}
