// Country types
export interface Country {
  id: number
  name: string
  code_iso2: string
  code_iso3: string
  region: string
  sub_region: string
  continent: string
  latitude: number | null
  longitude: number | null
}

// Sector types
export interface Sector {
  id: number
  name: string
  code: string
  description: string
  parent_sector: number | null
  parent_sector_name: string | null
  color_code: string
}

// Capital Type types
export interface CapitalType {
  id: number
  name: string
  code: string
  description: string
}

// Capital Flow types
export interface CapitalFlow {
  id: number
  year: number
  quarter: number | null
  month: number | null
  source_country: number
  source_country_name: string
  source_country_code: string
  target_country: number
  target_country_name: string
  target_country_code: string
  sector: number
  sector_name: string
  capital_type: number
  capital_type_name: string
  amount_usd: number
  data_source: string
  confidence_level: 'HIGH' | 'MEDIUM' | 'LOW'
}

// Country Total Capital types
export interface CountryTotalCapital {
  id: number
  country: number
  country_name: string
  country_code: string
  sector: number
  sector_name: string
  sector_code: string
  capital_type: number
  capital_type_name: string
  year: number
  total_inflow: number
  total_outflow: number
  net_flow: number
  flow_rank_global: number | null
  flow_percentile: number | null
}

// Map Visualization Data types
export interface MapVisualizationData {
  country_code: string
  country_name: string
  latitude: number
  longitude: number
  total_capital: number
  intensity: number
  rank: number
}

// Flow Visualization Data types
export interface FlowVisualizationData {
  source_country_code: string
  target_country_code: string
  source_lat: number
  source_lng: number
  target_lat: number
  target_lng: number
  flow_amount: number
  flow_intensity: number
}

// User types
export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
}

// User Preferences types
export interface UserPreference {
  favorite_countries: number[]
  favorite_countries_detail: Country[]
  favorite_sectors: number[]
  favorite_sectors_detail: Sector[]
  default_year_range_start: number
  default_year_range_end: number
  preferred_visualization: 'CHOROPLETH' | 'FLOW' | 'BOTH'
}

// Auth types
export interface LoginCredentials {
  username: string
  password: string
}

export interface RegisterData {
  username: string
  email: string
  password: string
  password_confirm: string
  first_name: string
  last_name: string
}

export interface AuthResponse {
  user_id: number
  username: string
  email: string
  refresh: string
  access: string
}

// API Response types
export interface ApiResponse<T> {
  data: T
  message?: string
  status: number
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

// Filter types
export interface MapFilters {
  year: number
  sector?: string
  capitalType?: string
  visualizationType: 'choropleth' | 'flow' | 'both'
}

export interface DataSummary {
  total_countries: number
  total_sectors: number
  total_capital_types: number
  total_flows: number
  year_range: {
    min: number
    max: number
  }
  total_amount: number
}

// Chart data types
export interface TimeSeriesData {
  year: number
  value: number
  sector?: string
  country?: string
}

export interface RankingData {
  rank: number
  country_name: string
  country_code: string
  value: number
  change_from_previous?: number
}

export interface TrendAnalysis {
  period: string
  growth_rate: number
  volatility: number
  trend_direction: 'up' | 'down' | 'stable'
  key_insights: string[]
}

// Visualization component props
export interface MapControlsProps {
  filters: MapFilters
  onFiltersChange: (filters: Partial<MapFilters>) => void
  isAnimating: boolean
  onAnimationToggle: (playing: boolean) => void
}

export interface MapLegendProps {
  visualizationType: 'choropleth' | 'flow' | 'both'
  maxValue: number
  minValue: number
  colorScale?: string[]
}

// Form validation types
export interface FormErrors {
  [key: string]: string | undefined
}

// Loading states
export interface LoadingState {
  isLoading: boolean
  error: string | null
}

// Map view state
export interface MapViewState {
  longitude: number
  latitude: number
  zoom: number
  pitch: number
  bearing: number
}

// Color scheme types
export interface ColorScheme {
  name: string
  colors: string[]
  description: string
}

// Export all types as a namespace
export namespace CapitalFlow {
  export type CountryType = Country
  export type SectorType = Sector
  export type CapitalFlowType = CapitalFlow
  export type MapDataType = MapVisualizationData
  export type FlowDataType = FlowVisualizationData
  export type FiltersType = MapFilters
  export type UserType = User
}
