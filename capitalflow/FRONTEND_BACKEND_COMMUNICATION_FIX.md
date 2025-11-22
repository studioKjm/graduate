# 🔧 프론트엔드-백엔드 통신 문제 해결 가이드

## 발견된 문제

### 1. GeoJSON 파일 404 에러 ✅ 수정 완료
- **문제**: `GET https://capitalflow-frontend.onrender.com/world-countries-detailed.json 404`
- **원인**: Next.js static export에서 public 폴더 파일 경로 문제
- **해결**: 여러 경로를 시도하도록 수정, 에러 처리 개선

### 2. 지도 데이터 API 호출 실패 ⚠️ 디버깅 로그 추가
- **문제**: `⚠️ [INIT] 백엔드 서버 연결 실패 - 실제 데이터 없음, 지도 표시 안 함`
- **원인**: API 호출이 실패하고 있음 (원인 불명)
- **해결**: 상세한 디버깅 로그 추가

### 3. 하드코딩된 localhost URL ⚠️ 발견됨 (다른 컴포넌트)
- **문제**: 일부 지도 컴포넌트에 `http://localhost:8001` 하드코딩
- **영향**: 현재 사용 중인 `NoLoadingYearMap`은 이미 `apiClient` 사용 중
- **참고**: 다른 컴포넌트들도 수정 필요 (향후 작업)

---

## 수정된 내용

### 1. GeoJSON 로드 개선
- 여러 경로 시도 (`/`, `./`, 상대 경로)
- 에러 발생 시에도 지도 표시 가능하도록 처리

### 2. API 호출 디버깅 로그 추가
- API URL 상세 로깅
- 에러 상세 정보 로깅
- 파라미터 로깅

---

## 다음 단계

### 1. 재배포 후 확인
1. Render가 자동으로 재배포합니다
2. 브라우저 콘솔에서 다음 로그 확인:
   ```
   🌐 [API] Fetching from: /api/v1/visualization/map-data/?...
   🌐 [API] Full URL will be: https://capitalflow-backend.onrender.com/api/v1/visualization/map-data/?...
   🌐 [API] Parameters: { year: 1995, sector: '', capitalTypes: [...] }
   ```

### 2. 에러 로그 확인
- API 호출 실패 시 상세 에러 메시지 확인:
   ```
   ❌ [API] Request failed: { url: ..., error: ..., errorType: ... }
   ```

### 3. 가능한 원인 및 해결

#### 원인 1: CORS 문제
**증상**: `CORS policy` 에러
**해결**: 백엔드 `CORS_ALLOWED_ORIGINS` 확인

#### 원인 2: API 엔드포인트 없음
**증상**: `404 Not Found` 에러
**해결**: 백엔드 URL 라우팅 확인

#### 원인 3: 네트워크 타임아웃
**증상**: `timeout` 에러
**해결**: Render 서버 상태 확인

---

## 확인 사항

### 백엔드 환경 변수
- [ ] `CORS_ALLOWED_ORIGINS` = `https://capitalflow-frontend.onrender.com`

### 프론트엔드 환경 변수
- [ ] `NEXT_PUBLIC_API_URL` = `https://capitalflow-backend.onrender.com/api/v1`

### API 엔드포인트 확인
- [ ] `https://capitalflow-backend.onrender.com/api/v1/visualization/map-data/` 접속 가능
- [ ] 파라미터 테스트: `?year=2020&capital_types=FDI`

---

## 예상 결과

재배포 후:
- ✅ GeoJSON 파일 로드 성공 (또는 에러 처리로 지도 표시 가능)
- ✅ API 호출 상세 로그 확인 가능
- ✅ 지도 데이터 로드 성공

---

## 문제가 계속되면

1. **브라우저 콘솔 확인** (F12 → Console):
   - `🌐 [API]` 로그 확인
   - `❌ [API]` 에러 로그 확인

2. **네트워크 탭 확인** (F12 → Network):
   - API 요청이 실제로 전송되는지 확인
   - 응답 상태 코드 확인
   - 응답 본문 확인

3. **백엔드 로그 확인**:
   - Render 대시보드 → `capitalflow-backend` → Logs 탭
   - API 요청이 도착하는지 확인

