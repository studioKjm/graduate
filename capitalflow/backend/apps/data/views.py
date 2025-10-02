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
                # sector가 코드인지 이름인지 확인하여 적절한 필터 적용
                if len(sector) <= 5:  # 코드로 판단 (예: 'AI', 'BIO')
                    queryset = queryset.filter(sector__code=sector)
                else:  # 이름으로 판단 (예: '인공지능', '반도체')
                    queryset = queryset.filter(sector__name__icontains=sector)
            
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
            
            # 디버깅 로그 (제거)
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
                # sector가 코드인지 이름인지 확인하여 적절한 필터 적용
                # 먼저 코드로 시도
                code_queryset = queryset.filter(sector__code=sector)
                if code_queryset.count() > 0:
                    queryset = code_queryset
                else:
                    # 코드로 찾지 못하면 이름으로 시도
                    queryset = queryset.filter(sector__name__icontains=sector)
            
            if capital_types:
                queryset = queryset.filter(capital_type__code__in=capital_types)
            
            if year:
                try:
                    year_int = int(year)
                    queryset = queryset.filter(year=year_int)
                except (ValueError, TypeError):
                    logger.warning(f"Invalid year parameter: {year}")
                    pass
            
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
            from .services.external_collectors import ExtendedDataCollectionService
            
            collector = DataCollectionService()
            extended_collector = ExtendedDataCollectionService()
            year = request.data.get('year', 2023)
            source = request.data.get('source', 'all')
            
            if source == 'all':
                # 기본 소스 수집
                results = collector.collect_all_sources(year)
                # 확장 소스 수집
                extended_results = extended_collector.collect_all_sources(year)
                # 결과 합산
                for key in results:
                    results[key] += extended_results.get(key, 0)
            elif source in ['worldbank', 'unctad', 'bis', 'fed', 'bok']:
                # 확장 소스 수집
                if source == 'worldbank':
                    results = extended_collector.collect_worldbank_data(year)
                elif source == 'unctad':
                    results = extended_collector.collect_unctad_data(year)
                elif source == 'bis':
                    results = extended_collector.collect_bis_data(year)
                else:
                    results = extended_collector.collect_all_sources(year)
            else:
                # 기본 소스 수집
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
            year_start = request.data.get('year_start', 2020)
            year_end = request.data.get('year_end', 2024)
            
            # 배치 융합 실행
            results = fusion_service.batch_fusion(
                year_start=year_start,
                year_end=year_end
            )
            
            return Response({
                'success': True,
                'message': f'{year_start}-{year_end}년 데이터 융합 완료',
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
            from apps.data.models import DataSource
            
            countries = Country.objects.filter(is_active=True)
            sectors = Sector.objects.filter(is_active=True)
            capital_types = CapitalType.objects.filter(is_active=True)
            data_sources = DataSource.objects.filter(is_active=True)
            
            return Response({
                'countries': [{'code': c.code, 'name': c.name} for c in countries],
                'sectors': [{'code': s.code, 'name': s.name} for s in sectors],
                'capital_types': [{'code': ct.code, 'name': ct.name} for ct in capital_types],
                'data_sources': [{'id': ds.id, 'name': ds.name, 'source_type': ds.source_type, 'reliability_weight': ds.reliability_weight} for ds in data_sources]
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


class CollectionStatsAPIView(APIView):
    """수집 통계 API"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        """수집된 데이터의 상세 통계 제공"""
        try:
            from django.db.models import Count, Sum, Avg, Min, Max
            from apps.data.models import RawCapitalData, ProcessedCapitalData, DataProcessingLog
            
            # 기본 통계
            raw_count = RawCapitalData.objects.count()
            processed_count = ProcessedCapitalData.objects.count()
            
            # 전체 가능한 조합 수 계산
            total_countries = Country.objects.count()
            total_sectors = Sector.objects.count()
            total_capital_types = CapitalType.objects.count()
            total_years = 5  # 2020-2024
            total_possible_combinations = total_countries * total_sectors * total_capital_types * total_years
            
            # 연도별 수집 현황 (수집률 포함)
            year_stats = list(
                RawCapitalData.objects
                .values('year')
                .annotate(
                    count=Count('id'),
                    total_amount=Sum('amount_usd'),
                    avg_amount=Avg('amount_usd')
                )
                .order_by('year')
            )
            
            # 연도별 수집률 계산 (해당 연도의 고유한 조합 수 기준)
            for year_stat in year_stats:
                year = year_stat['year']
                # 해당 연도에 실제로 존재하는 고유한 조합 수 계산
                year_unique_combinations = RawCapitalData.objects.filter(year=year).values('country', 'sector', 'capital_type').distinct().count()
                # 이론적 최대 조합 수 (모든 국가, 분야, 자본타입)
                year_max_combinations = total_countries * total_sectors * total_capital_types
                year_stat['collection_rate'] = round((year_unique_combinations / year_max_combinations * 100), 2) if year_max_combinations > 0 else 0
            
            # 국가별 수집 현황 (전체 국가, 수집률 포함)
            country_stats = list(
                RawCapitalData.objects
                .values('country__name', 'country__code')
                .annotate(
                    count=Count('id'),
                    total_amount=Sum('amount_usd'),
                    avg_amount=Avg('amount_usd')
                )
                .order_by('-count')
            )
            
            # 국가별 수집률 계산 (해당 국가의 고유한 조합 수 기준)
            for country_stat in country_stats:
                country_code = country_stat['country__code']
                # 해당 국가에 실제로 존재하는 고유한 조합 수 계산
                country_unique_combinations = RawCapitalData.objects.filter(country__code=country_code).values('sector', 'capital_type', 'year').distinct().count()
                # 이론적 최대 조합 수 (모든 분야, 자본타입, 연도)
                country_max_combinations = total_sectors * total_capital_types * total_years
                country_stat['collection_rate'] = round((country_unique_combinations / country_max_combinations * 100), 2) if country_max_combinations > 0 else 0
            
            # 분야별 수집 현황 (수집률 포함)
            sector_stats = list(
                RawCapitalData.objects
                .values('sector__name', 'sector__code')
                .annotate(
                    count=Count('id'),
                    total_amount=Sum('amount_usd'),
                    avg_amount=Avg('amount_usd')
                )
                .order_by('-count')
            )
            
            # 분야별 수집률 계산 (해당 분야의 고유한 조합 수 기준)
            for sector_stat in sector_stats:
                sector_code = sector_stat['sector__code']
                # 해당 분야에 실제로 존재하는 고유한 조합 수 계산
                sector_unique_combinations = RawCapitalData.objects.filter(sector__code=sector_code).values('country', 'capital_type', 'year').distinct().count()
                # 이론적 최대 조합 수 (모든 국가, 자본타입, 연도)
                sector_max_combinations = total_countries * total_capital_types * total_years
                sector_stat['collection_rate'] = round((sector_unique_combinations / sector_max_combinations * 100), 2) if sector_max_combinations > 0 else 0
            
            # 자본타입별 수집 현황 (수집률 포함)
            capital_type_stats = list(
                RawCapitalData.objects
                .values('capital_type__name', 'capital_type__code')
                .annotate(
                    count=Count('id'),
                    total_amount=Sum('amount_usd'),
                    avg_amount=Avg('amount_usd')
                )
                .order_by('-count')
            )
            
            # 자본타입별 수집률 계산 (해당 자본타입의 고유한 조합 수 기준)
            for capital_type_stat in capital_type_stats:
                capital_type_code = capital_type_stat['capital_type__code']
                # 해당 자본타입에 실제로 존재하는 고유한 조합 수 계산
                capital_type_unique_combinations = RawCapitalData.objects.filter(capital_type__code=capital_type_code).values('country', 'sector', 'year').distinct().count()
                # 이론적 최대 조합 수 (모든 국가, 분야, 연도)
                capital_type_max_combinations = total_countries * total_sectors * total_years
                capital_type_stat['collection_rate'] = round((capital_type_unique_combinations / capital_type_max_combinations * 100), 2) if capital_type_max_combinations > 0 else 0
            
            # 소스별 수집 현황
            source_stats = list(
                RawCapitalData.objects
                .values('source__name', 'source__source_type')
                .annotate(
                    count=Count('id'),
                    total_amount=Sum('amount_usd'),
                    avg_amount=Avg('amount_usd'),
                    avg_quality=Avg('data_quality_score')
                )
                .order_by('-count')
            )
            
            # 최근 처리 로그
            recent_logs = DataProcessingLog.objects.order_by('-start_time')[:10]
            log_data = []
            for log in recent_logs:
                log_data.append({
                    'id': str(log.id),
                    'start_time': log.start_time.isoformat() if log.start_time else None,
                    'end_time': log.end_time.isoformat() if log.end_time else None,
                    'duration_seconds': log.duration_seconds,
                    'status': log.status,
                    'records_processed': log.records_processed,
                    'records_success': log.records_success,
                    'records_failed': log.records_failed,
                    'error_message': log.error_message
                })
            
            # 누락된 데이터 분석
            missing_data = self._analyze_missing_data()
            
            # 전체 통계 계산
            total_collected = raw_count
            total_processed = processed_count
            success_rate = (total_processed / total_collected * 100) if total_collected > 0 else 0
            
            # 전체 수집률 계산 (고유한 조합 수 기준)
            actual_unique_combinations = RawCapitalData.objects.values('country', 'sector', 'capital_type', 'year').distinct().count()
            overall_collection_rate = round((actual_unique_combinations / total_possible_combinations * 100), 2) if total_possible_combinations > 0 else 0
            
            # 평균 처리 시간 계산
            avg_processing_time = 0
            if recent_logs.exists():
                total_duration = sum(log.duration_seconds or 0 for log in recent_logs)
                avg_processing_time = total_duration / recent_logs.count()
            
            return Response({
                'success': True,
                'summary': {
                    'total_collected': total_collected,
                    'total_processed': total_processed,
                    'success_rate': round(success_rate, 2),
                    'avg_processing_time': round(avg_processing_time, 2),
                    'overall_collection_rate': overall_collection_rate,
                    'total_possible_combinations': total_possible_combinations,
                    'actual_unique_combinations': actual_unique_combinations,
                    'last_collection': log_data[0]['start_time'] if log_data else None
                },
                'year_stats': year_stats,
                'country_stats': country_stats,
                'sector_stats': sector_stats,
                'capital_type_stats': capital_type_stats,
                'source_stats': source_stats,
                'recent_logs': log_data,
                'missing_data': missing_data
            })
            
        except Exception as e:
            logger.error(f"Collection stats API error: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _analyze_missing_data(self):
        """누락된 데이터 분석"""
        from apps.data.models import Country, Sector, CapitalType, RawCapitalData
        
        # 모든 가능한 조합 생성
        countries = Country.objects.filter(is_active=True)[:10]  # 상위 10개국만
        sectors = Sector.objects.filter(is_active=True).exclude(code='ALL')[:5]  # 상위 5개 분야
        capital_types = CapitalType.objects.filter(is_active=True)[:5]  # 상위 5개 자본타입
        years = [2020, 2021, 2022, 2023, 2024]
        
        missing_combinations = []
        
        for country in countries:
            for sector in sectors:
                for capital_type in capital_types:
                    for year in years:
                        exists = RawCapitalData.objects.filter(
                            country=country,
                            sector=sector,
                            capital_type=capital_type,
                            year=year
                        ).exists()
                        
                        if not exists:
                            missing_combinations.append({
                                'country': country.name,
                                'country_code': country.code,
                                'sector': sector.name,
                                'sector_code': sector.code,
                                'capital_type': capital_type.name,
                                'capital_type_code': capital_type.code,
                                'year': year
                            })
        
        return missing_combinations[:50]  # 최대 50개만 반환


class RawDataCollectionAPIView(APIView):
    """원시데이터 수집 API"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        """원시데이터 수집 실행"""
        try:
            from apps.data.services.data_collectors import DataCollectionService
            from apps.data.models import Country, Sector, CapitalType, DataSource
            
            # 요청 데이터 파싱
            data = request.data
            countries = data.get('countries', [])
            sectors = data.get('sectors', [])
            capital_types = data.get('capital_types', [])
            years = data.get('years', [])
            sources = data.get('sources', [])
            
            # 기본값 설정
            if not countries:
                countries = list(Country.objects.filter(is_active=True).values_list('code', flat=True))
            if not sectors:
                sectors = list(Sector.objects.filter(is_active=True).exclude(code='ALL').values_list('code', flat=True))
            if not capital_types:
                capital_types = list(CapitalType.objects.filter(is_active=True).values_list('code', flat=True))
            if not years:
                years = [2020, 2021, 2022, 2023, 2024]
            if not sources:
                sources = list(DataSource.objects.filter(is_active=True).values_list('name', flat=True))
            
            # 수집 서비스 초기화
            collection_service = DataCollectionService()
            
            # 수집 실행
            results = {
                'collected': 0,
                'failed': 0,
                'details': []
            }
            
            for source_name in sources:
                try:
                    source = DataSource.objects.get(name=source_name)
                    for year in years:
                        for country_code in countries:
                            for sector_code in sectors:
                                for capital_type_code in capital_types:
                                    try:
                                        # 데이터 수집 실행
                                        collected_data = collection_service.collect_source(
                                            source_name=source_name,
                                            year=year,
                                            country_code=country_code,
                                            sector_code=sector_code,
                                            capital_type_code=capital_type_code
                                        )
                                        
                                        if collected_data and collected_data > 0:
                                            results['collected'] += collected_data
                                            results['details'].append({
                                                'source': source_name,
                                                'year': year,
                                                'country': country_code,
                                                'sector': sector_code,
                                                'capital_type': capital_type_code,
                                                'count': collected_data
                                            })
                                        else:
                                            results['failed'] += 1
                                            
                                    except Exception as e:
                                        results['failed'] += 1
                                        results['details'].append({
                                            'source': source_name,
                                            'year': year,
                                            'country': country_code,
                                            'sector': sector_code,
                                            'capital_type': capital_type_code,
                                            'error': str(e)
                                        })
                                        
                                    except Exception as e:
                                        logger.error(f"Raw data collection error: {e}")
                                        results['failed'] += 1
                                        
                except Exception as e:
                    logger.error(f"Source collection error: {e}")
                    results['failed'] += 1
                                    
            return Response({
                'success': True,
                'message': f'원시데이터 수집 완료: {results["collected"]}개 수집, {results["failed"]}개 실패',
                'results': results
            })
            
        except Exception as e:
            logger.error(f"Raw data collection API error: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)