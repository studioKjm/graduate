'use client'

import { useState, useEffect, useMemo } from 'react'
import Map, { Source, Layer } from 'react-map-gl'
import DeckGL from '@deck.gl/react'
import { GeoJsonLayer, ArcLayer } from '@deck.gl/layers'
import { scaleSequential } from 'd3-scale'
import { interpolateBlues } from 'd3-scale-chromatic'
import 'mapbox-gl/dist/mapbox-gl.css'

// Mapbox 토큰 (환경변수에서 가져오기)
const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoidGVzdCIsImEiOiJjbGZ5a2htbWswZjkyM3dwYjFud3QzaDQ3In0.example'

interface MapVisualizationProps {
  year?: number
  sector?: string
  capitalType?: string
  visualizationType?: 'choropleth' | 'flow' | 'both'
}

export default function MapVisualization({
  year = 2023,
  sector,
  capitalType,
  visualizationType = 'choropleth'
}: MapVisualizationProps) {
  const [viewState, setViewState] = useState({
    longitude: 0,
    latitude: 30,
    zoom: 2,
    pitch: 0,
    bearing: 0
  })

  const [mapData, setMapData] = useState<any>(null)
  const [flowData, setFlowData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // 색상 스케일 생성
  const colorScale = useMemo(() => {
    return scaleSequential(interpolateBlues).domain([0, 1])
  }, [])

  // 데이터 가져오기 (실제 지도 데이터 + 더미 자본 데이터)
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        // 실제 세계 지도 GeoJSON 데이터 로드
        const geoResponse = await fetch('/world-countries-detailed.json')
        const worldData = await geoResponse.json()
        
        // 국가별 더미 자본 데이터 생성
        const capitalData = {
          'USA': { total_capital: 1000000, intensity: 1.0 },
          'CHN': { total_capital: 800000, intensity: 0.8 },
          'JPN': { total_capital: 600000, intensity: 0.6 },
          'DEU': { total_capital: 500000, intensity: 0.5 },
          'GBR': { total_capital: 450000, intensity: 0.45 },
          'FRA': { total_capital: 400000, intensity: 0.4 },
          'KOR': { total_capital: 350000, intensity: 0.35 },
          'CAN': { total_capital: 300000, intensity: 0.3 },
          'AUS': { total_capital: 250000, intensity: 0.25 },
          'IND': { total_capital: 200000, intensity: 0.2 },
          'BRA': { total_capital: 180000, intensity: 0.18 },
          'RUS': { total_capital: 150000, intensity: 0.15 },
        }
        
        // GeoJSON 피처에 자본 데이터 추가
        const enrichedFeatures = worldData.features.map((feature: any) => {
          const countryCode = feature.properties.ISO_A3 || feature.properties.ADM0_A3
          const capitalInfo = capitalData[countryCode as keyof typeof capitalData] || {
            total_capital: Math.random() * 100000,
            intensity: Math.random() * 0.1
          }
          
          return {
            ...feature,
            properties: {
              ...feature.properties,
              country_code: countryCode,
              country_name: feature.properties.NAME || feature.properties.NAME_EN,
              total_capital: capitalInfo.total_capital,
              intensity: capitalInfo.intensity
            }
          }
        })
        
        const mapData = {
          type: 'FeatureCollection',
          features: enrichedFeatures
        }

        const dummyFlowData = [
          {
            source: [-122.4, 37.8], // San Francisco
            target: [116.4, 39.9],  // Beijing
            flow_amount: 500000,
            flow_intensity: 0.8
          },
          {
            source: [2.3, 48.9], // Paris
            target: [139.7, 35.7], // Tokyo
            flow_amount: 300000,
            flow_intensity: 0.6
          },
          {
            source: [127.0, 37.5], // Seoul
            target: [-74.0, 40.7], // New York
            flow_amount: 400000,
            flow_intensity: 0.7
          },
          {
            source: [0.1, 51.5], // London
            target: [77.2, 28.6], // New Delhi
            flow_amount: 250000,
            flow_intensity: 0.5
          }
        ]

        setMapData(mapData)
        setFlowData(dummyFlowData)
      } catch (error) {
        console.error('Failed to load map data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [year, sector, capitalType])

  // Deck.GL 레이어 구성
  const layers = useMemo(() => {
    const layerList = []

    // Choropleth 레이어
    if ((visualizationType === 'choropleth' || visualizationType === 'both') && mapData) {
      layerList.push(
        new GeoJsonLayer({
          id: 'countries',
          data: mapData,
          pickable: true,
          stroked: true,
          filled: true,
          extruded: false,
          lineWidthScale: 1,
          lineWidthMinPixels: 1,
          lineWidthMaxPixels: 3,
          getFillColor: (d: any) => {
            const intensity = d.properties.intensity || 0
            // RGB 색상을 직접 계산
            const baseColor = [59, 130, 246] // primary-500 색상
            const alpha = Math.max(0.2, intensity) // 최소 투명도 0.2
            return [
              baseColor[0] + (255 - baseColor[0]) * (1 - alpha),
              baseColor[1] + (255 - baseColor[1]) * (1 - alpha),
              baseColor[2] + (255 - baseColor[2]) * (1 - alpha),
              200
            ]
          },
          getLineColor: [255, 255, 255, 255], // 흰색 경계선
          getLineWidth: (d: any) => {
            // 데이터가 있는 국가는 더 두꺼운 경계선
            return d.properties.intensity > 0.1 ? 2 : 1
          },
          updateTriggers: {
            getFillColor: [year, sector, capitalType],
            getLineWidth: [year, sector, capitalType]
          },
          onHover: ({ object, x, y }: any) => {
            if (object) {
              console.log('Hovered country:', object.properties.country_name, 'Capital:', object.properties.total_capital)
            }
          }
        })
      )
    }

    // Flow 레이어
    if ((visualizationType === 'flow' || visualizationType === 'both') && flowData.length > 0) {
      layerList.push(
        new ArcLayer({
          id: 'flows',
          data: flowData,
          pickable: true,
          getWidth: (d: any) => Math.max(2, d.flow_intensity * 8),
          getSourcePosition: (d: any) => d.source,
          getTargetPosition: (d: any) => d.target,
          getSourceColor: [255, 140, 0, 180],
          getTargetColor: [255, 200, 0, 180],
          onHover: ({ object, x, y }: any) => {
            // TODO: 플로우 툴팁 표시 로직 추가
            if (object) {
              console.log('Hovered flow amount:', object.flow_amount)
            }
          }
        })
      )
    }

    return layerList
  }, [mapData, flowData, visualizationType, colorScale])

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">지도 데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative">
      <DeckGL
        viewState={viewState}
        onViewStateChange={({viewState}) => setViewState(viewState)}
        controller={true}
        layers={layers}
        getTooltip={({ object }) => {
          if (object) {
            if (object.properties) {
              // Choropleth 툴팁
              return {
                html: `
                  <div class="bg-white p-3 rounded shadow-lg border max-w-xs">
                    <h3 class="font-semibold text-gray-900">${object.properties.country_name}</h3>
                    <p class="text-sm text-gray-600">총 자본: $${(object.properties.total_capital || 0).toLocaleString()}M</p>
                    <p class="text-sm text-gray-600">강도: ${((object.properties.intensity || 0) * 100).toFixed(1)}%</p>
                  </div>
                `,
                style: {
                  backgroundColor: 'transparent',
                  fontSize: '14px'
                }
              }
            } else {
              // Flow 툴팁
              return {
                html: `
                  <div class="bg-white p-3 rounded shadow-lg border max-w-xs">
                    <h3 class="font-semibold text-gray-900">자본 흐름</h3>
                    <p class="text-sm text-gray-600">금액: $${(object.flow_amount || 0).toLocaleString()}M</p>
                    <p class="text-sm text-gray-600">강도: ${((object.flow_intensity || 0) * 100).toFixed(1)}%</p>
                  </div>
                `,
                style: {
                  backgroundColor: 'transparent',
                  fontSize: '14px'
                }
              }
            }
          }
          return null
        }}
      >
        <Map
          mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
          mapStyle="mapbox://styles/mapbox/light-v10"
          style={{ width: '100%', height: '100%' }}
          onError={(error) => {
            console.log('Map error:', error)
            // Mapbox 토큰 오류 무시
          }}
        />
      </DeckGL>
    </div>
  )
}
