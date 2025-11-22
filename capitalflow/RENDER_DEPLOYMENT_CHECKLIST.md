# ✅ Render 배포 체크리스트

이 체크리스트를 따라가며 배포를 진행하세요.

## 📋 배포 전 준비

### 코드 준비
- [ ] 모든 변경사항이 GitHub에 푸시됨
- [ ] `.env` 파일이 `.gitignore`에 포함되어 있음
- [ ] 민감한 정보가 코드에 하드코딩되지 않음
- [ ] `production.py` 설정 파일이 올바르게 구성됨

### Render 계정
- [ ] Render 계정 생성 완료
- [ ] GitHub 계정 연결 완료
- [ ] 저장소 접근 권한 승인 완료

---

## 🗄️ 데이터베이스 설정

### PostgreSQL 생성
- [ ] PostgreSQL 서비스 생성
- [ ] Name: `capitalflow-db` (또는 원하는 이름)
- [ ] Region: `Singapore` (또는 적절한 지역)
- [ ] Plan: `Free` 선택
- [ ] Internal Database URL 복사 완료

---

## 🔧 백엔드 배포

### 서비스 생성
- [ ] Web Service 생성
- [ ] Name: `capitalflow-backend`
- [ ] Root Directory: `capitalflow/backend` ⚠️ 중요!
- [ ] Region: 데이터베이스와 동일
- [ ] Branch: `main`

### 빌드 설정
- [ ] Environment: `Python 3`
- [ ] Build Command: 
  ```bash
  pip install -r requirements.txt && python manage.py collectstatic --noinput
  ```
- [ ] Start Command:
  ```bash
  gunicorn --bind 0.0.0.0:$PORT capitalflow.wsgi:application
  ```
- [ ] Plan: `Free`

### 환경 변수 설정
- [ ] `SECRET_KEY` 설정 (랜덤 문자열)
- [ ] `DEBUG=False` 설정
- [ ] `ALLOWED_HOSTS` 설정 (예: `capitalflow-backend.onrender.com`)
- [ ] `CORS_ALLOWED_ORIGINS` 설정 (임시로 백엔드 URL)
- [ ] `DJANGO_SETTINGS_MODULE=capitalflow.settings.production` 설정
- [ ] `DATABASE_URL` 설정 (PostgreSQL의 Internal Database URL)

### 데이터베이스 연결
- [ ] PostgreSQL 데이터베이스 연결 완료
- [ ] `DATABASE_URL`이 자동으로 설정됨

### 배포 확인
- [ ] 배포가 성공적으로 완료됨
- [ ] 로그에 에러 없음
- [ ] 백엔드 URL 확인: `https://capitalflow-backend.onrender.com`

---

## 🎨 프론트엔드 배포

### Static Site 생성
- [ ] Static Site 생성
- [ ] Name: `capitalflow-frontend`
- [ ] Root Directory: `capitalflow/frontend` ⚠️ 중요!
- [ ] Branch: `main`

### 빌드 설정
- [ ] Build Command: `npm install && npm run build`
- [ ] Publish Directory: `.next`
- [ ] Plan: `Free`

### 환경 변수 설정
- [ ] `NEXT_PUBLIC_API_URL` 설정
  - Value: `https://capitalflow-backend.onrender.com/api/v1`

### 배포 확인
- [ ] 배포가 성공적으로 완료됨
- [ ] 프론트엔드 URL 확인: `https://capitalflow-frontend.onrender.com`

---

## 🔗 연결 설정

### CORS 업데이트
- [ ] 백엔드의 `CORS_ALLOWED_ORIGINS` 업데이트
- [ ] 프론트엔드 URL로 변경: `https://capitalflow-frontend.onrender.com`
- [ ] 재배포 완료

---

## 🗃️ 데이터베이스 초기화

### 마이그레이션
- [ ] Shell 접속 성공
- [ ] `python manage.py migrate` 실행 완료
- [ ] 에러 없이 완료됨

### 슈퍼유저 생성
- [ ] `python manage.py createsuperuser` 실행
- [ ] 관리자 계정 생성 완료
- [ ] 사용자 이름, 비밀번호 기록 (안전한 곳에 보관)

### 정적 파일 확인
- [ ] `python manage.py collectstatic --noinput` 실행 (필요시)
- [ ] 정적 파일이 정상적으로 수집됨

---

## 🧪 테스트

### 백엔드 테스트
- [ ] 백엔드 URL 접속 가능: `https://capitalflow-backend.onrender.com`
- [ ] API 엔드포인트 테스트 (예: `/api/v1/countries/`)
- [ ] 관리자 페이지 접속: `https://capitalflow-backend.onrender.com/admin/`
- [ ] 관리자 로그인 성공

### 프론트엔드 테스트
- [ ] 프론트엔드 URL 접속 가능: `https://capitalflow-frontend.onrender.com`
- [ ] 페이지가 정상적으로 로드됨
- [ ] 브라우저 콘솔에 에러 없음 (F12 → Console)
- [ ] 네트워크 탭에서 API 요청 성공 (F12 → Network)

### 통합 테스트
- [ ] 프론트엔드에서 백엔드 API 호출 성공
- [ ] CORS 에러 없음
- [ ] 데이터가 정상적으로 표시됨
- [ ] 모든 기능이 정상 작동함

---

## 🔒 보안 확인

### 보안 설정
- [ ] `DEBUG=False` 확인
- [ ] `SECRET_KEY`가 안전하게 생성됨
- [ ] `ALLOWED_HOSTS`에 올바른 도메인만 포함
- [ ] `CORS_ALLOWED_ORIGINS`에 올바른 URL만 포함
- [ ] HTTPS 사용 중 (Render 자동 제공)

### 민감한 정보
- [ ] 민감한 정보가 코드에 하드코딩되지 않음
- [ ] 환경 변수로만 관리됨
- [ ] `.env` 파일이 `.gitignore`에 포함됨

---

## 📊 모니터링 설정

### 로그 확인
- [ ] 백엔드 로그 확인 가능
- [ ] 프론트엔드 로그 확인 가능
- [ ] 에러 로그가 없음

### 성능 확인
- [ ] 첫 로드 시간 확인
- [ ] API 응답 시간 확인
- [ ] 슬리프 모드 동작 이해 (무료 플랜)

---

## 🎉 배포 완료!

### 최종 확인
- [ ] 모든 체크리스트 항목 완료
- [ ] 배포된 URL 기록:
  - 프론트엔드: `https://capitalflow-frontend.onrender.com`
  - 백엔드: `https://capitalflow-backend.onrender.com`
  - 관리자: `https://capitalflow-backend.onrender.com/admin/`
- [ ] 관리자 계정 정보 안전하게 보관

### 다음 단계
- [ ] 팀원들에게 배포 완료 알림
- [ ] 사용자 테스트 요청
- [ ] 정기적인 모니터링 계획 수립

---

## 🆘 문제 발생 시

문제가 발생하면:
1. [RENDER_DEPLOYMENT_GUIDE.md](./RENDER_DEPLOYMENT_GUIDE.md)의 "문제 해결" 섹션 확인
2. Render 로그 확인
3. GitHub Issues에 질문 등록

---

**축하합니다! 배포가 완료되었습니다!** 🎉

