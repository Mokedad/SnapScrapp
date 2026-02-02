import React from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';

const pulsingIcon = L.divIcon({
  html: `<div class="pulsing-marker">
    <div class="pulse-ring"></div>
    <div class="pulse-core"></div>
  </div>`,
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

export function UserLocationMarker({ position }) {
  // Handle null/undefined
  if (!position) return null;
  
  // Handle both array [lat, lng] and object {lat, lng} formats
  let lat, lng;
  if (Array.isArray(position)) {
    [lat, lng] = position;
  } else if (position.lat !== undefined && position.lng !== undefined) {
    lat = position.lat;
    lng = position.lng;
  } else {
    return null;
  }
  
  // Validate coordinates
  if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
    return null;
  }
  
  return (
    <Marker 
      position={[lat, lng]} 
      icon={pulsingIcon}
      zIndexOffset={1000}
    />
  );
}

export default UserLocationMarker;
