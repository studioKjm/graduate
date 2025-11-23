# 🔧 GeoJSON 파일 Git 추적 문제 해결

## 발견된 문제

### `.gitignore`에서 JSON 파일 무시
- `.gitignore` 파일의 96번째 줄에 `*.json` 규칙이 있음
- 모든 JSON 파일이 Git에서 무시됨
- `world-countries-detailed.json` 파일도 무시되어 원격 저장소에 없음

---

## 해결 방법

### 1. `.gitignore`에 예외 규칙 추가

**수정 내용:**
```gitignore
# Public static files (must be tracked)
!frontend/public/world-countries-detailed.json
!**/world-countries-detailed.json
```

**위치:** `.gitignore` 파일의 Config files 섹션 다음

---

### 2. Git에 파일 강제 추가

**명령어:**
```bash
git add -f frontend/public/world-countries-detailed.json
git add .gitignore
git commit -m "Fix: world-countries-detailed.json 파일 Git 추적 추가"
git push origin main
```

**`-f` 플래그:** `.gitignore` 규칙을 무시하고 강제로 추가

---

## 확인 사항

### 로컬
- [x] `.gitignore`에 예외 규칙 추가 완료
- [x] `git add -f`로 파일 추가 완료
- [x] Git 커밋 및 푸시 완료

### 원격 저장소
- [ ] GitHub에서 `frontend/public/world-countries-detailed.json` 파일 존재 확인
- [ ] Render 빌드 시 파일 복사 확인
- [ ] 배포 후 `https://capitalflow-frontend.onrender.com/world-countries-detailed.json` 접근 가능

---

## 다음 단계

### 1. Render 재배포
- Git 푸시 후 Render가 자동으로 재배포
- 빌드 로그에서 GeoJSON 파일 복사 확인

### 2. 배포 확인
- 배포 완료 후 브라우저에서 GeoJSON 파일 접근 테스트
- 지도 로딩 확인

---

## 참고

### `.gitignore` 예외 규칙 작동 방식

1. `*.json` - 모든 JSON 파일 무시
2. `!frontend/public/world-countries-detailed.json` - 특정 파일 예외
3. `!**/world-countries-detailed.json` - 모든 경로의 해당 파일 예외

**중요:** 예외 규칙(`!`)은 무시 규칙(`*`) **다음**에 와야 함

---

## 테스트

### 1. 원격 저장소 확인
```bash
# GitHub에서 파일 확인
https://github.com/[username]/[repo]/blob/main/frontend/public/world-countries-detailed.json
```

### 2. 배포 후 접근 테스트
```bash
curl https://capitalflow-frontend.onrender.com/world-countries-detailed.json
```

### 3. 브라우저 콘솔 확인
- GeoJSON 로드 성공 메시지
- 지도 렌더링 성공

