"""
URL configuration for data management endpoints.
"""

from django.urls import path
from . import views

urlpatterns = [
    path('import/', views.import_data, name='import_data'),
    path('export/', views.export_data, name='export_data'),
    path('status/', views.import_status, name='import_status'),
]
