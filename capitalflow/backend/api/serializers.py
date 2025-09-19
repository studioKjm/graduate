"""
Serializers for the API endpoints.
"""

from rest_framework import serializers
from django.contrib.auth.models import User
from core.models import (
    Country, Sector, CapitalType, CapitalFlow, 
    CountryTotalCapital, UserPreference
)


class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = [
            'id', 'name', 'code_iso2', 'code_iso3', 'region', 
            'sub_region', 'continent', 'latitude', 'longitude'
        ]


class SectorSerializer(serializers.ModelSerializer):
    parent_sector_name = serializers.CharField(source='parent_sector.name', read_only=True)
    
    class Meta:
        model = Sector
        fields = [
            'id', 'name', 'code', 'description', 'parent_sector', 
            'parent_sector_name', 'color_code'
        ]


class CapitalTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CapitalType
        fields = ['id', 'name', 'code', 'description']


class CapitalFlowSerializer(serializers.ModelSerializer):
    source_country_name = serializers.CharField(source='source_country.name', read_only=True)
    target_country_name = serializers.CharField(source='target_country.name', read_only=True)
    source_country_code = serializers.CharField(source='source_country.code_iso3', read_only=True)
    target_country_code = serializers.CharField(source='target_country.code_iso3', read_only=True)
    sector_name = serializers.CharField(source='sector.name', read_only=True)
    capital_type_name = serializers.CharField(source='capital_type.name', read_only=True)
    
    class Meta:
        model = CapitalFlow
        fields = [
            'id', 'year', 'quarter', 'month',
            'source_country', 'source_country_name', 'source_country_code',
            'target_country', 'target_country_name', 'target_country_code',
            'sector', 'sector_name', 'capital_type', 'capital_type_name',
            'amount_usd', 'data_source', 'confidence_level'
        ]


class CountryTotalCapitalSerializer(serializers.ModelSerializer):
    country_name = serializers.CharField(source='country.name', read_only=True)
    country_code = serializers.CharField(source='country.code_iso3', read_only=True)
    sector_name = serializers.CharField(source='sector.name', read_only=True)
    sector_code = serializers.CharField(source='sector.code', read_only=True)
    capital_type_name = serializers.CharField(source='capital_type.name', read_only=True)
    
    class Meta:
        model = CountryTotalCapital
        fields = [
            'id', 'country', 'country_name', 'country_code',
            'sector', 'sector_name', 'sector_code',
            'capital_type', 'capital_type_name',
            'year', 'total_inflow', 'total_outflow', 'net_flow',
            'flow_rank_global', 'flow_percentile'
        ]


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class UserPreferenceSerializer(serializers.ModelSerializer):
    favorite_countries_detail = CountrySerializer(source='favorite_countries', many=True, read_only=True)
    favorite_sectors_detail = SectorSerializer(source='favorite_sectors', many=True, read_only=True)
    
    class Meta:
        model = UserPreference
        fields = [
            'favorite_countries', 'favorite_countries_detail',
            'favorite_sectors', 'favorite_sectors_detail',
            'default_year_range_start', 'default_year_range_end',
            'preferred_visualization'
        ]


# Specialized serializers for visualization data
class MapVisualizationDataSerializer(serializers.Serializer):
    """Serializer for map visualization data."""
    country_code = serializers.CharField()
    country_name = serializers.CharField()
    latitude = serializers.DecimalField(max_digits=10, decimal_places=6)
    longitude = serializers.DecimalField(max_digits=10, decimal_places=6)
    total_capital = serializers.DecimalField(max_digits=15, decimal_places=2)
    intensity = serializers.FloatField()  # Normalized 0-1 for color intensity
    rank = serializers.IntegerField()


class FlowVisualizationDataSerializer(serializers.Serializer):
    """Serializer for flow map visualization data."""
    source_country_code = serializers.CharField()
    target_country_code = serializers.CharField()
    source_lat = serializers.DecimalField(max_digits=10, decimal_places=6)
    source_lng = serializers.DecimalField(max_digits=10, decimal_places=6)
    target_lat = serializers.DecimalField(max_digits=10, decimal_places=6)
    target_lng = serializers.DecimalField(max_digits=10, decimal_places=6)
    flow_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    flow_intensity = serializers.FloatField()  # Normalized 0-1 for line thickness
