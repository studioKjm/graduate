"""
Views for visualization configuration and data.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from apps.data.models import RawCapitalData, Country, Sector, CapitalType
import json


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
    """Get map data for visualization."""
    year = request.GET.get('year', 2024)
    sector = request.GET.get('sector', '')
    capital_types = request.GET.getlist('capital_types')
    
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
        
        # 국가별 데이터 집계
        country_data = data_query.values('country__name', 'country__code', 'country__latitude', 'country__longitude').annotate(
            total_amount=Sum('amount_usd'),
            data_count=Count('id'),
            real_data_count=Count('id', filter=Q(is_estimated=False)),
            estimated_data_count=Count('id', filter=Q(is_estimated=True))
        ).order_by('-total_amount')
        
        # 국가별 자본타입 데이터
        countries = []
        for country in country_data:
            # 해당 국가의 자본타입별 데이터
            country_capital_types = data_query.filter(
                country__code=country['country__code']
            ).values('capital_type__name', 'capital_type__code').annotate(
                amount=Sum('amount_usd'),
                count=Count('id')
            )
            
            capital_types = {}
            for cap_type in country_capital_types:
                capital_types[cap_type['capital_type__code']] = {
                    'name': cap_type['capital_type__name'],
                    'amount': float(cap_type['amount'] or 0),
                    'count': cap_type['count']
                }
            
            countries.append({
                'name': country['country__name'],
                'code': country['country__code'],
                'latitude': float(country['country__latitude'] or 0),
                'longitude': float(country['country__longitude'] or 0),
                'total_amount': float(country['total_amount'] or 0),
                'data_count': country['data_count'],
                'real_data_count': country['real_data_count'],
                'estimated_data_count': country['estimated_data_count'],
                'capital_types': capital_types
            })
        
        # 전체 통계
        total_amount = sum(country['total_amount'] for country in countries)
        total_count = sum(country['data_count'] for country in countries)
        real_count = sum(country['real_data_count'] for country in countries)
        estimated_count = sum(country['estimated_data_count'] for country in countries)
        
        return Response({
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
        })
        
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
