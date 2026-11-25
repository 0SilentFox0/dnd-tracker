// Gold tokens are banned outside components/scenario/book and components/fx (own palettes); enforced by lib/__tests__/hud-gold.test.ts
import fs from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(__dirname, '../..');

export const SCAN_DIRS = ['app', 'components', 'systems', 'lib'] as const;

const SKIP_DIRS = new Set(['node_modules', '.next']);

const SKIP_FILES = new Set(['lib/__tests__/hud-gold.test.ts']);

const SKIP_PREFIXES = ['components/scenario/book/', 'components/fx/'];

const SOURCE_FILE = /\.(tsx?|css)$/;

const GOLD = /hud-gold|var\(--gold\)|hud-glow/g;

export const countHudGold = (text: string): number =>
    text.match(GOLD)?.length ?? 0;

const walk = (rel: string): string[] =>
    fs
        .readdirSync(path.join(ROOT, rel), { withFileTypes: true })
        .flatMap((entry) => {
            const next = path.posix.join(rel, entry.name);

            if (entry.isDirectory())
                return SKIP_DIRS.has(entry.name) ? [] : walk(next);

            return SOURCE_FILE.test(entry.name) ? [next] : [];
        });

export const listGoldScanFiles = (): string[] =>
    SCAN_DIRS.flatMap((dir) => walk(dir))
        .filter(
            (f) =>
                !SKIP_FILES.has(f) &&
                !SKIP_PREFIXES.some((p) => f.startsWith(p))
        )
        .sort();

export const scanHudGold = (): Record<string, number> => {
    const found: Record<string, number> = {};

    for (const file of listGoldScanFiles()) {
        const n = countHudGold(fs.readFileSync(path.join(ROOT, file), 'utf8'));

        if (n > 0) found[file] = n;
    }

    return found;
};
