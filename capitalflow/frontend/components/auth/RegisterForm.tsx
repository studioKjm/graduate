'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

const registerSchema = z.object({
  username: z
    .string()
    .min(3, '사용자명은 최소 3자 이상이어야 합니다')
    .max(20, '사용자명은 최대 20자까지 가능합니다')
    .regex(/^[a-zA-Z0-9_]+$/, '사용자명은 영문, 숫자, 언더스코어만 사용 가능합니다'),
  email: z
    .string()
    .email('올바른 이메일 주소를 입력해주세요'),
  password: z
    .string()
    .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '비밀번호는 대문자, 소문자, 숫자를 포함해야 합니다'),
  password_confirm: z
    .string()
    .min(1, '비밀번호 확인을 입력해주세요'),
  first_name: z
    .string()
    .min(1, '이름을 입력해주세요')
    .max(30, '이름은 최대 30자까지 가능합니다'),
  last_name: z
    .string()
    .min(1, '성을 입력해주세요')
    .max(30, '성은 최대 30자까지 가능합니다'),
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
      // TODO: 실제 API 호출로 대체
      const response = await fetch('/api/auth/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: data.username,
          email: data.email,
          password: data.password,
          password_confirm: data.password_confirm,
          first_name: data.first_name,
          last_name: data.last_name,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        // 토큰 저장
        localStorage.setItem('access_token', result.access)
        localStorage.setItem('refresh_token', result.refresh)
        
        toast.success('회원가입이 완료되었습니다!')
        router.push('/map')
      } else {
        const error = await response.json()
        if (error.username) {
          toast.error('이미 사용 중인 사용자명입니다.')
        } else if (error.email) {
          toast.error('이미 등록된 이메일입니다.')
        } else {
          toast.error('회원가입에 실패했습니다.')
        }
      }
    } catch (error) {
      console.error('Register error:', error)
      toast.error('회원가입 중 오류가 발생했습니다.')
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
            placeholder="사용자명 (영문, 숫자, _ 사용 가능)"
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
            placeholder="비밀번호 (8자 이상, 대소문자, 숫자 포함)"
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
