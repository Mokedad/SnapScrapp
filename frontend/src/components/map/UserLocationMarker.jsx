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
  if (!position) return null;
  
  return (
    <Marker 
      position={[position.lat, position.lng]} 
      icon={pulsingIcon}
      zIndexOffset={1000}
    />
  );
}

export default UserLocationMarker;
