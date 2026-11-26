// Untracked helper: plays demo-battle-grove through the real API until round>=3 and the wizard's turn (port 3100, db landingshots).
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const { chromium } = createRequire(path.join(ROOT, 'package.json'))('playwright');
const BASE = 'http://localhost:3100';
const CAMPAIGN = 'example-demo-5e';
const BATTLE = 'demo-battle-grove';
const WIZARD = 'demo-character-wizard';
const db = 'postgresql://postgres:postgres@localhost:54322/landingshots';

const server = spawn('pnpm', ['exec', 'next', 'start', '-p', '3100'], {
    cwd: ROOT,
    stdio: 'ignore',
    env: { ...process.env, DATABASE_URL: db, DIRECT_URL: db, RATE_LIMIT_ALLOW_MEMORY: '1' },
});
const alive = () => fetch(BASE, { redirect: 'manual' }).then((r) => r.status < 500).catch(() => false);
for (let i = 0; i < 60 && !(await alive()); i++) await new Promise((r) => setTimeout(r, 1000));

const browser = await chromium.launch({ channel: 'chrome' });
try {
    const ctx = await browser.newContext({ storageState: path.join(ROOT, '.landing-auth/state.json') });
    const api = `${BASE}/api/campaigns/${CAMPAIGN}/battles/${BATTLE}`;
    const headers = { Origin: BASE };
    const get = async () => (await ctx.request.get(api)).json();
    const post = async (op, data) => {
        const r = await ctx.request.post(`${api}/${op}`, { data, headers });
        if (!r.ok()) console.log(op, r.status(), (await r.text()).slice(0, 300));
        return r;
    };
    let scene = await get();
    console.log('status', scene.status);
    const resume = process.env.RESUME && scene.status === 'active';
    if (scene.status === 'active' && !resume) {
        await post('reset', {});
        scene = await get();
    }
    if (!resume) {
    const page = await ctx.newPage();
    await page.goto(`${BASE}/campaigns/${CAMPAIGN}/battles/${BATTLE}`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'TO BATTLE!' }).click();
    await page.waitForTimeout(3000);
    await page.close();
    await post('initiative-roll', {});
    }
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    scene = await get();
    console.log(JSON.stringify(scene.initiativeOrder[0]).slice(0, 900));
    const pos = (p) => p.battleData?.position;
    const dist = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
    for (let i = 0; i < 80; i++) {
        await sleep(900);
        scene = await get();
        const order = scene.initiativeOrder;
        const cur = order[scene.currentTurnIndex];
        const me = cur?.basicInfo;
        console.log(i, 'round', scene.currentRound, 'turn', me?.name);
        if (scene.currentRound >= 3 && me?.id.startsWith(WIZARD) && !process.env.NOSTOP) break;
        const foes = order.filter((p) => p.basicInfo.side !== me?.side && (p.hp?.current ?? 1) > 0);
        if (me && foes.length) {
            const here = pos(cur);
            const foe = foes.sort((x, y) => dist(here, pos(x)) - dist(here, pos(y)))[0];
            const range = /Lark|Maelis/.test(me.name) ? 4 : 1;
            let d = dist(here, pos(foe));
            if (d > range) {
                const step = Math.min(5, d - range);
                const to = {
                    x: here.x + Math.sign(pos(foe).x - here.x) * Math.min(step, Math.abs(pos(foe).x - here.x)),
                    y: here.y + Math.sign(pos(foe).y - here.y) * Math.min(step, Math.abs(pos(foe).y - here.y)),
                };
                await post('move', { participantId: me.id, to, expectedVersion: scene.version });
                await sleep(700);
            }
            scene = await get();
            await post('attack', { attackerId: me.id, targetId: foe.basicInfo.id, serverRoll: true, expectedVersion: scene.version });
        }
        await sleep(900);
        await post('next-turn', { expectedVersion: (await get()).version });
    }
    scene = await get();
    const pos2 = pos;
    console.log(JSON.stringify({ status: scene.status, round: scene.currentRound, idx: scene.currentTurnIndex, n: scene.initiativeOrder.length }));
    console.log(scene.initiativeOrder.map((p) => `${p.basicInfo.name}:${p.hp?.current}/${p.hp?.max}@${JSON.stringify(pos(p))}`).join('\n'));
    await ctx.close();
} finally {
    await browser.close();
    server.kill();
}
