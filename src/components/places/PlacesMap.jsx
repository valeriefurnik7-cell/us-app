'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import { useSession } from '../SessionProvider';

// OpenStreetMap tiles (free, attribution required). In the dark theme they're inverted with CSS (globals.css).
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; OpenStreetMap';

/** Pins colored by who added the place; tap a pin to open it. */
export default function PlacesMap({ places, onOpen }) {
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
      }
      if (!layers.current.tiles) layers.current.tiles = L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map.current);

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
  }, [places, me.id, onOpen]);

  useEffect(
    () => () => {
      map.current?.remove();
      map.current = null;
      layers.current = {};
    },
    []
  );

  return <div ref={container} className="mx-4 mt-3 h-[58vh] overflow-hidden rounded-card bg-surface-2" />;
}
