import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createTranslator } from 'use-intl/core';
import { describe, expect, it } from 'vitest';

import { type GameTermsT, skillLabel } from '../skill-label';

import enGameTerms from '@/messages/en/gameTerms.json';
import ukGameTerms from '@/messages/uk/gameTerms.json';
import { skillDef } from '@/systems/wfrp/rules/skills/catalog';

const tgOf = (locale: 'uk' | 'en') =>
    createTranslator({
        locale,
        messages: { gameTerms: locale === 'uk' ? ukGameTerms : enGameTerms },
        namespace: 'gameTerms',
    }) as unknown as GameTermsT;

const TEMPLATE = join(process.cwd(), 'data/templates/grim-d100');

/** Every `skill:spec` key of an open-spec skill the official template uses */
function templateOpenSpecs(): string[] {
    const keys = new Set<string>();

    for (const file of ['careers.json', 'race-profiles.json']) {
        const text = readFileSync(join(TEMPLATE, file), 'utf8');

        for (const [, key] of text.matchAll(/"([a-z-]+:[a-z0-9-]+)"/g)) {
            const [skill] = key.split(':');

            if (skillDef(skill)?.spec === 'open') keys.add(key);
        }
    }

    return [...keys].sort();
}

describe('skillLabel', () => {
    it('translates open specialisations instead of showing the slug', () => {
        expect(skillLabel(tgOf('uk'), 'language', 'trade-cant')).toBe(
            'Мова (Торговий говір)'
        );
        expect(skillLabel(tgOf('en'), 'language', 'trade-cant')).toBe(
            'Language (Trade Cant)'
        );
        expect(skillLabel(tgOf('en'), 'lore', 'folklore')).toBe(
            'Lore (Folklore)'
        );
    });

    it('keeps fixed specialisations translated', () => {
        expect(skillLabel(tgOf('uk'), 'channelling', 'thorn')).toBe(
            'Скерування (Терен)'
        );
    });

    it('humanizes a custom open specialisation it has no name for', () => {
        expect(skillLabel(tgOf('en'), 'lore', 'far-isles')).toBe(
            'Lore (Far Isles)'
        );
    });

    it.each(['uk', 'en'] as const)(
        'names every open specialisation of the official template (%s)',
        (locale) => {
            const tg = tgOf(locale);

            const missing = templateOpenSpecs().filter((key) => {
                const [skill, spec] = key.split(':');

                return !tg.has(
                    `wfrpSpecs.${skill}.${spec}` as Parameters<
                        GameTermsT['has']
                    >[0]
                );
            });

            expect(missing).toEqual([]);
        }
    );
});
