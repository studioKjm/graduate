#!/bin/bash
# 빠른 데이터베이스 백업 스크립트

# 가상환경 활성화
source venv/bin/activate

# 타임스탬프 생성
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups"

# 백업 디렉토리 생성
mkdir -p $BACKUP_DIR

echo "🚀 빠른 데이터베이스 백업 시작..."

# 1. 전체 데이터 백업
echo "📦 전체 데이터 백업 중..."
python manage.py dumpdata --indent 2 --output $BACKUP_DIR/full_backup_$TIMESTAMP.json

# 2. 주요 앱별 백업
echo "📦 사용자 데이터 백업 중..."
python manage.py dumpdata auth --indent 2 --output $BACKUP_DIR/users_$TIMESTAMP.json

echo "📦 핵심 데이터 백업 중..."
python manage.py dumpdata core data --indent 2 --output $BACKUP_DIR/core_data_$TIMESTAMP.json

echo "✅ 백업 완료!"
echo "📁 백업 위치: $BACKUP_DIR/"
echo "🕒 백업 시간: $(date)"
echo ""
echo "📋 백업 파일 목록:"
ls -lh $BACKUP_DIR/*$TIMESTAMP*
