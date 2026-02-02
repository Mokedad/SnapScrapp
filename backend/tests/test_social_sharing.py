"""
Test Social Media Sharing Features
- /api/post-meta/{post_id} - HTML page with OG tags for social media crawlers
- /api/post-image/{post_id}.jpg - Actual image file for og:image
"""
import pytest
import requests
import os
import re

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test post ID from seed data
TEST_POST_ID = "7ee59aa1-8e91-4f38-8655-e7fa9e67345d"


class TestPostMetaEndpoint:
    """Tests for /api/post-meta/{post_id} endpoint - HTML with OG tags"""
    
    def test_post_meta_returns_html(self):
        """Verify endpoint returns HTML content"""
        response = requests.get(f"{BASE_URL}/api/post-meta/{TEST_POST_ID}")
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")
        assert "<!DOCTYPE html>" in response.text
    
    def test_post_meta_contains_og_title(self):
        """Verify og:title meta tag is present"""
        response = requests.get(f"{BASE_URL}/api/post-meta/{TEST_POST_ID}")
        assert response.status_code == 200
        assert 'og:title' in response.text
        # Check for actual title content
        match = re.search(r'<meta property="og:title" content="([^"]+)"', response.text)
        assert match is not None
        assert "Free on Ucycle" in match.group(1)
    
    def test_post_meta_contains_og_image(self):
        """Verify og:image meta tag points to post-image endpoint"""
        response = requests.get(f"{BASE_URL}/api/post-meta/{TEST_POST_ID}")
        assert response.status_code == 200
        assert 'og:image' in response.text
        # Check image URL format
        match = re.search(r'<meta property="og:image" content="([^"]+)"', response.text)
        assert match is not None
        image_url = match.group(1)
        assert f"/api/post-image/{TEST_POST_ID}.jpg" in image_url
    
    def test_post_meta_contains_og_description(self):
        """Verify og:description meta tag is present"""
        response = requests.get(f"{BASE_URL}/api/post-meta/{TEST_POST_ID}")
        assert response.status_code == 200
        assert 'og:description' in response.text
        match = re.search(r'<meta property="og:description" content="([^"]+)"', response.text)
        assert match is not None
        assert "Free pickup available!" in match.group(1)
    
    def test_post_meta_contains_twitter_card(self):
        """Verify Twitter card meta tags are present"""
        response = requests.get(f"{BASE_URL}/api/post-meta/{TEST_POST_ID}")
        assert response.status_code == 200
        assert 'twitter:card' in response.text
        assert 'twitter:image' in response.text
        assert 'summary_large_image' in response.text
    
    def test_post_meta_contains_redirect(self):
        """Verify page contains redirect to actual post URL"""
        response = requests.get(f"{BASE_URL}/api/post-meta/{TEST_POST_ID}")
        assert response.status_code == 200
        # Check for JavaScript redirect
        assert f"/post/{TEST_POST_ID}" in response.text
    
    def test_post_meta_404_for_invalid_id(self):
        """Verify 404 for non-existent post"""
        response = requests.get(f"{BASE_URL}/api/post-meta/invalid-post-id-12345")
        assert response.status_code == 404


class TestPostImageEndpoint:
    """Tests for /api/post-image/{post_id}.jpg endpoint - Actual image file"""
    
    def test_post_image_returns_jpeg(self):
        """Verify endpoint returns JPEG image"""
        response = requests.get(f"{BASE_URL}/api/post-image/{TEST_POST_ID}.jpg")
        assert response.status_code == 200
        content_type = response.headers.get("content-type", "")
        assert "image/jpeg" in content_type
    
    def test_post_image_has_content(self):
        """Verify image has actual content (not empty)"""
        response = requests.get(f"{BASE_URL}/api/post-image/{TEST_POST_ID}.jpg")
        assert response.status_code == 200
        assert len(response.content) > 100  # Should be more than 100 bytes
    
    def test_post_image_has_cache_headers(self):
        """Verify cache headers are set for performance"""
        response = requests.get(f"{BASE_URL}/api/post-image/{TEST_POST_ID}.jpg")
        assert response.status_code == 200
        cache_control = response.headers.get("cache-control", "")
        assert "max-age" in cache_control
    
    def test_post_image_404_for_invalid_id(self):
        """Verify 404 for non-existent post"""
        response = requests.get(f"{BASE_URL}/api/post-image/invalid-post-id-12345.jpg")
        assert response.status_code == 404


class TestOGMetaIntegration:
    """Integration tests for social media sharing flow"""
    
    def test_og_image_url_is_accessible(self):
        """Verify the og:image URL from post-meta is actually accessible"""
        # Get the meta page
        meta_response = requests.get(f"{BASE_URL}/api/post-meta/{TEST_POST_ID}")
        assert meta_response.status_code == 200
        
        # Extract og:image URL
        match = re.search(r'<meta property="og:image" content="([^"]+)"', meta_response.text)
        assert match is not None
        image_url = match.group(1)
        
        # Verify the image URL is accessible
        image_response = requests.get(image_url)
        assert image_response.status_code == 200
        assert "image/jpeg" in image_response.headers.get("content-type", "")
    
    def test_og_url_points_to_correct_post(self):
        """Verify og:url points to the correct post page"""
        response = requests.get(f"{BASE_URL}/api/post-meta/{TEST_POST_ID}")
        assert response.status_code == 200
        
        match = re.search(r'<meta property="og:url" content="([^"]+)"', response.text)
        assert match is not None
        og_url = match.group(1)
        assert f"/post/{TEST_POST_ID}" in og_url


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
