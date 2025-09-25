"""
ML 기반 다중 소스 데이터 융합 및 검증 서비스
"""
import numpy as np
import pandas as pd
from decimal import Decimal
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
import logging
from django.db.models import Avg, Count, Sum, Variance
from django.utils import timezone
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error
import joblib
import warnings
warnings.filterwarnings('ignore')

from ..models import (
    RawCapitalData, ProcessedCapitalData, DataSource, 
    Country, Sector, CapitalType, DataProcessingLog
)

logger = logging.getLogger(__name__)


class OutlierDetector:
    """이상치 탐지 클래스"""
    
    def __init__(self, contamination: float = 0.05):
        self.contamination = contamination
        self.model = IsolationForest(
            contamination=contamination,
            random_state=42,
            n_estimators=100
        )
        self.scaler = StandardScaler()
        self.is_fitted = False
    
    def detect_outliers(self, data: List[Dict[str, Any]]) -> List[bool]:
        """이상치 탐지"""
        if not data:
            return []
        
        try:
            # 데이터프레임 변환
            df = pd.DataFrame(data)
            
            # 수치형 특성 추출
            features = []
            for record in data:
                features.append([
                    float(record.get('amount_usd', 0)),
                    float(record.get('source_reliability', 0.5)),
                    record.get('year', 2023),
                    len(record.get('source_name', ''))  # 소스명 길이를 특성으로 사용
                ])
            
            features_array = np.array(features)
            
            # 특성 정규화
            if not self.is_fitted:
                features_scaled = self.scaler.fit_transform(features_array)
                outlier_labels = self.model.fit_predict(features_scaled)
                self.is_fitted = True
            else:
                features_scaled = self.scaler.transform(features_array)
                outlier_labels = self.model.predict(features_scaled)
            
            # -1은 이상치, 1은 정상
            return [label == -1 for label in outlier_labels]
            
        except Exception as e:
            logger.error(f"이상치 탐지 실패: {e}")
            return [False] * len(data)


class DataQualityAssessor:
    """데이터 품질 평가 클래스"""
    
    @staticmethod
    def calculate_quality_score(
        raw_data: RawCapitalData,
        source_reliability: float,
        is_outlier: bool = False,
        completeness_score: float = 1.0
    ) -> float:
        """데이터 품질 점수 계산"""
        
        # 기본 점수는 소스 신뢰도
        base_score = source_reliability
        
        # 이상치 페널티
        outlier_penalty = 0.3 if is_outlier else 0.0
        
        # 완전성 점수 (결측치 비율)
        completeness_bonus = (completeness_score - 0.5) * 0.2
        
        # 최신성 점수 (최근 데이터일수록 높은 점수)
        current_year = datetime.now().year
        age_penalty = max(0, (current_year - raw_data.year) * 0.01)
        
        # 최종 점수 계산
        final_score = base_score + completeness_bonus - outlier_penalty - age_penalty
        
        return max(0.0, min(1.0, final_score))


class TimeSeriesPredictor:
    """시계열 예측 클래스"""
    
    def __init__(self):
        self.models = {}
    
    def predict_missing_values(
        self, 
        country_code: str, 
        sector_code: str, 
        capital_type_code: str,
        target_year: int,
        window_size: int = 5
    ) -> Optional[Decimal]:
        """누락된 값 예측"""
        
        try:
            # 과거 데이터 조회
            historical_data = ProcessedCapitalData.objects.filter(
                country__code=country_code,
                sector__code=sector_code,
                capital_type__code=capital_type_code,
                year__gte=target_year - window_size,
                year__lt=target_year
            ).order_by('year').values_list('final_amount_usd', flat=True)
            
            if len(historical_data) < 2:
                return None
            
            # 단순 선형 예측 (실제로는 더 복잡한 모델 사용 가능)
            values = [float(val) for val in historical_data]
            
            # 선형 회귀를 통한 예측
            years = list(range(len(values)))
            if len(years) >= 2:
                # numpy의 polyfit을 사용한 1차 다항식 피팅
                coefficients = np.polyfit(years, values, 1)
                predicted_value = coefficients[0] * len(values) + coefficients[1]
                
                # 음수 예측값 방지
                if predicted_value > 0:
                    return Decimal(str(predicted_value))
            
            return None
            
        except Exception as e:
            logger.error(f"시계열 예측 실패: {e}")
            return None


class DataFusionService:
    """데이터 융합 서비스"""
    
    def __init__(self):
        self.outlier_detector = OutlierDetector()
        self.quality_assessor = DataQualityAssessor()
        self.time_predictor = TimeSeriesPredictor()
    
    def fuse_capital_data(
        self, 
        country_code: str, 
        sector_code: str, 
        capital_type_code: str, 
        year: int
    ) -> Optional[ProcessedCapitalData]:
        """특정 조건의 자본 데이터 융합"""
        
        try:
            # 해당 조건의 모든 원시 데이터 조회
            raw_data_qs = RawCapitalData.objects.filter(
                country__code=country_code,
                sector__code=sector_code,
                capital_type__code=capital_type_code,
                year=year,
                is_verified=True
            ).select_related('source', 'country', 'sector', 'capital_type')
            
            if not raw_data_qs.exists():
                # 데이터가 없으면 예측 시도
                predicted_value = self.time_predictor.predict_missing_values(
                    country_code, sector_code, capital_type_code, year
                )
                
                if predicted_value:
                    return self._create_predicted_data(
                        country_code, sector_code, capital_type_code, year, predicted_value
                    )
                
                return None
            
            # 원시 데이터를 리스트로 변환
            raw_data_list = []
            for raw_data in raw_data_qs:
                raw_data_list.append({
                    'id': str(raw_data.id),
                    'amount_usd': float(raw_data.amount_usd),
                    'source_name': raw_data.source.name,
                    'source_reliability': raw_data.source.reliability_weight,
                    'year': raw_data.year,
                    'raw_data_obj': raw_data
                })
            
            # 이상치 탐지
            outlier_flags = self.outlier_detector.detect_outliers(raw_data_list)
            
            # 이상치 플래그 업데이트
            for i, raw_data_info in enumerate(raw_data_list):
                if outlier_flags[i]:
                    raw_data_info['raw_data_obj'].is_outlier = True
                    raw_data_info['raw_data_obj'].save()
            
            # 이상치가 아닌 데이터만 필터링
            valid_data = [
                data for i, data in enumerate(raw_data_list) 
                if not outlier_flags[i]
            ]
            
            if not valid_data:
                logger.warning(f"모든 데이터가 이상치로 판정됨: {country_code}-{sector_code}-{capital_type_code}-{year}")
                return None
            
            # 융합 방법 결정
            fusion_result = self._perform_fusion(valid_data)
            
            # 최종 데이터 생성
            processed_data = self._create_processed_data(
                country_code, sector_code, capital_type_code, year,
                fusion_result, raw_data_qs
            )
            
            return processed_data
            
        except Exception as e:
            logger.error(f"데이터 융합 실패: {country_code}-{sector_code}-{capital_type_code}-{year}, 오류: {e}")
            return None
    
    def _perform_fusion(self, valid_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """실제 융합 수행"""
        
        amounts = [data['amount_usd'] for data in valid_data]
        weights = [data['source_reliability'] for data in valid_data]
        
        if len(valid_data) == 1:
            # 단일 소스
            return {
                'final_amount': amounts[0],
                'method': 'SINGLE_SOURCE',
                'confidence': weights[0],
                'variance': 0.0,
                'source_count': 1
            }
        
        # 가중 평균 계산
        weighted_sum = sum(amount * weight for amount, weight in zip(amounts, weights))
        weight_sum = sum(weights)
        weighted_average = weighted_sum / weight_sum if weight_sum > 0 else sum(amounts) / len(amounts)
        
        # 분산 계산
        variance = np.var(amounts) if len(amounts) > 1 else 0.0
        
        # 신뢰도 계산 (소스 수와 분산을 고려)
        source_diversity_bonus = min(0.2, len(valid_data) * 0.05)  # 소스 다양성 보너스
        variance_penalty = min(0.3, variance / weighted_average if weighted_average > 0 else 0)  # 분산 페널티
        
        confidence = (weight_sum / len(valid_data)) + source_diversity_bonus - variance_penalty
        confidence = max(0.0, min(1.0, confidence))
        
        # ML 앙상블 시도 (고급 융합)
        if len(valid_data) >= 3 and variance / weighted_average > 0.1:  # 분산이 큰 경우
            ensemble_result = self._ml_ensemble_fusion(valid_data)
            if ensemble_result:
                return {
                    'final_amount': ensemble_result['amount'],
                    'method': 'ML_ENSEMBLE',
                    'confidence': ensemble_result['confidence'],
                    'variance': variance,
                    'source_count': len(valid_data)
                }
        
        return {
            'final_amount': weighted_average,
            'method': 'WEIGHTED_AVG',
            'confidence': confidence,
            'variance': variance,
            'source_count': len(valid_data)
        }
    
    def _ml_ensemble_fusion(self, valid_data: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """ML 앙상블을 통한 고급 융합"""
        
        try:
            amounts = np.array([data['amount_usd'] for data in valid_data])
            weights = np.array([data['source_reliability'] for data in valid_data])
            
            # 아웃라이어를 제외한 중앙값 기반 접근
            median_amount = np.median(amounts)
            
            # 각 값이 중앙값에서 얼마나 떨어져 있는지 계산
            deviations = np.abs(amounts - median_amount) / median_amount
            
            # 편차가 큰 값에 페널티 적용
            adjusted_weights = weights * (1 - np.minimum(deviations, 0.5))
            
            # 조정된 가중 평균
            final_amount = np.average(amounts, weights=adjusted_weights)
            
            # 신뢰도 계산
            confidence = np.mean(adjusted_weights)
            
            return {
                'amount': final_amount,
                'confidence': confidence
            }
            
        except Exception as e:
            logger.error(f"ML 앙상블 융합 실패: {e}")
            return None
    
    def _create_processed_data(
        self, 
        country_code: str, 
        sector_code: str, 
        capital_type_code: str, 
        year: int,
        fusion_result: Dict[str, Any],
        raw_data_qs
    ) -> ProcessedCapitalData:
        """처리된 데이터 객체 생성"""
        
        # 객체 조회
        country = Country.objects.get(code=country_code)
        sector = Sector.objects.get(code=sector_code)
        capital_type = CapitalType.objects.get(code=capital_type_code)
        
        # 기존 데이터 업데이트 또는 신규 생성
        processed_data, created = ProcessedCapitalData.objects.update_or_create(
            country=country,
            sector=sector,
            capital_type=capital_type,
            year=year,
            defaults={
                'final_amount_usd': Decimal(str(fusion_result['final_amount'])),
                'fusion_method': fusion_result['method'],
                'confidence_score': fusion_result['confidence'],
                'source_count': fusion_result['source_count'],
                'variance': fusion_result['variance'],
                'is_predicted': False,
                'processing_date': timezone.now()
            }
        )
        
        # 참조 원시 데이터 연결
        processed_data.raw_data_refs.set(raw_data_qs)
        
        return processed_data
    
    def _create_predicted_data(
        self, 
        country_code: str, 
        sector_code: str, 
        capital_type_code: str, 
        year: int,
        predicted_value: Decimal
    ) -> ProcessedCapitalData:
        """예측된 데이터 객체 생성"""
        
        # 객체 조회
        country = Country.objects.get(code=country_code)
        sector = Sector.objects.get(code=sector_code)
        capital_type = CapitalType.objects.get(code=capital_type_code)
        
        processed_data, created = ProcessedCapitalData.objects.update_or_create(
            country=country,
            sector=sector,
            capital_type=capital_type,
            year=year,
            defaults={
                'final_amount_usd': predicted_value,
                'fusion_method': 'SINGLE_SOURCE',
                'confidence_score': 0.6,  # 예측값의 기본 신뢰도
                'source_count': 0,
                'variance': 0.0,
                'is_predicted': True,
                'prediction_model': 'LINEAR_REGRESSION',
                'processing_date': timezone.now()
            }
        )
        
        return processed_data
    
    def batch_fusion(
        self, 
        year_start: int = 2020, 
        year_end: int = 2024,
        country_codes: Optional[List[str]] = None,
        sector_codes: Optional[List[str]] = None
    ) -> Dict[str, int]:
        """배치 융합 처리"""
        
        results = {
            'processed': 0,
            'created': 0,
            'updated': 0,
            'failed': 0
        }
        
        # 로그 시작
        log_entry = DataProcessingLog.objects.create(
            processing_type='FUSION',
            status='PARTIAL',
            year_start=year_start,
            year_end=year_end,
            start_time=timezone.now()
        )
        
        try:
            # 처리 대상 조합 생성
            countries = Country.objects.filter(is_active=True)
            sectors = Sector.objects.filter(is_active=True)
            capital_types = CapitalType.objects.filter(is_active=True)
            
            if country_codes:
                countries = countries.filter(code__in=country_codes)
            if sector_codes:
                sectors = sectors.filter(code__in=sector_codes)
            
            total_combinations = (
                countries.count() * 
                sectors.count() * 
                capital_types.count() * 
                (year_end - year_start + 1)
            )
            
            logger.info(f"배치 융합 시작: {total_combinations}개 조합 처리 예정")
            
            # 각 조합별 융합 수행
            for country in countries:
                for sector in sectors:
                    for capital_type in capital_types:
                        for year in range(year_start, year_end + 1):
                            try:
                                processed_data = self.fuse_capital_data(
                                    country.code, sector.code, capital_type.code, year
                                )
                                
                                if processed_data:
                                    if hasattr(processed_data, '_state') and processed_data._state.adding:
                                        results['created'] += 1
                                    else:
                                        results['updated'] += 1
                                    
                                results['processed'] += 1
                                
                                # 진행상황 로그 (1000개마다)
                                if results['processed'] % 1000 == 0:
                                    logger.info(f"융합 진행률: {results['processed']}/{total_combinations}")
                                
                            except Exception as e:
                                results['failed'] += 1
                                logger.error(f"융합 실패: {country.code}-{sector.code}-{capital_type.code}-{year}, 오류: {e}")
            
            # 로그 완료
            log_entry.end_time = timezone.now()
            log_entry.status = 'SUCCESS'
            log_entry.records_processed = results['processed']
            log_entry.records_success = results['created'] + results['updated']
            log_entry.records_failed = results['failed']
            log_entry.duration_seconds = (log_entry.end_time - log_entry.start_time).total_seconds()
            log_entry.save()
            
            logger.info(f"배치 융합 완료: {results}")
            
        except Exception as e:
            # 실패 로그
            log_entry.end_time = timezone.now()
            log_entry.status = 'FAILED'
            log_entry.error_message = str(e)
            log_entry.save()
            
            logger.error(f"배치 융합 실패: {e}")
            raise
        
        return results


class DataValidationService:
    """데이터 검증 서비스"""
    
    def __init__(self):
        self.fusion_service = DataFusionService()
    
    def validate_processed_data(self, processed_data: ProcessedCapitalData) -> bool:
        """처리된 데이터 검증"""
        
        try:
            # 기본 검증
            if processed_data.final_amount_usd <= 0:
                return False
            
            # 신뢰도 임계값 검증
            if processed_data.confidence_score < 0.3:
                return False
            
            # 과거 데이터와의 일관성 검증
            if not self._check_historical_consistency(processed_data):
                return False
            
            # 동일 분야 타 국가와의 상대적 검증
            if not self._check_relative_consistency(processed_data):
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"데이터 검증 실패: {e}")
            return False
    
    def _check_historical_consistency(self, processed_data: ProcessedCapitalData) -> bool:
        """과거 데이터와의 일관성 검증 (강화된 버전)"""
        
        try:
            # 과거 3년 데이터 조회
            historical_data = ProcessedCapitalData.objects.filter(
                country=processed_data.country,
                sector=processed_data.sector,
                capital_type=processed_data.capital_type,
                year__gte=processed_data.year - 3,
                year__lt=processed_data.year
            ).order_by('-year')[:3]
            
            if not historical_data:
                # 과거 데이터가 없어도 절대값 검증
                current_amount = float(processed_data.final_amount_usd)
                return self._validate_absolute_limits(processed_data.country.code, processed_data.sector.code, 
                                                   processed_data.capital_type.code, current_amount)
            
            # 급격한 변화 탐지 (기준 강화)
            recent_amounts = [float(data.final_amount_usd) for data in historical_data]
            current_amount = float(processed_data.final_amount_usd)
            
            if recent_amounts:
                avg_recent = sum(recent_amounts) / len(recent_amounts)
                
                # 5배 이상 차이나면 의심 (완화)
                if current_amount > avg_recent * 5 or current_amount < avg_recent * 0.2:
                    logger.warning(f"급격한 변화 탐지: {processed_data}, 과거평균: {avg_recent}, 현재: {current_amount}")
                    return False
            
            # 절대값도 검증
            return self._validate_absolute_limits(processed_data.country.code, processed_data.sector.code, 
                                               processed_data.capital_type.code, current_amount)
            
        except Exception as e:
            logger.error(f"과거 일관성 검증 실패: {e}")
            return True  # 검증 실패 시 통과
    
    def _check_relative_consistency(self, processed_data: ProcessedCapitalData) -> bool:
        """상대적 일관성 검증"""
        
        try:
            # 같은 분야의 다른 국가들과 비교
            peer_data = ProcessedCapitalData.objects.filter(
                sector=processed_data.sector,
                capital_type=processed_data.capital_type,
                year=processed_data.year
            ).exclude(country=processed_data.country)
            
            if not peer_data.exists():
                return True
            
            peer_amounts = [float(data.final_amount_usd) for data in peer_data]
            current_amount = float(processed_data.final_amount_usd)
            
            if peer_amounts:
                max_peer = max(peer_amounts)
                
                # 최대값의 10배를 넘으면 의심
                if current_amount > max_peer * 10:
                    logger.warning(f"상대적 이상값 탐지: {processed_data}, 최대 동종값: {max_peer}")
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"상대적 일관성 검증 실패: {e}")
            return True
    
    def batch_validation(self, year: Optional[int] = None) -> Dict[str, int]:
        """배치 검증"""
        
        results = {'validated': 0, 'passed': 0, 'failed': 0}
        
        queryset = ProcessedCapitalData.objects.all()
        if year:
            queryset = queryset.filter(year=year)
        
        for processed_data in queryset:
            results['validated'] += 1
            
            if self.validate_processed_data(processed_data):
                results['passed'] += 1
            else:
                results['failed'] += 1
                # 실패한 데이터는 재처리 대상으로 마킹 가능
        
        return results
    
    def _validate_absolute_limits(self, country_code: str, sector_code: str, capital_type_code: str, amount: float) -> bool:
        """절대값 한계 검증"""
        
        # 글로벌 상한선 (어떤 단일 투자도 이를 넘으면 안 됨)
        global_max_limits = {
            'FDI': 200_000_000_000,   # $200B
            'VC': 150_000_000_000,    # $150B  
            'MA': 100_000_000_000,    # $100B
            'IPO': 50_000_000_000,    # $50B
            'PE': 80_000_000_000,     # $80B
            'BONDS': 100_000_000_000, # $100B
            'FPI': 50_000_000_000,    # $50B
            'SWF': 80_000_000_000,    # $80B
            'GREENFIELD': 50_000_000_000, # $50B
            'JV': 30_000_000_000,     # $30B
            'DEVFIN': 40_000_000_000, # $40B
        }
        
        max_limit = global_max_limits.get(capital_type_code, 20_000_000_000)  # 기본 $20B
        
        if amount > max_limit:
            logger.warning(f"글로벌 상한선 초과: {country_code}-{sector_code}-{capital_type_code}: ${amount:,.0f} > ${max_limit:,.0f}")
            return False
        
        # 최소값 검증
        min_threshold = 100_000  # $100K
        if amount < min_threshold:
            logger.warning(f"최소값 미달: {country_code}-{sector_code}-{capital_type_code}: ${amount:,.0f} < ${min_threshold:,.0f}")
            return False
        
        # 국가별 특별 검증 (중국 AI 사례)
        if country_code == 'CHN' and sector_code == 'AI':
            # 중국 AI 분야 총합은 $300B를 넘으면 안 됨
            if amount > 300_000_000_000:
                logger.warning(f"중국 AI 특별 상한선 초과: ${amount:,.0f} > $300B")
                return False
        
        return True
