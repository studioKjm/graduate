# 프론트엔드-백엔드 통신 문제 해결 가이드

## 발견된 문제

1. **포트 불일치**: 백엔드는 8000번 포트에서 실행 중이지만, 프론트엔드는 8001번 포트를 참조하고 있었습니다.

## 수정된 파일

### 1. API 클라이언트 설정
- `frontend/lib/api-client.ts`: 기본 URL을 `http://localhost:8001` → `http://localhost:8000`으로 변경

### 2. Next.js 설정
- `frontend/next.config.js`: `NEXT_PUBLIC_API_URL` 기본값을 `http://localhost:8001/api/v1` → `http://localhost:8000/api/v1`으로 변경

### 3. 관리자 페이지
- `frontend/app/admin/page.tsx`: API_BASE_URL을 `http://localhost:8001` → `http://localhost:8000`으로 변경
- `frontend/components/admin/AdminDataManagementTab.tsx`: 모든 하드코딩된 URL을 8000으로 변경
- `frontend/components/admin/AdminOverviewTab.tsx`: 모든 하드코딩된 URL을 8000으로 변경

## 해결 방법

### 백엔드 서버 실행 확인

```bash
# 백엔드 디렉토리로 이동
cd /Users/jimin/graduate/capitalflow/backend

# 가상환경 활성화
source venv/bin/activate

# 서버 실행 (8000번 포트)
python3 manage.py runserver 8000
```

### 프론트엔드 서버 재시작

프론트엔드 서버를 재시작하여 변경사항을 적용하세요:

```bash
# 프론트엔드 디렉토리로 이동
cd /Users/jimin/graduate/capitalflow/frontend

# 서버 재시작 (Ctrl+C로 중지 후)
npm run dev
```

## 확인 사항

1. **백엔드 서버 상태 확인**
   - 브라우저에서 `http://localhost:8000/api/v1/visualization/map-data/?year=2023` 접속
   - JSON 응답이 오는지 확인

2. **프론트엔드 페이지 확인**
   - `http://localhost:3000/map` - 지도 페이지
   - `http://localhost:3000/admin` - 관리자 페이지

3. **브라우저 콘솔 확인**
   - 개발자 도구(F12) → Console 탭에서 API 호출 로그 확인
   - 에러 메시지가 있는지 확인

## 추가 참고사항

- 환경 변수를 사용하여 포트를 설정하려면 `.env.local` 파일을 생성:
  ```
  NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
  ```

- 백엔드를 다른 포트에서 실행하려면, 프론트엔드 설정도 함께 변경해야 합니다.

