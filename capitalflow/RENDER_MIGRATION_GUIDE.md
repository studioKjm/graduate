# 🔧 Render 마이그레이션 자동화 가이드 (Shell 없이)

Render의 무료 플랜에서는 Shell 기능이 제한될 수 있습니다. 이 가이드는 Shell 없이 마이그레이션과 초기 설정을 자동화하는 방법을 설명합니다.

## 📋 목차

1. [자동화 스크립트 개요](#1-자동화-스크립트-개요)
2. [Start Command 수정](#2-start-command-수정)
3. [슈퍼유저 자동 생성](#3-슈퍼유저-자동-생성)
4. [배포 확인](#4-배포-확인)
5. [문제 해결](#5-문제-해결)

---

## 1. 자동화 스크립트 개요

프로젝트에 다음 스크립트가 포함되어 있습니다:

### `render_start.sh`
- 데이터베이스 마이그레이션 자동 실행
- 정적 파일 수집
- 슈퍼유저 자동 생성 (환경 변수 설정 시)
- Gunicorn 서버 시작

### `create_superuser_if_needed.py`
- 환경 변수를 통해 슈퍼유저 자동 생성
- 이미 존재하는 경우 스킵

---

## 2. Start Command 수정

### 2-1. Render 대시보드에서 수정

1. Render 대시보드 → `capitalflow-backend` 서비스 → **Settings** 탭
2. **Start Command** 찾기
3. 현재 값:
   ```bash
   gunicorn --bind 0.0.0.0:$PORT capitalflow.wsgi:application
   ```
4. **변경할 값**:
   ```bash
   bash render_start.sh
   ```
5. **Save Changes** 클릭
6. 자동으로 재배포됩니다

### 2-2. Docker 사용 시

Docker를 사용하는 경우, Dockerfile의 CMD를 수정합니다:

```dockerfile
CMD ["bash", "render_start.sh"]
```

또는 Dockerfile에서 직접 실행:

```dockerfile
CMD sh -c "python manage.py migrate --noinput && python manage.py collectstatic --noinput && python create_superuser_if_needed.py || true && gunicorn --bind 0.0.0.0:${PORT:-8000} --workers 2 --threads 2 --timeout 60 capitalflow.wsgi:application"
```

---

## 3. 슈퍼유저 자동 생성

### 3-1. 환경 변수 설정

1. Render 대시보드 → `capitalflow-backend` 서비스 → **Environment** 탭
2. 다음 환경 변수 추가:

   | Key | Value | 설명 |
   |-----|-------|------|
   | `DJANGO_SUPERUSER_USERNAME` | `admin` | 관리자 사용자명 |
   | `DJANGO_SUPERUSER_PASSWORD` | `강력한비밀번호` | 관리자 비밀번호 |
   | `DJANGO_SUPERUSER_EMAIL` | `admin@example.com` | 관리자 이메일 (선택사항) |

3. **Save Changes** 클릭

### 3-2. 보안 주의사항

- ✅ 비밀번호는 강력하게 설정하세요 (최소 8자, 대소문자, 숫자, 특수문자 포함)
- ✅ 환경 변수는 Render 대시보드에서만 관리하세요
- ❌ 코드에 비밀번호를 하드코딩하지 마세요
- ❌ Git에 환경 변수 파일을 커밋하지 마세요

### 3-3. 슈퍼유저 생성 확인

배포 후 로그에서 다음 메시지를 확인:

```
✅ 슈퍼유저 'admin' 생성 완료!
```

또는 이미 존재하는 경우:

```
✅ 슈퍼유저 'admin'가 이미 존재합니다.
```

---

## 4. 배포 확인

### 4-1. 로그 확인

1. Render 대시보드 → `capitalflow-backend` 서비스 → **Logs** 탭
2. 다음 메시지들이 순서대로 나타나는지 확인:

```
🚀 Render 배포 시작 스크립트 실행 중...
📦 데이터베이스 마이그레이션 실행 중...
Operations to perform:
  Apply all migrations: admin, auth, contenttypes, sessions, ...
Running migrations:
  Applying contenttypes.0001_initial... OK
  ...
📁 정적 파일 수집 중...
👤 슈퍼유저 확인 중...
🌐 Gunicorn 서버 시작 중...
```

### 4-2. API 테스트

브라우저에서 다음 URL 접속:

```
https://capitalflow-backend.onrender.com/api/v1/
```

정상 응답이 오면 성공입니다.

### 4-3. 관리자 페이지 접속

1. 브라우저에서 다음 URL 접속:
   ```
   https://capitalflow-backend.onrender.com/admin/
   ```
2. 설정한 슈퍼유저 계정으로 로그인
3. 로그인 성공 시 마이그레이션과 슈퍼유저 생성이 정상적으로 완료된 것입니다.

---

## 5. 문제 해결

### 5-1. 마이그레이션 실패

**증상**: 로그에 마이그레이션 에러가 표시됨

**해결 방법**:
1. 데이터베이스 연결 확인 (`DATABASE_URL` 환경 변수)
2. 로그에서 구체적인 에러 메시지 확인
3. 필요시 Build Command에 마이그레이션 추가:
   ```bash
   pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate --noinput
   ```

### 5-2. 슈퍼유저 생성 실패

**증상**: 슈퍼유저가 생성되지 않음

**해결 방법**:
1. 환경 변수가 올바르게 설정되었는지 확인
2. 로그에서 에러 메시지 확인
3. 수동으로 생성하려면 Shell 사용 (유료 플랜) 또는 환경 변수 재설정 후 재배포

### 5-3. 스크립트 실행 권한 오류

**증상**: `Permission denied` 에러

**해결 방법**:
1. 로컬에서 스크립트에 실행 권한 부여:
   ```bash
   chmod +x render_start.sh
   ```
2. Git에 커밋 및 푸시:
   ```bash
   git add render_start.sh
   git commit -m "Add render_start.sh with execute permission"
   git push origin main
   ```

### 5-4. 포트 바인딩 오류

**증상**: `Address already in use` 에러

**해결 방법**:
- Render는 자동으로 `$PORT` 환경 변수를 제공하므로 문제없어야 합니다
- `render_start.sh`에서 `${PORT:-8000}`을 사용하므로 기본값이 설정되어 있습니다

---

## 📝 요약

✅ **Start Command**: `bash render_start.sh`로 변경
✅ **환경 변수**: `DJANGO_SUPERUSER_USERNAME`, `DJANGO_SUPERUSER_PASSWORD` 설정
✅ **자동 실행**: 마이그레이션, 정적 파일 수집, 슈퍼유저 생성이 자동으로 실행됨
✅ **Shell 불필요**: 무료 플랜에서도 정상 작동

이제 Shell 없이도 마이그레이션과 초기 설정이 자동으로 완료됩니다! 🎉

