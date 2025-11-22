# 🚀 배포 문제 해결 요약

## 문제 1: 관리자 계정 로그인 불가 ✅

### 해결 방법

Render 대시보드에서 환경 변수 추가:

1. `capitalflow-backend` 서비스 → **Environment** 탭
2. 다음 환경 변수 추가:
   - `DJANGO_SUPERUSER_USERNAME` = `admin` (또는 원하는 사용자명)
   - `DJANGO_SUPERUSER_PASSWORD` = `강력한비밀번호` (최소 8자, 대소문자+숫자+특수문자)
   - `DJANGO_SUPERUSER_EMAIL` = `admin@example.com` (선택사항)
3. **Save Changes** 클릭
4. 자동 재배포 후 로그에서 확인:
   ```
   ✅ 슈퍼유저 'admin' 생성 완료!
   ```

---

## 문제 2: 프론트엔드-백엔드 통신 실패 ✅

### 해결 방법

#### 2-1. 프론트엔드 환경 변수 확인

Render 대시보드 → `capitalflow-frontend` 서비스 → **Environment** 탭

**확인사항**:
- `NEXT_PUBLIC_API_URL` = `https://capitalflow-backend.onrender.com/api/v1`
- ✅ `/api/v1` 경로가 포함되어 있어야 함

#### 2-2. 백엔드 CORS 설정 확인

Render 대시보드 → `capitalflow-backend` 서비스 → **Environment** 탭

**확인사항**:
- `CORS_ALLOWED_ORIGINS` = `https://capitalflow-frontend.onrender.com`
- ✅ 프론트엔드 URL이 정확히 입력되어 있어야 함

#### 2-3. API 클라이언트 코드 수정 ✅

`api-client.ts`가 수정되었습니다:
- baseURL이 환경 변수에서 올바르게 가져옴
- `/api/v1` 경로가 포함됨

**재배포 필요**: 변경사항이 Git에 푸시되었으므로 Render가 자동으로 재배포합니다.

---

## 문제 3: GeoJSON 파일 404 ⚠️

### 원인

Next.js `output: 'export'`를 사용할 때 `public` 폴더의 파일이 `out` 디렉토리로 복사되어야 하는데, 빌드 시 포함되지 않았을 수 있습니다.

### 해결 방법

1. **로컬에서 빌드 테스트**:
   ```bash
   cd capitalflow/frontend
   npm run build
   ls -la out/world-countries-detailed.json
   ```

2. **파일이 복사되지 않았다면**:
   - `public` 폴더의 파일은 자동으로 복사되어야 합니다
   - 만약 문제가 계속되면, `next.config.js`에 명시적으로 추가할 수 있습니다

3. **재배포**: Git에 푸시 후 Render가 자동으로 재배포합니다

---

## 즉시 확인할 사항

### ✅ 완료된 작업
- [x] API 클라이언트 baseURL 수정
- [x] 배포 문제 해결 가이드 작성

### ⏳ 사용자가 해야 할 작업

1. **관리자 계정 생성**:
   - Render 대시보드에서 환경 변수 추가
   - 재배포 대기

2. **환경 변수 확인**:
   - 프론트엔드: `NEXT_PUBLIC_API_URL` 확인
   - 백엔드: `CORS_ALLOWED_ORIGINS` 확인

3. **재배포 확인**:
   - Git 푸시 후 자동 재배포 대기
   - 로그에서 에러 확인

---

## 예상 결과

### 관리자 계정
- ✅ `https://capitalflow-backend.onrender.com/admin/` 접속 가능
- ✅ 설정한 사용자명/비밀번호로 로그인 가능

### 프론트엔드-백엔드 통신
- ✅ API 호출 성공
- ✅ 뉴스 데이터 로드 성공
- ✅ 지도 데이터 로드 성공

### GeoJSON 파일
- ✅ `world-countries-detailed.json` 파일 로드 성공
- ✅ 지도 정상 표시

---

## 문제가 계속되면

1. **브라우저 콘솔 확인** (F12 → Console)
2. **Render 로그 확인**:
   - 백엔드: `capitalflow-backend` → Logs 탭
   - 프론트엔드: `capitalflow-frontend` → Logs 탭
3. **네트워크 탭 확인** (F12 → Network):
   - API 요청이 실제로 전송되는지
   - 응답 상태 코드 확인

