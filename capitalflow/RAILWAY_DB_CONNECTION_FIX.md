# 🔗 Railway PostgreSQL 연결 문제 해결

## 문제 상황

- ✅ PostgreSQL 서비스는 활성화되어 있음
- ❌ 백엔드 서비스가 `DATABASE_URL`을 받지 못함
- ❌ DB 연결 에러 발생

## 원인

Railway에서 PostgreSQL 서비스를 추가하면 **자동으로 다른 서비스에 `DATABASE_URL`을 연결**해야 하는데, 연결이 안 되었을 수 있습니다.

---

## 해결 방법

### 방법 1: Railway 대시보드에서 수동 연결 (추천) ⭐

1. **Railway 대시보드 접속**
   - https://railway.app
   - 프로젝트: `miraculous-optimism`

2. **PostgreSQL 서비스 확인**
   - PostgreSQL 서비스가 보이는지 확인
   - "Active" 상태인지 확인

3. **백엔드 서비스 Variables 확인**
   - 백엔드 서비스 (`graduate`) 클릭
   - Variables 탭 확인
   - `DATABASE_URL`이 있는지 확인

4. **`DATABASE_URL`이 없다면:**
   - PostgreSQL 서비스 → Variables 탭
   - `DATABASE_URL` 또는 `POSTGRES_URL` 복사
   - 백엔드 서비스 → Variables 탭
   - "New Variable" 클릭
   - Name: `DATABASE_URL`
   - Value: (PostgreSQL에서 복사한 URL) 붙여넣기
   - 저장

---

### 방법 2: Railway CLI로 확인 및 설정

```bash
# 모든 환경 변수 확인
npx @railway/cli variables

# DATABASE_URL 확인
npx @railway/cli variables | grep DATABASE

# PostgreSQL 서비스의 DATABASE_URL 확인
# (PostgreSQL 서비스로 전환 후)
npx @railway/cli variables
```

---

### 방법 3: 서비스 간 연결 확인

Railway에서 PostgreSQL 서비스를 추가하면:
1. PostgreSQL 서비스가 생성됨
2. **같은 프로젝트의 다른 서비스에 자동으로 `DATABASE_URL` 연결**
3. 하지만 때로는 수동으로 연결해야 할 수 있음

**확인 사항:**
- PostgreSQL 서비스와 백엔드 서비스가 **같은 프로젝트**에 있는지
- PostgreSQL 서비스의 Variables에 `DATABASE_URL`이 있는지
- 백엔드 서비스의 Variables에 `DATABASE_URL`이 있는지

---

## Railway 대시보드에서 확인하는 방법

### 1. PostgreSQL 서비스 Variables 확인

1. PostgreSQL 서비스 클릭
2. Variables 탭
3. `DATABASE_URL` 또는 `POSTGRES_URL` 확인
4. 값 복사

### 2. 백엔드 서비스 Variables 확인

1. 백엔드 서비스 (`graduate`) 클릭
2. Variables 탭
3. `DATABASE_URL`이 있는지 확인

### 3. `DATABASE_URL`이 없다면 추가

1. 백엔드 서비스 → Variables 탭
2. "New Variable" 또는 "+" 클릭
3. Name: `DATABASE_URL`
4. Value: (PostgreSQL에서 복사한 URL)
5. 저장

---

## DATABASE_URL 형식

Railway PostgreSQL의 `DATABASE_URL` 형식:
```
postgresql://postgres:password@host:port/railway
```

또는:
```
postgres://postgres:password@host:port/railway
```

---

## 재배포 후 확인

1. **환경 변수 설정 후**
2. **재배포**: "Redeploy" 클릭
3. **로그 확인**: 배포 로그에서 DB 연결 성공 확인

---

## 체크리스트

- [ ] PostgreSQL 서비스가 Active 상태
- [ ] PostgreSQL 서비스 Variables에 `DATABASE_URL` 존재
- [ ] 백엔드 서비스 Variables에 `DATABASE_URL` 존재
- [ ] 두 서비스가 같은 프로젝트에 있음
- [ ] 재배포 완료
- [ ] 배포 로그에서 DB 연결 성공 확인

---

## 예상 결과

`DATABASE_URL`을 설정하고 재배포하면:
- ✅ Django가 PostgreSQL에 연결
- ✅ 마이그레이션 자동 실행
- ✅ 서버 정상 시작

