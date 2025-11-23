"""
Production settings
무료 배포 플랫폼 (Render, Railway, Fly.io 등)을 지원하도록 개선된 설정
"""

import os
import dj_database_url
from .base import *

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DEBUG', 'False') == 'True'

# 호스트 설정 (환경 변수에서 가져오기)
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')
ALLOWED_HOSTS = [h.strip() for h in ALLOWED_HOSTS if h.strip()]

# Secret Key (환경 변수 필수)
SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable is required in production")

# Security settings
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_SECONDS = 31536000
SECURE_REDIRECT_EXEMPT = []
SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'True') == 'True'
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Session security
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True

# Email settings (선택사항)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST', default='')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = True
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@capitalflow.com')

# Production database 설정
# DATABASE_URL 우선 사용 (Render, Railway, Fly.io 등에서 자동 제공)
DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    # DATABASE_URL이 있으면 사용 (무료 배포 플랫폼 표준)
    DATABASES = {
        'default': dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
else:
    # 개별 설정 사용 (기존 방식, DATABASE_URL이 없을 때만)
    # Railway/Render 등에서 DATABASE_URL이 자동 설정되지 않은 경우를 위한 폴백
    # 기본값을 제공하여 에러 방지
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('DB_NAME', default='capitalflow'),
            'USER': config('DB_USER', default='postgres'),
            'PASSWORD': config('DB_PASSWORD', default=''),
            'HOST': config('DB_HOST', default='localhost'),
            'PORT': config('DB_PORT', default='5432'),
            'OPTIONS': {
                'sslmode': 'require',
            },
        }
    }

# CORS 설정 (환경 변수에서 가져오기)
CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',')
CORS_ALLOWED_ORIGINS = [o.strip() for o in CORS_ALLOWED_ORIGINS if o.strip()]

# 정적 파일 설정 (WhiteNoise)
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATIC_URL = '/static/'

# WhiteNoise 미들웨어 확인 (base.py에 이미 있으면 중복 추가 방지)
if 'whitenoise.middleware.WhiteNoiseMiddleware' not in MIDDLEWARE:
    MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# 로깅 설정 (프로덕션용)
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'capitalflow': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
