'use client';

import { useEffect, useState } from 'react';
import { Field, TextInput } from './FormRows';

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

/** City row with suggestions underneath. value: { city, lat, lon, timezone } */
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
      <Field label="City">
        <TextInput placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
      </Field>
      {!picked &&
        query.trim().length >= 2 &&
        results.map((r) => (
          <li key={r.key}>
            <button
              type="button"
              className="flex min-h-12 w-full items-center border-b border-text-secondary/20 ps-8 pe-4 text-start text-body text-primary"
              onClick={() => {
                setQuery(r.city);
                setResults([]);
                onChange({ city: r.city, lat: r.lat, lon: r.lon, timezone: r.timezone });
              }}
            >
              {r.label}
            </button>
          </li>
        ))}
    </>
  );
}
