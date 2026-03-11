"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Custom minimal marker using inline SVG data URI
function createMarkerIcon(dark: boolean) {
  const fill = dark ? "%23fff" : "%23000";
  const stroke = dark ? "%23333" : "%23fff";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36"><path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.27 21.73 0 14 0z" fill="${fill}" stroke="${stroke}" stroke-width="2"/><circle cx="14" cy="14" r="5" fill="${stroke}"/></svg>`;
  return L.icon({
    iconUrl: `data:image/svg+xml,${svg}`,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  });
}

// Tile layers
const TILES = {
  light: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
};

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

    // Detect dark mode
    const isDark = document.documentElement.classList.contains("dark");
    const tile = isDark ? TILES.dark : TILES.light;
    const icon = createMarkerIcon(isDark);

    const map = L.map(mapRef.current, {
      scrollWheelZoom: false,
      zoomControl: false,
      attributionControl: false,
    });
    mapInstance.current = map;

    // Add zoom control to bottom-right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Minimal attribution
    L.control
      .attribution({ position: "bottomleft", prefix: false })
      .addAttribution(tile.attribution)
      .addTo(map);

    L.tileLayer(tile.url, {
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);

    const bounds = L.latLngBounds([]);

    markers.forEach((m) => {
      const marker = L.marker([m.lat, m.lng], { icon }).addTo(map);
      marker.bindPopup(
        `<div class="store-popup"><strong>${m.name}</strong><span>${m.address}</span></div>`,
        {
          closeButton: false,
          className: "modern-popup",
          maxWidth: 240,
        }
      );
      bounds.extend([m.lat, m.lng]);
    });

    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 14);
    } else {
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [markers]);

  if (markers.length === 0) return null;

  return (
    <>
      <style jsx global>{`
        .modern-popup .leaflet-popup-content-wrapper {
          background: var(--background, #fff);
          color: var(--foreground, #000);
          border: 1px solid var(--border, #e5e7eb);
          border-radius: 0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          padding: 0;
        }
        .modern-popup .leaflet-popup-content {
          margin: 0;
          line-height: 1.4;
        }
        .modern-popup .leaflet-popup-tip {
          background: var(--background, #fff);
          border: 1px solid var(--border, #e5e7eb);
          border-top: 0;
          border-left: 0;
          box-shadow: none;
        }
        .store-popup {
          padding: 10px 14px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }
        .store-popup strong {
          display: block;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: -0.01em;
        }
        .store-popup span {
          display: block;
          margin-top: 3px;
          font-size: 11px;
          opacity: 0.6;
        }
        .leaflet-control-zoom a {
          width: 28px !important;
          height: 28px !important;
          line-height: 28px !important;
          font-size: 14px !important;
          border-radius: 0 !important;
          background: var(--background, #fff) !important;
          color: var(--foreground, #000) !important;
          border-color: var(--border, #e5e7eb) !important;
        }
        .leaflet-control-zoom a:hover {
          background: var(--muted, #f5f5f5) !important;
        }
        .leaflet-control-attribution {
          background: transparent !important;
          font-size: 9px !important;
          opacity: 0.5;
        }
        .leaflet-control-attribution a {
          color: var(--foreground, #000) !important;
        }
      `}</style>
      <div
        ref={mapRef}
        className={className || "h-48 w-full border border-border"}
      />
    </>
  );
}
