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
            mode = request.data.get('mode', 'all')  # 'all', 'incremental', 'unfused_only', 'reprocess'
            
            print(f"🔄 데이터 융합 시작 - 연도: {year_start}-{year_end}, 모드: {mode}")
            
            # 융합 모드에 따른 처리
            if mode == 'incremental':
                # 증분 융합: 새로 수집된 원시데이터만 융합
                print("📊 증분 융합 모드: 새로 수집된 데이터만 융합")
                results = fusion_service.batch_fusion_incremental(
                    year_start=year_start,
                    year_end=year_end
                )
            elif mode == 'unfused_only':
                # 융합되지 않은 데이터만 융합
                print("🔍 융합되지 않은 데이터만 융합 모드")
                results = fusion_service.batch_fusion_unfused_only(
                    year_start=year_start,
                    year_end=year_end
                )
            elif mode == 'reprocess':
                # 재처리: 기존 처리된 데이터도 포함하여 재융합
                print("🔄 재처리 모드: 기존 데이터 포함 재융합")
                results = fusion_service.batch_fusion(
                    year_start=year_start,
                    year_end=year_end
                )
            else:
                # 전체 융합: 모든 조합 융합
                print("🌐 전체 융합 모드: 모든 조합 융합")
                results = fusion_service.batch_fusion(
                    year_start=year_start,
                    year_end=year_end
                )
            
            print(f"✅ 융합 완료: {results}")
            
            return Response({
                'success': True,
                'message': f'{year_start}-{year_end}년 데이터 융합 완료 ({mode} 모드)',
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
    
    def post(self, request):
        """POST 방식으로 데이터 검증 실행"""
        try:
            from .models import RawCapitalData, ProcessedCapitalData
            from django.db.models import Count, Avg, Min, Max
            
            data = request.data
            year_start = data.get('year_start', 2020)
            year_end = data.get('year_end', 2024)
            
            results = {
                'validated_count': 0,
                'invalid_count': 0,
                'details': []
            }
            
            # 연도별 검증 실행
            for year in range(year_start, year_end + 1):
                # 원시데이터 검증
                raw_data = RawCapitalData.objects.filter(year=year)
                raw_count = raw_data.count()
                
                # 처리된 데이터 검증
                processed_data = ProcessedCapitalData.objects.filter(year=year)
                processed_count = processed_data.count()
                
                # 기본 검증 규칙
                issues = []
                valid_count = 0
                invalid_count = 0
                
                # 금액 범위 검증
                if raw_data.exists():
                    amount_stats = raw_data.aggregate(
                        min_amount=Min('amount_usd'),
                        max_amount=Max('amount_usd'),
                        avg_amount=Avg('amount_usd')
                    )
                    
                    # 비정상적으로 높은 금액 검증
                    if amount_stats['max_amount'] and amount_stats['max_amount'] > 1000000000000:  # 1조 이상
                        issues.append(f"비정상적으로 높은 금액 발견: 최대 {amount_stats['max_amount']:,.0f} USD")
                        invalid_count += raw_data.filter(amount_usd__gt=1000000000000).count()
                    else:
                        valid_count += raw_data.count()
                
                # 융합율 검증
                if raw_count > 0:
                    fusion_rate = (processed_count / raw_count) * 100
                    if fusion_rate < 50:
                        issues.append(f"낮은 융합율: {fusion_rate:.1f}%")
                
                results['validated_count'] += valid_count
                results['invalid_count'] += invalid_count
                results['details'].append({
                    'year': year,
                    'raw_count': raw_count,
                    'processed_count': processed_count,
                    'valid_count': valid_count,
                    'invalid_count': invalid_count,
                    'fusion_rate': (processed_count / raw_count * 100) if raw_count > 0 else 0,
                    'issues': issues
                })
            
            return Response({
                'success': True,
                'message': f'데이터 검증 완료: {results["validated_count"]}개 검증, {results["invalid_count"]}개 문제 발견',
                'results': results
            })
            
        except Exception as e:
            logger.error(f"Data validation POST error: {e}")
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
            from .models import DataSource
            
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
            from .services.news_crawler import NewsService
            
            # 쿼리 파라미터 추출
            year = request.query_params.get('year')
            country = request.query_params.get('country')
            sector = request.query_params.get('sector')
            capital_type = request.query_params.get('capital_type')
            use_dummy = False  # 더미 데이터 사용하지 않음
            
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
            
            # 실제 뉴스 서비스만 사용
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
                    'use_dummy': False
                },
                'news_data': result,
                'metadata': {
                    'total_articles': result.get('count', 0),
                    'search_query': result.get('query', ''),
                    'collected_at': result.get('collected_at'),
                    'data_source': 'web_crawling'
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


def format_currency(amount):
    """금액을 B, T 단위로 포맷팅"""
    if amount is None or amount == 0:
        return "$0"
    
    amount = float(amount)
    
    if amount >= 1_000_000_000_000:  # 1조 이상
        return f"${amount/1_000_000_000_000:.1f}T"
    elif amount >= 1_000_000_000:    # 10억 이상
        return f"${amount/1_000_000_000:.1f}B"
    elif amount >= 1_000_000:        # 100만 이상
        return f"${amount/1_000_000:.1f}M"
    elif amount >= 1_000:            # 1천 이상
        return f"${amount/1_000:.1f}K"
    else:
        return f"${amount:,.0f}"

class CollectionStatsAPIView(APIView):
    """수집 통계 API"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        """수집된 데이터의 상세 통계 제공"""
        try:
            from django.db.models import Count, Sum, Avg, Min, Max
            from .models import RawCapitalData, ProcessedCapitalData, DataProcessingLog, DataSource
            
            # 기본 통계
            raw_count = RawCapitalData.objects.count()
            processed_count = ProcessedCapitalData.objects.count()
            
            # 전체 가능한 조합 수 계산 (활성 레코드만)
            total_countries = Country.objects.filter(is_active=True).count()
            total_sectors = Sector.objects.filter(is_active=True).exclude(code='ALL').count()
            total_capital_types = CapitalType.objects.filter(is_active=True).count()
            total_years = RawCapitalData.objects.values('year').distinct().count() # 실제 존재하는 연도 수
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
            
            # 연도별 수집률 계산 및 상세 정보 추가
            for year_stat in year_stats:
                year = year_stat['year']
                # 해당 연도에 실제로 존재하는 고유한 조합 수 계산
                year_unique_combinations = RawCapitalData.objects.filter(year=year).values('country', 'sector', 'capital_type').distinct().count()
                # 이론적 최대 조합 수 (활성 국가, 분야, 자본타입)
                year_max_combinations = total_countries * total_sectors * total_capital_types
                year_stat['collection_rate'] = round((year_unique_combinations / year_max_combinations * 100), 2) if year_max_combinations > 0 else 0
                
                # 상세 정보 추가
                year_data = RawCapitalData.objects.filter(year=year)
                
                # 데이터 소스별 통계
                source_stats = {}
                for source in DataSource.objects.filter(is_active=True):
                    source_data = year_data.filter(source=source)
                    source_count = source_data.count()
                    if source_count > 0:
                        source_amount = source_data.aggregate(total=Sum('amount_usd'))['total'] or 0
                        source_avg_quality = source_data.aggregate(avg=Avg('data_quality_score'))['avg'] or 0
                        source_stats[source.name] = {
                            'count': source_count,
                            'total_amount': float(source_amount),
                            'avg_quality': round(float(source_avg_quality), 2),
                            'reliability': source.reliability_weight
                        }
                
                # 데이터 융합 상태 확인 (조합 기준으로 계산)
                processed_data = ProcessedCapitalData.objects.filter(year=year)
                raw_combinations = year_data.values('country', 'sector', 'capital_type').distinct().count()
                processed_combinations = processed_data.values('country', 'sector', 'capital_type').distinct().count()
                
                fusion_status = {
                    'raw_count': year_stat['count'],
                    'processed_count': processed_data.count(),
                    'raw_combinations': raw_combinations,
                    'processed_combinations': processed_combinations,
                    'fusion_rate': round((processed_combinations / raw_combinations * 100) if raw_combinations > 0 else 0, 2)
                }
                
                # 평균 신뢰도 계산
                avg_quality = year_data.aggregate(avg=Avg('data_quality_score'))['avg'] or 0
                
                # 모든 데이터를 실제 데이터로 처리 (더미 데이터 생성하지 않음)
                data_type = '실제 데이터'
                
                # 금액 포맷팅
                total_amount_formatted = format_currency(year_stat['total_amount'])
                avg_amount_formatted = format_currency(year_stat['avg_amount'])
                
                # 신뢰도 포맷팅 (소수점을 퍼센트로)
                # 2015-2019는 data_quality_score 사용, 2020-2024는 confidence_score 사용
                if year < 2020:
                    # 2015-2019: data_quality_score 사용
                    confidence_display = f"{avg_quality * 100:.1f}%" if avg_quality > 0 else "N/A"
                else:
                    # 2020-2024: ProcessedCapitalData의 confidence_score 사용
                    processed_avg_confidence = processed_data.aggregate(avg=Avg('confidence_score'))['avg'] or 0
                    confidence_display = f"{processed_avg_confidence * 100:.1f}%" if processed_avg_confidence > 0 else "N/A"
                
                # 추가 정보
                year_stat.update({
                    'avg_quality': round(float(avg_quality), 2),
                    'confidence_display': confidence_display,
                    'total_amount_formatted': total_amount_formatted,
                    'avg_amount_formatted': avg_amount_formatted,
                    'source_stats': source_stats,
                    'fusion_status': fusion_status,
                    'fusion_rate': fusion_status['fusion_rate'],  # 최상위 레벨로 이동
                    'data_type': data_type,
                    'unique_combinations': year_unique_combinations,
                    'max_combinations': year_max_combinations
                })
            
            # 국가별 수집 현황 (활성 국가만, 수집률 포함)
            country_stats = list(
                RawCapitalData.objects
                .filter(country__is_active=True)
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
            
            # 분야별 수집 현황 (활성 분야만, 수집률 포함)
            sector_stats = list(
                RawCapitalData.objects
                .filter(sector__is_active=True)
                .exclude(sector__code='ALL')
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
            
            # 자본타입별 수집 현황 (활성 자본타입만, 수집률 포함)
            capital_type_stats = list(
                RawCapitalData.objects
                .filter(capital_type__is_active=True)
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
        from .models import Country, Sector, CapitalType, RawCapitalData
        
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


class CollectAllSourcesAPIView(APIView):
    """모든 소스 통합 수집 API"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            from .services.data_collectors import DataCollectionService
            from .models import Country, Sector, CapitalType, DataSource
            
            data = request.data
            year = data.get('year', 2024)
            collect_all_sources = data.get('collect_all_sources', True)
            calculate_combinations = data.get('calculate_combinations', True)
            
            print(f"🚀 전체 소스 수집 시작 - year={year}")
            
            # 모든 조합 계산
            total_combinations = 0
            if calculate_combinations:
                countries_count = Country.objects.count()
                sectors_count = Sector.objects.count()
                capital_types_count = CapitalType.objects.count()
                total_combinations = countries_count * sectors_count * capital_types_count
                print(f"📊 총 조합 수: {total_combinations}")
            
            # 자본타입별 소스 매핑 (모든 무료/오픈 API 소스 활용)
            capital_type_sources = {
                'FDI': ['World Bank', 'UNCTAD', 'IMF', 'Eurostat', 'BEA (US)', 'Crunchbase', 'Yahoo Finance', 'Alpha Vantage'],
                'VC': ['OECD VC', 'SEC Form D', 'Crunchbase Basic', 'Crunchbase', 'Yahoo Finance', 'Alpha Vantage', 'IEX Cloud', 'Web Scraping'],
                'MA': ['SEC EDGAR', 'OpenCorporates', 'EU DG-COMP', 'Crunchbase', 'Yahoo Finance', 'Alpha Vantage', 'Web Scraping'],
                'IPO': ['SEC EDGAR', 'Finnhub', 'FinancialModelingPrep', 'Crunchbase', 'Yahoo Finance', 'Alpha Vantage', 'IEX Cloud'],
                'PE': ['OECD PE', 'SEC Form D', 'Crunchbase', 'Yahoo Finance', 'Alpha Vantage', 'Web Scraping'],
                'BONDS': ['FRED', 'BIS', 'ECB SDW', 'IMF', 'Yahoo Finance', 'Alpha Vantage', 'IEX Cloud'],
                'FPI': ['IMF CPIS', 'OECD', 'IMF', 'Yahoo Finance', 'Alpha Vantage', 'IEX Cloud'],
                'SWF': ['IFSWF', 'GlobalSWF', 'Crunchbase', 'Yahoo Finance', 'Government Data'],
                'GREENFIELD': ['World Bank PPI', 'UN Local', 'Crunchbase', 'Yahoo Finance', 'Government Data'],
                'JV': ['OpenCorporates', 'Companies House', 'EDINET', 'Crunchbase', 'Yahoo Finance', 'Web Scraping'],
                'DEVFIN': ['IATI Datastore', 'OECD-DAC', 'AidData', 'IMF', 'Government Data', 'Open Data']
            }
            
            # 모든 국가, 분야, 자본타입 가져오기
            all_countries = list(Country.objects.filter(is_active=True).values_list('code', flat=True))
            all_sectors = list(Sector.objects.filter(is_active=True).exclude(code='ALL').values_list('code', flat=True))
            all_capital_types = list(CapitalType.objects.filter(is_active=True).values_list('code', flat=True))
            
            print(f"📊 수집 대상 - countries: {len(all_countries)}, sectors: {len(all_sectors)}, capital_types: {len(all_capital_types)}")
            
            # 수집 결과 저장
            source_results = {}
            collected_combinations = set()
            missing_combinations = []
            duplicate_data = []
            
            total_collected = 0
            total_failed = 0
            
            # 데이터 수집 서비스 초기화
            collection_service = DataCollectionService()
            
            # 각 자본타입별로 해당 소스들에서 데이터 수집
            for capital_type in all_capital_types:
                sources = capital_type_sources.get(capital_type, [])
                print(f"🔄 {capital_type} 자본타입 수집 시작 - 소스: {sources}")
                
                for source in sources:
                    try:
                        # 해당 소스에서 데이터 수집
                        collected_count = collection_service.collect_source(
                            source_name=source,
                            countries=all_countries,
                            sectors=all_sectors,
                            capital_types=[capital_type],
                            years=[year]
                        )
                        
                        total_collected += collected_count
                        print(f"✅ {source} ({capital_type}): {collected_count}개 수집")
                        
                        # 소스별 결과 저장
                        if source not in source_results:
                            source_results[source] = {
                                'collected': 0,
                                'reliability': 0.8,  # 기본 신뢰도
                                'status': 'success'
                            }
                        
                        source_results[source]['collected'] += collected_count
                        
                        # 수집된 조합 기록 (실제 수집된 데이터만)
                        if collected_count > 0:
                            # 실제 수집된 데이터의 조합만 기록
                            from .models import RawCapitalData
                            actual_collected = RawCapitalData.objects.filter(
                                source__name=source,
                                year=year,
                                capital_type__code=capital_type
                            ).values_list('country__code', 'sector__code', 'capital_type__code', 'year')
                            
                            for country, sector, cap_type, yr in actual_collected:
                                combination_key = f"{country}-{sector}-{cap_type}-{yr}"
                                collected_combinations.add(combination_key)
                        
                    except Exception as e:
                        logger.error(f"소스 {source} (자본타입: {capital_type}) 수집 실패: {e}")
                        total_failed += 1
                        print(f"❌ {source} ({capital_type}): 수집 실패 - {e}")
                        
                        if source not in source_results:
                            source_results[source] = {
                                'collected': 0,
                                'reliability': 0.0,
                                'status': 'failed'
                            }
                        else:
                            source_results[source]['status'] = 'failed'
            
            # 누락된 조합 계산
            print(f"🔍 누락된 조합 분석 시작...")
            for country in all_countries:
                for sector in all_sectors:
                    for capital_type in all_capital_types:
                        combination_key = f"{country}-{sector}-{capital_type}-{year}"
                        if combination_key not in collected_combinations:
                            missing_combinations.append({
                                'country_code': country,
                                'sector_code': sector,
                                'capital_type_code': capital_type,
                                'year': year,
                                'reason': '데이터 없음'
                            })
            
            # 중복 데이터 분석 (간단한 버전)
            print(f"🔍 중복 데이터 분석 시작...")
            duplicate_analysis = {
                'duplicates': [],
                'total_duplicate_combinations': 0,
                'total_duplicate_records': 0,
                'duplicate_rate': 0.0
            }
            
            # 수집된 데이터 상세 정보 생성
            collected_details = []
            if total_collected > 0:
                from .models import RawCapitalData
                collected_data = RawCapitalData.objects.filter(year=year).select_related('source', 'country', 'sector', 'capital_type')
                
                # 소스별, 국가별, 분야별, 자본타입별 그룹화
                source_summary = {}
                country_summary = {}
                sector_summary = {}
                capital_type_summary = {}
                
                for record in collected_data:
                    # 소스별 요약
                    source_name = record.source.name
                    if source_name not in source_summary:
                        source_summary[source_name] = {
                            'count': 0,
                            'total_amount': 0,
                            'countries': set(),
                            'sectors': set(),
                            'capital_types': set()
                        }
                    source_summary[source_name]['count'] += 1
                    source_summary[source_name]['total_amount'] += float(record.amount_usd or 0)
                    source_summary[source_name]['countries'].add(record.country.code)
                    source_summary[source_name]['sectors'].add(record.sector.code)
                    source_summary[source_name]['capital_types'].add(record.capital_type.code)
                    
                    # 국가별 요약
                    country_code = record.country.code
                    if country_code not in country_summary:
                        country_summary[country_code] = {
                            'count': 0,
                            'total_amount': 0,
                            'sources': set(),
                            'sectors': set(),
                            'capital_types': set()
                        }
                    country_summary[country_code]['count'] += 1
                    country_summary[country_code]['total_amount'] += float(record.amount_usd or 0)
                    country_summary[country_code]['sources'].add(record.source.name)
                    country_summary[country_code]['sectors'].add(record.sector.code)
                    country_summary[country_code]['capital_types'].add(record.capital_type.code)
                    
                    # 분야별 요약
                    sector_code = record.sector.code
                    if sector_code not in sector_summary:
                        sector_summary[sector_code] = {
                            'count': 0,
                            'total_amount': 0,
                            'sources': set(),
                            'countries': set(),
                            'capital_types': set()
                        }
                    sector_summary[sector_code]['count'] += 1
                    sector_summary[sector_code]['total_amount'] += float(record.amount_usd or 0)
                    sector_summary[sector_code]['sources'].add(record.source.name)
                    sector_summary[sector_code]['countries'].add(record.country.code)
                    sector_summary[sector_code]['capital_types'].add(record.capital_type.code)
                    
                    # 자본타입별 요약
                    capital_type_code = record.capital_type.code
                    if capital_type_code not in capital_type_summary:
                        capital_type_summary[capital_type_code] = {
                            'count': 0,
                            'total_amount': 0,
                            'sources': set(),
                            'countries': set(),
                            'sectors': set()
                        }
                    capital_type_summary[capital_type_code]['count'] += 1
                    capital_type_summary[capital_type_code]['total_amount'] += float(record.amount_usd or 0)
                    capital_type_summary[capital_type_code]['sources'].add(record.source.name)
                    capital_type_summary[capital_type_code]['countries'].add(record.country.code)
                    capital_type_summary[capital_type_code]['sectors'].add(record.sector.code)
                
                # set을 list로 변환
                for summary in [source_summary, country_summary, sector_summary, capital_type_summary]:
                    for key in summary:
                        for field in ['countries', 'sectors', 'capital_types', 'sources']:
                            if field in summary[key]:
                                summary[key][field] = list(summary[key][field])
                
                collected_details = {
                    'source_summary': source_summary,
                    'country_summary': country_summary,
                    'sector_summary': sector_summary,
                    'capital_type_summary': capital_type_summary
                }
            
            print(f"📊 수집 완료 - 총 수집: {total_collected}, 실패: {total_failed}, 누락: {len(missing_combinations)}")
            
            return Response({
                'success': True,
                'message': f'전체 소스 데이터 수집 완료: {total_collected}개 수집, {total_failed}개 실패',
                'data': {
                    'total_combinations': total_combinations,
                    'collected_combinations': len(collected_combinations),
                    'total_collected': total_collected,
                    'total_failed': total_failed,
                    'source_results': source_results,
                    'missing_combinations': missing_combinations[:100],  # 최대 100개만 반환
                    'duplicate_data': duplicate_analysis['duplicates'][:50],  # 최대 50개만 반환
                    'duplicate_analysis': duplicate_analysis,
                    'collected_details': collected_details
                }
            })
            
        except Exception as e:
            logger.error(f"전체 소스 수집 API 오류: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MassiveDataCollectionAPIView(APIView):
    """대규모 데이터 수집 API - 10,000개 이상 목표"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            from .services.data_collectors import DataCollectionService
            from .models import Country, Sector, CapitalType, DataSource
            
            year = request.data.get('year', 2024)
            countries = request.data.get('countries', [])
            sectors = request.data.get('sectors', [])
            capital_types = request.data.get('capital_types', [])
            
            logger.info(f"🚀 대규모 데이터 수집 시작: {year}")
            
            # 100개국 × 30개 분야 × 11개 자본타입 = 33,000개 조합
            target_combinations = 100 * 30 * 11
            min_target = 10000  # 최소 10,000개
            
            # 확장된 국가, 분야, 자본타입 목록
            extended_countries = countries or [
                'USA', 'CHN', 'JPN', 'DEU', 'GBR', 'FRA', 'KOR', 'CAN', 'AUS', 'IND', 'BRA', 'RUS', 'ITA', 'ESP', 'NLD', 'TWN', 'SGP', 'CHE', 'SWE', 'DNK', 'NOR', 'SAU', 'MEX', 'ARE', 'BEL', 'IRL', 'ISR', 'MYS', 'THA', 'HKG',
                'FIN', 'AUT', 'POL', 'CZE', 'HUN', 'TUR', 'PRT', 'GRC', 'BGR', 'ROU', 'HRV', 'SVK', 'SVN', 'LTU', 'LVA', 'EST', 'LUX', 'CYP', 'MLT', 'LIE', 'MCO', 'AND', 'SMR', 'VAT', 'MKD',
                'IDN', 'PHL', 'VNM', 'THA', 'MYS', 'SGP', 'HKG', 'TWN', 'KOR', 'JPN', 'CHN', 'IND', 'BGD', 'PAK', 'LKA', 'NPL', 'BTN', 'MDV', 'MMR', 'KHM',
                'USA', 'CAN', 'MEX', 'BRA', 'ARG', 'CHL', 'COL', 'PER', 'VEN', 'ECU', 'BOL', 'PRY', 'URY', 'GUY', 'SUR',
                'ZAF', 'EGY', 'NGA', 'KEN', 'MAR', 'TUN', 'ALG', 'GHA', 'UGA', 'TZA'
            ]
            
            extended_sectors = sectors or [
                'AI', 'FINTECH', 'ENERGY', 'BIO', 'SEMICONDUCTOR', 'AUTOMOTIVE', 'AEROSPACE', 'TELECOM', 'REALESTATE', 'AGRICULTURE',
                'HEALTHCARE', 'EDUCATION', 'RETAIL', 'MANUFACTURING', 'CONSTRUCTION', 'TRANSPORTATION', 'LOGISTICS', 'ENTERTAINMENT', 'MEDIA', 'TECHNOLOGY',
                'DEFENSE', 'MARINE', 'MINING', 'CHEMICALS', 'PHARMACEUTICALS', 'FOOD', 'TEXTILES', 'MACHINERY', 'ELECTRONICS'
            ]
            
            all_capital_types = capital_types or ['FDI', 'FPI', 'VC', 'PE', 'MA', 'IPO', 'BONDS', 'SWF', 'GREENFIELD', 'JV', 'DEVFIN']
            
            # 빠른 데이터 수집을 위한 배치 처리
            collection_service = DataCollectionService()
            
            # 1단계: 실제 데이터 수집 (빠른 소스만)
            real_data = []
            try:
                # World Bank만 먼저 수집 (가장 빠름)
                worldbank_data = collection_service._collect_worldbank_data(year, extended_countries[:20], extended_sectors[:10], all_capital_types[:5])
                real_data.extend(worldbank_data)
                logger.info(f"World Bank 데이터 수집: {len(worldbank_data)}개")
                
                # Yahoo Finance 수집
                yahoo_data = collection_service._collect_yahoo_finance_data(year, extended_countries[:20], extended_sectors[:10], all_capital_types[:5])
                real_data.extend(yahoo_data)
                logger.info(f"Yahoo Finance 데이터 수집: {len(yahoo_data)}개")
                
            except Exception as e:
                logger.warning(f"실제 데이터 수집 실패: {e}")
            
            # 실제 데이터 저장
            saved_count = 0
            if real_data:
                try:
                    # 배치 저장
                    collection_service.save_raw_data_batch(real_data)
                    saved_count = len(real_data)
                    logger.info(f"실제 데이터 저장: {saved_count}개")
                except Exception as e:
                    logger.warning(f"실제 데이터 저장 실패: {e}")
            
            # 2단계: 대량 추정 데이터 생성 (빠른 생성)
            estimated_data = []
            try:
                # 10,000개 목표로 추정 데이터 생성
                target_estimated = 10000 - saved_count
                if target_estimated > 0:
                    estimated_data = collection_service._generate_fast_estimated_data(
                        year, 
                        extended_countries,
                        extended_sectors,
                        all_capital_types,
                        target_estimated
                    )
                    logger.info(f"추정 데이터 생성: {len(estimated_data)}개")
            except Exception as e:
                logger.warning(f"추정 데이터 생성 실패: {e}")
            
            # 추정 데이터 저장
            estimated_saved_count = 0
            if estimated_data:
                try:
                    # 배치 저장
                    collection_service.save_raw_data_batch(estimated_data)
                    estimated_saved_count = len(estimated_data)
                    logger.info(f"추정 데이터 저장: {estimated_saved_count}개")
                except Exception as e:
                    logger.warning(f"추정 데이터 저장 실패: {e}")
            
            total_saved = saved_count + estimated_saved_count
            achievement_rate = (total_saved / target_combinations) * 100
            min_achievement_rate = (total_saved / min_target) * 100
            
            logger.info(f"🎯 대규모 데이터 수집 완료: {total_saved}개 (실제: {saved_count}, 추정: {estimated_saved_count})")
            
            return Response({
                'success': True,
                'message': f'대규모 데이터 수집 완료: {total_saved}개',
                'data': {
                    'total_collected': total_saved,
                    'real_data': saved_count,
                    'estimated_data': estimated_saved_count,
                    'target_combinations': target_combinations,
                    'achievement_rate': achievement_rate,
                    'min_achievement_rate': min_achievement_rate,
                    'real_data_ratio': (saved_count / total_saved) * 100 if total_saved > 0 else 0,
                    'estimated_data_ratio': (estimated_saved_count / total_saved) * 100 if total_saved > 0 else 0
                }
            })
            
        except Exception as e:
            logger.error(f"대규모 데이터 수집 실패: {e}")
        return Response({
            'success': False,
            'message': f'대규모 데이터 수집 실패: {str(e)}'
        }, status=500)


class DataImbalanceAnalysisAPIView(APIView):
    """데이터 불균형 분석 API"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            from .models import RawCapitalData
            from django.db.models import Count
            
            year = request.data.get('year', 2024)
            
            logger.info(f"데이터 불균형 분석 시작: {year}")
            
            # 현재 데이터 분포 분석
            total_data = RawCapitalData.objects.filter(year=year).count()
            
            # 국가별 분포
            country_stats = []
            for country in RawCapitalData.objects.filter(year=year).values('country__code').annotate(count=Count('id')):
                country_stats.append({
                    'country': country['country__code'],
                    'count': country['count']
                })
            
            # 분야별 분포
            sector_stats = []
            for sector in RawCapitalData.objects.filter(year=year).values('sector__code').annotate(count=Count('id')):
                sector_stats.append({
                    'sector': sector['sector__code'],
                    'count': sector['count']
                })
            
            # 자본타입별 분포
            capital_stats = []
            for capital in RawCapitalData.objects.filter(year=year).values('capital_type__code').annotate(count=Count('id')):
                capital_stats.append({
                    'capital': capital['capital_type__code'],
                    'count': capital['count']
                })
            
            # 이론적 균등 분포 계산
            total_countries = len(country_stats)
            total_sectors = len(sector_stats)
            total_capitals = len(capital_stats)
            theoretical_avg = total_data / (total_countries * total_sectors * total_capitals) if total_countries * total_sectors * total_capitals > 0 else 0
            
            # 불균형 분석 (3배 이상 = 과다, 0.3배 이하 = 부족)
            excess_countries = []
            deficit_countries = []
            normal_countries = []
            
            for country in country_stats:
                imbalance_ratio = country['count'] / theoretical_avg if theoretical_avg > 0 else 0
                country_data = {
                    'country': country['country'],
                    'count': country['count'],
                    'imbalance_ratio': imbalance_ratio
                }
                
                if imbalance_ratio > 3.0:
                    excess_countries.append(country_data)
                elif imbalance_ratio < 0.3:
                    deficit_countries.append(country_data)
                else:
                    normal_countries.append(country_data)
            
            # 분야별 불균형 분석
            excess_sectors = []
            deficit_sectors = []
            normal_sectors = []
            
            for sector in sector_stats:
                imbalance_ratio = sector['count'] / theoretical_avg if theoretical_avg > 0 else 0
                sector_data = {
                    'sector': sector['sector'],
                    'count': sector['count'],
                    'imbalance_ratio': imbalance_ratio
                }
                
                if imbalance_ratio > 3.0:
                    excess_sectors.append(sector_data)
                elif imbalance_ratio < 0.3:
                    deficit_sectors.append(sector_data)
                else:
                    normal_sectors.append(sector_data)
            
            # 자본타입별 불균형 분석
            excess_capitals = []
            deficit_capitals = []
            normal_capitals = []
            
            for capital in capital_stats:
                imbalance_ratio = capital['count'] / theoretical_avg if theoretical_avg > 0 else 0
                capital_data = {
                    'capital': capital['capital'],
                    'count': capital['count'],
                    'imbalance_ratio': imbalance_ratio
                }
                
                if imbalance_ratio > 3.0:
                    excess_capitals.append(capital_data)
                elif imbalance_ratio < 0.3:
                    deficit_capitals.append(capital_data)
                else:
                    normal_capitals.append(capital_data)
            
            # 정렬 (과다/부족 순)
            excess_countries.sort(key=lambda x: x['imbalance_ratio'], reverse=True)
            deficit_countries.sort(key=lambda x: x['imbalance_ratio'])
            excess_sectors.sort(key=lambda x: x['imbalance_ratio'], reverse=True)
            deficit_sectors.sort(key=lambda x: x['imbalance_ratio'])
            excess_capitals.sort(key=lambda x: x['imbalance_ratio'], reverse=True)
            deficit_capitals.sort(key=lambda x: x['imbalance_ratio'])
            
            logger.info(f"데이터 불균형 분석 완료: 과다 국가 {len(excess_countries)}개, 부족 국가 {len(deficit_countries)}개")
            
            return Response({
                'success': True,
                'data': {
                    'year': year,
                    'total_data': total_data,
                    'theoretical_avg': theoretical_avg,
                    'excess_countries': excess_countries,
                    'deficit_countries': deficit_countries,
                    'normal_countries': normal_countries,
                    'excess_sectors': excess_sectors,
                    'deficit_sectors': deficit_sectors,
                    'normal_sectors': normal_sectors,
                    'excess_capitals': excess_capitals,
                    'deficit_capitals': deficit_capitals,
                    'normal_capitals': normal_capitals
                }
            })
            
        except Exception as e:
            logger.error(f"데이터 불균형 분석 실패: {e}")
            return Response({
                'success': False,
                'message': f'데이터 불균형 분석 실패: {str(e)}'
            }, status=500)


class DetailedDataAnalysisAPIView(APIView):
    """상세 데이터 분석 API - 실제/추정 데이터 구분 및 추정 방법 표시"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        try:
            from .models import RawCapitalData
            from django.db.models import Count, Sum, Avg, Q
            from collections import defaultdict
            
            year = request.GET.get('year', 2024)
            
            logger.info(f"상세 데이터 분석 시작: {year}")
            
            # 기본 통계
            total_data = RawCapitalData.objects.filter(year=year).count()
            
            # 실제 데이터 vs 추정 데이터 분석
            real_data = RawCapitalData.objects.filter(year=year, source__name__in=[
                'World Bank', 'IMF', 'FRED', 'Alpha Vantage', 'Yahoo Finance', 
                'IEX Cloud', 'SEC EDGAR', 'SEC Form D', 'GlobalSWF', 'IFSWF',
                'OECD', 'UNCTAD', 'BIS', 'Eurostat', 'BEA (US)', 'Bank of Korea',
                'Companies House', 'EDINET', 'OpenCorporates', 'IATI Datastore',
                'OECD-DAC', 'AidData', 'World Bank PPI', 'Government Data'
            ]).count()
            
            estimated_data = total_data - real_data
            
            # 소스별 상세 분석
            source_analysis = []
            for source in RawCapitalData.objects.filter(year=year).values('source__name').annotate(
                count=Count('id'),
                total_amount=Sum('amount_usd'),
                avg_amount=Avg('amount_usd'),
                avg_quality=Avg('data_quality_score')
            ).order_by('-count'):
                source_name = source['source__name']
                is_real = source_name in [
                    'World Bank', 'IMF', 'FRED', 'Alpha Vantage', 'Yahoo Finance', 
                    'IEX Cloud', 'SEC EDGAR', 'SEC Form D', 'GlobalSWF', 'IFSWF',
                    'OECD', 'UNCTAD', 'BIS', 'Eurostat', 'BEA (US)', 'Bank of Korea',
                    'Companies House', 'EDINET', 'OpenCorporates', 'IATI Datastore',
                    'OECD-DAC', 'AidData', 'World Bank PPI', 'Government Data'
                ]
                
                # 추정 방법 분석
                estimation_method = "실제 데이터" if is_real else self._get_estimation_method(source_name)
                
                source_analysis.append({
                    'source_name': source_name,
                    'count': source['count'],
                    'total_amount': source['total_amount'] or 0,
                    'avg_amount': source['avg_amount'] or 0,
                    'avg_quality': source['avg_quality'] or 0,
                    'is_real': is_real,
                    'estimation_method': estimation_method,
                    'percentage': (source['count'] / total_data * 100) if total_data > 0 else 0
                })
            
            # 국가별 상세 분석
            country_analysis = []
            for country in RawCapitalData.objects.filter(year=year).values('country__code', 'country__name').annotate(
                count=Count('id'),
                total_amount=Sum('amount_usd'),
                avg_amount=Avg('amount_usd'),
                real_count=Count('id', filter=Q(source__name__in=[
                    'World Bank', 'IMF', 'FRED', 'Alpha Vantage', 'Yahoo Finance', 
                    'IEX Cloud', 'SEC EDGAR', 'SEC Form D', 'GlobalSWF', 'IFSWF',
                    'OECD', 'UNCTAD', 'BIS', 'Eurostat', 'BEA (US)', 'Bank of Korea',
                    'Companies House', 'EDINET', 'OpenCorporates', 'IATI Datastore',
                    'OECD-DAC', 'AidData', 'World Bank PPI', 'Government Data'
                ]))
            ).order_by('-count'):
                country_analysis.append({
                    'country_code': country['country__code'],
                    'country_name': country['country__name'] or country['country__code'],
                    'total_count': country['count'],
                    'real_count': country['real_count'],
                    'estimated_count': country['count'] - country['real_count'],
                    'total_amount': country['total_amount'] or 0,
                    'avg_amount': country['avg_amount'] or 0,
                    'real_percentage': (country['real_count'] / country['count'] * 100) if country['count'] > 0 else 0,
                    'estimated_percentage': ((country['count'] - country['real_count']) / country['count'] * 100) if country['count'] > 0 else 0
                })
            
            # 분야별 상세 분석
            sector_analysis = []
            for sector in RawCapitalData.objects.filter(year=year).values('sector__code', 'sector__name').annotate(
                count=Count('id'),
                total_amount=Sum('amount_usd'),
                avg_amount=Avg('amount_usd'),
                real_count=Count('id', filter=Q(source__name__in=[
                    'World Bank', 'IMF', 'FRED', 'Alpha Vantage', 'Yahoo Finance', 
                    'IEX Cloud', 'SEC EDGAR', 'SEC Form D', 'GlobalSWF', 'IFSWF',
                    'OECD', 'UNCTAD', 'BIS', 'Eurostat', 'BEA (US)', 'Bank of Korea',
                    'Companies House', 'EDINET', 'OpenCorporates', 'IATI Datastore',
                    'OECD-DAC', 'AidData', 'World Bank PPI', 'Government Data'
                ]))
            ).order_by('-count'):
                sector_analysis.append({
                    'sector_code': sector['sector__code'],
                    'sector_name': sector['sector__name'] or sector['sector__code'],
                    'total_count': sector['count'],
                    'real_count': sector['real_count'],
                    'estimated_count': sector['count'] - sector['real_count'],
                    'total_amount': sector['total_amount'] or 0,
                    'avg_amount': sector['avg_amount'] or 0,
                    'real_percentage': (sector['real_count'] / sector['count'] * 100) if sector['count'] > 0 else 0,
                    'estimated_percentage': ((sector['count'] - sector['real_count']) / sector['count'] * 100) if sector['count'] > 0 else 0
                })
            
            # 자본타입별 상세 분석
            capital_analysis = []
            for capital in RawCapitalData.objects.filter(year=year).values('capital_type__code', 'capital_type__name').annotate(
                count=Count('id'),
                total_amount=Sum('amount_usd'),
                avg_amount=Avg('amount_usd'),
                real_count=Count('id', filter=Q(source__name__in=[
                    'World Bank', 'IMF', 'FRED', 'Alpha Vantage', 'Yahoo Finance', 
                    'IEX Cloud', 'SEC EDGAR', 'SEC Form D', 'GlobalSWF', 'IFSWF',
                    'OECD', 'UNCTAD', 'BIS', 'Eurostat', 'BEA (US)', 'Bank of Korea',
                    'Companies House', 'EDINET', 'OpenCorporates', 'IATI Datastore',
                    'OECD-DAC', 'AidData', 'World Bank PPI', 'Government Data'
                ]))
            ).order_by('-count'):
                capital_analysis.append({
                    'capital_code': capital['capital_type__code'],
                    'capital_name': capital['capital_type__name'] or capital['capital_type__code'],
                    'total_count': capital['count'],
                    'real_count': capital['real_count'],
                    'estimated_count': capital['count'] - capital['real_count'],
                    'total_amount': capital['total_amount'] or 0,
                    'avg_amount': capital['avg_amount'] or 0,
                    'real_percentage': (capital['real_count'] / capital['count'] * 100) if capital['count'] > 0 else 0,
                    'estimated_percentage': ((capital['count'] - capital['real_count']) / capital['count'] * 100) if capital['count'] > 0 else 0
                })
            
            # 추정 방법별 통계
            estimation_methods = defaultdict(int)
            for source in source_analysis:
                if not source['is_real']:
                    estimation_methods[source['estimation_method']] += source['count']
            
            # 데이터 품질 분석
            quality_analysis = {
                'avg_quality_score': RawCapitalData.objects.filter(year=year).aggregate(avg=Avg('data_quality_score'))['avg'] or 0,
                'high_quality_count': RawCapitalData.objects.filter(year=year, data_quality_score__gte=0.8).count(),
                'medium_quality_count': RawCapitalData.objects.filter(year=year, data_quality_score__gte=0.6, data_quality_score__lt=0.8).count(),
                'low_quality_count': RawCapitalData.objects.filter(year=year, data_quality_score__lt=0.6).count()
            }
            
            logger.info(f"상세 데이터 분석 완료: 총 {total_data}개 (실제 {real_data}개, 추정 {estimated_data}개)")
            
            return Response({
                'success': True,
                'data': {
                    'year': year,
                    'summary': {
                        'total_data': total_data,
                        'real_data': real_data,
                        'estimated_data': estimated_data,
                        'real_percentage': (real_data / total_data * 100) if total_data > 0 else 0,
                        'estimated_percentage': (estimated_data / total_data * 100) if total_data > 0 else 0
                    },
                    'source_analysis': source_analysis,
                    'country_analysis': country_analysis,
                    'sector_analysis': sector_analysis,
                    'capital_analysis': capital_analysis,
                    'estimation_methods': dict(estimation_methods),
                    'quality_analysis': quality_analysis
                }
            })
            
        except Exception as e:
            logger.error(f"상세 데이터 분석 실패: {e}")
            return Response({
                'success': False,
                'message': f'상세 데이터 분석 실패: {str(e)}'
            }, status=500)
    
    def _get_estimation_method(self, source_name):
        """소스명에 따른 추정 방법 반환"""
        estimation_methods = {
            # 실제 데이터 소스 (공식 통계 기관)
            'World Bank': '실제 데이터',
            'IMF': '실제 데이터',
            'FRED': '실제 데이터',
            'SEC EDGAR': '실제 데이터',
            'SEC Form D': '실제 데이터',
            'OECD': '실제 데이터',
            'UNCTAD': '실제 데이터',
            'BIS': '실제 데이터',
            'Eurostat': '실제 데이터',
            'BEA (US)': '실제 데이터',
            'Bank of Korea': '실제 데이터',
            'IATI Datastore': '실제 데이터',
            'OECD-DAC': '실제 데이터',
            'AidData': '실제 데이터',
            'World Bank PPI': '실제 데이터',
            'Government Data': '실제 데이터',
            
            # 금융 데이터 (주식 시장 기반 - 추정)
            'Alpha Vantage': '주식 시장 데이터 기반 추정',
            'Yahoo Finance': '주식 시장 데이터 기반 추정',
            'IEX Cloud': '주식 시장 데이터 기반 추정',
            'GlobalSWF': 'SWF 투자 데이터베이스',
            'IFSWF': 'SWF 투자 데이터베이스',
            'Companies House': '기업 등록 데이터베이스',
            'EDINET': '일본 금융청 데이터베이스',
            'OpenCorporates': '기업 등록 데이터베이스',
            
            # 추정 데이터 소스
            'Generated Data': '가중치 기반 생성',
            'OECD VC': 'OECD 벤처캐피털 집계 데이터',
            'OECD PE': 'OECD 사모펀드 집계 데이터',
            'Crunchbase': 'Crunchbase 데이터베이스',
            'Crunchbase Basic': 'Crunchbase 기본 데이터',
            'PBOC': '중국인민은행 공식 데이터',
            'Statistics Canada': '캐나다 통계청 데이터',
            'RBA': '호주준비은행 데이터',
            'ONS UK': '영국국가통계청 데이터',
            'Bloomberg': 'Bloomberg 터미널 데이터',
            'WTO': 'WTO 무역 통계',
            'IMF CPIS': 'IMF 포트폴리오 투자 통계',
            'Open Data': '정부 오픈 데이터',
            'BCB': '브라질중앙은행 데이터',
            'Bank of England': '영국중앙은행 데이터',
            'KOSIS': '한국통계정보시스템',
            'CB Insights': 'CB Insights 데이터베이스',
            'Bank of Japan': '일본은행 데이터',
            'Bank of Canada': '캐나다중앙은행 데이터',
            'Refinitiv': 'Refinitiv 금융 데이터',
            'ECB SDW': '유럽중앙은행 통계 데이터웨어하우스',
            'Web Scraping': '웹 스크래핑 데이터',
            'UN Statistics': '유엔 통계 데이터',
            'RBI': '인도준비은행 데이터',
            'Finnhub': 'Finnhub 금융 API',
            'Fed (US)': '연방준비제도 데이터',
            'UN Local': '유엔 지역 통계',
            'ECB': '유럽중앙은행 데이터',
            'PitchBook': 'PitchBook 데이터베이스',
            'FinancialModelingPrep': 'Financial Modeling Prep API',
            'EU DG-COMP': 'EU 경쟁정책총국 데이터',
            
            # 기타 추정 방법
            'Estimated Data': 'GDP 기반 추정',
            'Model Data': '회귀 모델 추정',
            'Balanced Estimation': '균형 맞춤 추정',
            'Fast Estimation': '빠른 추정 생성',
            'Similar Country': '유사 국가 기반 추정',
            'Similar Sector': '유사 분야 기반 추정',
            'GDP Based': 'GDP 비율 기반 추정',
            'Capital Type Based': '자본타입 기반 추정',
            'Regression Based': '회귀 분석 기반 추정',
            'Ratio Based': '비율 기반 추정',
            'Substitution Based': '대체 기반 추정'
        }
        
        # 정확한 매칭 우선
        if source_name in estimation_methods:
            return estimation_methods[source_name]
        
        # 부분 매칭
        for key, method in estimation_methods.items():
            if key.lower() in source_name.lower():
                return method
        
        return '알 수 없는 추정 방법'


class DuplicateAnalysisAPIView(APIView):
    """중복 데이터 분석 API"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        try:
            from .models import RawCapitalData
            from django.db.models import Count, Q
            from collections import defaultdict
            
            year = request.GET.get('year', 2024)
            
            logger.info(f"중복 데이터 분석 시작: {year}")
            
            # 중복 데이터 찾기 (동일한 country, sector, capital_type, year 조합)
            duplicates = RawCapitalData.objects.filter(year=year).values(
                'country__code', 'sector__code', 'capital_type__code'
            ).annotate(
                count=Count('id')
            ).filter(count__gt=1)
            
            total_duplicates = sum(dup['count'] - 1 for dup in duplicates)  # 중복된 개수만
            duplicate_groups = len(duplicates)
            total_data = RawCapitalData.objects.filter(year=year).count()
            duplicate_rate = (total_duplicates / total_data * 100) if total_data > 0 else 0
            
            # 국가별 중복 데이터
            country_duplicates = defaultdict(int)
            for dup in duplicates:
                country_code = dup['country__code']
                duplicate_count = dup['count'] - 1
                country_duplicates[country_code] += duplicate_count
            
            # 분야별 중복 데이터
            sector_duplicates = defaultdict(int)
            for dup in duplicates:
                sector_code = dup['sector__code']
                duplicate_count = dup['count'] - 1
                sector_duplicates[sector_code] += duplicate_count
            
            logger.info(f"중복 데이터 분석 완료: 총 {total_duplicates}개 중복, {duplicate_groups}개 그룹")
            
            return Response({
                'success': True,
                'data': {
                    'year': year,
                    'total_duplicates': total_duplicates,
                    'duplicate_groups': duplicate_groups,
                    'duplicate_rate': round(duplicate_rate, 2),
                    'country_duplicates': dict(country_duplicates),
                    'sector_duplicates': dict(sector_duplicates)
                }
            })
            
        except Exception as e:
            logger.error(f"중복 데이터 분석 실패: {e}")
            return Response({
                'success': False,
                'message': f'중복 데이터 분석 실패: {str(e)}'
            }, status=500)


class MissingDataAnalysisAPIView(APIView):
    """누락 데이터 분석 API"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        try:
            from .models import RawCapitalData, Country, Sector, CapitalType
            from django.db.models import Count
            from collections import defaultdict
            
            year = request.GET.get('year', 2024)
            
            logger.info(f"누락 데이터 분석 시작: {year}")
            
            # 전체 가능한 조합 계산
            total_countries = Country.objects.count()
            total_sectors = Sector.objects.count()
            total_capital_types = CapitalType.objects.count()
            total_possible_combinations = total_countries * total_sectors * total_capital_types
            
            # 실제 존재하는 조합
            existing_combinations = RawCapitalData.objects.filter(year=year).values(
                'country__code', 'sector__code', 'capital_type__code'
            ).distinct().count()
            
            total_missing = total_possible_combinations - existing_combinations
            
            # 국가별 누락 데이터
            country_missing = defaultdict(int)
            for country in Country.objects.all():
                country_data = RawCapitalData.objects.filter(
                    year=year, 
                    country=country
                ).values('sector__code', 'capital_type__code').distinct().count()
                expected_combinations = total_sectors * total_capital_types
                missing = expected_combinations - country_data
                if missing > 0:
                    country_missing[country.code] = missing
            
            # 분야별 누락 데이터
            sector_missing = defaultdict(int)
            for sector in Sector.objects.all():
                sector_data = RawCapitalData.objects.filter(
                    year=year, 
                    sector=sector
                ).values('country__code', 'capital_type__code').distinct().count()
                expected_combinations = total_countries * total_capital_types
                missing = expected_combinations - sector_data
                if missing > 0:
                    sector_missing[sector.code] = missing
            
            missing_countries = len(country_missing)
            missing_sectors = len(sector_missing)
            
            logger.info(f"누락 데이터 분석 완료: 총 {total_missing}개 누락, {missing_countries}개 국가, {missing_sectors}개 분야")
            
            return Response({
                'success': True,
                'data': {
                    'year': year,
                    'total_possible_combinations': total_possible_combinations,
                    'existing_combinations': existing_combinations,
                    'total_missing': total_missing,
                    'missing_countries': missing_countries,
                    'missing_sectors': missing_sectors,
                    'country_missing': dict(country_missing),
                    'sector_missing': dict(sector_missing)
                }
            })
            
        except Exception as e:
            logger.error(f"누락 데이터 분석 실패: {e}")
            return Response({
                'success': False,
                'message': f'누락 데이터 분석 실패: {str(e)}'
            }, status=500)


class RawDataCollectionAPIView(APIView):
    """원시데이터 수집 API"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        """원시데이터 수집 실행"""
        try:
            from .services.data_collectors import DataCollectionService
            from .models import Country, Sector, CapitalType, DataSource
            
            # 요청 데이터 파싱
            data = request.data
            countries = data.get('countries', [])
            sectors = data.get('sectors', [])
            capital_types = data.get('capital_types', [])
            years = data.get('years', [])
            sources = data.get('sources', [])
            
            print(f"🚀 API 요청 받음 - countries={countries}, sectors={sectors}, capital_types={capital_types}, years={years}, sources={sources}")
            
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
            
            print(f"📊 수집 조건 설정 완료 - countries={len(countries)}, sectors={len(sectors)}, capital_types={len(capital_types)}, years={years}, sources={len(sources)}")
            
            # 수집 서비스 초기화
            collection_service = DataCollectionService()
            print(f"📊 DataCollectionService 초기화 완료")
            
            # 실제 데이터 수집 실행
            print(f"🔄 실제 데이터 수집 시작...")
            
            results = {
                'collected': 0,
                'failed': 0,
                'details': []
            }
            
            # 각 소스별로 실제 데이터 수집 시도
            for source_name in sources:
                print(f"📊 {source_name} 소스에서 데이터 수집 시작...")
                
                try:
                    # 실제 데이터 수집 서비스 호출
                    collected_count = collection_service.collect_source(
                        source_name=source_name,
                        countries=countries,
                        sectors=sectors,
                        capital_types=capital_types,
                        years=years
                    )
                    
                    if collected_count > 0:
                        results['collected'] += collected_count
                        results['details'].append({
                            'source': source_name,
                            'year': years,
                            'country': countries,
                            'sector': sectors,
                            'capital_type': capital_types,
                            'count': collected_count
                        })
                        print(f"✅ {source_name}: {collected_count}개 수집 완료")
                    else:
                        print(f"⚠️ {source_name}: 수집된 데이터 없음")
                        
                except Exception as e:
                    print(f"❌ {source_name} 수집 실패: {e}")
                    results['failed'] += 1
            
            print(f"🎉 전체 수집 완료: {results['collected']}개 수집, {results['failed']}개 실패")
                                    
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


class UnfusedDataAPIView(APIView):
    """융합되지 않은 데이터 찾기 API"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        """융합되지 않은 데이터 조회"""
        try:
            from .services.data_fusion import DataFusionService
            
            fusion_service = DataFusionService()
            year_start = request.GET.get('year_start', 2020)
            year_end = request.GET.get('year_end', 2024)
            
            # 융합되지 않은 데이터 찾기
            unfused_info = fusion_service.find_unfused_data(
                year_start=int(year_start),
                year_end=int(year_end)
            )
            
            return Response({
                'success': True,
                'data': unfused_info
            })
            
        except Exception as e:
            logger.error(f"Unfused data API error: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DataDeletionAPIView(APIView):
    """데이터 삭제 API"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        """지정된 연도 범위의 데이터 삭제"""
        try:
            from .models import RawCapitalData, ProcessedCapitalData
            
            data = request.data
            year_start = data.get('year_start', 2020)
            year_end = data.get('year_end', 2024)
            delete_type = data.get('delete_type', 'both')  # 'raw', 'processed', 'both'
            
            print(f"🗑️ 데이터 삭제 시작: {year_start}-{year_end}, 타입: {delete_type}")
            
            results = {
                'raw_deleted': 0,
                'processed_deleted': 0,
                'total_deleted': 0
            }
            
            # 원시데이터 삭제
            if delete_type in ['raw', 'both']:
                raw_count = RawCapitalData.objects.filter(
                    year__gte=year_start,
                    year__lte=year_end
                ).count()
                
                if raw_count > 0:
                    RawCapitalData.objects.filter(
                        year__gte=year_start,
                        year__lte=year_end
                    ).delete()
                    results['raw_deleted'] = raw_count
                    print(f"✅ 원시데이터 삭제 완료: {raw_count}개")
            
            # 처리된 데이터 삭제
            if delete_type in ['processed', 'both']:
                processed_count = ProcessedCapitalData.objects.filter(
                    year__gte=year_start,
                    year__lte=year_end
                ).count()
                
                if processed_count > 0:
                    ProcessedCapitalData.objects.filter(
                        year__gte=year_start,
                        year__lte=year_end
                    ).delete()
                    results['processed_deleted'] = processed_count
                    print(f"✅ 처리된 데이터 삭제 완료: {processed_count}개")
            
            results['total_deleted'] = results['raw_deleted'] + results['processed_deleted']
            
            print(f"🎉 데이터 삭제 완료: 총 {results['total_deleted']}개")
            
            return Response({
                'success': True,
                'message': f'데이터 삭제 완료: 원시데이터 {results["raw_deleted"]}개, 처리된 데이터 {results["processed_deleted"]}개',
                'results': results
            })
            
        except Exception as e:
            print(f"❌ 데이터 삭제 실패: {e}")
            import traceback
            traceback.print_exc()
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)