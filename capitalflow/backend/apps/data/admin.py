from django.contrib import admin
from .models import (
    Country, Sector, CapitalType, DataSource,
    RawCapitalData, ProcessedCapitalData, DataProcessingLog
)


@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'name_en', 'region', 'continent', 'is_active']
    list_filter = ['region', 'continent', 'is_active']
    search_fields = ['code', 'name', 'name_en']
    ordering = ['code']


@admin.register(Sector)
class SectorAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'name_en', 'parent', 'is_active']
    list_filter = ['parent', 'is_active']
    search_fields = ['code', 'name', 'name_en']
    ordering = ['code']


@admin.register(CapitalType)
class CapitalTypeAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'name_en', 'is_active']
    list_filter = ['is_active']
    search_fields = ['code', 'name', 'name_en']
    ordering = ['code']


@admin.register(DataSource)
class DataSourceAdmin(admin.ModelAdmin):
    list_display = ['name', 'source_type', 'reliability_level', 'reliability_weight', 'is_active']
    list_filter = ['source_type', 'reliability_level', 'is_active']
    search_fields = ['name', 'description']
    ordering = ['name']


@admin.register(RawCapitalData)
class RawCapitalDataAdmin(admin.ModelAdmin):
    list_display = ['country', 'sector', 'capital_type', 'year', 'amount_usd', 'source', 'is_verified']
    list_filter = ['source', 'year', 'is_verified', 'is_outlier']
    search_fields = ['country__name', 'sector__name', 'capital_type__name']
    ordering = ['-collection_date']
    readonly_fields = ['id', 'collection_date']


@admin.register(ProcessedCapitalData)
class ProcessedCapitalDataAdmin(admin.ModelAdmin):
    list_display = ['country', 'sector', 'capital_type', 'year', 'final_amount_usd', 'confidence_score', 'fusion_method']
    list_filter = ['fusion_method', 'year', 'is_predicted']
    search_fields = ['country__name', 'sector__name', 'capital_type__name']
    ordering = ['-processing_date']
    readonly_fields = ['id', 'processing_date']


@admin.register(DataProcessingLog)
class DataProcessingLogAdmin(admin.ModelAdmin):
    list_display = ['processing_type', 'status', 'start_time', 'duration_seconds', 'records_processed', 'records_success']
    list_filter = ['processing_type', 'status', 'start_time']
    search_fields = ['source__name', 'country__name', 'sector__name']
    ordering = ['-start_time']
    readonly_fields = ['id', 'start_time', 'end_time', 'duration_seconds']
