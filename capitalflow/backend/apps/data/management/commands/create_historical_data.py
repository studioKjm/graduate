"""
역사적 연도별 자본 흐름 데이터 생성 관리 명령어
"""
import random
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.data.models import (
    Country, Sector, CapitalType, DataSource,
    RawCapitalData, ProcessedCapitalData
)
from apps.data.services.data_fusion import DataFusionService


class Command(BaseCommand):
    help = '1970~2024년 역사적 자본 흐름 데이터 생성'

    def add_arguments(self, parser):
        parser.add_argument(
            '--start-year',
            type=int,
            default=1970,
            help='시작 연도 (기본: 1970)'
        )
        parser.add_argument(
            '--end-year',
            type=int,
            default=2024,
            help='끝 연도 (기본: 2024)'
        )
        parser.add_argument(
            '--clear-existing',
            action='store_true',
            help='기존 데이터 삭제 후 생성'
        )

    def handle(self, *args, **options):
        start_year = options['start_year']
        end_year = options['end_year']
        
        self.stdout.write(f'=== {start_year}~{end_year}년 역사적 데이터 생성 시작 ===')
        
        if options['clear_existing']:
            self.stdout.write('기존 데이터 삭제 중...')
            RawCapitalData.objects.all().delete()
            ProcessedCapitalData.objects.all().delete()
            self.stdout.write('기존 데이터 삭제 완료')
        
        # 메타데이터 로드
        countries = list(Country.objects.filter(is_active=True))
        sectors = list(Sector.objects.filter(is_active=True).exclude(code='ALL'))
        capital_types = list(CapitalType.objects.filter(is_active=True))
        sources = list(DataSource.objects.filter(source_type='OFFICIAL'))
        
        self.stdout.write(f'메타데이터: {len(countries)}개 국가, {len(sectors)}개 분야, {len(capital_types)}개 자본타입')
        
        # 연도별 데이터 생성
        total_generated = 0
        
        for year in range(start_year, end_year + 1):
            self.stdout.write(f'\\n{year}년 데이터 생성 중...')
            year_count = self._generate_year_data(year, countries, sectors, capital_types, sources)
            total_generated += year_count
            self.stdout.write(f'{year}년 완료: {year_count}건 생성')
        
        self.stdout.write(f'\\n=== 데이터 생성 완료 ===')
        self.stdout.write(f'총 {total_generated}건의 원시 데이터 생성')
        
        # 데이터 융합 실행
        self.stdout.write('\\n데이터 융합 시작...')
        fusion_service = DataFusionService()
        
        fusion_results = fusion_service.batch_fusion(
            year_start=start_year,
            year_end=end_year
        )
        
        self.stdout.write(f'데이터 융합 완료: {fusion_results}')
        self.stdout.write(self.style.SUCCESS('역사적 데이터 생성 완료!'))

    def _generate_year_data(self, year, countries, sectors, capital_types, sources):
        """특정 연도의 데이터 생성"""
        count = 0
        
        # 연도별 경제 성장률 적용
        year_multiplier = self._get_year_multiplier(year)
        
        for country in countries:
            country_factor = self._get_country_economic_factor(country.code, year)
            
            for sector in sectors:
                sector_factor = self._get_sector_growth_factor(sector.code, year)
                
                for capital_type in capital_types:
                    capital_factor = self._get_capital_type_factor(capital_type.code)
                    
                    # 해당 자본타입에 적합한 데이터 소스들만 선택
                    applicable_sources = self._get_applicable_sources(capital_type.code, sources)
                    
                    for source in applicable_sources:
                        # 기본 금액 계산
                        base_amount = self._calculate_base_amount(
                            country_factor, sector_factor, capital_factor, year_multiplier
                        )
                        
                        # 소스별 변동 적용
                        source_variation = self._get_source_variation(source.name)
                        final_amount = base_amount * source_variation
                        
                        # 현실적인 범위 제한
                        final_amount = max(100_000, min(final_amount, 500_000_000_000))
                        
                        # 원시 데이터 생성
                        try:
                            raw_data, created = RawCapitalData.objects.get_or_create(
                                source=source,
                                country=country,
                                sector=sector,
                                capital_type=capital_type,
                                year=year,
                                defaults={
                                    'raw_amount': Decimal(str(final_amount)),
                                    'raw_currency': 'USD',
                                    'amount_usd': Decimal(str(final_amount)),
                                    'exchange_rate': Decimal('1.0'),
                                    'collection_date': timezone.now(),
                                    'data_quality_score': source.reliability_weight * 0.95,
                                    'is_outlier': False,
                                    'is_verified': True
                                }
                            )
                            if created:
                                count += 1
                        except Exception as e:
                            self.stdout.write(f'데이터 생성 실패: {e}')
        
        return count

    def _get_year_multiplier(self, year):
        """연도별 경제 성장률"""
        # 기준년도 1990을 1.0으로 설정
        base_year = 1990
        
        if year < 1980:
            return 0.3 + (year - 1970) * 0.02  # 1970: 0.3, 1979: 0.48
        elif year < 1990:
            return 0.5 + (year - 1980) * 0.03  # 1980: 0.5, 1989: 0.77
        elif year < 2000:
            return 0.8 + (year - 1990) * 0.02  # 1990: 0.8, 1999: 0.98
        elif year < 2010:
            return 1.0 + (year - 2000) * 0.03  # 2000: 1.0, 2009: 1.27
        elif year < 2020:
            return 1.3 + (year - 2010) * 0.02  # 2010: 1.3, 2019: 1.48
        else:
            # 2020년 코로나 영향, 2021년 회복, 2022년 안정, 2023년 성장
            multipliers = {
                2020: 0.85,  # 코로나 타격
                2021: 1.1,   # 회복
                2022: 1.25,  # 안정 성장
                2023: 1.4,   # 지속 성장
                2024: 1.45   # 미래 전망
            }
            return multipliers.get(year, 1.5)

    def _get_country_economic_factor(self, country_code, year):
        """국가별 경제 규모 계수 (연도 고려)"""
        base_factors = {
            # G7 + 중국
            'USA': 2.0, 'CHN': 1.8, 'JPN': 1.5, 'DEU': 1.4, 'GBR': 1.3, 
            'FRA': 1.2, 'ITA': 1.1, 'CAN': 1.1,
            
            # 주요 선진국
            'KOR': 1.0, 'AUS': 0.95, 'ESP': 0.9, 'NLD': 0.85, 'CHE': 0.9, 
            'TWN': 0.8, 'SWE': 0.75, 'BEL': 0.7, 'IRL': 0.75, 'DNK': 0.65, 'NOR': 0.7,
            
            # 신흥 경제국
            'IND': 0.8, 'BRA': 0.7, 'RUS': 0.75, 'MEX': 0.6, 'SGP': 0.7,
            'MYS': 0.5, 'THA': 0.45, 'ARE': 0.6, 'SAU': 0.65,
            
            # 기타
            'ISR': 0.55, 'HKG': 0.6, 'IRN': 0.4, 'VEN': 0.3
        }
        
        base_factor = base_factors.get(country_code, 0.4)
        
        # 연도별 조정 (개발도상국은 최근에 더 성장)
        if country_code in ['CHN', 'IND', 'BRA', 'RUS']:
            if year < 1990:
                return base_factor * 0.4  # 1990년 이전은 낮음
            elif year < 2000:
                return base_factor * 0.6
            elif year < 2010:
                return base_factor * 0.8
            else:
                return base_factor  # 2010년 이후 현재 수준
        
        return base_factor

    def _get_sector_growth_factor(self, sector_code, year):
        """분야별 성장률 (연도 고려)"""
        # 최근 기술 분야는 2000년 이후 급성장
        if sector_code in ['AI', 'FINTECH']:
            if year < 2000:
                return 0.2
            elif year < 2010:
                return 0.5
            elif year < 2020:
                return 1.0
            else:
                return 1.5
        
        # 반도체는 1980년대부터 성장
        elif sector_code == 'SEMICONDUCTOR':
            if year < 1980:
                return 0.3
            elif year < 2000:
                return 0.7
            else:
                return 1.2
        
        # 바이오는 1990년대부터 성장
        elif sector_code == 'BIO':
            if year < 1990:
                return 0.4
            elif year < 2000:
                return 0.7
            else:
                return 1.1
        
        # 전통적 분야들
        elif sector_code in ['AUTOMOTIVE', 'ENERGY']:
            return 1.0
        
        # 새로운 분야들
        elif sector_code in ['AEROSPACE', 'TELECOM']:
            if year < 1990:
                return 0.6
            else:
                return 0.9
        
        # 부동산, 농업
        else:
            return 0.8

    def _get_capital_type_factor(self, capital_type_code):
        """자본타입별 기본 계수"""
        factors = {
            'FDI': 1.5,
            'VC': 0.8,
            'MA': 1.2,
            'IPO': 0.6,
            'PE': 1.0,
            'BONDS': 1.3,
            'FPI': 1.1,
            'SWF': 1.4,
            'GREENFIELD': 1.2,
            'JV': 0.7,
            'DEVFIN': 0.9
        }
        return factors.get(capital_type_code, 1.0)

    def _get_applicable_sources(self, capital_type_code, sources):
        """자본타입에 적합한 데이터 소스 반환"""
        # 모든 타입에 공통적으로 IMF 적용
        applicable = [s for s in sources if s.name == 'IMF']
        
        # 타입별 추가 소스
        if capital_type_code in ['FDI', 'MA']:
            applicable.extend([s for s in sources if s.name in ['OECD', 'UNCTAD']])
        elif capital_type_code == 'VC':
            applicable.extend([s for s in sources if s.name == 'World Bank'])
        elif capital_type_code in ['BONDS', 'FPI']:
            applicable.extend([s for s in sources if s.name in ['BIS', 'World Bank']])
        
        return applicable[:3]  # 최대 3개 소스

    def _calculate_base_amount(self, country_factor, sector_factor, capital_factor, year_multiplier):
        """기본 투자 금액 계산"""
        # 기본 금액 (1~50억 달러 범위)
        base = random.uniform(1_000_000_000, 50_000_000_000)
        
        # 모든 계수 적용
        final_amount = (
            base * 
            country_factor * 
            sector_factor * 
            capital_factor * 
            year_multiplier *
            random.uniform(0.5, 1.5)  # ±50% 변동
        )
        
        return final_amount

    def _get_source_variation(self, source_name):
        """소스별 데이터 변동률"""
        variations = {
            'IMF': random.uniform(0.98, 1.02),      # ±2%
            'OECD': random.uniform(0.97, 1.03),     # ±3%
            'UNCTAD': random.uniform(0.95, 1.05),   # ±5%
            'World Bank': random.uniform(0.96, 1.04), # ±4%
            'BIS': random.uniform(0.98, 1.02),      # ±2%
        }
        return variations.get(source_name, random.uniform(0.9, 1.1))
