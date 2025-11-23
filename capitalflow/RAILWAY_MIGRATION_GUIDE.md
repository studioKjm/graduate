# 🚂 Railway 백엔드 마이그레이션 가이드

## 📋 개요

Render의 무료 플랜은 15분 비활성 시 sleep 모드로 전환되어 프로덕션 환경에 부적합합니다.  
이 가이드는 **프론트엔드는 Render에 유지**하고 **백엔드만 Railway로 이전**하는 방법을 안내합니다.

---

## 🎯 마이그레이션 전략

### 현재 구조
- **프론트엔드**: Render Static Site (무료, sleep 없음)
- **백엔드**: Render Web Service (무료, sleep 있음) ❌
- **데이터베이스**: Render PostgreSQL (무료)

### 이전 후 구조
- **프론트엔드**: Render Static Site (무료, sleep 없음) ✅ 유지
- **백엔드**: Railway Web Service (사용량 기반 과금, sleep 없음) ✅
- **데이터베이스**: Railway PostgreSQL (사용량 기반 과금) ✅

---

## 💰 비용 비교

### Railway 가격
- **무료 크레딧**: $5 제공 (신규 계정)
- **사용량 기반**: 
  - Web Service: $0.000463/GB-hour (약 $0.33/월 @ 1GB)
  - PostgreSQL: $0.000231/GB-hour (약 $0.17/월 @ 1GB)
- **예상 월 비용**: $0.50 ~ $2.00 (트래픽에 따라 다름)
- **Sleep 모드 없음**: 항상 실행 중

### Render 가격
- **무료 플랜**: 
  - Web Service: Sleep 모드 (15분 비활성 시)
  - PostgreSQL: 항상 실행
- **유료 플랜**: $7/월 (Web Service만)

---

## 📊 데이터베이스 옵션 검토

### 옵션 1: Railway PostgreSQL (추천) ⭐

**장점:**
- Railway와 완벽 통합
- 자동 백업 제공
- 환경 변수 자동 설정 (`DATABASE_URL`)
- 쉬운 관리 및 모니터링
- 동일 플랫폼에서 관리

**단점:**
- Render PostgreSQL보다 약간 비쌀 수 있음

**비용:** 약 $0.17/월 (1GB 기준)

---

### 옵션 2: Render PostgreSQL 유지

**장점:**
- 현재 DB 그대로 사용 (마이그레이션 불필요)
- 무료 플랜 사용 가능
- 기존 데이터 유지

**단점:**
- 다른 플랫폼에서 관리 (복잡도 증가)
- Render PostgreSQL도 sleep 모드 가능성 (드물지만)

**비용:** 무료 (무료 플랜)

---

### 옵션 3: Supabase/Neon (외부 서비스)

**장점:**
- 무료 티어 제공 (Supabase: 500MB, Neon: 512MB)
- 강력한 기능 (실시간, 스토리지 등)

**단점:**
- 추가 서비스 관리 필요
- 데이터 마이그레이션 필요

**비용:** 무료 (제한적) 또는 유료

---

## ✅ 추천: Railway PostgreSQL

**이유:**
1. Railway와 완벽 통합
2. 자동 백업 및 관리
3. 환경 변수 자동 설정
4. 비용이 낮음 ($0.17/월)
5. 안정성 높음

---

## 🚀 단계별 마이그레이션 가이드

### 1단계: Railway 계정 생성 및 프로젝트 설정

1. **Railway 계정 생성**
   - https://railway.app 접속
   - GitHub 계정으로 로그인

2. **새 프로젝트 생성**
   - "New Project" 클릭
   - "Deploy from GitHub repo" 선택
   - 저장소 선택: `studioKjm/graduate`
   - Branch: `main` 선택

---

### 2단계: PostgreSQL 데이터베이스 생성

1. **Railway 대시보드에서**
   - "New" → "Database" → "Add PostgreSQL" 클릭

2. **데이터베이스 정보 확인**
   - Railway가 자동으로 `DATABASE_URL` 환경 변수 생성
   - 이 변수는 백엔드 서비스에 자동 연결됨

---

### 3단계: 백엔드 서비스 배포 설정

1. **Railway 대시보드에서**
   - "New" → "GitHub Repo" 클릭
   - 저장소 선택: `studioKjm/graduate`

2. **서비스 설정**
   - **Root Directory**: `capitalflow/backend`
   - **Build Command**: (자동 감지 또는 비워두기)
   - **Start Command**: (자동 감지)

3. **Dockerfile 사용 확인**
   - Railway는 `Dockerfile`을 자동으로 감지
   - `capitalflow/backend/Dockerfile` 사용

---

### 4단계: Railway용 시작 스크립트 생성

Railway는 `PORT` 환경 변수를 제공하므로 기존 `render_start.sh`를 Railway용으로 수정합니다.

```bash
# railway_start.sh 파일 생성
```

---

### 5단계: 환경 변수 설정

Railway 대시보드 → 백엔드 서비스 → Variables 탭에서 설정:

**필수 환경 변수:**
```
DJANGO_SETTINGS_MODULE=capitalflow.settings.production
SECRET_KEY=<기존 SECRET_KEY 또는 새로 생성>
DEBUG=False
ALLOWED_HOSTS=*.railway.app,<서비스 도메인>
CORS_ALLOWED_ORIGINS=https://capitalflow-frontend.onrender.com
SECURE_SSL_REDIRECT=True
```

**슈퍼유저 생성 (선택):**
```
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@example.com
DJANGO_SUPERUSER_PASSWORD=<강력한 비밀번호>
```

**데이터베이스:**
- `DATABASE_URL`은 Railway PostgreSQL 서비스를 추가하면 자동으로 설정됨

**기타:**
```
NEXT_PUBLIC_API_URL=https://capitalflow-frontend.onrender.com
MAPBOX_ACCESS_TOKEN=<기존 토큰>
```

---

### 6단계: Dockerfile Railway 호환성 확인

Railway는 `PORT` 환경 변수를 제공하므로 기존 Dockerfile이 호환됩니다.

---

### 7단계: 프론트엔드 설정 업데이트

1. **Render 프론트엔드 환경 변수 업데이트**
   - Render 대시보드 → `capitalflow-frontend` → Environment
   - `NEXT_PUBLIC_API_URL` 업데이트:
     ```
     NEXT_PUBLIC_API_URL=https://<railway-backend-url>/api/v1
     ```

2. **CORS 설정 확인**
   - Railway 백엔드의 `CORS_ALLOWED_ORIGINS`에 프론트엔드 URL 포함 확인

---

### 8단계: 데이터 마이그레이션 (Render DB → Railway DB)

#### 방법 1: Django dumpdata/loaddata (추천)

**Render에서 데이터 백업:**
```bash
# Render Shell (유료) 또는 로컬에서 Render DB 연결
python manage.py dumpdata --exclude auth.permission --exclude contenttypes > backup.json
```

**Railway로 데이터 복원:**
```bash
# Railway 서비스에 연결 (Railway CLI 사용)
railway run python manage.py loaddata backup.json
```

#### 방법 2: PostgreSQL pg_dump/pg_restore

**Render에서 백업:**
```bash
pg_dump $RENDER_DATABASE_URL > backup.sql
```

**Railway로 복원:**
```bash
psql $RAILWAY_DATABASE_URL < backup.sql
```

#### 방법 3: Railway CLI 사용

```bash
# Railway CLI 설치
npm i -g @railway/cli

# 로그인
railway login

# 프로젝트 연결
railway link

# 데이터베이스 연결 정보 확인
railway variables

# 로컬에서 Railway DB로 직접 마이그레이션
# (Render DB → Railway DB 직접 연결)
```

---

### 9단계: 배포 및 테스트

1. **Railway 자동 배포**
   - GitHub에 push하면 자동 배포
   - 또는 Railway 대시보드에서 "Deploy" 클릭

2. **서비스 URL 확인**
   - Railway 대시보드 → 백엔드 서비스 → Settings
   - "Generate Domain" 클릭하여 공개 URL 생성

3. **테스트**
   - API 엔드포인트 테스트: `https://<railway-url>/api/v1/`
   - Admin 페이지 테스트: `https://<railway-url>/admin/`
   - 프론트엔드에서 API 호출 테스트

---

### 10단계: Render 백엔드 서비스 중지 (선택)

1. **데이터 마이그레이션 완료 후**
2. **Railway 백엔드 정상 작동 확인 후**
3. **Render 대시보드에서 백엔드 서비스 삭제**
   - ⚠️ **주의**: Render PostgreSQL은 유지 (다른 용도로 사용 가능)

---

## 🔧 필요한 파일 수정

### 1. Railway용 시작 스크립트 생성

`capitalflow/backend/railway_start.sh` 파일 생성:

```bash
#!/bin/bash
# Railway 배포용 시작 스크립트
# 마이그레이션 자동 실행 후 서버 시작

set -e  # 에러 발생 시 스크립트 중단

echo "🚂 Railway 배포 시작 스크립트 실행 중..."

# 마이그레이션 실행
echo "📦 데이터베이스 마이그레이션 실행 중..."
python manage.py migrate --noinput

# 정적 파일 수집
echo "📁 정적 파일 수집 중..."
python manage.py collectstatic --noinput || true

# 슈퍼유저 자동 생성 (환경 변수가 설정된 경우)
echo "👤 슈퍼유저 확인 중..."
python create_superuser_if_needed.py || true

# Gunicorn 서버 시작
# Railway는 PORT 환경 변수를 제공
echo "🌐 Gunicorn 서버 시작 중..."
exec gunicorn --bind 0.0.0.0:${PORT:-8000} --workers 2 --threads 2 --timeout 60 capitalflow.wsgi:application
```

### 2. Dockerfile Railway 호환성 확인

기존 Dockerfile이 Railway와 호환됩니다. `PORT` 환경 변수를 사용하므로 수정 불필요.

### 3. production.py 설정 확인

기존 `production.py`가 `DATABASE_URL`을 지원하므로 Railway와 호환됩니다.

---

## 📝 체크리스트

### Railway 설정
- [ ] Railway 계정 생성
- [ ] 프로젝트 생성 및 GitHub 연결
- [ ] PostgreSQL 데이터베이스 생성
- [ ] 백엔드 서비스 생성
- [ ] Root Directory: `capitalflow/backend` 설정
- [ ] 환경 변수 설정 완료

### 데이터 마이그레이션
- [ ] Render DB에서 데이터 백업
- [ ] Railway DB로 데이터 복원
- [ ] 데이터 무결성 확인

### 프론트엔드 업데이트
- [ ] `NEXT_PUBLIC_API_URL` 업데이트
- [ ] CORS 설정 확인
- [ ] API 호출 테스트

### 배포 및 테스트
- [ ] Railway 백엔드 배포 성공
- [ ] API 엔드포인트 테스트
- [ ] Admin 페이지 접근 테스트
- [ ] 프론트엔드 통합 테스트

### 정리
- [ ] Render 백엔드 서비스 중지 (선택)
- [ ] 문서 업데이트

---

## 🆘 문제 해결

### Railway 배포 실패
- **로그 확인**: Railway 대시보드 → Deployments → Logs
- **환경 변수 확인**: 모든 필수 변수 설정 확인
- **Dockerfile 확인**: 빌드 에러 확인

### 데이터베이스 연결 실패
- **DATABASE_URL 확인**: Railway PostgreSQL 서비스 연결 확인
- **네트워크 확인**: Railway 서비스가 같은 프로젝트에 있는지 확인

### CORS 에러
- **CORS_ALLOWED_ORIGINS 확인**: 프론트엔드 URL 포함 확인
- **ALLOWED_HOSTS 확인**: Railway 도메인 포함 확인

---

## 📚 참고 자료

- [Railway 공식 문서](https://docs.railway.app/)
- [Railway PostgreSQL 가이드](https://docs.railway.app/databases/postgresql)
- [Railway 환경 변수](https://docs.railway.app/variables)
- [Railway CLI](https://docs.railway.app/develop/cli)

---

## 💡 추가 팁

1. **Railway CLI 사용**: 로컬에서 Railway 서비스 관리
2. **모니터링**: Railway 대시보드에서 리소스 사용량 확인
3. **비용 최적화**: 사용량 모니터링 및 최적화
4. **자동 배포**: GitHub push 시 자동 배포 설정 확인

---

## ✅ 완료 후

마이그레이션 완료 후:
- ✅ 백엔드는 Railway에서 항상 실행 중 (sleep 없음)
- ✅ 프론트엔드는 Render에서 무료로 운영
- ✅ 데이터베이스는 Railway에서 안정적으로 관리
- ✅ 비용: 월 $0.50 ~ $2.00 (사용량에 따라)

