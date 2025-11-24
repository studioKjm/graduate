from django.apps import AppConfig


class DataConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.data'
    label = 'data'  # 앱 레이블 명시적으로 설정
    verbose_name = '다층 검증 자본 데이터'
