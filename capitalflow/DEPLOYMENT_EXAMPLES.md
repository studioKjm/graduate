# 🛠️ 배포 플랫폼별 설정 파일 예시

이 문서는 각 배포 방법에 필요한 구체적인 설정 파일 예시를 제공합니다.

---

## 방법 1: Vercel + Railway 설정

### Railway 백엔드 설정

#### `railway.json` (선택사항)
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "gunicorn --bind 0.0.0.0:$PORT capitalflow.wsgi:application",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### Railway 환경 변수 예시
```
SECRET_KEY=your-super-secret-key-change-this-in-production
DEBUG=False
ALLOWED_HOSTS=your-app.railway.app,*.railway.app
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

### Vercel 프론트엔드 설정

#### `vercel.json` (선택사항)
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["icn1"],
  "env": {
    "NEXT_PUBLIC_API_URL": "https://your-backend.railway.app/api/v1"
  }
}
```

---

## 방법 2: Render 설정

### Render 백엔드 설정

#### `render.yaml` (선택사항, 자동 배포용)
```yaml
services:
  - type: web
    name: capitalflow-backend
    env: python
    region: singapore
    plan: free
    buildCommand: pip install -r requirements.txt && python manage.py collectstatic --noinput
    startCommand: gunicorn --bind 0.0.0.0:$PORT capitalflow.wsgi:application
    envVars:
      - key: SECRET_KEY
        generateValue: true
      - key: DEBUG
        value: False
      - key: ALLOWED_HOSTS
        value: capitalflow-backend.onrender.com
      - key: CORS_ALLOWED_ORIGINS
        value: https://capitalflow-frontend.onrender.com
    healthCheckPath: /api/v1/health/

databases:
  - name: capitalflow-db
    plan: free
    databaseName: capitalflow
    user: capitalflow_user
```

### Render 프론트엔드 설정

#### Static Site 설정
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `.next`
- **Environment Variables**:
  ```
  NEXT_PUBLIC_API_URL=https://capitalflow-backend.onrender.com/api/v1
  ```

---

## 방법 3: Fly.io 설정

### Fly.io 백엔드 설정

#### `backend/fly.toml`
```toml
app = "capitalflow-backend"
primary_region = "nrt"

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "8000"
  PYTHONUNBUFFERED = "1"
  DJANGO_SETTINGS_MODULE = "capitalflow.settings.production"

[[services]]
  internal_port = 8000
  protocol = "tcp"
  processes = ["app"]

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

[[services.tcp_checks]]
  interval = "15s"
  timeout = "2s"
  grace_period = "1s"
```

#### Fly.io 백엔드 Dockerfile 최적화
```dockerfile
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 프로젝트 복사
COPY . .

# 정적 파일 수집
RUN python manage.py collectstatic --noinput || true

# 포트 노출
EXPOSE 8000

# Gunicorn 실행
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "--threads", "2", "--timeout", "30", "capitalflow.wsgi:application"]
```

### Fly.io 프론트엔드 설정

#### `frontend/fly.toml`
```toml
app = "capitalflow-frontend"
primary_region = "nrt"

[build]
  dockerfile = "Dockerfile.prod"

[env]
  PORT = "3000"
  NODE_ENV = "production"

[[services]]
  internal_port = 3000
  protocol = "tcp"
  processes = ["app"]

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
    path = "/"
```

#### `frontend/Dockerfile.prod` (Fly.io용)
```dockerfile
# 빌드 단계
FROM node:18-alpine AS builder

WORKDIR /app

# 패키지 파일 복사 및 설치
COPY package*.json ./
RUN npm ci --only=production=false

# 소스 코드 복사 및 빌드
COPY . .
RUN npm run build

# 실행 단계
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# 필요한 파일만 복사
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 포트 노출
EXPOSE 3000

# 서버 실행
CMD ["node", "server.js"]
```

#### `frontend/next.config.js` (Fly.io용 수정)
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  // Fly.io용 standalone 모드
  output: 'standalone',
  
  headers: async () => {
    return [
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1',
    NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '',
  },
  images: {
    domains: ['images.unsplash.com'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
```

---

## 공통: Django 프로덕션 설정 개선

### `backend/capitalflow/settings/production.py` 개선안

```python
"""
Production settings
"""
import os
import dj_database_url
from .base import *

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DEBUG', 'False') == 'True'

# 호스트 설정
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')
ALLOWED_HOSTS = [h.strip() for h in ALLOWED_HOSTS if h.strip()]

# Secret Key
SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable is required in production")

# 데이터베이스 설정 (DATABASE_URL 우선 사용)
DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    # DATABASE_URL이 있으면 사용 (Railway, Render, Fly.io 등)
    DATABASES = {
        'default': dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
else:
    # 개별 설정 사용 (기존 방식)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('DB_NAME'),
            'USER': config('DB_USER'),
            'PASSWORD': config('DB_PASSWORD'),
            'HOST': config('DB_HOST'),
            'PORT': config('DB_PORT', default='5432'),
            'OPTIONS': {
                'sslmode': 'require',
            },
        }
    }

# CORS 설정
CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',')
CORS_ALLOWED_ORIGINS = [o.strip() for o in CORS_ALLOWED_ORIGINS if o.strip()]

# 정적 파일 설정 (WhiteNoise)
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATIC_URL = '/static/'

# WhiteNoise 미들웨어 추가 (이미 base.py에 있으면 생략)
if 'whitenoise.middleware.WhiteNoiseMiddleware' not in MIDDLEWARE:
    MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# 보안 설정
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_SECONDS = 31536000
SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'True') == 'True'
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Session 보안
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True

# 로깅 설정
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
```

---

## 배포 체크리스트

### 배포 전 확인사항

- [ ] `SECRET_KEY` 환경 변수 설정
- [ ] `DEBUG=False` 설정
- [ ] `ALLOWED_HOSTS`에 배포 도메인 추가
- [ ] `CORS_ALLOWED_ORIGINS`에 프론트엔드 URL 추가
- [ ] 데이터베이스 마이그레이션 실행
- [ ] 정적 파일 수집 (`collectstatic`)
- [ ] 슈퍼유저 생성
- [ ] 환경 변수 모두 설정 확인
- [ ] 로그 확인 가능한지 테스트

### 배포 후 확인사항

- [ ] 프론트엔드가 백엔드 API에 연결되는지 확인
- [ ] CORS 에러 없는지 확인
- [ ] 정적 파일이 로드되는지 확인
- [ ] 데이터베이스 연결 확인
- [ ] 관리자 페이지 접속 가능한지 확인
- [ ] 에러 로그 모니터링

---

## 빠른 배포 스크립트 예시

### Railway 배포 스크립트
```bash
#!/bin/bash
# railway-deploy.sh

echo "🚀 Railway에 배포 중..."

# 환경 변수 설정
railway variables set SECRET_KEY=$(openssl rand -hex 32)
railway variables set DEBUG=False
railway variables set ALLOWED_HOSTS=your-app.railway.app

# 배포
railway up

# 마이그레이션
railway run python manage.py migrate

echo "✅ 배포 완료!"
```

### Fly.io 배포 스크립트
```bash
#!/bin/bash
# fly-deploy.sh

echo "🚀 Fly.io에 배포 중..."

# 백엔드 배포
cd backend
flyctl deploy

# 마이그레이션
flyctl ssh console -C "python manage.py migrate"

# 프론트엔드 배포
cd ../frontend
flyctl deploy

echo "✅ 배포 완료!"
```

