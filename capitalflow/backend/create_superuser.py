#!/usr/bin/env python
"""
Django 슈퍼계정 생성 스크립트
"""
import os
import sys
import django

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capitalflow.settings.local')
django.setup()

from django.contrib.auth.models import User

def create_superuser():
    """슈퍼계정 생성"""
    username = 'admin'
    email = 'admin@capitalflow.com'
    password = 'admin123'
    
    # 기존 슈퍼계정이 있는지 확인
    if User.objects.filter(username=username).exists():
        print(f"슈퍼계정 '{username}'이 이미 존재합니다.")
        return
    
    # 슈퍼계정 생성
    user = User.objects.create_superuser(
        username=username,
        email=email,
        password=password,
        first_name='Admin',
        last_name='User'
    )
    
    print(f"슈퍼계정이 성공적으로 생성되었습니다:")
    print(f"사용자명: {username}")
    print(f"이메일: {email}")
    print(f"비밀번호: {password}")
    print(f"관리자 페이지: http://localhost:8001/admin/")

if __name__ == '__main__':
    create_superuser()
