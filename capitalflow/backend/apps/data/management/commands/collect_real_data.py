from django.core.management.base import BaseCommand
from apps.data.services.data_collectors import DataCollectionService
from apps.data.services.external_collectors import ExtendedDataCollectionService
from apps.data.services.data_fusion import DataFusionService
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = '실제 외부 소스에서 데이터 수집 및 융합'

    def add_arguments(self, parser):
        parser.add_argument(
            '--year', 
            type=int, 
            default=2023,
            help='수집할 연도'
        )
        parser.add_argument(
            '--sources',
            nargs='+',
            choices=['imf', 'worldbank', 'unctad', 'bis', 'crunchbase', 'all'],
            default=['all'],
            help='수집할 데이터 소스'
        )
        parser.add_argument(
            '--fuse',
            action='store_true',
            help='수집 후 데이터 융합 실행'
        )

    def handle(self, *args, **options):
        year = options['year']
        sources = options['sources']
        fuse = options['fuse']
        
        self.stdout.write(f'실제 데이터 수집 시작 (연도: {year}, 소스: {sources})')
        
        # 기본 데이터 수집 서비스
        collector = DataCollectionService()
        
        # 확장 데이터 수집 서비스
        extended_collector = ExtendedDataCollectionService()
        
        total_collected = 0
        
        try:
            if 'all' in sources or 'imf' in sources:
                self.stdout.write('IMF 데이터 수집 중...')
                imf_results = collector.collect_source('imf', year=year)
                total_collected += imf_results
                self.stdout.write(f'IMF: {imf_results}건 수집')
            
            if 'all' in sources or 'worldbank' in sources:
                self.stdout.write('World Bank 데이터 수집 중...')
                wb_results = extended_collector.collect_worldbank_data(year)
                total_collected += wb_results.get('collected', 0)
                self.stdout.write(f'World Bank: {wb_results.get("collected", 0)}건 수집')
            
            if 'all' in sources or 'unctad' in sources:
                self.stdout.write('UNCTAD 데이터 수집 중...')
                unctad_results = extended_collector.collect_unctad_data(year)
                total_collected += unctad_results.get('collected', 0)
                self.stdout.write(f'UNCTAD: {unctad_results.get("collected", 0)}건 수집')
            
            if 'all' in sources or 'bis' in sources:
                self.stdout.write('BIS 데이터 수집 중...')
                bis_results = extended_collector.collect_bis_data(year)
                total_collected += bis_results.get('collected', 0)
                self.stdout.write(f'BIS: {bis_results.get("collected", 0)}건 수집')
            
            if 'all' in sources or 'crunchbase' in sources:
                self.stdout.write('Crunchbase 데이터 수집 중...')
                cb_results = collector.collect_source('crunchbase', year=year)
                total_collected += cb_results
                self.stdout.write(f'Crunchbase: {cb_results}건 수집')
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'데이터 수집 완료! 총 {total_collected}건 수집'
                )
            )
            
            # 데이터 융합 실행
            if fuse and total_collected > 0:
                self.stdout.write('데이터 융합 시작...')
                fusion_service = DataFusionService()
                fusion_results = fusion_service.batch_fusion(
                    year_start=year,
                    year_end=year
                )
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'데이터 융합 완료! '
                        f'처리: {fusion_results.get("processed", 0)}건, '
                        f'생성: {fusion_results.get("created", 0)}건, '
                        f'업데이트: {fusion_results.get("updated", 0)}건'
                    )
                )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'데이터 수집 실패: {e}')
            )
            logger.error(f"데이터 수집 실패: {e}")
