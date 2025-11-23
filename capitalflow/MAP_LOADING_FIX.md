# 🗺️ 지도 무한 로딩 문제 해결

## 발견된 문제

### 1. GeoJSON 파일 404
- `world-countries-detailed.json` 파일을 찾을 수 없음
- Next.js static export에서 `public` 폴더의 파일이 제대로 복사되지 않음

### 2. API 응답 데이터 0개
- 모든 연도에 대해 "Processed 0 countries with data" 메시지
- 데이터베이스에 실제 데이터가 없을 수 있음

### 3. 지도 렌더링 실패
- GeoJSON이 없어서 `mapData`가 null
- API 데이터가 0개라서 `currentMapData`도 null
- 무한 로딩 상태 유지

---

## 해결 방법

### 1. GeoJSON 파일 확인

**로컬에서 확인:**
```bash
ls -lh frontend/public/world-countries-detailed.json
```

**파일이 없으면:**
- GeoJSON 파일을 `frontend/public/` 폴더에 추가
- 파일이 Git에 포함되어 있는지 확인

---

### 2. Next.js 빌드 확인

**Next.js static export (`output: 'export'`) 설정:**
- `public` 폴더의 파일은 자동으로 루트에 복사됨
- 빌드 후 `out` 폴더에 `world-countries-detailed.json`이 있는지 확인

**빌드 확인:**
```bash
cd frontend
npm run build
ls -lh out/world-countries-detailed.json
```

---

### 3. Render 배포 설정 확인

**Render Static Site 설정:**
- **Publish Directory**: `out` (Next.js static export 출력 폴더)
- `out` 폴더에 `world-countries-detailed.json`이 포함되어야 함

---

### 4. 코드 수정 완료

**NoLoadingYearMap.tsx 수정:**
- GeoJSON 로드 실패 시 빈 `mapData` 설정하여 로딩 상태 해제
- 데이터가 없을 때도 명확한 메시지 표시
- 무한 로딩 방지

---

## 확인 체크리스트

### 로컬
- [ ] `frontend/public/world-countries-detailed.json` 파일 존재
- [ ] `npm run build` 후 `out/world-countries-detailed.json` 파일 존재
- [ ] Git에 파일 포함 확인

### Render
- [ ] **Publish Directory**: `out`
- [ ] 빌드 로그에서 GeoJSON 파일 복사 확인
- [ ] 배포 후 `https://capitalflow-frontend.onrender.com/world-countries-detailed.json` 접근 가능

### 백엔드
- [ ] API 응답에 실제 데이터 포함 확인
- [ ] 데이터베이스에 데이터 존재 확인

---

## 테스트

### 1. GeoJSON 파일 접근 테스트
```bash
curl https://capitalflow-frontend.onrender.com/world-countries-detailed.json
```

### 2. API 데이터 확인
```bash
curl "https://graduate-production-78b3.up.railway.app/api/v1/visualization/map-data/?year=2020&capital_types=FDI"
```

### 3. 브라우저 콘솔 확인
- GeoJSON 로드 성공 메시지
- API 데이터 로드 성공 메시지
- 지도 렌더링 성공

---

## 빠른 해결

1. **GeoJSON 파일 확인**: `frontend/public/world-countries-detailed.json` 존재 확인
2. **빌드 확인**: `npm run build` 후 `out` 폴더에 파일 복사 확인
3. **Render 재배포**: Publish Directory가 `out`인지 확인 후 재배포
4. **테스트**: 브라우저에서 지도 로딩 확인

---

## 추가 디버깅

### GeoJSON 파일이 여전히 404인 경우

1. **파일 크기 확인**: 파일이 너무 크면 Render에서 제외될 수 있음
2. **.gitignore 확인**: 파일이 Git에 포함되어 있는지 확인
3. **빌드 로그 확인**: Render 빌드 로그에서 파일 복사 여부 확인

### API 데이터가 0개인 경우

1. **데이터베이스 확인**: Railway PostgreSQL에 실제 데이터 존재 확인
2. **API 엔드포인트 테스트**: 직접 API 호출하여 응답 확인
3. **필터 조건 확인**: 선택한 연도/필터에 데이터가 있는지 확인

