# 🔧 Railway 데이터베이스 설정 문제 해결

## 발견된 에러

```
decouple.UndefinedValueError: DB_NAME not found. Declare it as envvar or define a default value.
```

## 원인

1. **DATABASE_URL 미설정**: Railway에서 PostgreSQL 서비스를 추가하지 않았거나 연결되지 않음
2. **기본값 없음**: `production.py`에서 `DATABASE_URL`이 없을 때 개별 DB 설정에 기본값이 없음

## 해결 방법

### 방법 1: PostgreSQL 서비스 추가 (추천) ⭐

Railway에서 PostgreSQL 데이터베이스를 추가하면 `DATABASE_URL`이 자동으로 설정됩니다.

1. **Railway 대시보드**
   - 프로젝트: `miraculous-optimism`
   - "New" → "Database" → "Add PostgreSQL"

2. **자동 연결 확인**
   - PostgreSQL 서비스를 추가하면 백엔드 서비스에 `DATABASE_URL`이 자동으로 연결됨
   - Variables 탭에서 `DATABASE_URL` 확인

3. **재배포**
   - "Redeploy" 클릭

---

### 방법 2: 수정된 production.py 사용

`production.py`를 수정하여 `DATABASE_URL`이 없을 때 기본값을 제공하도록 했습니다.

**수정 내용:**
- `config('DB_NAME')` → `config('DB_NAME', default='capitalflow')`
- 다른 DB 설정에도 기본값 추가

이제 `DATABASE_URL`이 없어도 에러가 발생하지 않지만, **PostgreSQL 서비스를 추가하는 것이 올바른 해결 방법**입니다.

---

## 체크리스트

### Railway 설정
- [ ] PostgreSQL 서비스 추가됨
- [ ] `DATABASE_URL` 환경 변수 자동 설정 확인
- [ ] 백엔드 서비스와 PostgreSQL 서비스가 같은 프로젝트에 있음

### 환경 변수 확인
```bash
npx @railway/cli variables | grep DATABASE
```

`DATABASE_URL`이 보이면 정상입니다.

---

## 다음 단계

1. **PostgreSQL 서비스 추가** (아직 없다면)
2. **DATABASE_URL 확인**
3. **재배포**
4. **로그 확인**: 에러가 해결되었는지 확인

---

## 참고

- Railway PostgreSQL은 `DATABASE_URL`을 자동으로 제공합니다
- 별도로 `DB_NAME`, `DB_USER` 등을 설정할 필요가 없습니다
- `DATABASE_URL` 형식: `postgresql://user:password@host:port/dbname`

