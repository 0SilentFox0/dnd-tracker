#!/usr/bin/env node
// Creates sibling campaigns for the demo user so the content-copy dialog has targets (landingshots only).
// Usage: node scripts/landing/seed-showcase-campaigns.mjs [--port=3000]   (db landingshots; starts its own server)
import { spawn } from 'node:child_process';
import path from 'node:path';

import { chromium } from 'playwright';

const ROOT = path.resolve(import.meta.dirname, '../..');
const PORT = process.argv.find((a) => a.startsWith('--port='))?.split('=')[1] ?? '3000';
const BASE = `http://localhost:${PORT}`;
const CAMPAIGN = 'example-demo-5e';
const db = 'postgresql://postgres:postgres@localhost:54322/landingshots';

const alive = () => fetch(BASE, { redirect: 'manual' }).then((r) => r.status < 500).catch(() => false);
if (await alive()) throw new Error(`${BASE} is already serving`);
const server = spawn('pnpm', ['exec', 'next', 'start', '-p', PORT], {
    cwd: ROOT,
    stdio: 'ignore',
    env: { ...process.env, DATABASE_URL: db, DIRECT_URL: db, RATE_LIMIT_ALLOW_MEMORY: '1' },
});
for (let i = 0; i < 60 && !(await alive()); i++) await new Promise((r) => setTimeout(r, 1000));
const browser = await chromium.launch({ channel: 'chrome' });
try {
    const ctx = await browser.newContext({ storageState: path.join(ROOT, '.landing-auth/state.json') });
    await ctx.addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: BASE }]);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/campaigns/${CAMPAIGN}/world`, { waitUntil: 'networkidle' });
    for (const name of ['Ashen Vale Chronicle', 'Sunken Crown', 'Winter Court Intrigue']) {
        const r = await ctx.request.post(`${BASE}/api/campaigns`, { data: { name, system: { key: 'dnd5e' } }, headers: { Origin: BASE } });
        console.log(name, r.status(), (await r.text()).slice(0, 300));
    }
} finally {
    await browser.close();
    server.kill();
}
