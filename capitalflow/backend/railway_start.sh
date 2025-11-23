#!/bin/bash
# Railway 배포용 시작 스크립트
# 마이그레이션 자동 실행 후 서버 시작

set -e  # 에러 발생 시 스크립트 중단

echo "🚂 Railway 배포 시작 스크립트 실행 중..."

# 마이그레이션 실행
echo "📦 데이터베이스 마이그레이션 실행 중..."
python manage.py migrate --noinput

# 정적 파일 수집
echo "📁 정적 파일 수집 중..."
python manage.py collectstatic --noinput || true

# 슈퍼유저 자동 생성 (환경 변수가 설정된 경우)
echo "👤 슈퍼유저 확인 중..."
python create_superuser_if_needed.py || true

# Gunicorn 서버 시작
# Railway는 PORT 환경 변수를 제공
echo "🌐 Gunicorn 서버 시작 중..."
exec gunicorn --bind 0.0.0.0:${PORT:-8000} --workers 2 --threads 2 --timeout 60 capitalflow.wsgi:application

