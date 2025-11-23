# 🚂 Railway 배포 상태 및 해결 방법

## 현재 상태

### 발견된 문제
```
⚠ Script start.sh not found
✖ Railpack could not determine how to build the app.
```

**원인**: Root Directory가 설정되지 않아 Railway가 프로젝트 루트에서 빌드를 시도하고 있습니다.

---

## 즉시 해결 방법

### 1단계: Railway 대시보드에서 Root Directory 설정

1. **Railway 대시보드 접속**
   - https://railway.app
   - 프로젝트: `miraculous-optimism`
   - 서비스: `graduate`

2. **Settings 탭**
   - **Root Directory**: `capitalflow/backend` 입력
   - **Build Command**: (비워두기)
   - **Start Command**: (비워두기)

3. **저장 후 재배포**
   - "Redeploy" 클릭

---

### 2단계: 환경 변수 설정

Railway 대시보드 → 서비스 → Variables:

**필수 변수:**
```
DJANGO_SETTINGS_MODULE=capitalflow.settings.production
SECRET_KEY=gB2OxSwOWMVSeczBlowx8XAoHerDyf_u7hVdANOM-CZ1sGEYkjP4rgPjDSENcGyQ1QA
DEBUG=False
ALLOWED_HOSTS=*.railway.app
CORS_ALLOWED_ORIGINS=https://capitalflow-frontend.onrender.com
SECURE_SSL_REDIRECT=True
```

**선택 변수:**
```
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@example.com
DJANGO_SUPERUSER_PASSWORD=<강력한 비밀번호>
```

---

### 3단계: PostgreSQL 추가 (아직 없다면)

1. Railway 대시보드 → 프로젝트
2. "New" → "Database" → "Add PostgreSQL"
3. `DATABASE_URL` 자동 설정됨 ✅

---

## 재배포 후 확인

```bash
# 배포 로그 확인
npx @railway/cli logs --deployment

# 실시간 로그 확인
npx @railway/cli logs

# 상태 확인
npx @railway/cli status
```

---

## 예상 결과

설정 후:
- ✅ Dockerfile 빌드 성공
- ✅ `railway_start.sh` 실행
- ✅ 마이그레이션 자동 실행
- ✅ Gunicorn 서버 시작
- ✅ API 정상 작동

---

## 추가 파일

- `railway.json`: Railway 설정 파일 (프로젝트 루트)
- `RAILWAY_FIX.md`: 상세 문제 해결 가이드
- `backend/railway_start.sh`: Railway용 시작 스크립트

