"""
Views for visualization configuration and data.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


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
def chart_data(request):
    """Get data for additional charts and visualizations."""
    # TODO: Implement chart data generation
    return Response({
        'message': 'Chart data functionality will be implemented here',
        'available_charts': ['timeline', 'ranking', 'comparison']
    })
