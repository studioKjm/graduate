"""
URL configuration for API endpoints.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from . import views

# Create router and register viewsets
router = DefaultRouter()
router.register(r'countries', views.CountryViewSet)
router.register(r'sectors', views.SectorViewSet)
router.register(r'capital-types', views.CapitalTypeViewSet)
router.register(r'capital-flows', views.CapitalFlowViewSet, basename='capitalflow')
router.register(r'country-totals', views.CountryTotalCapitalViewSet, basename='countrytotal')
router.register(r'user-preferences', views.UserPreferenceViewSet, basename='userpreference')

urlpatterns = [
    # Authentication
    path('auth/register/', views.register_user, name='register'),
    path('auth/login/', views.login_user, name='login'),
    path('auth/me/', views.get_current_user, name='current_user'),  # 현재 사용자 정보
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Visualization data endpoints
    path('visualization/map/', views.map_visualization_data, name='map_visualization'),
    path('visualization/flow/', views.flow_visualization_data, name='flow_visualization'),
    
    # Data summary
    path('data/summary/', views.data_summary, name='data_summary'),
    
    # Include router URLs
    path('', include(router.urls)),
]
