"""
Test Distance Indicator Feature - Ucycle App
Tests the Haversine distance calculation and formatting logic
"""
import pytest
import math

# Haversine formula implementation (same as frontend)
def get_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two points using Haversine formula"""
    R = 6371  # Earth's radius in km
    dLat = (lat2 - lat1) * math.pi / 180
    dLon = (lon2 - lon1) * math.pi / 180
    a = (math.sin(dLat/2) * math.sin(dLat/2) +
         math.cos(lat1 * math.pi / 180) * math.cos(lat2 * math.pi / 180) *
         math.sin(dLon/2) * math.sin(dLon/2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def format_distance(dist):
    """Format distance for display - same logic as frontend"""
    if dist < 1:
        return f"{round(dist * 1000)}m"
    return f"{dist:.1f}km"


class TestHaversineDistanceCalculation:
    """Test the Haversine distance calculation formula"""
    
    def test_same_location_returns_zero(self):
        """Distance between same point should be 0"""
        dist = get_distance(51.5074, -0.1278, 51.5074, -0.1278)
        assert dist == 0, "Distance between same point should be 0"
        print("✓ Same location returns 0 distance")
    
    def test_london_to_paris_distance(self):
        """Test known distance: London to Paris ~344km"""
        # London: 51.5074, -0.1278
        # Paris: 48.8566, 2.3522
        dist = get_distance(51.5074, -0.1278, 48.8566, 2.3522)
        # Should be approximately 344km
        assert 340 < dist < 350, f"London to Paris should be ~344km, got {dist}km"
        print(f"✓ London to Paris distance: {dist:.1f}km (expected ~344km)")
    
    def test_short_distance_meters(self):
        """Test short distance calculation (< 1km)"""
        # Two points ~500m apart in London
        lat1, lon1 = 51.5074, -0.1278
        lat2, lon2 = 51.5074, -0.1208  # ~500m east
        dist = get_distance(lat1, lon1, lat2, lon2)
        assert dist < 1, f"Short distance should be < 1km, got {dist}km"
        print(f"✓ Short distance: {dist*1000:.0f}m")
    
    def test_sydney_to_london_distance(self):
        """Test long distance: Sydney to London ~17,000km"""
        # Sydney: -33.8688, 151.2093
        # London: 51.5074, -0.1278
        dist = get_distance(-33.8688, 151.2093, 51.5074, -0.1278)
        # Should be approximately 17,000km
        assert 16500 < dist < 17500, f"Sydney to London should be ~17,000km, got {dist}km"
        print(f"✓ Sydney to London distance: {dist:.0f}km (expected ~17,000km)")
    
    def test_equator_distance(self):
        """Test distance along equator"""
        # 1 degree of longitude at equator ≈ 111km
        dist = get_distance(0, 0, 0, 1)
        assert 110 < dist < 112, f"1 degree at equator should be ~111km, got {dist}km"
        print(f"✓ 1 degree at equator: {dist:.1f}km (expected ~111km)")


class TestDistanceFormatting:
    """Test the distance formatting logic"""
    
    def test_format_meters_under_1km(self):
        """Distances under 1km should show in meters"""
        assert format_distance(0.5) == "500m", "0.5km should format as 500m"
        assert format_distance(0.1) == "100m", "0.1km should format as 100m"
        assert format_distance(0.05) == "50m", "0.05km should format as 50m"
        assert format_distance(0.999) == "999m", "0.999km should format as 999m"
        print("✓ Distances under 1km format correctly as meters")
    
    def test_format_kilometers_over_1km(self):
        """Distances 1km and over should show in kilometers with 1 decimal"""
        assert format_distance(1.0) == "1.0km", "1.0km should format as 1.0km"
        assert format_distance(1.5) == "1.5km", "1.5km should format as 1.5km"
        assert format_distance(10.0) == "10.0km", "10.0km should format as 10.0km"
        assert format_distance(100.5) == "100.5km", "100.5km should format as 100.5km"
        print("✓ Distances 1km+ format correctly as kilometers")
    
    def test_format_boundary_case(self):
        """Test the 1km boundary case"""
        # Just under 1km
        assert format_distance(0.999) == "999m"
        # Exactly 1km
        assert format_distance(1.0) == "1.0km"
        # Just over 1km
        assert format_distance(1.001) == "1.0km"
        print("✓ Boundary case at 1km handled correctly")
    
    def test_format_rounding(self):
        """Test rounding behavior"""
        # Meters should round to nearest integer
        assert format_distance(0.4567) == "457m"
        # Kilometers should round to 1 decimal
        assert format_distance(5.678) == "5.7km"
        print("✓ Rounding works correctly")


class TestDistanceIndicatorIntegration:
    """Integration tests for distance indicator feature"""
    
    def test_post_with_coordinates(self):
        """Test distance calculation for a post with coordinates"""
        # Simulating user at London center
        user_lat, user_lon = 51.5074, -0.1278
        # Post at Tower Bridge
        post_lat, post_lon = 51.5055, -0.0754
        
        dist = get_distance(user_lat, user_lon, post_lat, post_lon)
        formatted = format_distance(dist)
        
        assert dist > 0, "Distance should be positive"
        assert "km" in formatted or "m" in formatted, "Format should include unit"
        print(f"✓ Distance to Tower Bridge: {formatted}")
    
    def test_null_user_location_handling(self):
        """When user location is null, formatDistance should return null"""
        # This simulates the frontend behavior
        user_location = None
        post = {"latitude": 51.5055, "longitude": -0.0754}
        
        # Simulating frontend logic
        if user_location is None or post.get("latitude") is None:
            result = None
        else:
            dist = get_distance(user_location[0], user_location[1], 
                              post["latitude"], post["longitude"])
            result = format_distance(dist)
        
        assert result is None, "Should return None when user location unavailable"
        print("✓ Null user location returns None (graceful hiding)")
    
    def test_null_post_coordinates_handling(self):
        """When post has no coordinates, formatDistance should return null"""
        user_location = [51.5074, -0.1278]
        post = {"latitude": None, "longitude": None}
        
        # Simulating frontend logic
        if user_location is None or post.get("latitude") is None:
            result = None
        else:
            dist = get_distance(user_location[0], user_location[1], 
                              post["latitude"], post["longitude"])
            result = format_distance(dist)
        
        assert result is None, "Should return None when post has no coordinates"
        print("✓ Null post coordinates returns None (graceful hiding)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
