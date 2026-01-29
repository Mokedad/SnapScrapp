"""
Ucycle API Tests - Multiple Images Feature
Tests for the new multiple images per post feature
"""
import pytest
import requests
import os
import base64

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Sample base64 image (1x1 red pixel JPEG)
SAMPLE_IMAGE_BASE64 = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAwEPwAB//9k="

# Another sample image (1x1 blue pixel JPEG)
SAMPLE_IMAGE_2_BASE64 = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAwEPwAB//9k="


class TestMultipleImagesBackend:
    """Tests for multiple images feature in backend API"""
    
    def test_create_post_with_single_image(self):
        """Test POST /api/posts with only primary image (backward compatible)"""
        post_data = {
            "image_base64": SAMPLE_IMAGE_BASE64,
            "title": "TEST_Single Image Post",
            "category": "general",
            "description": "Test post with single image",
            "expiry_hours": 24,
            "latitude": -33.8688,
            "longitude": 151.2093
        }
        
        response = requests.post(f"{BASE_URL}/api/posts", json=post_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert "images" in data
        assert isinstance(data["images"], list)
        assert len(data["images"]) == 1  # Should have 1 image (primary)
        assert data["image_base64"] == SAMPLE_IMAGE_BASE64  # Primary image preserved
        print(f"✓ Created post with single image: {data['id'][:8]}...")
        print(f"  images array length: {len(data['images'])}")
        
        return data["id"]
    
    def test_create_post_with_multiple_images(self):
        """Test POST /api/posts with primary + additional images"""
        additional_images = [SAMPLE_IMAGE_2_BASE64, SAMPLE_IMAGE_BASE64]  # 2 additional images
        
        post_data = {
            "image_base64": SAMPLE_IMAGE_BASE64,  # Primary image
            "images": additional_images,  # Additional images
            "title": "TEST_Multiple Images Post",
            "category": "electronics",
            "description": "Test post with multiple images (3 total)",
            "expiry_hours": 48,
            "latitude": -33.8688,
            "longitude": 151.2093
        }
        
        response = requests.post(f"{BASE_URL}/api/posts", json=post_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert "images" in data
        assert isinstance(data["images"], list)
        # Should have 3 images: 1 primary + 2 additional
        assert len(data["images"]) == 3, f"Expected 3 images, got {len(data['images'])}"
        # First image should be the primary
        assert data["images"][0] == SAMPLE_IMAGE_BASE64
        print(f"✓ Created post with multiple images: {data['id'][:8]}...")
        print(f"  images array length: {len(data['images'])}")
        
        return data["id"]
    
    def test_create_post_with_max_images(self):
        """Test POST /api/posts with maximum 5 images (1 primary + 4 additional)"""
        additional_images = [
            SAMPLE_IMAGE_2_BASE64,
            SAMPLE_IMAGE_BASE64,
            SAMPLE_IMAGE_2_BASE64,
            SAMPLE_IMAGE_BASE64
        ]  # 4 additional images
        
        post_data = {
            "image_base64": SAMPLE_IMAGE_BASE64,  # Primary image
            "images": additional_images,  # 4 additional images
            "title": "TEST_Max Images Post",
            "category": "furniture",
            "description": "Test post with maximum 5 images",
            "expiry_hours": 72,
            "latitude": -33.8688,
            "longitude": 151.2093
        }
        
        response = requests.post(f"{BASE_URL}/api/posts", json=post_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "images" in data
        # Should have 5 images: 1 primary + 4 additional
        assert len(data["images"]) == 5, f"Expected 5 images, got {len(data['images'])}"
        print(f"✓ Created post with max 5 images: {data['id'][:8]}...")
        print(f"  images array length: {len(data['images'])}")
        
        return data["id"]
    
    def test_get_posts_returns_images_array(self):
        """Test GET /api/posts returns images array for each post"""
        response = requests.get(f"{BASE_URL}/api/posts")
        assert response.status_code == 200
        
        posts = response.json()
        assert isinstance(posts, list)
        
        for post in posts:
            assert "images" in post, f"Post {post['id']} missing 'images' field"
            assert isinstance(post["images"], list), f"Post {post['id']} 'images' is not a list"
            assert len(post["images"]) >= 1, f"Post {post['id']} has empty images array"
            # Also check backward compatibility field
            assert "image_base64" in post, f"Post {post['id']} missing 'image_base64' field"
        
        print(f"✓ All {len(posts)} posts have images array")
        for p in posts[:3]:
            print(f"  Post '{p['title'][:20]}...': {len(p['images'])} images")
    
    def test_get_single_post_returns_images_array(self):
        """Test GET /api/posts/:id returns images array"""
        # First get list of posts
        response = requests.get(f"{BASE_URL}/api/posts")
        posts = response.json()
        
        if len(posts) == 0:
            pytest.skip("No posts available")
        
        # Get single post
        post_id = posts[0]["id"]
        response = requests.get(f"{BASE_URL}/api/posts/{post_id}")
        assert response.status_code == 200
        
        post = response.json()
        assert "images" in post, "Single post missing 'images' field"
        assert isinstance(post["images"], list), "'images' is not a list"
        assert len(post["images"]) >= 1, "images array is empty"
        assert "image_base64" in post, "Missing backward compatible 'image_base64' field"
        
        print(f"✓ Single post has images array: {len(post['images'])} images")
    
    def test_backward_compatibility_old_posts(self):
        """Test that old posts without images array still work"""
        # Get all posts and verify backward compatibility
        response = requests.get(f"{BASE_URL}/api/posts")
        assert response.status_code == 200
        
        posts = response.json()
        for post in posts:
            # Every post should have both fields
            assert "image_base64" in post, f"Post {post['id']} missing image_base64"
            assert "images" in post, f"Post {post['id']} missing images array"
            
            # If images array exists, first image should match image_base64
            if len(post["images"]) > 0:
                # The primary image should be in the images array
                assert post["image_base64"] in post["images"] or post["images"][0] == post["image_base64"], \
                    f"Post {post['id']}: image_base64 not in images array"
        
        print(f"✓ Backward compatibility verified for {len(posts)} posts")
    
    def test_create_post_with_null_images(self):
        """Test POST /api/posts with images=null (should work like no additional images)"""
        post_data = {
            "image_base64": SAMPLE_IMAGE_BASE64,
            "images": None,  # Explicitly null
            "title": "TEST_Null Images Post",
            "category": "general",
            "description": "Test post with null images array",
            "expiry_hours": 24,
            "latitude": -33.8688,
            "longitude": 151.2093
        }
        
        response = requests.post(f"{BASE_URL}/api/posts", json=post_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "images" in data
        assert len(data["images"]) == 1  # Should have just the primary image
        print(f"✓ Created post with null images: {data['id'][:8]}...")
        
        return data["id"]
    
    def test_create_post_with_empty_images_array(self):
        """Test POST /api/posts with empty images array"""
        post_data = {
            "image_base64": SAMPLE_IMAGE_BASE64,
            "images": [],  # Empty array
            "title": "TEST_Empty Images Array Post",
            "category": "general",
            "description": "Test post with empty images array",
            "expiry_hours": 24,
            "latitude": -33.8688,
            "longitude": 151.2093
        }
        
        response = requests.post(f"{BASE_URL}/api/posts", json=post_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "images" in data
        assert len(data["images"]) == 1  # Should have just the primary image
        print(f"✓ Created post with empty images array: {data['id'][:8]}...")
        
        return data["id"]


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_posts(self):
        """Remove TEST_ prefixed posts"""
        # Get admin posts list
        response = requests.get(f"{BASE_URL}/api/admin/posts?pin=9090")
        if response.status_code != 200:
            pytest.skip("Could not get admin posts")
        
        posts = response.json()
        test_posts = [p for p in posts if p["title"].startswith("TEST_")]
        
        deleted = 0
        for post in test_posts:
            response = requests.delete(f"{BASE_URL}/api/admin/posts/{post['id']}?pin=9090")
            if response.status_code == 200:
                deleted += 1
        
        print(f"✓ Cleaned up {deleted} test posts")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
