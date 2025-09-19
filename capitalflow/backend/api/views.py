"""
API views for the CapitalFlow application.
"""

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db.models import Q, Sum, Max, Min
from django.core.cache import cache
from core.models import (
    Country, Sector, CapitalType, CapitalFlow, 
    CountryTotalCapital, UserPreference
)
from .serializers import (
    CountrySerializer, SectorSerializer, CapitalTypeSerializer,
    CapitalFlowSerializer, CountryTotalCapitalSerializer,
    UserRegistrationSerializer, UserPreferenceSerializer,
    MapVisualizationDataSerializer, FlowVisualizationDataSerializer
)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """User registration endpoint."""
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        # Create user preference
        UserPreference.objects.create(user=user)
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        return Response({
            'user_id': user.id,
            'username': user.username,
            'email': user.email,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    """User login endpoint."""
    username = request.data.get('username')
    password = request.data.get('password')
    
    user = authenticate(username=username, password=password)
    if user:
        refresh = RefreshToken.for_user(user)
        return Response({
            'user_id': user.id,
            'username': user.username,
            'email': user.email,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })
    return Response(
        {'error': 'Invalid credentials'}, 
        status=status.HTTP_401_UNAUTHORIZED
    )


class CountryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for countries."""
    queryset = Country.objects.filter(is_active=True)
    serializer_class = CountrySerializer
    permission_classes = [permissions.AllowAny]
    
    @action(detail=False, methods=['get'])
    def regions(self, request):
        """Get list of unique regions."""
        regions = Country.objects.filter(is_active=True).values_list('region', flat=True).distinct()
        return Response(list(regions))


class SectorViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for sectors."""
    queryset = Sector.objects.filter(is_active=True)
    serializer_class = SectorSerializer
    permission_classes = [permissions.AllowAny]
    
    @action(detail=False, methods=['get'])
    def tree(self, request):
        """Get sectors in tree structure."""
        parent_sectors = Sector.objects.filter(
            is_active=True, 
            parent_sector__isnull=True
        )
        result = []
        for parent in parent_sectors:
            children = Sector.objects.filter(parent_sector=parent, is_active=True)
            result.append({
                'parent': SectorSerializer(parent).data,
                'children': SectorSerializer(children, many=True).data
            })
        return Response(result)


class CapitalTypeViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for capital types."""
    queryset = CapitalType.objects.filter(is_active=True)
    serializer_class = CapitalTypeSerializer
    permission_classes = [permissions.AllowAny]


class CapitalFlowViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for capital flows."""
    serializer_class = CapitalFlowSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        queryset = CapitalFlow.objects.select_related(
            'source_country', 'target_country', 'sector', 'capital_type'
        )
        
        # Filter parameters
        year = self.request.query_params.get('year')
        sector_id = self.request.query_params.get('sector')
        capital_type_id = self.request.query_params.get('capital_type')
        source_country = self.request.query_params.get('source_country')
        target_country = self.request.query_params.get('target_country')
        
        if year:
            queryset = queryset.filter(year=year)
        if sector_id:
            queryset = queryset.filter(sector_id=sector_id)
        if capital_type_id:
            queryset = queryset.filter(capital_type_id=capital_type_id)
        if source_country:
            queryset = queryset.filter(source_country__code_iso3=source_country)
        if target_country:
            queryset = queryset.filter(target_country__code_iso3=target_country)
            
        return queryset.order_by('-year', '-amount_usd')


class CountryTotalCapitalViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for aggregated country capital data."""
    serializer_class = CountryTotalCapitalSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        queryset = CountryTotalCapital.objects.select_related(
            'country', 'sector', 'capital_type'
        )
        
        # Filter parameters
        year = self.request.query_params.get('year')
        sector_id = self.request.query_params.get('sector')
        capital_type_id = self.request.query_params.get('capital_type')
        
        if year:
            queryset = queryset.filter(year=year)
        if sector_id:
            queryset = queryset.filter(sector_id=sector_id)
        if capital_type_id:
            queryset = queryset.filter(capital_type_id=capital_type_id)
            
        return queryset.order_by('-year', '-total_inflow')


class UserPreferenceViewSet(viewsets.ModelViewSet):
    """ViewSet for user preferences."""
    serializer_class = UserPreferenceSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UserPreference.objects.filter(user=self.request.user)
    
    def get_object(self):
        preference, created = UserPreference.objects.get_or_create(
            user=self.request.user
        )
        return preference


@api_view(['GET'])
@permission_classes([AllowAny])
def map_visualization_data(request):
    """Get data for choropleth map visualization."""
    # Parameters
    year = request.GET.get('year', 2023)
    sector_id = request.GET.get('sector')
    capital_type_id = request.GET.get('capital_type')
    
    # Cache key
    cache_key = f"map_viz_{year}_{sector_id}_{capital_type_id}"
    cached_data = cache.get(cache_key)
    if cached_data:
        return Response(cached_data)
    
    # Build query
    queryset = CountryTotalCapital.objects.select_related('country').filter(year=year)
    
    if sector_id:
        queryset = queryset.filter(sector_id=sector_id)
    if capital_type_id:
        queryset = queryset.filter(capital_type_id=capital_type_id)
    
    # Aggregate by country
    country_data = {}
    for item in queryset:
        country_code = item.country.code_iso3
        if country_code not in country_data:
            country_data[country_code] = {
                'country_code': country_code,
                'country_name': item.country.name,
                'latitude': float(item.country.latitude or 0),
                'longitude': float(item.country.longitude or 0),
                'total_capital': 0,
            }
        country_data[country_code]['total_capital'] += float(item.net_flow)
    
    # Calculate intensity (normalize 0-1)
    values = [data['total_capital'] for data in country_data.values()]
    if values:
        max_value = max(values)
        min_value = min(values)
        value_range = max_value - min_value if max_value != min_value else 1
        
        for data in country_data.values():
            data['intensity'] = (data['total_capital'] - min_value) / value_range
    
    # Add rank
    sorted_data = sorted(
        country_data.values(), 
        key=lambda x: x['total_capital'], 
        reverse=True
    )
    for i, data in enumerate(sorted_data):
        data['rank'] = i + 1
    
    serializer = MapVisualizationDataSerializer(sorted_data, many=True)
    result = serializer.data
    
    # Cache for 5 minutes
    cache.set(cache_key, result, 300)
    
    return Response(result)


@api_view(['GET'])
@permission_classes([AllowAny])
def flow_visualization_data(request):
    """Get data for flow map visualization."""
    # Parameters
    year = request.GET.get('year', 2023)
    sector_id = request.GET.get('sector')
    capital_type_id = request.GET.get('capital_type')
    min_amount = request.GET.get('min_amount', 10)  # Minimum flow amount to show
    
    # Cache key
    cache_key = f"flow_viz_{year}_{sector_id}_{capital_type_id}_{min_amount}"
    cached_data = cache.get(cache_key)
    if cached_data:
        return Response(cached_data)
    
    # Build query
    queryset = CapitalFlow.objects.select_related(
        'source_country', 'target_country'
    ).filter(
        year=year,
        amount_usd__gte=min_amount
    )
    
    if sector_id:
        queryset = queryset.filter(sector_id=sector_id)
    if capital_type_id:
        queryset = queryset.filter(capital_type_id=capital_type_id)
    
    # Aggregate flows between countries
    flow_data = {}
    for flow in queryset:
        key = f"{flow.source_country.code_iso3}_{flow.target_country.code_iso3}"
        if key not in flow_data:
            flow_data[key] = {
                'source_country_code': flow.source_country.code_iso3,
                'target_country_code': flow.target_country.code_iso3,
                'source_lat': float(flow.source_country.latitude or 0),
                'source_lng': float(flow.source_country.longitude or 0),
                'target_lat': float(flow.target_country.latitude or 0),
                'target_lng': float(flow.target_country.longitude or 0),
                'flow_amount': 0,
            }
        flow_data[key]['flow_amount'] += float(flow.amount_usd)
    
    # Calculate flow intensity
    values = [data['flow_amount'] for data in flow_data.values()]
    if values:
        max_value = max(values)
        min_value = min(values)
        value_range = max_value - min_value if max_value != min_value else 1
        
        for data in flow_data.values():
            data['flow_intensity'] = (data['flow_amount'] - min_value) / value_range
    
    # Sort by flow amount
    sorted_flows = sorted(
        flow_data.values(), 
        key=lambda x: x['flow_amount'], 
        reverse=True
    )
    
    serializer = FlowVisualizationDataSerializer(sorted_flows, many=True)
    result = serializer.data
    
    # Cache for 5 minutes
    cache.set(cache_key, result, 300)
    
    return Response(result)


@api_view(['GET'])
@permission_classes([AllowAny])
def data_summary(request):
    """Get summary statistics about the data."""
    cache_key = "data_summary"
    cached_data = cache.get(cache_key)
    if cached_data:
        return Response(cached_data)
    
    # Calculate summary statistics
    summary = {
        'total_countries': Country.objects.filter(is_active=True).count(),
        'total_sectors': Sector.objects.filter(is_active=True).count(),
        'total_capital_types': CapitalType.objects.filter(is_active=True).count(),
        'total_flows': CapitalFlow.objects.count(),
        'year_range': {
            'min': CapitalFlow.objects.aggregate(Min('year'))['year__min'],
            'max': CapitalFlow.objects.aggregate(Max('year'))['year__max'],
        },
        'total_amount': CapitalFlow.objects.aggregate(Sum('amount_usd'))['amount_usd__sum'],
    }
    
    # Cache for 1 hour
    cache.set(cache_key, summary, 3600)
    
    return Response(summary)
