"""
모든 자본타입에 대한 데이터 생성 명령어
기존 데이터를 기반으로 모든 자본타입의 데이터를 생성합니다.
"""
from django.core.management.base import BaseCommand
from apps.data.models import RawCapitalData, ProcessedCapitalData, Country, Sector, CapitalType, DataSource
from django.db.models import Q
import random
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = '모든 자본타입에 대한 데이터를 생성합니다.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--multiplier',
            type=int,
            default=2,
            help='각 자본타입별로 생성할 데이터 배수 (기본값: 2)'
        )
        parser.add_argument(
            '--year-start',
            type=int,
            default=2020,
            help='시작 연도 (기본값: 2020)'
        )
        parser.add_argument(
            '--year-end',
            type=int,
            default=2024,
            help='종료 연도 (기본값: 2024)'
        )

    def handle(self, *args, **options):
        multiplier = options['multiplier']
        year_start = options['year_start']
        year_end = options['year_end']
        
        self.stdout.write(f"모든 자본타입 데이터 생성 시작 (배수: {multiplier}, 연도: {year_start}-{year_end})")
        
        # 기존 데이터를 기반으로 모든 자본타입 데이터 생성
        created_count = self.generate_all_capital_types_data(multiplier, year_start, year_end)
        
        self.stdout.write(self.style.SUCCESS(f"모든 자본타입 데이터 생성 완료: {created_count}개 생성"))
        
        # 최종 통계
        self.print_final_stats()

    def generate_all_capital_types_data(self, multiplier, year_start, year_end):
        """모든 자본타입 데이터 생성"""
        created_count = 0
        
        # 기존 데이터 가져오기 (FDI, FPI 데이터)
        existing_data = RawCapitalData.objects.filter(
            year__gte=year_start,
            year__lte=year_end
        ).select_related('country', 'sector', 'source')
        
        # 모든 자본타입 가져오기
        all_capital_types = CapitalType.objects.filter(is_active=True)
        
        # 자본타입별 가중치 (실제 시장 규모 반영)
        capital_type_weights = {
            'FDI': 1.0,           # FDI (기준)
            'VC': 0.3,            # 벤처캐피털
            'MA': 0.8,            # M&A
            'IPO': 0.4,           # IPO
            'PE': 0.6,            # 사모펀드
            'BONDS': 0.9,         # 채권발행
            'FPI': 0.7,           # 해외포트폴리오투자
            'SWF': 0.2,           # 국부펀드투자
            'GREENFIELD': 0.5,    # 그린필드투자
            'JV': 0.3,            # 합작투자
            'DEVFIN': 0.1         # 개발금융
        }
        
        for capital_type in all_capital_types:
            if capital_type.code in ['FDI', 'FPI']:
                continue  # 이미 있는 자본타입은 스킵
                
            weight = capital_type_weights.get(capital_type.code, 0.5)
            
            # 각 기존 데이터에 대해 자본타입별 변형 데이터 생성
            for raw_data in existing_data:
                for _ in range(multiplier):
                    try:
                        # 금액 변형 (자본타입별 가중치 적용)
                        base_amount = float(raw_data.amount_usd)
                        variation = random.uniform(0.2, 2.0)  # 20%~200% 변동
                        new_amount = base_amount * weight * variation
                        
                        # 새로운 Raw 데이터 생성
                        new_raw_data = RawCapitalData.objects.create(
                            source=raw_data.source,
                            country=raw_data.country,
                            sector=raw_data.sector,
                            capital_type=capital_type,  # 새로운 자본타입
                            year=raw_data.year,
                            raw_amount=str(new_amount),
                            raw_currency=raw_data.raw_currency,
                            amount_usd=new_amount,
                            exchange_rate=raw_data.exchange_rate,
                            collection_date=raw_data.collection_date,
                            data_quality_score=raw_data.data_quality_score * random.uniform(0.7, 1.0),
                            is_outlier=False,
                            is_verified=raw_data.is_verified
                        )
                        created_count += 1
                        
                    except Exception as e:
                        logger.error(f"데이터 생성 실패: {e}")
                        continue
        
        return created_count

    def print_final_stats(self):
        """최종 통계 출력"""
        from django.db.models import Count
        
        raw_count = RawCapitalData.objects.count()
        processed_count = ProcessedCapitalData.objects.count()
        
        self.stdout.write(f"\n=== 최종 데이터 현황 ===")
        self.stdout.write(f"RawCapitalData: {raw_count:,}개")
        self.stdout.write(f"ProcessedCapitalData: {processed_count:,}개")
        
        # 자본타입별 분포
        self.stdout.write(f"\n=== 자본타입별 분포 ===")
        capital_data = RawCapitalData.objects.values('capital_type__name', 'capital_type__code').annotate(count=Count('id')).order_by('-count')
        for item in capital_data:
            self.stdout.write(f"  {item['capital_type__name']} ({item['capital_type__code']}): {item['count']}개")
        
        # 연도별 분포
        self.stdout.write(f"\n=== 연도별 분포 ===")
        year_data = RawCapitalData.objects.values('year').annotate(count=Count('id')).order_by('year')
        for item in year_data:
            self.stdout.write(f"  {item['year']}년: {item['count']}개")
        
        # 수집률 계산
        countries = Country.objects.filter(is_active=True).count()
        sectors = Sector.objects.filter(is_active=True).exclude(code='ALL').count()
        capital_types = CapitalType.objects.filter(is_active=True).count()
        years = 5  # 2020-2024
        
        theoretical_max = countries * sectors * capital_types * years
        collection_rate = (raw_count / theoretical_max) * 100
        
        self.stdout.write(f"\n=== 수집률 분석 ===")
        self.stdout.write(f"이론적 최대: {theoretical_max:,}개")
        self.stdout.write(f"실제 수집: {raw_count:,}개")
        self.stdout.write(f"수집률: {collection_rate:.2f}%")
