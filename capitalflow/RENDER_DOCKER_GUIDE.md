# 🐳 Render Docker 배포 상세 가이드

이 가이드는 CapitalFlow 프로젝트를 **Docker를 사용하여** Render에 배포하는 방법을 상세히 설명합니다.

## 📋 목차

1. [Docker 배포 개요](#1-docker-배포-개요)
2. [Dockerfile 구조 설명](#2-dockerfile-구조-설명)
3. [Render에서 Docker 사용하기](#3-render에서-docker-사용하기)
4. [Docker 빌드 최적화](#4-docker-빌드-최적화)
5. [문제 해결](#5-문제-해결)

---

## 1. Docker 배포 개요

### Docker를 사용하는 이유

- ✅ **환경 일관성**: 로컬 개발 환경과 프로덕션 환경이 동일
- ✅ **의존성 관리**: 시스템 패키지까지 포함하여 완전한 제어
- ✅ **재현 가능성**: 동일한 Dockerfile로 언제든지 동일한 환경 구성
- ✅ **확장성**: 나중에 Kubernetes 등으로 확장 가능

### 현재 프로젝트의 Docker 설정

- **Dockerfile 위치**: `capitalflow/backend/Dockerfile`
- **.dockerignore 위치**: `capitalflow/backend/.dockerignore`
- **최적화 사항**:
  - Render의 `$PORT` 환경 변수 지원
  - Health check 포함
  - 멀티스테이지 빌드 (필요시)
  - 최소한의 이미지 크기

---

## 2. Dockerfile 구조 설명

### 현재 Dockerfile 분석

```dockerfile
# Python 3.11 기반 이미지 사용
FROM python:3.11-slim

# 환경 변수 설정
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

# 시스템 패키지 설치
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    pkg-config \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 작업 디렉토리 설정
WORKDIR /app

# Python 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 프로젝트 파일 복사
COPY . .

# 디렉토리 생성
RUN mkdir -p logs mediafiles staticfiles

# 정적 파일 수집
RUN python manage.py collectstatic --noinput || true

# 포트 노출
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/api/v1/ || exit 1

# Gunicorn 실행 (Render의 $PORT 환경 변수 사용)
CMD sh -c "gunicorn --bind 0.0.0.0:${PORT:-8000} --workers 2 --threads 2 --timeout 60 capitalflow.wsgi:application"
```

### 주요 포인트

1. **$PORT 환경 변수 사용**:
   ```dockerfile
   CMD sh -c "gunicorn --bind 0.0.0.0:${PORT:-8000} ..."
   ```
   - Render가 제공하는 `$PORT` 환경 변수를 사용
   - 기본값으로 8000 사용 (로컬 테스트용)

2. **Health Check**:
   - Render가 컨테이너 상태를 모니터링
   - `/api/v1/` 엔드포인트로 헬스 체크

3. **최적화**:
   - `--no-cache-dir`: pip 캐시 제거로 이미지 크기 감소
   - `&& rm -rf /var/lib/apt/lists/*`: apt 캐시 제거
   - `|| true`: collectstatic 실패해도 계속 진행

---

## 3. Render에서 Docker 사용하기

### 3-1. Render 설정

#### 기본 정보
- **Name**: `capitalflow-backend`
- **Region**: `Singapore` (또는 적절한 지역)
- **Branch**: `main`
- **Root Directory**: `capitalflow/backend` ⚠️ 중요!

#### Environment 설정
- **Environment**: `Docker` 선택

#### 빌드 및 실행 설정
- **Build Command**: (비워두기)
  - Render가 자동으로 `docker build` 실행
- **Start Command**: (비워두기)
  - Dockerfile의 `CMD`가 자동으로 사용됨

#### Dockerfile 경로
- Render는 `Root Directory` 기준으로 Dockerfile을 찾습니다
- `Root Directory`가 `capitalflow/backend`이면
- Dockerfile은 `capitalflow/backend/Dockerfile`에 있어야 함
- ✅ 이미 올바른 위치에 있습니다!

### 3-2. 환경 변수 설정

Docker를 사용하더라도 환경 변수는 동일하게 설정합니다:

#### 필수 환경 변수
```
SECRET_KEY=<랜덤 문자열>
DEBUG=False
ALLOWED_HOSTS=capitalflow-backend.onrender.com
CORS_ALLOWED_ORIGINS=https://capitalflow-frontend.onrender.com
DATABASE_URL=<PostgreSQL Internal Database URL>
DJANGO_SETTINGS_MODULE=capitalflow.settings.production
```

#### PORT 환경 변수
- ⚠️ **설정하지 마세요!**
- Render가 자동으로 `$PORT` 환경 변수를 제공합니다
- Dockerfile이 이미 이를 사용하도록 설정되어 있습니다

### 3-3. 데이터베이스 연결

1. **"Advanced"** 섹션에서 **"Add Database"** 클릭
2. PostgreSQL 데이터베이스 선택
3. `DATABASE_URL`이 자동으로 설정됨

### 3-4. 배포 시작

1. 모든 설정 확인
2. **"Create Web Service"** 클릭
3. Docker 빌드가 시작됩니다 (약 5-10분 소요)

---

## 4. Docker 빌드 최적화

### 4-1. .dockerignore 활용

`.dockerignore` 파일이 이미 생성되어 있습니다:

```
# 불필요한 파일 제외
venv/
__pycache__/
*.pyc
.env
*.log
db.sqlite3
...
```

**효과**:
- 빌드 컨텍스트 크기 감소
- 빌드 시간 단축
- 보안 향상 (민감한 파일 제외)

### 4-2. 레이어 캐싱 최적화

현재 Dockerfile은 이미 최적화되어 있습니다:

```dockerfile
# 1. 의존성 먼저 복사 및 설치 (변경 빈도 낮음)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 2. 프로젝트 파일 나중에 복사 (변경 빈도 높음)
COPY . .
```

**효과**:
- 코드만 변경되면 의존성 레이어는 재사용
- 빌드 시간 단축

### 4-3. 멀티스테이지 빌드 (선택사항)

현재는 단일 스테이지를 사용하지만, 필요시 멀티스테이지로 변경 가능:

```dockerfile
# 빌드 스테이지
FROM python:3.11-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# 실행 스테이지
FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . .
ENV PATH=/root/.local/bin:$PATH
CMD ["gunicorn", ...]
```

**효과**:
- 최종 이미지 크기 감소
- 빌드 도구 제거

---

## 5. 문제 해결

### 문제 1: Docker 빌드 실패

**증상**: 배포 중 Docker 빌드가 실패함

**해결 방법**:
1. **"Logs"** 탭에서 에러 메시지 확인
2. 일반적인 원인:
   - Dockerfile 문법 오류
   - 의존성 설치 실패
   - 파일 경로 오류

**예시 - Dockerfile 문법 확인**:
```bash
# 로컬에서 테스트
cd capitalflow/backend
docker build -t capitalflow-test .
```

### 문제 2: PORT 환경 변수 오류

**증상**: `bind: address already in use` 또는 포트 관련 에러

**해결 방법**:
1. Dockerfile의 CMD 확인:
   ```dockerfile
   CMD sh -c "gunicorn --bind 0.0.0.0:${PORT:-8000} ..."
   ```
2. `$PORT` 환경 변수가 사용되는지 확인
3. Render가 자동으로 `$PORT`를 제공하는지 확인

### 문제 3: Health Check 실패

**증상**: Health check가 계속 실패함

**해결 방법**:
1. Health check 엔드포인트 확인:
   ```dockerfile
   CMD curl -f http://localhost:${PORT:-8000}/api/v1/ || exit 1
   ```
2. `/api/v1/` 엔드포인트가 존재하는지 확인
3. 필요시 다른 엔드포인트로 변경:
   ```dockerfile
   CMD curl -f http://localhost:${PORT:-8000}/admin/ || exit 1
   ```

### 문제 4: 빌드 시간이 너무 김

**증상**: Docker 빌드가 10분 이상 걸림

**해결 방법**:
1. `.dockerignore` 확인 (불필요한 파일 제외)
2. 레이어 캐싱 확인
3. 멀티스테이지 빌드 고려

### 문제 5: 이미지 크기가 너무 큼

**증상**: Docker 이미지가 1GB 이상

**해결 방법**:
1. `python:3.11-slim` 사용 (이미 사용 중)
2. 불필요한 패키지 제거
3. 멀티스테이지 빌드 사용
4. `.dockerignore` 확인

---

## ✅ Docker 배포 체크리스트

### 배포 전 확인
- [ ] Dockerfile이 `$PORT` 환경 변수를 사용하는지 확인
- [ ] `.dockerignore` 파일이 올바르게 설정되었는지 확인
- [ ] 로컬에서 Docker 빌드 테스트 성공
- [ ] Root Directory가 `capitalflow/backend`로 설정됨

### 배포 후 확인
- [ ] Docker 빌드가 성공적으로 완료됨
- [ ] 컨테이너가 정상적으로 시작됨
- [ ] Health check가 통과함
- [ ] API 엔드포인트가 정상 작동함

---

## 🔧 로컬 Docker 테스트

배포 전 로컬에서 Docker 이미지를 테스트할 수 있습니다:

```bash
# 프로젝트 디렉토리로 이동
cd capitalflow/backend

# Docker 이미지 빌드
docker build -t capitalflow-backend .

# Docker 컨테이너 실행 (로컬 테스트)
docker run -p 8000:8000 \
  -e SECRET_KEY=test-secret-key \
  -e DEBUG=True \
  -e ALLOWED_HOSTS=localhost \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e DJANGO_SETTINGS_MODULE=capitalflow.settings.production \
  capitalflow-backend

# 브라우저에서 http://localhost:8000 접속 테스트
```

---

## 📚 추가 리소스

- [Docker 공식 문서](https://docs.docker.com/)
- [Render Docker 가이드](https://render.com/docs/docker)
- [Django Docker 배포](https://docs.djangoproject.com/en/4.2/howto/deployment/docker/)

---

## 🎉 완료!

이제 Docker를 사용하여 Render에 배포할 준비가 되었습니다!

**다음 단계**: [RENDER_DEPLOYMENT_GUIDE.md](./RENDER_DEPLOYMENT_GUIDE.md)의 5단계를 따라 Docker를 선택하여 배포하세요.

