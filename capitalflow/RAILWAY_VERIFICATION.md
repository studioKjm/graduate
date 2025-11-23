# ✅ Railway 배포 상태 검증 가이드

## 1. 데이터베이스 연결 상태 확인

### Railway 대시보드에서 확인

1. **Railway 대시보드 접속**
   - https://railway.app
   - 프로젝트: `miraculous-optimism` 선택

2. **PostgreSQL 서비스 확인**
   ```
   서비스 목록에서 "Postgres" 또는 "PostgreSQL" 찾기
   → Status: "Active" (초록색) 확인
   → Variables 탭 클릭
   → `DATABASE_URL` 또는 `POSTGRES_URL` 확인
   ```

3. **백엔드 서비스 Variables 확인**
   ```
   서비스 목록에서 "graduate" 찾기
   → Variables 탭 클릭
   → `DATABASE_URL` 환경 변수 확인
   ```

### 연결 상태 판단

**✅ 정상 연결:**
- PostgreSQL 서비스: Active (초록색)
- 백엔드 Variables에 `DATABASE_URL` 존재
- 값 형식: `postgresql://postgres:password@host:port/railway`

**❌ 연결 안 됨:**
- 백엔드 Variables에 `DATABASE_URL` 없음
- 해결: PostgreSQL Variables에서 `DATABASE_URL` 복사 → 백엔드 Variables에 추가

---

## 2. 백엔드 서비스 상태 확인

### Railway 대시보드에서 확인

1. **백엔드 서비스 (`graduate`) 클릭**

2. **Deployments 탭**
   ```
   최근 배포 확인:
   - Status: "Active" 또는 "Deployed" (초록색) ✅
   - Status: "Failed" 또는 "Error" (빨간색) ❌
   ```

3. **Logs 탭 (Deploy Logs)**
   ```
   확인할 메시지:
   ✅ "🚂 Railway 배포 시작 스크립트 실행 중..."
   ✅ "📦 데이터베이스 마이그레이션 실행 중..."
   ✅ "🌐 Gunicorn 서버 시작 중..."
   ✅ "Listening at: http://0.0.0.0:8000"
   
   ❌ 에러 메시지가 있으면 확인 필요
   ```

4. **Settings 탭**
   ```
   확인 사항:
   - Root Directory: `capitalflow/backend` ✅
   - Build Command: (비워두기) ✅
   - Start Command: (비워두기) ✅
   ```

---

## 3. 접속 URL 확인

### 도메인 생성 및 확인

1. **Settings 탭**
   ```
   - "Generate Domain" 버튼 클릭 (아직 없다면)
   - 생성된 도메인 확인
   - 예: `graduate-production.up.railway.app`
   ```

2. **접속 URL**
   ```
   API 엔드포인트:
   https://<도메인>/api/v1/
   
   Admin 페이지:
   https://<도메인>/admin/
   
   예시:
   https://graduate-production.up.railway.app/api/v1/
   https://graduate-production.up.railway.app/admin/
   ```

---

## 4. 웹 브라우저에서 직접 테스트

### API 테스트
```
브라우저에서 접속:
https://<railway-domain>/api/v1/

예상 결과:
- JSON 응답 (에러 메시지 포함 가능)
- 또는 빈 응답
- 404 에러가 아니면 정상
```

### Admin 페이지 테스트
```
브라우저에서 접속:
https://<railway-domain>/admin/

예상 결과:
- Django Admin 로그인 페이지 표시
- 로그인 페이지가 보이면 정상
```

---

## 5. 설정 파일 검토 결과

### ✅ 확인 완료

1. **Dockerfile** (`backend/Dockerfile`)
   - ✅ Railway 환경 변수로 자동 선택 (`RAILWAY_ENVIRONMENT`)
   - ✅ `railway_start.sh` 사용하도록 설정됨
   - ✅ `PORT` 환경 변수 사용

2. **railway.json** (프로젝트 루트)
   - ✅ Dockerfile 사용 설정
   - ✅ `dockerfilePath: "Dockerfile"` (Root Directory 기준)

3. **production.py** (`backend/capitalflow/settings/production.py`)
   - ✅ `DATABASE_URL` 우선 사용
   - ✅ 기본값 제공 (에러 방지)

4. **railway_start.sh** (`backend/railway_start.sh`)
   - ✅ 마이그레이션 자동 실행
   - ✅ 슈퍼유저 자동 생성
   - ✅ Gunicorn 서버 시작

---

## 6. 체크리스트

### 데이터베이스 연결
- [ ] PostgreSQL 서비스: Active
- [ ] 백엔드 Variables에 `DATABASE_URL` 존재
- [ ] 배포 로그에 DB 연결 성공

### 백엔드 서비스
- [ ] 배포 상태: Active/Deployed
- [ ] Root Directory: `capitalflow/backend`
- [ ] 빌드 성공
- [ ] Gunicorn 서버 시작 성공
- [ ] 마이그레이션 실행 성공
- [ ] 에러 없음

### 접속 가능 여부
- [ ] 도메인 생성됨
- [ ] API 엔드포인트 응답 (`/api/v1/`)
- [ ] Admin 페이지 접근 가능 (`/admin/`)

---

## 7. 문제 해결

### DB 연결 안 됨
1. PostgreSQL Variables에서 `DATABASE_URL` 복사
2. 백엔드 Variables에 추가
3. 재배포

### 백엔드 작동 안 됨
1. Deployments → 최근 배포 → Logs 확인
2. 에러 메시지 확인
3. 환경 변수 확인 (`SECRET_KEY`, `ALLOWED_HOSTS` 등)
4. Root Directory 확인

### 접속 안 됨
1. Settings → "Generate Domain" 클릭
2. 도메인 생성 확인
3. HTTPS 접속 확인 (HTTP는 자동 리다이렉트)

---

## 8. 빠른 확인 명령어

터미널에서 테스트:
```bash
# 도메인이 있다면
curl https://<railway-domain>/api/v1/

# 또는
curl https://<railway-domain>/admin/
```

---

## 다음 단계

1. **Railway 대시보드에서 위 항목들 확인**
2. **도메인 생성 (없다면)**
3. **브라우저에서 접속 테스트**
4. **문제가 있으면 로그 확인 후 공유**

