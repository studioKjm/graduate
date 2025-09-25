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
            # 쿼리를 더 구체적으로 만들기
            specific_query = f"{query} investment finance"
            encoded_query = quote_plus(specific_query)
            
            # 날짜 범위 추가
            url = f"{self.base_url}?q={encoded_query}&hl=en-US&gl=US&ceid=US:en"
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/rss+xml, application/xml, text/xml',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache'
            }
            
            logger.info(f"Fetching Google News with URL: {url}")
            response = requests.get(url, headers=headers, timeout=15)
            
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
                        'urlToImage': f"https://via.placeholder.com/400x200/0066cc/ffffff?text=News",
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
                                    'urlToImage': f"https://via.placeholder.com/400x200/ff4500/ffffff?text=Reddit",
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
                            'urlToImage': f"https://via.placeholder.com/400x200/ff6600/ffffff?text=HN",
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
    
    def build_search_query(self, year: int, country: str, sector: str, capital_type: str) -> str:
        """검색 쿼리 구성"""
        query_parts = []
        
        # 국가명 추가
        if country and country in self.country_mapping:
            query_parts.append(self.country_mapping[country])
        
        # 분야 추가
        if sector and sector in self.sector_mapping:
            query_parts.append(self.sector_mapping[sector])
        
        # 자본타입 추가
        if capital_type and capital_type in self.capital_type_mapping:
            query_parts.append(self.capital_type_mapping[capital_type])
        
        # 연도 추가
        query_parts.append(str(year))
        
        return ' '.join(query_parts)
    
    def get_related_news(self, year: int, country: str = None, sector: str = None, capital_type: str = None) -> Dict[str, Any]:
        """관련 뉴스 수집"""
        try:
            # 검색 쿼리 구성
            query = self.build_search_query(year, country, sector, capital_type)
            
            logger.info(f"Searching news with query: {query}")
            
            # 뉴스 수집 (Google News 우선 사용)
            articles = []
            error_messages = []
            
            # 1. Google News에서 수집
            try:
                google_articles = self.google_news.search_news(query)
                articles.extend(google_articles)
                logger.info(f"Google News returned {len(google_articles)} articles")
            except Exception as e:
                error_msg = f"Google News failed: {str(e)}"
                logger.warning(error_msg)
                error_messages.append(error_msg)
            
            # 2. Reddit에서 수집
            try:
                reddit_articles = self.reddit.search_news(query)
                articles.extend(reddit_articles)
                logger.info(f"Reddit returned {len(reddit_articles)} articles")
            except Exception as e:
                error_msg = f"Reddit failed: {str(e)}"
                logger.warning(error_msg)
                error_messages.append(error_msg)
            
            # 3. Hacker News에서 수집
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

# 더미 데이터 생성기 (테스트용)
class DummyNewsService:
    """테스트용 더미 뉴스 서비스"""
    
    def get_related_news(self, year: int, country: str = None, sector: str = None, capital_type: str = None) -> Dict[str, Any]:
        """더미 뉴스 데이터 생성"""
        
        # 국가별 샘플 뉴스
        sample_articles = [
            {
                'title': f'{country} AI Investment Reaches Record High in {year}',
                'description': f'Major {sector} investments in {country} show strong growth in {capital_type} funding during {year}.',
                'url': f'https://example.com/news/{country.lower()}-ai-investment-{year}',
                'urlToImage': 'https://via.placeholder.com/400x200/0066cc/ffffff?text=AI+Investment',
                'publishedAt': f'{year}-12-15T10:30:00Z',
                'source': {'name': 'Financial News'},
                'relevanceScore': 0.95
            },
            {
                'title': f'{capital_type} Flows to {country} {sector} Sector Surge',
                'description': f'Foreign direct investment in {country}\'s {sector} industry reaches new milestones as international investors show confidence.',
                'url': f'https://example.com/news/{country.lower()}-{sector.lower()}-surge-{year}',
                'urlToImage': 'https://via.placeholder.com/400x200/00cc66/ffffff?text=Investment+Surge',
                'publishedAt': f'{year}-11-20T14:45:00Z',
                'source': {'name': 'Investment Weekly'},
                'relevanceScore': 0.88
            },
            {
                'title': f'Global {sector} Investment Trends: {country} Leading the Way',
                'description': f'Analysis of {year} {sector} investment patterns shows {country} as a key destination for {capital_type} capital.',
                'url': f'https://example.com/news/global-{sector.lower()}-trends-{year}',
                'urlToImage': 'https://via.placeholder.com/400x200/cc6600/ffffff?text=Global+Trends',
                'publishedAt': f'{year}-10-08T09:15:00Z',
                'source': {'name': 'Tech Business Daily'},
                'relevanceScore': 0.82
            },
            {
                'title': f'{country} Government Announces New {sector} Investment Incentives',
                'description': f'New policy framework aims to attract more {capital_type} investment in {country}\'s {sector} sector for {year} and beyond.',
                'url': f'https://example.com/news/{country.lower()}-government-incentives-{year}',
                'urlToImage': 'https://via.placeholder.com/400x200/6600cc/ffffff?text=Policy+News',
                'publishedAt': f'{year}-09-12T16:20:00Z',
                'source': {'name': 'Government Affairs'},
                'relevanceScore': 0.76
            },
            {
                'title': f'Major {capital_type} Deal Transforms {country} {sector} Landscape',
                'description': f'Landmark {capital_type} transaction in {year} sets new precedent for {sector} investments in {country}.',
                'url': f'https://example.com/news/major-deal-{country.lower()}-{year}',
                'urlToImage': 'https://via.placeholder.com/400x200/cc0066/ffffff?text=Major+Deal',
                'publishedAt': f'{year}-08-25T11:30:00Z',
                'source': {'name': 'Deal Monitor'},
                'relevanceScore': 0.90
            }
        ]
        
        return {
            'query': f'{country} {sector} {capital_type} {year}',
            'filters': {
                'year': year,
                'country': country,
                'sector': sector,
                'capital_type': capital_type
            },
            'count': len(sample_articles),
            'articles': sample_articles,
            'collected_at': datetime.now().isoformat(),
            'note': 'This is demo data for testing purposes'
        }
