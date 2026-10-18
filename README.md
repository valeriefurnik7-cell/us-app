# Us

A private PWA for two friends living in different cities: cats, wishlists, plans and places to visit together.

Stack: Next.js · Tailwind CSS · Konsta UI (iOS theme) · Supabase · Vercel.

```bash
npm install
npm run dev
```

## Supabase setup

1. Create a project at supabase.com.
2. SQL Editor → run `supabase/migrations/0001_init.sql`.
3. Authentication → Emails → "Magic Link" template: put the code in the body, e.g. `Your code: {{ .Token }}`.
   The app signs in with a 6-digit code, because a link from email opens in Safari, not in the Home Screen app.
4. Authentication → URL Configuration → Site URL: your Vercel URL.
5. Copy `.env.local.example` to `.env.local` and fill in the URL and anon key (Project Settings → API).
   Add the same two variables in Vercel → Project → Settings → Environment Variables.
