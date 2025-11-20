# 🚀 CapitalFlow 무료 배포 가이드

이 문서는 CapitalFlow 프로젝트를 무료로 배포하는 3가지 방법을 안내합니다.

## 📋 배포 전 준비사항

### 1. 환경 변수 설정
- 백엔드: `SECRET_KEY`, `DATABASE_URL`, `ALLOWED_HOSTS` 등
- 프론트엔드: `NEXT_PUBLIC_API_URL` (배포된 백엔드 URL)

### 2. 데이터베이스 선택
- SQLite (개발용, 무료)
- PostgreSQL (프로덕션 권장, 무료 티어 제공)

### 3. 정적 파일 설정
- Django의 `STATIC_ROOT`, `MEDIA_ROOT` 설정 확인
- WhiteNoise 또는 CDN 사용

---

## 방법 1: Vercel (프론트엔드) + Railway (백엔드) ⭐ 추천

### 장점
- ✅ Vercel: Next.js 최적화, 자동 배포, 무료 SSL
- ✅ Railway: 간단한 설정, PostgreSQL 무료 제공
- ✅ 빠른 배포 속도

### 단점
- ⚠️ 두 플랫폼을 따로 관리해야 함

### 배포 단계

#### 1-1. Vercel에 프론트엔드 배포

1. **Vercel 계정 생성**
   - https://vercel.com 접속
   - GitHub 계정으로 로그인

2. **프로젝트 연결**
   ```bash
   cd capitalflow/frontend
   npm install -g vercel
   vercel login
   vercel
   ```

3. **환경 변수 설정**
   - Vercel 대시보드 → 프로젝트 → Settings → Environment Variables
   - 추가:
     ```
     NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api/v1
     ```

4. **배포 완료**
   - 자동으로 배포되며 URL 제공 (예: `https://your-app.vercel.app`)

#### 1-2. Railway에 백엔드 배포

1. **Railway 계정 생성**
   - https://railway.app 접속
   - GitHub 계정으로 로그인

2. **프로젝트 생성**
   - "New Project" → "Deploy from GitHub repo"
   - `capitalflow/backend` 디렉토리 선택

3. **환경 변수 설정**
   - Variables 탭에서 추가:
     ```
     SECRET_KEY=your-secret-key-here
     DEBUG=False
     ALLOWED_HOSTS=your-backend.railway.app,*.railway.app
     DATABASE_URL=postgresql://... (Railway가 자동 생성)
     CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
     ```

4. **배포 설정**
   - Settings → Deploy → Start Command:
     ```bash
     gunicorn --bind 0.0.0.0:$PORT capitalflow.wsgi:application
     ```

5. **PostgreSQL 추가**
   - "New" → "Database" → "Add PostgreSQL"
   - 자동으로 `DATABASE_URL` 환경 변수 생성됨

6. **마이그레이션 실행**
   - Deployments 탭 → 최신 배포 → "View Logs"
   - 또는 Railway CLI 사용:
     ```bash
     railway run python manage.py migrate
     ```

---

## 방법 2: Render (전체 스택) ⭐⭐ 가장 간단

### 장점
- ✅ 프론트엔드와 백엔드를 한 플랫폼에서 관리
- ✅ 무료 PostgreSQL 제공
- ✅ 자동 SSL 인증서
- ✅ 간단한 설정

### 단점
- ⚠️ 무료 티어는 15분 비활성 시 슬리프 모드 (첫 요청 시 느림)
- ⚠️ 월 750시간 제한

### 배포 단계

#### 2-1. Render에 백엔드 배포

1. **Render 계정 생성**
   - https://render.com 접속
   - GitHub 계정으로 로그인

2. **Web Service 생성**
   - "New" → "Web Service"
   - GitHub 저장소 연결
   - 설정:
     - **Name**: `capitalflow-backend`
     - **Root Directory**: `capitalflow/backend`
     - **Environment**: `Python 3`
     - **Build Command**: `pip install -r requirements.txt && python manage.py collectstatic --noinput`
     - **Start Command**: `gunicorn --bind 0.0.0.0:$PORT capitalflow.wsgi:application`

3. **환경 변수 설정**
   - Environment Variables 섹션:
     ```
     SECRET_KEY=your-secret-key-here
     DEBUG=False
     ALLOWED_HOSTS=your-backend.onrender.com
     CORS_ALLOWED_ORIGINS=https://your-frontend.onrender.com
     ```

4. **PostgreSQL 데이터베이스 추가**
   - "New" → "PostgreSQL"
   - 자동으로 `DATABASE_URL` 환경 변수 생성
   - 백엔드 서비스의 환경 변수에 자동 연결됨

5. **마이그레이션 실행**
   - Shell 탭에서:
     ```bash
     python manage.py migrate
     python manage.py createsuperuser
     ```

#### 2-2. Render에 프론트엔드 배포

1. **Static Site 생성**
   - "New" → "Static Site"
   - GitHub 저장소 연결
   - 설정:
     - **Name**: `capitalflow-frontend`
     - **Root Directory**: `capitalflow/frontend`
     - **Build Command**: `npm install && npm run build`
     - **Publish Directory**: `.next`

2. **환경 변수 설정**
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api/v1
   ```

3. **배포 완료**
   - 자동으로 빌드 및 배포됨

---

## 방법 3: Fly.io (전체 스택) ⭐⭐⭐ 가장 유연함

### 장점
- ✅ 무료 티어 제공 (월 3개 VM, 160GB 네트워크)
- ✅ 전 세계 CDN
- ✅ Docker 기반으로 유연한 설정
- ✅ 슬리프 모드 없음

### 단점
- ⚠️ 설정이 조금 복잡할 수 있음
- ⚠️ Dockerfile 최적화 필요

### 배포 단계

#### 3-1. Fly.io CLI 설치 및 로그인

```bash
# macOS
brew install flyctl

# 또는 curl 사용
curl -L https://fly.io/install.sh | sh

# 로그인
flyctl auth login
```

#### 3-2. 백엔드 배포

1. **프로젝트 초기화**
   ```bash
   cd capitalflow/backend
   flyctl launch
   ```
   - 앱 이름 입력 (예: `capitalflow-backend`)
   - 지역 선택 (예: `nrt` - 도쿄)
   - PostgreSQL 추가 선택: `Yes`

2. **fly.toml 수정**
   ```toml
   app = "capitalflow-backend"
   primary_region = "nrt"

   [build]
     dockerfile = "Dockerfile"

   [env]
     PORT = "8000"
     PYTHONUNBUFFERED = "1"

   [[services]]
     internal_port = 8000
     protocol = "tcp"

     [[services.ports]]
       port = 80
       handlers = ["http"]
       force_https = true

     [[services.ports]]
       port = 443
       handlers = ["tls", "http"]

     [services.concurrency]
       type = "connections"
       hard_limit = 25
       soft_limit = 20

   [[services.http_checks]]
     interval = "10s"
     timeout = "2s"
     grace_period = "5s"
     method = "GET"
     path = "/api/v1/health/"
   ```

3. **환경 변수 설정**
   ```bash
   flyctl secrets set SECRET_KEY=your-secret-key-here
   flyctl secrets set DEBUG=False
   flyctl secrets set ALLOWED_HOSTS=capitalflow-backend.fly.dev
   flyctl secrets set CORS_ALLOWED_ORIGINS=https://capitalflow-frontend.fly.dev
   ```

4. **배포**
   ```bash
   flyctl deploy
   ```

5. **마이그레이션 실행**
   ```bash
   flyctl ssh console
   python manage.py migrate
   python manage.py createsuperuser
   ```

#### 3-3. 프론트엔드 배포

1. **프로젝트 초기화**
   ```bash
   cd capitalflow/frontend
   flyctl launch
   ```
   - 앱 이름 입력 (예: `capitalflow-frontend`)
   - 지역 선택 (백엔드와 동일하게)

2. **Dockerfile.prod 확인/수정**
   ```dockerfile
   FROM node:18-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build

   FROM node:18-alpine AS runner
   WORKDIR /app
   ENV NODE_ENV production
   COPY --from=builder /app/public ./public
   COPY --from=builder /app/.next/standalone ./
   COPY --from=builder /app/.next/static ./.next/static
   EXPOSE 3000
   CMD ["node", "server.js"]
   ```

3. **next.config.js 수정**
   ```javascript
   /** @type {import('next').NextConfig} */
   const nextConfig = {
     output: 'standalone', // Fly.io용
     // ... 기존 설정
   }
   ```

4. **환경 변수 설정**
   ```bash
   flyctl secrets set NEXT_PUBLIC_API_URL=https://capitalflow-backend.fly.dev/api/v1
   ```

5. **배포**
   ```bash
   flyctl deploy
   ```

---

## 🔧 공통 설정 파일

### backend/capitalflow/settings/production.py 수정

```python
import os
from .base import *

DEBUG = False
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')

# 데이터베이스 설정
import dj_database_url
DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('DATABASE_URL'),
        conn_max_age=600
    )
}

# CORS 설정
CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',')

# 정적 파일 설정 (WhiteNoise 사용)
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATIC_URL = '/static/'
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# 보안 설정
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

### frontend/.env.production (또는 배포 플랫폼 환경 변수)

```
NEXT_PUBLIC_API_URL=https://your-backend-url.com/api/v1
```

---

## 📊 배포 방법 비교

| 항목 | Vercel + Railway | Render | Fly.io |
|------|-----------------|--------|--------|
| **설정 난이도** | ⭐⭐ 쉬움 | ⭐ 매우 쉬움 | ⭐⭐⭐ 보통 |
| **무료 티어** | ✅ 양호 | ⚠️ 제한적 | ✅ 양호 |
| **슬리프 모드** | ❌ 없음 | ⚠️ 있음 | ❌ 없음 |
| **Next.js 최적화** | ✅✅ 최고 | ✅ 좋음 | ✅ 좋음 |
| **데이터베이스** | ✅ 무료 제공 | ✅ 무료 제공 | ✅ 무료 제공 |
| **SSL 인증서** | ✅ 자동 | ✅ 자동 | ✅ 자동 |
| **CDN** | ✅✅ 전 세계 | ✅ 제한적 | ✅✅ 전 세계 |

---

## 🎯 추천 순서

1. **초보자/빠른 배포**: **Render** (방법 2)
2. **최적 성능**: **Vercel + Railway** (방법 1)
3. **유연한 설정**: **Fly.io** (방법 3)

---

## ⚠️ 주의사항

1. **환경 변수 보안**
   - `SECRET_KEY`는 절대 공개 저장소에 커밋하지 마세요
   - 배포 플랫폼의 환경 변수 기능 사용

2. **데이터베이스 백업**
   - 무료 티어는 백업이 제한적일 수 있음
   - 정기적으로 데이터 백업 권장

3. **CORS 설정**
   - 프론트엔드 URL을 백엔드의 `CORS_ALLOWED_ORIGINS`에 추가

4. **정적 파일**
   - 프로덕션에서는 CDN 사용 권장
   - WhiteNoise 또는 AWS S3/CloudFront 고려

5. **로깅 및 모니터링**
   - 배포 플랫폼의 로그 기능 활용
   - 에러 추적 도구 (Sentry 등) 고려

---

## 🆘 문제 해결

### 백엔드가 프론트엔드 요청을 받지 못하는 경우
- CORS 설정 확인
- `ALLOWED_HOSTS`에 프론트엔드 도메인 추가 확인

### 데이터베이스 연결 실패
- `DATABASE_URL` 환경 변수 확인
- 마이그레이션 실행 확인

### 정적 파일이 로드되지 않는 경우
- `collectstatic` 실행 확인
- WhiteNoise 설정 확인

---

## 📚 추가 리소스

- [Vercel 문서](https://vercel.com/docs)
- [Railway 문서](https://docs.railway.app)
- [Render 문서](https://render.com/docs)
- [Fly.io 문서](https://fly.io/docs)

