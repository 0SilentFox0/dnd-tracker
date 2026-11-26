// pnpm exec tsx scripts/codemods/gold-to-ds.ts [--write]: unambiguous hud-gold -> design-system class rewrites
import fs from 'node:fs';
import path from 'node:path';

import { listGoldScanFiles, ROOT } from '../shared/hud-gold';

const G =
    '(?:hud-gold(?:-strong|-bright)?|\\[var\\(--gold\\)\\]|\\[var\\(--color-hud-gold(?:-strong|-bright)?\\)\\])';

const OPACITY = '\\/(?:\\d+|\\[[^\\]\\s]+\\])';

const PREFIX = '((?:(?:[\\w-]+(?:\\[[^\\]\\s]*\\])?|\\[[^\\]\\s]*\\]):)*)';

const TOKEN_END = '(?![\\w\\-\\/\\[\\]])';

const START = '(?<![\\w\\-:\\/.\\[\\]])';

const tokenRe = (util: string) =>
    new RegExp(`${START}${PREFIX}(${util})${TOKEN_END}`, 'g');

const isHover = (prefix: string) => /hover:$/.test(prefix);

type Rule = [RegExp, (prefix: string, m: string[]) => string | null];

const RULES: Rule[] = [
    [tokenRe(`(?:ring|outline)-${G}(?:${OPACITY})?`), () => null],
    [tokenRe(`shadow-\\[[^\\]\\s]*hud-glow[^\\]\\s]*\\]`), () => null],
    [tokenRe(`accent-${G}(?:${OPACITY})?`), (p) => `${p}accent-hud-crimson`],
    [
        tokenRe(`decoration-${G}(?:${OPACITY})?`),
        (p) => `${p}decoration-hud-line`,
    ],
    [
        tokenRe(`border-${G}${OPACITY}`),
        (p) => `${p}${isHover(p) ? 'border-hud-muted' : 'border-hud-line'}`,
    ],
    [tokenRe(`bg-${G}${OPACITY}`), (p) => `${p}bg-hud-panel-2`],
    [
        tokenRe(`text-${G}${OPACITY}`),
        (p) => `${p}${isHover(p) ? 'text-hud-ink' : 'text-hud-muted'}`,
    ],
    [
        tokenRe(
            `text-(?:hud-gold-bright|hud-gold-strong|\\[var\\(--color-hud-gold-(?:bright|strong)\\)\\])`
        ),
        (p) => `${p}text-hud-ink`,
    ],
    [tokenRe(`text-${G}`), (p, m) => (isHover(p) ? `${p}text-hud-ink` : m[0])],
    [
        tokenRe(`border-${G}`),
        (p, m) => (isHover(p) ? `${p}border-hud-muted` : m[0]),
    ],
];

const AMBIGUOUS = tokenRe(`(?:text|border|bg)-${G}`);

const dedupeClasses = (line: string): string =>
    line.replace(/(["'`])([^"'`\n$]*)\1/g, (whole, q: string, body: string) => {
        const seen = new Set<string>();

        const out = body.replace(
            /(\s*)(\S+)/g,
            (_m, ws: string, tok: string) => {
                if (seen.has(tok)) return '';

                seen.add(tok);

                return ws + tok;
            }
        );

        return out === body ? whole : `${q}${out}${q}`;
    });

export function rewriteGold(source: string): {
    text: string;
    ambiguous: number;
} {
    const lines = source.split('\n');

    const out = lines.map((line) => {
        let next = line;

        for (const [re, fn] of RULES) {
            next = next.replace(re, (...args: unknown[]) => {
                const m = args.slice(0, -2) as string[];

                const result = fn(m[1], m);

                if (result !== null) return result;

                return '\u0001';
            });
        }

        next = next
            .replace(/(["'`])\u0001[ \t]+/g, '$1')
            .replace(/[ \t]?\u0001/g, '');

        return next === line ? line : dedupeClasses(next);
    });

    const text = out.join('\n');

    return { text, ambiguous: text.match(AMBIGUOUS)?.length ?? 0 };
}

if (require.main === module) {
    const write = process.argv.includes('--write');

    let changed = 0;

    const report: [string, number][] = [];

    for (const file of listGoldScanFiles()) {
        const abs = path.join(ROOT, file);

        const src = fs.readFileSync(abs, 'utf8');

        if (!/hud-gold|var\(--gold\)|hud-glow/.test(src)) continue;

        const { text, ambiguous } = rewriteGold(src);

        if (text !== src) {
            changed++;

            if (write) fs.writeFileSync(abs, text);
        }

        if (ambiguous > 0) report.push([file, ambiguous]);
    }

    console.log(`${write ? 'rewrote' : 'would rewrite'} ${changed} files`);
    console.log(
        `ambiguous: ${report.reduce((a, [, n]) => a + n, 0)} in ${report.length} files`
    );
    report.forEach(([f, n]) => console.log(`${n}\t${f}`));
}
