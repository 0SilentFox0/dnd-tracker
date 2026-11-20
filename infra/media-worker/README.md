# Media worker

Caching proxy in front of Supabase Storage public objects (`/storage/v1/object/public/*`). Cuts Supabase egress: 2xx cached for a year (object paths are immutable), 404 for 60 s, 5xx never.

Deploy (token needs Workers Scripts: Edit + Account Settings: Read; pass via env, never commit):

    CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... pnpm dlx wrangler@4 deploy   # needs Node >= 22.12; on older Node use wrangler@3

The app uses it through `NEXT_PUBLIC_MEDIA_BASE_URL` (render-time URL rewrite, see `toMediaUrl`); unset the variable and redeploy to roll back (it is inlined at build).

Moving to `media.critnest.com`: put the zone on Cloudflare, add a Worker custom domain, then change `NEXT_PUBLIC_MEDIA_BASE_URL`.
