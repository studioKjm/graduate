# 🔍 Railway 배포 실패 원인 분석

## 발견된 문제점

### 1. railway.json 설정 문제

**현재 설정:**
```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "capitalflow/backend/Dockerfile"
  }
}
```

**문제:**
- Root Directory가 `capitalflow/backend`로 설정되면, dockerfilePath는 `Dockerfile`이어야 함
- 현재 설정은 프로젝트 루트 기준 경로를 사용하고 있음

**해결:**
- Root Directory 설정에 따라 dockerfilePath 수정 필요
- 또는 Root Directory를 설정하지 않고 프로젝트 루트에서 빌드

---

### 2. Dockerfile CMD 문제

**현재 설정:**
```dockerfile
CMD ["bash", "render_start.sh"]
```

**문제:**
- Railway에서는 `railway_start.sh`를 사용해야 함
- `render_start.sh`는 Render용 스크립트

**해결:**
- 환경 변수로 자동 선택하도록 수정
- 또는 Railway에서 startCommand로 오버라이드

---

### 3. 환경 변수 누락 가능성

**필수 환경 변수:**
- `DJANGO_SETTINGS_MODULE=capitalflow.settings.production`
- `SECRET_KEY` (설정 필요)
- `DATABASE_URL` (PostgreSQL 추가 시 자동 설정)
- `ALLOWED_HOSTS=*.railway.app`
- `CORS_ALLOWED_ORIGINS=https://capitalflow-frontend.onrender.com`

---

## 해결 방법

### 방법 1: Root Directory 설정 + railway.json 수정 (추천)

1. **Railway 대시보드**
   - Settings → Root Directory: `capitalflow/backend`

2. **railway.json 수정**
   ```json
   {
     "build": {
       "builder": "DOCKERFILE",
       "dockerfilePath": "Dockerfile"
     }
   }
   ```

3. **Dockerfile CMD 수정**
   - Railway 환경 변수로 자동 선택

---

### 방법 2: 프로젝트 루트에서 빌드

1. **Railway 대시보드**
   - Settings → Root Directory: (비워두기)

2. **railway.json 유지**
   ```json
   {
     "build": {
       "builder": "DOCKERFILE",
       "dockerfilePath": "capitalflow/backend/Dockerfile"
     }
   }
   ```

---

## 수정된 파일

### 1. railway.json
- dockerfilePath를 Root Directory 기준으로 수정
- startCommand 제거 (Dockerfile CMD 사용)

### 2. Dockerfile
- CMD를 Railway 환경 변수로 자동 선택하도록 수정

---

## 배포 전 체크리스트

- [ ] Root Directory 설정 확인
- [ ] railway.json dockerfilePath 확인
- [ ] Dockerfile CMD 확인
- [ ] 환경 변수 모두 설정
- [ ] PostgreSQL 서비스 추가 확인
- [ ] railway_start.sh 파일 존재 확인

---

## 재배포 후 확인

```bash
# 배포 로그 확인
npx @railway/cli logs --deployment

# 실시간 로그 확인
npx @railway/cli logs

# 환경 변수 확인
npx @railway/cli variables
```

