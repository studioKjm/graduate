'use client'

import { useState, useEffect } from 'react'

export default function DebugColorMap() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return <div className="w-full h-full bg-gray-200 flex items-center justify-center">로딩...</div>
  }

  return (
    <div className="w-full h-full bg-gray-100">
      <svg width="100%" height="100%" viewBox="0 0 800 400">
        {/* 배경 */}
        <rect width="800" height="400" fill="#f0f9ff" />
        
        {/* 테스트 사각형들 - 다양한 색상 */}
        <rect x="50" y="50" width="100" height="80" fill="#1e40af" stroke="#fff" strokeWidth="2" />
        <text x="100" y="95" textAnchor="middle" fill="white" fontSize="12">미국</text>
        <text x="100" y="110" textAnchor="middle" fill="white" fontSize="10">#1e40af</text>
        
        <rect x="200" y="50" width="100" height="80" fill="#3b82f6" stroke="#fff" strokeWidth="2" />
        <text x="250" y="95" textAnchor="middle" fill="white" fontSize="12">중국</text>
        <text x="250" y="110" textAnchor="middle" fill="white" fontSize="10">#3b82f6</text>
        
        <rect x="350" y="50" width="100" height="80" fill="#60a5fa" stroke="#fff" strokeWidth="2" />
        <text x="400" y="95" textAnchor="middle" fill="white" fontSize="12">일본</text>
        <text x="400" y="110" textAnchor="middle" fill="white" fontSize="10">#60a5fa</text>
        
        <rect x="500" y="50" width="100" height="80" fill="#93c5fd" stroke="#fff" strokeWidth="2" />
        <text x="550" y="95" textAnchor="middle" fill="white" fontSize="12">독일</text>
        <text x="550" y="110" textAnchor="middle" fill="white" fontSize="10">#93c5fd</text>
        
        <rect x="650" y="50" width="100" height="80" fill="#dbeafe" stroke="#fff" strokeWidth="2" />
        <text x="700" y="95" textAnchor="middle" fill="black" fontSize="12">영국</text>
        <text x="700" y="110" textAnchor="middle" fill="black" fontSize="10">#dbeafe</text>
        
        {/* 반도체 분야 (보라색) */}
        <rect x="50" y="200" width="100" height="80" fill="#7c3aed" stroke="#fff" strokeWidth="2" />
        <text x="100" y="245" textAnchor="middle" fill="white" fontSize="12">한국</text>
        <text x="100" y="260" textAnchor="middle" fill="white" fontSize="10">#7c3aed</text>
        
        <rect x="200" y="200" width="100" height="80" fill="#a855f7" stroke="#fff" strokeWidth="2" />
        <text x="250" y="245" textAnchor="middle" fill="white" fontSize="12">대만</text>
        <text x="250" y="260" textAnchor="middle" fill="white" fontSize="10">#a855f7</text>
        
        {/* 바이오 분야 (녹색) */}
        <rect x="350" y="200" width="100" height="80" fill="#16a34a" stroke="#fff" strokeWidth="2" />
        <text x="400" y="245" textAnchor="middle" fill="white" fontSize="12">스위스</text>
        <text x="400" y="260" textAnchor="middle" fill="white" fontSize="10">#16a34a</text>
        
        <rect x="500" y="200" width="100" height="80" fill="#4ade80" stroke="#fff" strokeWidth="2" />
        <text x="550" y="245" textAnchor="middle" fill="black" fontSize="12">덴마크</text>
        <text x="550" y="260" textAnchor="middle" fill="black" fontSize="10">#4ade80</text>
        
        {/* 에너지 분야 (노란색) */}
        <rect x="650" y="200" width="100" height="80" fill="#eab308" stroke="#fff" strokeWidth="2" />
        <text x="700" y="245" textAnchor="middle" fill="black" fontSize="12">노르웨이</text>
        <text x="700" y="260" textAnchor="middle" fill="black" fontSize="10">#eab308</text>
        
        {/* 제목 */}
        <text x="400" y="30" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#1f2937">
          색상 표시 테스트
        </text>
        
        {/* 설명 */}
        <text x="400" y="350" textAnchor="middle" fontSize="14" fill="#6b7280">
          각 사각형이 다른 색상으로 표시되어야 합니다
        </text>
        
        <text x="400" y="370" textAnchor="middle" fontSize="12" fill="#6b7280">
          만약 모든 사각형이 흰색이나 같은 색이면 브라우저/CSS 문제입니다
        </text>
      </svg>
    </div>
  )
}
