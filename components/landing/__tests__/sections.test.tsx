import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { FEATURE_ITEMS } from '@/components/landing/media';
import { CombatDemo, SCENES } from '@/components/landing/sections/CombatDemo';
import { Features } from '@/components/landing/sections/Features';
import { Replace } from '@/components/landing/sections/Replace';
import { Systems } from '@/components/landing/sections/Systems';
import { getTemplateStats } from '@/components/landing/template-stats';
import { LOCALES } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/translator';

vi.unmock('@/lib/i18n/translator');

describe.each(LOCALES)('new landing sections (%s)', async (locale) => {
    const t = await getTranslator(locale, 'landing');

    const html = {
        replace: renderToStaticMarkup(<Replace t={t} />),
        features: renderToStaticMarkup(<Features t={t} locale={locale} />),
        systems: renderToStaticMarkup(<Systems t={t} />),
        demo: renderToStaticMarkup(<CombatDemo t={t} locale={locale} />),
    };

    it('CombatDemo plays one fight over a single battle frame', () => {
        expect(html.demo.match(/<img/g)).toHaveLength(1);
        expect(html.demo.match(/class="ld-demo-foe[ "]/g)).toHaveLength(
            locale === 'en' ? 3 : 2
        );
        expect(html.demo.match(/class="ld-demo-entry"/g)).toHaveLength(2);
        expect(html.demo).toContain(t('combat.demo.spell.name'));
        expect(html.demo).not.toMatch(/warhammer|wfrp/i);
        expect(html.demo).not.toContain('landing.');
    });

    it('CombatDemo text and scene numbers agree', () => {
        const scene = SCENES[locale];

        const hit = scene.foes.find((f) => f.key === 'target') ?? scene.foes[0];

        expect(t('combat.demo.log.hit')).toContain(
            String(hit.hp[0] - hit.hp[1])
        );
        expect(scene.foes.map((f) => f.key)).toEqual(
            expect.arrayContaining(['foeA', 'foeB'])
        );

        const points = [
            scene.attacker,
            scene.caster,
            scene.target,
            scene.blast,
            scene.die,
            scene.turnChip,
            scene.rollChip.p,
            scene.spellChip,
            scene.save1,
            scene.save2,
            ...scene.foes.map((f) => f.p),
        ];

        for (const p of points) {
            expect(p.x).toBeGreaterThanOrEqual(0);
            expect(p.x).toBeLessThanOrEqual(100);
            expect(p.y).toBeGreaterThanOrEqual(0);
            expect(p.y).toBeLessThanOrEqual(100);
        }

        for (const n of [scene.round, scene.round - 1])
            expect(html.demo).toContain(t('combat.demo.log.round', { n }));
    });

    it('Replace renders a table with six rows and no competitor-style fallbacks', () => {
        expect(html.replace).toContain('id="replace"');
        expect(html.replace).toContain('<caption');
        expect(
            html.replace
                .match(/<tbody>[\s\S]*<\/tbody>/)?.[0]
                .match(/<tr[\s>]/g)
        ).toHaveLength(6);
        expect(html.replace).not.toContain('landing.');
    });

    it('Features renders one article per feature', () => {
        expect(html.features).toContain('id="features"');
        expect(html.features.match(/<article[\s>]/g)).toHaveLength(
            Object.keys(FEATURE_ITEMS).length
        );
        expect(html.features).not.toContain('landing.');
    });

    it('Systems shows the SRD spell count and Grim d100, never WFRP', () => {
        const { spells } = getTemplateStats('srd');

        expect(html.systems).toContain('id="systems"');
        expect(html.systems).toContain(String(spells));
        expect(html.systems).toContain('Grim d100');
        expect(html.systems).toContain(`--to:${spells}`);
        expect(html.systems).toContain(
            `<span class="sr-only">${t('systems.count.spells', { n: spells })}</span>`
        );
        expect(html.systems).not.toMatch(/warhammer|wfrp/i);
        expect(html.systems).not.toContain('landing.');
    });
});
