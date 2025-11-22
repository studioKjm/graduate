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

# Gunicorn 실행
# Render는 $PORT 환경 변수를 제공하므로 이를 사용
# 기본값으로 8000을 사용하지만, Render에서는 $PORT를 사용
CMD sh -c "gunicorn --bind 0.0.0.0:${PORT:-8000} --workers 2 --threads 2 --timeout 60 capitalflow.wsgi:application"
