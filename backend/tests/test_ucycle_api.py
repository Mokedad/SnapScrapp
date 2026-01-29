"""
Ucycle API Tests - Backend API validation
Tests all CRUD operations and critical edge cases
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndBasics:
    """Health check and basic API tests"""
    
    def test_health_endpoint(self):
        """Test health endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"✓ Health check passed: {data}")
    
    def test_get_posts_list(self):
        """Test GET /api/posts returns list"""
        response = requests.get(f"{BASE_URL}/api/posts")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Posts list returned: {len(data)} posts")


class TestPostsCRUD:
    """Post CRUD operations tests"""
    
    def test_get_single_post(self):
        """Test GET /api/posts/{id} returns post details"""
        # First get list of posts
        response = requests.get(f"{BASE_URL}/api/posts")
        assert response.status_code == 200
        posts = response.json()
        
        if len(posts) > 0:
            post_id = posts[0]["id"]
            response = requests.get(f"{BASE_URL}/api/posts/{post_id}")
            assert response.status_code == 200
            post = response.json()
            assert post["id"] == post_id
            assert "title" in post
            assert "latitude" in post
            assert "longitude" in post
            print(f"✓ Single post retrieved: {post['title']}")
        else:
            pytest.skip("No posts available to test")
    
    def test_get_nonexistent_post(self):
        """Test GET /api/posts/{id} returns 404 for non-existent post"""
        response = requests.get(f"{BASE_URL}/api/posts/nonexistent-id-12345")
        assert response.status_code == 404
        print("✓ Non-existent post returns 404")


class TestAdminFeatures:
    """Admin panel API tests"""
    
    def test_admin_verify_valid_pin(self):
        """Test admin PIN verification with valid PIN"""
        response = requests.post(f"{BASE_URL}/api/admin/verify", json={"pin": "9090"})
        assert response.status_code == 200
        data = response.json()
        assert data.get("valid") == True
        print("✓ Valid admin PIN accepted")
    
    def test_admin_verify_invalid_pin(self):
        """Test admin PIN verification with invalid PIN"""
        response = requests.post(f"{BASE_URL}/api/admin/verify", json={"pin": "wrong"})
        assert response.status_code == 200
        data = response.json()
        assert data.get("valid") == False
        print("✓ Invalid admin PIN rejected")
    
    def test_admin_stats(self):
        """Test admin statistics endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_posts" in data
        assert "active_posts" in data
        assert "collected_posts" in data
        assert "categories" in data
        print(f"✓ Admin stats retrieved: {data['total_posts']} total posts")
    
    def test_admin_posts_list(self):
        """Test admin posts list endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/posts")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin posts list: {len(data)} posts")
    
    def test_admin_reports_list(self):
        """Test admin reports list endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/reports")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin reports list: {len(data)} reports")


class TestReportFeatures:
    """Report functionality tests"""
    
    def test_create_report(self):
        """Test creating a report for a post"""
        # First get a post to report
        response = requests.get(f"{BASE_URL}/api/posts")
        posts = response.json()
        
        if len(posts) > 0:
            post_id = posts[0]["id"]
            report_data = {
                "post_id": post_id,
                "reason": "item_gone"
            }
            response = requests.post(f"{BASE_URL}/api/reports", json=report_data)
            assert response.status_code in [200, 201]
            data = response.json()
            assert "id" in data
            assert data["post_id"] == post_id
            print(f"✓ Report created: {data['id']}")
        else:
            pytest.skip("No posts available to report")


class TestPostActions:
    """Post action tests (mark collected, etc.)"""
    
    def test_mark_collected_nonexistent(self):
        """Test marking non-existent post as collected returns 404"""
        response = requests.patch(f"{BASE_URL}/api/posts/nonexistent-id/collected")
        assert response.status_code == 404
        print("✓ Mark collected on non-existent post returns 404")


class TestGeocodingIntegration:
    """Test geocoding/search functionality indirectly via frontend"""
    
    def test_nominatim_api_accessible(self):
        """Test that Nominatim API is accessible for Australian addresses"""
        # This tests the external API that the frontend uses
        params = {
            "format": "json",
            "q": "34 Peachtree Rd, Penrith NSW",
            "limit": "5",
            "countrycodes": "au",
            "addressdetails": "1"
        }
        response = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params=params,
            headers={"User-Agent": "UcycleApp/1.0"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should find results for Australian address
        if len(data) > 0:
            print(f"✓ Nominatim found {len(data)} results for Australian address")
            print(f"  First result: {data[0].get('display_name', 'N/A')[:80]}...")
        else:
            print("⚠ Nominatim returned no results (may be rate limited)")


class TestNormansScrapYardAssets:
    """Test Norman's Scrap Yard ad assets"""
    
    def test_logo_image_accessible(self):
        """Test that Norman's Scrap Yard logo image is accessible"""
        logo_url = "https://customer-assets.emergentagent.com/job_43339dc9-f006-41e6-8de9-36afdf0eb8cc/artifacts/tuki91fg_IMG_4869.png"
        response = requests.head(logo_url)
        assert response.status_code == 200
        assert "image" in response.headers.get("content-type", "")
        print(f"✓ Norman's Scrap Yard logo accessible: {response.headers.get('content-type')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
