# 🚀 Render 실무 배포 가이드 - 초보자용

이 가이드는 CapitalFlow 프로젝트를 Render에 **실무 수준**으로 배포하는 방법을 초보자도 따라할 수 있도록 단계별로 상세히 설명합니다.

## 📋 목차

1. [사전 준비사항](#1-사전-준비사항)
2. [GitHub 저장소 준비](#2-github-저장소-준비)
3. [Render 계정 생성](#3-render-계정-생성)
4. [PostgreSQL 데이터베이스 생성](#4-postgresql-데이터베이스-생성)
5. [백엔드 배포](#5-백엔드-배포)
6. [프론트엔드 배포](#6-프론트엔드-배포)
7. [마이그레이션 및 초기 설정](#7-마이그레이션-및-초기-설정)
8. [배포 확인 및 테스트](#8-배포-확인-및-테스트)
9. [문제 해결](#9-문제-해결)
10. [실무 팁](#10-실무-팁)

---

## 1. 사전 준비사항

### 필요한 것들
- ✅ GitHub 계정 (무료)
- ✅ Render 계정 (무료)
- ✅ 프로젝트 코드가 로컬에 준비되어 있음
- ✅ 약 30분의 시간

### 확인사항
프로젝트가 다음 구조를 가지고 있는지 확인:
```
capitalflow/
├── backend/
│   ├── capitalflow/
│   │   └── settings/
│   │       ├── base.py
│   │       └── production.py  ✅ (이미 개선됨)
│   ├── requirements.txt
│   ├── manage.py
│   └── Dockerfile (선택사항)
└── frontend/
    ├── package.json
    ├── next.config.js
    └── ...
```

---

## 2. GitHub 저장소 준비

### 2-1. GitHub에 코드 푸시

로컬 프로젝트가 GitHub에 업로드되어 있어야 합니다.

```bash
# 프로젝트 디렉토리로 이동
cd /Users/jimin/graduate/capitalflow

# Git 상태 확인
git status

# 변경사항이 있다면 커밋
git add .
git commit -m "Prepare for Render deployment"

# GitHub에 푸시 (아직 안 했다면)
git push origin main
```

**중요**: `.env` 파일이나 `SECRET_KEY` 같은 민감한 정보는 절대 커밋하지 마세요!

### 2-2. .gitignore 확인

`.gitignore` 파일에 다음이 포함되어 있는지 확인:
```
.env
*.pyc
__pycache__/
*.log
db.sqlite3
node_modules/
.next/
```

---

## 3. Render 계정 생성

### 3-1. Render 웹사이트 접속

1. 브라우저에서 https://render.com 접속
2. 우측 상단의 **"Get Started for Free"** 또는 **"Sign Up"** 클릭

### 3-2. GitHub로 로그인

1. **"Continue with GitHub"** 버튼 클릭
2. GitHub 계정으로 로그인
3. Render가 GitHub 저장소에 접근할 수 있도록 권한 승인
   - **중요**: 저장소 접근 권한을 허용해야 배포할 수 있습니다

### 3-3. 이메일 인증 (필요시)

- 이메일 인증이 필요할 수 있습니다
- 받은 이메일의 링크를 클릭하여 인증 완료

---

## 4. PostgreSQL 데이터베이스 생성

### 4-1. 새 데이터베이스 생성

1. Render 대시보드에서 **"New +"** 버튼 클릭
2. 드롭다운에서 **"PostgreSQL"** 선택

### 4-2. 데이터베이스 설정

다음 정보를 입력:

- **Name**: `capitalflow-db` (원하는 이름으로 변경 가능)
- **Database**: `capitalflow` (자동 생성됨)
- **User**: `capitalflow_user` (자동 생성됨)
- **Region**: 
  - 한국 사용자: **Singapore** (가장 가까움)
  - 또는 **Oregon (US West)** 선택
- **PostgreSQL Version**: `15` (기본값 유지)
- **Plan**: **Free** 선택
  - ⚠️ 무료 플랜은 90일 후 자동 삭제될 수 있습니다 (실무에서는 유료 플랜 권장)

### 4-3. 데이터베이스 생성 완료

1. **"Create Database"** 버튼 클릭
2. 데이터베이스가 생성되는 동안 잠시 대기 (약 1-2분)

### 4-4. 연결 정보 확인

데이터베이스가 생성되면 다음 정보를 확인:

1. **"Connections"** 섹션에서 다음 정보 확인:
   - **Internal Database URL**: 백엔드에서 사용할 내부 연결 문자열
   - **External Database URL**: 외부에서 접근할 때 사용 (선택사항)

2. **중요**: **Internal Database URL**을 복사해두세요!
   - 형식: `postgresql://user:password@host:port/database`
   - 이 URL은 다음 단계에서 사용합니다

---

## 5. 백엔드 배포

### 5-1. 새 Web Service 생성

1. Render 대시보드에서 **"New +"** 버튼 클릭
2. **"Web Service"** 선택

### 5-2. GitHub 저장소 연결

1. **"Connect account"** 또는 저장소 목록에서 프로젝트 저장소 선택
2. 저장소가 보이지 않으면:
   - **"Configure account"** 클릭
   - GitHub 권한 재설정

### 5-3. 서비스 기본 설정

다음 정보를 입력:

#### 기본 정보
- **Name**: `capitalflow-backend` (원하는 이름)
- **Region**: 데이터베이스와 동일한 지역 선택 (Singapore 권장)
- **Branch**: `main` (또는 기본 브랜치)
- **Root Directory**: `capitalflow/backend` ⚠️ 중요!
  - 프로젝트 루트가 아닌 backend 디렉토리를 지정해야 합니다

#### 빌드 및 실행 설정

**⚠️ 중요: Environment 선택**

Render에서 두 가지 옵션이 있습니다:

##### 옵션 1: Python 3 선택 (초보자 추천) ⭐

- **Environment**: `Python 3` 선택
- **장점**: 
  - 설정이 간단함
  - 가이드와 일치
  - Render가 자동으로 Python 환경 구성
- **Build Command**: 
  ```bash
  pip install -r requirements.txt && python manage.py collectstatic --noinput
  ```
- **Start Command**: 
  ```bash
  gunicorn --bind 0.0.0.0:$PORT capitalflow.wsgi:application
  ```
  - ⚠️ `$PORT`는 Render가 자동으로 제공하는 환경 변수입니다

##### 옵션 2: Docker 선택 (고급 사용자용) 🐳

- **Environment**: `Docker` 선택
- **장점**: 
  - 더 세밀한 제어 가능
  - 로컬 환경과 동일한 환경 구성
  - 시스템 패키지 설치 등 커스터마이징 가능
- **단점**: 
  - 설정이 조금 더 복잡함
  - 빌드 시간이 더 걸릴 수 있음

**Docker 설정 방법**:

1. **Dockerfile 경로 확인**:
   - Render는 `Root Directory` 기준으로 Dockerfile을 찾습니다
   - `Root Directory`가 `capitalflow/backend`로 설정되어 있다면
   - Dockerfile은 `capitalflow/backend/Dockerfile`에 있어야 합니다
   - ✅ 이미 생성되어 있습니다!

2. **Build Command**: 
   - (비워두기 또는 자동 감지)
   - Render가 자동으로 `docker build`를 실행합니다

3. **Start Command**: 
   - (비워두기)
   - Dockerfile의 `CMD`가 자동으로 사용됩니다

4. **Dockerfile 확인사항**:
   - ✅ `Dockerfile`이 `$PORT` 환경 변수를 사용하도록 설정됨
   - ✅ Health check 포함
   - ✅ 최적화된 멀티스테이지 빌드 (필요시)

**⚠️ 중요**: 
- Docker를 선택하면 `Build Command`와 `Start Command`를 **비워두세요**
- Render가 자동으로 Dockerfile을 사용합니다
- Dockerfile은 이미 Render 배포에 최적화되어 있습니다

**Docker 선택 시 추가 설정 불필요**: 
- Dockerfile이 이미 Render의 `$PORT` 환경 변수를 사용하도록 설정되어 있습니다
- `.dockerignore` 파일도 생성되어 불필요한 파일이 제외됩니다

#### 플랜 선택
- **Plan**: **Free** 선택
  - 무료 플랜: 750시간/월, 512MB RAM
  - ⚠️ 15분 비활성 시 슬리프 모드 (첫 요청 시 느릴 수 있음)

### 5-4. 환경 변수 설정

**"Advanced"** 섹션을 펼치고 **"Add Environment Variable"** 버튼을 클릭하여 다음 변수들을 추가:

#### 필수 환경 변수

1. **SECRET_KEY**
   - Key: `SECRET_KEY`
   - Value: 랜덤 문자열 생성
   - 생성 방법:
     ```bash
     # 로컬 터미널에서 실행
     python -c "import secrets; print(secrets.token_urlsafe(50))"
     ```
     또는
     ```bash
     openssl rand -hex 32
     ```
   - 예시: `django-insecure-abc123...` (실제로는 더 긴 문자열)

2. **DEBUG**
   - Key: `DEBUG`
   - Value: `False`
   - ⚠️ 프로덕션에서는 반드시 False로 설정

3. **ALLOWED_HOSTS**
   - Key: `ALLOWED_HOSTS`
   - Value: `capitalflow-backend.onrender.com`
   - 나중에 커스텀 도메인을 사용한다면: `capitalflow-backend.onrender.com,yourdomain.com`

4. **CORS_ALLOWED_ORIGINS**
   - Key: `CORS_ALLOWED_ORIGINS`
   - Value: `https://capitalflow-frontend.onrender.com`
   - ⚠️ 프론트엔드 URL은 나중에 배포 후 업데이트해야 합니다
   - 임시로 백엔드 URL 사용 가능: `https://capitalflow-backend.onrender.com`

5. **DATABASE_URL**
   - Key: `DATABASE_URL`
   - Value: 4단계에서 복사한 **Internal Database URL**
   - 예시: `postgresql://user:pass@host:5432/dbname`

6. **DJANGO_SETTINGS_MODULE**
   - Key: `DJANGO_SETTINGS_MODULE`
   - Value: `capitalflow.settings.production`
   - ⚠️ 이 설정으로 production.py를 사용합니다

#### 선택적 환경 변수

7. **SECURE_SSL_REDIRECT** (선택사항)
   - Key: `SECURE_SSL_REDIRECT`
   - Value: `True`

### 5-5. 데이터베이스 연결

1. **"Advanced"** 섹션 하단의 **"Add Database"** 버튼 클릭
2. 4단계에서 생성한 PostgreSQL 데이터베이스 선택
3. 이렇게 하면 `DATABASE_URL`이 자동으로 설정됩니다
   - ⚠️ 이미 수동으로 `DATABASE_URL`을 설정했다면 중복되지 않도록 주의

### 5-6. 서비스 생성 및 배포

1. 모든 설정이 완료되었는지 확인
2. **"Create Web Service"** 버튼 클릭
3. 배포가 시작됩니다 (약 5-10분 소요)

### 5-7. 배포 로그 확인

1. 배포가 진행되는 동안 **"Logs"** 탭에서 빌드 과정 확인
2. 에러가 발생하면 로그를 확인하여 문제 해결
3. 성공적으로 배포되면:
   - **"Events"** 탭에서 "Deployed successfully" 메시지 확인
   - URL이 생성됨: `https://capitalflow-backend.onrender.com`

---

## 6. 프론트엔드 배포

### 6-1. 새 Static Site 생성

1. Render 대시보드에서 **"New +"** 버튼 클릭
2. **"Static Site"** 선택

### 6-2. GitHub 저장소 연결

1. 백엔드와 동일한 저장소 선택
2. 저장소가 이미 연결되어 있다면 바로 선택 가능

### 6-3. Static Site 설정

다음 정보를 입력:

#### 기본 정보
- **Name**: `capitalflow-frontend`
- **Branch**: `main`
- **Root Directory**: `capitalflow/frontend` ⚠️ 중요!

#### 빌드 설정
- **Build Command**: 
  ```bash
  npm install && npm run build
  ```
- **Publish Directory**: `.next`
  - ⚠️ Next.js의 기본 출력 디렉토리입니다

#### 플랜 선택
- **Plan**: **Free** 선택

### 6-4. 환경 변수 설정

**"Advanced"** 섹션에서 환경 변수 추가:

1. **NEXT_PUBLIC_API_URL**
   - Key: `NEXT_PUBLIC_API_URL`
   - Value: `https://capitalflow-backend.onrender.com/api/v1`
   - ⚠️ 백엔드 URL을 정확히 입력하세요
   - `/api/v1` 경로 포함 확인

### 6-5. Static Site 생성 및 배포

1. **"Create Static Site"** 버튼 클릭
2. 배포가 시작됩니다 (약 5-10분 소요)
3. Next.js 빌드가 완료되면 자동으로 배포됩니다

### 6-6. 프론트엔드 URL 확인

배포 완료 후:
- 프론트엔드 URL: `https://capitalflow-frontend.onrender.com`
- 이 URL을 백엔드의 `CORS_ALLOWED_ORIGINS`에 추가해야 합니다

### 6-7. CORS 설정 업데이트

1. 백엔드 서비스로 돌아가기
2. **"Environment"** 탭 클릭
3. `CORS_ALLOWED_ORIGINS` 환경 변수 수정:
   - 기존: `https://capitalflow-backend.onrender.com`
   - 변경: `https://capitalflow-frontend.onrender.com`
4. **"Save Changes"** 클릭
5. 자동으로 재배포됩니다

---

## 7. 마이그레이션 및 초기 설정

### 7-1. Shell 접속

1. 백엔드 서비스 페이지로 이동
2. 상단 메뉴에서 **"Shell"** 탭 클릭
3. **"Connect"** 버튼 클릭하여 터미널 접속

### 7-2. 데이터베이스 마이그레이션

Shell에서 다음 명령어 실행:

```bash
# 현재 디렉토리 확인
pwd

# backend 디렉토리로 이동 (Root Directory가 backend로 설정되어 있다면 이미 여기 있음)
cd /opt/render/project/src

# 또는
cd /app

# 마이그레이션 실행
python manage.py migrate
```

**예상 출력**:
```
Operations to perform:
  Apply all migrations: admin, auth, contenttypes, sessions, ...
Running migrations:
  Applying contenttypes.0001_initial... OK
  Applying auth.0001_initial... OK
  ...
```

### 7-3. 슈퍼유저 생성

관리자 계정을 생성합니다:

```bash
python manage.py createsuperuser
```

다음 정보를 입력:
- **Username**: 원하는 관리자 이름 (예: `admin`)
- **Email**: 이메일 주소 (선택사항)
- **Password**: 강력한 비밀번호 입력
- **Password (again)**: 비밀번호 재입력

**중요**: 비밀번호는 화면에 표시되지 않습니다 (정상입니다)

### 7-4. 정적 파일 수집 확인

마이그레이션과 함께 `collectstatic`도 실행되었는지 확인:

```bash
python manage.py collectstatic --noinput
```

이미 빌드 과정에서 실행되었을 수 있습니다.

### 7-5. Shell 종료

```bash
exit
```

---

## 8. 배포 확인 및 테스트

### 8-1. 백엔드 API 테스트

1. 브라우저에서 백엔드 URL 접속:
   ```
   https://capitalflow-backend.onrender.com/api/v1/
   ```

2. 또는 API 엔드포인트 테스트:
   ```
   https://capitalflow-backend.onrender.com/api/v1/countries/
   ```

3. **예상 결과**:
   - JSON 응답 또는 인증 오류 (정상 - 인증이 필요한 엔드포인트일 수 있음)
   - 404 오류가 나오면 URL 경로 확인

### 8-2. 프론트엔드 접속 테스트

1. 브라우저에서 프론트엔드 URL 접속:
   ```
   https://capitalflow-frontend.onrender.com
   ```

2. **확인사항**:
   - 페이지가 정상적으로 로드되는가?
   - 콘솔에 에러가 없는가? (F12 → Console 탭)
   - 네트워크 탭에서 API 요청이 성공하는가? (F12 → Network 탭)

### 8-3. 관리자 페이지 접속

1. 관리자 페이지 URL:
   ```
   https://capitalflow-backend.onrender.com/admin/
   ```

2. 7-3에서 생성한 슈퍼유저로 로그인

3. **확인사항**:
   - 로그인이 정상적으로 되는가?
   - 관리자 페이지가 정상적으로 표시되는가?

### 8-4. CORS 테스트

프론트엔드에서 백엔드 API를 호출할 때 CORS 에러가 없는지 확인:

1. 프론트엔드 페이지에서 F12 → Console 탭 열기
2. API 호출이 발생하는 페이지로 이동
3. **확인사항**:
   - CORS 관련 에러가 없는가?
   - `Access-Control-Allow-Origin` 에러가 없는가?

---

## 9. 문제 해결

### 문제 1: 빌드 실패

**증상**: 배포 중 빌드가 실패함

**해결 방법**:
1. **"Logs"** 탭에서 에러 메시지 확인
2. 일반적인 원인:
   - `requirements.txt`에 패키지가 없음 → 추가
   - Python 버전 불일치 → `runtime.txt` 파일 생성 (Python 3 선택 시)
   - 빌드 명령어 오류 → 수정
   - Docker 빌드 실패 → Dockerfile 문법 확인 (Docker 선택 시)

**Python 3 선택 시 - runtime.txt 생성**:
```bash
# backend/runtime.txt 파일 생성
python-3.11.0
```

**Docker 선택 시 - 로컬 테스트**:
```bash
# 로컬에서 Docker 빌드 테스트
cd capitalflow/backend
docker build -t capitalflow-test .
```

### 문제 2: 데이터베이스 연결 실패

**증상**: `django.db.utils.OperationalError: could not connect to server`

**해결 방법**:
1. `DATABASE_URL` 환경 변수 확인
2. PostgreSQL 서비스가 실행 중인지 확인
3. Internal Database URL을 사용하고 있는지 확인 (External이 아님)
4. 데이터베이스가 삭제되지 않았는지 확인

### 문제 3: CORS 에러

**증상**: 브라우저 콘솔에 `CORS policy` 에러

**해결 방법**:
1. 백엔드의 `CORS_ALLOWED_ORIGINS` 환경 변수 확인
2. 프론트엔드 URL이 정확히 입력되었는지 확인
3. 프로토콜 확인 (`http://` vs `https://`)
4. 환경 변수 수정 후 재배포

### 문제 4: 정적 파일 404

**증상**: CSS, JS 파일이 로드되지 않음

**해결 방법**:
1. `collectstatic`이 실행되었는지 확인
2. `STATIC_ROOT` 설정 확인
3. WhiteNoise 미들웨어가 활성화되었는지 확인
4. Shell에서 수동 실행:
   ```bash
   python manage.py collectstatic --noinput
   ```

### 문제 5: 첫 요청이 매우 느림

**증상**: 15분 이상 비활성 후 첫 요청이 30초 이상 걸림

**원인**: Render 무료 플랜의 슬리프 모드

**해결 방법**:
1. 정상 동작입니다 (무료 플랜 제한사항)
2. 해결책:
   - 유료 플랜으로 업그레이드
   - 또는 다른 플랫폼 사용 (Vercel + Railway)

### 문제 6: 환경 변수가 적용되지 않음

**증상**: 환경 변수를 설정했지만 코드에서 읽히지 않음

**해결 방법**:
1. 환경 변수 이름 확인 (대소문자 구분)
2. **"Save Changes"** 버튼을 클릭했는지 확인
3. 재배포가 필요할 수 있음 (자동 재배포 또는 수동 재배포)
4. Shell에서 확인:
   ```bash
   echo $SECRET_KEY
   ```

### 문제 7: 500 Internal Server Error

**증상**: 페이지 접속 시 500 에러

**해결 방법**:
1. **"Logs"** 탭에서 에러 메시지 확인
2. 일반적인 원인:
   - `SECRET_KEY`가 설정되지 않음
   - 데이터베이스 마이그레이션 미실행
   - 필수 환경 변수 누락
3. Shell에서 Django 체크:
   ```bash
   python manage.py check --deploy
   ```

---

## 10. 실무 팁

### 10-1. 환경 변수 관리

**실무 권장사항**:
- 민감한 정보는 절대 코드에 하드코딩하지 않기
- 환경 변수는 Render 대시보드에서만 관리
- 로컬 개발용 `.env` 파일은 `.gitignore`에 추가

### 10-2. 로그 모니터링

**실무 권장사항**:
- 정기적으로 **"Logs"** 탭 확인
- 에러가 발생하면 즉시 확인
- Render의 로그는 최근 1000줄만 보관됨

### 10-3. 자동 배포 설정

**기본 동작**:
- GitHub에 푸시하면 자동으로 재배포됨
- 특정 브랜치만 배포하도록 설정 가능

**설정 방법**:
1. 서비스 → **"Settings"** 탭
2. **"Auto-Deploy"** 섹션에서 브랜치 선택

### 10-4. 커스텀 도메인 연결 (선택사항)

**실무에서 도메인이 필요한 경우**:

1. 도메인 구매 (예: Namecheap, GoDaddy)
2. Render 대시보드 → 서비스 → **"Settings"** 탭
3. **"Custom Domains"** 섹션에서 도메인 추가
4. DNS 설정:
   - CNAME 레코드 추가
   - Render가 제공하는 호스트 이름으로 설정

### 10-5. 데이터베이스 백업

**무료 플랜 제한사항**:
- 자동 백업이 제한적일 수 있음

**수동 백업 방법**:
```bash
# Shell에서 실행
python manage.py dumpdata > backup.json
```

**실무 권장사항**:
- 정기적으로 데이터 백업
- 중요한 데이터는 유료 플랜 고려

### 10-6. 성능 최적화

**실무 권장사항**:
1. **캐싱 활용**:
   - Redis 사용 (유료 플랜 필요)
   - 또는 LocMemCache 사용 (현재 설정됨)

2. **정적 파일 최적화**:
   - WhiteNoise 사용 (이미 설정됨)
   - CDN 사용 고려

3. **데이터베이스 최적화**:
   - 인덱스 추가
   - 쿼리 최적화

### 10-7. 보안 체크리스트

**배포 전 확인**:
- [ ] `DEBUG=False` 설정
- [ ] `SECRET_KEY`가 안전하게 생성됨
- [ ] `ALLOWED_HOSTS`에 올바른 도메인만 추가
- [ ] `CORS_ALLOWED_ORIGINS`에 올바른 URL만 추가
- [ ] 민감한 정보가 코드에 하드코딩되지 않음
- [ ] HTTPS 사용 (Render 자동 제공)

### 10-8. 비용 관리

**무료 플랜 제한사항**:
- Web Service: 750시간/월
- PostgreSQL: 90일 후 자동 삭제 가능
- 512MB RAM

**비용 발생 시나리오**:
- 월 750시간 초과 시 유료 전환 필요
- 데이터베이스 90일 후 유료 전환 필요

**실무 권장사항**:
- 트래픽이 많아지면 유료 플랜 고려
- 또는 다른 플랫폼으로 마이그레이션 (Vercel + Railway)

---

## ✅ 배포 완료 체크리스트

배포가 성공적으로 완료되었는지 확인:

- [ ] 백엔드 서비스가 정상적으로 실행 중
- [ ] 프론트엔드가 정상적으로 빌드 및 배포됨
- [ ] 데이터베이스 마이그레이션이 완료됨
- [ ] 슈퍼유저가 생성됨
- [ ] 프론트엔드에서 백엔드 API 호출 성공
- [ ] CORS 에러 없음
- [ ] 관리자 페이지 접속 가능
- [ ] 정적 파일이 정상적으로 로드됨
- [ ] 로그에 에러 없음

---

## 🎉 축하합니다!

이제 CapitalFlow 프로젝트가 Render에 성공적으로 배포되었습니다!

**배포된 URL**:
- 프론트엔드: `https://capitalflow-frontend.onrender.com`
- 백엔드: `https://capitalflow-backend.onrender.com`
- 관리자: `https://capitalflow-backend.onrender.com/admin/`

---

## 📚 추가 리소스

- [Render 공식 문서](https://render.com/docs)
- [Django 배포 가이드](https://docs.djangoproject.com/en/4.2/howto/deployment/)
- [Next.js 배포 가이드](https://nextjs.org/docs/deployment)

---

## 🆘 도움이 필요하신가요?

문제가 발생하면:
1. 이 가이드의 [문제 해결](#9-문제-해결) 섹션 확인
2. Render 로그 확인
3. GitHub Issues에 질문 등록

**행운을 빕니다!** 🚀

