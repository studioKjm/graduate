# 🔧 배포 후 문제 해결 가이드

## 문제 1: 관리자 계정 로그인 불가

### 원인
로컬 데이터베이스와 배포된 데이터베이스가 다르므로, 로컬에서 생성한 관리자 계정이 배포 서버에 존재하지 않습니다.

### 해결 방법

#### 방법 1: 환경 변수로 슈퍼유저 자동 생성 (권장)

1. Render 대시보드 → `capitalflow-backend` 서비스 → **Environment** 탭
2. 다음 환경 변수 추가:

   | Key | Value | 설명 |
   |-----|-------|------|
   | `DJANGO_SUPERUSER_USERNAME` | `admin` | 관리자 사용자명 |
   | `DJANGO_SUPERUSER_PASSWORD` | `강력한비밀번호` | 관리자 비밀번호 (최소 8자) |
   | `DJANGO_SUPERUSER_EMAIL` | `admin@example.com` | 관리자 이메일 (선택사항) |

3. **Save Changes** 클릭
4. 자동으로 재배포되며, `render_start.sh` 스크립트가 슈퍼유저를 자동 생성합니다

**⚠️ 보안 주의사항**:
- 비밀번호는 강력하게 설정하세요 (대소문자, 숫자, 특수문자 포함)
- 환경 변수는 Render 대시보드에서만 관리하세요

#### 방법 2: 로컬에서 데이터베이스 덤프 후 복원 (고급)

로컬 데이터베이스의 사용자 정보를 배포 서버로 복사하려면:

1. 로컬에서 사용자 데이터 덤프:
   ```bash
   python manage.py dumpdata auth.User --indent 2 > users.json
   ```

2. 배포 서버에 복원 (Shell 접근 필요 - 유료 플랜)

---

## 문제 2: 프론트엔드-백엔드 통신 실패

### 원인 분석

로그를 보면:
1. ✅ API 클라이언트는 올바르게 초기화됨: `https://capitalflow-backend.onrender.com`
2. ❌ GeoJSON 파일 404: `world-countries-detailed.json` 파일을 찾을 수 없음
3. ⚠️ API 호출은 시도되지만 실패하는 것으로 보임

### 해결 방법

#### 2-1. GeoJSON 파일 문제 해결

**문제**: Next.js `output: 'export'`를 사용하면 `public` 폴더의 파일이 `out` 디렉토리로 복사되어야 하는데, 빌드 시 포함되지 않았을 수 있습니다.

**확인 방법**:
1. 로컬에서 빌드 테스트:
   ```bash
   cd capitalflow/frontend
   npm run build
   ls -la out/world-countries-detailed.json
   ```

**해결 방법**:
- `public` 폴더의 파일은 자동으로 복사되어야 합니다
- 만약 복사되지 않았다면, `next.config.js`에 명시적으로 추가:

```javascript
// next.config.js에 추가 (필요시)
module.exports = {
  // ... 기존 설정
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',
  // public 폴더는 자동으로 복사되므로 추가 설정 불필요
}
```

**재배포**:
1. Git에 변경사항 커밋 및 푸시
2. Render가 자동으로 재배포합니다

#### 2-2. API 통신 문제 해결

**문제**: API 클라이언트의 baseURL이 `/api/v1`을 포함하지 않을 수 있습니다.

**확인**:
- `api-client.ts`를 보면 baseURL이 `https://capitalflow-backend.onrender.com`으로 설정됨
- 하지만 API 호출 시 `/api/v1` 경로가 필요함

**해결 방법**:

1. **프론트엔드 환경 변수 확인**:
   - Render 대시보드 → `capitalflow-frontend` 서비스 → **Environment** 탭
   - `NEXT_PUBLIC_API_URL` 값 확인:
     - ✅ 올바른 값: `https://capitalflow-backend.onrender.com/api/v1`
     - ❌ 잘못된 값: `https://capitalflow-backend.onrender.com` (끝에 `/api/v1` 없음)

2. **환경 변수 수정**:
   - Key: `NEXT_PUBLIC_API_URL`
   - Value: `https://capitalflow-backend.onrender.com/api/v1`
   - **Save Changes** 클릭
   - 자동으로 재배포됩니다

3. **CORS 설정 확인**:
   - Render 대시보드 → `capitalflow-backend` 서비스 → **Environment** 탭
   - `CORS_ALLOWED_ORIGINS` 값 확인:
     - ✅ 올바른 값: `https://capitalflow-frontend.onrender.com`
     - ❌ 잘못된 값: `https://capitalflow-backend.onrender.com` 또는 다른 값
   - 수정 후 **Save Changes** 클릭

#### 2-3. API 클라이언트 코드 확인

`api-client.ts`를 보면:
- baseURL이 환경 변수에서 가져옴
- `/api/v1`이 baseURL에 포함되어야 함

**현재 코드**:
```typescript
let envURL = process.env.NEXT_PUBLIC_API_URL || ''
// .env 파일에서 /api/v1을 제거 (잘못된 설정이 있을 경우)
if (envURL.includes('/api/v1')) {
  envURL = envURL.replace('/api/v1', '').replace(/\/+$/, '')
}
this.baseURL = envURL || 'http://localhost:8001'
```

**문제**: 이 코드는 `/api/v1`을 제거하고 있습니다! 이는 잘못된 로직입니다.

**수정 필요**: `api-client.ts`를 수정하여 `/api/v1`을 유지하도록 해야 합니다.

---

## 문제 해결 체크리스트

### 관리자 계정
- [ ] `DJANGO_SUPERUSER_USERNAME` 환경 변수 설정
- [ ] `DJANGO_SUPERUSER_PASSWORD` 환경 변수 설정
- [ ] 재배포 후 로그에서 슈퍼유저 생성 확인

### 프론트엔드-백엔드 통신
- [ ] `NEXT_PUBLIC_API_URL`이 `https://capitalflow-backend.onrender.com/api/v1`로 설정됨
- [ ] `CORS_ALLOWED_ORIGINS`가 `https://capitalflow-frontend.onrender.com`로 설정됨
- [ ] GeoJSON 파일이 `out` 디렉토리에 복사됨
- [ ] API 클라이언트 코드가 올바르게 수정됨

---

## 즉시 해결 방법

### 1단계: 관리자 계정 생성
Render 대시보드에서 환경 변수 추가:
- `DJANGO_SUPERUSER_USERNAME=admin`
- `DJANGO_SUPERUSER_PASSWORD=your_strong_password`

### 2단계: API 클라이언트 수정
`api-client.ts`에서 `/api/v1` 제거 로직 삭제

### 3단계: 환경 변수 확인
- 프론트엔드: `NEXT_PUBLIC_API_URL=https://capitalflow-backend.onrender.com/api/v1`
- 백엔드: `CORS_ALLOWED_ORIGINS=https://capitalflow-frontend.onrender.com`

### 4단계: 재배포
변경사항 커밋 및 푸시 후 자동 재배포

