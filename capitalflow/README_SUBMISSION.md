# Capital Flow Visualization System
## 글로벌 자본 흐름 시각화 시스템

### 프로젝트 개요
1995년부터 2024년까지 30년간의 글로벌 자본 흐름을 11개 자본 유형별로 시각화하고, World Bank, IMF, FRED, SEC 등 공식 기관 데이터와 다양한 추정 방법을 통해 완전한 자본 이동 지도를 제공하는 시스템입니다.

### 주요 기능
- **인터랙티브 세계 지도**: 실시간 자본 흐름 데이터 시각화
- **시간축 애니메이션**: 연도별 자본 흐름 변화 추적
- **다중 필터링**: 국가, 분야, 자본 타입별 데이터 필터링
- **다양한 데이터 소스**: 공식 기관 데이터 통합
- **데이터 추정 및 보완**: 누락 데이터 추정 알고리즘
- **글로벌 커버리지**: 전 세계 국가 데이터 포함

### 기술 스택
- **Backend**: Django, Django REST Framework, PostgreSQL, Redis
- **Frontend**: Next.js, React, TypeScript, Mapbox
- **Data Processing**: Python, Pandas, NumPy
- **Visualization**: D3.js, Mapbox GL JS

### 설치 및 실행

#### 1. 환경 설정
```bash
# 환경 변수 설정
cp .env.example .env
# .env 파일에서 필요한 API 키들을 설정하세요
```

#### 2. Backend 설정
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8001
```

#### 3. Frontend 설정
```bash
cd frontend
npm install
npm run dev
```

#### 4. 접속
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001/api/v1
- Admin: http://localhost:8001/admin

### 데이터 소스
- **World Bank**: FDI, FPI 데이터
- **IMF**: 국제수지 통계
- **FRED**: 미국 연방준비은행 경제 데이터
- **SEC EDGAR**: 미국 증권거래위원회 데이터
- **Alpha Vantage**: 금융 시장 데이터
- **Yahoo Finance**: 주식 시장 데이터
- **GlobalSWF**: 국가부채펀드 데이터
- **데이터 추정**: 누락 데이터 보완 알고리즘

### 프로젝트 구조
```
capitalflow/
├── backend/                 # Django 백엔드
│   ├── apps/
│   │   ├── data/           # 데이터 관리 앱
│   │   └── visualization/   # 시각화 앱
│   ├── capitalflow/        # Django 설정
│   └── requirements.txt    # Python 의존성
├── frontend/               # Next.js 프론트엔드
│   ├── app/               # 페이지 라우팅
│   ├── components/        # React 컴포넌트
│   └── package.json       # Node.js 의존성
└── README.md              # 프로젝트 문서
```

### 주요 컴포넌트
- **지도 시각화**: 실시간 자본 흐름 데이터 표시
- **데이터 관리**: 수집, 처리, 추정 파이프라인
- **뉴스 시스템**: 관련 뉴스 자동 수집 및 표시
- **관리자 대시보드**: 데이터 수집 및 관리 인터페이스

### 라이선스
이 프로젝트는 졸업작품으로 개발되었습니다.

### 개발자
- 개발자: [이름]
- 학과: [학과명]
- 연도: 2024
