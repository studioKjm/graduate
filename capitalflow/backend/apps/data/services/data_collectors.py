"""
다중 소스 데이터 수집 서비스
"""
import requests
import pandas as pd
from decimal import Decimal
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
import logging
from django.conf import settings
from django.utils import timezone as django_timezone

from ..models import DataSource, RawCapitalData, Country, Sector, CapitalType, DataProcessingLog
from .external_collectors import ExtendedDataCollectionService

logger = logging.getLogger(__name__)


class BaseDataCollector:
    """데이터 수집기 기본 클래스"""
    
    def __init__(self, source: DataSource):
        self.source = source
        self.session = requests.Session()
        self.session.headers.update({'User-Agent': 'CapitalFlow/1.0'})
    
    def collect_data(self, **kwargs) -> List[Dict[str, Any]]:
        """데이터 수집 - 하위 클래스에서 구현"""
        raise NotImplementedError
    
    def standardize_data(self, raw_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """데이터 표준화"""
        standardized = []
        
        for record in raw_data:
            try:
                std_record = self._standardize_record(record)
                if std_record:
                    standardized.append(std_record)
            except Exception as e:
                logger.error(f"데이터 표준화 실패: {record}, 오류: {e}")
                continue
        
        return standardized
    
    def _standardize_record(self, record: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """개별 레코드 표준화"""
        try:
            # 국가 코드 표준화
            country_code = self._standardize_country_code(record.get('country'))
            if not country_code:
                return None
            
            # 분야 코드 표준화
            sector_code = self._standardize_sector_code(record.get('sector'))
            if not sector_code:
                return None
            
            # 자본 타입 표준화
            capital_type_code = self._standardize_capital_type(record.get('capital_type'))
            if not capital_type_code:
                return None
            
            # 금액 표준화
            amount = self._standardize_amount(record.get('amount'))
            if amount is None:
                return None
            
            return {
                'country_code': country_code,
                'sector_code': sector_code,
                'capital_type_code': capital_type_code,
                'year': int(record.get('year', 0)),
                'raw_amount': amount,
                'raw_currency': record.get('currency', 'USD'),
                'source_id': self.source.id
            }
        except Exception as e:
            logger.error(f"레코드 표준화 실패: {record}, 오류: {e}")
            return None
    
    def _standardize_country_code(self, country_input: str) -> Optional[str]:
        """국가 코드 표준화 (ISO-3166)"""
        if not country_input:
            return None
        
        # 국가명/코드 매핑 테이블
        country_mapping = {
            'United States': 'USA', 'US': 'USA', 'America': 'USA',
            'China': 'CHN', 'CN': 'CHN', 'People\'s Republic of China': 'CHN',
            'South Korea': 'KOR', 'Korea': 'KOR', 'KR': 'KOR', 'Republic of Korea': 'KOR',
            'Japan': 'JPN', 'JP': 'JPN',
            'Germany': 'DEU', 'DE': 'DEU', 'Deutschland': 'DEU',
            'United Kingdom': 'GBR', 'UK': 'GBR', 'Britain': 'GBR', 'England': 'GBR',
            'France': 'FRA', 'FR': 'FRA',
            'Canada': 'CAN', 'CA': 'CAN',
            'Australia': 'AUS', 'AU': 'AUS',
            'India': 'IND', 'IN': 'IND',
            'Brazil': 'BRA', 'BR': 'BRA',
            'Russia': 'RUS', 'RU': 'RUS', 'Russian Federation': 'RUS',
            'Taiwan': 'TWN', 'TW': 'TWN', 'Chinese Taipei': 'TWN',
            'Singapore': 'SGP', 'SG': 'SGP',
            'Switzerland': 'CHE', 'CH': 'CHE',
            'Netherlands': 'NLD', 'NL': 'NLD', 'Holland': 'NLD',
            'Sweden': 'SWE', 'SE': 'SWE',
            'Denmark': 'DNK', 'DK': 'DNK',
            'Norway': 'NOR', 'NO': 'NOR',
            'Saudi Arabia': 'SAU', 'SA': 'SAU',
            'Mexico': 'MEX', 'MX': 'MEX',
            'Italy': 'ITA', 'IT': 'ITA',
            'Spain': 'ESP', 'ES': 'ESP',
        }
        
        country_clean = country_input.strip()
        
        # 직접 매핑 확인
        if country_clean in country_mapping:
            return country_mapping[country_clean]
        
        # 이미 3자리 코드인 경우
        if len(country_clean) == 3 and country_clean.isupper():
            return country_clean
        
        # 부분 매칭 시도
        for name, code in country_mapping.items():
            if name.lower() in country_clean.lower() or country_clean.lower() in name.lower():
                return code
        
        logger.warning(f"국가 코드 매핑 실패: {country_input}")
        return None
    
    def _standardize_sector_code(self, sector_input: str) -> Optional[str]:
        """분야 코드 표준화"""
        if not sector_input:
            return None
        
        sector_mapping = {
            'AI': 'AI', 'Artificial Intelligence': 'AI', 'Machine Learning': 'AI',
            'Semiconductor': 'SEMICONDUCTOR', 'Semiconductors': 'SEMICONDUCTOR', 'Chips': 'SEMICONDUCTOR',
            'Biotechnology': 'BIO', 'Biotech': 'BIO', 'Bio': 'BIO', 'Healthcare': 'BIO', 'Pharmaceuticals': 'BIO',
            'Energy': 'ENERGY', 'Oil': 'ENERGY', 'Gas': 'ENERGY', 'Renewable Energy': 'ENERGY',
            'Fintech': 'FINTECH', 'Financial Technology': 'FINTECH', 'Finance': 'FINTECH',
            'Automotive': 'AUTOMOTIVE', 'Auto': 'AUTOMOTIVE', 'Cars': 'AUTOMOTIVE',
            'Aerospace': 'AEROSPACE', 'Aviation': 'AEROSPACE', 'Defense': 'AEROSPACE',
            'Telecommunications': 'TELECOM', 'Telecom': 'TELECOM', 'Communications': 'TELECOM',
            'Real Estate': 'REALESTATE', 'Property': 'REALESTATE', 'Construction': 'REALESTATE',
            'Agriculture': 'AGRICULTURE', 'Farming': 'AGRICULTURE', 'Agtech': 'AGRICULTURE',
        }
        
        sector_clean = sector_input.strip()
        
        # 직접 매핑 확인
        for name, code in sector_mapping.items():
            if name.lower() == sector_clean.lower():
                return code
        
        # 부분 매칭
        for name, code in sector_mapping.items():
            if name.lower() in sector_clean.lower() or sector_clean.lower() in name.lower():
                return code
        
        # 기본값으로 전체 분야
        logger.warning(f"분야 코드 매핑 실패, 기본값 사용: {sector_input}")
        return 'ALL'
    
    def _standardize_capital_type(self, capital_type_input: str) -> Optional[str]:
        """자본 타입 표준화"""
        if not capital_type_input:
            return None
        
        capital_mapping = {
            'FDI': 'FDI', 'Foreign Direct Investment': 'FDI', 'Direct Investment': 'FDI',
            'VC': 'VC', 'Venture Capital': 'VC', 'Venture': 'VC',
            'M&A': 'MA', 'MA': 'MA', 'Merger': 'MA', 'Acquisition': 'MA', 'Mergers and Acquisitions': 'MA',
            'IPO': 'IPO', 'Initial Public Offering': 'IPO', 'Public Offering': 'IPO',
            'PE': 'PE', 'Private Equity': 'PE', 'Buyout': 'PE',
            'Bonds': 'BONDS', 'Debt': 'BONDS', 'Corporate Bonds': 'BONDS',
            'FPI': 'FPI', 'Foreign Portfolio Investment': 'FPI', 'Portfolio Investment': 'FPI',
            'SWF': 'SWF', 'Sovereign Wealth Fund': 'SWF', 'Sovereign Fund': 'SWF',
            'Greenfield': 'GREENFIELD', 'Greenfield Investment': 'GREENFIELD',
            'JV': 'JV', 'Joint Venture': 'JV', 'Joint Ventures': 'JV',
            'DevFin': 'DEVFIN', 'Development Finance': 'DEVFIN', 'ODA': 'DEVFIN',
        }
        
        capital_clean = capital_type_input.strip()
        
        # 직접 매핑 확인
        for name, code in capital_mapping.items():
            if name.lower() == capital_clean.lower():
                return code
        
        # 부분 매칭
        for name, code in capital_mapping.items():
            if name.lower() in capital_clean.lower():
                return code
        
        logger.warning(f"자본 타입 매핑 실패: {capital_type_input}")
        return None
    
    def _standardize_amount(self, amount_input: Any) -> Optional[Decimal]:
        """금액 표준화"""
        if amount_input is None:
            return None
        
        try:
            # 문자열인 경우 숫자 추출
            if isinstance(amount_input, str):
                # 콤마, 달러 기호 제거
                clean_amount = amount_input.replace(',', '').replace('$', '').strip()
                
                # 단위 처리 (M = Million, B = Billion, K = Thousand)
                multiplier = 1
                if clean_amount.upper().endswith('B'):
                    multiplier = 1_000_000_000
                    clean_amount = clean_amount[:-1]
                elif clean_amount.upper().endswith('M'):
                    multiplier = 1_000_000
                    clean_amount = clean_amount[:-1]
                elif clean_amount.upper().endswith('K'):
                    multiplier = 1_000
                    clean_amount = clean_amount[:-1]
                
                amount_float = float(clean_amount) * multiplier
            else:
                amount_float = float(amount_input)
            
            # 음수 체크
            if amount_float < 0:
                logger.warning(f"음수 금액: {amount_input}")
                return None
            
            return Decimal(str(amount_float))
            
        except (ValueError, TypeError) as e:
            logger.error(f"금액 변환 실패: {amount_input}, 오류: {e}")
            return None
    
    def save_raw_data(self, standardized_data: List[Dict[str, Any]]) -> int:
        """표준화된 데이터를 데이터베이스에 저장"""
        saved_count = 0
        
        for record in standardized_data:
            try:
                # USD 환산 (현재는 단순화하여 1:1)
                amount_usd = record['raw_amount']
                if record['raw_currency'] != 'USD':
                    # 실제로는 환율 API 호출
                    # amount_usd = convert_to_usd(record['raw_amount'], record['raw_currency'])
                    pass
                
                # 객체 조회
                country = Country.objects.get(code=record['country_code'])
                sector = Sector.objects.get(code=record['sector_code'])
                capital_type = CapitalType.objects.get(code=record['capital_type_code'])
                
                # 데이터 저장 또는 업데이트
                raw_data, created = RawCapitalData.objects.update_or_create(
                    source=self.source,
                    country=country,
                    sector=sector,
                    capital_type=capital_type,
                    year=record['year'],
                    defaults={
                        'raw_amount': record['raw_amount'],
                        'raw_currency': record['raw_currency'],
                        'amount_usd': amount_usd,
                        'is_verified': False,
                    }
                )
                
                if created:
                    saved_count += 1
                    
            except Exception as e:
                logger.error(f"데이터 저장 실패: {record}, 오류: {e}")
                continue
        
        return saved_count


class IMFDataCollector(BaseDataCollector):
    """IMF 데이터 수집기"""
    
    def collect_data(self, **kwargs) -> List[Dict[str, Any]]:
        """IMF Balance of Payments 데이터 수집"""
        try:
            # IMF API 호출 (예시)
            url = "https://www.imf.org/external/datamapper/api/v1/BOP"
            
            # 실제 구현에서는 IMF API 형식에 맞게 조정
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            # 임시 더미 데이터 (실제로는 API 응답 파싱)
            dummy_data = [
                {'country': 'USA', 'sector': 'AI', 'capital_type': 'FDI', 'year': 2023, 'amount': '50B', 'currency': 'USD'},
                {'country': 'CHN', 'sector': 'AI', 'capital_type': 'FDI', 'year': 2023, 'amount': '30B', 'currency': 'USD'},
                {'country': 'JPN', 'sector': 'Semiconductor', 'capital_type': 'FDI', 'year': 2023, 'amount': '20B', 'currency': 'USD'},
            ]
            
            return dummy_data
            
        except Exception as e:
            logger.error(f"IMF 데이터 수집 실패: {e}")
            return []


class CrunchbaseDataCollector(BaseDataCollector):
    """Crunchbase VC 데이터 수집기"""
    
    def collect_data(self, **kwargs) -> List[Dict[str, Any]]:
        """Crunchbase API에서 VC 데이터 수집"""
        try:
            # Crunchbase API 호출 (API 키 필요)
            api_key = getattr(settings, 'CRUNCHBASE_API_KEY', None)
            if not api_key:
                logger.warning("Crunchbase API 키가 설정되지 않았습니다.")
                return []
            
            url = "https://api.crunchbase.com/api/v4/searches/funding_rounds"
            headers = {'X-cb-user-key': api_key}
            
            # 검색 조건 설정
            params = {
                'field_ids': ['identifier', 'announced_on', 'money_raised', 'target_money_raised'],
                'limit': 1000
            }
            
            response = self.session.get(url, headers=headers, params=params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            # 데이터 변환
            converted_data = []
            for item in data.get('entities', []):
                properties = item.get('properties', {})
                converted_data.append({
                    'country': self._extract_country_from_crunchbase(item),
                    'sector': self._extract_sector_from_crunchbase(item),
                    'capital_type': 'VC',
                    'year': self._extract_year_from_crunchbase(properties.get('announced_on')),
                    'amount': properties.get('money_raised', {}).get('value', 0),
                    'currency': properties.get('money_raised', {}).get('currency', 'USD')
                })
            
            return converted_data
            
        except Exception as e:
            logger.error(f"Crunchbase 데이터 수집 실패: {e}")
            return []
    
    def _extract_country_from_crunchbase(self, item: Dict) -> str:
        """Crunchbase 데이터에서 국가 추출"""
        # 실제 구현에서는 투자 대상 기업의 본사 위치 등을 파싱
        return 'USA'  # 임시
    
    def _extract_sector_from_crunchbase(self, item: Dict) -> str:
        """Crunchbase 데이터에서 분야 추출"""
        # 실제 구현에서는 카테고리/태그 정보 파싱
        return 'AI'  # 임시
    
    def _extract_year_from_crunchbase(self, date_str: str) -> int:
        """날짜 문자열에서 연도 추출"""
        try:
            if date_str:
                return datetime.fromisoformat(date_str.replace('Z', '+00:00')).year
        except:
            pass
        return 2023  # 기본값


class DataCollectionService:
    """데이터 수집 서비스 통합 관리"""
    
    def __init__(self):
        self.collectors = {}
        self._initialize_collectors()
        self.extended_service = ExtendedDataCollectionService()
    
    def _initialize_collectors(self):
        """수집기 초기화"""
        # 활성 데이터 소스별 수집기 매핑
        source_collector_mapping = {
            'IMF': IMFDataCollector,
            'Crunchbase': CrunchbaseDataCollector,
            # 'OECD': OECDDataCollector,
            # 'PitchBook': PitchBookDataCollector,
            # 추가 수집기들...
        }
        
        for source in DataSource.objects.filter(is_active=True):
            collector_class = source_collector_mapping.get(source.name)
            if collector_class:
                self.collectors[source.name] = collector_class(source)
    
    def collect_all_sources(self, year: Optional[int] = None, sector: Optional[str] = None) -> Dict[str, int]:
        """모든 활성 소스에서 데이터 수집"""
        results = {}
        
        for source_name, collector in self.collectors.items():
            try:
                log_entry = DataProcessingLog.objects.create(
                    processing_type='COLLECTION',
                    status='PARTIAL',
                    source=collector.source,
                    year_start=year,
                    year_end=year,
                    start_time=django_timezone.now()
                )
                
                # 데이터 수집
                raw_data = collector.collect_data(year=year, sector=sector)
                
                # 데이터 표준화
                standardized_data = collector.standardize_data(raw_data)
                
                # 데이터 저장
                saved_count = collector.save_raw_data(standardized_data)
                
                # 로그 업데이트
                log_entry.end_time = django_timezone.now()
                log_entry.status = 'SUCCESS'
                log_entry.records_processed = len(raw_data)
                log_entry.records_success = saved_count
                log_entry.records_failed = len(raw_data) - saved_count
                log_entry.duration_seconds = (log_entry.end_time - log_entry.start_time).total_seconds()
                log_entry.save()
                
                results[source_name] = saved_count
                logger.info(f"{source_name}에서 {saved_count}개 레코드 수집 완료")
                
            except Exception as e:
                # 실패 로그 기록
                if 'log_entry' in locals():
                    log_entry.end_time = django_timezone.now()
                    log_entry.status = 'FAILED'
                    log_entry.error_message = str(e)
                    log_entry.save()
                
                logger.error(f"{source_name} 데이터 수집 실패: {e}")
                results[source_name] = 0
        
        return results
    
    def collect_extended_sources(self, year: int = 2023) -> Dict[str, int]:
        """확장된 외부 소스에서 데이터 수집"""
        
        try:
            logger.info(f"확장 소스 데이터 수집 시작 (년도: {year})")
            
            # 확장 수집 서비스 실행
            results = self.extended_service.collect_all_sources(year)
            
            logger.info(f"확장 소스 수집 완료: {results}")
            return results
            
        except Exception as e:
            logger.error(f"확장 소스 수집 실패: {e}")
            return {'collected': 0, 'created': 0, 'updated': 0, 'failed': 1}
    
    def collect_all_including_extended(self, year: int = 2023) -> Dict[str, int]:
        """기존 + 확장 소스 통합 수집"""
        
        total_results = {'collected': 0, 'created': 0, 'updated': 0, 'failed': 0}
        
        # 기존 소스 수집
        existing_results = self.collect_all_sources(year)
        for key in total_results:
            total_results[key] += existing_results.get(key, 0)
        
        # 확장 소스 수집
        extended_results = self.collect_extended_sources(year)
        for key in total_results:
            total_results[key] += extended_results.get(key, 0)
        
        logger.info(f"통합 수집 완료: {total_results}")
        return total_results
    
    def collect_source(self, source_name: str, **kwargs) -> int:
        """특정 소스에서 데이터 수집"""
        if source_name not in self.collectors:
            raise ValueError(f"지원하지 않는 데이터 소스: {source_name}")
        
        collector = self.collectors[source_name]
        
        # 데이터 수집
        raw_data = collector.collect_data(**kwargs)
        
        # 데이터 표준화
        standardized_data = collector.standardize_data(raw_data)
        
        # 데이터 저장
        saved_count = collector.save_raw_data(standardized_data)
        
        return saved_count
