# 🔧 Git 관리 가이드

## 📋 문제 분석 및 해결

### 🔍 기존 문제
- `.gitignore`의 `data/` 설정이 `backend/apps/data/` 폴더까지 무시
- 중요한 백엔드 파일들이 Git에서 추적되지 않음
- 소스 제어 탭에서 변경사항 확인 불가

### ✅ 해결 조치

#### 1. .gitignore 수정
```gitignore
# 기존 (문제 있음)
data/

# 수정 후 (안전함)
/data/                    # 루트의 data 폴더만 무시
!/backend/apps/data/      # backend/apps/data는 추적
!/frontend/data/          # frontend/data도 추적
```

#### 2. .gitattributes 추가
```gitattributes
# 중요한 파일들이 항상 추적되도록 보장
backend/apps/**/*.py text
frontend/**/*.tsx text
backend/apps/ -ignore
frontend/components/ -ignore
```

#### 3. Pre-commit Hook 설정
- 커밋 전 중요한 파일 누락 자동 체크
- 추적되지 않은 중요한 파일 발견 시 경고

#### 4. 자동 체크 스크립트
- `./check-git-status.sh` 실행으로 언제든 상태 확인
- 추적되지 않은 중요한 파일 자동 추가

## 🚀 일상 작업 가이드

### 매일 작업 후
```bash
# 1. 자동 체크 실행
./check-git-status.sh

# 2. 상태 확인
git status

# 3. 커밋 & 푸시
git add .
git commit -m "작업 내용"
git push origin main
```

### 새로운 파일 추가 시
```bash
# 중요한 폴더의 새 파일은 자동으로 감지되지만
# 수동으로도 확인 가능
git add backend/apps/data/새파일.py
git add frontend/components/새컴포넌트.tsx
```

### 문제 발생 시
```bash
# 1. 강제 추가 (최후 수단)
git add -f backend/apps/data/**/*.py

# 2. 상태 재확인
./check-git-status.sh

# 3. 무시 설정 확인
git check-ignore -v 파일경로
```

## 🛡️ 예방 조치

### 1. 정기적인 체크
- **매일 작업 전**: `./check-git-status.sh` 실행
- **커밋 전**: Pre-commit hook이 자동으로 체크
- **푸시 전**: `git status`로 최종 확인

### 2. 폴더 구조 준수
```
✅ 추적되는 경로:
- backend/apps/data/
- frontend/components/
- frontend/app/

❌ 무시되는 경로:
- /data/ (루트 데이터 폴더)
- /dumps/
- __pycache__/
- node_modules/
```

### 3. 파일 타입별 처리
```
✅ 항상 추적:
- *.py (Python 소스)
- *.ts, *.tsx (TypeScript)
- *.js (JavaScript)
- *.md (문서)

❌ 무시:
- *.csv, *.json, *.xlsx (데이터 파일)
- *.log (로그 파일)
- *.pyc (컴파일된 Python)
```

## 🎯 핵심 명령어

### 상태 확인
```bash
git status                          # 전체 상태
git ls-files | grep "apps/data"     # data 앱 파일 확인
git check-ignore -v 파일경로        # 무시 규칙 확인
```

### 문제 해결
```bash
./check-git-status.sh               # 자동 체크 및 수정
git add -f 경로                     # 강제 추가
git rm --cached 파일                # 추적 중단
```

### 예방
```bash
git add .                           # 모든 변경사항 추가
git commit -m "메시지"               # 커밋
git push origin main                # 푸시
```

## 📞 문제 해결 체크리스트

### ❓ 파일이 소스 제어에 안 보일 때
1. [ ] `./check-git-status.sh` 실행
2. [ ] `git status` 확인
3. [ ] `.gitignore` 규칙 확인: `git check-ignore -v 파일경로`
4. [ ] 필요시 `git add -f 파일경로` 강제 추가

### ❓ 커밋이 안 될 때
1. [ ] Pre-commit hook 메시지 확인
2. [ ] 추적되지 않은 중요한 파일 추가
3. [ ] `git add .` 후 재시도

### ❓ 푸시가 안 될 때
1. [ ] `git pull origin main` 먼저 실행
2. [ ] 충돌 해결 후 푸시
3. [ ] 권한 문제 시 GitHub 토큰 확인

---

**🎉 이제 Git 관리가 완전 자동화되었습니다!**

더 이상 중요한 파일이 누락되는 일은 없을 것입니다. 🚀
