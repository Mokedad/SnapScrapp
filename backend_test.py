#!/usr/bin/env python3

import requests
import sys
import json
import base64
from datetime import datetime
from io import BytesIO
from PIL import Image
import time

class UcycleAPITester:
    def __init__(self, base_url="https://ucycle-app.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.admin_pin = "9090"
        
    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                try:
                    error_data = response.json()
                    details += f", Response: {error_data}"
                except:
                    details += f", Response: {response.text[:200]}"
            
            self.log_test(name, success, details)
            return success, response.json() if success and response.content else {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def create_test_image(self):
        """Create a test image in base64 format"""
        # Create a simple test image with some visual features
        img = Image.new('RGB', (200, 200), color='white')
        
        # Add some visual features (colored rectangles)
        from PIL import ImageDraw
        draw = ImageDraw.Draw(img)
        draw.rectangle([50, 50, 150, 100], fill='red')
        draw.rectangle([75, 75, 125, 125], fill='blue')
        draw.ellipse([100, 120, 150, 170], fill='green')
        
        # Convert to base64
        buffer = BytesIO()
        img.save(buffer, format='JPEG')
        img_data = buffer.getvalue()
        return base64.b64encode(img_data).decode('utf-8')

    def test_health_check(self):
        """Test health check endpoint"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root Endpoint", "GET", "", 200)

    def test_ai_image_analysis(self):
        """Test AI image analysis"""
        test_image = self.create_test_image()
        data = {"image_base64": test_image}
        
        success, response = self.run_test("AI Image Analysis", "POST", "analyze-image", 200, data)
        
        if success:
            # Verify response structure
            required_fields = ['title', 'category', 'description']
            for field in required_fields:
                if field not in response:
                    self.log_test(f"AI Analysis - {field} field", False, f"Missing {field} in response")
                    return False, {}
                else:
                    self.log_test(f"AI Analysis - {field} field", True)
        
        return success, response

    def test_create_post(self):
        """Test creating a new post"""
        test_image = self.create_test_image()
        data = {
            "image_base64": test_image,
            "title": "Test Item",
            "category": "general",
            "description": "A test item for API testing",
            "expiry_hours": 48,
            "latitude": 51.505,
            "longitude": -0.09
        }
        
        success, response = self.run_test("Create Post", "POST", "posts", 200, data)
        
        if success:
            # Verify response structure
            required_fields = ['id', 'title', 'category', 'status', 'created_at', 'expires_at']
            for field in required_fields:
                if field not in response:
                    self.log_test(f"Create Post - {field} field", False, f"Missing {field} in response")
                else:
                    self.log_test(f"Create Post - {field} field", True)
            
            return success, response
        
        return success, {}

    def test_get_posts(self):
        """Test getting all posts"""
        return self.run_test("Get All Posts", "GET", "posts", 200)

    def test_get_single_post(self, post_id):
        """Test getting a single post by ID"""
        return self.run_test("Get Single Post", "GET", f"posts/{post_id}", 200)

    def test_mark_collected(self, post_id):
        """Test marking a post as collected"""
        return self.run_test("Mark Post Collected", "PATCH", f"posts/{post_id}/collected", 200)

    def test_create_report(self, post_id):
        """Test creating a report"""
        data = {
            "post_id": post_id,
            "reason": "item_gone"
        }
        return self.run_test("Create Report", "POST", "reports", 200, data)

    def test_admin_verify_valid_pin(self):
        """Test admin PIN verification with valid PIN"""
        data = {"pin": self.admin_pin}
        return self.run_test("Admin Verify Valid PIN", "POST", "admin/verify", 200, data)

    def test_admin_verify_invalid_pin(self):
        """Test admin PIN verification with invalid PIN"""
        data = {"pin": "0000"}
        return self.run_test("Admin Verify Invalid PIN", "POST", "admin/verify", 401, data)

    def test_admin_stats(self):
        """Test admin statistics"""
        return self.run_test("Admin Stats", "GET", f"admin/stats?pin={self.admin_pin}", 200)

    def test_admin_get_all_posts(self):
        """Test admin get all posts"""
        return self.run_test("Admin Get All Posts", "GET", f"admin/posts?pin={self.admin_pin}", 200)

    def test_admin_delete_post(self, post_id):
        """Test admin delete post"""
        return self.run_test("Admin Delete Post", "DELETE", f"admin/posts/{post_id}?pin={self.admin_pin}", 200)

    def run_all_tests(self):
        """Run comprehensive API test suite"""
        print("🚀 Starting Ucycle API Test Suite")
        print(f"Testing against: {self.base_url}")
        print("=" * 50)
        
        # Basic health checks
        self.test_health_check()
        self.test_root_endpoint()
        
        # AI Analysis test
        print("\n📸 Testing AI Image Analysis...")
        ai_success, ai_response = self.test_ai_image_analysis()
        
        # Post creation and management
        print("\n📝 Testing Post Management...")
        post_success, post_response = self.test_create_post()
        post_id = None
        
        if post_success and 'id' in post_response:
            post_id = post_response['id']
            print(f"Created test post with ID: {post_id}")
            
            # Test getting posts
            self.test_get_posts()
            self.test_get_single_post(post_id)
            
            # Test reporting
            print("\n🚨 Testing Report System...")
            self.test_create_report(post_id)
            
            # Test mark as collected
            print("\n✅ Testing Mark as Collected...")
            self.test_mark_collected(post_id)
        
        # Admin functionality tests
        print("\n🔐 Testing Admin Functions...")
        self.test_admin_verify_valid_pin()
        self.test_admin_verify_invalid_pin()
        self.test_admin_stats()
        self.test_admin_get_all_posts()
        
        if post_id:
            self.test_admin_delete_post(post_id)
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = UcycleAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())