#!/usr/bin/env python
"""
Django 데이터베이스 백업 스크립트
"""
import os
import sys
import django
from datetime import datetime
import subprocess

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capitalflow.settings.local')
django.setup()

def backup_database():
    """데이터베이스 백업"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_dir = 'backups'
    
    # 백업 디렉토리 생성
    os.makedirs(backup_dir, exist_ok=True)
    
    # 1. 전체 데이터 백업 (JSON)
    json_file = f"{backup_dir}/full_backup_{timestamp}.json"
    print(f"전체 데이터 백업 중... {json_file}")
    
    try:
        subprocess.run([
            'python', 'manage.py', 'dumpdata', 
            '--indent', '2',
            '--output', json_file
        ], check=True)
        print(f"✅ 전체 데이터 백업 완료: {json_file}")
    except subprocess.CalledProcessError as e:
        print(f"❌ 전체 데이터 백업 실패: {e}")
    
    # 2. 앱별 데이터 백업
    apps = ['auth', 'contenttypes', 'sessions', 'core', 'api', 'data', 'visualization', 'analytics']
    
    for app in apps:
        app_file = f"{backup_dir}/{app}_backup_{timestamp}.json"
        print(f"{app} 앱 데이터 백업 중... {app_file}")
        
        try:
            subprocess.run([
                'python', 'manage.py', 'dumpdata', app,
                '--indent', '2',
                '--output', app_file
            ], check=True)
            print(f"✅ {app} 앱 백업 완료: {app_file}")
        except subprocess.CalledProcessError as e:
            print(f"❌ {app} 앱 백업 실패: {e}")
    
    # 3. PostgreSQL 덤프 (PostgreSQL 사용 시)
    if os.getenv('DB_ENGINE') == 'django.db.backends.postgresql':
        pg_file = f"{backup_dir}/postgresql_backup_{timestamp}.sql"
        print(f"PostgreSQL 덤프 생성 중... {pg_file}")
        
        try:
            db_name = os.getenv('DB_NAME', 'capitalflow')
            db_user = os.getenv('DB_USER', 'postgres')
            db_host = os.getenv('DB_HOST', 'localhost')
            db_port = os.getenv('DB_PORT', '5432')
            
            subprocess.run([
                'pg_dump',
                '-h', db_host,
                '-p', db_port,
                '-U', db_user,
                '-d', db_name,
                '-f', pg_file
            ], check=True)
            print(f"✅ PostgreSQL 덤프 완료: {pg_file}")
        except subprocess.CalledProcessError as e:
            print(f"❌ PostgreSQL 덤프 실패: {e}")
    
    print(f"\n📁 백업 파일들이 '{backup_dir}' 디렉토리에 저장되었습니다.")
    print(f"🕒 백업 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

def restore_database(json_file):
    """데이터베이스 복원"""
    if not os.path.exists(json_file):
        print(f"❌ 백업 파일을 찾을 수 없습니다: {json_file}")
        return
    
    print(f"데이터베이스 복원 중... {json_file}")
    
    try:
        subprocess.run([
            'python', 'manage.py', 'loaddata', json_file
        ], check=True)
        print(f"✅ 데이터베이스 복원 완료: {json_file}")
    except subprocess.CalledProcessError as e:
        print(f"❌ 데이터베이스 복원 실패: {e}")

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'restore':
        if len(sys.argv) > 2:
            restore_database(sys.argv[2])
        else:
            print("사용법: python backup_database.py restore <백업파일경로>")
    else:
        backup_database()
