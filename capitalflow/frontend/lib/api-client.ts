/**
 * API 클라이언트 - 중앙화된 에러 핸들링 및 재시도 로직
 */

interface RequestOptions extends RequestInit {
  timeout?: number
  retries?: number
}

class ApiClient {
  private baseURL: string

  constructor() {
    // 환경 변수에서 백엔드 URL 가져오기
    // NEXT_PUBLIC_API_URL은 전체 API URL을 포함할 수 있음 (예: https://backend.onrender.com/api/v1)
    // 또는 기본 URL만 포함할 수 있음 (예: https://backend.onrender.com)
    let envURL = process.env.NEXT_PUBLIC_API_URL || ''
    
    // 환경 변수가 설정되지 않은 경우 기본값 사용
    if (!envURL) {
      // 개발 환경 기본값
      envURL = 'http://localhost:8001'
    }
    
    // /api/v1이 포함되어 있으면 제거 (API 호출 시 /api/v1을 포함하므로)
    if (envURL.includes('/api/v1')) {
      envURL = envURL.replace('/api/v1', '').replace(/\/+$/, '')
    }
    
    // baseURL은 백엔드의 기본 URL만 포함 (예: https://backend.onrender.com)
    this.baseURL = envURL.replace(/\/+$/, '')
    
    console.log('🔧 ApiClient initialized with baseURL:', this.baseURL)
  }

  /**
   * 요청 타임아웃 처리
   */
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${timeout}ms`))
      }, timeout)
    })
  }

  /**
   * 인증 헤더 가져오기
   */
  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }
    
    return headers
  }

  /**
   * fetch 요청 래퍼 - 타임아웃 및 에러 핸들링
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestOptions = {}
  ): Promise<Response> {
    const { timeout = 30000, retries = 3, ...fetchOptions } = options

    // URL 구성
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`
    
    console.log('🔍 API Request:', {
      originalUrl: url,
      baseURL: this.baseURL,
      fullUrl: fullUrl,
      method: fetchOptions.method || 'GET'
    })

    // 인증 헤더 추가
    const headers = {
      ...this.getAuthHeaders(),
      ...fetchOptions.headers,
    }

    // fetch와 timeout 경쟁
    const fetchPromise = fetch(fullUrl, {
      ...fetchOptions,
      headers,
    })

    const timeoutPromise = this.createTimeoutPromise(timeout)

    try {
      const response = await Promise.race([fetchPromise, timeoutPromise])

      if (!response.ok) {
        // 404 에러 처리
        if (response.status === 404) {
          throw new Error(`API endpoint not found: ${fullUrl}`)
        }
        
        // 401 Unauthorized는 재시도하지 않음 (인증 실패)
        if (response.status === 401) {
          const errorText = await response.text()
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }
        
        // 기타 HTTP 에러 처리
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      return response
    } catch (error: any) {
      // 에러 상세 로깅
      console.error('❌ [API] Request failed:', {
        url: fullUrl,
        error: error.message,
        errorType: error.name,
        stack: error.stack
      })
      
      // 401 에러는 재시도하지 않음
      if (error.message?.includes('401')) {
        throw error
      }
      
      // 타임아웃 또는 네트워크 에러만 재시도
      if (retries > 0) {
        console.warn(`⚠️ [API] Request failed, retrying... (${retries} attempts left)`)
        await new Promise((resolve) => setTimeout(resolve, 1000)) // 1초 대기
        return this.fetchWithTimeout(url, { ...options, retries: retries - 1 })
      }
      throw error
    }
  }

  /**
   * GET 요청
   */
  async get(url: string, options: RequestOptions = {}): Promise<any> {
    try {
      const response = await this.fetchWithTimeout(url, {
        ...options,
        method: 'GET',
      })
      return await response.json()
    } catch (error) {
      console.error('GET request error:', error)
      throw error
    }
  }

  /**
   * POST 요청
   */
  async post(url: string, data: any, options: RequestOptions = {}): Promise<any> {
    try {
      const response = await this.fetchWithTimeout(url, {
        ...options,
        method: 'POST',
        body: JSON.stringify(data),
      })
      return await response.json()
    } catch (error) {
      console.error('POST request error:', error)
      throw error
    }
  }

  /**
   * PUT 요청
   */
  async put(url: string, data: any, options: RequestOptions = {}): Promise<any> {
    try {
      const response = await this.fetchWithTimeout(url, {
        ...options,
        method: 'PUT',
        body: JSON.stringify(data),
      })
      return await response.json()
    } catch (error) {
      console.error('PUT request error:', error)
      throw error
    }
  }

  /**
   * DELETE 요청
   */
  async delete(url: string, options: RequestOptions = {}): Promise<any> {
    try {
      const response = await this.fetchWithTimeout(url, {
        ...options,
        method: 'DELETE',
      })
      return await response.json()
    } catch (error) {
      console.error('DELETE request error:', error)
      throw error
    }
  }
}

// 싱글톤 인스턴스 생성
export const apiClient = new ApiClient()

export default apiClient

