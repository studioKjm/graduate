from django.urls import path
from . import views
from .data_pipeline_views import (
    DataPipelineOverviewAPIView,
    RawDataDetailAPIView,
    ProcessedDataDetailAPIView,
    DataTraceabilityAPIView,
    DataQualityAnalysisAPIView
)

app_name = 'data'

urlpatterns = [
    # 메인 API 엔드포인트
    path('capitalflows/', views.CapitalFlowsAPIView.as_view(), name='capital-flows'),
    
    # 메타데이터
    path('metadata/', views.MetadataAPIView.as_view(), name='metadata'),
    
    # 시스템 상태
    path('health/', views.health_check, name='health-check'),
    
    # 관리자용 API (데이터 처리)
    path('admin/collect/', views.DataCollectionAPIView.as_view(), name='admin-collect'),
    path('admin/fusion/', views.DataFusionAPIView.as_view(), name='admin-fusion'),
    path('admin/validate/', views.DataValidationAPIView.as_view(), name='admin-validate'),
    path('admin/logs/', views.ProcessingLogsAPIView.as_view(), name='admin-logs'),
    
    # 데이터 파이프라인 가시성 API
    path('pipeline/overview/', DataPipelineOverviewAPIView.as_view(), name='pipeline-overview'),
    path('pipeline/raw-data/', RawDataDetailAPIView.as_view(), name='pipeline-raw-data'),
    path('pipeline/processed-data/', ProcessedDataDetailAPIView.as_view(), name='pipeline-processed-data'),
    path('pipeline/traceability/', DataTraceabilityAPIView.as_view(), name='pipeline-traceability'),
    path('pipeline/quality-analysis/', DataQualityAnalysisAPIView.as_view(), name='pipeline-quality'),
]
