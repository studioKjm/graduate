# 다층 검증 & 빅데이터 자본 흐름 시스템 설정 가이드

## 🎯 개요

기존의 단순한 더미 데이터 방식에서 **다중 소스 수집 → 데이터 정제 → ML 기반 융합 → 신뢰도 검증** 시스템으로 완전히 개편되었습니다.

## 🔧 백엔드 설정

### 1. 마이그레이션 실행

```bash
cd /Users/jimin/graduate/capitalflow/backend

# 새로운 데이터 모델 마이그레이션 생성
python manage.py makemigrations data

# 마이그레이션 적용
python manage.py migrate
```

### 2. 메타데이터 초기화

```bash
# 국가, 분야, 자본타입, 데이터소스 기본 데이터 생성
python manage.py seed_metadata
```

### 3. 필수 패키지 설치

```bash
pip install scikit-learn pandas numpy joblib
```

### 4. Django 서버 시작

```bash
python manage.py runserver 0.0.0.0:8000
```

## 🌐 새로운 API 엔드포인트

### 1. 메인 자본 흐름 API

**엔드포인트**: `GET /api/v1/capitalflows/capitalflows/`

**쿼리 파라미터**:
- `country`: 국가 코드 (예: USA, CHN, KOR)
- `sector`: 분야 코드 (예: AI, SEMICONDUCTOR, BIO)
- `capital_type`: 단일 자본 타입 (예: FDI, VC, MA)
- `capital_types`: 다중 자본 타입 (예: ?capital_types=FDI&capital_types=VC)
- `year`: 특정 연도 (예: 2023)
- `year__gte`: 시작 연도 (예: 2020)
- `year__lte`: 종료 연도 (예: 2024)
- `aggregate`: 집계 모드 (true/false)

**예시 호출**:
```bash
# 2023년 AI 분야 VC+FDI 투자 집계
curl "http://localhost:8000/api/v1/capitalflows/capitalflows/?sector=AI&year=2023&capital_types=VC&capital_types=FDI&aggregate=true"

# 미국의 모든 분야 자본 흐름
curl "http://localhost:8000/api/v1/capitalflows/capitalflows/?country=USA&year__gte=2020&year__lte=2023"

# 한국 반도체 분야 상세 데이터
curl "http://localhost:8000/api/v1/capitalflows/capitalflows/?country=KOR&sector=SEMICONDUCTOR"
```

### 2. 메타데이터 API

**엔드포인트**: `GET /api/v1/capitalflows/metadata/`

사용 가능한 국가, 분야, 자본타입, 데이터소스 정보를 반환합니다.

### 3. 관리자 API (데이터 처리)

```bash
# 데이터 수집 실행
POST /api/v1/capitalflows/admin/collect/
{
  "source": "IMF",  // 특정 소스 또는 생략 시 전체
  "year": 2023,
  "sector": "AI"
}

# 데이터 융합 실행
POST /api/v1/capitalflows/admin/fusion/
{
  "year_start": 2020,
  "year_end": 2023,
  "country_codes": ["USA", "CHN", "KOR"]
}

# 데이터 검증 실행
POST /api/v1/capitalflows/admin/validate/
{
  "year": 2023
}
```

## 📊 데이터 처리 파이프라인

### 1. 데이터 수집 (Extract)

```python
from apps.data.services.data_collectors import DataCollectionService

service = DataCollectionService()

# 모든 소스에서 수집
results = service.collect_all_sources(year=2023, sector='AI')

# 특정 소스에서 수집
count = service.collect_source('IMF', year=2023)
```

### 2. 데이터 융합 (Transform & Load)

```python
from apps.data.services.data_fusion import DataFusionService

fusion_service = DataFusionService()

# 특정 조건 융합
processed_data = fusion_service.fuse_capital_data('USA', 'AI', 'VC', 2023)

# 배치 융합
results = fusion_service.batch_fusion(year_start=2020, year_end=2023)
```

### 3. 데이터 검증

```python
from apps.data.services.data_fusion import DataValidationService

validation_service = DataValidationService()
results = validation_service.batch_validation(year=2023)
```

## 🔍 데이터 신뢰도 시스템

### 소스별 신뢰도 가중치

- **공식 기관** (IMF, OECD, UNCTAD): 0.85-0.95
- **민간 DB** (Crunchbase, PitchBook): 0.70-0.82
- **크롤링 데이터**: 0.30-0.50

### ML 기반 융합 알고리즘

1. **이상치 제거**: Isolation Forest
2. **가중 평균**: 신뢰도 가중치 적용
3. **앙상블 융합**: 분산이 큰 경우 ML 모델 사용
4. **시계열 예측**: 누락된 값 예측 (ARIMA, 선형회귀)

## 🎨 프론트엔드 변경 사항

### API 호출 방식 변경

기존 더미 데이터 대신 새로운 API를 우선 호출:

```typescript
// 새로운 API 호출
const apiData = await fetchCapitalFlowData(sector, capitalTypes, year)

// API 실패 시 더미 데이터 fallback
if (!apiData) {
  // 기존 더미 데이터 로직 실행
}
```

### 자동 집계 지원

선택된 여러 자본 타입들이 자동으로 백엔드에서 집계되어 반환됩니다.

## 📈 모니터링 & 로깅

### 시스템 상태 확인

```bash
curl "http://localhost:8000/api/v1/capitalflows/health/"
```

### 처리 로그 조회

```bash
curl "http://localhost:8000/api/v1/capitalflows/admin/logs/?type=COLLECTION&status=SUCCESS&limit=10"
```

## 🚀 실행 순서

1. **백엔드 설정**:
   ```bash
   cd backend
   python manage.py migrate
   python manage.py seed_metadata
   python manage.py runserver 8000
   ```

2. **데이터 수집** (선택사항):
   ```bash
   curl -X POST "http://localhost:8000/api/v1/capitalflows/admin/collect/"
   ```

3. **프론트엔드 실행**:
   ```bash
   cd frontend
   npm run dev
   ```

4. **브라우저에서 확인**:
   - http://localhost:3000/map

## ⚙️ 설정 옵션

### 환경 변수

```bash
# .env 파일에 추가
CRUNCHBASE_API_KEY=your_crunchbase_key
PITCHBOOK_API_KEY=your_pitchbook_key
CACHE_TIMEOUT=300
```

### Django 설정

캐시, 로깅, API 제한 등은 `settings/base.py`에서 조정 가능합니다.

---

## 🎯 핵심 개선사항

✅ **다중 소스 데이터 수집**: IMF, OECD, Crunchbase 등  
✅ **ML 기반 데이터 융합**: 가중평균 + 이상치 제거 + 앙상블  
✅ **신뢰도 기반 검증**: 소스별 가중치 + 품질 점수  
✅ **유연한 API 설계**: 단일 엔드포인트 + 쿼리 파라미터  
✅ **시계열 예측**: 누락 데이터 자동 보완  
✅ **실시간 집계**: 선택된 자본 타입 자동 합산  
✅ **캐싱 최적화**: Redis 기반 응답 속도 향상  

이제 **실제 데이터**를 기반으로 한 **신뢰성 높은 글로벌 자본 흐름 분석**이 가능합니다! 🌍💰
