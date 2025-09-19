# CapitalFlow - 글로벌 자본 흐름 시각화

글로벌 자본 흐름을 시각적으로 탐색하고 시대별 자본 권력의 이동을 분석하는 웹 애플리케이션입니다.

## 🌟 주요 기능

- **인터랙티브 세계 지도**: 국가별 자본 총량을 색상 농도로 시각화
- **시간축 애니메이션**: 1970년부터 현재까지의 자본 흐름 변화를 애니메이션으로 재생
- **다중 필터링**: 연도, 분야, 자본 타입별 세밀한 데이터 필터링
- **Flow Map 시각화**: 국가 간 자본 이동 경로를 화살표로 표시
- **데이터 분석**: 트렌드 분석, 순위, 인사이트 제공
- **사용자 맞춤형 대시보드**: 관심 분야·국가 즐겨찾기

## 🛠 기술 스택

### 프론트엔드
- **Framework**: Next.js 14, React 18, TypeScript
- **시각화**: Deck.gl, Mapbox GL JS, D3.js
- **스타일링**: Tailwind CSS
- **상태관리**: Zustand, React Query
- **폼 관리**: React Hook Form + Zod

### 백엔드
- **Framework**: Django 4.2, Django REST Framework
- **데이터베이스**: PostgreSQL, TimescaleDB (시계열 데이터)
- **캐시**: Redis
- **비동기 작업**: Celery
- **인증**: JWT (Simple JWT)

### 인프라
- **컨테이너화**: Docker, Docker Compose
- **웹서버**: Nginx (리버스 프록시)
- **모니터링**: Prometheus, Grafana (추후 구현)

## 📊 데이터 출처

- **World Bank**: 국제 직접투자(FDI) 및 다자간 투자 데이터
- **IMF**: 국제수지 및 자본계정 통계
- **OECD**: OECD 국가 간 투자 통계 및 분야별 데이터
- **UN**: 국제연합 글로벌 투자 동향 보고서

## 🚀 빠른 시작

### 사전 요구사항

- Docker & Docker Compose
- Node.js 18+ (로컬 개발시)
- Python 3.11+ (로컬 개발시)

### 환경 설정

1. 저장소 클론
```bash
git clone <repository-url>
cd capitalflow
```

2. 환경변수 설정
```bash
cp .env.example .env
# .env 파일을 편집하여 필요한 설정 입력
```

3. Mapbox 토큰 설정
```bash
# .env 파일에 Mapbox 토큰 추가
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
```

### Docker를 사용한 실행

1. 개발 환경 실행
```bash
docker-compose up -d
```

2. 초기 데이터 마이그레이션
```bash
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
```

3. 애플리케이션 접속
- 프론트엔드: http://localhost:3000
- 백엔드 API: http://localhost:8000/api/v1
- Django Admin: http://localhost:8000/admin

### 로컬 개발 환경

#### 백엔드 설정

1. 가상환경 생성 및 활성화
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

2. 패키지 설치
```bash
pip install -r requirements.txt
```

3. 데이터베이스 마이그레이션
```bash
python manage.py migrate
python manage.py createsuperuser
```

4. 개발 서버 실행
```bash
python manage.py runserver
```

#### 프론트엔드 설정

1. 패키지 설치
```bash
cd frontend
npm install
```

2. 개발 서버 실행
```bash
npm run dev
```

## 📁 프로젝트 구조

```
capitalflow/
├── backend/                 # Django 백엔드
│   ├── capitalflow/        # 메인 프로젝트 설정
│   ├── core/               # 핵심 모델 (Country, Sector, CapitalFlow)
│   ├── api/                # REST API 엔드포인트
│   ├── data_management/    # ETL 및 데이터 처리
│   ├── visualization/      # 시각화 설정
│   ├── analytics/          # 데이터 분석 및 인사이트
│   └── requirements.txt
├── frontend/               # Next.js 프론트엔드
│   ├── app/               # App Router 페이지
│   ├── components/        # React 컴포넌트
│   ├── lib/              # 유틸리티 라이브러리
│   ├── hooks/            # 커스텀 훅
│   ├── stores/           # 상태 관리
│   └── types/            # TypeScript 타입 정의
├── nginx/                 # Nginx 설정
├── docker-compose.yml     # 개발용 Docker 구성
├── docker-compose.prod.yml # 프로덕션용 Docker 구성
└── README.md
```

## 🗃 주요 API 엔드포인트

### 인증
- `POST /api/v1/auth/register/` - 회원가입
- `POST /api/v1/auth/login/` - 로그인
- `POST /api/v1/auth/token/refresh/` - 토큰 갱신

### 데이터 조회
- `GET /api/v1/countries/` - 국가 목록
- `GET /api/v1/sectors/` - 분야 목록
- `GET /api/v1/capital-types/` - 자본 타입 목록
- `GET /api/v1/capital-flows/` - 자본 흐름 데이터

### 시각화
- `GET /api/v1/visualization/map/` - 지도 시각화 데이터
- `GET /api/v1/visualization/flow/` - 플로우 시각화 데이터

### 분석
- `GET /api/v1/analytics/trends/` - 트렌드 분석
- `GET /api/v1/analytics/rankings/` - 순위 분석

## 🔧 개발 가이드

### 백엔드 개발

1. 새로운 앱 생성
```bash
python manage.py startapp app_name
```

2. 모델 변경 후 마이그레이션
```bash
python manage.py makemigrations
python manage.py migrate
```

3. 테스트 실행
```bash
python manage.py test
```

### 프론트엔드 개발

1. 새로운 컴포넌트 생성
```bash
# components/ 디렉토리에 생성
```

2. 타입 검사
```bash
npm run type-check
```

3. 린트 검사
```bash
npm run lint
```

## 🌐 배포

### 프로덕션 환경 배포

1. 환경변수 설정
```bash
cp .env.example .env
# 프로덕션 환경에 맞게 수정
```

2. 프로덕션 빌드
```bash
docker-compose -f docker-compose.prod.yml up -d
```

3. SSL 인증서 설정 (선택사항)
```bash
# nginx/ssl/ 디렉토리에 인증서 파일 배치
```

## 📈 성능 최적화

- **캐싱**: Redis를 통한 API 응답 캐싱
- **데이터베이스 최적화**: 인덱스 및 쿼리 최적화
- **이미지 최적화**: Next.js Image 컴포넌트 사용
- **번들 최적화**: 코드 스플리팅 및 트리 셰이킹

## 🔒 보안

- **인증**: JWT 토큰 기반 인증
- **CORS**: 적절한 CORS 정책 설정
- **HTTPS**: 프로덕션 환경에서 SSL/TLS 적용
- **보안 헤더**: Nginx를 통한 보안 헤더 설정

## 🤝 기여 방법

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참고하세요.

## 📞 문의

- 이메일: contact@capitalflow.com
- 프로젝트 링크: [https://github.com/your-username/capitalflow](https://github.com/your-username/capitalflow)

---

⭐ 이 프로젝트가 도움이 되었다면 스타를 눌러주세요!
