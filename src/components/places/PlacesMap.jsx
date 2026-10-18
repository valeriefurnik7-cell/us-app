'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import { useTheme } from '../ThemeProvider';
import { useSession } from '../SessionProvider';

// CARTO basemaps: free with attribution, with a dark variant that matches the app.
const TILES = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};
const ATTRIBUTION = '&copy; OpenStreetMap &copy; CARTO';

/** Pins colored by who added the place; tap a pin to open it. */
export default function PlacesMap({ places, onOpen }) {
  const { resolved } = useTheme();
  const { me } = useSession();
  const container = useRef(null);
  const map = useRef(null);
  const layers = useRef({});

  useEffect(() => {
    let cancelled = false;
    import('leaflet').then((L) => {
      if (cancelled || !container.current) return;
      if (!map.current) {
        map.current = L.map(container.current, { zoomControl: false, attributionControl: true });
        layers.current.L = L;
      }
      if (layers.current.tiles) layers.current.tiles.remove();
      layers.current.tiles = L.tileLayer(TILES[resolved], { attribution: ATTRIBUTION, subdomains: 'abcd', maxZoom: 19 }).addTo(map.current);

      if (layers.current.pins) layers.current.pins.remove();
      const pins = L.layerGroup().addTo(map.current);
      layers.current.pins = pins;
      const located = places.filter((p) => p.lat != null && p.lon != null);
      located.forEach((p) => {
        const color = p.visit ? 'var(--together)' : p.added_by === me.id ? 'var(--me)' : 'var(--her)';
        const icon = L.divIcon({
          className: '',
          iconSize: [28, 28],
          iconAnchor: [14, 28],
          html: `<span style="display:block;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35)"></span>`,
        });
        L.marker([p.lat, p.lon], { icon, title: p.title }).on('click', () => onOpen(p)).addTo(pins);
      });
      if (located.length) map.current.fitBounds(L.latLngBounds(located.map((p) => [p.lat, p.lon])), { padding: [40, 40], maxZoom: 15 });
      else map.current.setView([48.2, 16.37], 4);
    });
    return () => {
      cancelled = true;
    };
  }, [places, resolved, me.id, onOpen]);

  useEffect(
    () => () => {
      map.current?.remove();
      map.current = null;
    },
    []
  );

  return <div ref={container} className="mx-4 mt-3 h-[58vh] overflow-hidden rounded-card bg-surface-2" />;
}
