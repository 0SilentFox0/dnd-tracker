import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

const SYSTEM_KEY =
    /["`](battleWfrp|wfrpMagic)\.|["`][^"`]*(\.wfrp\.|wfrpTotal)/;

function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const full = join(dir, name);

        if (statSync(full).isDirectory())
            return name === '__tests__' ? [] : walk(full);

        return /\.tsx?$/.test(name) ? [full] : [];
    });
}

describe('battle core knows no rule-system i18n keys', () => {
    it('lib/utils/battle has no wfrp key literals', () => {
        const hits = walk(join(ROOT, 'lib/utils/battle'))
            .map((file) => relative(ROOT, file))
            .flatMap((file) =>
                readFileSync(join(ROOT, file), 'utf8')
                    .split('\n')
                    .flatMap((line, i) =>
                        SYSTEM_KEY.test(line)
                            ? [`${file}:${i + 1}: ${line.trim()}`]
                            : []
                    )
            );

        expect(
            hits,
            'system keys belong to lib/utils/rules/systems/<system>'
        ).toEqual([]);
    });

    it('the pattern catches both quote styles', () => {
        expect(SYSTEM_KEY.test('textRef("battleWfrp.log.x")')).toBe(true);
        expect(SYSTEM_KEY.test('textRef(`battleWfrp.${k}`)')).toBe(true);
        expect(SYSTEM_KEY.test('textRef("wfrpMagic.log.x")')).toBe(true);
        expect(SYSTEM_KEY.test('battleLog.percentile')).toBe(false);
    });

    it('the pattern catches the legacy battleLog wfrp keys', () => {
        expect(SYSTEM_KEY.test('"battleLog.damage.rows.wfrpTotal"')).toBe(true);
        expect(SYSTEM_KEY.test('"battleLog.wfrp.crit.head.1"')).toBe(true);
    });

    it('the pattern ignores property access', () => {
        expect(SYSTEM_KEY.test('p.abilities.wfrp.tb')).toBe(false);
        expect(SYSTEM_KEY.test('const x = p.wfrpTotal;')).toBe(false);
    });

    it.each(['uk', 'en'])(
        '%s battleLog.json carries no wfrp texts',
        (locale) => {
            const log = JSON.parse(
                readFileSync(
                    join(ROOT, `messages/${locale}/battleLog.json`),
                    'utf8'
                )
            );

            expect(log.wfrp).toBeUndefined();
            expect(log.damage.steps.wfrp).toBeUndefined();
            expect(log.damage.rows.wfrpTotal).toBeUndefined();
        }
    );

    it('lib/utils/battle judges by combat.judge, not by die size or a system name', () => {
        const hits = walk(join(ROOT, 'lib/utils/battle'))
            .map((file) => relative(ROOT, file))
            .flatMap((file) =>
                readFileSync(join(ROOT, file), 'utf8')
                    .split('\n')
                    .flatMap((line, i) =>
                        /judgeWfrp|judgeServerWfrp|dice\s*[!=]==\s*(20|100)\b/.test(
                            line
                        )
                            ? [`${file}:${i + 1}: ${line.trim()}`]
                            : []
                    )
            );

        expect(hits).toEqual([]);
    });
});
