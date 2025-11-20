#!/bin/bash
# 백엔드 서버 실행 스크립트 (8001번 포트)

cd "$(dirname "$0")"

# 가상환경 활성화
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "❌ 가상환경을 찾을 수 없습니다. 먼저 가상환경을 생성하세요."
    exit 1
fi

# Django 서버 실행 (8001번 포트)
echo "🚀 백엔드 서버를 8001번 포트에서 시작합니다..."
echo "📍 API 주소: http://localhost:8001/api/v1"
echo "📍 관리자 페이지: http://localhost:8001/admin"
echo ""
echo "서버를 중지하려면 Ctrl+C를 누르세요."
echo ""

python3 manage.py runserver 8001

