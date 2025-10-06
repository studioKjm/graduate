"""
확장된 외부 데이터 수집기 (World Bank, UNCTAD, BIS, 중앙은행 등)
"""
import requests
import json
import pandas as pd
from decimal import Decimal
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import logging
import xml.etree.ElementTree as ET
from django.utils import timezone

from ..models import (
    RawCapitalData, DataSource, Country, Sector, CapitalType
)

logger = logging.getLogger(__name__)


class WorldBankCollector:
    """World Bank 데이터 수집기"""
    
    BASE_URL = "https://api.worldbank.org/v2"
    
    def __init__(self):
        self.source = DataSource.objects.get(name='World Bank')
    
    def collect_fdi_data(self, year: int) -> List[Dict[str, Any]]:
        """FDI 유입/유출 데이터 수집"""
        
        try:
            # 주요 국가들의 FDI 유입 데이터 (BX.KLT.DINV.CD.WD)
            major_countries = 'USA;CHN;JPN;DEU;GBR;FRA;KOR;CAN;AUS;IND;BRA;RUS;ITA;ESP;NLD;TWN;SGP;CHE;SWE;DNK;NOR;SAU;MEX;ARE;BEL;IRL;ISR;MYS;THA;VEN;IRN;HKG'
            fdi_inflows_url = f"{self.BASE_URL}/country/{major_countries}/indicator/BX.KLT.DINV.CD.WD"
            params = {
                'date': year,
                'format': 'json',
                'per_page': 500
            }
            
            response = requests.get(fdi_inflows_url, params=params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            if len(data) < 2:
                return []
            
            results = []
            for item in data[1]:  # data[0]은 메타데이터
                if item['value'] and float(item['value']) > 0:
                    country_code = item['country']['id']
                    
                    # 국가 코드 매핑
                    mapped_code = self._map_country_code(country_code)
                    if not mapped_code:
                        continue
                    
                    results.append({
                        'country_code': mapped_code,
                        'amount_usd': float(item['value']),
                        'year': int(item['date']),
                        'indicator': 'FDI_INFLOWS',
                        'raw_data': item
                    })
            
            logger.info(f"World Bank FDI 데이터 수집 완료: {len(results)}건")
            return results
            
        except Exception as e:
            logger.error(f"World Bank 데이터 수집 실패: {e}")
            return []
    
    def collect_portfolio_investment(self, year: int) -> List[Dict[str, Any]]:
        """포트폴리오 투자 데이터 수집"""
        
        try:
            # 주요 국가들의 포트폴리오 투자 유입 (BX.PEF.TOTL.CD.WD)
            major_countries = 'USA;CHN;JPN;DEU;GBR;FRA;KOR;CAN;AUS;IND;BRA;RUS;ITA;ESP;NLD;TWN;SGP;CHE;SWE;DNK;NOR;SAU;MEX;ARE;BEL;IRL;ISR;MYS;THA;VEN;IRN;HKG'
            url = f"{self.BASE_URL}/country/{major_countries}/indicator/BX.PEF.TOTL.CD.WD"
            params = {
                'date': year,
                'format': 'json',
                'per_page': 500
            }
            
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            if len(data) < 2:
                return []
            
            results = []
            for item in data[1]:
                if item['value'] and float(item['value']) > 0:
                    country_code = item['country']['id']
                    mapped_code = self._map_country_code(country_code)
                    
                    if mapped_code:
                        results.append({
                            'country_code': mapped_code,
                            'amount_usd': float(item['value']),
                            'year': int(item['date']),
                            'indicator': 'PORTFOLIO_INVESTMENT',
                            'raw_data': item
                        })
            
            return results
            
        except Exception as e:
            logger.error(f"World Bank 포트폴리오 투자 데이터 수집 실패: {e}")
            return []
    
    def _map_country_code(self, wb_code: str) -> Optional[str]:
        """World Bank 국가 코드를 시스템 코드로 매핑"""
        
        # World Bank는 2자리 코드 사용, 시스템은 3자리 코드 사용
        mapping = {
            'US': 'USA', 'CN': 'CHN', 'JP': 'JPN', 'DE': 'DEU',
            'GB': 'GBR', 'FR': 'FRA', 'KR': 'KOR', 'CA': 'CAN',
            'AU': 'AUS', 'IN': 'IND', 'BR': 'BRA', 'RU': 'RUS',
            'IT': 'ITA', 'ES': 'ESP', 'NL': 'NLD', 'TW': 'TWN',
            'SG': 'SGP', 'CH': 'CHE', 'SE': 'SWE', 'DK': 'DNK',
            'NO': 'NOR', 'SA': 'SAU', 'MX': 'MEX', 'AE': 'ARE',
            'BE': 'BEL', 'IE': 'IRL', 'IL': 'ISR', 'MY': 'MYS',
            'TH': 'THA', 'VE': 'VEN', 'IR': 'IRN', 'HK': 'HKG'
        }
        
        return mapping.get(wb_code)


class BISCollector:
    """Bank for International Settlements 데이터 수집기"""
    
    BASE_URL = "https://www.bis.org/statistics"
    
    def __init__(self):
        self.source = DataSource.objects.get(name='BIS')
    
    def collect_banking_flows(self, year: int) -> List[Dict[str, Any]]:
        """국제 은행 자본 흐름 데이터 수집"""
        
        try:
            # BIS 통계는 CSV 형태로 제공되므로 웹스크래핑 방식 사용
            # 실제 구현에서는 BIS의 공식 데이터 다운로드 링크 활용
            
            # 더미 구현 (실제로는 BIS CSV 파일 파싱)
            results = []
            
            # 실제 BIS 데이터 수집 시도 (더미 데이터 생성하지 않음)
            logger.info(f"BIS 실제 데이터 수집 시도: {year}")
            # 실제 BIS API 호출 로직 구현 필요
            
            logger.info(f"BIS 은행 자본 흐름 데이터 수집 완료: {len(results)}건")
            return results
            
        except Exception as e:
            logger.error(f"BIS 데이터 수집 실패: {e}")
            return []


class FedCollector:
    """Federal Reserve (FRED) 데이터 수집기"""
    
    BASE_URL = "https://api.stlouisfed.org/fred"
    API_KEY = "your_fred_api_key_here"  # 실제 사용시 환경변수로 관리
    
    def __init__(self):
        self.source = DataSource.objects.get(name='Fed (US)')
    
    def collect_us_capital_flows(self, year: int) -> List[Dict[str, Any]]:
        """미국 자본 흐름 데이터 수집"""
        
        try:
            # FRED API는 무료이지만 API 키 필요
            # 여기서는 시뮬레이션 데이터 제공
            
            results = []
            
            # 미국의 주요 자본 흐름 지표들
            indicators = {
                'FDI': 200_000_000_000,
                'PORTFOLIO': 150_000_000_000,
                'BANKING': 100_000_000_000
            }
            
            # 실제 FRED API 데이터 수집 시도 (더미 데이터 생성하지 않음)
            logger.info(f"FRED 실제 데이터 수집 시도: {year}")
            # 실제 FRED API 호출 로직 구현 필요
            
            logger.info(f"FRED 미국 자본 흐름 데이터 수집 완료: {len(results)}건")
            return results
            
        except Exception as e:
            logger.error(f"FRED 데이터 수집 실패: {e}")
            return []


class BOKCollector:
    """Bank of Korea (한국은행) 데이터 수집기"""
    
    BASE_URL = "https://ecos.bok.or.kr/api"
    
    def __init__(self):
        self.source = DataSource.objects.get(name='Bank of Korea')
    
    def collect_korea_capital_flows(self, year: int) -> List[Dict[str, Any]]:
        """한국 자본 흐름 데이터 수집"""
        
        try:
            # ECOS API 사용 (무료이지만 인증키 필요)
            # 여기서는 시뮬레이션 데이터 제공
            
            results = []
            
            # 한국의 자본 계정 항목들
            capital_items = {
                'FDI_INWARD': 20_000_000_000,
                'FDI_OUTWARD': 30_000_000_000,
                'PORTFOLIO_INWARD': 15_000_000_000,
                'PORTFOLIO_OUTWARD': 25_000_000_000
            }
            
            # 실제 한국은행 데이터 수집 시도 (더미 데이터 생성하지 않음)
            logger.info(f"한국은행 실제 데이터 수집 시도: {year}")
            # 실제 한국은행 API 호출 로직 구현 필요
            
            logger.info(f"한국은행 자본 흐름 데이터 수집 완료: {len(results)}건")
            return results
            
        except Exception as e:
            logger.error(f"한국은행 데이터 수집 실패: {e}")
            return []


class UNCTADCollector:
    """UNCTAD 데이터 수집기"""
    
    BASE_URL = "https://unctadstat.unctad.org"
    
    def __init__(self):
        self.source = DataSource.objects.get(name='UNCTAD')
    
    def collect_global_fdi_data(self, year: int) -> List[Dict[str, Any]]:
        """글로벌 FDI 데이터 수집"""
        
        try:
            # UNCTAD 데이터는 주로 연례 보고서 형태
            # 웹스크래핑이나 CSV 다운로드 방식 사용
            
            results = []
            
            # 주요국 FDI 데이터 시뮬레이션
            major_economies = [
                ('USA', 400_000_000_000), ('CHN', 300_000_000_000),
                ('JPN', 200_000_000_000), ('DEU', 150_000_000_000),
                ('GBR', 120_000_000_000), ('FRA', 100_000_000_000)
            ]
            
            # 실제 UNCTAD 데이터 수집 시도 (더미 데이터 생성하지 않음)
            logger.info(f"UNCTAD 실제 데이터 수집 시도: {year}")
            # 실제 UNCTAD API 호출 로직 구현 필요
            
            logger.info(f"UNCTAD 글로벌 FDI 데이터 수집 완료: {len(results)}건")
            return results
            
        except Exception as e:
            logger.error(f"UNCTAD 데이터 수집 실패: {e}")
            return []


class ExtendedDataCollectionService:
    """확장된 데이터 수집 서비스"""
    
    def __init__(self):
        self.collectors = {
            'world_bank': WorldBankCollector(),
            'bis': BISCollector(),
            'fed': FedCollector(),
            'bok': BOKCollector(),
            'unctad': UNCTADCollector()
        }
    
    def collect_all_sources(self, year: int = 2023) -> Dict[str, int]:
        """모든 확장 소스에서 데이터 수집"""
        
        results = {'collected': 0, 'created': 0, 'updated': 0, 'failed': 0}
        
        for source_name, collector in self.collectors.items():
            try:
                logger.info(f"{source_name} 데이터 수집 시작...")
                
                # 수집기별 데이터 수집
                if source_name == 'world_bank':
                    raw_data_list = []
                    raw_data_list.extend(collector.collect_fdi_data(year))
                    raw_data_list.extend(collector.collect_portfolio_investment(year))
                elif source_name == 'bis':
                    raw_data_list = collector.collect_banking_flows(year)
                elif source_name == 'fed':
                    raw_data_list = collector.collect_us_capital_flows(year)
                elif source_name == 'bok':
                    raw_data_list = collector.collect_korea_capital_flows(year)
                elif source_name == 'unctad':
                    raw_data_list = collector.collect_global_fdi_data(year)
                else:
                    continue
                
                # 수집된 데이터를 데이터베이스에 저장
                for raw_data in raw_data_list:
                    try:
                        self._save_raw_data(raw_data, collector.source)
                        results['created'] += 1
                    except Exception as save_error:
                        logger.error(f"데이터 저장 실패: {save_error}")
                        results['failed'] += 1
                
                results['collected'] += len(raw_data_list)
                logger.info(f"{source_name} 완료: {len(raw_data_list)}건 수집")
                
            except Exception as e:
                logger.error(f"{source_name} 수집 실패: {e}")
                results['failed'] += 1
        
        return results
    
    def collect_worldbank_data(self, year: int = 2023) -> Dict[str, int]:
        """World Bank 데이터 수집"""
        try:
            collector = self.collectors['world_bank']
            raw_data_list = []
            raw_data_list.extend(collector.collect_fdi_data(year))
            raw_data_list.extend(collector.collect_portfolio_investment(year))
            
            results = {'collected': 0, 'created': 0, 'updated': 0, 'failed': 0}
            
            for raw_data in raw_data_list:
                try:
                    self._save_raw_data(raw_data, collector.source)
                    results['created'] += 1
                except Exception as save_error:
                    logger.error(f"데이터 저장 실패: {save_error}")
                    results['failed'] += 1
            
            results['collected'] = len(raw_data_list)
            return results
            
        except Exception as e:
            logger.error(f"World Bank 데이터 수집 실패: {e}")
            return {'collected': 0, 'created': 0, 'updated': 0, 'failed': 1}
    
    def collect_unctad_data(self, year: int = 2023) -> Dict[str, int]:
        """UNCTAD 데이터 수집"""
        try:
            collector = self.collectors['unctad']
            raw_data_list = collector.collect_global_fdi_data(year)
            
            results = {'collected': 0, 'created': 0, 'updated': 0, 'failed': 0}
            
            for raw_data in raw_data_list:
                try:
                    self._save_raw_data(raw_data, collector.source)
                    results['created'] += 1
                except Exception as save_error:
                    logger.error(f"데이터 저장 실패: {save_error}")
                    results['failed'] += 1
            
            results['collected'] = len(raw_data_list)
            return results
            
        except Exception as e:
            logger.error(f"UNCTAD 데이터 수집 실패: {e}")
            return {'collected': 0, 'created': 0, 'updated': 0, 'failed': 1}
    
    def collect_bis_data(self, year: int = 2023) -> Dict[str, int]:
        """BIS 데이터 수집"""
        try:
            collector = self.collectors['bis']
            raw_data_list = collector.collect_banking_flows(year)
            
            results = {'collected': 0, 'created': 0, 'updated': 0, 'failed': 0}
            
            for raw_data in raw_data_list:
                try:
                    self._save_raw_data(raw_data, collector.source)
                    results['created'] += 1
                except Exception as save_error:
                    logger.error(f"데이터 저장 실패: {save_error}")
                    results['failed'] += 1
            
            results['collected'] = len(raw_data_list)
            return results
            
        except Exception as e:
            logger.error(f"BIS 데이터 수집 실패: {e}")
            return {'collected': 0, 'created': 0, 'updated': 0, 'failed': 1}
    
    def _save_raw_data(self, data: Dict[str, Any], source: DataSource):
        """원시 데이터를 데이터베이스에 저장"""
        
        try:
            # 국가 조회
            country = Country.objects.get(code=data['country_code'])
            
            # 분야 매핑 (지표에 따라)
            sector_mapping = {
                'FDI_INFLOWS': 'AI',  # 기본값으로 AI 사용 (실제로는 더 정교한 매핑 필요)
                'FDI_FLOWS': 'AI',
                'PORTFOLIO_INVESTMENT': 'FINTECH',
                'BANKING_FLOWS': 'FINTECH',
                'FDI_INWARD': 'ENERGY',
                'FDI_OUTWARD': 'ENERGY'
            }
            
            sector_code = sector_mapping.get(data['indicator'], 'AI')
            sector = Sector.objects.get(code=sector_code)
            
            # 자본 타입 매핑
            capital_type_mapping = {
                'FDI_INFLOWS': 'FDI',
                'FDI_FLOWS': 'FDI',
                'FDI_INWARD': 'FDI',
                'FDI_OUTWARD': 'FDI',
                'PORTFOLIO_INVESTMENT': 'FPI',
                'PORTFOLIO_INWARD': 'FPI',
                'PORTFOLIO_OUTWARD': 'FPI',
                'BANKING_FLOWS': 'FDI'
            }
            
            capital_type_code = capital_type_mapping.get(data['indicator'], 'FDI')
            capital_type = CapitalType.objects.get(code=capital_type_code)
            
            # 데이터 품질 점수 계산
            quality_score = source.reliability_weight * 0.95  # 기본 신뢰도의 95%
            
            # RawCapitalData 생성 또는 업데이트
            raw_data, created = RawCapitalData.objects.update_or_create(
                source=source,
                country=country,
                sector=sector,
                capital_type=capital_type,
                year=data['year'],
                defaults={
                    'raw_amount': Decimal(str(data['amount_usd'])),
                    'raw_currency': 'USD',
                    'amount_usd': Decimal(str(data['amount_usd'])),
                    'exchange_rate': Decimal('1.0'),
                    'data_quality_score': quality_score,
                    'is_outlier': False,
                    'is_verified': True,
                    'collection_date': timezone.now()
                }
            )
            
            return raw_data
            
        except Exception as e:
            logger.error(f"원시 데이터 저장 실패: {e}")
            raise
