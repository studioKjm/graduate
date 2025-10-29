# ⚙️ Tech Stack Overview

CapitalFlow는 데이터 수집·정제부터 시각화까지 전 과정을 자동화한 글로벌 자본 데이터 시각화 플랫폼입니다.

---

## 🧱 Backend

### Core Framework
- **Django**: 4.2.7
- **Django REST Framework**: 3.14.0
- **Python**: 3.11+

### 주요 기능
- **API 제공**: RESTful API 엔드포인트
- **인증 시스템**: JWT (djangorestframework-simplejwt 5.3.0)
- **데이터 처리**: ETL 파이프라인 자동화

### 주요 앱
```
backend/
├── core/              # 핵심 모델 (Countries, Sectors, CapitalTypes)
├── api/              # REST API 엔드포인트
├── apps/data/        # 데이터 모델 및 ETL 파이프라인
├── analytics/        # 데이터 분석
├── visualization/    # 시각화 데이터 제공
└── data_management/  # 데이터 관리 UI
```

### 백엔드 의존성
```python
# requirements.txt
Django==4.2.7
djangorestframework==3.14.0
djangorestframework-simplejwt==5.3.0
psycopg2-binary==2.9.9  # PostgreSQL
celery==5.3.4          # 비동기 작업
redis==5.0.1           # 캐싱
django-redis==5.4.0
pandas>=2.0.0          # 데이터 처리
numpy>=1.24.0
scikit-learn>=1.3.0   # ML 기능
beautifulsoup4>=4.12.0 # 웹 크롤링
```

---

## 💻 Frontend

### Core Framework
- **Next.js**: 14.0.3
- **React**: 18.2.0
- **TypeScript**: 5.2.2

### 주요 기능
- **시각화**: Deck.gl, Mapbox GL JS, D3.js, Recharts
- **상태 관리**: Zustand, React Query
- **UI 라이브러리**: Tailwind CSS, Headless UI

### 주요 페이지
```
frontend/app/
├── page.tsx          # 홈페이지
├── map/page.tsx      # 지도 시각화
├── about/page.tsx    # 소개
├── auth/             # 로그인/회원가입
├── admin/            # 관리자 대시보드
└── notice/page.tsx  # 공지사항
```

### 주요 컴포넌트
```
frontend/components/
├── map/              # 지도 관련 컴포넌트 (17개)
├── admin/            # 관리자 컴포넌트
├── charts/           # 차트 시각화
├── home/             # 홈페이지 컴포넌트
├── auth/             # 인증 컴포넌트
└── layout/           # 레이아웃 컴포넌트
```

### 프론트엔드 의존성
```json
{
  "@deck.gl/core": "^8.9.35",
  "@deck.gl/react": "^8.9.35",
  "mapbox-gl": "^2.15.0",
  "react-map-gl": "^7.1.7",
  "d3": "^7.8.5",
  "recharts": "^2.8.0",
  "next": "14.0.3",
  "react": "^18.2.0",
  "typescript": "^5.2.2",
  "tailwindcss": "^3.3.5"
}
```

---

## 🧮 Data Processing

### 데이터 수집
- **외부 API**: requests 라이브러리
- **웹 크롤링**: BeautifulSoup4, lxml
- **비동기 작업**: Celery + Redis

### 데이터 정제
- **Pandas**: 데이터 정제, 변환, 통합
- **NumPy**: 수치 계산 및 배열 연산
- **Scikit-learn**: 이상치 탐지 및 ML 예측

### 데이터 모델
```python
# 주요 모델
- Country: 국가 정보
- Sector: 분야/산업
- CapitalType: 자본 타입
- RawCapitalData: 원시 데이터
- ProcessedCapitalData: 정제된 데이터
- NewsData: 뉴스 데이터
- DataProcessingLog: 처리 로그
```

---

## 🗄️ Database

### 데이터베이스
- **Primary DB**: PostgreSQL
- **Development**: SQLite (db.sqlite3)
- **Migration**: Django ORM 사용

### 주요 테이블 구조
```
- countries      # 국가 정보 (ISO-3166)
- sectors        # 분야/산업 정보
- capital_types  # 자본 타입
- raw_capital_data          # 원시 데이터
- processed_capital_data    # 정제된 데이터
- news_data                 # 뉴스 데이터
- data_sources              # 데이터 소스
- data_processing_logs      # 처리 로그
```

---

## ☁️ Infrastructure

### 컨테이너화
- **Docker**: 애플리케이션 컨테이너화
- **Docker Compose**: 로컬 개발 환경
- **Dockerfile.prod**: 프로덕션 이미지

### 웹서버
- **Nginx**: 리버스 프록시
- **Gunicorn**: WSGI 서버

### 캐싱
- **Redis**: API 응답 캐싱 및 세션 관리
- **Django-Redis**: Redis 백엔드 통합

### 배포
- **개발 환경**: Docker Compose
- **프로덕션 환경**: AWS EC2 (예정)

---

## 🔧 개발 도구

### 버전 관리
- **Git**: 버전 관리
- **GitHub**: 소스코드 저장소

### 코드 품질
- **ESLint**: JavaScript 린팅
- **TypeScript**: 타입 체크
- **PEP 8**: Python 코드 스타일

### 테스트
- **pytest** (예정): 백엔드 테스트
- **Jest** (예정): 프론트엔드 테스트

---

## 📊 기술 스택 다이어그램

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Stack                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Next.js  │  │  React   │  │   TS    │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │Mapbox GL │  │ Deck.gl  │  │   D3.js  │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    Backend Stack                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Django  │  │  DRF     │  │ Celery   │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Pandas   │  │  NumPy   │  │  SciKit  │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   Infrastructure                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │PostgreSQL│  │  Redis   │  │  Docker  │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
```

---

📖 **더 자세한 정보**: [프로젝트 아키텍처](./architecture.md) | [데이터 흐름](./dataflow.md)
