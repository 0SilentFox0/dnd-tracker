#!/usr/bin/env node
// Re-shoots public/landing/screen-*.webp from the local English demo campaign.
// Usage: pnpm landing:screens [--login] [--only=battle,hero] [--base=http://localhost:3000]
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { chromium } from 'playwright';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '../..');
const OUT = path.join(ROOT, 'public/landing');
const STATE = path.join(ROOT, '.landing-auth/state.json');
const LOCAL_DB =
    process.env.LANDING_DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:54322/landingshots';
const arg = (name) =>
    process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const BASE = arg('base') ?? 'http://localhost:3000';
const ONLY = arg('only')?.split(',');
const CAMPAIGN = 'example-demo-5e';
const c = (p) => `${BASE}/campaigns/${CAMPAIGN}${p}`;

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

const SHOTS = JSON.parse(
    await readFile(path.join(import.meta.dirname, 'shots.json'), 'utf8')
);

if (new URL(BASE).hostname !== 'localhost')
    throw new Error('Screens are captured on localhost only.');

async function alive() {
    try {
        return (await fetch(BASE, { redirect: 'manual' })).status < 500;
    } catch {
        return false;
    }
}

async function startServer() {
    if (await alive()) return null;
    const server = spawn(
        'pnpm',
        ['exec', 'next', 'start', '-p', new URL(BASE).port || '3000'],
        {
            cwd: ROOT,
            stdio: 'ignore',
            env: {
                ...process.env,
                DATABASE_URL: LOCAL_DB,
                DIRECT_URL: LOCAL_DB,
                RATE_LIMIT_ALLOW_MEMORY: '1',
            },
        }
    );
    for (let i = 0; i < 60 && !(await alive()); i++)
        await new Promise((r) => setTimeout(r, 1000));
    if (!(await alive())) throw new Error('next start did not come up');
    return server;
}

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// Google refuses sign-in in an automation-driven browser, so a plain Chrome is started and only attached to afterwards.
async function login() {
    const port = 9333;
    const chrome = spawn(
        CHROME,
        [
            `--remote-debugging-port=${port}`,
            `--user-data-dir=${path.join(ROOT, '.landing-auth/profile')}`,
            '--no-first-run',
            `${BASE}/sign-in`,
        ],
        { stdio: 'ignore' }
    );
    console.log('Log in in the opened Chrome window, then press Enter here…');
    await new Promise((r) => process.stdin.once('data', r));
    const browser = await chromium.connectOverCDP(`http://localhost:${port}`);
    await mkdir(path.dirname(STATE), { recursive: true });
    await browser.contexts()[0].storageState({ path: STATE });
    await browser.close();
    chrome.kill();
    process.stdin.pause();
}

async function prepareBattle(browser) {
    const ctx = await browser.newContext({ storageState: STATE });
    const api = `${BASE}/api/campaigns/${CAMPAIGN}/battles/demo-battle-grove`;
    const headers = { Origin: BASE };
    const get = async () => (await ctx.request.get(api)).json();
    const post = (op, data) =>
        ctx.request.post(`${api}/${op}`, { data, headers });

    let scene = await get();
    if (scene.status === 'active') {
        await post('reset', {});
        scene = await get();
    }
    if (scene.status !== 'active') {
        const page = await ctx.newPage();
        await page.goto(c('/battles/demo-battle-grove'), {
            waitUntil: 'networkidle',
        });
        await page.getByRole('button', { name: /to battle/i }).click();
        await page.waitForTimeout(3000);
        await page.close();
        await post('initiative-roll', {});
        for (let i = 0; i < 14; i++) {
            scene = await get();
            const order = scene.initiativeOrder;
            const me = order[scene.currentTurnIndex]?.basicInfo;
            const foe = order.find(
                (p) => p.basicInfo.side !== me?.side && (p.hp?.current ?? 1) > 0
            );
            if (me && foe)
                await post('attack', {
                    attackerId: me.id,
                    targetId: foe.basicInfo.id,
                    serverRoll: true,
                    expectedVersion: scene.version,
                });
            await post('next-turn', {
                expectedVersion: (await get()).version,
            });
        }
    }
    await ctx.close();
}

async function shoot(browser, shot) {
    const viewport = shot.mobile ? MOBILE : DESKTOP;
    const ctx = await browser.newContext({
        storageState: STATE,
        viewport,
        deviceScaleFactor: 2,
        locale: 'en-US',
        extraHTTPHeaders: { 'Accept-Language': 'en' },
    });
    await ctx.addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: BASE }]);
    const page = await ctx.newPage();
    await page.goto(c(shot.path), { waitUntil: 'networkidle' });
    if (shot.waitFor) await page.waitForSelector(shot.waitFor);
    for (const step of shot.steps ?? []) {
        if (step.click) await page.click(step.click);
        if (step.link)
            await page.getByRole('link', { name: step.link }).first().click();
        if (step.role)
            for (let i = 0; i < (step.times ?? 1); i++)
                await page
                    .getByRole('button', { name: step.role })
                    .first()
                    .click();
        if (step.goto)
            await page.goto(c(step.goto), { waitUntil: 'networkidle' });
        if (step.wait) await page.waitForTimeout(step.wait);
    }
    for (const hint of await page
        .getByRole('button', { name: 'Dismiss hint' })
        .all())
        await hint.click();
    await page.waitForTimeout(400);
    await page.evaluate(
        (texts) => {
            for (const el of document.querySelectorAll('div'))
                if (
                    texts.some((t) => el.textContent?.trim().startsWith(t)) &&
                    el.children.length <= 3 &&
                    el.getBoundingClientRect().height < 60
                )
                    el.style.display = 'none';
        },
        shot.hide ?? ['No connection']
    );
    await page.waitForTimeout(shot.settle ?? 1500);
    const png = await page.screenshot({ type: 'png' });
    const buf = await sharp(png)
        .resize({ width: shot.mobile ? 780 : 2160 })
        .webp({ quality: shot.quality ?? 82, effort: 6 })
        .toBuffer();
    await writeFile(path.join(OUT, `screen-${shot.name}.webp`), buf);
    console.log(`${shot.name}: ${(buf.length / 1024).toFixed(0)} KB`);
    await ctx.close();
}

const server = await startServer();
const browser = process.argv.includes('--login')
    ? null
    : await chromium.launch({ channel: 'chrome' });
try {
    if (!browser) await login();
    else {
        if (!existsSync(STATE))
            throw new Error(
                'No saved session: run pnpm landing:screens --login'
            );
        await prepareBattle(browser);
        for (const shot of SHOTS)
            if (!ONLY || ONLY.includes(shot.name)) await shoot(browser, shot);
    }
} finally {
    await browser?.close();
    server?.kill();
}
