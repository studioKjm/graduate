# 보고서 항목 - 데이터 구조 및 시각화 흐름도

## ② 데이터 구조

### 테이블 구조화
- **국가(Country)**: ISO-3166 국가 코드를 기본키로 사용하며, 국가명(한글/영문), 지역, 대륙, 위도/경도 정보를 포함
- **산업분야(Sector)**: 분야 코드를 기본키로 사용하며, 분야명(한글/영문), 설명, 상위 분야 관계(자기참조)를 포함
- **자본타입(CapitalType)**: 자본 타입 코드를 기본키로 사용하며, 자본 타입명(한글/영문), 설명을 포함

### 정규화된 스키마
- **원시 데이터(RawCapitalData)**: 각 데이터 소스별 원본 데이터를 저장하며, 국가/분야/자본타입/연도 조합으로 유니크 제약 조건 설정
- **정제된 데이터(ProcessedCapitalData)**: 다중 소스 융합 후 최종 데이터를 저장하며, 신뢰도 점수, 융합 방법, 참여 소스 수 등 메타데이터 포함
- **데이터 소스(DataSource)**: 각 데이터 소스의 신뢰도 수준과 가중치를 관리하여 데이터 품질 추적 가능
- Foreign Key 관계를 통한 참조 무결성 보장 및 중복 최소화

### 데이터베이스
- **개발 환경**: SQLite3 (`db.sqlite3`) - 로컬 개발의 단순성을 위해 사용
- **프로덕션 환경**: PostgreSQL (설정 파일에 명시) - 확장성과 성능을 위해 사용

## ③ 시각화 흐름도

### 1. 사용자 필터 선택
- 사용자가 웹 인터페이스에서 **연도**, **산업분야(Sector)**, **자본유형(CapitalType)** 선택
- 다중 자본 타입 선택 가능 (FDI, VC, MA, IPO, PE, BONDS, FPI, SWF, GREENFIELD, JV, DEVFIN 등)
- 시각화 타입 선택 (Choropleth/Flow/Both)

### 2. DRF API 호출 → 데이터베이스 조회
- **API 엔드포인트**: `/api/v1/visualization/map-data/`
- **백엔드 프레임워크**: Django REST Framework (DRF)
- **데이터베이스 조회**: 
  - SQLite3 (개발 환경) 또는 PostgreSQL (프로덕션)에서 데이터 조회
  - `ProcessedCapitalData` 또는 `RawCapitalData` 모델을 통해 국가별, 분야별, 자본타입별 집계
  - 캐싱 메커니즘 적용 (5분 TTL)으로 성능 최적화

### 3. JSON 데이터 전달
- API 응답: JSON 형식으로 국가별 총 투자액, 데이터 개수, 자본타입별 상세 정보 포함
- 프론트엔드 API 클라이언트 (`api-client.ts`)를 통한 중앙화된 에러 핸들링 및 재시도 로직

### 4. 지도 및 차트 렌더링
- **지도 렌더링**:
  - **Mapbox GL** (`mapbox-gl`, `react-map-gl`): 기본 지도 타일 렌더링
  - **Deck.gl** (`@deck.gl/react`, `@deck.gl/layers`): 고성능 웹GL 기반 지도 레이어 (Choropleth, ArcLayer 등)
  - **D3.js** (`d3-scale`, `d3-interpolate`): 색상 스케일링 및 데이터 보간
- **차트 렌더링**:
  - **Recharts**: 시계열 차트, 막대 차트 등 추가 시각화
  - **Framer Motion**: 차트 애니메이션 효과
- **애니메이션**:
  - 연도별 자동 재생 기능 (1995-2024)
  - 지도 색상 변화 및 차트 데이터 업데이트 애니메이션
  - 사용자 정의 애니메이션 속도 조절 가능

### 기술 스택 요약
- **백엔드**: Django + Django REST Framework
- **데이터베이스**: SQLite3 (개발) / PostgreSQL (프로덕션)
- **프론트엔드**: Next.js 14 + React 18
- **지도 라이브러리**: Mapbox GL, Deck.gl
- **데이터 시각화**: D3.js, Recharts
- **애니메이션**: Framer Motion



