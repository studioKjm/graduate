from django.core.management.base import BaseCommand
from decimal import Decimal
import random
from apps.data.models import (
    Country, Sector, CapitalType, DataSource,
    RawCapitalData, ProcessedCapitalData
)


class Command(BaseCommand):
    help = '포괄적인 글로벌 자본 데이터 생성 (45개국 전체)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--years', 
            nargs='+', 
            type=int, 
            default=[2020, 2021, 2022, 2023, 2024],
            help='생성할 연도 범위'
        )
        parser.add_argument(
            '--scale', 
            type=str, 
            choices=['small', 'medium', 'large'],
            default='medium',
            help='데이터 규모 (small: 1M-10B, medium: 10M-100B, large: 100M-1T)'
        )

    def handle(self, *args, **options):
        self.stdout.write('포괄적인 글로벌 자본 데이터 생성 시작...')
        
        years = options['years']
        scale = options['scale']
        
        # 모든 활성 국가 가져오기
        countries = Country.objects.filter(is_active=True)
        sectors = Sector.objects.filter(is_active=True).exclude(code='ALL')
        capital_types = CapitalType.objects.filter(is_active=True)
        
        # 데이터 소스 가져오기
        imf_source = DataSource.objects.get(name='IMF')
        crunchbase_source = DataSource.objects.get(name='Crunchbase')
        oecd_source = DataSource.objects.get(name='OECD')
        
        self.stdout.write(f'대상: {countries.count()}개국, {sectors.count()}개 분야, {capital_types.count()}개 자본타입')
        
        # 현실적 규모별 기본 금액 설정 (대폭 축소)
        scale_multipliers = {
            'small': {'min': 100_000, 'max': 1_000_000_000},        # 100K - 1B
            'medium': {'min': 1_000_000, 'max': 10_000_000_000},    # 1M - 10B  
            'large': {'min': 10_000_000, 'max': 50_000_000_000},    # 10M - 50B (기존 1T에서 대폭 축소)
        }
        
        scale_config = scale_multipliers[scale]
        
        created_count = 0
        total_expected = len(years) * countries.count() * sectors.count() * capital_types.count()
        
        self.stdout.write(f'예상 생성 레코드 수: {total_expected:,}개')
        
        # 국가별 경제 규모 계수 (GDP 기반)
        country_economic_factors = self._get_country_economic_factors()
        
        # 분야별 성장률 (최근 트렌드 반영)
        sector_growth_factors = self._get_sector_growth_factors()
        
        # 자본타입별 활성도
        capital_type_factors = self._get_capital_type_factors()
        
        for year in years:
            year_progress = f"[{year}년 처리 중]"
            
            for country in countries:
                country_factor = country_economic_factors.get(country.code, 0.1)
                
                for sector in sectors:
                    sector_factor = sector_growth_factors.get(sector.code, 1.0)
                    
                    for capital_type in capital_types:
                        capital_factor = capital_type_factors.get(capital_type.code, 1.0)
                        
                        # 기본 금액 계산
                        base_amount = self._calculate_base_amount(
                            country_factor, sector_factor, capital_factor, 
                            year, scale_config
                        )
                        
                        # 원시 데이터 생성 (다중 소스)
                        sources_data = self._generate_multi_source_data(
                            base_amount, capital_type.code
                        )
                        
                        for source_name, source_obj, amount, quality in sources_data:
                            # RawCapitalData 생성
                            raw_data, created = RawCapitalData.objects.get_or_create(
                                source=source_obj,
                                country=country,
                                sector=sector,
                                capital_type=capital_type,
                                year=year,
                                defaults={
                                    'raw_amount': Decimal(str(amount)),
                                    'raw_currency': 'USD',
                                    'amount_usd': Decimal(str(amount)),
                                    'is_verified': True,
                                    'data_quality_score': quality
                                }
                            )
                            
                            if created:
                                created_count += 1
                        
                        # ProcessedCapitalData 생성 (융합된 최종 데이터)
                        final_amount, confidence, source_count, variance = self._fuse_multi_source_data(sources_data)
                        
                        processed_data, created = ProcessedCapitalData.objects.get_or_create(
                            country=country,
                            sector=sector,
                            capital_type=capital_type,
                            year=year,
                            defaults={
                                'final_amount_usd': Decimal(str(final_amount)),
                                'fusion_method': 'WEIGHTED_AVG' if source_count > 1 else 'SINGLE_SOURCE',
                                'confidence_score': confidence,
                                'source_count': source_count,
                                'variance': variance,
                                'is_predicted': False
                            }
                        )
                        
                        if created:
                            created_count += 1
                
                # 진행상황 출력
                if created_count % 1000 == 0:
                    self.stdout.write(f'{year_progress} {created_count:,}개 레코드 생성 완료...')
        
        self.stdout.write(
            self.style.SUCCESS(
                f'포괄적인 글로벌 데이터 생성 완료!\n'
                f'생성된 레코드: {created_count:,}개\n'
                f'대상 국가: {countries.count()}개\n'
                f'대상 분야: {sectors.count()}개\n'
                f'대상 연도: {len(years)}년\n'
                f'스케일: {scale}'
            )
        )
    
    def _get_country_economic_factors(self):
        """국가별 경제 규모 계수 (현실적 수준으로 대폭 축소)"""
        return {
            # G7 + 중국 (경제 규모는 크지만 계수는 현실적으로)
            'USA': 1.5, 'CHN': 1.3, 'JPN': 1.2, 'DEU': 1.15, 'GBR': 1.1, 'FRA': 1.1, 'ITA': 1.05, 'CAN': 1.05,
            
            # 주요 선진국 (소폭 가산만)
            'KOR': 1.0, 'AUS': 0.95, 'ESP': 0.95, 'NLD': 0.9, 'CHE': 0.9, 'TWN': 0.85,
            'SWE': 0.85, 'BEL': 0.8, 'IRL': 0.8, 'DNK': 0.75, 'NOR': 0.8,
            
            # 신흥 경제국 (기본값 근처)
            'IND': 1.1, 'BRA': 0.9, 'RUS': 0.85, 'MEX': 0.8, 'SGP': 0.85,
            'MYS': 0.6, 'THA': 0.65, 'ARE': 0.7, 'SAU': 0.8,
            
            # 중동/기타 (최소값)
            'ISR': 0.65, 'HKG': 0.7, 'IRN': 0.5, 'VEN': 0.4,
        }
    
    def _get_sector_growth_factors(self):
        """분야별 성장률 (현실적 수준으로 축소)"""
        return {
            'AI': 1.2,           # AI 붐 (2.5 → 1.2)
            'SEMICONDUCTOR': 1.15, # 반도체 전쟁 (2.2 → 1.15)
            'ENERGY': 1.1,       # 탄소중립 전환 (1.8 → 1.1)
            'BIO': 1.1,          # 코로나 이후 바이오 관심 증가 (1.6 → 1.1)
            'FINTECH': 1.05,     # 디지털 결제 확산 (1.4 → 1.05)
            'AUTOMOTIVE': 1.05,  # 전기차 전환 (1.5 → 1.05)
            'AEROSPACE': 1.0,    # 우주항공 투자 증가 (1.2 → 1.0)
            'TELECOM': 1.0,      # 5G 확산 (1.3 → 1.0)
            'REALESTATE': 0.95,  # 기본 성장률 (1.0 → 0.95)
            'AGRICULTURE': 1.0,  # 푸드테크 관심 증가 (1.1 → 1.0)
        }
    
    def _get_capital_type_factors(self):
        """자본타입별 활성도"""
        return {
            'FDI': 1.0,      # 기본값
            'VC': 0.8,       # 리스크가 높지만 성장 잠재력
            'MA': 0.9,       # 활발한 M&A 시장
            'IPO': 0.4,      # 시장 상황에 따라 변동
            'PE': 0.7,       # 안정적이지만 규모 제한
            'BONDS': 0.6,    # 안전자산 선호
            'FPI': 0.5,      # 포트폴리오 투자
            'SWF': 0.3,      # 제한적인 국부펀드
            'GREENFIELD': 0.6, # 신규 투자
            'JV': 0.4,       # 합작투자
            'DEVFIN': 0.2,   # 개발금융
        }
    
    def _calculate_base_amount(self, country_factor, sector_factor, capital_factor, year, scale_config):
        """기본 투자 금액 계산"""
        # 연도별 성장률 (현실적 수준으로 축소)
        year_multipliers = {
            2020: 0.85,  # 코로나 영향 (0.8 → 0.85)
            2021: 0.95,  # 회복기 (1.0 → 0.95)
            2022: 1.00,  # 기준년 (1.1 → 1.0)
            2023: 1.05,  # 소폭 성장 (1.2 → 1.05)
            2024: 1.08,  # 지속 성장 (1.3 → 1.08)
        }
        
        # 기본 금액 + 무작위 변동
        base = random.uniform(scale_config['min'], scale_config['max'])
        
        # 모든 요인 적용 (각 계수가 이미 축소됨)
        final_amount = (
            base * 
            country_factor * 
            sector_factor * 
            capital_factor * 
            year_multipliers.get(year, 1.0) *
            random.uniform(0.9, 1.1)  # ±10% 무작위 변동 (기존 ±30%에서 축소)
        )
        
        return max(final_amount, scale_config['min'] * 0.1)  # 최소값 보장
    
    def _generate_multi_source_data(self, base_amount, capital_type_code):
        """다중 소스 데이터 생성"""
        sources_data = []
        
        # IMF 데이터 (항상 존재, 높은 신뢰도)
        imf_amount = base_amount * random.uniform(0.98, 1.02)  # ±2% (기존 ±10%에서 축소)
        sources_data.append(('IMF', DataSource.objects.get(name='IMF'), imf_amount, 0.95))
        
        # 자본타입별로 추가 소스 결정 (변동률 축소)
        if capital_type_code == 'VC':
            # VC는 Crunchbase도 추가
            cb_amount = base_amount * random.uniform(0.95, 1.05)  # ±5% (기존 ±20%에서 축소)
            sources_data.append(('Crunchbase', DataSource.objects.get(name='Crunchbase'), cb_amount, 0.75))
        
        if capital_type_code in ['FDI', 'MA']:
            # FDI, M&A는 OECD도 추가
            oecd_amount = base_amount * random.uniform(0.99, 1.01)  # ±1% (기존 ±5%에서 축소)
            sources_data.append(('OECD', DataSource.objects.get(name='OECD'), oecd_amount, 0.90))
        
        return sources_data
    
    def _fuse_multi_source_data(self, sources_data):
        """다중 소스 데이터 융합"""
        if len(sources_data) == 1:
            return sources_data[0][2], sources_data[0][3], 1, 0.0
        
        # 가중평균 계산
        total_weighted_amount = 0
        total_weight = 0
        amounts = []
        
        for _, _, amount, quality in sources_data:
            total_weighted_amount += amount * quality
            total_weight += quality
            amounts.append(amount)
        
        final_amount = total_weighted_amount / total_weight
        
        # 평균 신뢰도
        avg_confidence = sum(data[3] for data in sources_data) / len(sources_data)
        
        # 변동성 계산 (표준편차)
        variance = sum((amount - final_amount) ** 2 for amount in amounts) / len(amounts)
        
        return final_amount, avg_confidence, len(sources_data), variance
