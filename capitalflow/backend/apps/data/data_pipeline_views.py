"""
데이터 파이프라인 가시성 API
원시 데이터부터 정제된 데이터까지 전 과정 추적
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from django.db.models import Count, Sum, Avg, Q
from django.core.paginator import Paginator
from django.utils import timezone
from datetime import datetime, timedelta
import logging

from .models import (
    RawCapitalData, ProcessedCapitalData, DataSource, 
    Country, Sector, CapitalType, DataProcessingLog
)
from .serializers import (
    RawCapitalDataSerializer, ProcessedCapitalDataSerializer,
    DataProcessingLogSerializer
)

logger = logging.getLogger(__name__)


class DataPipelineOverviewAPIView(APIView):
    """데이터 파이프라인 전체 개요"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        """파이프라인 상태 및 통계 조회"""
        try:
            # 기본 통계
            raw_data_count = RawCapitalData.objects.count()
            processed_data_count = ProcessedCapitalData.objects.count()
            
            # 소스별 통계
            source_stats = []
            for source in DataSource.objects.filter(is_active=True):
                raw_count = RawCapitalData.objects.filter(source=source).count()
                avg_quality = RawCapitalData.objects.filter(source=source).aggregate(
                    avg_quality=Avg('data_quality_score')
                )['avg_quality'] or 0
                
                source_stats.append({
                    'source_name': source.name,
                    'source_type': source.source_type,
                    'reliability_weight': float(source.reliability_weight),
                    'raw_records': raw_count,
                    'avg_quality_score': round(float(avg_quality), 3),
                    'is_active': source.is_active
                })
            
            # 국가별 데이터 현황
            country_stats = list(
                ProcessedCapitalData.objects
                .values('country__code', 'country__name')
                .annotate(
                    total_records=Count('id'),
                    total_amount=Sum('final_amount_usd'),
                    avg_confidence=Avg('confidence_score')
                )
                .order_by('-total_amount')[:20]  # 상위 20개국
            )
            
            # 분야별 데이터 현황
            sector_stats = list(
                ProcessedCapitalData.objects
                .values('sector__code', 'sector__name')
                .annotate(
                    total_records=Count('id'),
                    total_amount=Sum('final_amount_usd'),
                    avg_confidence=Avg('confidence_score')
                )
                .order_by('-total_amount')
            )
            
            # 최근 처리 로그
            recent_logs = DataProcessingLog.objects.order_by('-start_time')[:10]
            log_serializer = DataProcessingLogSerializer(recent_logs, many=True)
            
            # 융합 방법별 통계
            fusion_stats = list(
                ProcessedCapitalData.objects
                .values('fusion_method')
                .annotate(
                    count=Count('id'),
                    avg_confidence=Avg('confidence_score'),
                    avg_sources=Avg('source_count')
                )
            )
            
            # 데이터 품질 분포
            quality_distribution = {
                'high_quality': ProcessedCapitalData.objects.filter(confidence_score__gte=0.9).count(),
                'medium_quality': ProcessedCapitalData.objects.filter(
                    confidence_score__gte=0.7, confidence_score__lt=0.9
                ).count(),
                'low_quality': ProcessedCapitalData.objects.filter(confidence_score__lt=0.7).count(),
            }
            
            return Response({
                'pipeline_overview': {
                    'raw_data_records': raw_data_count,
                    'processed_data_records': processed_data_count,
                    'processing_ratio': round(processed_data_count / max(raw_data_count, 1), 3),
                    'last_updated': timezone.now()
                },
                'source_statistics': source_stats,
                'country_statistics': country_stats,
                'sector_statistics': sector_stats,
                'fusion_statistics': fusion_stats,
                'quality_distribution': quality_distribution,
                'recent_processing_logs': log_serializer.data
            })
            
        except Exception as e:
            logger.error(f"파이프라인 개요 조회 실패: {e}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RawDataDetailAPIView(APIView):
    """원시 데이터 상세 조회"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        """원시 데이터 필터링 및 조회"""
        try:
            # 빠른 리턴 - 기본 통계만 제공
            if request.query_params.get('quick') == 'true':
                count = RawCapitalData.objects.count()
                return Response({
                    'count': count,
                    'message': f'총 {count}개의 원시 데이터가 있습니다. page_size 파라미터로 상세 조회 가능합니다.'
                })
                
            # 기본 동작
            if not RawCapitalData.objects.exists():
                return Response({
                    'count': 0,
                    'results': [],
                    'message': '원시 데이터가 없습니다.'
                })
            # 필터 파라미터
            source_name = request.query_params.get('source')
            country_code = request.query_params.get('country')
            sector_code = request.query_params.get('sector')
            capital_type_code = request.query_params.get('capital_type')
            year = request.query_params.get('year')
            min_quality = request.query_params.get('min_quality', 0)
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 50))
            
            # 쿼리 구성
            queryset = RawCapitalData.objects.select_related(
                'source', 'country', 'sector', 'capital_type'
            )
            
            if source_name:
                queryset = queryset.filter(source__name=source_name)
            if country_code:
                queryset = queryset.filter(country__code=country_code)
            if sector_code:
                queryset = queryset.filter(sector__code=sector_code)
            if capital_type_code:
                queryset = queryset.filter(capital_type__code=capital_type_code)
            if year:
                queryset = queryset.filter(year=int(year))
            if min_quality:
                queryset = queryset.filter(data_quality_score__gte=float(min_quality))
            
            queryset = queryset.order_by('-collection_date')
            
            # 페이지네이션
            paginator = Paginator(queryset, page_size)
            page_obj = paginator.get_page(page)
            
            # 간단한 응답 (시리얼라이저 문제 방지)
            results = []
            for obj in page_obj.object_list:
                results.append({
                    'id': str(obj.id),
                    'source_name': obj.source.name,
                    'country_code': obj.country.code,
                    'country_name': obj.country.name,
                    'sector_code': obj.sector.code,
                    'sector_name': obj.sector.name,
                    'capital_type_code': obj.capital_type.code,
                    'capital_type_name': obj.capital_type.name,
                    'year': obj.year,
                    'raw_amount': str(obj.raw_amount),
                    'raw_currency': obj.raw_currency,
                    'amount_usd': str(obj.amount_usd),
                    'exchange_rate': str(obj.exchange_rate) if obj.exchange_rate else None,
                    'collection_date': obj.collection_date.isoformat(),
                    'data_quality_score': obj.data_quality_score,
                    'is_outlier': obj.is_outlier,
                    'is_verified': obj.is_verified
                })
            
            return Response({
                'count': paginator.count,
                'total_pages': paginator.num_pages,
                'current_page': page,
                'page_size': page_size,
                'results': results
            })
            
        except Exception as e:
            logger.error(f"원시 데이터 조회 실패: {e}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ProcessedDataDetailAPIView(APIView):
    """정제된 데이터 상세 조회"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        """정제된 데이터 필터링 및 조회"""
        try:
            # 필터 파라미터
            country_code = request.query_params.get('country')
            sector_code = request.query_params.get('sector')
            capital_type_code = request.query_params.get('capital_type')
            year = request.query_params.get('year')
            fusion_method = request.query_params.get('fusion_method')
            min_confidence = request.query_params.get('min_confidence', 0)
            include_predicted = request.query_params.get('include_predicted', 'true').lower() == 'true'
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 50))
            
            # 쿼리 구성
            queryset = ProcessedCapitalData.objects.select_related(
                'country', 'sector', 'capital_type'
            )
            
            if country_code:
                queryset = queryset.filter(country__code=country_code)
            if sector_code:
                queryset = queryset.filter(sector__code=sector_code)
            if capital_type_code:
                queryset = queryset.filter(capital_type__code=capital_type_code)
            if year:
                queryset = queryset.filter(year=int(year))
            if fusion_method:
                queryset = queryset.filter(fusion_method=fusion_method)
            if min_confidence:
                queryset = queryset.filter(confidence_score__gte=float(min_confidence))
            if not include_predicted:
                queryset = queryset.filter(is_predicted=False)
            
            queryset = queryset.order_by('-processing_date')
            
            # 페이지네이션
            paginator = Paginator(queryset, page_size)
            page_obj = paginator.get_page(page)
            
            # 시리얼라이즈
            serializer = ProcessedCapitalDataSerializer(page_obj.object_list, many=True)
            
            return Response({
                'count': paginator.count,
                'total_pages': paginator.num_pages,
                'current_page': page,
                'page_size': page_size,
                'results': serializer.data
            })
            
        except Exception as e:
            logger.error(f"정제된 데이터 조회 실패: {e}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DataTraceabilityAPIView(APIView):
    """특정 데이터의 추적성 확인"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        """특정 데이터의 원시→정제 전 과정 추적"""
        try:
            # 필수 파라미터
            country_code = request.query_params.get('country')
            sector_code = request.query_params.get('sector')
            capital_type_code = request.query_params.get('capital_type')
            year = request.query_params.get('year')
            
            if not all([country_code, sector_code, capital_type_code, year]):
                return Response(
                    {'error': 'country, sector, capital_type, year 파라미터가 필요합니다'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 정제된 데이터 조회
            try:
                processed_data = ProcessedCapitalData.objects.select_related(
                    'country', 'sector', 'capital_type'
                ).get(
                    country__code=country_code,
                    sector__code=sector_code,
                    capital_type__code=capital_type_code,
                    year=int(year)
                )
            except ProcessedCapitalData.DoesNotExist:
                return Response(
                    {'error': '해당 조건의 정제된 데이터를 찾을 수 없습니다'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # 관련 원시 데이터 조회
            raw_data_list = RawCapitalData.objects.select_related(
                'source', 'country', 'sector', 'capital_type'
            ).filter(
                country__code=country_code,
                sector__code=sector_code,
                capital_type__code=capital_type_code,
                year=int(year)
            ).order_by('-data_quality_score')
            
            # 시리얼라이즈
            processed_serializer = ProcessedCapitalDataSerializer(processed_data)
            raw_serializer = RawCapitalDataSerializer(raw_data_list, many=True)
            
            # 융합 분석
            fusion_analysis = self._analyze_fusion_process(processed_data, raw_data_list)
            
            return Response({
                'processed_data': processed_serializer.data,
                'raw_data_sources': raw_serializer.data,
                'fusion_analysis': fusion_analysis,
                'traceability': {
                    'source_count': len(raw_data_list),
                    'fusion_method': processed_data.fusion_method,
                    'confidence_score': float(processed_data.confidence_score),
                    'variance': float(processed_data.variance) if processed_data.variance else 0,
                    'is_predicted': processed_data.is_predicted,
                    'prediction_model': processed_data.prediction_model or 'N/A'
                }
            })
            
        except Exception as e:
            logger.error(f"데이터 추적성 조회 실패: {e}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _analyze_fusion_process(self, processed_data, raw_data_list):
        """융합 과정 분석"""
        if not raw_data_list:
            return {'message': '원시 데이터가 없습니다'}
        
        raw_amounts = [float(rd.amount_usd) for rd in raw_data_list]
        weights = [float(rd.data_quality_score) for rd in raw_data_list]
        
        # 가중평균 계산 검증
        if len(raw_amounts) > 1:
            weighted_avg = sum(amount * weight for amount, weight in zip(raw_amounts, weights)) / sum(weights)
            simple_avg = sum(raw_amounts) / len(raw_amounts)
            
            return {
                'raw_amounts': raw_amounts,
                'quality_weights': weights,
                'simple_average': round(simple_avg, 2),
                'weighted_average': round(weighted_avg, 2),
                'final_amount': float(processed_data.final_amount_usd),
                'difference_from_weighted': round(float(processed_data.final_amount_usd) - weighted_avg, 2),
                'variance_explanation': '다중 소스 간 편차' if processed_data.variance > 0 else '단일 소스 또는 일치',
                'sources_used': [rd.source.name for rd in raw_data_list]
            }
        else:
            return {
                'raw_amounts': raw_amounts,
                'quality_weights': weights,
                'final_amount': float(processed_data.final_amount_usd),
                'variance_explanation': '단일 소스 데이터',
                'sources_used': [raw_data_list[0].source.name]
            }


class DataQualityAnalysisAPIView(APIView):
    """데이터 품질 분석 API"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        """전체적인 데이터 품질 분석"""
        try:
            # 소스별 품질 분석
            source_quality = []
            for source in DataSource.objects.filter(is_active=True):
                raw_data = RawCapitalData.objects.filter(source=source)
                
                if raw_data.exists():
                    stats = raw_data.aggregate(
                        count=Count('id'),
                        avg_quality=Avg('data_quality_score'),
                        avg_amount=Avg('amount_usd')
                    )
                    
                    source_quality.append({
                        'source_name': source.name,
                        'source_type': source.source_type,
                        'reliability_weight': float(source.reliability_weight),
                        'record_count': stats['count'],
                        'avg_quality_score': round(float(stats['avg_quality']), 3),
                        'avg_amount_usd': round(float(stats['avg_amount']), 2) if stats['avg_amount'] else 0
                    })
            
            # 융합 방법별 성능
            fusion_performance = list(
                ProcessedCapitalData.objects
                .values('fusion_method')
                .annotate(
                    count=Count('id'),
                    avg_confidence=Avg('confidence_score'),
                    avg_variance=Avg('variance'),
                    avg_sources=Avg('source_count')
                )
            )
            
            # 시간별 데이터 품질 트렌드
            quality_trends = []
            for year in range(2020, 2025):
                year_data = ProcessedCapitalData.objects.filter(year=year).aggregate(
                    count=Count('id'),
                    avg_confidence=Avg('confidence_score')
                )
                
                if year_data['count']:
                    quality_trends.append({
                        'year': year,
                        'record_count': year_data['count'],
                        'avg_confidence': round(float(year_data['avg_confidence']), 3)
                    })
            
            # 이상치 및 문제 데이터
            issues = {
                'low_confidence_records': ProcessedCapitalData.objects.filter(confidence_score__lt=0.7).count(),
                'high_variance_records': ProcessedCapitalData.objects.filter(variance__gt=1000000000).count(),  # 10억 이상 편차
                'predicted_records': ProcessedCapitalData.objects.filter(is_predicted=True).count(),
                'unverified_raw_records': RawCapitalData.objects.filter(is_verified=False).count()
            }
            
            # 프론트엔드용 형식으로 변환
            total_records = ProcessedCapitalData.objects.count()
            
            # 소스별 데이터 분포 (프론트엔드 형식)
            by_source = []
            for sq in source_quality:
                by_source.append({
                    'source': sq['source_name'],
                    'count': sq['record_count'],
                    'avgConfidence': sq['avg_quality_score']
                })
            
            # 국가별 데이터 분포
            by_country = list(
                ProcessedCapitalData.objects
                .values('country__name')
                .annotate(
                    count=Count('id'),
                    avg_confidence=Avg('confidence_score')
                )
                .order_by('-count')[:10]
            )
            
            # 분야별 데이터 분포
            by_sector = list(
                ProcessedCapitalData.objects
                .values('sector__name')
                .annotate(
                    count=Count('id'),
                    avg_confidence=Avg('confidence_score')
                )
                .order_by('-count')
            )
            
            # 연도별 데이터 분포
            by_year = []
            for trend in quality_trends:
                by_year.append({
                    'year': trend['year'],
                    'count': trend['record_count'],
                    'avgConfidence': trend['avg_confidence']
                })
            
            # 누락된 데이터 분석 (간단한 버전)
            missing_data = []
            # 모든 가능한 조합 중 실제 데이터가 없는 것 찾기
            countries = Country.objects.filter(is_active=True)[:5]  # 상위 5개국만
            sectors = Sector.objects.filter(is_active=True).exclude(code='ALL')[:3]  # 상위 3개 분야만
            capital_types = CapitalType.objects.filter(is_active=True)[:3]  # 상위 3개 자본타입만
            years = [2023, 2024]
            
            for country in countries:
                for sector in sectors:
                    for capital_type in capital_types:
                        for year in years:
                            exists = ProcessedCapitalData.objects.filter(
                                country=country,
                                sector=sector,
                                capital_type=capital_type,
                                year=year
                            ).exists()
                            if not exists:
                                missing_data.append({
                                    'country': country.name,
                                    'sector': sector.name,
                                    'capitalType': capital_type.name,
                                    'year': year
                                })
            
            return Response({
                'totalRecords': total_records,
                'bySource': by_source,
                'byCountry': by_country,
                'bySector': by_sector,
                'byYear': by_year,
                'missingData': missing_data[:20],  # 최대 20개만 반환
                'source_quality_analysis': source_quality,
                'fusion_performance': fusion_performance,
                'quality_trends_by_year': quality_trends,
                'data_issues': issues,
                'recommendations': self._generate_quality_recommendations(issues, source_quality)
            })
            
        except Exception as e:
            logger.error(f"데이터 품질 분석 실패: {e}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _generate_quality_recommendations(self, issues, source_quality):
        """품질 개선 권장사항 생성"""
        recommendations = []
        
        if issues['low_confidence_records'] > 100:
            recommendations.append("낮은 신뢰도 레코드가 많습니다. 소스 검증 강화 필요")
        
        if issues['high_variance_records'] > 50:
            recommendations.append("높은 편차 레코드가 발견됨. 이상치 탐지 알고리즘 개선 필요")
        
        if issues['unverified_raw_records'] > 200:
            recommendations.append("검증되지 않은 원시 데이터가 많음. 자동 검증 프로세스 강화 필요")
        
        # 소스별 품질 문제
        low_quality_sources = [sq for sq in source_quality if sq['avg_quality_score'] < 0.7]
        if low_quality_sources:
            recommendations.append(f"품질이 낮은 소스 확인 필요: {', '.join([sq['source_name'] for sq in low_quality_sources])}")
        
        if not recommendations:
            recommendations.append("전반적인 데이터 품질이 양호합니다")
        
        return recommendations
