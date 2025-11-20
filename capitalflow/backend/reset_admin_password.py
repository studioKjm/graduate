#!/usr/bin/env python
"""
Django 관리자 계정 비밀번호 재설정 스크립트
"""
import os
import sys
import django

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capitalflow.settings.local')
django.setup()

from django.contrib.auth.models import User

def reset_admin_password():
    """관리자 계정 비밀번호 재설정"""
    username = 'admin'
    new_password = 'admin123'  # 원하는 비밀번호로 변경 가능
    
    try:
        user = User.objects.get(username=username)
        user.set_password(new_password)
        user.is_staff = True
        user.is_superuser = True
        user.save()
        
        print(f"✅ 비밀번호가 성공적으로 변경되었습니다!")
        print(f"사용자명: {username}")
        print(f"새 비밀번호: {new_password}")
        print(f"관리자 페이지: http://localhost:8001/admin/")
        
    except User.DoesNotExist:
        print(f"❌ 사용자 '{username}'을 찾을 수 없습니다.")
        print("먼저 create_superuser.py를 실행하여 계정을 생성하세요.")
        sys.exit(1)
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        sys.exit(1)

if __name__ == '__main__':
    reset_admin_password()

