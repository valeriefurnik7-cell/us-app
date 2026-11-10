'use client';

import { useEffect, useState } from 'react';
import { Paw } from 'framework7-icons/react';

const ANIMALS = ['🐱', '🐶', '🐰', '🐹', '🦊', '🐼', '🐨', '🐧'];
const LINES = ['Herding the cats…', 'Fetching the dogs…', 'Counting whiskers…', 'Shaking paws…', 'Looking for treats…'];
const HOP_MS = 700; // one jump — keep in step with pet-hop in globals.css

/** The app's loading screen: a different pet on every hop, paw prints walking underneath. */
export default function PetLoader({ className = '' }) {
  const [hop, setHop] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setHop((h) => h + 1), HOP_MS);
    return () => clearInterval(t);
  }, []);

  return (
    <div className={`flex flex-col items-center ${className}`} role="status" aria-label="Loading">
      <div className="relative flex h-24 w-24 items-end justify-center">
        <span className="text-[56px] leading-none [animation:pet-hop_700ms_cubic-bezier(.3,.7,.4,1)_infinite]">
          {ANIMALS[hop % ANIMALS.length]}
        </span>
        <span className="absolute -bottom-1 h-2 w-12 rounded-[50%] bg-black/15 [animation:pet-shadow_700ms_cubic-bezier(.3,.7,.4,1)_infinite] dark:bg-white/10" />
      </div>
      <div className="mt-5 flex gap-3 text-accent">
        {[0, 1, 2, 3].map((i) => (
          <Paw
            key={i}
            className={`text-[16px] opacity-0 [animation:paw-step_2800ms_ease-in-out_infinite] ${i % 2 ? 'translate-y-1.5 rotate-12' : '-rotate-12'}`}
            style={{ animationDelay: `${i * 350}ms` }}
          />
        ))}
      </div>
      <p className="mt-4 text-subhead font-semibold text-text-secondary">{LINES[Math.floor(hop / 4) % LINES.length]}</p>
    </div>
  );
}
