# 관리자 인증 테스트 가이드

## 테스트 시나리오

### 1. 관리자 계정으로 로그인 테스트

1. **백엔드 서버 실행 확인**
   ```bash
   cd capitalflow/backend
   ./start_server.sh
   ```

2. **관리자 계정 확인/생성**
   ```bash
   cd capitalflow/backend
   python reset_admin_password.py
   ```
   - 사용자명: `admin`
   - 비밀번호: `admin123`
   - `is_staff = True`, `is_superuser = True` 확인

3. **프론트엔드 서버 실행**
   ```bash
   cd capitalflow/frontend
   npm run dev
   ```

4. **브라우저에서 테스트**
   - http://localhost:3000/auth/login 접속
   - 관리자 계정으로 로그인 (admin / admin123)
   - 브라우저 개발자 도구(F12) → Console 탭 열기
   - 다음 로그 확인:
     - `💾 사용자 정보 저장:` - 관리자 정보가 포함되어야 함
     - `👤 관리자 여부:` - `is_staff: true` 또는 `is_superuser: true` 확인
     - `🔍 사용자 정보 로드:` - 저장된 사용자 정보 확인
     - `👤 관리자 여부:` - `true`로 표시되어야 함
     - `🧭 Navbar - 관리자 상태:` - `isAdmin: true` 확인

5. **네비게이션 바 확인**
   - 네비게이션 바에 "관리자" 링크가 표시되어야 함
   - "관리자" 링크 클릭 시 `/admin` 페이지로 이동

6. **관리자 페이지 접근 확인**
   - http://localhost:3000/admin 직접 접속
   - 관리자로 로그인한 경우: 정상 접속
   - 로그인하지 않은 경우: `/auth/login`으로 리다이렉트
   - 일반 사용자로 로그인한 경우: `/auth/login`으로 리다이렉트

### 2. 일반 사용자 계정으로 로그인 테스트

1. **일반 사용자 계정 생성** (회원가입 또는 Django 관리자에서)
   - `is_staff = False`, `is_superuser = False` 확인

2. **일반 사용자로 로그인**
   - http://localhost:3000/auth/login 접속
   - 일반 사용자 계정으로 로그인
   - 브라우저 개발자 도구 → Console 탭에서 확인:
     - `👤 관리자 여부:` - `is_staff: false`, `is_superuser: false` 확인
     - `🧭 Navbar - 관리자 상태:` - `isAdmin: false` 확인

3. **네비게이션 바 확인**
   - 네비게이션 바에 "관리자" 링크가 **표시되지 않아야** 함

4. **관리자 페이지 접근 시도**
   - http://localhost:3000/admin 직접 접속
   - `/auth/login`으로 리다이렉트되어야 함
   - 또는 "접근 권한이 없습니다" 메시지 표시

### 3. 로그아웃 테스트

1. **관리자로 로그인 후 로그아웃**
   - 로그아웃 버튼 클릭
   - 네비게이션 바에서 "관리자" 링크가 사라져야 함
   - `/admin` 접속 시 `/auth/login`으로 리다이렉트

## 디버깅 체크리스트

### 브라우저 Console에서 확인할 로그

1. **로그인 시:**
   ```
   💾 사용자 정보 저장: {id: ..., username: ..., is_staff: true/false, is_superuser: true/false}
   👤 관리자 여부: {is_staff: true/false, is_superuser: true/false}
   ```

2. **페이지 로드 시:**
   ```
   🔍 사용자 정보 로드: {id: ..., username: ..., is_staff: true/false, is_superuser: true/false}
   👤 관리자 여부: true/false
   🧭 Navbar - 관리자 상태: {isAdmin: true/false, isAuthenticated: true/false, user: {...}}
   ```

3. **관리자 페이지 접근 시:**
   ```
   🔒 관리자 페이지 접근 확인: {isAuthenticated: true/false, isAdmin: true/false, isLoading: false}
   ✅ 관리자 권한 확인됨 (또는 ❌ 인증되지 않음/관리자 권한 없음)
   ```

### localStorage 확인

브라우저 개발자 도구 → Application 탭 → Local Storage → http://localhost:3000

확인할 항목:
- `access_token`: JWT 액세스 토큰
- `refresh_token`: JWT 리프레시 토큰
- `user_info`: JSON 문자열로 저장된 사용자 정보
  ```json
  {
    "id": 1,
    "username": "admin",
    "email": "admin@capitalflow.com",
    "is_staff": true,
    "is_superuser": true
  }
  ```

## 문제 해결

### 문제 1: 관리자로 로그인해도 네비게이션 바에 "관리자" 링크가 안 보임

**확인 사항:**
1. 브라우저 Console에서 `🧭 Navbar - 관리자 상태:` 로그 확인
2. `isAdmin: true`인지 확인
3. localStorage의 `user_info`에 `is_staff: true` 또는 `is_superuser: true`가 있는지 확인
4. 페이지 새로고침 후 다시 확인

**해결 방법:**
- localStorage의 `user_info`를 삭제하고 다시 로그인
- 브라우저 캐시 삭제 후 재시도

### 문제 2: 관리자 계정으로 로그인하지 않았는데도 `/admin` 접속 가능

**확인 사항:**
1. 브라우저 Console에서 `🔒 관리자 페이지 접근 확인:` 로그 확인
2. `isAdmin: false`인데도 접속되는지 확인
3. `router.replace('/auth/login')`이 실행되는지 확인

**해결 방법:**
- 브라우저 개발자 도구 → Network 탭에서 리다이렉트 확인
- 페이지 새로고침 후 다시 확인
- localStorage를 모두 삭제하고 다시 테스트

### 문제 3: 백엔드에서 `is_staff` 값이 제대로 반환되지 않음

**확인 사항:**
1. 백엔드 API 응답 확인:
   ```bash
   curl -X POST http://localhost:8001/api/v1/auth/login/ \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"admin123"}'
   ```
2. 응답에 `is_staff`와 `is_superuser` 필드가 포함되어 있는지 확인

**해결 방법:**
- `capitalflow/backend/api/views.py`의 `login_user` 함수 확인
- Django 관리자에서 사용자의 `is_staff`와 `is_superuser` 설정 확인

