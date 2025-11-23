# 🔧 Railway 400 Bad Request 에러 해결

## 에러 메시지
```
GET https://graduate-production-78b3.up.railway.app/admin 400 (Bad Request)
```

## 원인

**ALLOWED_HOSTS 설정 문제**

Django는 보안을 위해 `ALLOWED_HOSTS`에 명시된 호스트만 허용합니다. Railway 도메인이 `ALLOWED_HOSTS`에 포함되지 않아서 400 에러가 발생합니다.

---

## 해결 방법

### 방법 1: Railway Variables에 ALLOWED_HOSTS 추가 (즉시 적용) ⭐

1. **Railway 대시보드**
   - 백엔드 서비스 (`graduate`) → Variables 탭

2. **환경 변수 추가/수정**
   - `ALLOWED_HOSTS` 변수 확인
   - 없으면 "New Variable" 클릭
   - Name: `ALLOWED_HOSTS`
   - Value: `graduate-production-78b3.up.railway.app,*.railway.app`
   - 저장

3. **재배포**
   - "Redeploy" 클릭

---

### 방법 2: production.py 수정 (자동 허용) ✅ 완료

`production.py`를 수정하여 Railway 환경에서 자동으로 Railway 도메인을 허용하도록 했습니다.

**수정 내용:**
- Railway 환경 변수(`RAILWAY_ENVIRONMENT`)가 있으면
- `*.railway.app` 도메인 자동 허용
- `RAILWAY_PUBLIC_DOMAIN`이 있으면 해당 도메인도 허용

**이제 재배포하면 자동으로 작동합니다.**

---

## 확인 방법

### 1. 환경 변수 확인
```bash
npx @railway/cli variables | grep ALLOWED_HOSTS
```

### 2. 웹 브라우저 테스트
```
https://graduate-production-78b3.up.railway.app/admin/
```
- 로그인 페이지가 보이면 정상 ✅
- 400 에러가 계속 나오면 재배포 필요

### 3. API 테스트
```
https://graduate-production-78b3.up.railway.app/api/v1/
```
- JSON 응답이 오면 정상 ✅

---

## 추가 확인 사항

### SECRET_KEY 확인
```bash
npx @railway/cli variables | grep SECRET_KEY
```
- `SECRET_KEY`가 설정되어 있어야 함

### DEBUG 확인
```bash
npx @railway/cli variables | grep DEBUG
```
- `DEBUG=False`로 설정되어 있어야 함

---

## 재배포 후 예상 결과

✅ Admin 페이지 접근 가능
✅ API 엔드포인트 정상 작동
✅ 400 에러 해결

---

## 빠른 해결

1. **Railway 대시보드 → 백엔드 서비스 → Variables**
2. **`ALLOWED_HOSTS` 확인/추가:**
   ```
   graduate-production-78b3.up.railway.app,*.railway.app
   ```
3. **재배포**
4. **브라우저에서 다시 접속 테스트**

또는 코드 수정이 이미 완료되었으므로 **재배포만 하면 자동으로 작동**합니다.

