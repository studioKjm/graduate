# Render 배포용 Dockerfile
# Render의 $PORT 환경 변수를 사용하도록 최적화됨

FROM python:3.11-slim

# 환경 변수 설정
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

# 시스템 패키지 설치 (PostgreSQL 클라이언트 라이브러리 등)
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    pkg-config \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 작업 디렉토리 설정
WORKDIR /app

# Python 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 프로젝트 파일 복사
COPY . .

# 로그 디렉토리 생성
RUN mkdir -p logs mediafiles staticfiles

# 정적 파일 수집 (에러가 나도 계속 진행)
RUN python manage.py collectstatic --noinput || true

# 포트 노출 (Render가 $PORT 환경 변수로 제공)
# EXPOSE는 문서화 목적이며, 실제 포트는 $PORT 환경 변수 사용
EXPOSE 8000

# Health check (선택사항)
# Render가 헬스 체크를 자동으로 수행하므로 선택사항
# 필요시 주석 해제하여 사용
# HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
#     CMD curl -f http://localhost:${PORT:-8000}/api/v1/ || exit 1

# 스크립트에 실행 권한 부여
RUN chmod +x render_start.sh railway_start.sh

# 시작 스크립트 실행
# Railway를 사용하는 경우 railway_start.sh, Render를 사용하는 경우 render_start.sh
# 기본값은 render_start.sh (하위 호환성)
# Railway에서는 railway_start.sh를 사용하도록 CMD를 오버라이드할 수 있음
CMD ["bash", "render_start.sh"]
