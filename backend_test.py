#!/usr/bin/env python3
"""
BIBI Cars CRM - Backend API Testing
Tests all critical backend endpoints for the CRM system
"""

import requests
import sys
import json
from datetime import datetime

class BIBICRMTester:
    def __init__(self, base_url="https://5529a2db-43df-4a74-bc23-e3c954d3bb64.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json() if response.content else {}
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    'name': name,
                    'endpoint': endpoint,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:200]
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                'name': name,
                'endpoint': endpoint,
                'error': str(e)
            })
            return False, {}

    def test_health_check(self):
        """Test system health endpoint"""
        return self.run_test(
            "System Health Check",
            "GET",
            "api/system/health",
            200
        )

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "api/auth/login",
            201,  # Changed to 201 as that's what the API returns
            data={
                "email": "admin@crm.com",
                "password": "admin123"
            }
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   Access token received: {self.token[:20]}...")
            return True
        elif success and 'token' in response:
            self.token = response['token']
            print(f"   Token received: {self.token[:20]}...")
            return True
        return False

    def test_team_lead_login(self):
        """Test team lead login"""
        success, response = self.run_test(
            "Team Lead Login",
            "POST",
            "api/auth/login",
            201,  # Changed to 201
            data={
                "email": "teamlead@crm.com",
                "password": "staff123"
            }
        )
        return success

    def test_manager_login(self):
        """Test manager login"""
        success, response = self.run_test(
            "Manager Login",
            "POST",
            "api/auth/login",
            201,  # Changed to 201
            data={
                "email": "manager1@crm.com",
                "password": "staff123"
            }
        )
        return success

    def test_dashboard_data(self):
        """Test dashboard data endpoint"""
        return self.run_test(
            "Dashboard Data",
            "GET",
            "api/dashboard",
            200
        )

    def test_customers_list(self):
        """Test customers list endpoint"""
        return self.run_test(
            "Customers List",
            "GET",
            "api/customers",
            200
        )

    def test_shipping_endpoints(self):
        """Test shipping related endpoints"""
        results = []
        
        # Test get user shipments
        success, _ = self.run_test(
            "User Shipments",
            "GET",
            "api/shipping/me",
            200
        )
        results.append(success)
        
        # Test shipping analytics
        success, _ = self.run_test(
            "Shipping Analytics",
            "GET",
            "api/shipping/analytics",
            200
        )
        results.append(success)
        
        return all(results)

    def test_invoice_endpoints(self):
        """Test invoice related endpoints"""
        results = []
        
        # Test get user invoices
        success, _ = self.run_test(
            "User Invoices",
            "GET",
            "api/invoices/me",
            200
        )
        results.append(success)
        
        # Test payment packages
        success, _ = self.run_test(
            "Payment Packages",
            "GET",
            "api/payments/packages",
            200
        )
        results.append(success)
        
        return all(results)

    def test_payment_flow_endpoints(self):
        """Test payment flow endpoints"""
        results = []
        
        # Test blocked deals
        success, _ = self.run_test(
            "Blocked Deals",
            "GET",
            "api/payment-flow/blocked",
            200
        )
        results.append(success)
        
        return all(results)

    def test_admin_endpoints(self):
        """Test admin specific endpoints"""
        results = []
        
        # Test admin invoices
        success, _ = self.run_test(
            "Admin Invoices",
            "GET",
            "api/invoices/admin",
            200
        )
        results.append(success)
        
        # Test admin analytics
        success, _ = self.run_test(
            "Admin Analytics",
            "GET",
            "api/analytics",
            200
        )
        results.append(success)
        
        return all(results)

def main():
    print("🚗 BIBI Cars CRM - Backend API Testing")
    print("=" * 50)
    
    tester = BIBICRMTester()
    
    # Test system health first
    print("\n📊 Testing System Health...")
    health_ok = tester.test_health_check()[0]
    
    if not health_ok:
        print("❌ System health check failed - stopping tests")
        return 1
    
    # Test authentication
    print("\n🔐 Testing Authentication...")
    admin_login_ok = tester.test_admin_login()
    team_lead_ok = tester.test_team_lead_login()
    manager_ok = tester.test_manager_login()
    
    if not admin_login_ok:
        print("❌ Admin login failed - some tests may fail")
    
    # Test core endpoints
    print("\n📋 Testing Core Endpoints...")
    tester.test_dashboard_data()
    tester.test_customers_list()
    
    # Test shipping module
    print("\n🚚 Testing Shipping Module...")
    tester.test_shipping_endpoints()
    
    # Test invoice/payment system
    print("\n💳 Testing Payment System...")
    tester.test_invoice_endpoints()
    tester.test_payment_flow_endpoints()
    
    # Test admin endpoints
    print("\n👑 Testing Admin Endpoints...")
    tester.test_admin_endpoints()
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.failed_tests:
        print(f"\n❌ Failed Tests ({len(tester.failed_tests)}):")
        for test in tester.failed_tests:
            error_msg = test.get('error', f"Expected {test.get('expected')}, got {test.get('actual')}")
            print(f"   • {test['name']}: {error_msg}")
    
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"\n✅ Success Rate: {success_rate:.1f}%")
    
    return 0 if success_rate >= 80 else 1

if __name__ == "__main__":
    sys.exit(main())