#!/usr/bin/env python3
"""
CSV 파일을 Railway PostgreSQL에 import하는 전용 스크립트
이미 생성된 CSV 파일을 사용합니다.
"""
import os
import sys
import csv
import django
from pathlib import Path
import tempfile

# Django 설정
BASE_DIR = Path(__file__).parent
os.chdir(BASE_DIR)

# Production 설정으로 시작 (PostgreSQL 연결)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capitalflow.settings.production')
django.setup()

from django.db import connection, models
from apps.data.models import Country, Sector, CapitalType, DataSource, RawCapitalData, ProcessedCapitalData
import uuid
from decimal import Decimal
from datetime import datetime

def import_from_csv_orm(model_class, csv_file):
    """UUID 필드가 있는 모델은 Django ORM으로 import"""
    print(f"   Django ORM bulk_create 사용...")
    
    # 기존 데이터 삭제 (TRUNCATE 사용 - 훨씬 빠름)
    table_name = model_class._meta.db_table
    try:
        with connection.cursor() as cursor:
            # TRUNCATE는 훨씬 빠르지만 CASCADE가 필요할 수 있음
            cursor.execute(f"TRUNCATE TABLE {table_name} CASCADE")
        print(f"   기존 데이터 삭제 완료 (TRUNCATE)", flush=True)
    except Exception as e:
        # TRUNCATE 실패 시 건너뛰고 ignore_conflicts로 덮어쓰기
        print(f"   ⚠️ TRUNCATE 실패, 기존 데이터는 덮어쓰기로 처리: {e}", flush=True)
    
    # DataSource UUID 매핑 로드 (로컬 SQLite UUID -> Railway PostgreSQL UUID)
    source_uuid_mapping = {}
    if model_class == RawCapitalData:
        try:
            import json
            mapping_file = BASE_DIR / 'backups' / 'source_uuid_mapping.json'
            if mapping_file.exists():
                with open(mapping_file, 'r') as f:
                    source_uuid_mapping = json.load(f)
                print(f"   DataSource UUID 매핑 로드: {len(source_uuid_mapping)}개")
            else:
                print(f"   ⚠️ 매핑 파일 없음: {mapping_file}")
                print(f"   직접 UUID로 찾기를 시도합니다.")
        except Exception as e:
            print(f"   ⚠️ DataSource UUID 매핑 로드 실패: {e}")
    
    # ForeignKey 캐시 생성 (성능 최적화)
    fk_cache = {}
    if model_class == RawCapitalData:
        from apps.data.models import Country, Sector, CapitalType, DataSource
        fk_cache['Country'] = {c.code: c for c in Country.objects.all()}
        fk_cache['Sector'] = {s.code: s for s in Sector.objects.all()}
        fk_cache['CapitalType'] = {ct.code: ct for ct in CapitalType.objects.all()}
        fk_cache['DataSource'] = {str(ds.id): ds for ds in DataSource.objects.all()}
        print(f"   ForeignKey 캐시 생성: Country({len(fk_cache['Country'])}), Sector({len(fk_cache['Sector'])}), CapitalType({len(fk_cache['CapitalType'])}), DataSource({len(fk_cache['DataSource'])})")
    
    # CSV 파일 총 행 수 미리 계산 (진행 상황 표시용)
    print(f"   CSV 파일 읽는 중...", flush=True)
    with open(csv_file, 'r', encoding='utf-8') as f:
        total_csv_rows = sum(1 for line in f) - 1  # 헤더 제외
    print(f"   CSV 총 행 수: {total_csv_rows:,}개", flush=True)
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        print(f"   CSV 헤더: {reader.fieldnames}", flush=True)
        
        objects_to_create = []
        batch_size = 1000  # 배치 크기 증가 (성능 최적화)
        row_count = 0
        last_progress = 0
        
        for row in reader:
            try:
                # ForeignKey 필드 처리
                data = {}
                for field_name, value in row.items():
                    # 빈 값 처리
                    if not value or (isinstance(value, str) and value.strip() == ''):
                        # ForeignKey 필드는 필수이므로 건너뜀
                        if field_name.endswith('_id'):
                            continue
                        # 일반 필드는 건너뜀
                        continue
                    
                    # _id 접미사 처리
                    actual_field_name = field_name
                    is_fk_id = False
                    if field_name.endswith('_id'):
                        actual_field_name = field_name[:-3]
                        is_fk_id = True
                    
                    try:
                        field = model_class._meta.get_field(actual_field_name)
                    except:
                        # 필드가 없으면 일반 필드로 처리
                        if not is_fk_id:
                            data[field_name] = value
                        continue
                    
                    # ForeignKey 처리
                    if field.many_to_one:
                        # _id 접미사 제거하고 실제 모델 찾기
                        related_model = field.related_model
                        try:
                            if hasattr(related_model, 'objects'):
                                # UUID Primary Key인 경우 (DataSource)
                                if isinstance(related_model._meta.pk, models.UUIDField):
                                    obj = None
                                    # 캐시에서 먼저 찾기 (성능 최적화)
                                    if actual_field_name == 'source' and 'DataSource' in fk_cache:
                                        obj = fk_cache['DataSource'].get(value)
                                    
                                    if obj is None:
                                        try:
                                            # 1. 먼저 직접 UUID로 찾기 시도
                                            obj = related_model.objects.get(pk=uuid.UUID(value))
                                            # 캐시에 추가
                                            if actual_field_name == 'source' and 'DataSource' in fk_cache:
                                                fk_cache['DataSource'][value] = obj
                                        except (ValueError, related_model.DoesNotExist):
                                            # 2. UUID 매핑 사용 (source_id의 경우)
                                            if actual_field_name == 'source' and value in source_uuid_mapping:
                                                try:
                                                    mapped_uuid = source_uuid_mapping[value]
                                                    obj = related_model.objects.get(pk=mapped_uuid)
                                                    # 캐시에 추가
                                                    if 'DataSource' in fk_cache:
                                                        fk_cache['DataSource'][value] = obj
                                                except (ValueError, related_model.DoesNotExist):
                                                    pass
                                    
                                    # 3. 여전히 찾지 못한 경우 (source 필드만 기본값 사용)
                                    if obj is None:
                                        if actual_field_name == 'source':
                                            # source 필드는 기본값 사용
                                            default_source = related_model.objects.first()
                                            if default_source:
                                                obj = default_source
                                                # 캐시에 추가
                                                if 'DataSource' in fk_cache:
                                                    fk_cache['DataSource'][value] = obj
                                                if row_count < 10 or row_count % 10000 == 0:
                                                    print(f"   ⚠️ source UUID를 찾지 못해 기본값 사용: {value} → {default_source.id}")
                                            else:
                                                if row_count < 10 or row_count % 10000 == 0:
                                                    print(f"   ⚠️ source UUID를 찾지 못했고 기본값도 없음: {value}")
                                                continue
                                        else:
                                            # 다른 UUID FK는 건너뜀
                                            if row_count < 10 or row_count % 10000 == 0:
                                                print(f"   ⚠️ {actual_field_name} UUID 변환 실패 또는 객체 없음: {value}")
                                            continue
                                    
                                    data[actual_field_name] = obj
                                # String Primary Key인 경우 (Country, Sector, CapitalType)
                                elif hasattr(related_model, 'code'):
                                    # 캐시에서 찾기
                                    cache_key = related_model.__name__
                                    obj = None
                                    if cache_key in fk_cache:
                                        obj = fk_cache[cache_key].get(value)
                                    
                                    if obj is None:
                                        try:
                                            obj = related_model.objects.get(code=value)
                                            # 캐시에 추가
                                            if cache_key in fk_cache:
                                                fk_cache[cache_key][value] = obj
                                        except related_model.DoesNotExist:
                                            # name으로 시도
                                            try:
                                                obj = related_model.objects.get(name=value)
                                                # 캐시에 추가
                                                if cache_key in fk_cache:
                                                    fk_cache[cache_key][value] = obj
                                            except:
                                                if row_count < 10 or row_count % 10000 == 0:
                                                    print(f"   ⚠️ {actual_field_name} 객체 없음: {value}")
                                                continue
                                    
                                    data[actual_field_name] = obj
                                # 일반 PK
                                else:
                                    try:
                                        obj = related_model.objects.get(pk=value)
                                        data[actual_field_name] = obj
                                    except:
                                        print(f"   ⚠️ {actual_field_name} PK로 찾기 실패: {value}")
                                        continue
                        except Exception as e:
                            print(f"   ⚠️ {actual_field_name} 처리 오류: {e}")
                            continue
                    # UUID 필드 처리
                    elif isinstance(field, models.UUIDField):
                        try:
                            data[field_name] = uuid.UUID(value)
                        except:
                            data[field_name] = uuid.uuid4()
                    # Decimal 필드 처리
                    elif isinstance(field, models.DecimalField):
                        try:
                            data[field_name] = Decimal(value)
                        except:
                            continue
                    # Integer 필드 처리
                    elif isinstance(field, (models.IntegerField, models.PositiveIntegerField)):
                        try:
                            data[field_name] = int(value)
                        except:
                            continue
                    # Float 필드 처리
                    elif isinstance(field, models.FloatField):
                        try:
                            data[field_name] = float(value)
                        except:
                            continue
                    # Boolean 필드 처리
                    elif isinstance(field, models.BooleanField):
                        data[field_name] = value.lower() in ('true', '1', 'yes', 't')
                    # DateTime 필드 처리
                    elif isinstance(field, models.DateTimeField):
                        try:
                            data[field_name] = datetime.fromisoformat(value.replace('Z', '+00:00'))
                        except:
                            continue
                    # 일반 필드
                    else:
                        data[field_name] = value
                
                # 필수 ForeignKey 필드 확인
                required_fks = []
                for field in model_class._meta.get_fields():
                    if field.many_to_one and not field.null:
                        fk_name = field.name
                        if fk_name not in data:
                            required_fks.append(fk_name)
                
                # 필수 ForeignKey가 없으면 건너뜀
                if required_fks:
                    if row_count % 10000 == 0:
                        print(f"   ⚠️ 필수 FK 누락으로 건너뜀: {required_fks} (행 {row_count})", flush=True)
                    continue
                
                # 모델 인스턴스 생성
                try:
                    obj = model_class(**data)
                    objects_to_create.append(obj)
                    row_count += 1
                except Exception as e:
                    if row_count % 10000 == 0:
                        print(f"   ⚠️ 객체 생성 실패 (행 {row_count}): {e}", flush=True)
                    continue
                
                # 진행 상황 출력 (5,000개마다)
                if row_count - last_progress >= 5000:
                    print(f"   진행: {row_count:,}개 읽음, {len(objects_to_create):,}개 대기 중", flush=True)
                    last_progress = row_count
                
                # 배치로 저장
                if len(objects_to_create) >= batch_size:
                    try:
                        model_class.objects.bulk_create(objects_to_create, ignore_conflicts=True)
                        print(f"   진행: {row_count:,}개 읽음, {len(objects_to_create):,}개 저장 완료", flush=True)
                        objects_to_create = []
                    except Exception as e:
                        print(f"   ⚠️ 배치 저장 오류 (행 {row_count}): {e}", flush=True)
                        # 작은 배치로 재시도
                        saved = 0
                        for obj in objects_to_create:
                            try:
                                obj.save()
                                saved += 1
                            except:
                                pass
                        print(f"   개별 저장: {saved}/{len(objects_to_create)}개 성공", flush=True)
                        objects_to_create = []
                    
            except Exception as e:
                continue
        
        # 남은 데이터 저장
        if objects_to_create:
            try:
                model_class.objects.bulk_create(objects_to_create, ignore_conflicts=True)
                print(f"   최종 배치 저장: {len(objects_to_create):,}개", flush=True)
            except Exception as e:
                print(f"   ⚠️ 최종 배치 저장 오류: {e}")
                # 개별 저장으로 재시도
                saved = 0
                for obj in objects_to_create:
                    try:
                        obj.save()
                        saved += 1
                    except:
                        pass
                print(f"   개별 저장 완료: {saved:,}개")
        
        print(f"   처리된 행 수: {row_count:,}개", flush=True)
    
    print(f"   ✅ 완료")
    return True

def import_from_csv(model_class, csv_file, use_orm=False):
    """CSV 파일을 PostgreSQL에 import (COPY 명령 또는 ORM 사용)"""
    print(f"📥 {model_class.__name__} ← CSV import 중...")
    
    if not Path(csv_file).exists():
        print(f"   ⚠️ 파일 없음: {csv_file}")
        return False
    
    # PostgreSQL 연결 확인
    db_vendor = connection.vendor
    if db_vendor != 'postgresql':
        print(f"   ❌ 오류: 현재 연결은 {db_vendor}입니다. PostgreSQL이 필요합니다.")
        return False
    
    # UUID 필드가 있는 모델은 ORM 사용
    # use_orm 파라미터가 명시적으로 True이거나, PK가 UUIDField인 경우에만 ORM 사용
    is_uuid_pk = isinstance(model_class._meta.pk, models.UUIDField)
    if use_orm or is_uuid_pk:
        return import_from_csv_orm(model_class, csv_file)
    
    with connection.cursor() as cursor:
        # 테이블명 가져오기
        table_name = model_class._meta.db_table
        
        # 기존 데이터 삭제 (TRUNCATE)
        print(f"   기존 데이터 삭제 중: {table_name}")
        try:
            cursor.execute(f"TRUNCATE TABLE {table_name} CASCADE")
        except Exception as e:
            print(f"   ⚠️ TRUNCATE 실패 (계속 진행): {e}")
        
        # PostgreSQL에서 테이블의 실제 컬럼 순서 가져오기
        cursor.execute("""
            SELECT column_name, is_nullable, data_type
            FROM information_schema.columns 
            WHERE table_name = %s 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        """, [table_name])
        db_columns_info = cursor.fetchall()
        db_columns = [row[0] for row in db_columns_info]
        nullable_info = {row[0]: row[1] == 'YES' for row in db_columns_info}
        
        # CSV 파일의 컬럼 읽기
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            csv_columns = reader.fieldnames
        
        # CSV 컬럼을 DB 컬럼 순서에 맞게 재정렬
        ordered_columns = []
        for db_col in db_columns:
            # id 컬럼은 제외 (UUID는 자동 생성)
            if db_col == 'id':
                continue
            # UUID 타입 필드는 제외 (자동 생성)
            if db_col in csv_columns:
                ordered_columns.append(db_col)
        
        print(f"   CSV 컬럼 수: {len(csv_columns)}개")
        print(f"   DB 컬럼 수: {len(ordered_columns)}개 (id 제외)")
        
        if not ordered_columns:
            print(f"   ⚠️ 매칭되는 컬럼이 없습니다.")
            return False
        
        # PostgreSQL COPY 명령 사용
        print(f"   PostgreSQL COPY 명령 사용...")
        
        # 임시 파일 생성 (컬럼 순서 재정렬)
        temp_file = tempfile.NamedTemporaryFile(mode='w', delete=False, encoding='utf-8', newline='')
        temp_file_path = temp_file.name
        
        try:
            with open(csv_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                writer = csv.writer(temp_file)
                
                row_count = 0
                for row in reader:
                    # DB 컬럼 순서에 맞게 데이터 재정렬
                    ordered_row = []
                    for col in ordered_columns:
                        value = row.get(col, '')
                        # 빈 값 처리 (NOT NULL 제약 조건 대응)
                        if not value or (isinstance(value, str) and value.strip() == ''):
                            # NOT NULL 필드인지 확인
                            is_nullable = nullable_info.get(col, True)
                            
                            # 모델별 기본값 설정
                            if model_class == Country:
                                if col == 'name_en' and row.get('name'):
                                    value = row.get('name', '')
                                elif col == 'name' and row.get('code'):
                                    value = row.get('code', '')
                                elif col == 'region':
                                    value = 'Unknown' if not is_nullable else ''
                                elif col == 'continent':
                                    value = 'Unknown' if not is_nullable else ''
                                elif not is_nullable:
                                    # NOT NULL 필드에 기본값
                                    value = 'N/A'
                                else:
                                    value = ''
                            elif model_class == Sector:
                                if col == 'name_en' and row.get('name'):
                                    value = row.get('name', '')
                                elif col == 'name' and row.get('code'):
                                    value = row.get('code', '')
                                elif col == 'description':
                                    value = '' if is_nullable else 'N/A'
                                elif not is_nullable:
                                    value = 'N/A'
                                else:
                                    value = ''
                            elif model_class == CapitalType:
                                if col == 'name_en' and row.get('name'):
                                    value = row.get('name', '')
                                elif col == 'name' and row.get('code'):
                                    value = row.get('code', '')
                                elif col == 'description':
                                    value = '' if is_nullable else 'N/A'
                                elif not is_nullable:
                                    value = 'N/A'
                                else:
                                    value = ''
                            else:
                                # 기타 모델
                                if col == 'name_en' and row.get('name'):
                                    value = row.get('name', '')
                                elif col == 'name' and row.get('code'):
                                    value = row.get('code', '')
                                elif not is_nullable:
                                    value = 'N/A'
                                else:
                                    value = ''
                        ordered_row.append(value)
                    writer.writerow(ordered_row)
                    row_count += 1
                
                print(f"   처리된 행 수: {row_count:,}개")
            
            temp_file.close()
            
            # COPY 명령 실행
            with open(temp_file_path, 'r', encoding='utf-8') as f:
                cursor.copy_expert(
                    f"COPY {table_name} ({','.join(ordered_columns)}) FROM STDIN WITH (FORMAT csv, DELIMITER ',', QUOTE '\"', ESCAPE '\"')",
                    f
                )
            
            # 임시 파일 삭제
            Path(temp_file_path).unlink()
            
        except Exception as e:
            # 임시 파일 삭제
            if Path(temp_file_path).exists():
                Path(temp_file_path).unlink()
            print(f"   ❌ 오류: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    print(f"   ✅ 완료")
    return True

def main():
    print("🚀 Railway PostgreSQL CSV Import 시작...")
    print("=" * 60)
    
    # DATABASE_URL 확인
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        print("❌ DATABASE_URL 환경 변수가 설정되지 않았습니다.")
        sys.exit(1)
    
    print(f"   DATABASE_URL: {db_url[:50]}...")
    print(f"   DB 엔진: {connection.vendor}")
    
    if connection.vendor != 'postgresql':
        print(f"   ❌ 오류: PostgreSQL 연결이 아닙니다. 현재: {connection.vendor}")
        sys.exit(1)
    
    csv_dir = Path('backups/csv_export')
    
    # Foreign Key 순서대로 import
    # UUID 필드가 있는 모델은 ORM 사용
    uuid_models = {DataSource, RawCapitalData, ProcessedCapitalData}
    
    import_order = [
        (Country, 'country.csv', False),
        (Sector, 'sector.csv', False),
        (CapitalType, 'capitaltype.csv', False),
        (DataSource, 'datasource.csv', True),  # UUID 필드 있음
        (RawCapitalData, 'rawcapitaldata.csv', True),  # UUID 필드 있음
        (ProcessedCapitalData, 'processedcapitaldata.csv', True),  # UUID 필드 있음
    ]
    
    success_count = 0
    for model_class, filename, use_orm in import_order:
        csv_file = csv_dir / filename
        if csv_file.exists():
            try:
                if use_orm:
                    if import_from_csv_orm(model_class, csv_file):
                        success_count += 1
                else:
                    if import_from_csv(model_class, csv_file):
                        success_count += 1
            except Exception as e:
                print(f"   ⚠️ {model_class.__name__} import 실패: {e}")
                import traceback
                traceback.print_exc()
        else:
            print(f"   ⚠️ CSV 파일 없음: {csv_file}")
    
    print(f"\n✅ Import 완료: {success_count}/{len(import_order)}개 모델 성공")
    
    # 데이터 검증
    print("\n3️⃣ 데이터 검증")
    print(f"Country: {Country.objects.count():,}개")
    print(f"Sector: {Sector.objects.count():,}개")
    print(f"CapitalType: {CapitalType.objects.count():,}개")
    print(f"DataSource: {DataSource.objects.count():,}개")
    print(f"RawCapitalData: {RawCapitalData.objects.count():,}개")
    print(f"ProcessedCapitalData: {ProcessedCapitalData.objects.count():,}개")

if __name__ == '__main__':
    main()

