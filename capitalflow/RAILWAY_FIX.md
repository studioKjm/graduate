# 🔧 Railway 배포 에러 해결 방법

## 발견된 문제

### 에러 메시지
```
⚠ Script start.sh not found
✖ Railpack could not determine how to build the app.
The app contents that Railpack analyzed contains:
./
├── capitalflow/
├── .gitignore
└── README.md
```

### 원인
1. **Root Directory 미설정**: Railway가 프로젝트 루트(`/`)에서 빌드를 시도하고 있음
2. **Dockerfile 경로 문제**: `capitalflow/backend/Dockerfile`을 찾지 못함
3. **Railpack 자동 감지 실패**: Python 프로젝트를 감지하지 못함

---

## 해결 방법

### 방법 1: Railway 대시보드에서 설정 (추천) ⭐

1. **Railway 대시보드 접속**
   - https://railway.app
   - 프로젝트: `miraculous-optimism` 선택
   - 서비스: `graduate` 선택

2. **Settings 탭에서 설정**
   - **Root Directory**: `capitalflow/backend` 입력
   - **Build Command**: (비워두기 - Dockerfile 사용)
   - **Start Command**: (비워두기 - Dockerfile CMD 사용)

3. **Deploy 탭에서 재배포**
   - "Redeploy" 클릭

---

### 방법 2: Railway CLI로 설정

```bash
# 서비스 설정 확인
npx @railway/cli service

# Root Directory 설정 (Railway CLI는 직접 설정 불가)
# 대시보드에서 수동 설정 필요
```

---

### 방법 3: railway.json 파일 사용

프로젝트 루트에 `railway.json` 파일을 생성했습니다:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "capitalflow/backend/Dockerfile"
  },
  "deploy": {
    "startCommand": "bash railway_start.sh",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

이 파일이 있으면 Railway가 자동으로 Dockerfile 경로를 인식합니다.

---

## 환경 변수 설정

Railway 대시보드 → 서비스 → Variables에서 다음 변수 추가:

### 필수 환경 변수
```
DJANGO_SETTINGS_MODULE=capitalflow.settings.production
SECRET_KEY=<강력한 시크릿 키 생성>
DEBUG=False
ALLOWED_HOSTS=*.railway.app
CORS_ALLOWED_ORIGINS=https://capitalflow-frontend.onrender.com
SECURE_SSL_REDIRECT=True
```

### 슈퍼유저 생성 (선택)
```
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@example.com
DJANGO_SUPERUSER_PASSWORD=<강력한 비밀번호>
```

### 데이터베이스
- PostgreSQL 서비스를 추가하면 `DATABASE_URL`이 자동으로 설정됩니다.

---

## SECRET_KEY 생성 방법

```bash
# Python으로 생성
python3 -c "import secrets; print(secrets.token_urlsafe(50))"

# 또는 Django로 생성
python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

---

## 재배포 후 확인

1. **배포 로그 확인**
   ```bash
   npx @railway/cli logs --deployment
   ```

2. **실시간 로그 확인**
   ```bash
   npx @railway/cli logs
   ```

3. **서비스 상태 확인**
   ```bash
   npx @railway/cli status
   ```

4. **API 테스트**
   - 도메인 생성: Settings → "Generate Domain"
   - API 테스트: `https://<railway-url>/api/v1/`
   - Admin 테스트: `https://<railway-url>/admin/`

---

## 체크리스트

### Railway 설정
- [ ] Root Directory: `capitalflow/backend` 설정
- [ ] Build Command: (비워두기)
- [ ] Start Command: (비워두기)
- [ ] Dockerfile 자동 감지 확인

### 환경 변수
- [ ] `DJANGO_SETTINGS_MODULE` 설정
- [ ] `SECRET_KEY` 설정
- [ ] `ALLOWED_HOSTS` 설정
- [ ] `CORS_ALLOWED_ORIGINS` 설정
- [ ] `DATABASE_URL` 자동 설정 확인 (PostgreSQL 추가 시)

### 배포
- [ ] 재배포 성공
- [ ] 로그에 에러 없음
- [ ] API 엔드포인트 응답 확인

---

## 예상 결과

설정 후 재배포하면:
- ✅ Dockerfile을 사용한 빌드 성공
- ✅ `railway_start.sh` 스크립트 실행
- ✅ 마이그레이션 자동 실행
- ✅ Gunicorn 서버 시작
- ✅ API 엔드포인트 정상 작동

