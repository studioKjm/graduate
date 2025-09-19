"""
URL configuration for analytics endpoints.
"""

from django.urls import path
from . import views

urlpatterns = [
    path('trends/', views.trends_analysis, name='trends_analysis'),
    path('rankings/', views.rankings, name='rankings'),
    path('insights/', views.insights, name='insights'),
]
