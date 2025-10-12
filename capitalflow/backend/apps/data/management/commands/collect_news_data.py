"""
뉴스 데이터 사전 수집 명령어
연도별, 분야별, 자본타입별로 뉴스를 미리 수집하여 데이터베이스에 저장
"""

from django.core.management.base import BaseCommand
from apps.data.models import NewsData
from apps.data.services.news_crawler import NewsService
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = '연도별, 분야별, 자본타입별 뉴스 데이터를 사전 수집합니다'

    def add_arguments(self, parser):
        parser.add_argument(
            '--years',
            nargs='+',
            type=int,
            default=list(range(2015, 2025)),
            help='수집할 연도 목록 (기본값: 2015-2024)'
        )
        parser.add_argument(
            '--sectors',
            nargs='+',
            default=['AI', 'SEMICONDUCTOR', 'BIO', 'ENERGY', 'FINTECH', 'AUTOMOTIVE', 'AEROSPACE', 'TELECOM', 'REALESTATE', 'AGRICULTURE'],
            help='수집할 분야 목록'
        )
        parser.add_argument(
            '--capital-types',
            nargs='+',
            default=['FDI', 'FPI', 'VC', 'PE', 'MA', 'IPO', 'BONDS', 'SWF', 'GREENFIELD', 'JV', 'DEVFIN'],
            help='수집할 자본타입 목록'
        )
        parser.add_argument(
            '--countries',
            nargs='+',
            default=['USA', 'CHN', 'JPN', 'KOR', 'GBR', 'DEU', 'FRA', 'IND', 'BRA', 'CAN'],
            help='수집할 국가 목록'
        )
        parser.add_argument(
            '--max-articles',
            type=int,
            default=20,
            help='분야/자본타입 조합당 최대 뉴스 수 (기본값: 20)'
        )

    def handle(self, *args, **options):
        years = options['years']
        sectors = options['sectors']
        capital_types = options['capital_types']
        countries = options['countries']
        max_articles = options['max_articles']
        
        self.stdout.write(f'🚀 뉴스 데이터 사전 수집 시작...')
        self.stdout.write(f'연도: {years}')
        self.stdout.write(f'분야: {sectors}')
        self.stdout.write(f'자본타입: {capital_types}')
        self.stdout.write(f'국가: {countries}')
        
        news_service = NewsService()
        total_combinations = len(years) * len(sectors) * len(capital_types)
        processed = 0
        total_collected = 0
        
        for year in years:
            self.stdout.write(f'\n📅 {year}년 뉴스 수집 중...')
            
            for sector in sectors:
                for capital_type in capital_types:
                    processed += 1
                    self.stdout.write(f'  [{processed}/{total_combinations}] {sector} + {capital_type}...')
                    
                    try:
                        # 뉴스 수집
                        news_data = news_service.get_related_news(
                            year=year,
                            sector=sector,
                            capital_type=capital_type
                        )
                        
                        articles = news_data.get('articles', [])
                        if not articles:
                            self.stdout.write(f'    ⚠️ 뉴스 없음')
                            continue
                        
                        # 데이터베이스에 저장
                        saved_count = 0
                        for article in articles[:max_articles]:
                            try:
                                # 기존 데이터 중복 확인
                                existing = NewsData.objects.filter(
                                    year=year,
                                    sector=sector,
                                    capital_type=capital_type,
                                    url=article.get('url', ''),
                                    title=article.get('title', '')
                                ).exists()
                                
                                if existing:
                                    continue
                                
                                # 발행일시 처리
                                published_at = article.get('publishedAt')
                                if isinstance(published_at, str):
                                    try:
                                        published_at = datetime.fromisoformat(published_at.replace('Z', '+00:00'))
                                    except:
                                        published_at = datetime.now()
                                elif not published_at:
                                    published_at = datetime.now()
                                
                                NewsData.objects.create(
                                    year=year,
                                    sector=sector,
                                    capital_type=capital_type,
                                    title=article.get('title', '')[:500],  # 제목 길이 제한
                                    description=article.get('description', '')[:1000],  # 설명 길이 제한
                                    url=article.get('url', ''),
                                    source=article.get('source', {}).get('name', 'Unknown')[:100],
                                    published_at=published_at,
                                    image_url=article.get('urlToImage', ''),
                                    relevance_score=article.get('relevance_score', 0.5),
                                    search_query=f"{sector} {capital_type} {year}",
                                    is_active=True
                                )
                                saved_count += 1
                                
                            except Exception as e:
                                logger.warning(f"뉴스 저장 실패: {e}")
                                continue
                        
                        total_collected += saved_count
                        self.stdout.write(f'    ✅ {saved_count}개 뉴스 저장')
                        
                    except Exception as e:
                        self.stdout.write(f'    ❌ 오류: {e}')
                        logger.error(f"뉴스 수집 실패 ({year}, {sector}, {capital_type}): {e}")
                        continue
        
        self.stdout.write(f'\n🎉 뉴스 데이터 수집 완료!')
        self.stdout.write(f'총 {total_collected}개의 뉴스가 저장되었습니다.')
        
        # 통계 출력
        total_news = NewsData.objects.count()
        self.stdout.write(f'데이터베이스 총 뉴스 수: {total_news}개')
        
        # 연도별 통계
        year_stats = NewsData.objects.values('year').distinct().count()
        self.stdout.write(f'수집된 연도 수: {year_stats}개')
        
        # 분야별 통계
        sector_stats = NewsData.objects.values('sector').distinct().count()
        self.stdout.write(f'수집된 분야 수: {sector_stats}개')
