from django.core.management.base import BaseCommand
from decimal import Decimal
from apps.data.models import Country, Sector, CapitalType, DataSource


class Command(BaseCommand):
    help = '메타데이터 초기화 (국가, 분야, 자본타입, 데이터소스)'

    def handle(self, *args, **options):
        self.stdout.write('메타데이터 초기화 시작...')
        
        # 국가 데이터
        countries = [
            ('USA', 'United States', 'United States', 'North America', 'North America'),
            ('CHN', 'China', 'China', 'East Asia', 'Asia'),
            ('JPN', 'Japan', 'Japan', 'East Asia', 'Asia'),
            ('DEU', 'Germany', 'Germany', 'Western Europe', 'Europe'),
            ('GBR', 'United Kingdom', 'United Kingdom', 'Western Europe', 'Europe'),
            ('FRA', 'France', 'France', 'Western Europe', 'Europe'),
            ('KOR', 'South Korea', 'South Korea', 'East Asia', 'Asia'),
            ('CAN', 'Canada', 'Canada', 'North America', 'North America'),
            ('AUS', 'Australia', 'Australia', 'Oceania', 'Oceania'),
            ('IND', 'India', 'India', 'South Asia', 'Asia'),
            ('BRA', 'Brazil', 'Brazil', 'South America', 'South America'),
            ('RUS', 'Russia', 'Russia', 'Eastern Europe', 'Europe'),
            ('ITA', 'Italy', 'Italy', 'Southern Europe', 'Europe'),
            ('ESP', 'Spain', 'Spain', 'Southern Europe', 'Europe'),
            ('NLD', 'Netherlands', 'Netherlands', 'Western Europe', 'Europe'),
            ('TWN', 'Taiwan', 'Taiwan', 'East Asia', 'Asia'),
            ('SGP', 'Singapore', 'Singapore', 'Southeast Asia', 'Asia'),
            ('CHE', 'Switzerland', 'Switzerland', 'Western Europe', 'Europe'),
            ('SWE', 'Sweden', 'Sweden', 'Northern Europe', 'Europe'),
            ('DNK', 'Denmark', 'Denmark', 'Northern Europe', 'Europe'),
            ('NOR', 'Norway', 'Norway', 'Northern Europe', 'Europe'),
            ('SAU', 'Saudi Arabia', 'Saudi Arabia', 'Middle East', 'Asia'),
            ('MEX', 'Mexico', 'Mexico', 'North America', 'North America'),
            ('ARE', 'UAE', 'United Arab Emirates', 'Middle East', 'Asia'),
            ('BEL', 'Belgium', 'Belgium', 'Western Europe', 'Europe'),
            ('IRL', 'Ireland', 'Ireland', 'Western Europe', 'Europe'),
            ('ISR', 'Israel', 'Israel', 'Middle East', 'Asia'),
            ('MYS', 'Malaysia', 'Malaysia', 'Southeast Asia', 'Asia'),
            ('THA', 'Thailand', 'Thailand', 'Southeast Asia', 'Asia'),
            ('VEN', 'Venezuela', 'Venezuela', 'South America', 'South America'),
            ('IRN', 'Iran', 'Iran', 'Middle East', 'Asia'),
            ('HKG', 'Hong Kong', 'Hong Kong', 'East Asia', 'Asia'),
        ]
        
        for code, name, name_en, region, continent in countries:
            Country.objects.get_or_create(
                code=code,
                defaults={
                    'name': name,
                    'name_en': name_en,
                    'region': region,
                    'continent': continent,
                    'is_active': True
                }
            )
        
        self.stdout.write(f'국가 데이터 생성 완료: {len(countries)}개')
        
        # 분야 데이터
        sectors = [
            ('ALL', '전체', 'All Sectors', '모든 분야'),
            ('AI', '인공지능', 'Artificial Intelligence', 'AI/ML, 딥러닝, 자연어처리 등'),
            ('SEMICONDUCTOR', '반도체', 'Semiconductor', '반도체 설계, 제조, 장비'),
            ('BIO', '바이오', 'Biotechnology', '바이오테크, 제약, 헬스케어'),
            ('ENERGY', '에너지', 'Energy', '신재생에너지, 석유, 가스'),
            ('FINTECH', '핀테크', 'Financial Technology', '금융기술, 결제, 블록체인'),
            ('AUTOMOTIVE', '자동차', 'Automotive', '자동차, 전기차, 자율주행'),
            ('AEROSPACE', '항공우주', 'Aerospace & Defense', '항공우주, 국방'),
            ('TELECOM', '통신', 'Telecommunications', '5G, 통신장비, 네트워크'),
            ('REALESTATE', '부동산', 'Real Estate', '부동산, 건설, 인프라'),
            ('AGRICULTURE', '농업', 'Agriculture', '농업, 푸드테크, 애그테크'),
        ]
        
        for code, name, name_en, description in sectors:
            Sector.objects.get_or_create(
                code=code,
                defaults={
                    'name': name,
                    'name_en': name_en,
                    'description': description,
                    'is_active': True
                }
            )
        
        self.stdout.write(f'분야 데이터 생성 완료: {len(sectors)}개')
        
        # 자본 타입 데이터
        capital_types = [
            ('FDI', 'FDI (외국인직접투자)', 'Foreign Direct Investment', '공장·법인 설립, 해외 지사 확장, 해외 지분 10% 이상 취득'),
            ('VC', 'VC (벤처캐피털)', 'Venture Capital', '스타트업/신생 기업 초기 및 성장 단계 자금 투자'),
            ('MA', 'M&A (인수합병)', 'Mergers & Acquisitions', '기업 매각·인수·합병 거래'),
            ('IPO', 'IPO (기업공개)', 'Initial Public Offering', '주식시장 신규 상장 및 자본 유입'),
            ('PE', 'PE (사모펀드)', 'Private Equity', '상장폐지 후 기업 인수, 구조조정, Buyout 투자'),
            ('BONDS', 'Bonds (채권발행)', 'Debt/Bonds', '국채, 회사채 발행을 통한 자금 조달'),
            ('FPI', 'FPI (해외포트폴리오투자)', 'Foreign Portfolio Investment', '외국인이 주식·채권에 단기/간접 투자하는 자금 흐름'),
            ('SWF', 'SWF (국부펀드투자)', 'Sovereign Wealth Funds', '국가 단위에서 해외 투자'),
            ('GREENFIELD', 'Greenfield (그린필드투자)', 'Greenfield Investment', '해외에 신규 공장·인프라 건설'),
            ('JV', 'JV (합작투자)', 'Joint Ventures', '두 기업/국가 간 공동 법인 설립 자금'),
            ('DEVFIN', 'DevFin (개발금융)', 'Development Finance', '세계은행, ADB, ODA 같은 개발 자금'),
        ]
        
        for code, name, name_en, description in capital_types:
            CapitalType.objects.get_or_create(
                code=code,
                defaults={
                    'name': name,
                    'name_en': name_en,
                    'description': description,
                    'is_active': True
                }
            )
        
        self.stdout.write(f'자본 타입 데이터 생성 완료: {len(capital_types)}개')
        
        # 데이터 소스
        data_sources = [
            ('IMF', 'IMF Balance of Payments', 'OFFICIAL', 'HIGH', 0.95, 'https://data.imf.org/BOP', 'Quarterly'),
            ('OECD', 'OECD FDI Statistics', 'OFFICIAL', 'HIGH', 0.90, 'https://stats.oecd.org/fdi', 'Annual'),
            ('UNCTAD', 'UNCTAD World Investment Report', 'OFFICIAL', 'HIGH', 0.90, 'https://unctad.org/wir', 'Annual'),
            ('Crunchbase', 'Crunchbase Funding Data', 'PRIVATE_DB', 'MEDIUM', 0.75, 'https://api.crunchbase.com', 'Real-time'),
            ('PitchBook', 'PitchBook VC/PE Data', 'PRIVATE_DB', 'MEDIUM', 0.80, 'https://pitchbook.com', 'Real-time'),
            ('Refinitiv', 'Refinitiv M&A Data', 'PRIVATE_DB', 'MEDIUM', 0.78, 'https://refinitiv.com', 'Real-time'),
            ('Bloomberg', 'Bloomberg Terminal', 'PRIVATE_DB', 'MEDIUM', 0.82, 'https://bloomberg.com', 'Real-time'),
            ('World Bank', 'World Bank Financial Data', 'OFFICIAL', 'HIGH', 0.88, 'https://data.worldbank.org', 'Annual'),
            ('BIS', 'Bank for International Settlements', 'OFFICIAL', 'HIGH', 0.92, 'https://bis.org/statistics', 'Quarterly'),
            ('CB Insights', 'CB Insights Venture Data', 'PRIVATE_DB', 'MEDIUM', 0.70, 'https://cbinsights.com', 'Real-time'),
            # 추가 중앙은행 및 국제기구
            ('Fed (US)', 'Federal Reserve Economic Data (FRED)', 'OFFICIAL', 'HIGH', 0.94, 'https://api.stlouisfed.org/fred/', 'Daily'),
            ('ECB', 'European Central Bank Statistical Data', 'OFFICIAL', 'HIGH', 0.93, 'https://data-api.ecb.europa.eu/', 'Daily'),
            ('Bank of England', 'Bank of England Statistical Database', 'OFFICIAL', 'HIGH', 0.91, 'https://www.bankofengland.co.uk/boeapps/database/', 'Weekly'),
            ('Bank of Japan', 'Bank of Japan Economic Statistics', 'OFFICIAL', 'HIGH', 0.90, 'https://www.stat-search.boj.or.jp/', 'Monthly'),
            ('Bank of Korea', 'Bank of Korea ECOS', 'OFFICIAL', 'HIGH', 0.89, 'https://ecos.bok.or.kr/api/', 'Monthly'),
            ('Bank of Canada', 'Bank of Canada Data', 'OFFICIAL', 'HIGH', 0.88, 'https://www.bankofcanada.ca/valet/', 'Daily'),
            ('RBA', 'Reserve Bank of Australia', 'OFFICIAL', 'HIGH', 0.87, 'https://www.rba.gov.au/statistics/', 'Monthly'),
            ('PBOC', 'People\'s Bank of China Statistics', 'OFFICIAL', 'HIGH', 0.85, 'http://www.pbc.gov.cn/english/', 'Monthly'),
            ('RBI', 'Reserve Bank of India Database', 'OFFICIAL', 'HIGH', 0.84, 'https://dbie.rbi.org.in/', 'Monthly'),
            ('BCB', 'Central Bank of Brazil', 'OFFICIAL', 'HIGH', 0.83, 'https://www3.bcb.gov.br/sgspub/', 'Monthly'),
            # 추가 무료 데이터 소스
            ('UN Statistics', 'United Nations Statistics Division', 'OFFICIAL', 'HIGH', 0.86, 'https://unstats.un.org/home/', 'Annual'),
            ('WTO', 'World Trade Organization Statistics', 'OFFICIAL', 'HIGH', 0.85, 'https://www.wto.org/english/res_e/statis_e/', 'Annual'),
            ('Eurostat', 'European Statistics', 'OFFICIAL', 'HIGH', 0.87, 'https://ec.europa.eu/eurostat/data/database', 'Monthly'),
            ('KOSIS', 'Korean Statistical Information Service', 'OFFICIAL', 'HIGH', 0.88, 'https://kosis.kr/openapi/', 'Monthly'),
            ('ONS UK', 'UK Office for National Statistics', 'OFFICIAL', 'HIGH', 0.86, 'https://api.ons.gov.uk/', 'Monthly'),
            ('Statistics Canada', 'Statistics Canada Open Data', 'OFFICIAL', 'HIGH', 0.85, 'https://www150.statcan.gc.ca/t1/wds/', 'Monthly'),
        ]
        
        for name, description, source_type, reliability_level, weight, endpoint, frequency in data_sources:
            DataSource.objects.get_or_create(
                name=name,
                defaults={
                    'description': description,
                    'source_type': source_type,
                    'reliability_level': reliability_level,
                    'reliability_weight': weight,
                    'api_endpoint': endpoint,
                    'update_frequency': frequency,
                    'is_active': True
                }
            )
        
        self.stdout.write(f'데이터 소스 생성 완료: {len(data_sources)}개')
        
        self.stdout.write(
            self.style.SUCCESS('메타데이터 초기화 완료!')
        )
