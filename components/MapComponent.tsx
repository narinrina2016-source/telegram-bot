'use client';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// Fix for default Leaflet icon in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapFocus({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { animate: true, duration: 1.5 });
  }, [center, zoom, map]);
  return null;
}

export default function MapComponent({ 
  officeLocation, 
  userLocation, 
  radius 
}: { 
  officeLocation: [number, number], 
  userLocation: [number, number] | null, 
  radius: number 
}) {
  return (
    <MapContainer center={officeLocation} zoom={16} scrollWheelZoom={false} style={{ height: '300px', width: '100%', borderRadius: '1rem', zIndex: 10 }}>
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={officeLocation}>
        <Popup>
          <strong>ទីតាំងស្ថាប័ន (Office Location)</strong>
        </Popup>
      </Marker>
      <Circle center={officeLocation} radius={radius} pathOptions={{ color: '#4f46e5', fillColor: '#4f46e5', fillOpacity: 0.15, weight: 2 }} />
      
      {userLocation && (
        <Marker 
          position={userLocation} 
          icon={L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          })}
        >
          <Popup>
            <strong>ទីតាំងរបស់អ្នក (Your Location)</strong>
          </Popup>
        </Marker>
      )}
      
      <MapFocus center={userLocation || officeLocation} zoom={userLocation ? 18 : 16} />
    </MapContainer>
  );
}
