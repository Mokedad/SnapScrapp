import React from 'react';
import { useMap } from 'react-leaflet';

// Updates map center when prop changes
export function MapCenterUpdater({ center }) {
  const map = useMap();
  React.useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

// Sets map reference to parent component
export function MapRefSetter({ mapRef }) {
  const map = useMap();
  React.useEffect(() => {
    if (mapRef) {
      mapRef.current = map;
    }
  }, [map, mapRef]);
  return null;
}

// Map event handlers for bounds changes
export function MapBoundsHandler({ onBoundsChange }) {
  const map = useMap();
  
  React.useEffect(() => {
    const handleMoveEnd = () => {
      const bounds = map.getBounds();
      onBoundsChange({
        ne_lat: bounds.getNorthEast().lat,
        ne_lng: bounds.getNorthEast().lng,
        sw_lat: bounds.getSouthWest().lat,
        sw_lng: bounds.getSouthWest().lng
      });
    };

    map.on('moveend', handleMoveEnd);
    map.on('zoomend', handleMoveEnd);
    
    // Initial bounds
    handleMoveEnd();

    return () => {
      map.off('moveend', handleMoveEnd);
      map.off('zoomend', handleMoveEnd);
    };
  }, [map, onBoundsChange]);

  return null;
}

export default { MapCenterUpdater, MapRefSetter, MapBoundsHandler };
