import { describe, expect, it } from 'vitest';

import { spellDescriptionBody } from '../description-body';

const BODY = 'Protective frost.\n\n**_Sensory Effect._** Rime.';

describe('spellDescriptionBody', () => {
    it('strips the English imported header line', () => {
        const head =
            'Level 1 Abjuration · Casting Time: Action · Range: Self · Components: V, S, M (a cup of water) · Duration: 1 hour · Classes: Warlock';

        expect(spellDescriptionBody(`${head}\n\n${BODY}`)).toBe(BODY);
    });

    it('strips the translated header line', () => {
        const head =
            'Рівень 1, Відкидання · Час накладання: дія · Дистанція: на себе · Компоненти: В, С, М (чашка води) · Тривалість: 1 година · Класи: Чорнокнижник';

        expect(spellDescriptionBody(`${head}\n\n${BODY}`)).toBe(BODY);
    });

    it('strips the cantrip header', () => {
        const head =
            'Transmutation Cantrip · Casting Time: Action · Range: 10 feet · Components: V, S · Duration: Instantaneous · Classes: Bard';

        expect(spellDescriptionBody(`${head}\n\n${BODY}`)).toBe(BODY);
    });

    it('keeps hand-written descriptions untouched', () => {
        expect(spellDescriptionBody('Fire · hot: yes\n\nBoom.')).toBe(
            'Fire · hot: yes\n\nBoom.'
        );
        expect(spellDescriptionBody('')).toBe('');
    });
});
