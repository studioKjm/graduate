# Capital Flow 서버 실행 가이드

## 📊 현재 상태
- ✅ 프론트엔드: 실행 중 (포트 3000)
- ❌ 백엔드: 실행 중 아님 (포트 8001)

## 🔄 서버 종료 명령어

### 프론트엔드 종료
```bash
# 방법 1: 프로세스 ID로 종료
kill -9 38642 38641 38613

# 방법 2: 프로세스 이름으로 종료
pkill -f 'next dev'
pkill -f 'npm run dev'

# 방법 3: 포트로 종료
lsof -ti:3000 | xargs kill -9
```

### 백엔드 종료 (현재 실행 중이지 않음)
```bash
# 방법 1: 프로세스 이름으로 종료
pkill -f 'python.*runserver'

# 방법 2: 포트로 종료
lsof -ti:8001 | xargs kill -9
```

## 🚀 서버 실행 명령어

### 1️⃣ 백엔드 서버 실행 (포트 8001)
```bash
cd /Users/jimin/graduate/capitalflow/backend
source venv/bin/activate
python manage.py runserver 8001
```

### 2️⃣ 프론트엔드 서버 실행 (포트 3000)
```bash
cd /Users/jimin/graduate/capitalflow/frontend
npm run dev
```

## 🌐 접속 주소

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001/api/v1
- **Admin**: http://localhost:8001/admin

## 📝 백엔드 환경 설정 (필요시)

백엔드 실행 전 환경 변수 확인:
```bash
# .env 파일 확인
cat /Users/jimin/graduate/capitalflow/backend/.env

# 또는 .env.example을 참고
cat /Users/jimin/graduate/capitalflow/.env.example
```

## ⚠️ 주의사항

1. **백엔드를 먼저 실행**한 후 프론트엔드를 실행하는 것을 권장합니다.
2. 프론트엔드가 백엔드 API를 호출하므로 백엔드가 실행 중이어야 정상 작동합니다.
3. 두 서버는 서로 다른 터미널 창에서 실행해야 합니다.

## 🔍 현재 실행 중인 프로세스 확인

```bash
# 프론트엔드 확인
ps aux | grep "next dev"

# 백엔드 확인
ps aux | grep "runserver"

# 포트 사용 확인
lsof -i :3000  # 프론트엔드
lsof -i :8001  # 백엔드
```
