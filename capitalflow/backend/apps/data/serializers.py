from rest_framework import serializers
from .models import (
    Country, Sector, CapitalType, DataSource,
    RawCapitalData, ProcessedCapitalData, DataProcessingLog
)


class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = ['code', 'name', 'name_en', 'region', 'continent']


class SectorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sector
        fields = ['code', 'name', 'name_en', 'description']


class CapitalTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CapitalType
        fields = ['code', 'name', 'name_en', 'description']


class DataSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataSource
        fields = [
            'id', 'name', 'description', 'source_type', 
            'reliability_level', 'reliability_weight', 'is_active'
        ]


class RawCapitalDataSerializer(serializers.ModelSerializer):
    source = DataSourceSerializer(read_only=True)
    country = CountrySerializer(read_only=True)
    sector = SectorSerializer(read_only=True)
    capital_type = CapitalTypeSerializer(read_only=True)
    
    class Meta:
        model = RawCapitalData
        fields = [
            'id', 'source', 'country', 'sector', 'capital_type', 'year',
            'raw_amount', 'raw_currency', 'amount_usd', 'exchange_rate',
            'collection_date', 'data_quality_score', 'is_outlier', 'is_verified'
        ]


class ProcessedCapitalDataSerializer(serializers.ModelSerializer):
    country = CountrySerializer(read_only=True)
    sector = SectorSerializer(read_only=True)
    capital_type = CapitalTypeSerializer(read_only=True)
    raw_data_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ProcessedCapitalData
        fields = [
            'id', 'country', 'sector', 'capital_type', 'year',
            'final_amount_usd', 'fusion_method', 'confidence_score',
            'source_count', 'variance', 'is_predicted', 'prediction_model',
            'processing_date', 'raw_data_count'
        ]
    
    def get_raw_data_count(self, obj):
        try:
            return obj.raw_data_refs.count()
        except:
            # ManyToMany 관계가 설정되지 않은 경우 대체 방법
            return RawCapitalData.objects.filter(
                country=obj.country,
                sector=obj.sector,
                capital_type=obj.capital_type,
                year=obj.year
            ).count()


class CapitalFlowSummarySerializer(serializers.Serializer):
    """자본 흐름 요약 정보 시리얼라이저"""
    
    country = CountrySerializer()
    sector = SectorSerializer()
    capital_type = CapitalTypeSerializer()
    year = serializers.IntegerField()
    total_amount = serializers.DecimalField(max_digits=20, decimal_places=2)
    confidence_score = serializers.FloatField()
    source_count = serializers.IntegerField()
    is_predicted = serializers.BooleanField()


class CapitalFlowAggregationSerializer(serializers.Serializer):
    """집계된 자본 흐름 시리얼라이저"""
    
    country_code = serializers.CharField(max_length=3)
    country_name = serializers.CharField(max_length=100)
    sector_code = serializers.CharField(max_length=20)
    sector_name = serializers.CharField(max_length=100)
    
    # 자본 타입별 금액
    capital_types = serializers.DictField()
    
    # 총계
    total_amount = serializers.DecimalField(max_digits=20, decimal_places=2)
    average_confidence = serializers.FloatField()
    data_coverage = serializers.FloatField()  # 데이터 커버리지 비율


class DataProcessingLogSerializer(serializers.ModelSerializer):
    source_name = serializers.CharField(source='source.name', read_only=True)
    country_name = serializers.CharField(source='country.name', read_only=True)
    sector_name = serializers.CharField(source='sector.name', read_only=True)
    
    class Meta:
        model = DataProcessingLog
        fields = [
            'id', 'processing_type', 'status', 'source_name', 'country_name', 
            'sector_name', 'year_start', 'year_end', 'records_processed',
            'records_success', 'records_failed', 'start_time', 'end_time',
            'duration_seconds', 'error_message'
        ]


class CapitalFlowRequestSerializer(serializers.Serializer):
    """API 요청 파라미터 검증용 시리얼라이저"""
    
    country = serializers.CharField(required=False, help_text="국가 코드 (ISO-3166)")
    sector = serializers.CharField(required=False, help_text="분야 코드")
    capital_type = serializers.CharField(required=False, help_text="자본 타입 코드")
    capital_types = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text="다중 자본 타입 코드 (콤마 구분)"
    )
    year = serializers.IntegerField(required=False, help_text="특정 연도")
    year__gte = serializers.IntegerField(required=False, help_text="시작 연도 (이상)")
    year__lte = serializers.IntegerField(required=False, help_text="종료 연도 (이하)")
    
    # 응답 형식 옵션
    aggregate = serializers.BooleanField(default=False, help_text="집계 형태로 응답")
    include_raw = serializers.BooleanField(default=False, help_text="원시 데이터 포함")
    include_metadata = serializers.BooleanField(default=False, help_text="메타데이터 포함")
    
    # 정렬 및 페이징
    ordering = serializers.CharField(
        default='-year',
        help_text="정렬 기준 (year, final_amount_usd, confidence_score 등)"
    )
    limit = serializers.IntegerField(default=100, max_value=1000, help_text="결과 제한")
    
    def validate(self, data):
        """교차 검증"""
        
        # year와 year__gte/year__lte는 동시 사용 불가
        if data.get('year') and (data.get('year__gte') or data.get('year__lte')):
            raise serializers.ValidationError(
                "year와 year__gte/year__lte는 동시에 사용할 수 없습니다."
            )
        
        # capital_type과 capital_types는 동시 사용 불가
        if data.get('capital_type') and data.get('capital_types'):
            raise serializers.ValidationError(
                "capital_type과 capital_types는 동시에 사용할 수 없습니다."
            )
        
        # 연도 범위 검증
        year_gte = data.get('year__gte')
        year_lte = data.get('year__lte')
        
        if year_gte and year_lte and year_gte > year_lte:
            raise serializers.ValidationError(
                "시작 연도는 종료 연도보다 작거나 같아야 합니다."
            )
        
        return data
