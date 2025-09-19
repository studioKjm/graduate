"""
Admin configuration for core models.
"""

from django.contrib import admin
from .models import (
    Country, Sector, CapitalType, CapitalFlow, 
    CountryTotalCapital, UserPreference
)


@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ['name', 'code_iso3', 'region', 'continent', 'is_active']
    list_filter = ['region', 'continent', 'is_active']
    search_fields = ['name', 'code_iso2', 'code_iso3']
    ordering = ['name']


@admin.register(Sector)
class SectorAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'parent_sector', 'color_code', 'is_active']
    list_filter = ['parent_sector', 'is_active']
    search_fields = ['name', 'code']
    ordering = ['name']


@admin.register(CapitalType)
class CapitalTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'code']
    ordering = ['name']


@admin.register(CapitalFlow)
class CapitalFlowAdmin(admin.ModelAdmin):
    list_display = [
        'year', 'source_country', 'target_country', 
        'sector', 'capital_type', 'amount_usd', 'data_source'
    ]
    list_filter = [
        'year', 'sector', 'capital_type', 'data_source', 
        'confidence_level'
    ]
    search_fields = [
        'source_country__name', 'target_country__name',
        'sector__name', 'capital_type__name'
    ]
    ordering = ['-year', '-amount_usd']
    raw_id_fields = ['source_country', 'target_country']
    
    fieldsets = (
        ('Time Period', {
            'fields': ('year', 'quarter', 'month')
        }),
        ('Flow Direction', {
            'fields': ('source_country', 'target_country')
        }),
        ('Categorization', {
            'fields': ('sector', 'capital_type')
        }),
        ('Amount', {
            'fields': ('amount_usd', 'currency_original', 'exchange_rate')
        }),
        ('Metadata', {
            'fields': ('data_source', 'confidence_level', 'notes', 'reference_url')
        }),
    )


@admin.register(CountryTotalCapital)
class CountryTotalCapitalAdmin(admin.ModelAdmin):
    list_display = [
        'country', 'sector', 'year', 'total_inflow', 
        'total_outflow', 'net_flow', 'flow_percentile'
    ]
    list_filter = ['year', 'sector', 'capital_type']
    search_fields = ['country__name', 'sector__name']
    ordering = ['-year', '-total_inflow']
    raw_id_fields = ['country']


@admin.register(UserPreference)
class UserPreferenceAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'default_year_range_start', 'default_year_range_end',
        'preferred_visualization'
    ]
    filter_horizontal = ['favorite_countries', 'favorite_sectors']
    ordering = ['user__username']
