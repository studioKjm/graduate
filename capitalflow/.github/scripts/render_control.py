#!/usr/bin/env python
"""
Render 원격 제어 스크립트
GitHub Actions를 통해 Render 서버에 명령을 실행합니다.
"""
import os
import sys
import requests
import time

RENDER_API_KEY = os.environ.get('RENDER_API_KEY')
RENDER_SERVICE_ID = os.environ.get('RENDER_SERVICE_ID') or os.environ.get('SERVICE_ID')
ACTION = os.environ.get('ACTION', 'migrate')

if not RENDER_API_KEY:
    print("❌ RENDER_API_KEY 환경 변수가 설정되지 않았습니다.")
    print("   GitHub Secrets에 RENDER_API_KEY를 추가하세요.")
    sys.exit(1)

if not RENDER_SERVICE_ID:
    print("❌ RENDER_SERVICE_ID 환경 변수가 설정되지 않았습니다.")
    print("   GitHub Secrets에 RENDER_SERVICE_ID를 추가하세요.")
    sys.exit(1)

RENDER_API_BASE = "https://api.render.com/v1"

headers = {
    "Authorization": f"Bearer {RENDER_API_KEY}",
    "Accept": "application/json"
}

def trigger_deploy():
    """Render 서비스 재배포 트리거"""
    print(f"🚀 서비스 {RENDER_SERVICE_ID} 재배포 시작...")
    
    url = f"{RENDER_API_BASE}/services/{RENDER_SERVICE_ID}/deploys"
    response = requests.post(url, headers=headers, json={"clearCache": False})
    
    if response.status_code == 201:
        deploy = response.json()
        deploy_id = deploy.get('deploy', {}).get('id')
        print(f"✅ 배포 시작됨: {deploy_id}")
        print(f"   배포 상태 확인: https://dashboard.render.com/web/{RENDER_SERVICE_ID}")
        return deploy_id
    else:
        print(f"❌ 배포 실패: {response.status_code}")
        print(f"   응답: {response.text}")
        return None

def get_service_info():
    """서비스 정보 가져오기"""
    url = f"{RENDER_API_BASE}/services/{RENDER_SERVICE_ID}"
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"❌ 서비스 정보 가져오기 실패: {response.status_code}")
        return None

def main():
    """메인 함수"""
    print(f"📋 실행할 작업: {ACTION}")
    print(f"🔧 서비스 ID: {RENDER_SERVICE_ID}")
    
    if ACTION == 'deploy':
        # 재배포만 트리거
        deploy_id = trigger_deploy()
        if deploy_id:
            print("\n✅ 재배포가 시작되었습니다.")
            print("   배포 완료까지 몇 분 소요될 수 있습니다.")
            print("   Render 대시보드에서 진행 상황을 확인하세요.")
        return
    
    # 서비스 정보 확인
    service_info = get_service_info()
    if not service_info:
        sys.exit(1)
    
    print(f"📦 서비스 이름: {service_info.get('service', {}).get('name')}")
    
    # 환경 변수 업데이트를 통한 작업 실행
    # Render는 환경 변수를 업데이트하면 자동으로 재배포됩니다
    # 특정 작업을 실행하려면 환경 변수를 설정하고 재배포를 트리거합니다
    
    if ACTION == 'migrate':
        print("\n💡 마이그레이션은 Start Command에 포함되어 있습니다.")
        print("   재배포를 트리거하면 자동으로 마이그레이션이 실행됩니다.")
        print("   재배포를 시작하시겠습니까? (자동으로 시작합니다)")
        trigger_deploy()
        
    elif ACTION == 'createsuperuser':
        print("\n💡 슈퍼유저 생성은 환경 변수를 통해 자동화되어 있습니다.")
        print("   Render 대시보드에서 다음 환경 변수를 설정하세요:")
        print("   - DJANGO_SUPERUSER_USERNAME")
        print("   - DJANGO_SUPERUSER_PASSWORD")
        print("   - DJANGO_SUPERUSER_EMAIL (선택사항)")
        print("\n   환경 변수 설정 후 재배포를 트리거합니다.")
        trigger_deploy()
        
    elif ACTION == 'collectstatic':
        print("\n💡 정적 파일 수집은 Build Command와 Start Command에 포함되어 있습니다.")
        print("   재배포를 트리거하면 자동으로 실행됩니다.")
        trigger_deploy()
    
    print("\n✅ 작업이 완료되었습니다.")
    print("   Render 대시보드에서 배포 로그를 확인하세요.")

if __name__ == '__main__':
    main()

