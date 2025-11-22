import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      if (typeof window !== 'undefined') {
        const refreshToken = localStorage.getItem('refresh_token')
        
        if (refreshToken) {
          try {
            const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
              refresh: refreshToken,
            })
            
            const { access } = response.data
            localStorage.setItem('access_token', access)
            
            // Retry the original request
            originalRequest.headers.Authorization = `Bearer ${access}`
            return api(originalRequest)
          } catch (refreshError) {
            // Refresh failed, redirect to login
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
            window.location.href = '/auth/login'
          }
        } else {
          // No refresh token, redirect to login
          window.location.href = '/auth/login'
        }
      }
    }

    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (credentials: { username: string; password: string }) =>
    api.post('/auth/login/', credentials),
  
  register: (userData: {
    username: string
    email: string
    password: string
    password_confirm: string
    first_name: string
    last_name: string
  }) => api.post('/auth/register/', userData),
  
  refreshToken: (refreshToken: string) =>
    api.post('/auth/token/refresh/', { refresh: refreshToken }),
}

// Countries API
export const countriesAPI = {
  getAll: () => api.get('/countries/'),
  getRegions: () => api.get('/countries/regions/'),
}

// Sectors API
export const sectorsAPI = {
  getAll: () => api.get('/sectors/'),
  getTree: () => api.get('/sectors/tree/'),
}

// Capital Types API
export const capitalTypesAPI = {
  getAll: () => api.get('/capital-types/'),
}

// Capital Flows API
export const capitalFlowsAPI = {
  getAll: (params?: {
    year?: number
    sector?: string
    capital_type?: string
    source_country?: string
    target_country?: string
  }) => api.get('/capital-flows/', { params }),
}

// Country Totals API
export const countryTotalsAPI = {
  getAll: (params?: {
    year?: number
    sector?: string
    capital_type?: string
  }) => api.get('/country-totals/', { params }),
}

// Visualization API
export const visualizationAPI = {
  getMapData: (params: {
    year: number
    sector?: string
    capital_type?: string
  }) => api.get('/visualization/map/', { params }),
  
  getFlowData: (params: {
    year: number
    sector?: string
    capital_type?: string
    min_amount?: number
  }) => api.get('/visualization/flow/', { params }),
}

// Analytics API
export const analyticsAPI = {
  getTrends: (params?: {
    sector?: string
    capital_type?: string
    start_year?: number
    end_year?: number
  }) => api.get('/analytics/trends/', { params }),
  
  getRankings: (params?: {
    year?: number
    sector?: string
    capital_type?: string
    metric?: string
  }) => api.get('/analytics/rankings/', { params }),
  
  getInsights: (params?: {
    year?: number
    sector?: string
    capital_type?: string
  }) => api.get('/analytics/insights/', { params }),
}

// Data Summary API
export const dataAPI = {
  getSummary: () => api.get('/data/summary/'),
}

// User Preferences API
export const userPreferencesAPI = {
  get: () => api.get('/user-preferences/'),
  update: (preferences: any) => api.patch('/user-preferences/', preferences),
}

export default api
