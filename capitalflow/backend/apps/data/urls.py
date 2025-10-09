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
    path('capitalflows/', views.CapitalFlowAPIView.as_view(), name='capital-flows'),
    
    # 새로운 벌크 로딩 API
    path('bulk-years/', views.BulkYearDataAPIView.as_view(), name='bulk-years'),
    
    # 메타데이터
    path('metadata/', views.MetadataAPIView.as_view(), name='metadata'),
    
    # 뉴스 검색
    path('news/', views.NewsAPIView.as_view(), name='news'),
    
    # 시스템 상태
    path('health/', views.health_check, name='health-check'),
    
    # 관리자용 API (데이터 처리)
    path('admin/collect/', views.DataCollectionAPIView.as_view(), name='admin-collect'),
    path('admin/raw-collect/', views.RawDataCollectionAPIView.as_view(), name='admin-raw-collect'),
    path('admin/collect-all-sources/', views.CollectAllSourcesAPIView.as_view(), name='admin-collect-all-sources'),
    path('admin/massive-collect/', views.MassiveDataCollectionAPIView.as_view(), name='admin-massive-collect'),
    path('admin/real-data-only-collect/', views.RealDataOnlyCollectionAPIView.as_view(), name='admin-real-data-only-collect'),
    path('admin/advanced-third-stage-collect/', views.AdvancedThirdStageCollectionAPIView.as_view(), name='admin-advanced-third-stage-collect'),
    path('admin/fourth-stage-estimation/', views.FourthStageEstimationAPIView.as_view(), name='admin-fourth-stage-estimation'),
    path('admin/analyze-imbalance/', views.DataImbalanceAnalysisAPIView.as_view(), name='admin-analyze-imbalance'),
    path('admin/detailed-analysis/', views.DetailedDataAnalysisAPIView.as_view(), name='admin-detailed-analysis'),
    path('admin/duplicate-analysis/', views.DuplicateAnalysisAPIView.as_view(), name='admin-duplicate-analysis'),
    path('admin/missing-data-analysis/', views.MissingDataAnalysisAPIView.as_view(), name='admin-missing-data-analysis'),
    path('admin/fusion/', views.DataFusionAPIView.as_view(), name='admin-fusion'),
    path('admin/validate/', views.DataValidationAPIView.as_view(), name='admin-validate'),
    path('admin/logs/', views.ProcessingLogsAPIView.as_view(), name='admin-logs'),
    path('admin/collection-stats/', views.CollectionStatsAPIView.as_view(), name='admin-collection-stats'),
    path('admin/unfused-data/', views.UnfusedDataAPIView.as_view(), name='admin-unfused-data'),
    path('admin/delete-data/', views.DataDeletionAPIView.as_view(), name='admin-delete-data'),
    
    # 데이터 파이프라인 가시성 API
    path('pipeline/overview/', DataPipelineOverviewAPIView.as_view(), name='pipeline-overview'),
    path('pipeline/raw-data/', RawDataDetailAPIView.as_view(), name='pipeline-raw-data'),
    path('pipeline/processed-data/', ProcessedDataDetailAPIView.as_view(), name='pipeline-processed-data'),
    path('pipeline/traceability/', DataTraceabilityAPIView.as_view(), name='pipeline-traceability'),
    path('pipeline/quality-analysis/', DataQualityAnalysisAPIView.as_view(), name='pipeline-quality'),
]
