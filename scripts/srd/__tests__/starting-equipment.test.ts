import { describe, expect, it } from 'vitest';

import {
    gearSlugsByKey,
    startingEquipmentChoice,
} from '../convert/class-choices';
import { readSrdData } from '../lib/data-files';

import { ChoiceSchema } from '@/lib/schemas/choices';

const data = readSrdData();

const gear = gearSlugsByKey(data.artifacts);

const fighter = startingEquipmentChoice(
    "Choose A, B, or C: (A) Chain Mail, Greatsword, Flail, 8 Javelins, Dungeoneer's Pack, and 4 GP; (B) Studded Leather Armor, Scimitar, Shortsword, Longbow, 20 Arrows, Quiver, Dungeoneer's Pack, and 11 GP; or (C) 155 GP",
    gear
)!;

const kit = (c: typeof fighter, id: string) =>
    c.options!.find((o) => o.id === id)!.kit!;

describe('startingEquipmentChoice', () => {
    it('Fighter: three packages, A has the gear and 4 gp, C is gold only', () => {
        expect(fighter.options).toHaveLength(3);
        expect(fighter.atCreation).toBe(true);
        expect(kit(fighter, 'a')).toEqual({
            items: [
                { artifact: 'srd-2024_chain-mail', quantity: 1 },
                { artifact: 'srd-2024_greatsword', quantity: 1 },
                { artifact: 'srd-2024_flail', quantity: 1 },
                { artifact: 'srd-2024_javelin', quantity: 8 },
            ],
            gp: 4,
        });
        expect(kit(fighter, 'c')).toEqual({ items: [], gp: 155 });
    });

    it('Wizard: focus override maps to the quarterstaff, packs stay in the text', () => {
        const wizard = startingEquipmentChoice(
            "Choose A or B: (A) 2 Daggers, Arcane Focus (Quarterstaff), Robe, Spellbook, Scholar's Pack, and 5 GP; or (B) 55 GP",
            gear
        )!;

        expect(kit(wizard, 'a')).toEqual({
            items: [
                { artifact: 'srd-2024_dagger', quantity: 2 },
                { artifact: 'srd-2024_quarterstaff', quantity: 1 },
            ],
            gp: 5,
        });
        expect(wizard.options![0].description).toContain("Scholar's Pack");
    });

    it('an unknown item stays out of the kit; no cell, no choice', () => {
        const odd = startingEquipmentChoice(
            '(A) Dagger, Mystery Widget, and 1 GP',
            gear
        )!;

        expect(kit(odd, 'a').items).toEqual([
            { artifact: 'srd-2024_dagger', quantity: 1 },
        ]);
        expect(startingEquipmentChoice('None', gear)).toBeNull();
    });

    it('the result passes the choice schema', () => {
        expect(ChoiceSchema.safeParse(fighter).success).toBe(true);
    });
});

describe('starting equipment in the template data', () => {
    const slugs = new Set(data.artifacts.map((a) => a.slug));

    const groups = data.classes.map((c) => ({
        slug: c.slug,
        choice: c.features
            .flatMap((f) => f.choices ?? [])
            .find((ch) => ch.id === 'starting-equipment'),
    }));

    it('every class has the group', () => {
        expect(groups.filter((g) => !g.choice).map((g) => g.slug)).toEqual([]);
    });

    it('every kit artifact exists', () => {
        const missing = groups.flatMap((g) =>
            (g.choice?.options ?? []).flatMap((o) =>
                (o.kit?.items ?? []).filter((i) => !slugs.has(i.artifact))
            )
        );

        expect(missing).toEqual([]);
    });
});
