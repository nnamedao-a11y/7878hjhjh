#!/usr/bin/env python3
"""
BIBI Cars CRM - Backend API Tests
Testing P1 modules: Payments (Stripe), Contracts (e-signature), Shipping (tracking), Tasks (1 active rule), Ringostat (calls)
Testing P2 modules: Telegram Alerts, Advanced Analytics, Risk/Abuse Control
Testing P3 modules: DocuSign Integration (mock mode), Team Lead Login Approval
"""

import requests
import sys
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional

class BIBICRMAPITester:
    def __init__(self, base_url="https://repo-review-15.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'BIBI-CRM-Test-Client/1.0'
        })
        self.created_ids = {}

    def log(self, message: str, level: str = "INFO"):
        """Log test messages"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, headers: Optional[Dict] = None) -> tuple[bool, Dict]:
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = self.session.headers.copy()
        
        if headers:
            test_headers.update(headers)
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        self.log(f"Testing {name}...")
        self.log(f"  URL: {url}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PATCH':
                response = self.session.patch(url, json=data, headers=test_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"  ✅ PASSED - Status: {response.status_code}")
            else:
                self.log(f"  ❌ FAILED - Expected {expected_status}, got {response.status_code}")
                if response.text:
                    self.log(f"  Response: {response.text[:200]}...")

            try:
                response_data = response.json() if response.text else {}
            except:
                response_data = {"raw_response": response.text}

            return success, response_data

        except requests.exceptions.Timeout:
            self.log(f"  ❌ FAILED - Request timeout")
            return False, {"error": "timeout"}
        except Exception as e:
            self.log(f"  ❌ FAILED - Error: {str(e)}")
            return False, {"error": str(e)}

    def test_admin_login(self) -> bool:
        """Test admin login and get token"""
        self.log("\n=== TESTING ADMIN LOGIN ===")
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            201,
            data={"email": "admin@crm.com", "password": "admin123"}
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.log(f"  ✅ Login successful, token obtained")
            return True
        elif success and 'token' in response:
            self.token = response['token']
            self.log(f"  ✅ Login successful, token obtained")
            return True
        elif success:
            self.log(f"  ❌ Login response missing access_token: {response}")
            return False
        return False

    def test_system_health(self) -> bool:
        """Test system health check"""
        self.log("\n=== TESTING SYSTEM HEALTH ===")
        success, response = self.run_test(
            "System Health Check",
            "GET",
            "system/health",
            200
        )
        
        if success:
            self.log(f"  Status: {response.get('status', 'unknown')}")
            self.log(f"  Database: {response.get('database', 'unknown')}")
            self.log(f"  Timestamp: {response.get('timestamp', 'unknown')}")
            
        return success

    def test_payments_packages(self) -> bool:
        """Test get payment packages"""
        self.log("\n=== TESTING PAYMENT PACKAGES ===")
        success, response = self.run_test(
            "Get Payment Packages",
            "GET",
            "payments/packages",
            200
        )
        
        if success:
            if isinstance(response, list):
                self.log(f"  Available Packages: {len(response)}")
                for pkg in response:
                    self.log(f"    - {pkg.get('id')}: {pkg.get('description')} - ${pkg.get('amount')}")
            else:
                self.log(f"  Unexpected response format: {type(response)}")
            
        return success

    def test_create_invoice(self) -> str:
        """Test creating an invoice"""
        self.log("\n=== TESTING CREATE INVOICE ===")
        test_customer_id = f"test_customer_{int(time.time())}"
        success, response = self.run_test(
            "Create Invoice",
            "POST",
            "invoices/create",
            201,
            data={
                "customerId": test_customer_id,
                "customerEmail": "test@example.com",
                "type": "deposit",
                "amount": 500,
                "description": "Test deposit invoice"
            }
        )
        
        if success:
            invoice_id = response.get('id')
            self.log(f"  Invoice ID: {invoice_id}")
            self.log(f"  Amount: ${response.get('amount')}")
            self.log(f"  Status: {response.get('status')}")
            self.log(f"  Type: {response.get('type')}")
            self.created_ids['invoice'] = invoice_id
            return invoice_id
        
        return None

    def test_create_invoice_from_package(self) -> str:
        """Test creating invoice from package"""
        self.log("\n=== TESTING CREATE INVOICE FROM PACKAGE ===")
        test_customer_id = f"test_customer_{int(time.time())}"
        success, response = self.run_test(
            "Create Invoice from Package",
            "POST",
            "invoices/create-from-package",
            201,
            data={
                "packageId": "deposit_500",
                "customerId": test_customer_id,
                "customerEmail": "test@example.com"
            }
        )
        
        if success:
            invoice_id = response.get('id')
            self.log(f"  Invoice ID: {invoice_id}")
            self.log(f"  Amount: ${response.get('amount')}")
            self.log(f"  Package: {response.get('metadata', {}).get('packageId')}")
            return invoice_id
        
        return None

    def test_get_user_invoices(self) -> bool:
        """Test get user invoices"""
        self.log("\n=== TESTING GET USER INVOICES ===")
        success, response = self.run_test(
            "Get User Invoices",
            "GET",
            "invoices/me",
            200
        )
        
        if success:
            if isinstance(response, list):
                self.log(f"  User Invoices: {len(response)}")
                if response:
                    first_invoice = response[0]
                    self.log(f"    First Invoice: {first_invoice.get('id')} - ${first_invoice.get('amount')}")
            else:
                self.log(f"  Unexpected response format: {type(response)}")
            
        return success

    def test_create_contract(self) -> str:
        """Test creating a contract"""
        self.log("\n=== TESTING CREATE CONTRACT ===")
        test_customer_id = f"test_customer_{int(time.time())}"
        success, response = self.run_test(
            "Create Contract",
            "POST",
            "contracts/create",
            201,
            data={
                "customerId": test_customer_id,
                "customerEmail": "test@example.com",
                "type": "purchase_agreement",
                "title": "Test Vehicle Purchase Agreement",
                "vin": "1HGBH41JXMN123456",
                "vehicleTitle": "2023 Honda Accord",
                "price": 25000
            }
        )
        
        if success:
            contract_id = response.get('id')
            self.log(f"  Contract ID: {contract_id}")
            self.log(f"  Title: {response.get('title')}")
            self.log(f"  Status: {response.get('status')}")
            self.log(f"  Price: ${response.get('price')}")
            self.created_ids['contract'] = contract_id
            return contract_id
        
        return None

    def test_get_user_contracts(self) -> bool:
        """Test get user contracts"""
        self.log("\n=== TESTING GET USER CONTRACTS ===")
        success, response = self.run_test(
            "Get User Contracts",
            "GET",
            "contracts/me",
            200
        )
        
        if success:
            if isinstance(response, list):
                self.log(f"  User Contracts: {len(response)}")
                if response:
                    first_contract = response[0]
                    self.log(f"    First Contract: {first_contract.get('title')} - {first_contract.get('status')}")
            else:
                self.log(f"  Unexpected response format: {type(response)}")
            
        return success

    def test_create_shipment(self) -> str:
        """Test creating a shipment"""
        self.log("\n=== TESTING CREATE SHIPMENT ===")
        test_customer_id = f"test_customer_{int(time.time())}"
        success, response = self.run_test(
            "Create Shipment",
            "POST",
            "shipping/create",
            201,
            data={
                "customerId": test_customer_id,
                "customerEmail": "test@example.com",
                "vin": "1HGBH41JXMN123456",
                "vehicleTitle": "2023 Honda Accord",
                "originPort": "Los Angeles, CA",
                "destinationPort": "Odessa, Ukraine",
                "containerNumber": "TCLU1234567"
            }
        )
        
        if success:
            shipment_id = response.get('id')
            self.log(f"  Shipment ID: {shipment_id}")
            self.log(f"  VIN: {response.get('vin')}")
            self.log(f"  Status: {response.get('status')}")
            self.log(f"  Container: {response.get('containerNumber')}")
            self.created_ids['shipment'] = shipment_id
            return shipment_id
        
        return None

    def test_get_user_shipments(self) -> bool:
        """Test get user shipments"""
        self.log("\n=== TESTING GET USER SHIPMENTS ===")
        success, response = self.run_test(
            "Get User Shipments",
            "GET",
            "shipping/me",
            200
        )
        
        if success:
            if isinstance(response, list):
                self.log(f"  User Shipments: {len(response)}")
                if response:
                    first_shipment = response[0]
                    self.log(f"    First Shipment: {first_shipment.get('vin')} - {first_shipment.get('status')}")
            else:
                self.log(f"  Unexpected response format: {type(response)}")
            
        return success

    def test_get_active_shipments(self) -> bool:
        """Test get active shipments (admin)"""
        self.log("\n=== TESTING GET ACTIVE SHIPMENTS (ADMIN) ===")
        success, response = self.run_test(
            "Get Active Shipments",
            "GET",
            "admin/shipping/active",
            200
        )
        
        if success:
            if isinstance(response, list):
                self.log(f"  Active Shipments: {len(response)}")
                if response:
                    first_shipment = response[0]
                    self.log(f"    First Active: {first_shipment.get('vin')} - {first_shipment.get('status')}")
            else:
                self.log(f"  Unexpected response format: {type(response)}")
            
        return success

    def test_ringostat_webhook(self) -> bool:
        """Test Ringostat webhook"""
        self.log("\n=== TESTING RINGOSTAT WEBHOOK ===")
        success, response = self.run_test(
            "Ringostat Webhook",
            "POST",
            "ringostat/webhook",
            201,  # Changed from 200 to 201
            data={
                "event": "call_started",
                "call_id": f"test_call_{int(time.time())}",
                "direction": "inbound",
                "caller_phone": "+380123456789",
                "receiver_phone": "+380987654321",
                "started_at": datetime.now().isoformat()
            }
        )
        
        if success:
            self.log(f"  Webhook Status: {response.get('status')}")
            self.log(f"  Call ID: {response.get('callId')}")
            
        return success

    def test_get_call_board(self) -> bool:
        """Test get call board"""
        self.log("\n=== TESTING GET CALL BOARD ===")
        success, response = self.run_test(
            "Get Call Board",
            "GET",
            "calls/board",
            200
        )
        
        if success:
            if isinstance(response, list):
                self.log(f"  Call Board Items: {len(response)}")
                if response:
                    first_call = response[0]
                    self.log(f"    First Call: {first_call.get('callerPhone')} - {first_call.get('status')}")
            else:
                self.log(f"  Unexpected response format: {type(response)}")
            
        return success

    def test_get_task_queue(self) -> bool:
        """Test get task queue"""
        self.log("\n=== TESTING GET TASK QUEUE ===")
        success, response = self.run_test(
            "Get Task Queue",
            "GET",
            "tasks/queue",
            200
        )
        
        if success:
            if isinstance(response, list):
                self.log(f"  Task Queue Items: {len(response)}")
                if response:
                    first_task = response[0]
                    self.log(f"    First Task: {first_task.get('title')} - {first_task.get('status')}")
                    self.log(f"    Is Locked: {first_task.get('isLocked')}")
                    self.log(f"    Is Active: {first_task.get('isActive')}")
            else:
                self.log(f"  Unexpected response format: {type(response)}")
            
        return success

    def test_start_task(self) -> bool:
        """Test start task (1 active rule)"""
        self.log("\n=== TESTING START TASK (1 ACTIVE RULE) ===")
        
        # First create a test task
        success, response = self.run_test(
            "Create Test Task",
            "POST",
            "tasks",
            201,
            data={
                "title": "Test Task for Start",
                "description": "Testing 1 active task rule",
                "priority": "medium",
                "assignedTo": "admin_user_id",
                "dueDate": "2024-12-31T23:59:59Z"
            }
        )
        
        if not success:
            self.log("  Failed to create test task")
            return False
            
        task_id = response.get('id')
        if not task_id:
            self.log("  No task ID returned")
            return False
            
        # Now try to start the task
        success, response = self.run_test(
            "Start Task",
            "POST",
            f"tasks/{task_id}/start",
            201  # Changed from 200 to 201
        )
        
        if success:
            self.log(f"  Task Started: {response.get('title')}")
            self.log(f"  Status: {response.get('status')}")
            
        return success

    # === P2 FEATURES: ANALYTICS ===

    def test_analytics_daily(self) -> bool:
        """Test daily analytics summary"""
        self.log("\n=== TESTING ANALYTICS DAILY SUMMARY ===")
        success, response = self.run_test(
            "Daily Analytics Summary",
            "GET",
            "analytics/daily",
            200
        )
        
        if success:
            self.log(f"  Date: {response.get('date')}")
            self.log(f"  New Leads: {response.get('newLeads', 0)}")
            self.log(f"  Hot Leads: {response.get('hotLeads', 0)}")
            self.log(f"  Calls: {response.get('calls', 0)}")
            self.log(f"  Call Answer Rate: {response.get('callAnswerRate', 0)}%")
            self.log(f"  Revenue: ${response.get('revenue', 0)}")
            
        return success

    def test_analytics_owner(self) -> bool:
        """Test owner analytics"""
        self.log("\n=== TESTING OWNER ANALYTICS ===")
        success, response = self.run_test(
            "Owner Analytics",
            "GET",
            "analytics/owner?period=7",
            200
        )
        
        if success:
            self.log(f"  Period: {response.get('periodDays')} days")
            funnel = response.get('funnel', {})
            self.log(f"  Leads: {funnel.get('leads', 0)}")
            self.log(f"  Contacted: {funnel.get('contacted', 0)}")
            self.log(f"  Qualified: {funnel.get('qualified', 0)}")
            self.log(f"  Lead to Contact Rate: {funnel.get('leadToContactRate', 0)}%")
            
            revenue = response.get('revenue', {})
            self.log(f"  Total Revenue: ${revenue.get('total', 0)}")
            self.log(f"  Avg Deal Size: ${revenue.get('avgDealSize', 0)}")
            
        return success

    def test_analytics_funnel(self) -> bool:
        """Test conversion funnel analytics"""
        self.log("\n=== TESTING CONVERSION FUNNEL ===")
        success, response = self.run_test(
            "Conversion Funnel",
            "GET",
            "analytics/funnel?period=30",
            200
        )
        
        if success:
            self.log(f"  Leads: {response.get('leads', 0)}")
            self.log(f"  Contacted: {response.get('contacted', 0)}")
            self.log(f"  Carfax Requested: {response.get('carfaxRequested', 0)}")
            self.log(f"  Contracts Signed: {response.get('contractsSigned', 0)}")
            self.log(f"  Invoices Paid: {response.get('invoicesPaid', 0)}")
            self.log(f"  Delivered: {response.get('delivered', 0)}")
            
        return success

    # === P2 FEATURES: ALERTS ===

    def test_alerts_stats(self) -> bool:
        """Test alert statistics"""
        self.log("\n=== TESTING ALERT STATISTICS ===")
        success, response = self.run_test(
            "Alert Statistics",
            "GET",
            "admin/alerts/stats?period=7",
            200
        )
        
        if success:
            self.log(f"  Total Alerts: {response.get('total', 0)}")
            self.log(f"  Sent: {response.get('sent', 0)}")
            self.log(f"  Failed: {response.get('failed', 0)}")
            self.log(f"  Period: {response.get('periodDays', 0)} days")
            
            by_type = response.get('byType', {})
            if by_type:
                self.log(f"  Top Alert Types:")
                for alert_type, count in list(by_type.items())[:3]:
                    self.log(f"    - {alert_type}: {count}")
            
        return success

    def test_alerts_logs(self) -> bool:
        """Test alert logs"""
        self.log("\n=== TESTING ALERT LOGS ===")
        success, response = self.run_test(
            "Alert Logs",
            "GET",
            "admin/alerts/logs?limit=10",
            200
        )
        
        if success:
            if isinstance(response, list):
                self.log(f"  Alert Logs: {len(response)}")
                if response:
                    first_log = response[0]
                    self.log(f"    Latest: {first_log.get('eventType')} - {first_log.get('title')}")
                    self.log(f"    Sent: {first_log.get('sent')}")
            else:
                self.log(f"  Unexpected response format: {type(response)}")
            
        return success

    def test_alerts_settings_update(self) -> bool:
        """Test updating alert settings"""
        self.log("\n=== TESTING ALERT SETTINGS UPDATE ===")
        success, response = self.run_test(
            "Update Alert Settings",
            "PATCH",
            "alerts/settings",
            200,
            data={
                "telegramEnabled": True,
                "receiveCritical": True,
                "receiveHigh": True,
                "receiveMedium": False,
                "receiveLow": False
            }
        )
        
        if success:
            self.log(f"  Telegram Enabled: {response.get('telegramEnabled')}")
            self.log(f"  Receive Critical: {response.get('receiveCritical')}")
            self.log(f"  Receive High: {response.get('receiveHigh')}")
            
        return success

    def test_alerts_link_telegram(self) -> bool:
        """Test linking Telegram account"""
        self.log("\n=== TESTING TELEGRAM LINK ===")
        test_chat_id = f"test_chat_{int(time.time())}"
        success, response = self.run_test(
            "Link Telegram Account",
            "POST",
            "alerts/link-telegram",
            201,  # Changed from 200 to 201
            data={
                "telegramChatId": test_chat_id
            }
        )
        
        if success:
            self.log(f"  Telegram Chat ID: {response.get('telegramChatId')}")
            self.log(f"  Telegram Enabled: {response.get('telegramEnabled')}")
            
        return success

    # === P2 FEATURES: RISK CONTROL ===

    def test_risk_user_assessment(self) -> bool:
        """Test user risk assessment"""
        self.log("\n=== TESTING USER RISK ASSESSMENT ===")
        test_user_id = f"test_user_{int(time.time())}"
        success, response = self.run_test(
            "User Risk Assessment",
            "GET",
            f"risk/user/{test_user_id}",
            200
        )
        
        if success:
            self.log(f"  Entity ID: {response.get('entityId')}")
            self.log(f"  Risk Score: {response.get('riskScore', 0)}")
            self.log(f"  Risk Level: {response.get('riskLevel')}")
            
            factors = response.get('factors', [])
            if factors:
                self.log(f"  Risk Factors: {len(factors)}")
                for factor in factors[:3]:
                    self.log(f"    - {factor.get('name')}: {factor.get('weight')} ({factor.get('description')})")
            
            recommendations = response.get('recommendations', [])
            if recommendations:
                self.log(f"  Recommendations: {len(recommendations)}")
                for rec in recommendations[:2]:
                    self.log(f"    - {rec}")
            
        return success

    def test_risk_manager_assessment(self) -> bool:
        """Test manager risk assessment"""
        self.log("\n=== TESTING MANAGER RISK ASSESSMENT ===")
        test_manager_id = f"test_manager_{int(time.time())}"
        success, response = self.run_test(
            "Manager Risk Assessment",
            "GET",
            f"risk/manager/{test_manager_id}",
            200
        )
        
        if success:
            self.log(f"  Entity ID: {response.get('entityId')}")
            self.log(f"  Risk Score: {response.get('riskScore', 0)}")
            self.log(f"  Risk Level: {response.get('riskLevel')}")
            
            factors = response.get('factors', [])
            if factors:
                self.log(f"  Risk Factors: {len(factors)}")
                for factor in factors[:3]:
                    self.log(f"    - {factor.get('name')}: {factor.get('weight')} ({factor.get('description')})")
            
        return success

    def test_risk_daily_check(self) -> bool:
        """Test daily risk assessment"""
        self.log("\n=== TESTING DAILY RISK CHECK ===")
        success, response = self.run_test(
            "Daily Risk Check",
            "POST",
            "risk/daily-check",
            201  # Changed from 200 to 201
        )
        
        if success:
            self.log(f"  Managers Assessed: {response.get('managersAssessed', 0)}")
            self.log(f"  High Risk Managers: {response.get('highRiskManagers', 0)}")
            self.log(f"  Customers Assessed: {response.get('customersAssessed', 0)}")
            self.log(f"  High Risk Customers: {response.get('highRiskCustomers', 0)}")
            
        return success

    # === P2 FEATURES: TELEGRAM BOT ===

    # === P3 FEATURES: DOCUSIGN INTEGRATION ===

    def test_docusign_config(self) -> bool:
        """Test DocuSign configuration status"""
        self.log("\n=== TESTING DOCUSIGN CONFIG ===")
        success, response = self.run_test(
            "DocuSign Config Status",
            "GET",
            "docusign/config",
            200
        )
        
        if success:
            self.log(f"  Configured: {response.get('configured')}")
            self.log(f"  Mode: {response.get('mode')}")
            
        return success

    def test_docusign_create_envelope(self) -> str:
        """Test creating DocuSign envelope (mock mode)"""
        self.log("\n=== TESTING DOCUSIGN CREATE ENVELOPE ===")
        test_customer_id = f"test_customer_{int(time.time())}"
        
        # Create a simple base64 PDF for testing
        import base64
        test_pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Test Contract) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000206 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n299\n%%EOF"
        test_pdf_base64 = base64.b64encode(test_pdf_content).decode('utf-8')
        
        success, response = self.run_test(
            "Create DocuSign Envelope",
            "POST",
            "docusign/envelopes/create",
            201,
            data={
                "contractId": f"contract_{int(time.time())}",
                "userId": test_customer_id,
                "email": "test@example.com",
                "fullName": "Test Customer",
                "pdfBase64": test_pdf_base64,
                "fileName": "test_contract.pdf",
                "emailSubject": "Test Contract Signing"
            }
        )
        
        if success:
            envelope_id = response.get('envelopeId')
            self.log(f"  Envelope ID: {envelope_id}")
            self.log(f"  Status: {response.get('status')}")
            self.log(f"  Email: {response.get('email')}")
            self.created_ids['envelope'] = envelope_id
            return envelope_id
        
        return None

    def test_docusign_signing_url(self) -> bool:
        """Test generating DocuSign signing URL"""
        self.log("\n=== TESTING DOCUSIGN SIGNING URL ===")
        
        # Use envelope created in previous test
        envelope_id = self.created_ids.get('envelope')
        if not envelope_id:
            self.log("  No envelope ID available - skipping test")
            return False
            
        success, response = self.run_test(
            "Generate Signing URL",
            "POST",
            f"docusign/envelopes/{envelope_id}/sign",
            201,  # Fixed: endpoint returns 201, not 200
            data={
                "email": "test@example.com",
                "fullName": "Test Customer",
                "clientUserId": f"client_{int(time.time())}",
                "returnUrl": "https://example.com/return"
            }
        )
        
        if success:
            self.log(f"  Signing URL: {response.get('signingUrl')[:50]}...")
            
        return success

    def test_docusign_envelope_status(self) -> bool:
        """Test getting DocuSign envelope status"""
        self.log("\n=== TESTING DOCUSIGN ENVELOPE STATUS ===")
        
        # Use envelope created in previous test
        envelope_id = self.created_ids.get('envelope')
        if not envelope_id:
            self.log("  No envelope ID available - skipping test")
            return False
            
        success, response = self.run_test(
            "Get Envelope Status",
            "GET",
            f"docusign/envelopes/{envelope_id}/status",
            200
        )
        
        if success:
            self.log(f"  Envelope ID: {response.get('envelopeId')}")
            self.log(f"  Status: {response.get('status')}")
            self.log(f"  Completed At: {response.get('completedAt')}")
            
        return success

    # === P3 FEATURES: LOGIN APPROVAL ===

    def test_login_approval_request(self) -> str:
        """Test creating login approval request"""
        self.log("\n=== TESTING LOGIN APPROVAL REQUEST ===")
        test_user_id = f"teamlead_{int(time.time())}"
        
        success, response = self.run_test(
            "Create Login Approval Request",
            "POST",
            "login-approval/request",
            201,
            data={
                "userId": test_user_id,
                "userName": "Test Team Lead",
                "userEmail": "teamlead@example.com"
            }
        )
        
        if success:
            request_id = response.get('id')
            self.log(f"  Request ID: {request_id}")
            self.log(f"  User Name: {response.get('userName')}")
            self.log(f"  Status: {response.get('status')}")
            self.log(f"  Expires At: {response.get('expiresAt')}")
            self.created_ids['login_request'] = request_id
            return request_id
        
        return None

    def test_login_approval_status(self) -> bool:
        """Test getting login approval request status"""
        self.log("\n=== TESTING LOGIN APPROVAL STATUS ===")
        
        # Use request created in previous test
        request_id = self.created_ids.get('login_request')
        if not request_id:
            self.log("  No request ID available - skipping test")
            return False
            
        success, response = self.run_test(
            "Get Request Status",
            "GET",
            f"login-approval/{request_id}/status",
            200
        )
        
        if success:
            self.log(f"  Request ID: {response.get('id')}")
            self.log(f"  Status: {response.get('status')}")
            self.log(f"  User Name: {response.get('userName')}")
            self.log(f"  Created At: {response.get('createdAt')}")
            
        return success

    def test_login_approval_pending(self) -> bool:
        """Test getting all pending login approval requests"""
        self.log("\n=== TESTING PENDING LOGIN APPROVALS ===")
        
        success, response = self.run_test(
            "Get Pending Requests",
            "GET",
            "login-approval/pending",
            200
        )
        
        if success:
            if isinstance(response, list):
                self.log(f"  Pending Requests: {len(response)}")
                if response:
                    first_request = response[0]
                    self.log(f"    First Request: {first_request.get('userName')} - {first_request.get('status')}")
            else:
                self.log(f"  Unexpected response format: {type(response)}")
            
        return success

    def test_login_approval_approve(self) -> bool:
        """Test approving login request"""
        self.log("\n=== TESTING LOGIN APPROVAL APPROVE ===")
        
        # Use request created in previous test
        request_id = self.created_ids.get('login_request')
        if not request_id:
            self.log("  No request ID available - skipping test")
            return False
            
        success, response = self.run_test(
            "Approve Login Request",
            "POST",
            f"login-approval/{request_id}/approve",
            200,
            data={
                "approverId": "admin_user_id",
                "approverName": "Test Admin"
            }
        )
        
        if success:
            self.log(f"  Request ID: {response.get('id')}")
            self.log(f"  Status: {response.get('status')}")
            self.log(f"  Approved By: {response.get('approverName')}")
            self.log(f"  Approved At: {response.get('approvedAt')}")
            
        return success

    def test_login_approval_deny(self) -> bool:
        """Test denying login request (create new one first)"""
        self.log("\n=== TESTING LOGIN APPROVAL DENY ===")
        
        # Create a new request to deny
        test_user_id = f"teamlead_deny_{int(time.time())}"
        success, response = self.run_test(
            "Create Request to Deny",
            "POST",
            "login-approval/request",
            201,
            data={
                "userId": test_user_id,
                "userName": "Test Team Lead Deny",
                "userEmail": "teamlead_deny@example.com"
            }
        )
        
        if not success:
            self.log("  Failed to create request for deny test")
            return False
            
        request_id = response.get('id')
        if not request_id:
            self.log("  No request ID returned")
            return False
            
        # Now deny the request
        success, response = self.run_test(
            "Deny Login Request",
            "POST",
            f"login-approval/{request_id}/deny",
            200,
            data={
                "denierId": "admin_user_id",
                "reason": "Test denial"
            }
        )
        
        if success:
            self.log(f"  Request ID: {response.get('id')}")
            self.log(f"  Status: {response.get('status')}")
            self.log(f"  Denied At: {response.get('deniedAt')}")
            self.log(f"  Deny Reason: {response.get('denyReason')}")
            
        return success

    def test_telegram_bot_connection(self) -> bool:
        self.log("\n=== TESTING TELEGRAM BOT CONNECTION ===")
        
        # Test the Telegram Bot API directly
        import requests as req
        telegram_token = "7757775952:AAFTqDABFhTuOsaDlhFh2noUsqc4QPGFaGE"
        
        try:
            response = req.get(f"https://api.telegram.org/bot{telegram_token}/getMe", timeout=10)
            
            if response.status_code == 200:
                bot_info = response.json()
                if bot_info.get('ok'):
                    result = bot_info.get('result', {})
                    self.log(f"  ✅ Telegram Bot Connected")
                    self.log(f"  Bot Username: @{result.get('username')}")
                    self.log(f"  Bot ID: {result.get('id')}")
                    self.log(f"  Bot Name: {result.get('first_name')}")
                    self.tests_passed += 1
                    self.tests_run += 1
                    return True
                else:
                    self.log(f"  ❌ Telegram API Error: {bot_info.get('description')}")
            else:
                self.log(f"  ❌ HTTP Error: {response.status_code}")
                
        except Exception as e:
            self.log(f"  ❌ Connection Error: {str(e)}")
        
        self.tests_run += 1
        return False

    def run_all_tests(self) -> int:
        """Run all backend API tests for P1 and P2 modules"""
        self.log("🚀 Starting BIBI Cars CRM P1 + P2 Modules Backend Tests")
        self.log(f"Base URL: {self.base_url}")
        
        # Test system health first
        self.test_system_health()
        
        # Test admin login
        login_success = self.test_admin_login()
        
        if not login_success:
            self.log("❌ Admin login failed - cannot proceed with authenticated tests")
            return 1
        
        # === P1 MODULES (EXISTING) ===
        self.log("\n🔵 TESTING P1 MODULES")
        
        # Test Payments module
        self.test_payments_packages()
        self.test_create_invoice()
        self.test_create_invoice_from_package()
        self.test_get_user_invoices()
        
        # Test Contracts module
        self.test_create_contract()
        self.test_get_user_contracts()
        
        # Test Shipping module
        self.test_create_shipment()
        self.test_get_user_shipments()
        self.test_get_active_shipments()
        
        # Test Ringostat module
        self.test_ringostat_webhook()
        self.test_get_call_board()
        
        # Test Tasks module (1 active rule)
        self.test_get_task_queue()
        self.test_start_task()
        
        # === P2 MODULES (NEW) ===
        self.log("\n🟢 TESTING P2 MODULES")
        
        # Test Analytics module
        self.test_analytics_daily()
        self.test_analytics_owner()
        self.test_analytics_funnel()
        
        # Test Alerts module
        self.test_alerts_stats()
        self.test_alerts_logs()
        self.test_alerts_settings_update()
        self.test_alerts_link_telegram()
        
        # Test Risk Control module
        self.test_risk_user_assessment()
        self.test_risk_manager_assessment()
        self.test_risk_daily_check()
        
        # Test Telegram Bot connection
        self.test_telegram_bot_connection()
        
        # === P3 MODULES (NEW) ===
        self.log("\n🟡 TESTING P3 MODULES")
        
        # Test DocuSign Integration module
        self.test_docusign_config()
        self.test_docusign_create_envelope()
        self.test_docusign_signing_url()
        self.test_docusign_envelope_status()
        
        # Test Login Approval module
        self.test_login_approval_request()
        self.test_login_approval_status()
        self.test_login_approval_pending()
        self.test_login_approval_approve()
        self.test_login_approval_deny()
        
        # Print final results
        self.log(f"\n📊 FINAL RESULTS")
        self.log(f"Tests run: {self.tests_run}")
        self.log(f"Tests passed: {self.tests_passed}")
        self.log(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_passed == self.tests_run:
            self.log("🎉 ALL TESTS PASSED!")
            return 0
        else:
            self.log(f"❌ {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    """Main test runner"""
    tester = BIBICRMAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())