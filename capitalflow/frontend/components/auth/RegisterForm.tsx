'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import apiClient from '@/lib/api-client'

const registerSchema = z.object({
  username: z
    .string()
    .min(1, '사용자명을 입력해주세요')
    .max(50, '사용자명은 최대 50자까지 가능합니다'),
  email: z
    .string()
    .email('올바른 이메일 주소를 입력해주세요'),
  password: z
    .string()
    .min(1, '비밀번호를 입력해주세요'),
  password_confirm: z
    .string()
    .min(1, '비밀번호 확인을 입력해주세요'),
  first_name: z
    .string()
    .min(1, '이름을 입력해주세요')
    .max(50, '이름은 최대 50자까지 가능합니다'),
  last_name: z
    .string()
    .min(1, '성을 입력해주세요')
    .max(50, '성은 최대 50자까지 가능합니다'),
  terms: z
    .boolean()
    .refine((val) => val === true, '이용약관에 동의해주세요'),
  privacy: z
    .boolean()
    .refine((val) => val === true, '개인정보처리방침에 동의해주세요'),
}).refine((data) => data.password === data.password_confirm, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['password_confirm'],
})

type RegisterFormData = z.infer<typeof registerSchema>

export default function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    try {
      const result = await apiClient.post('/api/v1/auth/register/', {
        username: data.username,
        email: data.email,
        password: data.password,
        password_confirm: data.password_confirm,
        first_name: data.first_name,
        last_name: data.last_name,
      })

      // 토큰 저장
      if (result.access && result.refresh) {
        localStorage.setItem('access_token', result.access)
        localStorage.setItem('refresh_token', result.refresh)
        
        // 인증 상태 변경 이벤트 발생 (약간의 지연을 추가하여 React 상태 업데이트 확인)
        setTimeout(() => {
          window.dispatchEvent(new Event('auth-state-change'))
        }, 100)
        
        toast.success('회원가입이 완료되었습니다!')
        router.push('/map')
      }
    } catch (error: any) {
      console.error('Register error:', error)
      
      // 에러 메시지에 따라 다르게 처리
      if (error.message?.includes('username')) {
        toast.error('이미 사용 중인 사용자명입니다.')
      } else if (error.message?.includes('email')) {
        toast.error('이미 등록된 이메일입니다.')
      } else if (error.message?.includes('timeout')) {
        toast.error('서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.')
      } else if (error.message?.includes('404')) {
        toast.error('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.')
      } else {
        toast.error(error.message || '회원가입 중 오류가 발생했습니다.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-4">
        {/* 사용자명 */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
            사용자명
          </label>
          <input
            {...register('username')}
            type="text"
            autoComplete="username"
            placeholder="사용자명"
            className={`mt-1 input-field ${errors.username ? 'border-red-500 focus:ring-red-500' : ''}`}
          />
          {errors.username && (
            <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
          )}
        </div>

        {/* 이메일 */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            이메일
          </label>
          <input
            {...register('email')}
            type="email"
            autoComplete="email"
            placeholder="이메일 주소"
            className={`mt-1 input-field ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        {/* 이름, 성 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
              이름
            </label>
            <input
              {...register('first_name')}
              type="text"
              autoComplete="given-name"
              placeholder="이름"
              className={`mt-1 input-field ${errors.first_name ? 'border-red-500 focus:ring-red-500' : ''}`}
            />
            {errors.first_name && (
              <p className="mt-1 text-sm text-red-600">{errors.first_name.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
              성
            </label>
            <input
              {...register('last_name')}
              type="text"
              autoComplete="family-name"
              placeholder="성"
              className={`mt-1 input-field ${errors.last_name ? 'border-red-500 focus:ring-red-500' : ''}`}
            />
            {errors.last_name && (
              <p className="mt-1 text-sm text-red-600">{errors.last_name.message}</p>
            )}
          </div>
        </div>

        {/* 비밀번호 */}
        <div className="relative">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            비밀번호
          </label>
          <input
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="비밀번호"
            className={`mt-1 input-field pr-10 ${errors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
          />
          <button
            type="button"
            className="absolute bottom-0 right-0 pr-3 flex items-center h-[42px]"
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

        {/* 비밀번호 확인 */}
        <div className="relative">
          <label htmlFor="password_confirm" className="block text-sm font-medium text-gray-700">
            비밀번호 확인
          </label>
          <input
            {...register('password_confirm')}
            type={showPasswordConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="비밀번호 확인"
            className={`mt-1 input-field pr-10 ${errors.password_confirm ? 'border-red-500 focus:ring-red-500' : ''}`}
          />
          <button
            type="button"
            className="absolute bottom-0 right-0 pr-3 flex items-center h-[42px]"
            onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
          >
            {showPasswordConfirm ? (
              <EyeSlashIcon className="h-5 w-5 text-gray-400" />
            ) : (
              <EyeIcon className="h-5 w-5 text-gray-400" />
            )}
          </button>
          {errors.password_confirm && (
            <p className="mt-1 text-sm text-red-600">{errors.password_confirm.message}</p>
          )}
        </div>
      </div>

      {/* 약관 동의 */}
      <div className="space-y-2">
        <div className="flex items-center">
          <input
            {...register('terms')}
            id="terms"
            type="checkbox"
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
            <a href="/terms" className="text-primary-600 hover:text-primary-500">
              이용약관
            </a>에 동의합니다 (필수)
          </label>
        </div>
        {errors.terms && (
          <p className="text-sm text-red-600">{errors.terms.message}</p>
        )}

        <div className="flex items-center">
          <input
            {...register('privacy')}
            id="privacy"
            type="checkbox"
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label htmlFor="privacy" className="ml-2 block text-sm text-gray-900">
            <a href="/privacy" className="text-primary-600 hover:text-primary-500">
              개인정보처리방침
            </a>에 동의합니다 (필수)
          </label>
        </div>
        {errors.privacy && (
          <p className="text-sm text-red-600">{errors.privacy.message}</p>
        )}
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
              가입 중...
            </div>
          ) : (
            '회원가입'
          )}
        </button>
      </div>
    </form>
  )
}
