# 서버 실행 가이드 (8001번 포트)

## 🚀 빠른 시작

### 1. 백엔드 서버 실행

**방법 1: 실행 스크립트 사용 (권장)**
```bash
cd /Users/jimin/graduate/capitalflow/backend
./start_server.sh
```

**방법 2: 수동 실행**
```bash
cd /Users/jimin/graduate/capitalflow/backend
source venv/bin/activate
python3 manage.py runserver 8001
```

백엔드 서버가 실행되면:
- API 주소: http://localhost:8001/api/v1
- 관리자 페이지: http://localhost:8001/admin

### 2. 프론트엔드 서버 실행

**새 터미널 창에서 실행:**
```bash
cd /Users/jimin/graduate/capitalflow/frontend
npm run dev
```

프론트엔드 서버가 실행되면:
- 메인 페이지: http://localhost:3000
- 지도 페이지: http://localhost:3000/map
- 관리자 페이지: http://localhost:3000/admin

## ✅ 정상 동작 확인

### 1. 백엔드 API 테스트
브라우저에서 다음 URL 접속:
```
http://localhost:8001/api/v1/visualization/map-data/?year=2023
```

JSON 응답이 오면 정상입니다.

### 2. 프론트엔드 페이지 확인
- http://localhost:3000/map - 지도가 표시되는지 확인
- http://localhost:3000/admin - 관리자 페이지가 로드되는지 확인

### 3. 브라우저 콘솔 확인
- 개발자 도구(F12) → Console 탭 열기
- API 호출 로그 확인:
  - `🔧 ApiClient initialized with baseURL: http://localhost:8001`
  - `🔍 API Request:` 로그들이 정상적으로 표시되는지 확인
- 에러 메시지가 없어야 합니다

## 🔧 문제 해결

### 백엔드 서버가 시작되지 않는 경우

1. **가상환경 확인**
   ```bash
   cd /Users/jimin/graduate/capitalflow/backend
   source venv/bin/activate
   ```

2. **포트가 이미 사용 중인 경우**
   ```bash
   # 8001번 포트를 사용하는 프로세스 확인
   lsof -i :8001
   
   # 프로세스 종료 (PID 확인 후)
   kill -9 <PID>
   ```

3. **Django 설치 확인**
   ```bash
   pip install -r requirements.txt
   ```

### 프론트엔드가 백엔드에 연결되지 않는 경우

1. **백엔드 서버가 실행 중인지 확인**
   - http://localhost:8001/api/v1 접속 테스트

2. **프론트엔드 서버 재시작**
   ```bash
   # Ctrl+C로 중지 후
   npm run dev
   ```

3. **환경 변수 확인**
   - `frontend/.env.local` 파일이 있다면 확인:
     ```
     NEXT_PUBLIC_API_URL=http://localhost:8001/api/v1
     ```

## 📝 포트 정보

- **백엔드**: 8001번 포트
- **프론트엔드**: 3000번 포트
- **Django Admin**: http://localhost:8001/admin
  - 사용자명: `admin`
  - 비밀번호: `admin123` (변경하려면 `reset_admin_password.py` 실행)

## 🔄 서버 재시작

### 백엔드 재시작
```bash
# 실행 중인 서버에서 Ctrl+C
# 그 다음 다시 실행
cd /Users/jimin/graduate/capitalflow/backend
./start_server.sh
```

### 프론트엔드 재시작
```bash
# 실행 중인 서버에서 Ctrl+C
# 그 다음 다시 실행
cd /Users/jimin/graduate/capitalflow/frontend
npm run dev
```

## 💡 팁

- 두 서버를 동시에 실행하려면 **두 개의 터미널 창**을 사용하세요
- 백엔드 서버가 먼저 실행되어야 프론트엔드가 정상 작동합니다
- 코드 변경 후 프론트엔드는 자동으로 재로드되지만, 백엔드는 수동으로 재시작해야 할 수 있습니다

