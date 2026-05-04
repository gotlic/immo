"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix icône Leaflet (bug connu avec webpack/Next.js)
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

type Props = {
  address: string;
  label?: string;
};

export default function MapView({ address, label }: Props) {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!address) return;
    fetch(`/api/geocode?q=${encodeURIComponent(address)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.lat) setCoords({ lat: data.lat, lon: data.lon });
        else setNotFound(true);
      })
      .catch(() => setNotFound(true));
  }, [address]);

  if (notFound) return null;

  if (!coords) {
    return (
      <div className="h-56 bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">
        <span className="text-gray-400 text-sm">Chargement de la carte…</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm h-56">
      <MapContainer
        center={[coords.lat, coords.lon]}
        zoom={16}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <Marker position={[coords.lat, coords.lon]} icon={markerIcon}>
          {label && <Popup>{label}</Popup>}
        </Marker>
      </MapContainer>
    </div>
  );
}
