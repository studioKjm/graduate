'use client'

interface DataSource {
  id: string
  name: string
  description: string
  source_type: string
  reliability_level: string
  reliability_weight: number
  is_active: boolean
}

interface DataSourceCardProps {
  source: DataSource
  onCollect: (sourceName: string) => void
  loading: boolean
}

export default function DataSourceCard({ source, onCollect, loading }: DataSourceCardProps) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'OFFICIAL': return 'bg-blue-100 text-blue-800'
      case 'PRIVATE_DB': return 'bg-purple-100 text-purple-800'
      case 'CRAWLER': return 'bg-orange-100 text-orange-800'
      case 'API': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getReliabilityColor = (level: string) => {
    switch (level) {
      case 'HIGH': return 'bg-green-100 text-green-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      case 'LOW': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{source.name}</h3>
          <p className="text-sm text-gray-600 mb-3">{source.description}</p>
          
          <div className="flex flex-wrap gap-2 mb-3">
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(source.source_type)}`}>
              {source.source_type}
            </span>
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getReliabilityColor(source.reliability_level)}`}>
              {source.reliability_level}
            </span>
            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
              가중치: {source.reliability_weight}
            </span>
          </div>
        </div>
        
        <div className="flex flex-col items-end space-y-2">
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            source.is_active 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {source.is_active ? 'Active' : 'Inactive'}
          </span>
          
          <button
            onClick={() => onCollect(source.name)}
            disabled={loading || !source.is_active}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '수집중...' : '데이터 수집'}
          </button>
        </div>
      </div>
      
      <div className="border-t pt-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">신뢰도 점수</span>
            <div className="flex items-center mt-1">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    source.reliability_weight >= 0.8 ? 'bg-green-500' :
                    source.reliability_weight >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${source.reliability_weight * 100}%` }}
                />
              </div>
              <span className="ml-2 text-xs font-medium">
                {(source.reliability_weight * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          
          <div>
            <span className="text-gray-500">최근 수집</span>
            <p className="text-xs text-gray-900 mt-1">2시간 전</p>
          </div>
        </div>
      </div>
    </div>
  )
}
