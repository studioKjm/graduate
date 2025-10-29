# 졸업작품 제출 체크리스트

## ✅ 제출 파일 확인
- [x] `capitalflow_submission.tar.gz` (118MB) - 메인 제출 파일
- [x] 민감한 정보 제거 완료
- [x] 불필요한 파일 제거 완료

## ✅ 제거된 민감한 정보
- [x] `.env` 파일 (API 키, 데이터베이스 비밀번호 등)
- [x] `backend/venv/` (가상환경)
- [x] `frontend/node_modules/` (의존성 패키지)
- [x] `frontend/.next/` (빌드 파일)
- [x] `backend/db.sqlite3` (데이터베이스 파일)
- [x] 로그 파일 (`*.log`)
- [x] 캐시 파일 (`__pycache__/`)
- [x] IDE 설정 파일 (`.vscode/`, `.idea/`)
- [x] OS 파일 (`.DS_Store`)

## ✅ 포함된 필수 파일
- [x] 소스 코드 (Python, TypeScript, React)
- [x] 설정 파일 (`requirements.txt`, `package.json`)
- [x] 문서 (`README.md`)
- [x] 환경 설정 예시 (`.env.example`)
- [x] Docker 설정 (`docker-compose.yml`)
- [x] Git 히스토리 (`.git/`)

## 📋 제출 시 포함할 추가 정보
1. **프로젝트 설명서** (별도 문서)
2. **설치 및 실행 가이드** (README.md에 포함)
3. **기술 스택 및 아키텍처 설명**
4. **데이터 소스 및 수집 방법**
5. **주요 기능 및 특징**
6. **개발 과정 및 어려움**

## 🔧 제출 후 실행 방법
1. 압축 해제: `tar -xzf capitalflow_submission.tar.gz`
2. 환경 설정: `cp .env.example .env` (API 키 설정 필요)
3. Backend 실행: `cd backend && pip install -r requirements.txt && python manage.py runserver 8001`
4. Frontend 실행: `cd frontend && npm install && npm run dev`
5. 접속: http://localhost:3000

## ⚠️ 주의사항
- API 키는 실제 값으로 교체 필요
- 데이터베이스는 빈 상태로 제출됨
- 실제 데이터 수집을 위해서는 별도 설정 필요
