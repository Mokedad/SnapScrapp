import React from 'react';
import { useMapEvents, Marker } from 'react-leaflet';
import { locationIcon } from '../../utils/mapUtils';

export function LocationPicker({ onLocationSelect, selectedLocation }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    }
  });
  
  return selectedLocation ? (
    <Marker position={selectedLocation} icon={locationIcon} />
  ) : null;
}

export default LocationPicker;
