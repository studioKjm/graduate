# 🔧 Railway 배포 문제 해결 가이드

## 현재 상태 확인

### Railway CLI 로그인 필요

Railway MCP 도구를 사용하려면 Railway CLI가 로그인되어 있어야 합니다.

### 로그인 방법

터미널에서 다음 명령어 실행:

```bash
# Railway CLI 로그인 (브라우저가 열림)
npx @railway/cli login

# 또는 전역 설치 후
railway login
```

로그인 후 Railway MCP 도구를 사용할 수 있습니다.

---

## Railway 웹 대시보드에서 확인

CLI 로그인 전에도 Railway 웹 대시보드에서 직접 확인할 수 있습니다:

1. **Railway 대시보드 접속**: https://railway.app
2. **프로젝트 선택**: `studioKjm/graduate` 프로젝트
3. **서비스 확인**:
   - 백엔드 서비스 상태
   - PostgreSQL 데이터베이스 상태
   - 최근 배포 상태

---

## 일반적인 배포 에러 및 해결 방법

### 1. 빌드 실패

**증상**: Dockerfile 빌드 중 에러

**해결 방법**:
- Railway 대시보드 → 서비스 → Deployments → 최근 배포 → Logs 확인
- 일반적인 원인:
  - `requirements.txt` 의존성 문제
  - Dockerfile 경로 문제
  - Root Directory 설정 오류

**체크리스트**:
- [ ] Root Directory: `capitalflow/backend` 설정 확인
- [ ] Dockerfile이 `capitalflow/backend/Dockerfile`에 있는지 확인
- [ ] `requirements.txt`가 올바른지 확인

---

### 2. 시작 실패 (Start Command Error)

**증상**: 컨테이너는 시작되지만 애플리케이션이 실행되지 않음

**해결 방법**:
- Railway 대시보드 → 서비스 → Logs 확인
- `railway_start.sh` 스크립트가 실행되는지 확인

**체크리스트**:
- [ ] `railway_start.sh` 파일이 존재하는지 확인
- [ ] 파일에 실행 권한이 있는지 확인 (`chmod +x railway_start.sh`)
- [ ] Dockerfile에서 `railway_start.sh`에 실행 권한 부여 확인

**Dockerfile 확인**:
```dockerfile
RUN chmod +x render_start.sh railway_start.sh
CMD ["bash", "railway_start.sh"]
```

---

### 3. 데이터베이스 연결 실패

**증상**: `DATABASE_URL` 관련 에러

**해결 방법**:
- Railway 대시보드 → PostgreSQL 서비스 → Variables → `DATABASE_URL` 확인
- 백엔드 서비스 → Variables → `DATABASE_URL`이 자동으로 설정되었는지 확인

**체크리스트**:
- [ ] PostgreSQL 서비스가 같은 프로젝트에 있는지 확인
- [ ] `DATABASE_URL` 환경 변수가 자동으로 설정되었는지 확인
- [ ] `production.py`에서 `DATABASE_URL`을 사용하도록 설정되어 있는지 확인

---

### 4. 환경 변수 누락

**증상**: `SECRET_KEY` 또는 기타 필수 환경 변수 에러

**해결 방법**:
Railway 대시보드 → 백엔드 서비스 → Variables에서 다음 변수 확인:

**필수 환경 변수**:
```
DJANGO_SETTINGS_MODULE=capitalflow.settings.production
SECRET_KEY=<강력한 시크릿 키>
DEBUG=False
ALLOWED_HOSTS=*.railway.app
CORS_ALLOWED_ORIGINS=https://capitalflow-frontend.onrender.com
SECURE_SSL_REDIRECT=True
```

**선택 환경 변수**:
```
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@example.com
DJANGO_SUPERUSER_PASSWORD=<강력한 비밀번호>
```

---

### 5. 포트 바인딩 에러

**증상**: `Address already in use` 또는 포트 관련 에러

**해결 방법**:
- Railway는 `PORT` 환경 변수를 자동으로 제공
- `railway_start.sh`에서 `${PORT:-8000}` 사용 확인

**확인 사항**:
```bash
# railway_start.sh 마지막 줄
exec gunicorn --bind 0.0.0.0:${PORT:-8000} ...
```

---

### 6. CORS 에러

**증상**: 프론트엔드에서 API 호출 시 CORS 에러

**해결 방법**:
- Railway 백엔드 → Variables → `CORS_ALLOWED_ORIGINS` 확인
- 프론트엔드 URL이 포함되어 있는지 확인:
  ```
  CORS_ALLOWED_ORIGINS=https://capitalflow-frontend.onrender.com
  ```

---

### 7. 정적 파일 수집 실패

**증상**: `collectstatic` 에러

**해결 방법**:
- `railway_start.sh`에서 `|| true`로 에러 무시 설정 확인
- 또는 Dockerfile에서 빌드 시 수집 확인

---

## Railway CLI로 로그 확인

Railway CLI 로그인 후:

```bash
# 프로젝트 연결
cd /Users/jimin/graduate/capitalflow
npx @railway/cli link

# 배포 로그 확인
npx @railway/cli logs

# 특정 서비스 로그 확인
npx @railway/cli logs --service <service-name>
```

---

## Railway 대시보드에서 직접 확인

1. **배포 상태**: 프로젝트 → 서비스 → Deployments
2. **실시간 로그**: 프로젝트 → 서비스 → Logs
3. **환경 변수**: 프로젝트 → 서비스 → Variables
4. **리소스 사용량**: 프로젝트 → 서비스 → Metrics

---

## 빠른 문제 해결 체크리스트

### 배포 전 확인
- [ ] Root Directory: `capitalflow/backend` 설정
- [ ] Dockerfile 존재 및 올바른 위치
- [ ] `railway_start.sh` 파일 존재 및 실행 권한
- [ ] 모든 필수 환경 변수 설정

### 배포 후 확인
- [ ] 배포 상태: "Active" 또는 "Deployed"
- [ ] 로그에 에러 없음
- [ ] API 엔드포인트 응답 확인
- [ ] Admin 페이지 접근 가능

---

## 다음 단계

1. **Railway CLI 로그인**:
   ```bash
   npx @railway/cli login
   ```

2. **프로젝트 연결**:
   ```bash
   cd /Users/jimin/graduate/capitalflow
   npx @railway/cli link
   ```

3. **상태 확인**:
   ```bash
   npx @railway/cli status
   npx @railway/cli logs
   ```

로그인 후 Railway MCP 도구를 사용하여 자동으로 상태를 확인하고 문제를 해결할 수 있습니다.

