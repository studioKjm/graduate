# 🔍 Railway 배포 디버깅 가이드

## 현재 수정 사항

### 1. railway.json 수정
- `dockerfilePath`: `"capitalflow/backend/Dockerfile"` → `"Dockerfile"`
- Root Directory가 `capitalflow/backend`로 설정되면 상대 경로는 `Dockerfile`

### 2. Dockerfile CMD 수정
- Railway 환경 변수로 자동 선택하도록 변경
- `RAILWAY_ENVIRONMENT`가 있으면 `railway_start.sh`, 없으면 `render_start.sh`

---

## 배포 실패 원인 확인 방법

### 방법 1: Railway 웹 대시보드

1. **Railway 대시보드 접속**
   - https://railway.app
   - 프로젝트: `miraculous-optimism`
   - 서비스: `graduate`

2. **Deployments 탭**
   - 최근 배포 클릭
   - Build Logs 확인
   - Deploy Logs 확인

3. **확인 사항**
   - 빌드 에러 메시지
   - 시작 에러 메시지
   - 환경 변수 설정 여부

---

### 방법 2: Railway CLI

```bash
# 최근 배포 로그
npx @railway/cli logs --deployment

# 빌드 로그
npx @railway/cli logs --build

# 실시간 로그
npx @railway/cli logs

# 환경 변수 확인
npx @railway/cli variables
```

---

## 일반적인 배포 실패 원인

### 1. Root Directory 미설정
**증상**: Railpack이 프로젝트 구조를 찾지 못함

**해결**: Railway 대시보드 → Settings → Root Directory: `capitalflow/backend`

---

### 2. Dockerfile 경로 오류
**증상**: Dockerfile을 찾을 수 없음

**해결**: 
- Root Directory가 `capitalflow/backend`면 `dockerfilePath: "Dockerfile"`
- Root Directory가 비어있으면 `dockerfilePath: "capitalflow/backend/Dockerfile"`

---

### 3. 환경 변수 누락
**증상**: `SECRET_KEY` 또는 `DATABASE_URL` 에러

**해결**: Railway 대시보드 → Variables에서 필수 변수 설정

**필수 변수:**
```
DJANGO_SETTINGS_MODULE=capitalflow.settings.production
SECRET_KEY=<생성된 키>
DEBUG=False
ALLOWED_HOSTS=*.railway.app
CORS_ALLOWED_ORIGINS=https://capitalflow-frontend.onrender.com
```

---

### 4. PostgreSQL 미설정
**증상**: `DATABASE_URL` 에러

**해결**: 
1. Railway 대시보드 → "New" → "Database" → "Add PostgreSQL"
2. `DATABASE_URL` 자동 설정 확인

---

### 5. requirements.txt 문제
**증상**: pip install 실패

**해결**: 
- `requirements.txt` 파일 존재 확인
- 의존성 버전 확인

---

### 6. 시작 스크립트 문제
**증상**: 컨테이너 시작 후 즉시 종료

**해결**:
- `railway_start.sh` 파일 존재 확인
- 실행 권한 확인 (`chmod +x`)
- Dockerfile에서 실행 권한 부여 확인

---

## 체크리스트

### Railway 설정
- [ ] Root Directory: `capitalflow/backend` 설정
- [ ] Build Command: (비워두기)
- [ ] Start Command: (비워두기)

### 파일 확인
- [ ] `capitalflow/backend/Dockerfile` 존재
- [ ] `capitalflow/backend/railway_start.sh` 존재
- [ ] `capitalflow/backend/requirements.txt` 존재
- [ ] `railway.json` (프로젝트 루트) 존재

### 환경 변수
- [ ] `DJANGO_SETTINGS_MODULE` 설정
- [ ] `SECRET_KEY` 설정
- [ ] `DATABASE_URL` 자동 설정 (PostgreSQL 추가 시)
- [ ] `ALLOWED_HOSTS` 설정
- [ ] `CORS_ALLOWED_ORIGINS` 설정

---

## 다음 단계

1. **Railway 대시보드에서 확인**
   - Deployments → 최근 배포 → Logs
   - 에러 메시지 확인

2. **에러 메시지 공유**
   - 빌드 에러인지 시작 에러인지 확인
   - 정확한 에러 메시지 확인

3. **재배포**
   - 설정 수정 후 "Redeploy" 클릭

---

## 빠른 해결

가장 빠른 해결 방법:

1. **Railway 대시보드 → Settings**
   - Root Directory: `capitalflow/backend` 확인
   - Build Command: (비워두기)
   - Start Command: (비워두기)

2. **Variables 탭**
   - 필수 환경 변수 모두 설정 확인

3. **Deployments 탭**
   - "Redeploy" 클릭
   - 로그 확인

