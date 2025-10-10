from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class DataSource(models.Model):
    """데이터 소스 정보"""
    
    SOURCE_TYPES = [
        ('OFFICIAL', '공식 기관'),
        ('PRIVATE_DB', '민간 데이터베이스'),
        ('CRAWLER', '크롤링'),
        ('API', '외부 API'),
    ]
    
    RELIABILITY_CHOICES = [
        ('HIGH', '높음 (0.8-1.0)'),
        ('MEDIUM', '중간 (0.5-0.8)'),
        ('LOW', '낮음 (0.0-0.5)'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True, verbose_name='소스명')
    description = models.TextField(blank=True, verbose_name='설명')
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPES, verbose_name='소스 타입')
    reliability_level = models.CharField(max_length=10, choices=RELIABILITY_CHOICES, verbose_name='신뢰도 수준')
    reliability_weight = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        verbose_name='신뢰도 가중치'
    )
    api_endpoint = models.URLField(blank=True, null=True, verbose_name='API 엔드포인트')
    update_frequency = models.CharField(max_length=50, blank=True, verbose_name='업데이트 주기')
    is_active = models.BooleanField(default=True, verbose_name='활성 여부')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'data_sources'
        verbose_name = '데이터 소스'
        verbose_name_plural = '데이터 소스'
    
    def __str__(self):
        return f"{self.name} ({self.get_reliability_level_display()})"


class Country(models.Model):
    """국가 정보"""
    
    code = models.CharField(max_length=3, primary_key=True, verbose_name='국가 코드(ISO-3166)')
    name = models.CharField(max_length=100, verbose_name='국가명')
    name_en = models.CharField(max_length=100, verbose_name='영문명')
    region = models.CharField(max_length=50, blank=True, verbose_name='지역')
    continent = models.CharField(max_length=30, blank=True, verbose_name='대륙')
    latitude = models.FloatField(null=True, blank=True, verbose_name='위도')
    longitude = models.FloatField(null=True, blank=True, verbose_name='경도')
    is_active = models.BooleanField(default=True, verbose_name='활성 여부')
    
    class Meta:
        db_table = 'countries'
        verbose_name = '국가'
        verbose_name_plural = '국가'
    
    def __str__(self):
        return f"{self.name} ({self.code})"


class Sector(models.Model):
    """분야/산업 정보"""
    
    code = models.CharField(max_length=20, primary_key=True, verbose_name='분야 코드')
    name = models.CharField(max_length=100, verbose_name='분야명')
    name_en = models.CharField(max_length=100, verbose_name='영문명')
    description = models.TextField(blank=True, verbose_name='설명')
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, verbose_name='상위 분야')
    is_active = models.BooleanField(default=True, verbose_name='활성 여부')
    
    class Meta:
        db_table = 'sectors'
        verbose_name = '분야'
        verbose_name_plural = '분야'
    
    def __str__(self):
        return f"{self.name} ({self.code})"


class CapitalType(models.Model):
    """자본 타입"""
    
    code = models.CharField(max_length=20, primary_key=True, verbose_name='자본 타입 코드')
    name = models.CharField(max_length=100, verbose_name='자본 타입명')
    name_en = models.CharField(max_length=100, verbose_name='영문명')
    description = models.TextField(blank=True, verbose_name='설명')
    is_active = models.BooleanField(default=True, verbose_name='활성 여부')
    
    class Meta:
        db_table = 'capital_types'
        verbose_name = '자본 타입'
        verbose_name_plural = '자본 타입'
    
    def __str__(self):
        return f"{self.name} ({self.code})"


class RawCapitalData(models.Model):
    """원시 자본 데이터 (각 소스별 원본 데이터)"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source = models.ForeignKey(DataSource, on_delete=models.CASCADE, verbose_name='데이터 소스')
    country = models.ForeignKey(Country, on_delete=models.CASCADE, verbose_name='국가')
    sector = models.ForeignKey(Sector, on_delete=models.CASCADE, verbose_name='분야')
    capital_type = models.ForeignKey(CapitalType, on_delete=models.CASCADE, verbose_name='자본 타입')
    year = models.PositiveIntegerField(verbose_name='연도')
    
    # 원본 데이터
    raw_amount = models.DecimalField(max_digits=20, decimal_places=2, verbose_name='원본 금액')
    raw_currency = models.CharField(max_length=3, default='USD', verbose_name='원본 통화')
    
    # USD 변환된 금액
    amount_usd = models.DecimalField(max_digits=20, decimal_places=2, verbose_name='USD 환산 금액')
    exchange_rate = models.DecimalField(max_digits=10, decimal_places=6, null=True, blank=True, verbose_name='환율')
    
    # 메타데이터
    collection_date = models.DateTimeField(auto_now_add=True, verbose_name='수집일시')
    data_quality_score = models.FloatField(
        null=True, blank=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        verbose_name='데이터 품질 점수'
    )
    is_outlier = models.BooleanField(default=False, verbose_name='이상치 여부')
    is_verified = models.BooleanField(default=False, verbose_name='검증 완료')
    
    # 추정 데이터 관련 필드
    is_estimated = models.BooleanField(default=False, verbose_name='추정 데이터 여부')
    confidence_score = models.FloatField(
        null=True, blank=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        verbose_name='신뢰도 점수'
    )
    estimation_method = models.CharField(
        max_length=100, 
        null=True, blank=True, 
        verbose_name='추정 방법'
    )
    
    class Meta:
        db_table = 'raw_capital_data'
        verbose_name = '원시 자본 데이터'
        verbose_name_plural = '원시 자본 데이터'
        unique_together = ['source', 'country', 'sector', 'capital_type', 'year']
        indexes = [
            models.Index(fields=['country', 'sector', 'year']),
            models.Index(fields=['capital_type', 'year']),
            models.Index(fields=['collection_date']),
        ]
    
    def __str__(self):
        return f"{self.country.code}-{self.sector.code}-{self.capital_type.code}-{self.year}: ${self.amount_usd:,.2f}"


class ProcessedCapitalData(models.Model):
    """정제된 자본 데이터 (다중 소스 융합 후)"""
    
    FUSION_METHODS = [
        ('WEIGHTED_AVG', '가중평균'),
        ('ML_ENSEMBLE', 'ML 앙상블'),
        ('MEDIAN', '중간값'),
        ('SINGLE_SOURCE', '단일 소스'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    country = models.ForeignKey(Country, on_delete=models.CASCADE, verbose_name='국가')
    sector = models.ForeignKey(Sector, on_delete=models.CASCADE, verbose_name='분야')
    capital_type = models.ForeignKey(CapitalType, on_delete=models.CASCADE, verbose_name='자본 타입')
    year = models.PositiveIntegerField(verbose_name='연도')
    
    # 최종 융합된 값
    final_amount_usd = models.DecimalField(max_digits=20, decimal_places=2, verbose_name='최종 USD 금액')
    fusion_method = models.CharField(max_length=20, choices=FUSION_METHODS, verbose_name='융합 방법')
    
    # 신뢰도 및 품질 지표
    confidence_score = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        verbose_name='신뢰도 점수'
    )
    source_count = models.PositiveIntegerField(verbose_name='참여 소스 수')
    variance = models.FloatField(null=True, blank=True, verbose_name='소스 간 분산')
    
    # 예측/보정 여부
    is_predicted = models.BooleanField(default=False, verbose_name='예측값 여부')
    prediction_model = models.CharField(max_length=50, blank=True, verbose_name='예측 모델명')
    
    # 생성 메타데이터
    processing_date = models.DateTimeField(auto_now_add=True, verbose_name='처리일시')
    raw_data_refs = models.ManyToManyField(RawCapitalData, blank=True, verbose_name='참조 원시 데이터')
    
    class Meta:
        db_table = 'processed_capital_data'
        verbose_name = '정제된 자본 데이터'
        verbose_name_plural = '정제된 자본 데이터'
        unique_together = ['country', 'sector', 'capital_type', 'year']
        indexes = [
            models.Index(fields=['country', 'sector', 'year']),
            models.Index(fields=['capital_type', 'year']),
            models.Index(fields=['confidence_score']),
            models.Index(fields=['processing_date']),
        ]
    
    def __str__(self):
        return f"{self.country.code}-{self.sector.code}-{self.capital_type.code}-{self.year}: ${self.final_amount_usd:,.2f} ({self.confidence_score:.2f})"


class DataProcessingLog(models.Model):
    """데이터 처리 로그"""
    
    PROCESSING_TYPES = [
        ('COLLECTION', '데이터 수집'),
        ('CLEANING', '데이터 정제'),
        ('FUSION', '데이터 융합'),
        ('VALIDATION', '데이터 검증'),
        ('PREDICTION', '값 예측'),
    ]
    
    STATUS_CHOICES = [
        ('SUCCESS', '성공'),
        ('FAILED', '실패'),
        ('PARTIAL', '부분 성공'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    processing_type = models.CharField(max_length=20, choices=PROCESSING_TYPES, verbose_name='처리 타입')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, verbose_name='상태')
    
    # 처리 범위
    source = models.ForeignKey(DataSource, null=True, blank=True, on_delete=models.CASCADE)
    country = models.ForeignKey(Country, null=True, blank=True, on_delete=models.CASCADE)
    sector = models.ForeignKey(Sector, null=True, blank=True, on_delete=models.CASCADE)
    year_start = models.PositiveIntegerField(null=True, blank=True)
    year_end = models.PositiveIntegerField(null=True, blank=True)
    
    # 결과 정보
    records_processed = models.PositiveIntegerField(default=0, verbose_name='처리된 레코드 수')
    records_success = models.PositiveIntegerField(default=0, verbose_name='성공 레코드 수')
    records_failed = models.PositiveIntegerField(default=0, verbose_name='실패 레코드 수')
    
    # 실행 정보
    start_time = models.DateTimeField(verbose_name='시작시간')
    end_time = models.DateTimeField(null=True, blank=True, verbose_name='종료시간')
    duration_seconds = models.PositiveIntegerField(null=True, blank=True, verbose_name='소요시간(초)')
    
    # 오류 정보
    error_message = models.TextField(blank=True, verbose_name='오류 메시지')
    
    class Meta:
        db_table = 'data_processing_logs'
        verbose_name = '데이터 처리 로그'
        verbose_name_plural = '데이터 처리 로그'
        indexes = [
            models.Index(fields=['processing_type', 'status']),
            models.Index(fields=['start_time']),
        ]
    
    def __str__(self):
        return f"{self.get_processing_type_display()} - {self.get_status_display()} ({self.start_time})"
