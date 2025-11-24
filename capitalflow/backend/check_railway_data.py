#!/usr/bin/env python3
"""
Railway PostgreSQL 데이터 확인 스크립트
"""
import os
import sys
import django
from pathlib import Path

BASE_DIR = Path(__file__).parent
os.chdir(BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capitalflow.settings.production')
django.setup()

from django.db import connection
from apps.data.models import Country, Sector, CapitalType, DataSource, RawCapitalData, ProcessedCapitalData

print("=" * 60)
print("Railway PostgreSQL 데이터 확인")
print("=" * 60)

# DB 연결 정보
db_url = os.environ.get('DATABASE_URL', 'Not set')
print(f"\nDATABASE_URL: {db_url[:50]}...")
print(f"DB 엔진: {connection.vendor}")
print(f"DB 이름: {connection.settings_dict.get('NAME', 'N/A')}")

# 데이터 개수 확인
print("\n" + "=" * 60)
print("데이터 개수:")
print("=" * 60)
print(f"Country: {Country.objects.count():,}개")
print(f"Sector: {Sector.objects.count():,}개")
print(f"CapitalType: {CapitalType.objects.count():,}개")
print(f"DataSource: {DataSource.objects.count():,}개")
print(f"RawCapitalData: {RawCapitalData.objects.count():,}개")
print(f"ProcessedCapitalData: {ProcessedCapitalData.objects.count():,}개")

# 샘플 데이터 확인
if RawCapitalData.objects.exists():
    print("\n" + "=" * 60)
    print("RawCapitalData 샘플 (최근 5개):")
    print("=" * 60)
    samples = RawCapitalData.objects.select_related('country', 'sector', 'capital_type')[:5]
    for data in samples:
        print(f"  - {data.year}년 | {data.country.name if data.country else 'N/A'} | {data.sector.name if data.sector else 'N/A'} | {data.capital_type.name if data.capital_type else 'N/A'}")

# API 테스트 URL
print("\n" + "=" * 60)
print("API 테스트 URL:")
print("=" * 60)
print("curl \"https://graduate-production-78b3.up.railway.app/api/v1/visualization/map-data/?year=2020&capital_types=FDI\"")

