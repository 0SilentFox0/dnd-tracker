#!/usr/bin/env node
// Enables fog on the demo world map, starts a session and walks the party along a path (fog reveals + trail) through the real API.
// Usage: node scripts/landing/seed-showcase-world.mjs [--port=3000]   (db landingshots; starts its own server)
import { spawn } from 'node:child_process';
import path from 'node:path';

import { chromium } from 'playwright';

const ROOT = path.resolve(import.meta.dirname, '../..');
const PORT = process.argv.find((a) => a.startsWith('--port='))?.split('=')[1] ?? '3000';
const BASE = `http://localhost:${PORT}`;
const CAMPAIGN = 'example-demo-5e';
const MAP = 'demo-world-root';
const HEROES = ['demo-character-fighter', 'demo-character-cleric', 'demo-character-scout', 'demo-character-wizard', 'demo-character-rogue'];
const PATH_POINTS = [[0.2, 0.64], [0.27, 0.6], [0.34, 0.56], [0.41, 0.52], [0.47, 0.48], [0.52, 0.45], [0.6, 0.4], [0.66, 0.32], [0.6, 0.26], [0.52, 0.3], [0.46, 0.36], [0.5, 0.42]];
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
    const base = `${BASE}/api/campaigns/${CAMPAIGN}/world`;
    const headers = { Origin: BASE };
    const call = async (method, url, data) => {
        const r = await ctx.request.fetch(base + url, { method, data, headers });
        console.log(method, url, r.status());
        if (!r.ok()) console.log((await r.text()).slice(0, 200));
    };
    await call('PATCH', `/maps/${MAP}`, { fogEnabled: true, revealRadius: 0.12 });
    await call('POST', '/sessions', { name: 'Hunt in Briarwood', color: '#c0892b' });
    for (const [x, y] of PATH_POINTS)
        await call('POST', '/travel', { mapId: MAP, characterIds: HEROES, to: { x, y }, rest: 'none' });
} finally {
    await browser.close();
    server.kill();
}
