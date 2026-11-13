import { ESLint } from 'eslint';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
    SYSTEM_UI_KIT,
    UI_LAYER_IGNORES,
    UI_LAYER_ZONES,
} from '@/scripts/shared/ui-layers.mjs';

const ROOT = process.cwd();

type Entry = { file: string; reason: string };

const globToRe = (glob: string) =>
    new RegExp(
        `^${glob
            .replace(/[.+^$()|[\]\\]/g, '\\$&')
            .replace(
                /\{([^}]+)\}/g,
                (_, g: string) => `(${g.split(',').join('|')})`
            )
            .replace(/\*\*\//g, '\u0000')
            .replace(/\*\*/g, '\u0001')
            .replace(/\*/g, '[^/]*')
            .replace(/\u0000/g, '(.*/)?')
            .replace(/\u0001/g, '.*')}$`
    );

const walk = (dir: string): string[] =>
    fs
        .readdirSync(path.join(ROOT, dir), { withFileTypes: true })
        .flatMap((d) => {
            const rel = `${dir}/${d.name}`;

            if (d.isDirectory())
                return d.name === 'node_modules' ? [] : walk(rel);

            return [rel];
        });

const IMPORT_RE =
    /(?:from\s+|import\s*\(\s*|import\s+|vi\.mock\(\s*)['"](@\/[^'"]+)['"]/g;

const importsOf = (file: string) =>
    [...fs.readFileSync(path.join(ROOT, file), 'utf8').matchAll(IMPORT_RE)].map(
        (m) => m[1]
    );

const ignored = UI_LAYER_IGNORES.map(globToRe);

const exempt: Entry[] = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'ui-layers-exempt.json'), 'utf8')
);

const violations = (zone: (typeof UI_LAYER_ZONES)[number], file: string) => {
    const res = zone.forbidden.map((r) => new RegExp(r));

    return importsOf(file).filter((src) => res.some((re) => re.test(src)));
};

const zoneFiles = (zone: (typeof UI_LAYER_ZONES)[number]) => {
    const matchers = zone.files.map(globToRe);
    const top = [...new Set(zone.files.map((f) => f.split('/')[0]))];

    return top
        .flatMap(walk)
        .filter((f) => matchers.some((m) => m.test(f)))
        .filter((f) => !ignored.some((m) => m.test(f)));
};

const zoneOf = (name: string) => UI_LAYER_ZONES.find((z) => z.name === name)!;

const allowed = (zone: string, src: string) =>
    !zoneOf(zone).forbidden.some((r) => new RegExp(r).test(src));

describe('ui layers ratchet', () => {
    it('lists each exempt file once with a reason', () => {
        expect(new Set(exempt.map((e) => e.file)).size).toBe(exempt.length);
        expect(exempt.filter((e) => !e.reason)).toEqual([]);
    });

    it('every exempt entry exists and still violates (lower the list)', () => {
        const stale = exempt.filter((e) => {
            if (!fs.existsSync(path.join(ROOT, e.file))) return true;

            const matched = UI_LAYER_ZONES.filter((z) =>
                z.files.some((g) => globToRe(g).test(e.file))
            );

            return !matched.some((z) => violations(z, e.file).length > 0);
        });

        expect(stale.map((e) => e.file)).toEqual([]);
    });

    const listed = new Set(exempt.map((e) => e.file));

    for (const zone of UI_LAYER_ZONES) {
        it(`zone ${zone.name} has no violators outside the exempt list`, () => {
            const found = zoneFiles(zone)
                .filter((f) => !listed.has(f))
                .flatMap((f) => violations(zone, f).map((s) => `${f} -> ${s}`));

            expect(found).toEqual([]);
        });
    }

    it('ui may take hud tokens only from fonts and hud.css', () => {
        expect(allowed('ui', '@/components/hud/fonts')).toBe(true);
        expect(allowed('ui', '@/components/hud/hud.css')).toBe(true);
        expect(allowed('ui', '@/components/hud')).toBe(false);
        expect(allowed('ui', '@/components/hud/metal')).toBe(false);
        expect(allowed('ui', '@/components/common/IconUrlField')).toBe(false);
        expect(allowed('ui', '@/components/ui/dialog')).toBe(true);
        expect(allowed('ui', '@/types/battle')).toBe(false);
        expect(allowed('ui', '@/lib/utils')).toBe(true);
        expect(allowed('ui', '@/lib/utils/common/x')).toBe(true);
        expect(allowed('ui', '@/lib/utils/battle/view')).toBe(false);
        expect(allowed('ui', '@/lib/hooks/common')).toBe(true);
        expect(allowed('ui', '@/lib/hooks/battle')).toBe(false);
    });

    it('hud and common reject upward and domain imports', () => {
        expect(allowed('hud', '@/components/ui/button')).toBe(true);
        expect(allowed('hud', '@/components/common/ActionBar')).toBe(false);
        expect(allowed('hud', '@/types/battle')).toBe(false);
        expect(allowed('common', '@/components/hud')).toBe(true);
        expect(allowed('common', '@/components/battle/x')).toBe(false);
        expect(allowed('common', '@/types/units')).toBe(false);
        expect(allowed('common', '@/types/theme')).toBe(true);
        expect(allowed('common', '@/lib/utils/text/x')).toBe(true);
        expect(allowed('common', '@/lib/api/units')).toBe(false);
    });

    it('system ui takes only the kit verbatim', () => {
        for (const item of SYSTEM_UI_KIT)
            expect(allowed('system-ui', item)).toBe(true);

        expect(allowed('system-ui', '@/components/systems/types')).toBe(true);
        expect(allowed('system-ui', '@/components/common/x')).toBe(true);
        expect(allowed('system-ui', '@/components/battle/hud/DiceInputX')).toBe(
            false
        );
        expect(
            allowed('system-ui', '@/components/battle/hud/DiceInput/x')
        ).toBe(false);
        expect(allowed('system-ui', '@/components/battle/foo')).toBe(false);
        expect(allowed('system-ui', '@/components/systems/registry')).toBe(
            false
        );
    });

    it('lib rejects components', () => {
        expect(allowed('lib', '@/components/ui/x')).toBe(false);
        expect(allowed('lib', '@/lib/utils/x')).toBe(true);
    });

    it(
        'ESLint reports ui-layers/zone for a violation',
        { timeout: 30_000 },
        async () => {
            const eslint = new ESLint({
                cwd: ROOT,
                overrideConfig: { rules: { 'import/no-cycle': 'off' } },
            });

            const lint = async (filePath: string, from: string) =>
                (
                    await eslint.lintText(
                        `import x from "${from}";\nexport { x };\n`,
                        { filePath }
                    )
                ).flatMap((r) =>
                    r.messages.filter((m) => m.ruleId === 'ui-layers/zone')
                );

            expect(
                await lint('components/ui/tmp.ts', '@/components/hud')
            ).toHaveLength(1);
            expect(
                await lint('components/ui/tmp.ts', '@/components/hud/fonts')
            ).toHaveLength(0);
            expect(
                await lint('lib/utils/tmp.ts', '@/components/ui/button')
            ).toHaveLength(1);
        }
    );
});
