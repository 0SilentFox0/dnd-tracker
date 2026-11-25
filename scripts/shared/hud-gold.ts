// pnpm ratchet:hud-gold [--write]: ratchets/hud-gold.json = { file: count } of legacy gold tokens (only shrinks)
import fs from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(__dirname, '../..');

export const GOLD_FILE = 'ratchets/hud-gold.json';

export const SCAN_DIRS = ['app', 'components', 'systems', 'lib'] as const;

const SKIP_DIRS = new Set(['node_modules', '.next']);

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
        .filter((f) => !SKIP_PREFIXES.some((p) => f.startsWith(p)))
        .sort();

export const scanHudGold = (): Record<string, number> => {
    const found: Record<string, number> = {};

    for (const file of listGoldScanFiles()) {
        const n = countHudGold(fs.readFileSync(path.join(ROOT, file), 'utf8'));

        if (n > 0) found[file] = n;
    }

    return found;
};

export const readHudGoldExempt = (): Record<string, number> =>
    JSON.parse(fs.readFileSync(path.join(ROOT, GOLD_FILE), 'utf8'));

export const hudGoldProblems = (
    actual: Record<string, number>,
    exempt: Record<string, number>
): string[] => [
    ...Object.entries(actual)
        .filter(([file, n]) => n > (exempt[file] ?? 0))
        .map(([file, n]) => `new hud-gold: ${file} has ${n}`),
    ...Object.entries(exempt)
        .filter(([file, max]) => (actual[file] ?? 0) < max)
        .map(([file]) => `lower the entry: ${file}`),
];

if (require.main === module) {
    const found = scanHudGold();

    if (process.argv.includes('--write')) {
        const known = fs.existsSync(path.join(ROOT, GOLD_FILE))
            ? readHudGoldExempt()
            : found;

        const grew = Object.entries(found).filter(
            ([file, n]) => n > (known[file] ?? 0)
        );

        grew.forEach(([file]) => console.error(`refusing to grow: ${file}`));

        if (grew.length) process.exit(1);

        fs.writeFileSync(
            path.join(ROOT, GOLD_FILE),
            JSON.stringify(found, null, 4) + '\n'
        );

        const total = Object.values(found).reduce((a, b) => a + b, 0);

        console.log(
            `${GOLD_FILE}: ${Object.keys(found).length} files, ${total} hits`
        );
    } else {
        const exempt = fs.existsSync(path.join(ROOT, GOLD_FILE))
            ? readHudGoldExempt()
            : {};

        Object.entries(found).forEach(([f, n]) => console.log(`${n}\t${f}`));

        const problems = hudGoldProblems(found, exempt);

        problems.forEach((p) => console.error(p));
        process.exit(problems.length ? 1 : 0);
    }
}
