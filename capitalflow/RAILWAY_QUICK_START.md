# 🚂 Railway 백엔드 빠른 시작 가이드

## ⚡ 5분 안에 시작하기

### 1. Railway 계정 생성
1. https://railway.app 접속
2. GitHub로 로그인
3. "New Project" → "Deploy from GitHub repo"
4. 저장소: `studioKjm/graduate` 선택

### 2. PostgreSQL 추가
1. "New" → "Database" → "Add PostgreSQL"
2. `DATABASE_URL` 자동 생성됨 ✅

### 3. 백엔드 서비스 추가
1. "New" → "GitHub Repo"
2. 저장소: `studioKjm/graduate` 선택
3. Settings → Root Directory: `capitalflow/backend` 설정
4. Settings → Deploy Command: (비워두기 - Dockerfile 사용)
5. Settings → Start Command: (비워두기 - Dockerfile CMD 사용)

### 4. 환경 변수 설정
Railway 대시보드 → 백엔드 서비스 → Variables:

```
DJANGO_SETTINGS_MODULE=capitalflow.settings.production
SECRET_KEY=<기존 또는 새로 생성>
DEBUG=False
ALLOWED_HOSTS=*.railway.app
CORS_ALLOWED_ORIGINS=https://capitalflow-frontend.onrender.com
SECURE_SSL_REDIRECT=True
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@example.com
DJANGO_SUPERUSER_PASSWORD=<강력한 비밀번호>
```

**참고:** `DATABASE_URL`은 PostgreSQL 서비스를 추가하면 자동으로 설정됩니다.

### 5. 도메인 생성
1. Settings → "Generate Domain" 클릭
2. 생성된 URL 복사 (예: `capitalflow-backend-production.up.railway.app`)

### 6. 프론트엔드 업데이트
Render 대시보드 → 프론트엔드 서비스 → Environment:

```
NEXT_PUBLIC_API_URL=https://<railway-url>/api/v1
```

### 7. 배포 확인
- Railway 대시보드에서 배포 상태 확인
- API 테스트: `https://<railway-url>/api/v1/`
- Admin 테스트: `https://<railway-url>/admin/`

---

## 🔄 데이터 마이그레이션 (선택)

Render DB → Railway DB:

```bash
# Railway CLI 설치
npm i -g @railway/cli

# 로그인 및 프로젝트 연결
railway login
railway link

# Render DB에서 백업 (로컬에서 Render DB 연결)
python manage.py dumpdata --exclude auth.permission --exclude contenttypes > backup.json

# Railway DB로 복원
railway run python manage.py loaddata backup.json
```

---

## ✅ 완료!

이제 백엔드는 Railway에서 항상 실행 중입니다 (sleep 없음).

**비용:** 월 $0.50 ~ $2.00 (사용량에 따라)

