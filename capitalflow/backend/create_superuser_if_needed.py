#!/usr/bin/env python
"""
Render 배포 시 슈퍼유저 자동 생성 스크립트
환경 변수를 통해 슈퍼유저를 자동으로 생성합니다.
"""
import os
import sys
import django

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capitalflow.settings.production')
django.setup()

from django.contrib.auth import get_user_model
from django.core.management import call_command

User = get_user_model()

def create_superuser_if_needed():
    """환경 변수가 설정되어 있고 슈퍼유저가 없으면 생성"""
    admin_username = os.environ.get('DJANGO_SUPERUSER_USERNAME')
    admin_email = os.environ.get('DJANGO_SUPERUSER_EMAIL', '')
    admin_password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')
    
    # 환경 변수가 모두 설정되어 있는지 확인
    if not admin_username or not admin_password:
        print("⚠️  슈퍼유저 환경 변수가 설정되지 않았습니다.")
        print("   DJANGO_SUPERUSER_USERNAME, DJANGO_SUPERUSER_PASSWORD 환경 변수를 설정하세요.")
        print("   선택사항: DJANGO_SUPERUSER_EMAIL")
        return
    
    # 이미 슈퍼유저가 있는지 확인
    if User.objects.filter(username=admin_username).exists():
        print(f"✅ 슈퍼유저 '{admin_username}'가 이미 존재합니다.")
        return
    
    # 슈퍼유저 생성
    try:
        User.objects.create_superuser(
            username=admin_username,
            email=admin_email,
            password=admin_password
        )
        print(f"✅ 슈퍼유저 '{admin_username}' 생성 완료!")
    except Exception as e:
        print(f"❌ 슈퍼유저 생성 실패: {e}")
        sys.exit(1)

if __name__ == '__main__':
    create_superuser_if_needed()

