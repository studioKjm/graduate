#!/usr/bin/env python3
"""
로컬 SQLite의 DataSource UUID와 Railway PostgreSQL의 DataSource UUID 매핑 생성
"""
import os
import sys
import django
import json
from pathlib import Path

BASE_DIR = Path(__file__).parent
os.chdir(BASE_DIR)

# 1. 로컬 SQLite에서 DataSource UUID -> name 매핑
os.environ['DJANGO_SETTINGS_MODULE'] = 'capitalflow.settings.local'
django.setup()

from apps.data.models import DataSource as LocalDataSource

local_mapping = {str(ds.id): ds.name for ds in LocalDataSource.objects.all()}
print(f"로컬 DataSource: {len(local_mapping)}개")

# 2. Railway PostgreSQL에서 name -> UUID 매핑
os.environ['DJANGO_SETTINGS_MODULE'] = 'capitalflow.settings.production'
django.setup()

from apps.data.models import DataSource as RailwayDataSource

railway_mapping = {ds.name: str(ds.id) for ds in RailwayDataSource.objects.all()}
print(f"Railway DataSource: {len(railway_mapping)}개")

# 3. 로컬 UUID -> Railway UUID 매핑 생성
uuid_mapping = {}
for local_uuid, name in local_mapping.items():
    if name in railway_mapping:
        uuid_mapping[local_uuid] = railway_mapping[name]

print(f"매핑 생성: {len(uuid_mapping)}개")

# 4. JSON 파일로 저장
mapping_file = BASE_DIR / 'backups' / 'source_uuid_mapping.json'
mapping_file.parent.mkdir(exist_ok=True)
with open(mapping_file, 'w') as f:
    json.dump(uuid_mapping, f, indent=2)

print(f"✅ 매핑 파일 저장: {mapping_file}")

