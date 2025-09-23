from django.core.management.base import BaseCommand
from decimal import Decimal
from apps.data.models import (
    Country, Sector, CapitalType, DataSource,
    RawCapitalData, ProcessedCapitalData
)


class Command(BaseCommand):
    help = '테스트용 자본 데이터 생성'

    def handle(self, *args, **options):
        self.stdout.write('테스트 데이터 생성 시작...')
        
        # 주요 국가들
        countries = ['USA', 'CHN', 'JPN', 'KOR', 'DEU', 'GBR', 'FRA', 'CAN', 'AUS', 'SGP']
        # 주요 분야들
        sectors = ['AI', 'SEMICONDUCTOR', 'BIO', 'ENERGY', 'FINTECH']
        # 주요 자본 타입들
        capital_types = ['FDI', 'VC', 'MA', 'IPO', 'PE']
        # 연도 범위
        years = [2021, 2022, 2023, 2024]
        
        # 데이터 소스 가져오기
        imf_source = DataSource.objects.get(name='IMF')
        crunchbase_source = DataSource.objects.get(name='Crunchbase')
        
        created_count = 0
        
        for country_code in countries:
            try:
                country = Country.objects.get(code=country_code)
            except Country.DoesNotExist:
                continue
                
            for sector_code in sectors:
                try:
                    sector = Sector.objects.get(code=sector_code)
                except Sector.DoesNotExist:
                    continue
                    
                for capital_type_code in capital_types:
                    try:
                        capital_type = CapitalType.objects.get(code=capital_type_code)
                    except CapitalType.DoesNotExist:
                        continue
                        
                    for year in years:
                        # 국가별, 분야별, 자본타입별로 다른 기본 금액 설정
                        base_amounts = {
                            'USA': {'AI': 50000, 'SEMICONDUCTOR': 30000, 'BIO': 40000, 'ENERGY': 35000, 'FINTECH': 25000},
                            'CHN': {'AI': 35000, 'SEMICONDUCTOR': 45000, 'BIO': 20000, 'ENERGY': 40000, 'FINTECH': 15000},
                            'JPN': {'AI': 20000, 'SEMICONDUCTOR': 35000, 'BIO': 15000, 'ENERGY': 25000, 'FINTECH': 12000},
                            'KOR': {'AI': 15000, 'SEMICONDUCTOR': 25000, 'BIO': 10000, 'ENERGY': 15000, 'FINTECH': 8000},
                            'DEU': {'AI': 18000, 'SEMICONDUCTOR': 20000, 'BIO': 25000, 'ENERGY': 30000, 'FINTECH': 10000},
                            'GBR': {'AI': 22000, 'SEMICONDUCTOR': 15000, 'BIO': 18000, 'ENERGY': 20000, 'FINTECH': 15000},
                            'FRA': {'AI': 16000, 'SEMICONDUCTOR': 12000, 'BIO': 20000, 'ENERGY': 18000, 'FINTECH': 9000},
                            'CAN': {'AI': 12000, 'SEMICONDUCTOR': 8000, 'BIO': 12000, 'ENERGY': 25000, 'FINTECH': 7000},
                            'AUS': {'AI': 8000, 'SEMICONDUCTOR': 5000, 'BIO': 8000, 'ENERGY': 15000, 'FINTECH': 5000},
                            'SGP': {'AI': 10000, 'SEMICONDUCTOR': 8000, 'BIO': 6000, 'ENERGY': 8000, 'FINTECH': 12000},
                        }
                        
                        # 자본타입별 계수
                        capital_multipliers = {
                            'FDI': 1.0,
                            'VC': 0.7,
                            'MA': 0.9,
                            'IPO': 0.4,
                            'PE': 0.6,
                        }
                        
                        # 연도별 성장률
                        year_multipliers = {
                            2021: 0.8,
                            2022: 0.9,
                            2023: 1.0,
                            2024: 1.1,
                        }
                        
                        # 기본 금액 계산
                        base_amount = base_amounts.get(country_code, {}).get(sector_code, 10000)
                        final_amount = (
                            base_amount * 
                            capital_multipliers[capital_type_code] * 
                            year_multipliers[year] * 
                            1000000  # 백만 달러 단위
                        )
                        
                        # RawCapitalData 생성 (IMF 소스)
                        raw_data_imf, created = RawCapitalData.objects.get_or_create(
                            source=imf_source,
                            country=country,
                            sector=sector,
                            capital_type=capital_type,
                            year=year,
                            defaults={
                                'raw_amount': Decimal(str(final_amount)),
                                'raw_currency': 'USD',
                                'amount_usd': Decimal(str(final_amount)),
                                'is_verified': True,
                                'data_quality_score': 0.9
                            }
                        )
                        
                        if created:
                            created_count += 1
                        
                        # VC 데이터는 Crunchbase에서도 생성
                        if capital_type_code == 'VC':
                            # 약간 다른 금액으로 생성 (소스 간 차이 시뮬레이션)
                            variance_amount = final_amount * 1.1
                            
                            raw_data_cb, created = RawCapitalData.objects.get_or_create(
                                source=crunchbase_source,
                                country=country,
                                sector=sector,
                                capital_type=capital_type,
                                year=year,
                                defaults={
                                    'raw_amount': Decimal(str(variance_amount)),
                                    'raw_currency': 'USD',
                                    'amount_usd': Decimal(str(variance_amount)),
                                    'is_verified': True,
                                    'data_quality_score': 0.75
                                }
                            )
                            
                            if created:
                                created_count += 1
                        
                        # ProcessedCapitalData 생성 (융합된 최종 데이터)
                        if capital_type_code == 'VC':
                            # 두 소스의 가중 평균
                            final_processed_amount = (final_amount * 0.9 + variance_amount * 0.75) / (0.9 + 0.75)
                            confidence = 0.82
                            source_count = 2
                        else:
                            final_processed_amount = final_amount
                            confidence = 0.9
                            source_count = 1
                        
                        processed_data, created = ProcessedCapitalData.objects.get_or_create(
                            country=country,
                            sector=sector,
                            capital_type=capital_type,
                            year=year,
                            defaults={
                                'final_amount_usd': Decimal(str(final_processed_amount)),
                                'fusion_method': 'WEIGHTED_AVG' if source_count > 1 else 'SINGLE_SOURCE',
                                'confidence_score': confidence,
                                'source_count': source_count,
                                'variance': abs(variance_amount - final_amount) if capital_type_code == 'VC' else 0,
                                'is_predicted': False
                            }
                        )
                        
                        if created:
                            created_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(f'테스트 데이터 생성 완료! {created_count}개 레코드 생성')
        )
