# 🔍 Railway 배포 상태 확인 가이드

## 1. 데이터베이스 연결 상태 확인

### Railway 대시보드에서 확인

1. **Railway 대시보드 접속**
   - https://railway.app
   - 프로젝트: `miraculous-optimism`

2. **PostgreSQL 서비스 확인**
   - PostgreSQL 서비스 클릭
   - Status: "Active" 확인
   - Variables 탭 → `DATABASE_URL` 확인

3. **백엔드 서비스 Variables 확인**
   - 백엔드 서비스 (`graduate`) 클릭
   - Variables 탭 확인
   - `DATABASE_URL`이 있는지 확인

### 연결 상태 확인 방법

**✅ 정상 연결:**
- PostgreSQL 서비스: Active
- 백엔드 서비스 Variables에 `DATABASE_URL` 존재
- `DATABASE_URL` 형식: `postgresql://postgres:password@host:port/railway`

**❌ 연결 안 됨:**
- 백엔드 서비스 Variables에 `DATABASE_URL` 없음
- → PostgreSQL 서비스에서 `DATABASE_URL` 복사 후 백엔드에 추가

---

## 2. 백엔드 서비스 상태 확인

### Railway 대시보드에서 확인

1. **백엔드 서비스 (`graduate`) 클릭**

2. **Deployments 탭**
   - 최근 배포 상태 확인
   - "Active" 또는 "Deployed" 확인
   - 빌드/배포 에러 확인

3. **Logs 탭**
   - 실시간 로그 확인
   - 에러 메시지 확인
   - "Gunicorn 서버 시작 중..." 메시지 확인

4. **Settings 탭**
   - Root Directory: `capitalflow/backend` 확인
   - Build Command: (비워두기)
   - Start Command: (비워두기)

### 접속 URL 확인

1. **Settings 탭**
   - "Generate Domain" 버튼 클릭 (아직 도메인이 없다면)
   - 생성된 도메인 확인 (예: `graduate-production.up.railway.app`)

2. **접속 URL**
   - API: `https://<도메인>/api/v1/`
   - Admin: `https://<도메인>/admin/`
   - Health Check: `https://<도메인>/api/v1/` (또는 `/`)

---

## 3. 정상 작동 확인 체크리스트

### 데이터베이스 연결
- [ ] PostgreSQL 서비스 Active
- [ ] 백엔드 Variables에 `DATABASE_URL` 존재
- [ ] 배포 로그에 DB 연결 성공 메시지

### 백엔드 서비스
- [ ] 배포 상태: Active/Deployed
- [ ] 빌드 성공
- [ ] Gunicorn 서버 시작 성공
- [ ] 마이그레이션 실행 성공
- [ ] 에러 없음

### 접속 가능 여부
- [ ] 도메인 생성됨
- [ ] API 엔드포인트 응답 (`/api/v1/`)
- [ ] Admin 페이지 접근 가능 (`/admin/`)

---

## 4. 문제 해결

### DB 연결 안 됨
1. PostgreSQL 서비스 Variables에서 `DATABASE_URL` 복사
2. 백엔드 서비스 Variables에 추가
3. 재배포

### 백엔드 작동 안 됨
1. Deployments → 최근 배포 → Logs 확인
2. 에러 메시지 확인
3. 환경 변수 확인
4. Root Directory 확인

### 접속 안 됨
1. Settings → "Generate Domain" 클릭
2. 도메인 생성 확인
3. HTTPS 접속 확인

---

## 5. Railway CLI로 확인 (선택)

```bash
# 프로젝트 상태
npx @railway/cli status

# 환경 변수 확인
npx @railway/cli variables

# 로그 확인
npx @railway/cli logs

# 도메인 확인
npx @railway/cli domain
```

---

## 6. 빠른 확인 방법

### 웹 브라우저에서 직접 테스트

1. **API 테스트**
   ```
   https://<railway-domain>/api/v1/
   ```
   - JSON 응답이 오면 정상

2. **Admin 페이지 테스트**
   ```
   https://<railway-domain>/admin/
   ```
   - 로그인 페이지가 보이면 정상

3. **Health Check (있는 경우)**
   ```
   https://<railway-domain>/api/v1/health/
   ```
   - 또는 루트 경로 `/`

---

## 예상 결과

### 정상 작동 시
- ✅ PostgreSQL: Active
- ✅ 백엔드: Active/Deployed
- ✅ `DATABASE_URL` 환경 변수 설정됨
- ✅ 도메인 생성됨
- ✅ API 엔드포인트 응답
- ✅ Admin 페이지 접근 가능

### 문제 발생 시
- ❌ 배포 로그에 에러 메시지
- ❌ `DATABASE_URL` 없음
- ❌ 도메인 없음
- ❌ API 응답 없음

