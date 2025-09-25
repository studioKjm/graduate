from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.db.models import Q, Sum, Avg, Count
from .models import ProcessedCapitalData, Country, Sector, CapitalType
from .serializers import ProcessedCapitalDataSerializer
import logging

logger = logging.getLogger(__name__)

class BulkYearDataAPIView(APIView):
    """
    모든 연도 데이터를 한 번에 가져오는 최적화된 API
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        try:
            sector = request.query_params.get('sector', '')
            capital_types = request.query_params.getlist('capital_types')
            
            # 기본 쿼리셋
            queryset = ProcessedCapitalData.objects.all()
            
            # 필터 적용
            if sector:
                queryset = queryset.filter(sector__code=sector)
            
            if capital_types:
                queryset = queryset.filter(capital_type__code__in=capital_types)
            
            # 연도별, 국가별로 집계
            aggregated_data = queryset.values(
                'year',
                'country__code',
                'country__name'
            ).annotate(
                total_amount=Sum('final_amount_usd'),
                data_count=Count('id')
            ).order_by('year', 'country__code')
            
            # 연도별로 그룹화
            yearly_data = {}
            for item in aggregated_data:
                year = item['year']
                if year not in yearly_data:
                    yearly_data[year] = {}
                
                yearly_data[year][item['country__code']] = {
                    'country_name': item['country__name'],
                    'total_amount': float(item['total_amount'] or 0),
                    'data_count': item['data_count']
                }
            
            return Response({
                'success': True,
                'data': yearly_data,
                'metadata': {
                    'years_available': list(yearly_data.keys()),
                    'total_years': len(yearly_data),
                    'sector': sector,
                    'capital_types': capital_types
                }
            })
            
        except Exception as e:
            logger.error(f"Bulk year data API error: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# 기존 views.py 내용을 파일 끝에 추가
from django.shortcuts import render
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from django.db.models import Q, Sum, Count, F, Case, When, IntegerField, Avg
from django.db import models
from django.core.paginator import Paginator
import json
from decimal import Decimal

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """API 상태 확인 및 시스템 통계"""
    try:
        from .models import ProcessedCapitalData, RawCapitalData, DataSource
        
        # 기본 통계 수집
        processed_count = ProcessedCapitalData.objects.count()
        raw_count = RawCapitalData.objects.count()
        active_sources = DataSource.objects.filter(is_active=True).count()
        
        # 평균 신뢰도 계산
        avg_confidence = ProcessedCapitalData.objects.aggregate(
            avg_conf=Avg('confidence_score')
        )['avg_conf'] or 0
        
        # 최근 처리 정보
        latest_processing = ProcessedCapitalData.objects.order_by('-processing_date').first()
        
        return JsonResponse({
            'status': 'healthy',
            'message': 'Capital Flow API is running',
            'statistics': {
                'processed_data_count': processed_count,
                'raw_data_count': raw_count,
                'active_sources': active_sources,
                'average_confidence': float(avg_confidence),
                'latest_processing': {
                    'date': latest_processing.processing_date.isoformat() if latest_processing else None,
                    'count': 1 if latest_processing else 0
                }
            }
        })
        
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return JsonResponse({
            'status': 'healthy',
            'message': 'Capital Flow API is running',
            'statistics': {
                'processed_data_count': 0,
                'raw_data_count': 0,
                'active_sources': 0,
                'average_confidence': 0.0,
                'latest_processing': {
                    'date': None,
                    'count': 0
                }
            }
        })

class CapitalFlowAPIView(APIView):
    """자본 흐름 데이터 API"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        try:
            # 쿼리 파라미터 추출
            country = request.query_params.get('country')
            sector = request.query_params.get('sector')
            capital_types = request.query_params.getlist('capital_types')
            year = request.query_params.get('year')
            year_gte = request.query_params.get('year__gte')
            year_lte = request.query_params.get('year__lte')
            aggregate = request.query_params.get('aggregate', 'false').lower() == 'true'
            include_raw = request.query_params.get('include_raw', 'false').lower() == 'true'
            include_metadata = request.query_params.get('include_metadata', 'false').lower() == 'true'
            ordering = request.query_params.get('ordering', '-year')
            limit = int(request.query_params.get('limit', 100))
            
            # limit 제한
            if limit > 1000:
                limit = 1000
            
            # 기본 쿼리셋
            queryset = ProcessedCapitalData.objects.select_related(
                'country', 'sector', 'capital_type'
            )
            
            # 필터 적용
            if country:
                queryset = queryset.filter(country__code=country)
            
            if sector:
                queryset = queryset.filter(sector__code=sector)
            
            if capital_types:
                queryset = queryset.filter(capital_type__code__in=capital_types)
            
            if year:
                queryset = queryset.filter(year=year)
            
            if year_gte:
                queryset = queryset.filter(year__gte=year_gte)
            
            if year_lte:
                queryset = queryset.filter(year__lte=year_lte)
            
            # 집계 모드
            if aggregate:
                # 국가별로 그룹화하여 집계
                group_by = ['country__code', 'country__name']
                
                aggregated_data = queryset.values(*group_by).annotate(
                    total_amount=Sum('final_amount_usd'),
                    average_confidence=Avg('confidence_score'),
                    data_coverage=Count('id') * 1.0 / Count('country__code', distinct=True)
                ).order_by('country__code')
                
                # 자본 타입별 세부 데이터도 포함
                detailed_results = []
                for country_data in aggregated_data:
                    country_code = country_data['country__code']
                    
                    # 해당 국가의 자본 타입별 데이터
                    capital_type_data = queryset.filter(
                        country__code=country_code
                    ).values('capital_type__code').annotate(
                        amount=Sum('final_amount_usd')
                    )
                    
                    capital_types_dict = {}
                    for ct_data in capital_type_data:
                        capital_types_dict[ct_data['capital_type__code']] = float(ct_data['amount'] or 0)
                    
                    # 모든 자본 타입을 0으로 초기화
                    all_capital_types = ['FDI', 'VC', 'MA', 'IPO', 'PE', 'BONDS', 'FPI', 'SWF', 'GREENFIELD', 'JV', 'DEVFIN']
                    for ct in all_capital_types:
                        if ct not in capital_types_dict:
                            capital_types_dict[ct] = 0.0
                    
                    detailed_results.append({
                        'country_code': country_code,
                        'country_name': country_data['country__name'],
                        'capital_types': capital_types_dict,
                        'total_amount': float(country_data['total_amount'] or 0),
                        'average_confidence': float(country_data['average_confidence'] or 0),
                        'data_coverage': float(country_data['data_coverage'] or 0)
                    })
                
                return Response({
                    'aggregation_params': {
                        'group_by': group_by,
                        'capital_types': capital_types if capital_types else 'all',
                        'filters': {
                            'sector': sector,
                            'year': year,
                            'aggregate': aggregate,
                            'include_raw': include_raw,
                            'include_metadata': include_metadata,
                            'ordering': ordering,
                            'limit': limit
                        }
                    },
                    'count': len(detailed_results),
                    'results': detailed_results
                })
            
            # 정렬 적용
            if ordering:
                queryset = queryset.order_by(ordering)
            
            # 페이지네이션
            paginator = Paginator(queryset, limit)
            page_obj = paginator.get_page(1)
            
            # 시리얼라이저 적용
            serializer = ProcessedCapitalDataSerializer(page_obj.object_list, many=True)
            
            return Response({
                'count': paginator.count,
                'results': serializer.data,
                'has_next': page_obj.has_next(),
                'total_pages': paginator.num_pages
            })
            
        except Exception as e:
            logger.error(f"CapitalFlow API error: {e}")
            return Response({
                'error': 'Internal server error',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DataCollectionAPIView(APIView):
    """데이터 수집 API"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            from .services.data_collectors import DataCollectionService
            
            collector = DataCollectionService()
            year = request.data.get('year', 2023)
            source = request.data.get('source', 'all')
            
            if source == 'all':
                results = collector.collect_all_sources(year)
            else:
                results = collector.collect_source(source, year)
            
            return Response({
                'success': True,
                'results': results
            })
            
        except Exception as e:
            logger.error(f"Data collection error: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DataFusionAPIView(APIView):
    """데이터 융합 API"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            from .services.data_fusion import DataFusionService
            
            fusion_service = DataFusionService()
            year = request.data.get('year', 2023)
            algorithm = request.data.get('algorithm', 'WEIGHTED_AVG')
            
            results = fusion_service.fuse_data_for_year(year, algorithm)
            
            return Response({
                'success': True,
                'results': results
            })
            
        except Exception as e:
            logger.error(f"Data fusion error: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DataValidationAPIView(APIView):
    """데이터 검증 API"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        try:
            from .services.data_validation import DataValidationService
            
            validator = DataValidationService()
            year = request.query_params.get('year', 2023)
            
            results = validator.validate_year_data(int(year))
            
            return Response({
                'success': True,
                'validation_results': results
            })
            
        except Exception as e:
            logger.error(f"Data validation error: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ProcessingLogsAPIView(APIView):
    """처리 로그 API"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        try:
            from .models import DataProcessingLog
            
            limit = int(request.query_params.get('limit', 50))
            logs = DataProcessingLog.objects.select_related('source', 'country', 'sector').order_by('-start_time')[:limit]
            
            log_data = []
            for log in logs:
                log_data.append({
                    'id': str(log.id),
                    'processing_type': log.processing_type,
                    'status': log.status,
                    'source_name': log.source.name if log.source else None,
                    'country_name': log.country.name if log.country else None,
                    'sector_name': log.sector.name if log.sector else None,
                    'year_start': log.year_start,
                    'year_end': log.year_end,
                    'records_processed': log.records_processed,
                    'records_success': log.records_success,
                    'records_failed': log.records_failed,
                    'start_time': log.start_time.isoformat() if log.start_time else None,
                    'end_time': log.end_time.isoformat() if log.end_time else None,
                    'duration_seconds': log.duration_seconds,
                    'error_message': log.error_message
                })
            
            return Response({
                'success': True,
                'logs': log_data,
                'total_count': len(log_data)
            })
            
        except Exception as e:
            logger.error(f"Processing logs error: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class MetadataAPIView(APIView):
    """메타데이터 API"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        try:
            countries = Country.objects.filter(is_active=True)
            sectors = Sector.objects.filter(is_active=True)
            capital_types = CapitalType.objects.filter(is_active=True)
            
            return Response({
                'countries': [{'code': c.code, 'name': c.name} for c in countries],
                'sectors': [{'code': s.code, 'name': s.name} for s in sectors],
                'capital_types': [{'code': ct.code, 'name': ct.name} for ct in capital_types]
            })
            
        except Exception as e:
            logger.error(f"Metadata API error: {e}")
            return Response({
                'error': 'Internal server error',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class NewsAPIView(APIView):
    """뉴스 검색 API"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        """선택된 필터에 기반한 관련 뉴스 검색"""
        try:
            from .services.news_crawler import DummyNewsService, NewsService
            
            # 쿼리 파라미터 추출
            year = request.query_params.get('year')
            country = request.query_params.get('country')
            sector = request.query_params.get('sector')
            capital_type = request.query_params.get('capital_type')
            use_dummy = request.query_params.get('dummy', 'true').lower() == 'true'
            
            # 필수 파라미터 검증
            if not year:
                return Response({
                    'error': 'year 파라미터가 필요합니다'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                year_int = int(year)
                if year_int < 1990 or year_int > 2024:
                    return Response({
                        'error': 'year는 1990-2024 범위여야 합니다'
                    }, status=status.HTTP_400_BAD_REQUEST)
            except ValueError:
                return Response({
                    'error': 'year는 숫자여야 합니다'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 뉴스 서비스 선택 (더미 데이터 또는 실제 크롤링)
            if use_dummy:
                news_service = DummyNewsService()
            else:
                news_service = NewsService()
            
            # 뉴스 검색
            result = news_service.get_related_news(
                year=year_int,
                country=country,
                sector=sector,
                capital_type=capital_type
            )
            
            # 응답 데이터 구성
            response_data = {
                'success': True,
                'search_params': {
                    'year': year_int,
                    'country': country,
                    'sector': sector,
                    'capital_type': capital_type,
                    'use_dummy': use_dummy
                },
                'news_data': result,
                'metadata': {
                    'total_articles': result.get('count', 0),
                    'search_query': result.get('query', ''),
                    'collected_at': result.get('collected_at'),
                    'data_source': 'dummy' if use_dummy else 'web_crawling'
                }
            }
            
            return Response(response_data)
            
        except Exception as e:
            logger.error(f"News API error: {e}")
            return Response({
                'error': 'Internal server error',
                'details': str(e),
                'success': False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)