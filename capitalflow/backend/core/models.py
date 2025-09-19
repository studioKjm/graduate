"""
Core models for the CapitalFlow application.
Contains base models for countries, sectors, and capital flow data.
"""

from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal


class TimeStampedModel(models.Model):
    """Abstract base model with created and updated timestamps."""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        abstract = True


class Country(TimeStampedModel):
    """Model representing countries/regions."""
    name = models.CharField(max_length=100, unique=True)
    code_iso2 = models.CharField(max_length=2, unique=True)  # US, KR, JP
    code_iso3 = models.CharField(max_length=3, unique=True)  # USA, KOR, JPN
    region = models.CharField(max_length=50)  # Asia, Europe, North America
    sub_region = models.CharField(max_length=50, blank=True)  # East Asia, Western Europe
    continent = models.CharField(max_length=30)
    latitude = models.DecimalField(max_digits=10, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=6, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['name']
        
    def __str__(self):
        return f"{self.name} ({self.code_iso3})"


class Sector(TimeStampedModel):
    """Model representing industry sectors."""
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=20, unique=True)  # AI, SEMICONDUCTOR, BIO
    description = models.TextField(blank=True)
    parent_sector = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True)
    color_code = models.CharField(max_length=7, default='#3B82F6')  # Hex color for visualization
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['name']
        
    def __str__(self):
        return self.name


class CapitalType(TimeStampedModel):
    """Model representing types of capital flow."""
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=20, unique=True)  # FDI, VC, MA, IPO
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['name']
        
    def __str__(self):
        return self.name


class CapitalFlow(TimeStampedModel):
    """Model representing capital flow data."""
    year = models.IntegerField(
        validators=[MinValueValidator(1970), MaxValueValidator(2030)]
    )
    quarter = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(4)],
        null=True, blank=True
    )
    month = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(12)],
        null=True, blank=True
    )
    
    # Flow direction
    source_country = models.ForeignKey(
        Country, 
        on_delete=models.CASCADE, 
        related_name='outgoing_flows'
    )
    target_country = models.ForeignKey(
        Country, 
        on_delete=models.CASCADE, 
        related_name='incoming_flows'
    )
    
    # Categorization
    sector = models.ForeignKey(Sector, on_delete=models.CASCADE)
    capital_type = models.ForeignKey(CapitalType, on_delete=models.CASCADE)
    
    # Amounts (in USD millions)
    amount_usd = models.DecimalField(
        max_digits=15, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    
    # Additional metadata
    currency_original = models.CharField(max_length=3, default='USD')
    exchange_rate = models.DecimalField(max_digits=10, decimal_places=4, default=1.0)
    data_source = models.CharField(max_length=100)  # World Bank, IMF, etc.
    confidence_level = models.CharField(
        max_length=10,
        choices=[
            ('HIGH', 'High'),
            ('MEDIUM', 'Medium'),
            ('LOW', 'Low'),
        ],
        default='MEDIUM'
    )
    
    # Notes and references
    notes = models.TextField(blank=True)
    reference_url = models.URLField(blank=True)
    
    class Meta:
        ordering = ['-year', '-quarter', '-month']
        indexes = [
            models.Index(fields=['year', 'sector', 'capital_type']),
            models.Index(fields=['source_country', 'target_country']),
            models.Index(fields=['sector', 'year']),
        ]
        
    def __str__(self):
        return f"{self.source_country.code_iso3} → {self.target_country.code_iso3} " \
               f"({self.sector.code}, {self.year}: ${self.amount_usd}M)"


class CountryTotalCapital(TimeStampedModel):
    """Aggregated capital totals by country, sector, and year for faster queries."""
    country = models.ForeignKey(Country, on_delete=models.CASCADE)
    sector = models.ForeignKey(Sector, on_delete=models.CASCADE)
    capital_type = models.ForeignKey(CapitalType, on_delete=models.CASCADE)
    year = models.IntegerField()
    
    # Aggregated amounts
    total_inflow = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_outflow = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    net_flow = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # For visualization intensity calculation
    flow_rank_global = models.IntegerField(null=True, blank=True)
    flow_percentile = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    class Meta:
        unique_together = ['country', 'sector', 'capital_type', 'year']
        ordering = ['-year', '-total_inflow']
        indexes = [
            models.Index(fields=['year', 'sector']),
            models.Index(fields=['country', 'year']),
        ]
        
    def __str__(self):
        return f"{self.country.name} - {self.sector.name} ({self.year})"


class UserPreference(TimeStampedModel):
    """User preferences for dashboard customization."""
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    favorite_countries = models.ManyToManyField(Country, blank=True)
    favorite_sectors = models.ManyToManyField(Sector, blank=True)
    default_year_range_start = models.IntegerField(default=2020)
    default_year_range_end = models.IntegerField(default=2024)
    preferred_visualization = models.CharField(
        max_length=20,
        choices=[
            ('CHOROPLETH', 'Choropleth Map'),
            ('FLOW', 'Flow Map'),
            ('BOTH', 'Both'),
        ],
        default='BOTH'
    )
    
    def __str__(self):
        return f"{self.user.username}'s preferences"
