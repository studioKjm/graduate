'use client'

import { useState, useEffect } from 'react'
import apiClient from '@/lib/api-client'

interface User {
  id: number
  username: string
  email: string
  is_staff?: boolean  // 관리자 여부
  is_superuser?: boolean  // 슈퍼유저 여부
}

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)  // 관리자 여부 상태

  useEffect(() => {
    // 로그인 상태 확인
    const checkAuth = async () => {
      const accessToken = localStorage.getItem('access_token')
      const refreshToken = localStorage.getItem('refresh_token')
      const storedUser = localStorage.getItem('user_info')  // 저장된 사용자 정보
      
      setIsLoading(true)
      
      // 토큰이 없으면 즉시 인증 실패 처리
      if (!accessToken || !refreshToken) {
        console.log('🔒 토큰 없음 - 인증되지 않음')
        setIsAuthenticated(false)
        setUser(null)
        setIsAdmin(false)
        setIsLoading(false)
        return
      }
      
      if (accessToken && refreshToken) {
        // 저장된 사용자 정보가 있으면 사용 (관리자 정보 포함)
        if (storedUser) {
          try {
            const userInfo = JSON.parse(storedUser)
            console.log('🔍 사용자 정보 로드 (localStorage):', userInfo)
            setUser(userInfo)
            setIsAuthenticated(true)
            const adminStatus = userInfo.is_staff === true || userInfo.is_superuser === true
            setIsAdmin(adminStatus)
            console.log('👤 관리자 여부:', adminStatus, { is_staff: userInfo.is_staff, is_superuser: userInfo.is_superuser })
            setIsLoading(false)
            return
          } catch (error) {
            console.error('Failed to parse stored user info:', error)
            // 파싱 실패 시 백엔드에서 가져오기
          }
        }
        
        // 저장된 사용자 정보가 없거나 파싱 실패 시 백엔드에서 가져오기
        try {
          console.log('📡 백엔드에서 사용자 정보 가져오기...')
          const userInfo = await apiClient.get('/api/v1/auth/me/')
          console.log('✅ 사용자 정보 가져오기 성공:', userInfo)
          
          const userData = {
            id: userInfo.user_id,
            username: userInfo.username,
            email: userInfo.email || '',
            is_staff: userInfo.is_staff === true,
            is_superuser: userInfo.is_superuser === true,
          }
          
          // localStorage에 저장
          localStorage.setItem('user_info', JSON.stringify(userData))
          
          setUser(userData)
          setIsAuthenticated(true)
          const adminStatus = userData.is_staff === true || userData.is_superuser === true
          setIsAdmin(adminStatus)
          console.log('👤 관리자 여부 (백엔드):', adminStatus, { is_staff: userData.is_staff, is_superuser: userData.is_superuser })
        } catch (error: any) {
          console.error('❌ 백엔드에서 사용자 정보 가져오기 실패:', error)
          // 백엔드 요청 실패 시 토큰에서 기본 정보만 추출
          try {
            const tokenInfo = JSON.parse(atob(accessToken.split('.')[1]))
            setUser({
              id: tokenInfo.user_id,
              username: tokenInfo.username,
              email: tokenInfo.email || '',
            })
            setIsAuthenticated(true)
            setIsAdmin(false)  // 토큰에는 관리자 정보가 없으므로 false
            console.log('⚠️ 토큰에서만 사용자 정보 추출 (관리자 정보 없음)')
          } catch (tokenError) {
            console.error('Failed to parse token:', tokenError)
            setIsAuthenticated(false)
            setUser(null)
            setIsAdmin(false)
          }
        }
      } else {
        setIsAuthenticated(false)
        setUser(null)
        setIsAdmin(false)
      }
      setIsLoading(false)
    }

    // 초기 확인
    checkAuth()

    // 커스텀 이벤트 리스너 추가
    const handleAuthChange = () => {
      checkAuth()
    }
    
    window.addEventListener('auth-state-change', handleAuthChange)
    window.addEventListener('storage', handleAuthChange)
    
    // cleanup
    return () => {
      window.removeEventListener('auth-state-change', handleAuthChange)
      window.removeEventListener('storage', handleAuthChange)
    }
  }, []) // 의존성 배열 비움

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_info')  // 사용자 정보도 삭제
    setIsAuthenticated(false)
    setUser(null)
    setIsAdmin(false)
    
    // 커스텀 이벤트 발생 (로그아웃 시에도 Navbar 업데이트)
    setTimeout(() => {
      window.dispatchEvent(new Event('auth-state-change'))
    }, 100)
  }

  return {
    isAuthenticated,
    user,
    isLoading,
    isAdmin,  // 관리자 여부 반환
    logout,
  }
}

