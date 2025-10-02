export interface DataSource {
  id: string
  name: string
  description: string
  source_type: string
  reliability_level: string
  reliability_weight: number
  is_active: boolean
}

export interface ProcessingLog {
  id: string
  processing_type: string
  status: string
  source_name?: string
  country_name?: string
  sector_name?: string
  year_start?: number
  year_end?: number
  records_processed: number
  records_success: number
  records_failed: number
  start_time: string
  end_time?: string
  duration_seconds?: number
  error_message?: string
}

export interface SystemStats {
  status: string
  statistics: {
    processed_data_count: number
    raw_data_count: number
    active_sources: number
    latest_processing: any
  }
}

export interface APITestResult {
  success: boolean
  data?: any
  error?: string
  duration: number
}

export interface CollectionProgress {
  current: number
  total: number
  source: string
  status: 'idle' | 'collecting' | 'processing' | 'completed' | 'error'
  startTime: number | null
  estimatedTime: number | null
}

export interface DataQuality {
  totalRecords: number
  bySource: Array<{source: string, count: number, avgConfidence: number}>
  byCountry: Array<{country: string, count: number, avgConfidence: number}>
  bySector: Array<{sector: string, count: number, avgConfidence: number}>
  byYear: Array<{year: number, count: number, avgConfidence: number}>
  missingData: Array<{country: string, sector: string, capitalType: string, year: number}>
}

export interface CollectionStats {
  totalCollected: number
  totalProcessed: number
  successRate: number
  avgProcessingTime: number
  overallCollectionRate?: number
  totalPossibleCombinations?: number
  lastCollection: string | null
}

export interface DetailedStats {
  yearStats: Array<{year: number, count: number, total_amount: number, avg_amount: number, collection_rate?: number}>
  countryStats: Array<{country__name: string, country__code: string, count: number, total_amount: number, avg_amount: number, collection_rate?: number}>
  sectorStats: Array<{sector__name: string, sector__code: string, count: number, total_amount: number, avg_amount: number, collection_rate?: number}>
  capitalTypeStats: Array<{capital_type__name: string, capital_type__code: string, count: number, total_amount: number, avg_amount: number, collection_rate?: number}>
  sourceStats: Array<{source__name: string, source__source_type: string, count: number, total_amount: number, avg_amount: number, avg_quality: number}>
  missingData: Array<{country: string, country_code: string, sector: string, sector_code: string, capital_type: string, capital_type_code: string, year: number}>
}
