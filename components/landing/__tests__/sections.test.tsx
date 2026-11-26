import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

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
        features: renderToStaticMarkup(<Features t={t} />),
        systems: renderToStaticMarkup(<Systems t={t} />),
    };

    it('Replace renders a table with six rows and no competitor-style fallbacks', () => {
        expect(html.replace).toContain('id="replace"');
        expect(html.replace).toContain('<caption');
        expect(html.replace.match(/<tbody>[\s\S]*<\/tbody>/)?.[0].match(/<tr[\s>]/g)).toHaveLength(6);
        expect(html.replace).not.toContain('landing.');
    });

    it('Features renders seven articles', () => {
        expect(html.features).toContain('id="features"');
        expect(html.features.match(/<article[\s>]/g)).toHaveLength(7);
        expect(html.features).not.toContain('landing.');
    });

    it('Systems shows the SRD spell count and Grim d100, never WFRP', () => {
        const { spells } = getTemplateStats('srd-5.2');

        expect(html.systems).toContain('id="systems"');
        expect(html.systems).toContain(String(spells));
        expect(html.systems).toContain('Grim d100');
        expect(html.systems).not.toMatch(/warhammer|wfrp/i);
        expect(html.systems).not.toContain('landing.');
    });
});
