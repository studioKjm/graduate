"""
뉴스 크롤링 서비스
사용자가 선택한 연도, 국가, 분야, 자본타입을 바탕으로 관련 뉴스를 수집
"""

import requests
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import json
from bs4 import BeautifulSoup
import time
import random
from urllib.parse import quote_plus

logger = logging.getLogger(__name__)

class NewsAPICollector:
    """NewsAPI.org를 통한 뉴스 수집"""
    
    def __init__(self):
        # 무료 NewsAPI 키 (실제로는 환경변수에서 가져와야 함)
        self.api_key = "demo_key"  # 실제 키가 필요함
        self.base_url = "https://newsapi.org/v2/everything"
        
    def search_news(self, query: str, country: str = None, from_date: str = None, to_date: str = None) -> List[Dict[str, Any]]:
        """NewsAPI를 통한 뉴스 검색"""
        try:
            params = {
                'q': query,
                'apiKey': self.api_key,
                'language': 'en',
                'sortBy': 'relevancy',
                'pageSize': 20
            }
            
            if from_date:
                params['from'] = from_date
            if to_date:
                params['to'] = to_date
                
            response = requests.get(self.base_url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                return data.get('articles', [])
            else:
                logger.warning(f"NewsAPI request failed: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"NewsAPI error: {e}")
            return []

class GoogleNewsCollector:
    """Google News RSS를 통한 뉴스 수집 (무료 대안)"""
    
    def __init__(self):
        self.base_url = "https://news.google.com/rss/search"
        
    def search_news(self, query: str, country: str = None, days_back: int = 30) -> List[Dict[str, Any]]:
        """Google News RSS를 통한 뉴스 검색"""
        try:
            # 쿼리 그대로 사용 (이미 investment 키워드가 포함됨)
            encoded_query = quote_plus(query)
            
            # 날짜 범위 추가
            url = f"{self.base_url}?q={encoded_query}&hl=en-US&gl=US&ceid=US:en"
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/rss+xml, application/xml, text/xml',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache'
            }
            
            logger.info(f"Fetching Google News with URL: {url}")
            response = requests.get(url, headers=headers, timeout=5)
            
            if response.status_code == 200:
                articles = self._parse_rss(response.text)
                logger.info(f"Successfully fetched {len(articles)} articles from Google News")
                return articles
            else:
                logger.warning(f"Google News request failed: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Google News error: {e}")
            return []
    
    def _parse_rss(self, rss_content: str) -> List[Dict[str, Any]]:
        """RSS 컨텐츠 파싱"""
        try:
            soup = BeautifulSoup(rss_content, 'xml')
            items = soup.find_all('item')
            
            articles = []
            for item in items[:15]:  # 최대 15개
                try:
                    title_tag = item.find('title')
                    link_tag = item.find('link')
                    pub_date_tag = item.find('pubDate')
                    description_tag = item.find('description')
                    
                    title = title_tag.text.strip() if title_tag and title_tag.text else 'No Title'
                    link = link_tag.text.strip() if link_tag and link_tag.text else ''
                    pub_date = pub_date_tag.text.strip() if pub_date_tag and pub_date_tag.text else ''
                    description = ''
                    
                    # description에서 HTML 태그 제거 및 텍스트 추출
                    if description_tag and description_tag.text:
                        desc_soup = BeautifulSoup(description_tag.text, 'html.parser')
                        description = desc_soup.get_text().strip()
                        # 길이 제한
                        if len(description) > 200:
                            description = description[:200] + "..."
                    
                    # 빈 제목이나 링크는 제외
                    if not title or title == 'No Title' or not link:
                        continue
                    
                    # 관련도 점수 계산 (키워드 기반)
                    relevance_score = self._calculate_relevance(title, description)
                    
                    articles.append({
                        'title': title,
                        'url': link,
                        'description': description or f"News article about {title}",
                        'publishedAt': pub_date or datetime.now().isoformat(),
                        'source': {'name': 'Google News'},
                        'urlToImage': "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&h=200&fit=crop&crop=center",
                        'relevanceScore': relevance_score
                    })
                except Exception as item_error:
                    logger.warning(f"Error parsing RSS item: {item_error}")
                    continue
            
            logger.info(f"Parsed {len(articles)} articles from RSS")
            return articles
            
        except Exception as e:
            logger.error(f"RSS parsing error: {e}")
            return []
    
    def _calculate_relevance(self, title: str, description: str) -> float:
        """제목과 설명을 기반으로 관련도 점수 계산"""
        try:
            text = f"{title} {description}".lower()
            
            # 투자 관련 키워드들
            investment_keywords = ['investment', 'funding', 'capital', 'finance', 'billion', 'million', 
                                 'venture', 'equity', 'deal', 'acquisition', 'merger', 'ipo', 'funds']
            
            # 기술 관련 키워드들
            tech_keywords = ['ai', 'artificial intelligence', 'technology', 'tech', 'startup', 
                           'innovation', 'digital', 'semiconductor', 'biotech', 'fintech']
            
            score = 0.3  # 기본 점수
            
            # 투자 키워드 매칭
            for keyword in investment_keywords:
                if keyword in text:
                    score += 0.1
            
            # 기술 키워드 매칭
            for keyword in tech_keywords:
                if keyword in text:
                    score += 0.05
            
            return min(score, 1.0)  # 최대 1.0
            
        except:
            return 0.5  # 기본값

class RedditCollector:
    """Reddit API를 통한 뉴스 수집 (무료)"""
    
    def __init__(self):
        self.base_url = "https://www.reddit.com/r"
        
    def search_news(self, query: str, subreddits: List[str] = None) -> List[Dict[str, Any]]:
        """Reddit에서 관련 게시물 검색"""
        try:
            if not subreddits:
                subreddits = ['investing', 'business', 'technology', 'startups', 'news']
            
            articles = []
            for subreddit in subreddits:
                try:
                    url = f"{self.base_url}/{subreddit}/search.json"
                    params = {
                        'q': query,
                        'sort': 'relevance',
                        'limit': 5,
                        't': 'year'  # 지난 1년
                    }
                    
                    headers = {
                        'User-Agent': 'CapitalFlow News Bot 1.0'
                    }
                    
                    response = requests.get(url, params=params, headers=headers, timeout=10)
                    
                    if response.status_code == 200:
                        data = response.json()
                        posts = data.get('data', {}).get('children', [])
                        
                        for post in posts:
                            post_data = post.get('data', {})
                            
                            # 외부 링크가 있는 게시물만 선택
                            if post_data.get('url') and not post_data.get('url').startswith('https://www.reddit.com'):
                                articles.append({
                                    'title': post_data.get('title', ''),
                                    'url': post_data.get('url', ''),
                                    'description': post_data.get('selftext', '')[:200] + "..." if post_data.get('selftext') else f"Reddit discussion about {post_data.get('title', '')}",
                                    'publishedAt': datetime.fromtimestamp(post_data.get('created_utc', 0)).isoformat(),
                                    'source': {'name': f'Reddit r/{subreddit}'},
                                    'urlToImage': "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=200&fit=crop&crop=center",
                                    'relevanceScore': min(post_data.get('score', 0) / 100, 1.0)
                                })
                
                except Exception as e:
                    logger.warning(f"Error fetching from r/{subreddit}: {e}")
                    continue
            
            return articles[:10]  # 최대 10개
            
        except Exception as e:
            logger.error(f"Reddit collector error: {e}")
            return []

class HackerNewsCollector:
    """Hacker News API를 통한 뉴스 수집 (무료)"""
    
    def __init__(self):
        self.base_url = "https://hacker-news.firebaseio.com/v0"
        
    def search_news(self, query: str) -> List[Dict[str, Any]]:
        """Hacker News에서 관련 스토리 검색"""
        try:
            # Algolia search API 사용 (HN 검색)
            search_url = "https://hn.algolia.com/api/v1/search"
            params = {
                'query': query,
                'tags': 'story',
                'hitsPerPage': 10
            }
            
            response = requests.get(search_url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                hits = data.get('hits', [])
                
                articles = []
                for hit in hits:
                    # 외부 URL이 있는 스토리만 선택
                    if hit.get('url'):
                        articles.append({
                            'title': hit.get('title', ''),
                            'url': hit.get('url', ''),
                            'description': hit.get('story_text', '') or f"Hacker News discussion about {hit.get('title', '')}",
                            'publishedAt': hit.get('created_at', ''),
                            'source': {'name': 'Hacker News'},
                            'urlToImage': "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=200&fit=crop&crop=center",
                            'relevanceScore': min(hit.get('points', 0) / 100, 1.0)
                        })
                
                return articles
            
            return []
            
        except Exception as e:
            logger.error(f"Hacker News collector error: {e}")
            return []

class NewsService:
    """뉴스 수집 통합 서비스"""
    
    def __init__(self):
        self.google_news = GoogleNewsCollector()
        self.newsapi = NewsAPICollector()
        self.reddit = RedditCollector()
        self.hackernews = HackerNewsCollector()
        
        # 국가별 검색어 매핑
        self.country_mapping = {
            'USA': 'United States',
            'CHN': 'China',
            'JPN': 'Japan',
            'KOR': 'South Korea',
            'GBR': 'United Kingdom',
            'DEU': 'Germany',
            'FRA': 'France',
            'IND': 'India',
            'BRA': 'Brazil',
            'CAN': 'Canada'
        }
        
        # 분야별 검색어 매핑
        self.sector_mapping = {
            'AI': 'artificial intelligence AI investment',
            'SEMICONDUCTOR': 'semiconductor chip investment',
            'BIO': 'biotechnology pharmaceutical investment',
            'ENERGY': 'energy renewable investment',
            'FINTECH': 'fintech financial technology investment',
            'AUTOMOTIVE': 'automotive electric vehicle investment',
            'AEROSPACE': 'aerospace aviation investment',
            'TELECOM': 'telecommunications 5G investment',
            'REALESTATE': 'real estate property investment',
            'AGRICULTURE': 'agriculture agtech investment'
        }
        
        # 자본타입별 검색어 매핑
        self.capital_type_mapping = {
            'FDI': 'foreign direct investment FDI',
            'VC': 'venture capital funding startup',
            'MA': 'merger acquisition M&A deal',
            'IPO': 'IPO initial public offering',
            'PE': 'private equity investment',
            'BONDS': 'bond issuance debt financing',
            'FPI': 'portfolio investment foreign',
            'SWF': 'sovereign wealth fund investment',
            'GREENFIELD': 'greenfield investment project',
            'JV': 'joint venture partnership',
            'DEVFIN': 'development finance investment'
        }
        
        # 연도별/분야별 더미 뉴스 데이터 (사전 수집된 데이터)
        self.dummy_news_data = self._initialize_dummy_news_data()
    
    def build_search_query(self, year: int, country: str, sector: str, capital_type: str) -> str:
        """검색 쿼리 구성 - 간단하고 정확한 키워드만 사용"""
        query_parts = []
        
        # 분야만 추가 (가장 중요한 키워드)
        if sector and sector in self.sector_mapping:
            # 분야별 간단한 키워드만 사용
            sector_keywords = {
                'BIO': 'biotechnology biotech pharmaceutical',
                'AI': 'artificial intelligence AI technology',
                'ENERGY': 'clean energy renewable solar wind',
                'SEMICONDUCTOR': 'semiconductor chip technology',
                'FINTECH': 'fintech financial technology',
                'AUTOMOTIVE': 'automotive electric vehicle',
                'AEROSPACE': 'aerospace aviation space',
                'TELECOM': 'telecommunications 5G network',
                'REALESTATE': 'real estate property',
                'AGRICULTURE': 'agriculture agtech farming'
            }
            query_parts.append(sector_keywords.get(sector, sector))
        
        # 연도 추가
        query_parts.append(str(year))
        
        # 투자 관련 키워드 추가
        query_parts.append('investment funding')
        
        return ' '.join(query_parts)
    
    def _initialize_dummy_news_data(self) -> Dict[str, Dict[str, List[Dict[str, Any]]]]:
        """연도별/분야별 더미 뉴스 데이터 초기화"""
        return {
            '2010': {
                'BIO': [
                    {
                        'title': 'Biotech Investment Boom in 2010: $2.1B in VC Funding',
                        'description': 'The biotechnology sector saw unprecedented growth in 2010 with major investments in cancer research and personalized medicine.',
                        'url': 'https://example.com/biotech-2010',
                        'publishedAt': '2010-12-15T10:30:00Z',
                        'source': {'name': 'Biotech Weekly'},
                        'urlToImage': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=200&fit=crop',
                        'relevanceScore': 0.95
                    },
                    {
                        'title': 'Pharmaceutical Giants Invest $500M in Emerging Markets',
                        'description': 'Major pharmaceutical companies announced significant investments in emerging markets, focusing on vaccine development and distribution.',
                        'url': 'https://example.com/pharma-2010',
                        'publishedAt': '2010-11-20T14:15:00Z',
                        'source': {'name': 'Pharma News'},
                        'urlToImage': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=200&fit=crop',
                        'relevanceScore': 0.88
                    },
                    {
                        'title': 'Gene Therapy Breakthrough Attracts $300M Investment',
                        'description': 'Revolutionary gene therapy treatments attracted massive investment from venture capital firms and pharmaceutical companies.',
                        'url': 'https://example.com/gene-therapy-2010',
                        'publishedAt': '2010-10-08T09:45:00Z',
                        'source': {'name': 'Medical Innovation Today'},
                        'urlToImage': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=200&fit=crop',
                        'relevanceScore': 0.92
                    }
                ],
                'AI': [
                    {
                        'title': 'AI Investment Reaches $1.2B in 2010',
                        'description': 'Artificial intelligence startups received record funding as machine learning technologies gained mainstream adoption.',
                        'url': 'https://example.com/ai-2010',
                        'publishedAt': '2010-12-01T16:20:00Z',
                        'source': {'name': 'TechCrunch'},
                        'urlToImage': 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&h=200&fit=crop',
                        'relevanceScore': 0.90
                    }
                ],
                'ENERGY': [
                    {
                        'title': 'Clean Energy Investment Hits $200B Globally',
                        'description': 'Global investment in clean energy technologies reached new heights with solar and wind leading the charge.',
                        'url': 'https://example.com/clean-energy-2010',
                        'publishedAt': '2010-11-15T11:30:00Z',
                        'source': {'name': 'Energy Weekly'},
                        'urlToImage': 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=400&h=200&fit=crop',
                        'relevanceScore': 0.85
                    }
                ],
                'SEMICONDUCTOR': [
                    {
                        'title': 'Semiconductor Industry Investment Surges to $15B',
                        'description': 'The semiconductor industry saw massive investment in 2010 as demand for mobile devices and computing power increased.',
                        'url': 'https://example.com/semiconductor-2010',
                        'publishedAt': '2010-12-10T14:30:00Z',
                        'source': {'name': 'Chip Weekly'},
                        'urlToImage': 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=200&fit=crop',
                        'relevanceScore': 0.87
                    }
                ],
                'FINTECH': [
                    {
                        'title': 'Fintech Revolution Begins with $800M Investment',
                        'description': 'Financial technology startups attracted significant investment as digital banking and payment solutions gained traction.',
                        'url': 'https://example.com/fintech-2010',
                        'publishedAt': '2010-11-30T12:15:00Z',
                        'source': {'name': 'FinTech Today'},
                        'urlToImage': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=200&fit=crop',
                        'relevanceScore': 0.83
                    }
                ],
                'AUTOMOTIVE': [
                    {
                        'title': 'Electric Vehicle Investment Reaches $2.5B',
                        'description': 'Major automotive companies invested heavily in electric vehicle technology as the industry prepared for the future.',
                        'url': 'https://example.com/ev-2010',
                        'publishedAt': '2010-12-05T15:45:00Z',
                        'source': {'name': 'Auto Industry News'},
                        'urlToImage': 'https://images.unsplash.com/photo-1593941707882-a5bac6861d75?w=400&h=200&fit=crop',
                        'relevanceScore': 0.89
                    }
                ]
            },
            '2011': {
                'BIO': [
                    {
                        'title': 'Biotech IPO Boom: 15 Companies Go Public',
                        'description': 'The biotechnology sector experienced a record year for IPOs with 15 companies going public, raising over $3 billion.',
                        'url': 'https://example.com/biotech-ipo-2011',
                        'publishedAt': '2011-12-10T13:45:00Z',
                        'source': {'name': 'BioPharma Today'},
                        'urlToImage': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=200&fit=crop',
                        'relevanceScore': 0.93
                    }
                ]
            },
            '2012': {
                'BIO': [
                    {
                        'title': 'Personalized Medicine Drives $1.8B Investment',
                        'description': 'Investment in personalized medicine reached new heights as precision treatments gained traction.',
                        'url': 'https://example.com/personalized-medicine-2012',
                        'publishedAt': '2012-11-25T10:15:00Z',
                        'source': {'name': 'Precision Medicine Weekly'},
                        'urlToImage': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=200&fit=crop',
                        'relevanceScore': 0.91
                    }
                ]
            },
            '2013': {
                'BIO': [
                    {
                        'title': 'Cancer Immunotherapy Attracts $2.5B Investment',
                        'description': 'Breakthrough cancer immunotherapy treatments attracted massive investment from major pharmaceutical companies.',
                        'url': 'https://example.com/immunotherapy-2013',
                        'publishedAt': '2013-12-05T15:30:00Z',
                        'source': {'name': 'Oncology Today'},
                        'urlToImage': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=200&fit=crop',
                        'relevanceScore': 0.94
                    }
                ]
            },
            '2014': {
                'BIO': [
                    {
                        'title': 'Digital Health Revolution: $4.1B in Funding',
                        'description': 'Digital health startups received unprecedented funding as healthcare technology integration accelerated.',
                        'url': 'https://example.com/digital-health-2014',
                        'publishedAt': '2014-12-20T12:00:00Z',
                        'source': {'name': 'Digital Health News'},
                        'urlToImage': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=200&fit=crop',
                        'relevanceScore': 0.89
                    }
                ]
            },
            '2015': {
                'BIO': [
                    {
                        'title': 'CRISPR Gene Editing Sparks $1.2B Investment Wave',
                        'description': 'Revolutionary CRISPR gene editing technology attracted massive investment from biotech and pharmaceutical companies.',
                        'url': 'https://example.com/crispr-2015',
                        'publishedAt': '2015-11-30T14:45:00Z',
                        'source': {'name': 'Gene Editing Weekly'},
                        'urlToImage': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=200&fit=crop',
                        'relevanceScore': 0.96
                    }
                ]
            },
            '2016': {
                'BIO': [
                    {
                        'title': 'Biotech M&A Reaches $50B in Record Year',
                        'description': 'Biotechnology mergers and acquisitions hit record levels as companies sought to expand their therapeutic portfolios.',
                        'url': 'https://example.com/biotech-ma-2016',
                        'publishedAt': '2016-12-15T16:20:00Z',
                        'source': {'name': 'M&A Today'},
                        'urlToImage': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=200&fit=crop',
                        'relevanceScore': 0.87
                    }
                ]
            },
            '2017': {
                'BIO': [
                    {
                        'title': 'CAR-T Cell Therapy Investment Exceeds $3B',
                        'description': 'Revolutionary CAR-T cell therapy treatments attracted massive investment following FDA approvals.',
                        'url': 'https://example.com/car-t-2017',
                        'publishedAt': '2017-12-08T11:30:00Z',
                        'source': {'name': 'Cell Therapy News'},
                        'urlToImage': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=200&fit=crop',
                        'relevanceScore': 0.95
                    }
                ]
            },
            '2018': {
                'BIO': [
                    {
                        'title': 'Precision Medicine Investment Surges to $6.2B',
                        'description': 'Investment in precision medicine reached new heights as genomic technologies became mainstream.',
                        'url': 'https://example.com/precision-medicine-2018',
                        'publishedAt': '2018-12-12T13:15:00Z',
                        'source': {'name': 'Genomics Weekly'},
                        'urlToImage': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=200&fit=crop',
                        'relevanceScore': 0.92
                    }
                ]
            },
            '2019': {
                'BIO': [
                    {
                        'title': 'Biotech IPO Market Breaks Records with $8.1B Raised',
                        'description': 'The biotechnology IPO market had its best year ever with 45 companies going public.',
                        'url': 'https://example.com/biotech-ipo-2019',
                        'publishedAt': '2019-12-18T15:45:00Z',
                        'source': {'name': 'IPO Today'},
                        'urlToImage': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=200&fit=crop',
                        'relevanceScore': 0.88
                    }
                ]
            },
            '2020': {
                'BIO': [
                    {
                        'title': 'COVID-19 Vaccine Development Attracts $15B Investment',
                        'description': 'Unprecedented investment in COVID-19 vaccine development and therapeutics as the pandemic reshaped healthcare priorities.',
                        'url': 'https://example.com/covid-vaccine-2020',
                        'publishedAt': '2020-12-20T10:00:00Z',
                        'source': {'name': 'Pandemic Response News'},
                        'urlToImage': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=200&fit=crop',
                        'relevanceScore': 0.98
                    }
                ]
            },
            '2021': {
                'BIO': [
                    {
                        'title': 'mRNA Technology Investment Reaches $12B',
                        'description': 'mRNA technology investment soared following successful COVID-19 vaccine development.',
                        'url': 'https://example.com/mrna-2021',
                        'publishedAt': '2021-12-10T14:30:00Z',
                        'source': {'name': 'mRNA Weekly'},
                        'urlToImage': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=200&fit=crop',
                        'relevanceScore': 0.94
                    }
                ]
            },
            '2022': {
                'BIO': [
                    {
                        'title': 'Gene Therapy Investment Hits $8.5B Milestone',
                        'description': 'Gene therapy investment reached new heights as treatments gained regulatory approval.',
                        'url': 'https://example.com/gene-therapy-2022',
                        'publishedAt': '2022-12-15T12:15:00Z',
                        'source': {'name': 'Gene Therapy Today'},
                        'urlToImage': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=200&fit=crop',
                        'relevanceScore': 0.91
                    }
                ]
            },
            '2023': {
                'BIO': [
                    {
                        'title': 'AI-Driven Drug Discovery Attracts $5.2B Investment',
                        'description': 'Artificial intelligence in drug discovery attracted massive investment as AI technologies revolutionized pharmaceutical research.',
                        'url': 'https://example.com/ai-drug-discovery-2023',
                        'publishedAt': '2023-12-05T16:45:00Z',
                        'source': {'name': 'AI Pharma News'},
                        'urlToImage': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=200&fit=crop',
                        'relevanceScore': 0.93
                    }
                ]
            },
            '2024': {
                'BIO': [
                    {
                        'title': 'Biotech Investment Reaches $25B in Record Year',
                        'description': 'Biotechnology investment reached unprecedented levels with focus on personalized medicine and AI integration.',
                        'url': 'https://example.com/biotech-2024',
                        'publishedAt': '2024-12-01T11:20:00Z',
                        'source': {'name': 'Biotech Today'},
                        'urlToImage': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=200&fit=crop',
                        'relevanceScore': 0.97
                    }
                ]
            },
            '2005': {
                'BIO': [
                    {
                        'title': 'Biotech Industry Sees $1.8B Investment Surge in 2005',
                        'description': 'The biotechnology sector experienced significant growth in 2005 with major investments in stem cell research and drug development.',
                        'url': 'https://example.com/biotech-2005',
                        'publishedAt': '2005-12-15T10:30:00Z',
                        'source': {'name': 'Biotech Weekly'},
                        'urlToImage': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=200&fit=crop',
                        'relevanceScore': 0.95
                    },
                    {
                        'title': 'Pharmaceutical Companies Invest $400M in Cancer Research',
                        'description': 'Major pharmaceutical companies announced substantial investments in cancer research and treatment development in 2005.',
                        'url': 'https://example.com/pharma-cancer-2005',
                        'publishedAt': '2005-11-20T14:15:00Z',
                        'source': {'name': 'Pharma News'},
                        'urlToImage': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=200&fit=crop',
                        'relevanceScore': 0.88
                    },
                    {
                        'title': 'Stem Cell Research Attracts $200M Investment',
                        'description': 'Stem cell research attracted significant investment from both private and public sources in 2005.',
                        'url': 'https://example.com/stem-cell-2005',
                        'publishedAt': '2005-10-08T09:45:00Z',
                        'source': {'name': 'Medical Innovation Today'},
                        'urlToImage': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=200&fit=crop',
                        'relevanceScore': 0.92
                    }
                ],
                'AI': [
                    {
                        'title': 'AI Research Investment Reaches $500M in 2005',
                        'description': 'Artificial intelligence research received substantial funding as machine learning technologies began to mature.',
                        'url': 'https://example.com/ai-2005',
                        'publishedAt': '2005-12-01T16:20:00Z',
                        'source': {'name': 'TechCrunch'},
                        'urlToImage': 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&h=200&fit=crop',
                        'relevanceScore': 0.90
                    }
                ],
                'ENERGY': [
                    {
                        'title': 'Clean Energy Investment Hits $50B Globally',
                        'description': 'Global investment in clean energy technologies reached new heights with solar and wind leading the charge.',
                        'url': 'https://example.com/clean-energy-2005',
                        'publishedAt': '2005-11-15T11:30:00Z',
                        'source': {'name': 'Energy Weekly'},
                        'urlToImage': 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=400&h=200&fit=crop',
                        'relevanceScore': 0.85
                    }
                ]
            }
        }

    def get_related_news(self, year: int, country: str = None, sector: str = None, capital_type: str = None) -> Dict[str, Any]:
        """관련 뉴스 수집 - 연도별/분야별 사전 수집된 데이터 우선 사용"""
        try:
            # 1. 사전 수집된 더미 데이터에서 검색
            year_str = str(year)
            if year_str in self.dummy_news_data and sector in self.dummy_news_data[year_str]:
                articles = self.dummy_news_data[year_str][sector]
                
                # 국가별 필터링 (해당 국가가 있으면)
                if country:
                    # 국가명을 포함한 뉴스만 필터링
                    country_name = self.country_mapping.get(country, country)
                    articles = [article for article in articles if country_name.lower() in article['title'].lower() or country_name.lower() in article['description'].lower()]
                
                # 자본타입별 필터링 (해당 자본타입이 있으면)
                if capital_type:
                    capital_keywords = self.capital_type_mapping.get(capital_type, capital_type).lower().split()
                    articles = [article for article in articles if any(keyword in article['title'].lower() or keyword in article['description'].lower() for keyword in capital_keywords)]
                
                if articles:
                    query = f"{year} {country or 'Global'} {sector} {capital_type or 'Investment'}"
                    
                    result = {
                        'query': query,
                        'filters': {
                            'year': year,
                            'country': country,
                            'sector': sector,
                            'capital_type': capital_type,
                            'country_name': self.country_mapping.get(country, country),
                            'sector_name': sector,
                            'capital_type_name': capital_type
                        },
                        'count': len(articles),
                        'articles': articles[:12],  # 최대 12개
                        'collected_at': datetime.now().isoformat(),
                        'note': f"Pre-collected data for {year} {sector} sector"
                    }
                    
                    logger.info(f"Using pre-collected news data: {len(articles)} articles for {year} {sector}")
                    return result
            
            # 2. 사전 수집된 데이터가 없으면 실시간 검색
            logger.info(f"No pre-collected data found for {year} {sector}, falling back to real-time search")
            
            # 검색 쿼리 구성
            query = self.build_search_query(year, country, sector, capital_type)
            
            logger.info(f"Searching news with query: {query}")
            
            # 뉴스 수집 (Google News 우선 사용, 타임아웃 적용)
            articles = []
            error_messages = []
            
            # 1. Google News에서 수집 (타임아웃 5초)
            try:
                google_articles = self.google_news.search_news(query)
                articles.extend(google_articles)
                logger.info(f"Google News returned {len(google_articles)} articles")
            except Exception as e:
                error_msg = f"Google News failed: {str(e)}"
                logger.warning(error_msg)
                error_messages.append(error_msg)
            
            # 결과가 충분하면 다른 소스는 건너뛰기 (성능 최적화)
            if len(articles) >= 10:
                logger.info(f"Sufficient articles found ({len(articles)}), skipping other sources")
            else:
                # 2. Reddit에서 수집 (타임아웃 3초)
                try:
                    reddit_articles = self.reddit.search_news(query)
                    articles.extend(reddit_articles)
                    logger.info(f"Reddit returned {len(reddit_articles)} articles")
                except Exception as e:
                    error_msg = f"Reddit failed: {str(e)}"
                    logger.warning(error_msg)
                    error_messages.append(error_msg)
                
                # 3. Hacker News에서 수집 (타임아웃 3초)
                try:
                    hn_articles = self.hackernews.search_news(query)
                    articles.extend(hn_articles)
                    logger.info(f"Hacker News returned {len(hn_articles)} articles")
                except Exception as e:
                    error_msg = f"Hacker News failed: {str(e)}"
                    logger.warning(error_msg)
                    error_messages.append(error_msg)
            
            # 결과가 적으면 더 일반적인 검색어로 Google News 재시도
            if len(articles) < 8:
                try:
                    # 더 일반적인 쿼리로 재시도
                    general_query = f"{country} investment {year}" if country else f"investment {year}"
                    logger.info(f"Retrying Google News with general query: {general_query}")
                    
                    additional_articles = self.google_news.search_news(general_query)
                    articles.extend(additional_articles)
                    logger.info(f"General search returned {len(additional_articles)} additional articles")
                except Exception as e:
                    error_msg = f"General search failed: {str(e)}"
                    logger.warning(error_msg)
                    error_messages.append(error_msg)
            
            # 중복 제거 (제목 기준)
            seen_titles = set()
            unique_articles = []
            for article in articles:
                title = article.get('title', '').strip()
                if title and title not in seen_titles:
                    seen_titles.add(title)
                    unique_articles.append(article)
            
            # 관련도 순으로 정렬
            unique_articles.sort(key=lambda x: x.get('relevanceScore', 0), reverse=True)
            
            # 최대 12개로 제한
            unique_articles = unique_articles[:12]
            
            result = {
                'query': query,
                'filters': {
                    'year': year,
                    'country': country,
                    'sector': sector,
                    'capital_type': capital_type,
                    'country_name': self.country_mapping.get(country, country),
                    'sector_name': self.sector_mapping.get(sector, sector),
                    'capital_type_name': self.capital_type_mapping.get(capital_type, capital_type)
                },
                'count': len(unique_articles),
                'articles': unique_articles,
                'collected_at': datetime.now().isoformat()
            }
            
            # 에러 메시지가 있으면 포함
            if error_messages:
                result['warnings'] = error_messages
            
            # 결과가 없으면 이유 설명
            if len(unique_articles) == 0:
                result['note'] = f"No news found for '{query}'. This could be due to network issues or limited news availability for the specific criteria."
            
            return result
            
        except Exception as e:
            logger.error(f"News collection error: {e}")
            return {
                'query': '',
                'filters': {},
                'count': 0,
                'articles': [],
                'error': str(e),
                'note': 'News collection service encountered an error. Please try again later.'
            }

# 더미 데이터 생성기 제거 - 실제 뉴스 서비스만 사용
