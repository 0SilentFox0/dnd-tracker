#!/usr/bin/env node
// Re-shoots public/landing/<locale>/screen-*.webp from a local database profile (scripts/landing/shots.json).
// Usage: pnpm landing:screens --profile=en-srd [--only=battle,hero] [--base=http://localhost:3140] [--port=3140]
//        pnpm landing:screens --login
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { chromium } from 'playwright';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '../..');
const STATE = path.join(ROOT, '.landing-auth/state.json');
const arg = (name) =>
    process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const LOGIN = process.argv.includes('--login');
const PORT = arg('port') ?? '3140';
const BASE = arg('base') ?? `http://localhost:${PORT}`;
const ONLY = arg('only')?.split(',');
const LOGIN_DB = 'landingshots';

const DESKTOP = { viewport: { width: 1920, height: 1200 }, dpr: 2, width: 3840 };
const MOBILE = { viewport: { width: 390, height: 844 }, dpr: 3, width: 1170 };
const KB_LIMIT = 450;
const QUALITIES = [82, 76, 70, 62, 54, 46];
const OFFLINE_TEXTS = ['No connection', "Немає зв'язку"];

const { profiles } = JSON.parse(
    await readFile(path.join(import.meta.dirname, 'shots.json'), 'utf8')
);
const profileName = arg('profile');
const profile = LOGIN ? null : profiles[profileName];

if (!LOGIN && !profile)
    throw new Error(
        `--profile=<name> is required, one of: ${Object.keys(profiles).join(', ')}`
    );

if (new URL(BASE).hostname !== 'localhost')
    throw new Error('Screens are captured on localhost only.');

const uiLocale = profile ? (profile.uiLocale ?? profile.locale) : 'en';
const OUT = profile ? path.join(ROOT, 'public/landing', profile.locale) : null;
const dbUrl = (db) => `postgresql://postgres:postgres@localhost:54322/${db}`;
const tx = (v) => (v && typeof v === 'object' ? v[uiLocale] : v);
const fill = (str) =>
    str.replace(/\{(\w+)\}/g, (_, k) => profile[k] ?? 'TODO');
const c = (p) => `${BASE}/campaigns/${profile.campaignId}${p}`;
const url = (shot) =>
    shot.absolute ? `${BASE}${fill(shot.path)}` : c(fill(shot.path));

async function alive() {
    try {
        return (await fetch(BASE, { redirect: 'manual' })).status < 500;
    } catch {
        return false;
    }
}

async function startServer() {
    if (await alive())
        throw new Error(
            `${BASE} is already serving: stop it, the server must run on the profile database`
        );
    const db = dbUrl(profile?.db ?? LOGIN_DB);
    const server = spawn(
        'pnpm',
        ['exec', 'next', 'start', '-p', new URL(BASE).port],
        {
            cwd: ROOT,
            stdio: 'ignore',
            env: {
                ...process.env,
                DATABASE_URL: db,
                DIRECT_URL: db,
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
    console.log('Log in in the opened Chrome window; the session is saved automatically…');
    let browser;
    for (let i = 0; i < 30 && !browser; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        browser = await chromium
            .connectOverCDP(`http://localhost:${port}`)
            .catch(() => null);
    }
    if (!browser) throw new Error('Chrome debugging port did not come up');
    const context = browser.contexts()[0];
    const hasSession = async () =>
        (await context.cookies(BASE)).some((c) => /auth-token(\.\d+)?$/.test(c.name));
    for (let i = 0; i < 300 && !(await hasSession()); i++)
        await new Promise((r) => setTimeout(r, 2000));
    if (!(await hasSession())) throw new Error('Login timed out');
    await new Promise((r) => setTimeout(r, 2000));
    await mkdir(path.dirname(STATE), { recursive: true });
    await context.storageState({ path: STATE });
    await browser.close();
    chrome.kill();
}

async function prepareBattle(browser) {
    const ctx = await browser.newContext({ storageState: STATE });
    const api = `${BASE}/api/campaigns/${profile.campaignId}/battles/${profile.battleId}`;
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
        await page.goto(c(`/battles/${profile.battleId}`), {
            waitUntil: 'networkidle',
        });
        await page.getByRole('button', { name: tx({ en: 'TO BATTLE!', uk: 'ДО БОЮ!' }) }).click();
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

const resolved = (v) => !JSON.stringify(v).includes('TODO');

function restoreBattle() {
    const r = spawnSync('node', [path.join(import.meta.dirname, 'battle-state.mjs'), '--restore', `--db=${profile.db}`, `--battle=${profile.battleId}`], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(r.stderr);
}

async function runSteps(page, steps = []) {
    for (const step of steps) {
        if (step.click) await page.click(fill(tx(step.click)));
        if (step.link)
            await page
                .getByRole('link', { name: fill(tx(step.link)) })
                .first()
                .click();
        if (step.role)
            for (let i = 0; i < (step.times ?? 1); i++)
                await page
                    .getByRole('button', { name: tx(step.role) })
                    .first()
                    .click(step.optional ? { timeout: 3000 } : {})
                    .catch((e) => {
                        if (!step.optional) throw e;
                    });
        if (step.press) await page.keyboard.press(step.press);
        if (step.at) await page.mouse.click(...step.at);
        if (step.wheel) {
            await page.mouse.move(960, 600);
            await page.mouse.wheel(...step.wheel);
        }
        if (step.drag) {
            const [x1, y1, x2, y2] = step.drag;
            await page.mouse.move(x1, y1);
            await page.mouse.down();
            await page.mouse.move(x2, y2, { steps: 12 });
            await page.mouse.up();
        }
        if (step.goto)
            await page.goto(c(step.goto), { waitUntil: 'networkidle' });
        if (step.text)
            await page.getByText(tx(step.text), { exact: step.exact ?? true }).first().click();
        if (step.eval) await page.evaluate(step.eval);
        if (step.scroll !== undefined)
            await page.evaluate((y) => {
                const el = [...document.querySelectorAll('main, [data-scroll]')].find((e) => e.scrollHeight > e.clientHeight);
                (el ?? document.scrollingElement).scrollTo({ top: y });
            }, step.scroll);
        if (step.wait) await page.waitForTimeout(step.wait);
    }
}

async function shoot(browser, shot) {
    const kind = shot.mobile ? MOBILE : DESKTOP;
    const zoom = shot.zoom ?? 1;
    const ctx = await browser.newContext({
        storageState: STATE,
        viewport: {
            width: Math.round(kind.viewport.width / zoom),
            height: Math.round(kind.viewport.height / zoom),
        },
        deviceScaleFactor: kind.dpr * zoom,
        locale: uiLocale === 'uk' ? 'uk-UA' : 'en-US',
        extraHTTPHeaders: { 'Accept-Language': uiLocale },
    });
    await ctx.addCookies([{ name: 'NEXT_LOCALE', value: uiLocale, url: BASE }]);
    const page = await ctx.newPage();
    await page.goto(url(shot), { waitUntil: 'networkidle' });
    if (shot.waitFor) await page.waitForSelector(shot.waitFor);
    await runSteps(page, shot.steps);
    for (const frame of shot.frames ?? [shot]) {
        if (frame !== shot) await runSteps(page, frame.steps);
        await capture(page, frame, shot, kind);
    }
    await ctx.close();
}

async function capture(page, frame, shot, kind) {
    for (const hint of await page
        .getByRole('button', {
            name: uiLocale === 'uk' ? 'Закрити підказку' : 'Dismiss hint',
        })
        .all())
        await hint.click();
    await page.addStyleTag({
        content: 'nextjs-portal, [data-nextjs-toast] { display: none !important; }',
    });
    if (!frame.fast) await page.waitForTimeout(400);
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
        shot.hide ?? OFFLINE_TEXTS
    );
    await page.waitForTimeout(frame.settle ?? shot.settle ?? 1500);
    const png = await page.screenshot({ type: 'png' });

    let buf;
    const widths = shot.mobile ? [kind.width] : [kind.width, 3456, 3072];
    for (const width of widths) {
        for (const quality of shot.quality ? [shot.quality] : QUALITIES) {
            buf = await sharp(png)
                .resize({ width })
                .webp({ quality, effort: 6 })
                .toBuffer();
            if (shot.mobile || buf.length / 1024 <= KB_LIMIT) break;
        }
        if (shot.mobile || buf.length / 1024 <= KB_LIMIT) break;
        console.warn(`${frame.name}: ${(buf.length / 1024).toFixed(0)} KB > ${KB_LIMIT} KB at width ${width}, shrinking`);
    }
    await writeFile(path.join(OUT, `screen-${frame.name}.webp`), buf);
    console.log(`${frame.name}: ${(buf.length / 1024).toFixed(0)} KB`);
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
        if (!resolved(profile.campaignId))
            throw new Error(`Profile ${profileName} has no campaignId yet`);
        await mkdir(OUT, { recursive: true });
        if (profile.replayBattle && profile.battleId && resolved(profile.battleId))
            await prepareBattle(browser);
        for (const shot of profile.shots) {
            if (ONLY && !ONLY.includes(shot.name)) continue;
            const pending = [
                ...JSON.stringify([shot.path, shot.steps ?? '', shot.frames ?? '']).matchAll(/\{(\w+)\}/g),
            ]
                .map((m) => m[1])
                .filter((k) => !profile[k] || !resolved(profile[k]));
            if (pending.length) {
                console.warn(`${shot.name}: skipped, profile has no ${[...new Set(pending)].join(', ')}`);
                continue;
            }
            if (shot.restore) restoreBattle();
            await shoot(browser, shot);
        }
    }
} finally {
    await browser?.close();
    server?.kill();
}
