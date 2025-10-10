"""
URL configuration for visualization endpoints.
"""

from django.urls import path
from . import views

urlpatterns = [
    path('map-config/', views.map_config, name='map_config'),
    path('map-data/', views.map_data, name='map_data'),
    path('chart-data/', views.chart_data, name='chart_data'),
]
