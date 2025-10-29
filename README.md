# 🌍 CapitalFlow: Global Capital Visualization Platform

> 전 세계 자본의 흐름을 한눈에 파악할 수 있는 오픈데이터 시각화 플랫폼

---

## 📑 프로젝트 개요

CapitalFlow는 전 세계 자본 흐름을 시각적으로 탐색하고 시대별 자본 권력의 이동을 분석하는 웹 애플리케이션입니다. Django REST Framework 백엔드와 Next.js 기반 프론트엔드를 통해 실시간 인터랙티브 맵 및 차트 시각화를 제공합니다.

### 주요 기능
- **인터랙티브 세계 지도**: 국가별 자본 총량을 색상 농도로 시각화
- **시간축 애니메이션**: 1970년부터 현재까지의 자본 흐름 변화를 애니메이션으로 재생
- **다중 필터링**: 연도, 분야, 자본 타입별 세밀한 데이터 필터링
- **Flow Map 시각화**: 국가 간 자본 이동 경로를 화살표로 표시
- **데이터 분석**: 트렌드 분석, 순위, 인사이트 제공
- **사용자 맞춤형 대시보드**: 관심 분야·국가 즐겨찾기

### 기술 스택
- **Backend**: Django 4.2, Django REST Framework, PostgreSQL
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Visualization**: Deck.gl, Mapbox GL JS, D3.js
- **Infrastructure**: Docker, Docker Compose, Nginx, Redis, Celery

---

## 📑 Documentation Index

| 구분 | 설명 | 링크 |
|------|------|------|
| ⚙️ 기술 스택 | 사용 기술 및 구성요소 설명 | [View Details](./docs/techstack.md) |
| 🔄 데이터 흐름 | 수집~시각화 전 과정 및 검증 로직 | [View Details](./docs/dataflow.md) |
| 🗓️ 개발 일정 | 단계별 진행계획 및 마일스톤 | [View Details](./docs/schedule.md) |
| 🏗️ 시스템 아키텍처 | 전체 구조 및 데이터 파이프라인 | [View Details](./docs/architecture.md) |

---

📘 **Main Repository:** [studioKjm/graduate](https://github.com/studioKjm/graduate)  
📊 **Demo:** [CapitalFlow Live Demo (예정)](https://capitalflow.app)  
📖 **Detailed README:** [View Full Documentation](./capitalflow/README.md)
