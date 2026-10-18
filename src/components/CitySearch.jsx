'use client';

import { useEffect, useState } from 'react';
import { List, ListInput, ListItem } from 'konsta/react';

// Open-Meteo geocoding: free, no key; returns coordinates and the IANA timezone.
async function searchCities(query, signal) {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en`,
    { signal }
  );
  const json = await res.json();
  return (json.results ?? []).map((r) => ({
    key: r.id,
    city: r.name,
    label: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
    lat: r.latitude,
    lon: r.longitude,
    timezone: r.timezone,
  }));
}

/** value: { city, lat, lon, timezone } */
export default function CitySearch({ value, onChange }) {
  const [query, setQuery] = useState(value.city ?? '');
  const [results, setResults] = useState([]);
  const picked = query === value.city;

  useEffect(() => {
    if (picked || query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchCities(query.trim(), controller.signal)
        .then(setResults)
        .catch(() => {});
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, picked]);

  return (
    <>
      <ListInput
        label="City"
        placeholder="Start typing a city"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        info={picked && value.timezone ? value.timezone : 'Used for local time and weather'}
      />
      {!picked && query.trim().length >= 2 && results.length > 0 && (
        <List nested>
          {results.map((r) => (
            <ListItem
              key={r.key}
              link
              title={r.label}
              onClick={() => {
                setQuery(r.city);
                setResults([]);
                onChange({ city: r.city, lat: r.lat, lon: r.lon, timezone: r.timezone });
              }}
            />
          ))}
        </List>
      )}
    </>
  );
}
