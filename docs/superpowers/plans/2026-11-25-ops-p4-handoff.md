# P4 handoff (feat/ops-p4, worktree ../dnd-tracker-ops)

Done: email allowlist for /ops + profile link (614621226). T4.1 scaffolding in `scripts/loadtest/` (seed.ts, lib.js, battle.js, storm.js); smoke run of battle.js passes (1 battle, 6 players + DM, 15 mutations/60 s).

Setup (already done, local only): DB `prodcopy_ops` (template of prodcopy_w8 + migrate deploy); 7 Auth users `loadtest-N@loadtest.example` in prod Supabase Auth, creds in `.superpowers/loadtest/users.json`; HOMM5 campaign in prodcopy_ops re-owned by loadtest-0.
MUST clean at the end: `DATABASE_URL=postgresql://postgres:postgres@localhost:54322/prodcopy_ops pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/loadtest/seed.ts cleanup`, then drop DB prodcopy_ops.

Run: build with `NODE_OPTIONS=--max-old-space-size=8192 pnpm build` (default heap OOMs), start with `/private/tmp/claude-501/start-ops.sh pusher-off|pusher-on` (port 3200, RATE_LIMIT_ALLOW_MEMORY=1 needed or battle limits answer 503), then
`k6 run -e SUPABASE_URL=... -e SUPABASE_ANON_KEY=... -e BATTLES=1|20 -e LOOP_S=300 scripts/loadtest/battle.js`; storm: `-e VUS=100 scripts/loadtest/storm.js`.
Pusher on = real prod Pusher keys (quota); plan: only scenario 1 with Pusher on, others off.

Next: full runs (1 battle, 20 battles, storm, pusher outage), read battle.conflict share from /ops metrics or k6 `battle_conflicts`; T4.2 EXPLAIN on prodcopy_ops (use pg_stat_user_tables seq_scan vs idx_scan + enable_seqscan=off, data is small); T4.3 decision; T4.4 recompress script; T4.5 calibrate limits/ALERT_RULES; T4.6 backup drill; docs/product/capacity-baseline.md; end gates; Opus review; /simplify; docs.
