# 📍 지도 데이터 저장 위치 완전 가이드

## 📊 데이터 저장 위치 개요

### 1️⃣ 데이터베이스 (PostgreSQL)

#### 위치
- **파일 경로**: `/Users/jimin/graduate/capitalflow/backend/`
- **데이터베이스명**: `capitalflow` (기본값) 또는 `.env`의 `DB_NAME`
- **테이블명**: `raw_capital_data` (주요 지도 데이터 저장 테이블)

#### 데이터베이스 접속 정보
```python
# settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'capitalflow',  # DB_NAME 환경변수
        'USER': 'postgres',      # DB_USER 환경변수
        'PASSWORD': 'postgres',  # DB_PASSWORD 환경변수 (민감 정보)
        'HOST': 'localhost',     # DB_HOST 환경변수
        'PORT': '5432',         # DB_PORT 환경변수
    }
}
```

### 2️⃣ 데이터 저장 테이블 구조

#### 📋 주요 테이블 목록

##### 1. `raw_capital_data` - 🌟 핵심 지도 데이터
**역할**: 지도에 표시되는 실제 자본 흐름 데이터

**주요 필드**:
- `country` (FK): 국가 (예: KOR, USA, CHN)
- `sector` (FK): 분야 (예: 인공지능, 반도체, 바이오)
- `capital_type` (FK): 자본 타입 (예: FDI, VC, PE)
- `year`: 연도 (1995-2024)
- `amount_usd`: USD로 환산된 금액 ⭐ (지도에 표시되는 값)
- `is_estimated`: 추정 데이터 여부
- `confidence_score`: 신뢰도 점수

**데이터 접근 경로**:
```python
# Django ORM
RawCapitalData.objects.filter(year=2024, sector__name='인공지능')

# API 엔드포인트
GET http://localhost:8001/api/v1/visualization/map-data/?year=2024&sector=AI&capital_types=FDI&capital_types=VC
```

##### 2. `countries` - 국가 정보
**역할**: 국가 데이터 (코드, 이름, 위치 좌표)

**주요 필드**:
- `code`: 국가 코드 (PK) - ISO-3166 (예: KOR, USA)
- `name`: 국가명 (한글)
- `name_en`: 국가명 (영문)
- `latitude`: 위도 ⭐ (지도 위치)
- `longitude`: 경도 ⭐ (지도 위치)

**데이터 접근 경로**:
```python
# Django ORM
Country.objects.all()
Country.objects.get(code='KOR')
```

##### 3. `sectors` - 분야 정보
**역할**: 산업 분야 데이터

**주요 필드**:
- `code`: 분야 코드 (PK) (예: AI, BIO)
- `name`: 분야명 (한글) (예: 인공지능, 바이오)
- `name_en`: 분야명 (영문)

**데이터 접근 경로**:
```python
# Django ORM
Sector.objects.filter(code='AI')
```

##### 4. `capital_types` - 자본 타입 정보
**역할**: 자본 유형 데이터

**주요 필드**:
- `code`: 자본 타입 코드 (PK) (예: FDI, VC, PE)
- `name`: 자본 타입명 (예: 외국인직접투자, 벤처캐피탈)
- `name_en`: 자본 타입명 (영문)

**데이터 접근 경로**:
```python
# Django ORM
CapitalType.objects.filter(code__in=['FDI', 'VC'])
```

##### 5. `processed_capital_data` - 정제된 데이터
**역할**: 여러 소스 데이터를 융합한 최종 데이터 (현재 미사용)

**주요 필드**:
- `final_amount_usd`: 융합된 최종 금액
- `confidence_score`: 신뢰도 점수
- `fusion_method`: 융합 방법

##### 6. `data_sources` - 데이터 소스 정보
**역할**: 데이터 출처 정보

**주요 필드**:
- `name`: 소스명 (예: World Bank, IMF)
- `reliability_weight`: 신뢰도 가중치

##### 7. `news_data` - 뉴스 데이터
**역할**: 지도 하단에 표시되는 관련 뉴스

**주요 필드**:
- `year`: 연도
- `sector`: 분야
- `capital_type`: 자본 타입
- `title`: 뉴스 제목
- `url`: 뉴스 링크

**데이터 접근 경로**:
```python
# Django ORM
NewsData.objects.filter(year=2024, sector='AI', is_active=True)

# API 엔드포인트
GET http://localhost:8001/api/v1/capitalflows/news/?year=2024&sector=AI&capital_type=VC
```

### 3️⃣ API 엔드포인트

#### 지도 데이터 API
```
GET http://localhost:8001/api/v1/visualization/map-data/
```

**쿼리 파라미터**:
- `year`: 연도 (1995-2024)
- `sector`: 분야 코드 (AI, BIO, SEMICONDUCTOR 등)
- `capital_types`: 자본 타입 코드 (FDI, VC, PE 등, 여러 개 가능)

**응답 형식**:
```json
{
  "success": true,
  "data": {
    "countries": {
      "KOR": { "capital_amount": 1000000000 },
      "USA": { "capital_amount": 5000000000 },
      ...
    }
  }
}
```

#### 뉴스 데이터 API
```
GET http://localhost:8001/api/v1/capitalflows/news/
```

**쿼리 파라미터**:
- `year`: 연도
- `sector`: 분야 코드
- `capital_type`: 자본 타입 코드
- `country`: 국가 코드 (선택)

**응답 형식**:
```json
{
  "success": true,
  "news_data": {
    "articles": [
      {
        "title": "...",
        "url": "...",
        "source": { "name": "..." },
        "publishedAt": "..."
      }
    ],
    "count": 10
  }
}
```

### 4️⃣ 파일 시스템

#### 소스 코드 위치
```
/Users/jimin/graduate/capitalflow/
├── backend/
│   ├── apps/
│   │   ├── data/
│   │   │   ├── models.py          # 데이터 모델 정의
│   │   │   ├── views.py           # API 엔드포인트
│   │   │   ├── services/          # 데이터 수집 서비스
│   │   │   └── migrations/        # 데이터베이스 마이그레이션
│   │   └── visualization/
│   │       ├── views.py           # 지도 API
│   │       └── urls.py
│   └── capitalflow/
│       └── settings/              # 데이터베이스 설정
├── frontend/
│   ├── app/
│   │   └── map/
│   │       └── page.tsx          # 지도 페이지
│   └── components/
│       └── map/                   # 지도 컴포넌트
└── .env                            # 데이터베이스 접속 정보
```

### 5️⃣ 데이터 흐름

```
1. 외부 API (World Bank, IMF 등)
   ↓
2. DataCollectionService (backend/apps/data/services/)
   ↓
3. RawCapitalData 테이블 저장
   ↓
4. visualization/views.py에서 조회
   ↓
5. API 응답 (캐시: 5분)
   ↓
6. Frontend에서 지도 표시
```

### 6️⃣ 캐시 시스템

#### 캐시 위치
- **메모리 캐시**: Django 캐시 프레임워크 사용
- **캐시 키**: `map_data_{year}_{sector}_{capital_types}` (MD5 해시)
- **캐시 시간**: 5분 (300초)

#### 캐시 적용 위치
```python
# backend/visualization/views.py
cache_key = f"map_data_{year}_{sector}_{'_'.join(sorted(capital_types))}"
cached_data = cache.get(cache_key)  # 캐시 확인
cache.set(cache_key, response_data, 300)  # 캐시 저장
```

### 7️⃣ 데이터 타입별 저장 위치 요약

| 데이터 타입 | 테이블명 | 주요 필드 | API 엔드포인트 |
|------------|---------|----------|--------------|
| **지도 자본 데이터** | `raw_capital_data` | `amount_usd`, `year`, `country`, `sector`, `capital_type` | `/api/v1/visualization/map-data/` |
| **국가 정보** | `countries` | `code`, `name`, `latitude`, `longitude` | (내부 사용) |
| **분야 정보** | `sectors` | `code`, `name` | (내부 사용) |
| **자본 타입** | `capital_types` | `code`, `name` | (내부 사용) |
| **뉴스 데이터** | `news_data` | `title`, `url`, `year`, `sector` | `/api/v1/capitalflows/news/` |
| **데이터 소스** | `data_sources` | `name`, `reliability_weight` | (내부 사용) |

### 8️⃣ 실제 데이터 확인 방법

#### Django 관리자 페이지
```
http://localhost:8001/admin
```

#### 직접 데이터베이스 조회
```bash
cd /Users/jimin/graduate/capitalflow/backend
source venv/bin/activate
python manage.py shell
```

```python
# Shell에서 실행
from apps.data.models import RawCapitalData, Country, Sector

# 2024년 데이터 확인
data_2024 = RawCapitalData.objects.filter(year=2024)
print(f"2024년 데이터: {data_2024.count()}개")

# 국가별 데이터 확인
country_data = RawCapitalData.objects.filter(country__code='KOR', year=2024)
print(f"한국 2024년 데이터: {country_data.count()}개")

# 분야별 데이터 확인
sector_data = RawCapitalData.objects.filter(sector__code='AI', year=2024)
print(f"인공지능 2024년 데이터: {sector_data.count()}개")
```

#### API로 직접 조회
```bash
# 2024년 인공지능 분야 FDI 데이터
curl "http://localhost:8001/api/v1/visualization/map-data/?year=2024&sector=AI&capital_types=FDI"

# 2024년 바이오 분야 VC 데이터
curl "http://localhost:8001/api/v1/visualization/map-data/?year=2024&sector=BIO&capital_types=VC"
```

### 9️⃣ 데이터 수집 과정

#### 데이터 수집 위치
- **서비스 파일**: `backend/apps/data/services/data_collectors.py`
- **데이터 소스**: World Bank, IMF, FRED, SEC, Alpha Vantage 등

#### 수집 프로세스
```
1. DataCollectionService 시작
2. 외부 API 호출 (World Bank 등)
3. 데이터 가져오기
4. 전처리 및 정제
5. RawCapitalData 테이블에 저장
```

### 🔟 정리

**지도에 표시되는 실제 데이터가 저장되는 위치**:
1. **데이터베이스 테이블**: `raw_capital_data` (PostgreSQL)
2. **파일 경로**: `/Users/jimin/graduate/capitalflow/backend/` (데이터베이스 설정)
3. **API 엔드포인트**: `http://localhost:8001/api/v1/visualization/map-data/`
4. **주요 필드**: `amount_usd` (지도에 표시되는 금액)
5. **관리자 페이지**: `http://localhost:8001/admin` (데이터 조회/수정)

**접근 방법**:
- **프론트엔드**: API를 통해 자동으로 조회
- **백엔드**: Django ORM 또는 직접 SQL 조회
- **수동 확인**: 관리자 페이지 또는 API 직접 호출
