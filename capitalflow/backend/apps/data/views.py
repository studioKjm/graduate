from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from django.db.models import Sum, Avg, Count, Q, Min, Max
from django.core.cache import cache
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from typing import Dict, List, Any
import logging

from .models import (
    ProcessedCapitalData, RawCapitalData, Country, 
    Sector, CapitalType, DataSource, DataProcessingLog
)
from .serializers import (
    ProcessedCapitalDataSerializer, CapitalFlowAggregationSerializer,
    CapitalFlowRequestSerializer, CountrySerializer, SectorSerializer,
    CapitalTypeSerializer, DataSourceSerializer, DataProcessingLogSerializer
)
from .services.data_collectors import DataCollectionService
from .services.data_fusion import DataFusionService, DataValidationService

logger = logging.getLogger(__name__)


class CapitalFlowsAPIView(APIView):
    """
    통합 자본 흐름 API 엔드포인트
    /api/capitalflows/
    """
    permission_classes = [AllowAny]
    
    @method_decorator(cache_page(60 * 15))  # 15분 캐시
    def get(self, request):
        """자본 흐름 데이터 조회"""
        
        # 요청 파라미터 검증
        serializer = CapitalFlowRequestSerializer(data=request.query_params)
        if not serializer.is_valid():
            return Response(
                {'error': 'Invalid parameters', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        validated_data = serializer.validated_data
        
        try:
            # 캐시 키 생성
            cache_key = self._generate_cache_key(validated_data)
            cached_result = cache.get(cache_key)
            
            if cached_result:
                return Response(cached_result)
            
            # 데이터 조회
            if validated_data.get('aggregate', False):
                result = self._get_aggregated_data(validated_data)
            else:
                result = self._get_detailed_data(validated_data)
            
            # 캐시 저장 (5분)
            cache.set(cache_key, result, 300)
            
            return Response(result)
            
        except Exception as e:
            logger.error(f"자본 흐름 데이터 조회 실패: {e}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _generate_cache_key(self, params: Dict) -> str:
        """캐시 키 생성"""
        key_parts = ['capitalflows']
        
        for key in ['country', 'sector', 'capital_type', 'year', 'year__gte', 'year__lte']:
            if params.get(key):
                key_parts.append(f"{key}_{params[key]}")
        
        if params.get('capital_types'):
            key_parts.append(f"capital_types_{'_'.join(params['capital_types'])}")
        
        if params.get('aggregate'):
            key_parts.append('aggregate')
        
        return ':'.join(key_parts)
    
    def _get_detailed_data(self, params: Dict) -> Dict:
        """상세 데이터 조회"""
        
        # 기본 쿼리셋
        queryset = ProcessedCapitalData.objects.select_related(
            'country', 'sector', 'capital_type'
        )
        
        # 필터 적용
        queryset = self._apply_filters(queryset, params)
        
        # 정렬
        ordering = params.get('ordering', '-year')
        queryset = queryset.order_by(ordering)
        
        # 제한
        limit = params.get('limit', 100)
        queryset = queryset[:limit]
        
        # 시리얼라이제이션
        serializer = ProcessedCapitalDataSerializer(queryset, many=True)
        
        result = {
            'count': queryset.count(),
            'results': serializer.data
        }
        
        # 메타데이터 포함
        if params.get('include_metadata', False):
            result['metadata'] = self._get_metadata(queryset)
        
        return result
    
    def _get_aggregated_data(self, params: Dict) -> Dict:
        """집계된 데이터 조회"""
        
        # 집계 기준 결정
        group_by_fields = []
        select_fields = {}
        
        if not params.get('country'):
            group_by_fields.extend(['country__code', 'country__name'])
            select_fields.update({
                'country_code': 'country__code',
                'country_name': 'country__name'
            })
        
        if not params.get('sector'):
            group_by_fields.extend(['sector__code', 'sector__name'])
            select_fields.update({
                'sector_code': 'sector__code',
                'sector_name': 'sector__name'
            })
        
        # 자본 타입별 집계
        capital_types_filter = params.get('capital_types', [])
        if params.get('capital_type'):
            capital_types_filter = [params['capital_type']]
        
        # 기본 쿼리셋
        queryset = ProcessedCapitalData.objects.select_related(
            'country', 'sector', 'capital_type'
        )
        
        # 필터 적용
        queryset = self._apply_filters(queryset, params)
        
        # 집계 수행
        if capital_types_filter:
            # 특정 자본 타입들만 집계
            aggregated_data = self._aggregate_by_capital_types(
                queryset, group_by_fields, select_fields, capital_types_filter
            )
        else:
            # 모든 자본 타입 집계
            aggregated_data = self._aggregate_all_capital_types(
                queryset, group_by_fields, select_fields
            )
        
        return {
            'aggregation_params': {
                'group_by': group_by_fields,
                'capital_types': capital_types_filter or 'all',
                'filters': {k: v for k, v in params.items() if v is not None}
            },
            'count': len(aggregated_data),
            'results': aggregated_data
        }
    
    def _apply_filters(self, queryset, params: Dict):
        """쿼리셋에 필터 적용"""
        
        # 국가 필터
        if params.get('country'):
            queryset = queryset.filter(country__code=params['country'])
        
        # 분야 필터
        if params.get('sector'):
            queryset = queryset.filter(sector__code=params['sector'])
        
        # 자본 타입 필터
        if params.get('capital_type'):
            queryset = queryset.filter(capital_type__code=params['capital_type'])
        elif params.get('capital_types'):
            queryset = queryset.filter(capital_type__code__in=params['capital_types'])
        
        # 연도 필터
        if params.get('year'):
            queryset = queryset.filter(year=params['year'])
        else:
            if params.get('year__gte'):
                queryset = queryset.filter(year__gte=params['year__gte'])
            if params.get('year__lte'):
                queryset = queryset.filter(year__lte=params['year__lte'])
        
        return queryset
    
    def _aggregate_by_capital_types(
        self, 
        queryset, 
        group_by_fields: List[str], 
        select_fields: Dict[str, str],
        capital_types: List[str]
    ) -> List[Dict]:
        """특정 자본 타입들에 대한 집계"""
        
        results = []
        
        # 그룹별로 집계
        base_queryset = queryset.filter(capital_type__code__in=capital_types)
        
        if group_by_fields:
            groups = base_queryset.values(*group_by_fields).distinct()
            
            for group in groups:
                group_filter = Q()
                group_data = {}
                
                for field in group_by_fields:
                    value = group[field]
                    group_filter &= Q(**{field: value})
                    
                    # select_fields에서 해당하는 키 찾기
                    for key, db_field in select_fields.items():
                        if db_field == field:
                            group_data[key] = value
                
                # 해당 그룹의 자본 타입별 합계
                group_queryset = base_queryset.filter(group_filter)
                
                capital_type_totals = {}
                total_amount = 0
                confidence_scores = []
                
                for capital_type in capital_types:
                    ct_data = group_queryset.filter(
                        capital_type__code=capital_type
                    ).aggregate(
                        total=Sum('final_amount_usd'),
                        avg_confidence=Avg('confidence_score'),
                        count=Count('id')
                    )
                    
                    amount = float(ct_data['total'] or 0)
                    capital_type_totals[capital_type] = amount
                    total_amount += amount
                    
                    if ct_data['avg_confidence']:
                        confidence_scores.append(ct_data['avg_confidence'])
                
                group_data.update({
                    'capital_types': capital_type_totals,
                    'total_amount': total_amount,
                    'average_confidence': sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0,
                    'data_coverage': len(confidence_scores) / len(capital_types) if capital_types else 0
                })
                
                results.append(group_data)
        
        else:
            # 그룹핑 없이 전체 집계
            capital_type_totals = {}
            total_amount = 0
            confidence_scores = []
            
            for capital_type in capital_types:
                ct_data = base_queryset.filter(
                    capital_type__code=capital_type
                ).aggregate(
                    total=Sum('final_amount_usd'),
                    avg_confidence=Avg('confidence_score')
                )
                
                amount = float(ct_data['total'] or 0)
                capital_type_totals[capital_type] = amount
                total_amount += amount
                
                if ct_data['avg_confidence']:
                    confidence_scores.append(ct_data['avg_confidence'])
            
            results.append({
                'capital_types': capital_type_totals,
                'total_amount': total_amount,
                'average_confidence': sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0,
                'data_coverage': len(confidence_scores) / len(capital_types) if capital_types else 0
            })
        
        return results
    
    def _aggregate_all_capital_types(
        self, 
        queryset, 
        group_by_fields: List[str], 
        select_fields: Dict[str, str]
    ) -> List[Dict]:
        """모든 자본 타입에 대한 집계"""
        
        # 사용 가능한 모든 자본 타입 조회
        available_capital_types = list(
            queryset.values_list('capital_type__code', flat=True).distinct()
        )
        
        return self._aggregate_by_capital_types(
            queryset, group_by_fields, select_fields, available_capital_types
        )
    
    def _get_metadata(self, queryset) -> Dict:
        """메타데이터 생성"""
        
        stats = queryset.aggregate(
            total_records=Count('id'),
            avg_confidence=Avg('confidence_score'),
            min_year=Min('year'),
            max_year=Max('year'),
            predicted_count=Count('id', filter=Q(is_predicted=True))
        )
        
        return {
            'statistics': stats,
            'data_sources': list(
                RawCapitalData.objects.filter(
                    id__in=queryset.values_list('raw_data_refs__id', flat=True)
                ).values_list('source__name', flat=True).distinct()
            ),
            'coverage': {
                'countries': queryset.values_list('country__code', flat=True).distinct().count(),
                'sectors': queryset.values_list('sector__code', flat=True).distinct().count(),
                'capital_types': queryset.values_list('capital_type__code', flat=True).distinct().count(),
            }
        }


class MetadataAPIView(APIView):
    """메타데이터 API"""
    permission_classes = [AllowAny]
    
    @method_decorator(cache_page(60 * 60))  # 1시간 캐시
    def get(self, request):
        """메타데이터 조회"""
        
        try:
            return Response({
                'countries': CountrySerializer(
                    Country.objects.filter(is_active=True), many=True
                ).data,
                'sectors': SectorSerializer(
                    Sector.objects.filter(is_active=True), many=True
                ).data,
                'capital_types': CapitalTypeSerializer(
                    CapitalType.objects.filter(is_active=True), many=True
                ).data,
                'data_sources': DataSourceSerializer(
                    DataSource.objects.filter(is_active=True), many=True
                ).data,
            })
            
        except Exception as e:
            logger.error(f"메타데이터 조회 실패: {e}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DataCollectionAPIView(APIView):
    """데이터 수집 API (관리자용)"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        """데이터 수집 실행"""
        
        source_name = request.data.get('source')
        year = request.data.get('year')
        sector = request.data.get('sector')
        
        try:
            collection_service = DataCollectionService()
            
            if source_name:
                # 특정 소스에서 수집
                result = collection_service.collect_source(
                    source_name, year=year, sector=sector
                )
                return Response({
                    'message': f'{source_name}에서 {result}개 레코드 수집 완료',
                    'collected_records': result
                })
            else:
                # 모든 소스에서 수집
                results = collection_service.collect_all_sources(year=year, sector=sector)
                return Response({
                    'message': '모든 소스에서 데이터 수집 완료',
                    'results': results,
                    'total_records': sum(results.values())
                })
                
        except Exception as e:
            logger.error(f"데이터 수집 실패: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DataFusionAPIView(APIView):
    """데이터 융합 API (관리자용)"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        """데이터 융합 실행"""
        
        year_start = request.data.get('year_start', 2020)
        year_end = request.data.get('year_end', 2024)
        country_codes = request.data.get('country_codes')
        sector_codes = request.data.get('sector_codes')
        
        try:
            fusion_service = DataFusionService()
            
            results = fusion_service.batch_fusion(
                year_start=year_start,
                year_end=year_end,
                country_codes=country_codes,
                sector_codes=sector_codes
            )
            
            return Response({
                'message': '배치 융합 완료',
                'results': results
            })
            
        except Exception as e:
            logger.error(f"데이터 융합 실패: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DataValidationAPIView(APIView):
    """데이터 검증 API (관리자용)"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        """데이터 검증 실행"""
        
        year = request.data.get('year')
        
        try:
            validation_service = DataValidationService()
            results = validation_service.batch_validation(year=year)
            
            return Response({
                'message': '배치 검증 완료',
                'results': results
            })
            
        except Exception as e:
            logger.error(f"데이터 검증 실패: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ProcessingLogsAPIView(APIView):
    """데이터 처리 로그 API"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        """처리 로그 조회"""
        
        processing_type = request.query_params.get('type')
        status_filter = request.query_params.get('status')
        limit = int(request.query_params.get('limit', 50))
        
        try:
            queryset = DataProcessingLog.objects.select_related(
                'source', 'country', 'sector'
            ).order_by('-start_time')
            
            if processing_type:
                queryset = queryset.filter(processing_type=processing_type)
            
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            
            queryset = queryset[:limit]
            
            serializer = DataProcessingLogSerializer(queryset, many=True)
            
            return Response({
                'count': queryset.count(),
                'results': serializer.data
            })
            
        except Exception as e:
            logger.error(f"처리 로그 조회 실패: {e}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# 간단한 함수 기반 뷰들

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """시스템 상태 확인"""
    
    try:
        # 기본 통계
        stats = {
            'processed_data_count': ProcessedCapitalData.objects.count(),
            'raw_data_count': RawCapitalData.objects.count(),
            'active_sources': DataSource.objects.filter(is_active=True).count(),
            'latest_processing': DataProcessingLog.objects.order_by('-start_time').first()
        }
        
        if stats['latest_processing']:
            stats['latest_processing'] = {
                'type': stats['latest_processing'].processing_type,
                'status': stats['latest_processing'].status,
                'time': stats['latest_processing'].start_time
            }
        
        return Response({
            'status': 'healthy',
            'statistics': stats
        })
        
    except Exception as e:
        return Response({
            'status': 'unhealthy',
            'error': str(e)
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
