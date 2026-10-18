'use client';

import { Page } from 'konsta/react';

/** Scrollable screen. Bottom padding keeps content clear of the floating tabbar and home indicator. */
export default function Screen({ children }) {
  return (
    <Page className="pb-[calc(var(--k-safe-area-bottom)+104px)]">{children}</Page>
  );
}

export function EmptyState({ title, text }) {
  return (
    <div className="mx-4 mt-3 rounded-card bg-surface px-4 py-10 text-center">
      <p className="text-body font-semibold">{title}</p>
      {text && <p className="mt-1 text-subhead text-text-secondary">{text}</p>}
    </div>
  );
}
