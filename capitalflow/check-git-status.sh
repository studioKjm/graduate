#!/bin/bash

# Git 상태 자동 체크 및 중요한 파일 추가 스크립트

echo "🔍 Git 상태 체크 및 중요한 파일 자동 추가"
echo "================================================"

# 현재 Git 상태 확인
echo "📋 현재 Git 상태:"
git status --porcelain

echo ""
echo "🔍 중요한 경로의 추적되지 않은 파일 확인 중..."

# 중요한 경로들
IMPORTANT_PATHS=(
    "backend/apps"
    "frontend/components"
    "frontend/app"
    "backend/capitalflow"
)

# 추적되지 않은 중요한 파일들 찾기
untracked_files=()

for path in "${IMPORTANT_PATHS[@]}"; do
    if [ -d "$path" ]; then
        while IFS= read -r file; do
            if [[ "$file" == *.py || "$file" == *.ts || "$file" == *.tsx || "$file" == *.js ]]; then
                if ! git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
                    untracked_files+=("$file")
                fi
            fi
        done < <(find "$path" -type f -name "*.py" -o -name "*.ts" -o -name "*.tsx" -o -name "*.js" | grep -v __pycache__ | grep -v node_modules)
    fi
done

# 추적되지 않은 파일이 있으면 자동 추가
if [ ${#untracked_files[@]} -ne 0 ]; then
    echo "⚠️  추적되지 않은 중요한 파일들을 발견했습니다:"
    for file in "${untracked_files[@]}"; do
        echo "   - $file"
    done
    
    echo ""
    echo "🔧 자동으로 Git에 추가 중..."
    
    for file in "${untracked_files[@]}"; do
        git add "$file"
        echo "   ✅ 추가됨: $file"
    done
    
    echo ""
    echo "📊 업데이트된 Git 상태:"
    git status --short
    
else
    echo "✅ 모든 중요한 파일이 이미 추적되고 있습니다."
fi

echo ""
echo "🔍 .gitignore 설정 확인:"
echo "현재 data/ 경로 무시 설정:"
grep -n "data/" .gitignore

echo ""
echo "💡 권장 사항:"
echo "1. 작업 후 이 스크립트를 실행: ./check-git-status.sh"
echo "2. 커밋 전 상태 확인: git status"
echo "3. 정기적인 푸시: git push origin main"

exit 0
