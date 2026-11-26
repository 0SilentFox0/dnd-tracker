#!/usr/bin/env node
// Saves / restores one battle's rows in a landing clone DB so battle shots stay reproducible.
// Usage: node scripts/landing/battle-state.mjs --save|--restore --db=landing_homm --battle=<id> [--dir=<dir>]
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const arg = (n) =>
    process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];
const db = arg('db');
const battle = arg('battle');
const dir = arg('dir') ?? path.resolve(import.meta.dirname, '../../.landing-auth', `battle-${battle}`);
const CONTAINER = 'dnd-tracker-db-1';
const TABLES = [
    ['battle_scenes', 'id'],
    ['battle_participants', '"battleId"'],
    ['battle_events', '"battleId"'],
    ['battle_map_state', '"battleId"'],
    ['battle_snapshots', '"battleId"'],
];

if (!db?.startsWith('landing') || !battle) throw new Error('--db=landing* and --battle are required');

const psql = (args, input) => {
    const r = spawnSync('docker', ['exec', '-i', CONTAINER, 'psql', '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1', ...args], { input, encoding: 'utf8', maxBuffer: 1 << 28 });
    if (r.status !== 0) throw new Error(r.stderr);
    return r.stdout;
};

if (process.argv.includes('--save')) {
    mkdirSync(dir, { recursive: true });
    for (const [t, key] of TABLES)
        writeFileSync(path.join(dir, `${t}.copy`), psql(['-c', `COPY (select * from ${t} where ${key}='${battle}') TO STDOUT`]));
    console.log(`saved ${battle} to ${dir}`);
} else if (process.argv.includes('--restore')) {
    const sql = [
        'BEGIN;',
        `DELETE FROM battle_scenes WHERE id='${battle}';`,
        ...TABLES.flatMap(([t]) => [`COPY ${t} FROM STDIN;`, readFileSync(path.join(dir, `${t}.copy`), 'utf8') + '\\.']),
        'COMMIT;',
    ].join('\n');
    psql([], sql + '\n');
    console.log(`restored ${battle} from ${dir}`);
} else throw new Error('--save or --restore');
