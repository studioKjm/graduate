from django.core.management.base import BaseCommand
from decimal import Decimal
import random
import logging
from apps.data.models import (
    Country, Sector, CapitalType, DataSource,
    RawCapitalData, ProcessedCapitalData
)

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = '현실적인 글로벌 자본 데이터 생성 (업계 표준 기반)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--years', 
            nargs='+', 
            type=int, 
            default=[2020, 2021, 2022, 2023, 2024],
            help='생성할 연도 범위'
        )
        parser.add_argument(
            '--clear-existing',
            action='store_true',
            help='기존 데이터 삭제 후 재생성'
        )

    def handle(self, *args, **options):
        self.stdout.write('현실적인 글로벌 자본 데이터 생성 시작...')
        
        if options['clear_existing']:
            self.stdout.write('기존 데이터 삭제 중...')
            RawCapitalData.objects.all().delete()
            ProcessedCapitalData.objects.all().delete()
            self.stdout.write('기존 데이터 삭제 완료')
        
        years = options['years']
        
        # 모든 활성 엔티티 가져오기
        countries = Country.objects.filter(is_active=True)
        sectors = Sector.objects.filter(is_active=True).exclude(code='ALL')
        capital_types = CapitalType.objects.filter(is_active=True)
        
        # 데이터 소스 가져오기
        imf_source = DataSource.objects.get(name='IMF')
        crunchbase_source = DataSource.objects.get(name='Crunchbase')
        oecd_source = DataSource.objects.get(name='OECD')
        
        self.stdout.write(f'대상: {countries.count()}개국, {sectors.count()}개 분야, {capital_types.count()}개 자본타입')
        
        created_count = 0
        total_expected = len(years) * countries.count() * sectors.count() * capital_types.count()
        
        self.stdout.write(f'예상 생성 레코드 수: {total_expected:,}개')
        
        # 현실적인 기준값 설정
        realistic_benchmarks = self._get_realistic_benchmarks()
        
        for year in years:
            year_progress = f"[{year}년 처리 중]"
            
            for country in countries:
                for sector in sectors:
                    for capital_type in capital_types:
                        
                        # 현실적인 기본 금액 계산
                        base_amount = self._calculate_realistic_amount(
                            country.code, sector.code, capital_type.code, 
                            year, realistic_benchmarks
                        )
                        
                        # 현실성 검증
                        if not self._validate_realistic_amount(
                            country.code, sector.code, capital_type.code, base_amount
                        ):
                            # 검증 실패 시 벤치마크 범위로 조정
                            base_amount = self._adjust_to_benchmark(
                                country.code, sector.code, capital_type.code, base_amount
                            )
                        
                        # 원시 데이터 생성 (다중 소스)
                        sources_data = self._generate_realistic_multi_source_data(
                            base_amount, capital_type.code, country.code, sector.code
                        )
                        
                        for source_name, source_obj, amount, quality in sources_data:
                            # 추가 현실성 검증
                            validated_amount = self._final_validation(amount, country.code, sector.code)
                            
                            # RawCapitalData 생성
                            raw_data, created = RawCapitalData.objects.get_or_create(
                                source=source_obj,
                                country=country,
                                sector=sector,
                                capital_type=capital_type,
                                year=year,
                                defaults={
                                    'raw_amount': Decimal(str(validated_amount)),
                                    'raw_currency': 'USD',
                                    'amount_usd': Decimal(str(validated_amount)),
                                    'is_verified': True,
                                    'data_quality_score': quality
                                }
                            )
                            
                            if created:
                                created_count += 1
                        
                        # ProcessedCapitalData 생성 (융합된 최종 데이터)
                        final_amount, confidence, source_count, variance = self._fuse_multi_source_data(sources_data)
                        
                        # 최종 검증
                        final_validated_amount = self._final_validation(final_amount, country.code, sector.code)
                        
                        processed_data, created = ProcessedCapitalData.objects.get_or_create(
                            country=country,
                            sector=sector,
                            capital_type=capital_type,
                            year=year,
                            defaults={
                                'final_amount_usd': Decimal(str(final_validated_amount)),
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
                f'현실적인 글로벌 데이터 생성 완료!\n'
                f'생성된 레코드: {created_count:,}개\n'
                f'대상 국가: {countries.count()}개\n'
                f'대상 분야: {sectors.count()}개\n'
                f'대상 연도: {len(years)}년'
            )
        )
    
    def _get_realistic_benchmarks(self):
        """업계 표준 기반 현실적 벤치마크"""
        return {
            # 중국 AI 분야 - 업계 추정치 기반
            ('CHN', 'AI'): {
                'FDI': {'min': 5_000_000_000, 'max': 35_000_000_000},    # $5B-$35B
                'VC': {'min': 2_000_000_000, 'max': 15_000_000_000},     # $2B-$15B  
                'MA': {'min': 1_000_000_000, 'max': 8_000_000_000},      # $1B-$8B
                'IPO': {'min': 500_000_000, 'max': 5_000_000_000},       # $500M-$5B
                'PE': {'min': 1_000_000_000, 'max': 6_000_000_000},      # $1B-$6B
                'default': {'min': 100_000_000, 'max': 2_000_000_000}    # $100M-$2B
            },
            
            # 미국 AI 분야
            ('USA', 'AI'): {
                'FDI': {'min': 10_000_000_000, 'max': 80_000_000_000},   # $10B-$80B
                'VC': {'min': 20_000_000_000, 'max': 100_000_000_000},   # $20B-$100B
                'MA': {'min': 5_000_000_000, 'max': 50_000_000_000},     # $5B-$50B
                'IPO': {'min': 2_000_000_000, 'max': 20_000_000_000},    # $2B-$20B
                'PE': {'min': 3_000_000_000, 'max': 25_000_000_000},     # $3B-$25B
                'default': {'min': 500_000_000, 'max': 5_000_000_000}    # $500M-$5B
            },
            
            # 기본 범위 (다른 국가/분야)
            'default': {
                'FDI': {'min': 100_000_000, 'max': 10_000_000_000},      # $100M-$10B
                'VC': {'min': 50_000_000, 'max': 5_000_000_000},         # $50M-$5B
                'MA': {'min': 100_000_000, 'max': 3_000_000_000},        # $100M-$3B
                'IPO': {'min': 50_000_000, 'max': 2_000_000_000},        # $50M-$2B
                'PE': {'min': 100_000_000, 'max': 2_000_000_000},        # $100M-$2B
                'default': {'min': 10_000_000, 'max': 500_000_000}       # $10M-$500M
            }
        }
    
    def _calculate_realistic_amount(self, country_code, sector_code, capital_type_code, year, benchmarks):
        """현실적인 투자 금액 계산 (중복적용 방지)"""
        
        # 벤치마크 범위 가져오기
        country_sector_key = (country_code, sector_code)
        if country_sector_key in benchmarks:
            range_config = benchmarks[country_sector_key].get(
                capital_type_code, 
                benchmarks[country_sector_key]['default']
            )
        else:
            range_config = benchmarks['default'].get(
                capital_type_code,
                benchmarks['default']['default']
            )
        
        # 기본 랜덤 금액 (벤치마크 범위 내)
        base_amount = random.uniform(range_config['min'], range_config['max'])
        
        # 연도별 성장률만 적용 (다른 계수들은 벤치마크에 이미 반영됨)
        year_multipliers = {
            2020: 0.85,  # 코로나 영향
            2021: 0.95,  # 회복기
            2022: 1.00,  # 기준년
            2023: 1.05,  # 소폭 성장
            2024: 1.10,  # 성장
        }
        
        # 최종 금액 (단순하게 연도 효과만 적용)
        final_amount = base_amount * year_multipliers.get(year, 1.0)
        
        # 작은 무작위 변동만 추가 (±10%)
        final_amount *= random.uniform(0.9, 1.1)
        
        return final_amount
    
    def _validate_realistic_amount(self, country_code, sector_code, capital_type_code, amount):
        """현실성 검증"""
        
        # 글로벌 상한선 (어떤 단일 투자도 이를 넘으면 안 됨)
        global_max_limits = {
            'FDI': 200_000_000_000,   # $200B
            'VC': 150_000_000_000,    # $150B  
            'MA': 100_000_000_000,    # $100B
            'IPO': 50_000_000_000,    # $50B
            'PE': 80_000_000_000,     # $80B
            'default': 20_000_000_000 # $20B
        }
        
        max_limit = global_max_limits.get(capital_type_code, global_max_limits['default'])
        
        if amount > max_limit:
            logger.warning(f"글로벌 상한선 초과: {country_code}-{sector_code}-{capital_type_code}: ${amount:,.0f} > ${max_limit:,.0f}")
            return False
        
        # 최소값 검증 (너무 작은 값도 제외)
        min_threshold = 1_000_000  # $1M
        if amount < min_threshold:
            return False
        
        return True
    
    def _adjust_to_benchmark(self, country_code, sector_code, capital_type_code, amount):
        """벤치마크 범위로 조정"""
        
        benchmarks = self._get_realistic_benchmarks()
        
        # 벤치마크 범위 가져오기
        country_sector_key = (country_code, sector_code)
        if country_sector_key in benchmarks:
            range_config = benchmarks[country_sector_key].get(
                capital_type_code, 
                benchmarks[country_sector_key]['default']
            )
        else:
            range_config = benchmarks['default'].get(
                capital_type_code,
                benchmarks['default']['default']
            )
        
        # 범위 내로 조정
        adjusted_amount = max(range_config['min'], min(amount, range_config['max']))
        
        if adjusted_amount != amount:
            logger.info(f"벤치마크 조정: {country_code}-{sector_code}-{capital_type_code}: ${amount:,.0f} → ${adjusted_amount:,.0f}")
        
        return adjusted_amount
    
    def _generate_realistic_multi_source_data(self, base_amount, capital_type_code, country_code, sector_code):
        """현실적인 다중 소스 데이터 생성"""
        sources_data = []
        
        # IMF 데이터 (항상 존재, 보수적 추정)
        imf_amount = base_amount * random.uniform(0.95, 1.05)  # ±5% 변동
        sources_data.append(('IMF', DataSource.objects.get(name='IMF'), imf_amount, 0.95))
        
        # 자본타입별로 추가 소스 결정 (현실적 변동 범위)
        if capital_type_code == 'VC' and country_code in ['USA', 'CHN', 'GBR']:
            # VC는 Crunchbase도 추가 (실리콘밸리 등 주요 시장에서만)
            cb_amount = base_amount * random.uniform(0.9, 1.1)  # ±10% 변동
            sources_data.append(('Crunchbase', DataSource.objects.get(name='Crunchbase'), cb_amount, 0.75))
        
        if capital_type_code in ['FDI', 'MA'] and country_code in ['USA', 'CHN', 'DEU', 'JPN', 'GBR', 'FRA']:
            # FDI, M&A는 OECD도 추가 (OECD 회원국에서만)
            oecd_amount = base_amount * random.uniform(0.98, 1.02)  # ±2% 변동 (정확도 높음)
            sources_data.append(('OECD', DataSource.objects.get(name='OECD'), oecd_amount, 0.90))
        
        return sources_data
    
    def _final_validation(self, amount, country_code, sector_code):
        """최종 검증 및 조정"""
        
        # 절대 상한선 (시스템 전체)
        absolute_max = 500_000_000_000  # $500B (어떤 단일 레코드도 이를 넘을 수 없음)
        
        if amount > absolute_max:
            logger.warning(f"절대 상한선 초과로 조정: {country_code}-{sector_code}: ${amount:,.0f} → ${absolute_max:,.0f}")
            return absolute_max
        
        # 최소값 보장
        min_amount = 1_000_000  # $1M
        if amount < min_amount:
            return min_amount
        
        return amount
    
    def _fuse_multi_source_data(self, sources_data):
        """다중 소스 데이터 융합 (개선된 로직)"""
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
        
        # 평균 신뢰도 (소스 다양성 보너스 축소)
        avg_confidence = sum(data[3] for data in sources_data) / len(sources_data)
        diversity_bonus = min(0.05, len(sources_data) * 0.02)  # 기존 0.2 → 0.05로 축소
        final_confidence = min(0.95, avg_confidence + diversity_bonus)
        
        # 변동성 계산 (표준편차)
        variance = sum((amount - final_amount) ** 2 for amount in amounts) / len(amounts)
        
        return final_amount, final_confidence, len(sources_data), variance
