"""
Views for visualization configuration and data.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from django.core.cache import cache
from apps.data.models import RawCapitalData, Country, Sector, CapitalType
import json
import hashlib


@api_view(['GET'])
@permission_classes([AllowAny])
def map_config(request):
    """Get configuration for map visualization."""
    config = {
        'mapbox_style': 'mapbox://styles/mapbox/light-v10',
        'initial_view': {
            'latitude': 30.0,
            'longitude': 0.0,
            'zoom': 2,
            'pitch': 0,
            'bearing': 0
        },
        'color_schemes': {
            'capital_intensity': [
                '#f7fbff',
                '#deebf7',
                '#c6dbef',
                '#9ecae1',
                '#6baed6',
                '#4292c6',
                '#2171b5',
                '#08519c',
                '#08306b'
            ]
        },
        'animation': {
            'duration': 1000,
            'easing': 'ease-in-out'
        }
    }
    return Response(config)


@api_view(['GET'])
@permission_classes([AllowAny])
def map_data(request):
    """Get map data for visualization with caching."""
    year = request.GET.get('year', 2024)
    sector = request.GET.get('sector', '')
    capital_types = request.GET.getlist('capital_types')
    
    # 캐시 키 생성
    cache_key = f"map_data_{year}_{sector}_{'_'.join(sorted(capital_types))}"
    cache_key = hashlib.md5(cache_key.encode()).hexdigest()
    
    # 캐시에서 데이터 확인 (5분 캐시)
    cached_data = cache.get(cache_key)
    if cached_data:
        print(f"✅ Cache hit for {cache_key}")
        return Response(cached_data)
    
    # 분야 코드를 한국어 이름으로 매핑
    sector_mapping = {
        'AI': '인공지능',
        'SEMICONDUCTOR': '반도체',
        'BIO': '바이오',
        'ENERGY': '에너지',
        'FINTECH': '핀테크',
        'AUTOMOTIVE': '자동차',
        'AEROSPACE': '항공우주',
        'TELECOM': '통신',
        'REALESTATE': '부동산',
        'AGRICULTURE': '농업',
    }
    
    # 영어 코드를 한국어 이름으로 변환
    if sector and sector in sector_mapping:
        sector = sector_mapping[sector]
    
    try:
        # 해당 연도의 데이터 조회
        data_query = RawCapitalData.objects.filter(year=int(year))
        
        # 분야 필터 적용
        if sector:
            data_query = data_query.filter(sector__name=sector)
        
        # 자본타입 필터 적용
        if capital_types:
            data_query = data_query.filter(capital_type__code__in=capital_types)
        
        if not data_query.exists():
            return Response({
                'success': False,
                'message': f'{year}년 데이터가 없습니다.',
                'data': {
                    'countries': [],
                    'total_amount': 0,
                    'total_count': 0
                }
            })
        
        # 국가별 데이터 집계 (최적화된 쿼리)
        country_data = data_query.values('country__name', 'country__code', 'country__latitude', 'country__longitude').annotate(
            total_amount=Sum('amount_usd'),
            data_count=Count('id'),
            real_data_count=Count('id', filter=Q(is_estimated=False)),
            estimated_data_count=Count('id', filter=Q(is_estimated=True))
        ).order_by('-total_amount')
        
        # 자본타입별 데이터를 한 번에 가져오기 (N+1 쿼리 문제 해결)
        capital_type_data = data_query.values(
            'country__code', 'capital_type__name', 'capital_type__code'
        ).annotate(
            amount=Sum('amount_usd'),
            count=Count('id')
        )
        
        # 국가별 자본타입 데이터를 딕셔너리로 구성
        capital_types_by_country = {}
        for cap_type in capital_type_data:
            country_code = cap_type['country__code']
            if country_code not in capital_types_by_country:
                capital_types_by_country[country_code] = {}
            
            capital_types_by_country[country_code][cap_type['capital_type__code']] = {
                'name': cap_type['capital_type__name'],
                'amount': float(cap_type['amount'] or 0),
                'count': cap_type['count']
            }
        
        # 국가별 데이터 구성
        countries = []
        for country in country_data:
            country_code = country['country__code']
            countries.append({
                'name': country['country__name'],
                'code': country_code,
                'latitude': float(country['country__latitude'] or 0),
                'longitude': float(country['country__longitude'] or 0),
                'total_amount': float(country['total_amount'] or 0),
                'data_count': country['data_count'],
                'real_data_count': country['real_data_count'],
                'estimated_data_count': country['estimated_data_count'],
                'capital_types': capital_types_by_country.get(country_code, {})
            })
        
        # 전체 통계
        total_amount = sum(country['total_amount'] for country in countries)
        total_count = sum(country['data_count'] for country in countries)
        real_count = sum(country['real_data_count'] for country in countries)
        estimated_count = sum(country['estimated_data_count'] for country in countries)
        
        response_data = {
            'success': True,
            'data': {
                'countries': countries,
                'total_amount': total_amount,
                'total_count': total_count,
                'real_count': real_count,
                'estimated_count': estimated_count,
                'real_ratio': real_count / total_count if total_count > 0 else 0,
                'year': int(year),
                'filters': {
                    'sector': sector,
                    'capital_types': capital_types
                }
            }
        }
        
        # 캐시에 저장 (5분)
        cache.set(cache_key, response_data, 300)
        print(f"💾 Cached data for {cache_key}")
        
        return Response(response_data)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'지도 데이터 조회 중 오류가 발생했습니다: {str(e)}',
            'data': {
                'countries': [],
                'total_amount': 0,
                'total_count': 0
            }
        })


@api_view(['GET'])
@permission_classes([AllowAny])
def chart_data(request):
    """Get data for additional charts and visualizations."""
    # TODO: Implement chart data generation
    return Response({
        'message': 'Chart data functionality will be implemented here',
        'available_charts': ['timeline', 'ranking', 'comparison']
    })
