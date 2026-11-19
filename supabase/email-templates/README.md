Supabase Auth email templates (bilingual EN/UK, styled after the brand logo).

Apply: `SUPABASE_ACCESS_TOKEN=<token> node scripts/shared/push-email-templates.mjs` (project ref `mpvcaxsukbwzgrbvzmjj`), or paste each `*.html` into Dashboard → Authentication → Email Templates and the subjects from `subjects.json`.
Variables used: `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .NewEmail }}`, `{{ .Token }}`, `{{ .SiteURL }}` (the logo is served from `/brand/email-logo.png`, so `SiteURL` must be the public domain).
