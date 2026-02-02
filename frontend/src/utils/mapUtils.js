import L from 'leaflet';

// Icon cache for performance - prevents recreating icons for same images
const iconCache = new Map();

// Create custom marker icon from base64 image (memoized)
export const createPinIcon = (imageBase64) => {
  // Check cache first
  if (iconCache.has(imageBase64)) {
    return iconCache.get(imageBase64);
  }
  
  const html = `
    <div class="custom-pin">
      <img src="${imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`}" alt="item" loading="lazy" />
    </div>
  `;
  const icon = L.divIcon({
    html,
    className: '',
    iconSize: [52, 52],
    iconAnchor: [26, 52],
    popupAnchor: [0, -52]
  });
  
  // Cache the icon (limit cache size)
  if (iconCache.size > 100) {
    const firstKey = iconCache.keys().next().value;
    iconCache.delete(firstKey);
  }
  iconCache.set(imageBase64, icon);
  
  return icon;
};

// Default marker for location selection
export const locationIcon = L.divIcon({
  html: `<div style="width:40px;height:40px;background:#166534;border-radius:50%;border:4px solid white;box-shadow:0 4px 14px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
  </div>`,
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 40]
});

// Calculate distance between two points (Haversine formula)
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Format distance for display
export const formatDistance = (distanceKm) => {
  if (distanceKm === null || distanceKm === undefined) return null;
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
};

// Check if coordinates are within Sydney Metro area
export const isInSydneyMetro = (lat, lng) => {
  if (!lat || !lng) return false;
  const penrithLat = -33.7688;
  const penrithLng = 150.7742;
  const distance = calculateDistance(lat, lng, penrithLat, penrithLng);
  return distance <= 300; // 300km radius
};

// Get map bounds object
export const getMapBounds = (map) => {
  if (!map) return null;
  const bounds = map.getBounds();
  return {
    ne_lat: bounds.getNorthEast().lat,
    ne_lng: bounds.getNorthEast().lng,
    sw_lat: bounds.getSouthWest().lat,
    sw_lng: bounds.getSouthWest().lng
  };
};

// Format address from geocoding result
export const formatAddress = (data) => {
  if (!data || !data.address) return null;
  const addr = data.address;
  const parts = [];
  
  if (addr.house_number && addr.road) {
    parts.push(`${addr.house_number} ${addr.road}`);
  } else if (addr.road) {
    parts.push(addr.road);
  }
  
  if (addr.suburb) {
    parts.push(addr.suburb);
  } else if (addr.city) {
    parts.push(addr.city);
  }
  
  return parts.join(', ') || data.display_name?.split(',').slice(0, 2).join(',');
};
