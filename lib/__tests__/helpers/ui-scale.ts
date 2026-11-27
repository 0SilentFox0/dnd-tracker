import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../../..');

export const UI_SCALE_DIRS = ['app', 'components', 'systems'] as const;

export const UI_SCALE_COUNTERS = [
    'font-arbitrary',
    'radius-arbitrary',
    'button-height',
    'disabled-opacity',
    'css-small-font',
] as const;

export type UiScaleCounter = (typeof UI_SCALE_COUNTERS)[number];

const SKIP_FILES = new Set(['app/campaigns/[id]/dm/print/print.css']);

const ON_SCALE_FONT_PX = new Set(['12', '14', '16', '18', '22', '28', '40']);

const DIR = '(?:-(?:[trblse]|tl|tr|bl|br|ss|se|es|ee))?';

const FONT = /(?<![\w-])text-\[(\d*\.?\d+)(px|rem|em)\]/g;

const FONT_DYNAMIC = /(?<![\w-])text-\[(?:length:|clamp\()/g;

const RADIUS_ARBITRARY = new RegExp(
    `(?<![\\w-])rounded${DIR}-\\[([^\\]]*)\\]`,
    'g'
);

const RADIUS_OFF_SCALE = new RegExp(
    `(?<![\\w-])rounded${DIR}-(?:md|xs|2xl|3xl|4xl)(?![\\w-])`,
    'g'
);

const RADIUS_BARE = /(?<![\w.-])rounded(?=[\s"'`])/g;

const DISABLED_OPACITY = /(?<![\w-])(?:aria-)?disabled:opacity-(\d+)/g;

const CSS_FONT = /font-size:\s*(\d*\.?\d+)(px|rem)\b/g;

const BUTTON_TAG = /<(Button|HudIconButton|HudButton)(?![\w])/g;

const HEIGHT_TOKEN = /^(?:min-h|h|size)-(.+)$/;

const HUD_BUTTON_LADDER = new Set(['8', '10', '12']);

const matches = (re: RegExp, text: string) => [...text.matchAll(re)];

const tagEnd = (s: string, from: number): number => {
    let depth = 0;

    let quote: string | null = null;

    for (let i = from; i < s.length; i++) {
        const c = s[i];

        if (quote) {
            if (c === '\\') i++;
            else if (c === quote) quote = null;
        } else if (c === '"' || c === "'" || c === '`') quote = c;
        else if (c === '{') depth++;
        else if (c === '}') depth--;
        else if (c === '>' && depth === 0 && s[i - 1] !== '=') return i;
    }

    return -1;
};

const baseToken = (token: string): string | null => {
    if (token.includes('[&') || token.startsWith('[')) return null;

    return token.slice(token.lastIndexOf(':') + 1);
};

const countButtonHeights = (text: string): number => {
    let n = 0;

    for (const m of matches(BUTTON_TAG, text)) {
        const end = tagEnd(text, m.index + m[0].length);

        if (end < 0) continue;

        const tag = text.slice(m.index, end);

        const tokens = tag.match(/[^\s"'`{}()<>=,]+/g) ?? [];

        for (const token of tokens) {
            const base = baseToken(token);

            const hit = base && HEIGHT_TOKEN.exec(base);

            if (!hit) continue;

            if (m[1] !== 'HudButton') n++;
            else if (hit[1].startsWith('[') || !HUD_BUTTON_LADDER.has(hit[1]))
                n++;
        }
    }

    return n;
};

const stripCssComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

export const countUiScale = (
    text: string,
    file = 'x.tsx'
): Record<UiScaleCounter, number> => {
    const isCss = file.endsWith('.css');

    const isLanding = file.startsWith('components/landing/');

    if (isCss) {
        const css = stripCssComments(text);

        const small = matches(CSS_FONT, css).filter(([, v, unit]) =>
            unit === 'px' ? Number(v) < 12 : Number(v) < 0.75
        ).length;

        return {
            'font-arbitrary': 0,
            'radius-arbitrary': 0,
            'button-height': 0,
            'disabled-opacity': 0,
            'css-small-font': small,
        };
    }

    const fontOff = matches(FONT, text).filter(
        ([, v, unit]) => !(unit === 'px' && ON_SCALE_FONT_PX.has(v))
    ).length;

    const fontDynamic = isLanding ? 0 : matches(FONT_DYNAMIC, text).length;

    const radiusArbitrary = matches(RADIUS_ARBITRARY, text).filter(
        ([, v]) => v !== 'inherit' && !/^var\(--r-/.test(v)
    ).length;

    return {
        'font-arbitrary': fontOff + fontDynamic,
        'radius-arbitrary':
            radiusArbitrary +
            matches(RADIUS_OFF_SCALE, text).length +
            matches(RADIUS_BARE, text).length,
        'button-height': countButtonHeights(text),
        'disabled-opacity': matches(DISABLED_OPACITY, text).filter(
            ([, n]) => n !== '50'
        ).length,
        'css-small-font': 0,
    };
};

export const sumUiScale = (counts: Record<UiScaleCounter, number>) =>
    Object.values(counts).reduce((a, b) => a + b, 0);

const SOURCE = /\.(tsx?|css)$/;

const walk = (rel: string): string[] =>
    fs
        .readdirSync(path.join(ROOT, rel), { withFileTypes: true })
        .flatMap((e) => {
            const next = path.posix.join(rel, e.name);

            if (e.isDirectory())
                return e.name === '__tests__' ||
                    e.name === 'node_modules' ||
                    e.name === '.next'
                    ? []
                    : walk(next);

            return SOURCE.test(e.name) &&
                !/\.test\.tsx?$/.test(e.name) &&
                !SKIP_FILES.has(next) &&
                (!next.startsWith('systems/') || /\/ui\//.test(next))
                ? [next]
                : [];
        });

export const collectUiScale = (): Record<string, number> => {
    const found: Record<string, number> = {};

    for (const file of UI_SCALE_DIRS.flatMap((d) => walk(d)).sort()) {
        const n = sumUiScale(
            countUiScale(fs.readFileSync(path.join(ROOT, file), 'utf8'), file)
        );

        if (n > 0) found[file] = n;
    }

    return found;
};
