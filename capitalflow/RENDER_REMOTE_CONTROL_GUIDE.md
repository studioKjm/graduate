# 🎮 Render 원격 제어 가이드 (무료 플랜)

Render의 무료 플랜에서는 Shell/SSH 접속이 제공되지 않지만, GitHub Actions와 Render API를 활용하여 원격으로 서버를 제어할 수 있습니다.

## 📋 목차

1. [개요](#1-개요)
2. [설정 방법](#2-설정-방법)
3. [사용 방법](#3-사용-방법)
4. [자동화 방식 비교](#4-자동화-방식-비교)
5. [문제 해결](#5-문제-해결)

---

## 1. 개요

### 1-1. 왜 원격 제어가 필요한가?

Render의 무료 플랜 제한:
- ❌ Shell/SSH 접속 불가
- ❌ 직접 명령어 실행 불가
- ✅ GitHub Actions + Render API로 우회 가능

### 1-2. 해결 방법

**방법 1: 자동화 스크립트 (가장 간단)** ⭐
- `render_start.sh`를 Start Command에 설정
- 배포 시 자동으로 마이그레이션 실행
- **한 번만 설정하면 매번 자동 실행**

**방법 2: GitHub Actions (필요 시 수동 실행)**
- GitHub Actions를 통해 Render API 호출
- 필요할 때만 수동으로 작업 실행
- 더 세밀한 제어 가능

---

## 2. 설정 방법

### 2-1. Render API 키 생성

1. Render 대시보드 → **Account Settings** → **API Keys**
2. **"New API Key"** 클릭
3. 이름 입력 (예: `github-actions`)
4. **API Key 복사** (한 번만 표시됨!)

### 2-2. GitHub Secrets 설정

1. GitHub 저장소 → **Settings** → **Secrets and variables** → **Actions**
2. **"New repository secret"** 클릭
3. 다음 Secrets 추가:

   | Name | Value | 설명 |
   |------|-------|------|
   | `RENDER_API_KEY` | Render API 키 | Render API 인증용 |
   | `RENDER_SERVICE_ID` | `srv-xxxxx` | 백엔드 서비스 ID |

### 2-3. 서비스 ID 확인

Render 대시보드에서:
1. `capitalflow-backend` 서비스 클릭
2. URL에서 서비스 ID 확인:
   ```
   https://dashboard.render.com/web/srv-xxxxx
   ```
   `srv-xxxxx` 부분이 서비스 ID입니다.

---

## 3. 사용 방법

### 3-1. GitHub Actions 실행

1. GitHub 저장소 → **Actions** 탭
2. **"Render Remote Control"** 워크플로우 선택
3. **"Run workflow"** 클릭
4. 실행할 작업 선택:
   - **migrate**: 마이그레이션 실행 (재배포 트리거)
   - **createsuperuser**: 슈퍼유저 생성 안내
   - **collectstatic**: 정적 파일 수집 (재배포 트리거)
   - **deploy**: 단순 재배포
5. **"Run workflow"** 클릭

### 3-2. 실행 결과 확인

1. GitHub Actions에서 실행 로그 확인
2. Render 대시보드에서 배포 상태 확인
3. Render 로그에서 작업 실행 확인

---

## 4. 자동화 방식 비교

### 방식 1: Start Command 자동화 (권장) ⭐

**장점**:
- ✅ 한 번만 설정하면 매번 자동 실행
- ✅ 추가 설정 불필요
- ✅ 가장 간단하고 안정적
- ✅ 배포 시 항상 최신 상태 유지

**단점**:
- ❌ 배포할 때마다 마이그레이션 실행 (보통 문제없음)

**설정**:
```bash
# Start Command
bash render_start.sh
```

**결론**: **이 방식이 가장 실용적입니다!** 매번 수동으로 할 필요가 없습니다.

### 방식 2: GitHub Actions (필요 시만)

**장점**:
- ✅ 필요할 때만 실행 가능
- ✅ 더 세밀한 제어 가능
- ✅ 배포와 분리된 작업 실행

**단점**:
- ❌ 추가 설정 필요 (API 키, Secrets)
- ❌ 수동으로 실행해야 함
- ❌ 배포와 별도로 관리해야 함

**결론**: 특별한 경우에만 사용 (예: 긴급 마이그레이션, 배포 없이 작업 실행)

---

## 5. 문제 해결

### 5-1. API 키 오류

**증상**: `RENDER_API_KEY 환경 변수가 설정되지 않았습니다`

**해결**:
1. GitHub Secrets에 `RENDER_API_KEY` 추가 확인
2. API 키가 올바른지 확인
3. Secrets 이름이 정확한지 확인

### 5-2. 서비스 ID 오류

**증상**: `RENDER_SERVICE_ID 환경 변수가 설정되지 않았습니다`

**해결**:
1. GitHub Secrets에 `RENDER_SERVICE_ID` 추가 확인
2. 서비스 ID 형식 확인: `srv-xxxxx`
3. Render 대시보드에서 서비스 ID 재확인

### 5-3. 권한 오류

**증상**: `403 Forbidden` 또는 `401 Unauthorized`

**해결**:
1. API 키가 올바른지 확인
2. API 키가 만료되지 않았는지 확인
3. Render 계정 권한 확인

---

## 📝 요약

### 추천 방식

**일반적인 경우**: **방식 1 (Start Command 자동화)** 사용
- `bash render_start.sh`를 Start Command에 설정
- 배포 시 자동으로 마이그레이션 실행
- 추가 작업 불필요

**특수한 경우**: **방식 2 (GitHub Actions)** 사용
- 배포 없이 마이그레이션만 실행하고 싶을 때
- 긴급한 작업이 필요할 때
- 더 세밀한 제어가 필요할 때

### 핵심 포인트

✅ **Start Command 자동화는 한 번만 설정하면 매번 자동 실행됩니다**
✅ **매번 수동으로 스크립트를 실행할 필요가 없습니다**
✅ **배포할 때마다 자동으로 마이그레이션이 실행됩니다**

---

## 🎯 결론

**가장 실용적인 방법**: Start Command에 `bash render_start.sh` 설정

이렇게 하면:
- ✅ 배포할 때마다 자동으로 마이그레이션 실행
- ✅ 추가 작업 불필요
- ✅ Shell/SSH 없이도 완전 자동화
- ✅ 무료 플랜에서도 완벽하게 작동

**GitHub Actions는 특별한 경우에만 사용하세요!**

