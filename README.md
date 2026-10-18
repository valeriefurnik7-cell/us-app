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
3. Authentication → Sign In / Providers → Email → turn off "Confirm email".
   The app uses email + password, so no email delivery (SMTP) is needed.
4. Authentication → URL Configuration → Site URL: your Vercel URL.
5. Copy `.env.local.example` to `.env.local` and fill in the URL and publishable key (Project Settings → API).
   Add the same two variables in Vercel → Project → Settings → Environment Variables.
