# 🐳 Docker 배포 요약

이 문서는 Render에서 Docker를 사용하여 배포할 때 필요한 핵심 정보를 요약합니다.

## ✅ 준비 완료된 파일

### 1. Dockerfile
- **위치**: `capitalflow/backend/Dockerfile`
- **특징**:
  - Render의 `$PORT` 환경 변수 지원
  - 최적화된 빌드 과정
  - Health check 준비 (선택사항)

### 2. .dockerignore
- **위치**: `capitalflow/backend/.dockerignore`
- **기능**: 불필요한 파일 제외로 빌드 속도 향상

### 3. production.py
- **위치**: `capitalflow/backend/capitalflow/settings/production.py`
- **특징**: `DATABASE_URL` 환경 변수 지원

## 🚀 Render 설정

### 필수 설정

1. **Environment**: `Docker` 선택
2. **Root Directory**: `capitalflow/backend`
3. **Build Command**: (비워두기)
4. **Start Command**: (비워두기)

### 환경 변수

```
SECRET_KEY=<랜덤 문자열>
DEBUG=False
ALLOWED_HOSTS=capitalflow-backend.onrender.com
CORS_ALLOWED_ORIGINS=https://capitalflow-frontend.onrender.com
DATABASE_URL=<PostgreSQL Internal Database URL>
DJANGO_SETTINGS_MODULE=capitalflow.settings.production
```

⚠️ **PORT 환경 변수는 설정하지 마세요!** Render가 자동으로 제공합니다.

## 📝 배포 순서

1. PostgreSQL 데이터베이스 생성
2. Web Service 생성 (Docker 선택)
3. 환경 변수 설정
4. 데이터베이스 연결
5. 배포 시작
6. 마이그레이션 실행

## 🔍 로컬 테스트

배포 전 로컬에서 테스트:

```bash
cd capitalflow/backend
docker build -t capitalflow-backend .
docker run -p 8000:8000 \
  -e SECRET_KEY=test \
  -e DEBUG=True \
  -e ALLOWED_HOSTS=localhost \
  -e DATABASE_URL=postgresql://... \
  capitalflow-backend
```

## 📚 상세 가이드

- **Docker 상세 가이드**: [RENDER_DOCKER_GUIDE.md](./RENDER_DOCKER_GUIDE.md)
- **전체 배포 가이드**: [RENDER_DEPLOYMENT_GUIDE.md](./RENDER_DEPLOYMENT_GUIDE.md)

## ⚠️ 주의사항

1. **Root Directory**: 반드시 `capitalflow/backend`로 설정
2. **Build/Start Command**: 비워두기 (Render가 자동 처리)
3. **PORT 환경 변수**: 설정하지 않기 (Render가 자동 제공)
4. **Dockerfile 위치**: `capitalflow/backend/Dockerfile`에 있어야 함

---

**준비 완료! 이제 Render에서 Docker를 선택하여 배포할 수 있습니다!** 🎉

