"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons for webpack/next.js
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface StoreMarker {
  lat: number;
  lng: number;
  name: string;
  address: string;
}

export function StoreMap({
  markers,
  className,
}: {
  markers: StoreMarker[];
  className?: string;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || markers.length === 0) return;

    // Clean up previous map
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    const map = L.map(mapRef.current, {
      scrollWheelZoom: false,
    });
    mapInstance.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    const bounds = L.latLngBounds([]);

    markers.forEach((m) => {
      const marker = L.marker([m.lat, m.lng], { icon: defaultIcon }).addTo(map);
      marker.bindPopup(
        `<div style="font-family:monospace;font-size:12px"><strong>${m.name}</strong><br/>${m.address}</div>`
      );
      bounds.extend([m.lat, m.lng]);
    });

    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 14);
    } else {
      map.fitBounds(bounds, { padding: [30, 30] });
    }

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [markers]);

  if (markers.length === 0) return null;

  return (
    <div
      ref={mapRef}
      className={className || "h-48 w-full border border-border"}
    />
  );
}
