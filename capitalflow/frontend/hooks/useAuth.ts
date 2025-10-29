'use client'

import { useState, useEffect } from 'react'

interface User {
  id: number
  username: string
  email: string
}

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 로그인 상태 확인
    const checkAuth = () => {
      const accessToken = localStorage.getItem('access_token')
      const refreshToken = localStorage.getItem('refresh_token')
      
      setIsLoading(true)
      
      if (accessToken && refreshToken) {
        // 토큰에서 사용자 정보 추출
        try {
          const userInfo = JSON.parse(atob(accessToken.split('.')[1]))
          setUser({
            id: userInfo.user_id,
            username: userInfo.username,
            email: userInfo.email || '',
          })
          setIsAuthenticated(true)
        } catch (error) {
          console.error('Failed to parse token:', error)
          setIsAuthenticated(false)
          setUser(null)
        }
      } else {
        setIsAuthenticated(false)
        setUser(null)
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
    setIsAuthenticated(false)
    setUser(null)
    
    // 커스텀 이벤트 발생 (로그아웃 시에도 Navbar 업데이트)
    setTimeout(() => {
      window.dispatchEvent(new Event('auth-state-change'))
    }, 100)
  }

  return {
    isAuthenticated,
    user,
    isLoading,
    logout,
  }
}

