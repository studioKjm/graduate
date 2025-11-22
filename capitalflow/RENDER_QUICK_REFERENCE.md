# 📝 Render 배포 빠른 참조

배포 중 빠르게 참조할 수 있는 핵심 정보입니다.

## 🔑 필수 환경 변수

### 백엔드
```
SECRET_KEY=<랜덤 문자열>
DEBUG=False
ALLOWED_HOSTS=capitalflow-backend.onrender.com
CORS_ALLOWED_ORIGINS=https://capitalflow-frontend.onrender.com
DATABASE_URL=<PostgreSQL Internal Database URL>
DJANGO_SETTINGS_MODULE=capitalflow.settings.production
```

### 프론트엔드
```
NEXT_PUBLIC_API_URL=https://capitalflow-backend.onrender.com/api/v1
```

---

## 🛠️ 필수 명령어

### SECRET_KEY 생성
```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

### 마이그레이션
```bash
python manage.py migrate
```

### 슈퍼유저 생성
```bash
python manage.py createsuperuser
```

### 정적 파일 수집
```bash
python manage.py collectstatic --noinput
```

---

## 📍 중요 경로

### Root Directory
- **백엔드**: `capitalflow/backend`
- **프론트엔드**: `capitalflow/frontend`

### 빌드 명령어
- **백엔드**: 
  ```bash
  pip install -r requirements.txt && python manage.py collectstatic --noinput
  ```
- **프론트엔드**: 
  ```bash
  npm install && npm run build
  ```

### 시작 명령어
- **백엔드**: 
  ```bash
  gunicorn --bind 0.0.0.0:$PORT capitalflow.wsgi:application
  ```

### Publish Directory
- **프론트엔드**: `.next`

---

## 🔗 URL 구조

### 기본 URL
- 프론트엔드: `https://capitalflow-frontend.onrender.com`
- 백엔드: `https://capitalflow-backend.onrender.com`
- 관리자: `https://capitalflow-backend.onrender.com/admin/`
- API: `https://capitalflow-backend.onrender.com/api/v1/`

---

## ⚠️ 주의사항

1. **Root Directory는 반드시 지정해야 함**
   - 백엔드: `capitalflow/backend`
   - 프론트엔드: `capitalflow/frontend`

2. **DATABASE_URL은 Internal Database URL 사용**
   - External이 아닌 Internal URL 사용

3. **CORS 설정은 프론트엔드 배포 후 업데이트**
   - 처음에는 백엔드 URL로 설정
   - 프론트엔드 배포 후 프론트엔드 URL로 변경

4. **슬리프 모드**
   - 무료 플랜: 15분 비활성 시 슬리프 모드
   - 첫 요청 시 느릴 수 있음 (정상)

---

## 🆘 빠른 문제 해결

### 빌드 실패
→ Logs 탭에서 에러 확인

### 데이터베이스 연결 실패
→ DATABASE_URL 확인, Internal URL 사용 확인

### CORS 에러
→ CORS_ALLOWED_ORIGINS에 프론트엔드 URL 추가

### 500 에러
→ Logs 탭에서 에러 확인, SECRET_KEY 확인

---

## 📚 상세 가이드

- **전체 가이드**: [RENDER_DEPLOYMENT_GUIDE.md](./RENDER_DEPLOYMENT_GUIDE.md)
- **체크리스트**: [RENDER_DEPLOYMENT_CHECKLIST.md](./RENDER_DEPLOYMENT_CHECKLIST.md)

